/**
 * QuickBooks React Components
 * React components for QuickBooks integration UI
 */

import React, { useState, useEffect } from 'react';
import { useQuickBooksAuth } from './useQuickBooksAuth';

// QuickBooks Connect Button Component
export const QuickBooksConnectButton = ({ 
  onSuccess, 
  onError, 
  scopes,
  className = "qb-connect-btn",
  children 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      localStorage.setItem('quickbooks_oauth_state', state);
      
      // Get auth URL from backend
      const response = await fetch(`/api/quickbooks/auth-url?state=${encodeURIComponent(state)}`);
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.authUrl) {
        throw new Error('Invalid response from server');
      }
      
      // Redirect to QuickBooks authorization page
      window.location.href = data.authUrl;
      
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      onError?.(err);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className={className}
      style={{
        backgroundColor: '#0077C5',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '4px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: isLoading ? 0.7 : 1
      }}
    >
      {isLoading ? (
        'Connecting...'
      ) : (
        children || (
          <>
            <img 
              src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"
              alt="QuickBooks"
              width="20"
              height="20"
            />
            Connect to QuickBooks
          </>
        )
      )}
    </button>
  );
};

// QuickBooks Status Component
export const QuickBooksStatus = ({ onDisconnect }) => {
  const { 
    isAuthenticated, 
    companyInfo, 
    logout, 
    isLoading, 
    error,
    isTokenValid 
  } = useQuickBooksAuth();

  const handleDisconnect = async () => {
    try {
      await logout();
      onDisconnect?.();
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="qb-status" style={{
      padding: '16px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#0077C5' }}>
            Connected to QuickBooks
          </h4>
          {companyInfo && (
            <p style={{ margin: '0', color: '#6c757d' }}>
              Company: {companyInfo.CompanyName || companyInfo.Name}
            </p>
          )}
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: isTokenValid() ? '#28a745' : '#dc3545' }}>
            Status: {isTokenValid() ? 'Connected' : 'Token Expired'}
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

// QuickBooks Callback Handler Component
export const QuickBooksCallback = ({ onSuccess, onError }) => {
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const realmId = urlParams.get('realmId');
        const state = urlParams.get('state');
        const errorParam = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        if (!code || !realmId) {
          throw new Error('Missing required parameters from QuickBooks callback');
        }

        // Call backend to exchange code for tokens
        const response = await fetch('/api/quickbooks/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirectUri: window.location.hostname === 'localhost' 
              ? process.env.REACT_APP_QB_REDIRECT_URI_DEV 
              : process.env.REACT_APP_QB_REDIRECT_URI || `${window.location.origin}/quickbooks/callback`,
            realmId,
            state
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Token exchange failed');
        }

        const tokenData = await response.json();
        
        if (!tokenData.success) {
          throw new Error(tokenData.error || 'Failed to get access token');
        }

        onSuccess?.(tokenData.data);
        
        // Redirect to QuickBooks settings page
        setTimeout(() => {
          window.location.replace('/admin/quickbooks');
        }, 1000);
        
      } catch (err) {
        console.error('Callback processing error:', err);
        setError(err.message);
        onError?.(err);
        setProcessing(false);
      }
    };

    processCallback();
  }, [onSuccess, onError]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <h2 style={{ color: '#dc3545' }}>Connection Failed</h2>
        <p>{error}</p>
        <button
          onClick={() => window.location.replace('/admin/quickbooks')}
          style={{
            backgroundColor: '#0077C5',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          Return to Settings
        </button>
      </div>
    );
  }

  if (processing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0077C5',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#6c757d' }}>
          Connecting to QuickBooks...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return null;
};

// QuickBooks Company Info Component
export const QuickBooksCompanyInfo = () => {
  const { companyInfo, fetchCompanyInfo, isAuthenticated } = useQuickBooksAuth();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchCompanyInfo();
    } catch (err) {
      console.error('Error fetching company info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <p>Please connect to QuickBooks to view company information.</p>;
  }

  return (
    <div className="qb-company-info" style={{
      padding: '16px',
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      borderRadius: '4px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Company Information</h3>
        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {companyInfo ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <strong>Company Name:</strong>
            <p style={{ margin: '4px 0' }}>{companyInfo.CompanyName || companyInfo.Name}</p>
          </div>
          <div>
            <strong>Legal Name:</strong>
            <p style={{ margin: '4px 0' }}>{companyInfo.LegalName || 'N/A'}</p>
          </div>
          <div>
            <strong>Country:</strong>
            <p style={{ margin: '4px 0' }}>{companyInfo.Country || 'N/A'}</p>
          </div>
          <div>
            <strong>Fiscal Year Start:</strong>
            <p style={{ margin: '4px 0' }}>
              {companyInfo.FiscalYearStartMonth ? `Month ${companyInfo.FiscalYearStartMonth}` : 'N/A'}
            </p>
          </div>
          {companyInfo.CompanyAddr && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Address:</strong>
              <p style={{ margin: '4px 0' }}>
                {[
                  companyInfo.CompanyAddr.Line1,
                  companyInfo.CompanyAddr.Line2,
                  companyInfo.CompanyAddr.City,
                  companyInfo.CompanyAddr.CountrySubDivisionCode,
                  companyInfo.CompanyAddr.PostalCode
                ].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p>Loading company information...</p>
      )}
    </div>
  );
};

// Main QuickBooks Integration Component
export const QuickBooksIntegration = ({ 
  onConnectionChange,
  showCompanyInfo = true,
  defaultScopes 
}) => {
  const { isAuthenticated } = useQuickBooksAuth();

  useEffect(() => {
    onConnectionChange?.(isAuthenticated);
  }, [isAuthenticated, onConnectionChange]);

  return (
    <div className="quickbooks-integration">
      <QuickBooksStatus onDisconnect={() => onConnectionChange?.(false)} />
      
      {!isAuthenticated ? (
        <QuickBooksConnectButton 
          scopes={defaultScopes}
          onSuccess={() => onConnectionChange?.(true)}
          onError={(error) => console.error('Connection error:', error)}
        />
      ) : (
        showCompanyInfo && <QuickBooksCompanyInfo />
      )}
    </div>
  );
};

export default {
  QuickBooksConnectButton,
  QuickBooksStatus,
  QuickBooksCallback,
  QuickBooksCompanyInfo,
  QuickBooksIntegration
};