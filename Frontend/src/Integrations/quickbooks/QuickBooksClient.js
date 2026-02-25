/**
 * QuickBooks OAuth Client
 * Based on intuit-oauth library for frontend integration
 * 
 * This class handles QuickBooks OAuth2.0 authentication and API calls
 */

class QuickBooksClient {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.REACT_APP_QB_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.REACT_APP_QB_CLIENT_SECRET;
    
    // Use sandbox for localhost, production for live site
    const isLocalhost = window.location.hostname === 'localhost';
    this.environment = config.environment || (isLocalhost ? 'sandbox' : 'production');
    
    // Use dev redirect URI when running on localhost
    this.redirectUri = config.redirectUri || (
      isLocalhost 
        ? process.env.REACT_APP_QB_REDIRECT_URI_DEV 
        : process.env.REACT_APP_QB_REDIRECT_URI
    ) || `${window.location.origin}/quickbooks/callback`;
    
    this.baseURL = this.environment === 'production' 
      ? 'https://quickbooks.api.intuit.com/'
      : 'https://sandbox-quickbooks.api.intuit.com/';
    
    this.token = null;
    this.realmId = null;
    
    // QuickBooks scopes
    this.scopes = {
      Accounting: 'com.intuit.quickbooks.accounting',
      Payment: 'com.intuit.quickbooks.payment',
      Payroll: 'com.intuit.quickbooks.payroll',
      TimeTracking: 'com.intuit.quickbooks.payroll.timetracking',
      Benefits: 'com.intuit.quickbooks.payroll.benefits',
      Profile: 'profile',
      Email: 'email',
      Phone: 'phone',
      Address: 'address',
      OpenId: 'openid',
      Intuit_name: 'intuit_name',
    };
    
    this.endpoints = {
      authorize: 'https://appcenter.intuit.com/connect/oauth2',
      token: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      revoke: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
      userInfo: this.environment === 'production'
        ? 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo'
        : 'https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo'
    };
  }

  /**
   * Generate authorization URI for QuickBooks OAuth
   * @param {Object} options - Authorization options
   * @param {Array|string} options.scope - Required scopes
   * @param {string} options.state - Optional state parameter
   * @returns {Promise<string>} Authorization URI
   */
  async getAuthorizationUri(options = {}) {
    try {
      const state = options.state || this.generateState();
      
      // Call backend to get authorization URL
      const response = await fetch(`/api/quickbooks/auth-url?state=${encodeURIComponent(state)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get authorization URL: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.authUrl) {
        throw new Error('Invalid response from auth-url endpoint');
      }

      return data.authUrl;
    } catch (error) {
      console.error('Error getting authorization URI:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param {string} authorizationCode - Authorization code from callback
   * @param {string} realmId - QuickBooks company ID
   * @param {string} state - State parameter for verification
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(authorizationCode, realmId, state) {
    try {
      const response = await fetch('/api/quickbooks/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: authorizationCode,
          redirectUri: this.redirectUri,
          realmId: realmId,
          state: state
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.setToken(tokenData);
      this.realmId = realmId;
      
      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshToken() {
    if (!this.token?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/quickbooks/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.token.refresh_token
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();
      this.setToken(tokenData);
      
      return tokenData;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Make API call to QuickBooks
   * @param {Object} options - API call options
   * @param {string} options.endpoint - API endpoint (e.g., '/v3/company/{realmId}/items')
   * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
   * @param {Object} options.data - Request body data
   * @param {Object} options.headers - Additional headers
   * @returns {Promise<Object>} API response
   */
  async makeApiCall(options = {}) {
    if (!this.token?.access_token) {
      throw new Error('No access token available. Please authenticate first.');
    }

    if (!this.realmId && options.endpoint.includes('{realmId}')) {
      throw new Error('No realmId available. Please authenticate first.');
    }

    // Replace {realmId} placeholder in endpoint
    const endpoint = options.endpoint.replace('{realmId}', this.realmId);
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint.replace(/^\//, '')}`;

    const headers = {
      'Authorization': `Bearer ${this.token.access_token}`,
      'Accept': 'application/json',
      ...options.headers
    };

    if (options.method && options.method !== 'GET' && options.data) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.data ? JSON.stringify(options.data) : undefined
      });

      if (response.status === 401) {
        // Token might be expired, try to refresh
        await this.refreshToken();
        
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${this.token.access_token}`;
        const retryResponse = await fetch(url, {
          method: options.method || 'GET',
          headers: headers,
          body: options.data ? JSON.stringify(options.data) : undefined
        });

        if (!retryResponse.ok) {
          throw new Error(`API call failed after token refresh: ${retryResponse.statusText}`);
        }

        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making API call:', error);
      throw error;
    }
  }

  /**
   * Get company information
   * @returns {Promise<Object>} Company information
   */
  async getCompanyInfo() {
    return this.makeApiCall({
      endpoint: `/v3/company/${this.realmId}/companyinfo/${this.realmId}`
    });
  }

  /**
   * Get all items
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Items list
   */
  async getItems(options = {}) {
    const query = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
    return this.makeApiCall({
      endpoint: `/v3/company/${this.realmId}/items${query}`
    });
  }

  /**
   * Get all customers
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Customers list
   */
  async getCustomers(options = {}) {
    const query = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
    return this.makeApiCall({
      endpoint: `/v3/company/${this.realmId}/customers${query}`
    });
  }

  /**
   * Create a new customer
   * @param {Object} customerData - Customer data
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData) {
    return this.makeApiCall({
      endpoint: `/v3/company/${this.realmId}/customer`,
      method: 'POST',
      data: { Customer: customerData }
    });
  }

  /**
   * Get all invoices
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Invoices list
   */
  async getInvoices(options = {}) {
    const query = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
    return this.makeApiCall({
      endpoint: `/v3/company/${this.realmId}/invoices${query}`
    });
  }

  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<Object>} Created invoice
   */
  async createInvoice(invoiceData) {
    return this.makeApiCall({
      endpoint: `/v3/company/${this.realmId}/invoice`,
      method: 'POST',
      data: { Invoice: invoiceData }
    });
  }

  /**
   * Revoke access token
   * @returns {Promise<boolean>} Success status
   */
  async revokeToken() {
    if (!this.token?.refresh_token) {
      throw new Error('No token to revoke');
    }

    try {
      const response = await fetch('/api/quickbooks/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: this.token.refresh_token
        })
      });

      if (response.ok) {
        this.clearToken();
        return true;
      }

      throw new Error(`Token revocation failed: ${response.statusText}`);
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }

  /**
   * Set token data
   * @param {Object} tokenData - Token data from API
   */
  setToken(tokenData) {
    this.token = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'bearer',
      expires_in: tokenData.expires_in,
      x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in,
      id_token: tokenData.id_token,
      created_at: Date.now()
    };

    // Store in localStorage for persistence
    localStorage.setItem('quickbooks_token', JSON.stringify(this.token));
    if (tokenData.realmId) {
      this.realmId = tokenData.realmId;
      localStorage.setItem('quickbooks_realm_id', this.realmId);
    }
  }

  /**
   * Get current token
   * @returns {Object|null} Current token
   */
  getToken() {
    if (!this.token) {
      const storedToken = localStorage.getItem('quickbooks_token');
      if (storedToken) {
        this.token = JSON.parse(storedToken);
      }
    }
    if (!this.realmId) {
      this.realmId = localStorage.getItem('quickbooks_realm_id');
    }
    return this.token;
  }

  /**
   * Check if access token is valid
   * @returns {boolean} Token validity
   */
  isTokenValid() {
    if (!this.token?.access_token || !this.token?.created_at) {
      return false;
    }

    const expiresIn = this.token.expires_in || 3600; // Default 1 hour
    const expiresAt = this.token.created_at + (expiresIn * 1000);
    
    return Date.now() < expiresAt;
  }

  /**
   * Clear stored token
   */
  clearToken() {
    this.token = null;
    this.realmId = null;
    localStorage.removeItem('quickbooks_token');
    localStorage.removeItem('quickbooks_realm_id');
  }

  /**
   * Generate a random state parameter for OAuth
   * @returns {string} Random state string
   */
  generateState() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get user info from OpenID Connect
   * @returns {Promise<Object>} User information
   */
  async getUserInfo() {
    if (!this.token?.access_token) {
      throw new Error('No access token available');
    }

    try {
      const response = await fetch(this.endpoints.userInfo, {
        headers: {
          'Authorization': `Bearer ${this.token.access_token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`User info request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }
}

export default QuickBooksClient;