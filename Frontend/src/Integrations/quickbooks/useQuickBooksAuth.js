/**
 * QuickBooks Authentication Hook
 * React hook for managing QuickBooks OAuth authentication
 */

import { useState, useEffect, useCallback } from 'react';
import QuickBooksClient from './QuickBooksClient';

export const useQuickBooksAuth = (config = {}) => {
  const [client] = useState(() => new QuickBooksClient(config));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const storedToken = client.getToken();
      if (storedToken && client.isTokenValid()) {
        setToken(storedToken);
        setIsAuthenticated(true);
        // Optionally fetch company info
        fetchCompanyInfo();
      }
    };

    checkAuth();
  }, [client]);

  /**
   * Initiate QuickBooks OAuth flow
   */
  const authenticate = useCallback(async (scopes = [client.scopes.Accounting, client.scopes.OpenId]) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const state = client.generateState();
      const authUrl = await client.getAuthorizationUri({
        scope: scopes,
        state: state
      });
      
      // Store state for verification
      localStorage.setItem('quickbooks_oauth_state', state);
      
      // Redirect to QuickBooks auth
      window.location.href = authUrl;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Handle OAuth callback
   */
  const handleCallback = useCallback(async (code, realmId, state, receivedState) => {
    setIsLoading(true);
    setError(null);

    try {
      // Verify state parameter
      const storedState = localStorage.getItem('quickbooks_oauth_state');
      if (storedState && storedState !== receivedState) {
        throw new Error('Invalid state parameter');
      }

      // Exchange code for token
      const tokenData = await client.exchangeCodeForToken(code, realmId, state);
      
      setToken(tokenData);
      setIsAuthenticated(true);
      
      // Clean up stored state
      localStorage.removeItem('quickbooks_oauth_state');
      
      // Fetch company info
      await fetchCompanyInfo();
      
      return tokenData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Refresh the access token
   */
  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newTokenData = await client.refreshToken();
      setToken(newTokenData);
      return newTokenData;
    } catch (err) {
      setError(err.message);
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Logout and revoke token
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated) {
        await client.revokeToken();
      }
    } catch (err) {
      console.error('Error revoking token:', err);
      // Continue with logout even if revoke fails
    } finally {
      client.clearToken();
      setToken(null);
      setIsAuthenticated(false);
      setCompanyInfo(null);
      setIsLoading(false);
    }
  }, [client, isAuthenticated]);

  /**
   * Fetch company information
   */
  const fetchCompanyInfo = useCallback(async () => {
    if (!isAuthenticated && !client.getToken()) return;

    try {
      const info = await client.getCompanyInfo();
      setCompanyInfo(info.QueryResponse?.CompanyInfo?.[0] || info);
      return info;
    } catch (err) {
      console.error('Error fetching company info:', err);
      // Don't set error state for company info failure
    }
  }, [client, isAuthenticated]);

  /**
   * Make an API call with automatic token refresh
   */
  const apiCall = useCallback(async (options) => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }

    try {
      return await client.makeApiCall(options);
    } catch (err) {
      // If token is expired, try to refresh and retry
      if (err.message.includes('401') || err.message.includes('unauthorized')) {
        try {
          await refreshToken();
          return await client.makeApiCall(options);
        } catch (refreshErr) {
          setIsAuthenticated(false);
          throw new Error('Authentication expired. Please log in again.');
        }
      }
      throw err;
    }
  }, [client, isAuthenticated, refreshToken]);

  return {
    // State
    isAuthenticated,
    isLoading,
    error,
    token,
    companyInfo,
    client,

    // Actions
    authenticate,
    handleCallback,
    refreshToken,
    logout,
    apiCall,
    fetchCompanyInfo,

    // Utilities
    clearError: () => setError(null),
    isTokenValid: () => client.isTokenValid(),
  };
};

export default useQuickBooksAuth;