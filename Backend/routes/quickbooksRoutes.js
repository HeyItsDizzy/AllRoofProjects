// routes/quickbooksRoutes.js
const express = require('express');
const OAuthClient = require('intuit-oauth');
const router = express.Router();

// Initialize QuickBooks OAuth client
const createOAuthClient = () => {
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QB_REDIRECT_URI
  });
};

// =================== TOKEN EXCHANGE ===================

/**
 * Exchange authorization code for access token
 * POST /api/quickbooks/token
 */
router.post('/token', async (req, res) => {
  try {
    const { code, redirectUri, realmId, state } = req.body;

    if (!code || !realmId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: code and realmId'
      });
    }

    const oauthClient = createOAuthClient();
    
    // Create the callback URL for token exchange
    const callbackUrl = `${redirectUri}?code=${code}&realmId=${realmId}&state=${state || ''}`;
    
    // Exchange code for token
    const authResponse = await oauthClient.createToken(callbackUrl);
    const token = authResponse.getToken();

    // Add realmId to token response
    const tokenData = {
      ...token,
      realmId: realmId
    };

    console.log('QuickBooks token exchange successful for realmId:', realmId);

    res.json({
      success: true,
      data: tokenData
    });

  } catch (error) {
    console.error('QuickBooks token exchange error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Token exchange failed',
      details: error.intuit_tid || null
    });
  }
});

// =================== TOKEN REFRESH ===================

/**
 * Refresh access token using refresh token
 * POST /api/quickbooks/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const oauthClient = createOAuthClient();
    
    // Set the refresh token
    oauthClient.getToken().refresh_token = refresh_token;

    // Refresh the token
    const authResponse = await oauthClient.refresh();
    const newToken = authResponse.getToken();

    console.log('QuickBooks token refresh successful');

    res.json({
      success: true,
      data: newToken
    });

  } catch (error) {
    console.error('QuickBooks token refresh error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Token refresh failed',
      details: error.intuit_tid || null
    });
  }
});

// =================== TOKEN REVOCATION ===================

/**
 * Revoke access token
 * POST /api/quickbooks/revoke
 */
router.post('/revoke', async (req, res) => {
  try {
    const { refresh_token, access_token } = req.body;

    if (!refresh_token && !access_token) {
      return res.status(400).json({
        success: false,
        error: 'Either refresh_token or access_token is required'
      });
    }

    const oauthClient = createOAuthClient();
    
    // Set the token to revoke
    if (refresh_token) {
      oauthClient.getToken().refresh_token = refresh_token;
    }
    if (access_token) {
      oauthClient.getToken().access_token = access_token;
    }

    // Revoke the token
    await oauthClient.revoke();

    console.log('QuickBooks token revocation successful');

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('QuickBooks token revocation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Token revocation failed',
      details: error.intuit_tid || null
    });
  }
});

// =================== USER INFO ===================

/**
 * Get user info using OpenID Connect
 * POST /api/quickbooks/userinfo
 */
router.post('/userinfo', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;

    // Get user info
    const authResponse = await oauthClient.getUserInfo();
    const userInfo = authResponse.getJson();

    res.json({
      success: true,
      data: userInfo
    });

  } catch (error) {
    console.error('QuickBooks user info error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get user info',
      details: error.intuit_tid || null
    });
  }
});

// =================== COMPANY INFO ===================

/**
 * Get company information
 * POST /api/quickbooks/company-info
 */
router.post('/company-info', async (req, res) => {
  try {
    const { access_token, realmId } = req.body;

    if (!access_token || !realmId) {
      return res.status(400).json({
        success: false,
        error: 'Access token and realmId are required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;
    oauthClient.getToken().realmId = realmId;

    // Get company info
    const response = await oauthClient.makeApiCall({
      url: `${oauthClient.environment === 'production' ? 'https://quickbooks.api.intuit.com/' : 'https://sandbox-quickbooks.api.intuit.com/'}v3/company/${realmId}/companyinfo/${realmId}`
    });

    res.json({
      success: true,
      data: response.json
    });

  } catch (error) {
    console.error('QuickBooks company info error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get company info',
      details: error.intuit_tid || null
    });
  }
});

// =================== HEALTH CHECK ===================

/**
 * Health check endpoint
 * GET /api/quickbooks/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'QuickBooks integration is healthy',
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    timestamp: new Date().toISOString()
  });
});

// =================== CONFIGURATION ===================

/**
 * Get QuickBooks configuration (public info only)
 * GET /api/quickbooks/config
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      environment: process.env.QB_ENVIRONMENT || 'sandbox',
      clientId: process.env.QB_CLIENT_ID,
      redirectUri: process.env.QB_REDIRECT_URI,
      // Never expose client secret
      hasClientSecret: !!process.env.QB_CLIENT_SECRET
    }
  });
});

module.exports = router;