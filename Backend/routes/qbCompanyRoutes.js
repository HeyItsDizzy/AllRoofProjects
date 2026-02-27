/**
 * Company QuickBooks Integration API Routes
 * Single-company QB integration for All Roof Takeoffs
 */

const express = require('express');
const router = express.Router();
const OAuthClient = require('intuit-oauth'); // For OAuth flow
const QuickBooks = require('node-quickbooks'); // For QB API operations
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const companyQBService = require('../services/companyQBService');
const CompanyQBSettings = require('../models/CompanyQBSettings');
const Client = require('../config/Client');
const Invoice = require('../models/Invoice');

// QB OAuth configuration - using existing .env variables
const QB_CONFIG = {
  clientId: process.env.QB_CLIENT_ID,
  clientSecret: process.env.QB_CLIENT_SECRET,
  environment: process.env.QB_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
  // IMPORTANT: Production QB environment ONLY accepts HTTPS redirect URIs
  // For dev mode connecting to Production QB:
  //   - Authenticate via production site (https://projects.allrooftakeoffs.com.au/admin/quickbooks)
  //   - Tokens save to MongoDB, dev mode backend accesses same database
  //   - OR use ngrok tunnel with HTTPS redirect URI
  redirectUri: process.env.QB_ENVIRONMENT === 'production'
    ? process.env.QB_REDIRECT_URI  // Always use production URI for production QB
    : (process.env.NODE_ENV === 'production' 
        ? process.env.QB_REDIRECT_URI 
        : (process.env.QB_REDIRECT_URI_DEV || 'http://localhost:5173/quickbooks/callback'))
};

// Create OAuth client helper
const createOAuthClient = () => {
  return new OAuthClient({
    clientId: QB_CONFIG.clientId,
    clientSecret: QB_CONFIG.clientSecret,
    environment: QB_CONFIG.environment,
    redirectUri: QB_CONFIG.redirectUri
  });
};

/**
 * GET /api/qb-company/health
 * Simple health check endpoint (no database required)
 */
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Company QB routes are responding',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/qb-company/status
 * Get QB connection status and statistics
 */
router.get('/status', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB STATUS] Fetching company QB status...');
    const status = await companyQBService.getConnectionStatus();
    console.log('[QB STATUS] Got connection status:', status);
    
    // Get additional stats (with error handling for each)
    let totalInvoices = 0;
    let qbInvoices = 0;
    let totalClients = 0;
    
    try {
      totalInvoices = await Invoice.countDocuments();
    } catch (err) {
      console.error('[QB STATUS] Warning: Error counting invoices:', err.message);
    }
    
    try {
      qbInvoices = await Invoice.countDocuments({ 
        'integrationStatus.quickbooks.qbInvoiceId': { $exists: true } 
      });
    } catch (err) {
      console.error('[QB STATUS] Warning: Error counting QB invoices:', err.message);
    }
    
    try {
      totalClients = await Client.countDocuments();
    } catch (err) {
      console.error('[QB STATUS] Warning: Error counting clients:', err.message);
    }
    
    res.json({
      success: true,
      connection: status,
      stats: {
        totalInvoices,
        qbInvoices,
        totalClients,
        syncCoverage: totalInvoices > 0 ? Math.round((qbInvoices / totalInvoices) * 100) : 0
      }
    });
  } catch (error) {
    console.error('[QB STATUS] ERROR: Status check failed:', error);
    console.error('[QB STATUS] Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

/**
 * GET /api/qb-company/connect
 * Initiate QB OAuth flow
 */
router.get('/connect', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB CONNECT] Generating QB OAuth URL...');
    console.log('[QB CONNECT] QB Config:', {
      clientId: QB_CONFIG.clientId ? '***' + QB_CONFIG.clientId.slice(-4) : 'MISSING',
      clientSecret: QB_CONFIG.clientSecret ? '***' + QB_CONFIG.clientSecret.slice(-4) : 'MISSING',
      redirectUri: QB_CONFIG.redirectUri,
      redirectUriLength: QB_CONFIG.redirectUri?.length,
      redirectUriEncoded: encodeURIComponent(QB_CONFIG.redirectUri),
      environment: QB_CONFIG.environment
    });

    if (!QB_CONFIG.clientId || !QB_CONFIG.clientSecret) {
      throw new Error('QuickBooks credentials not configured. Please set QB_CLIENT_ID and QB_CLIENT_SECRET environment variables.');
    }

    const oauthClient = createOAuthClient();
    
    // Generate authorization URL with accounting scope
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'company-integration'
    });

    console.log('[QB CONNECT] QB OAuth URL generated successfully');
    console.log('[QB CONNECT] Full Auth URI:', authUri);
    console.log('[QB CONNECT] Redirect URI in Auth URI:', authUri.includes(QB_CONFIG.redirectUri) ? 'FOUND' : 'NOT FOUND');
    
    res.json({ success: true, authUri });
  } catch (error) {
    console.error('[QB CONNECT] OAuth URL generation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/qb-company/save-connection
 * Save QB OAuth tokens after frontend receives callback
 * Frontend calls this after QuickBooks redirects with OAuth code
 */
router.post('/save-connection', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const { code, realmId, state } = req.body;
    
    console.log('[QB SAVE] Saving QB connection from frontend callback:', { code: code ? 'present' : 'missing', realmId });
    
    if (!code || !realmId) {
      throw new Error('Missing OAuth parameters (code or realmId)');
    }

    console.log('[QB SAVE] Exchanging authorization code for tokens...');

    // Exchange code for tokens using intuit-oauth
    const oauthClient = createOAuthClient();
    
    // Parse the URL that QB redirected to (contains code and realmId)
    const parseRedirect = `${QB_CONFIG.redirectUri}?code=${code}&realmId=${realmId}&state=${state || ''}`;
    
    const authResponse = await oauthClient.createToken(parseRedirect);
    const token = authResponse.getToken();
    
    console.log('[QB SAVE] Tokens received successfully');
    console.log('[QB SAVE] Token data:', {
      access_token: token.access_token ? '***' + token.access_token.slice(-4) : 'missing',
      refresh_token: token.refresh_token ? '***' + token.refresh_token.slice(-4) : 'missing',
      expires_in: token.expires_in,
      realmId
    });

    console.log('[QB SAVE] Saving QuickBooks connection to database...');

    // Save to company settings
    let settings = await CompanyQBSettings.findOne();
    
    if (!settings) {
      console.log('[QB SAVE] Creating new CompanyQBSettings document...');
      settings = new CompanyQBSettings({
        companyName: 'All Roof Takeoffs',
        quickbooks: {}
      });
    }
    
    settings.quickbooks = {
      ...settings.quickbooks,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: token.token_type || 'Bearer',
      expires_in: token.expires_in,
      realmId: realmId,
      connected: true,
      lastConnected: new Date(),
      access_token_expires_at: new Date(Date.now() + (token.expires_in * 1000)), // Convert seconds to ms
      consecutiveFailures: 0
    };
    
    await settings.save();
    
    console.log('[QB SAVE] QB OAuth connection saved successfully');

    // Initialize service with new connection
    try {
      await companyQBService.initialize();
      console.log('[QB SAVE] Company QB service initialized');
    } catch (initError) {
      console.warn('[QB SAVE] Warning: Service initialization had issues:', initError.message);
      // Don't fail the connection, just log the warning
    }

    res.json({ 
      success: true, 
      message: 'QuickBooks connected successfully',
      realmId: realmId
    });
  } catch (error) {
    console.error('[QB SAVE] OAuth connection save failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/qb-company/sync-customers
 * Sync QB customers with MongoDB clients
 */
router.post('/sync-customers', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB SYNC] Starting customer sync...');
    const result = await companyQBService.syncCustomersWithClients();
    
    res.json({
      success: true,
      message: 'Customer sync completed',
      result
    });
  } catch (error) {
    console.error('[QB SYNC] Customer sync failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/qb-company/sync-invoices
 * Sync all QB invoices to MongoDB
 */
router.post('/sync-invoices', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB SYNC] Starting QB invoice sync...');
    const result = await companyQBService.syncAllInvoicesFromQB();
    
    res.json({
      success: true,
      message: 'Invoice sync completed',
      result
    });
  } catch (error) {
    console.error('[QB SYNC] Invoice sync failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/qb-company/create-invoice
 * Create invoice in QB from web app data
 */
router.post('/create-invoice', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const invoiceData = req.body;
    
    if (!invoiceData.client || !invoiceData.items || !invoiceData.items.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required invoice data (client, items)' 
      });
    }

    console.log('[QB CREATE] Creating QB invoice...', invoiceData.invoiceNumber);
    const result = await companyQBService.createInvoiceInQB(invoiceData);
    
    res.json({
      success: true,
      message: 'Invoice created in QuickBooks',
      result
    });
  } catch (error) {
    console.error('[QB CREATE] Invoice creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/qb-company/client-mappings
 * Get all client-to-customer mappings
 */
router.get('/client-mappings', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB MAPPINGS] Fetching client mappings...');
    const settings = await CompanyQBSettings.getDefault();
    console.log(`[QB MAPPINGS] Found ${settings.customerMappings ? settings.customerMappings.length : 0} mappings in settings`);
    
    // Return empty array if no mappings
    if (!settings.customerMappings || settings.customerMappings.length === 0) {
      console.log('[QB MAPPINGS] No mappings found, returning empty array');
      return res.json({ success: true, mappings: [] });
    }
    
    // Try to populate, but catch any errors
    try {
      await settings.populate('customerMappings.mongoClientId');
    } catch (populateError) {
      console.error('[QB MAPPINGS] Warning: Populate error (continuing with unpopulated data):', populateError.message);
    }
    
    // Filter out mappings with null/deleted clients and build safe response
    const mappings = settings.customerMappings
      .filter(mapping => mapping.mongoClientId != null && typeof mapping.mongoClientId === 'object')
      .map(mapping => ({
        clientId: mapping.mongoClientId._id?.toString() || mapping.mongoClientId.toString(),
        clientName: mapping.mongoClientId.name || 'Unknown Client',
        qbCustomerId: mapping.qbCustomerId,
        qbCustomerName: mapping.qbCustomerName,
        autoMapped: mapping.autoMapped || false,
        verified: mapping.verified || false,
        mappedAt: mapping.mappedAt
      }));
    
    console.log(`[QB MAPPINGS] Returning ${mappings.length} valid mappings`);
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('[QB MAPPINGS] ERROR: Failed to get mappings:', error);
    console.error('[QB MAPPINGS] Stack trace:', error.stack);
    res.status(500).json({ success: false, error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

/**
 * GET /api/qb-company/customers
 * Get all QuickBooks customers for manual mapping dropdown
 */
router.get('/customers', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB CUSTOMERS] Fetching all QB customers...');
    
    const initialized = await companyQBService.initialize();
    if (!initialized) {
      return res.status(400).json({ 
        success: false, 
        error: 'QuickBooks not connected' 
      });
    }
    
    const customers = await companyQBService.getAllQBCustomers();
    console.log(`[QB CUSTOMERS] Found ${customers.length} QB customers`);
    
    // Return simplified customer data for dropdown
    const customerList = customers.map(customer => ({
      id: customer.Id,
      name: customer.DisplayName || customer.FullyQualifiedName || customer.CompanyName || 'Unnamed Customer',
      companyName: customer.CompanyName,
      active: customer.Active
    })).filter(c => c.active !== false); // Filter out inactive customers
    
    res.json({ 
      success: true, 
      customers: customerList 
    });
  } catch (error) {
    console.error('[QB CUSTOMERS] Failed to fetch customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/qb-company/verify-mapping/:clientId
 * Manually verify or update a client-to-customer mapping
 * Body: { qbCustomerId: string, qbCustomerName: string } (optional - updates mapping)
 */
router.post('/verify-mapping/:clientId', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { qbCustomerId, qbCustomerName } = req.body;
    
    console.log('[QB VERIFY] Verifying mapping for client:', clientId);
    console.log('[QB VERIFY] QB Customer ID:', qbCustomerId);
    console.log('[QB VERIFY] QB Customer Name:', qbCustomerName);
    
    const settings = await CompanyQBSettings.getDefault();
    const mapping = settings.getClientMapping(clientId);
    
    if (!mapping) {
      return res.status(404).json({ 
        success: false, 
        error: 'Mapping not found for this client' 
      });
    }
    
    // Update mapping if new QB customer provided
    if (qbCustomerId) {
      mapping.qbCustomerId = qbCustomerId;
      mapping.autoMapped = false; // Mark as manually mapped
    }
    
    if (qbCustomerName) {
      mapping.qbCustomerName = qbCustomerName;
    }
    
    // Mark as verified
    mapping.verified = true;
    mapping.mappedAt = new Date();
    
    await settings.save();
    
    console.log('[QB VERIFY] Mapping updated and verified successfully');
    
    res.json({ 
      success: true, 
      message: 'Mapping verified successfully',
      mapping: {
        clientId: mapping.mongoClientId.toString(),
        qbCustomerId: mapping.qbCustomerId,
        qbCustomerName: mapping.qbCustomerName,
        verified: mapping.verified
      }
    });
  } catch (error) {
    console.error('[QB VERIFY] Failed to verify mapping:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/qb-company/disconnect
 * Disconnect QuickBooks integration
 */
router.delete('/disconnect', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const settings = await CompanyQBSettings.getDefault();
    
    settings.quickbooks = {
      connected: false,
      access_token: null,
      refresh_token: null,
      realmId: null,
      lastConnected: settings.quickbooks.lastConnected // Keep history
    };
    
    await settings.save();
    
    res.json({ 
      success: true, 
      message: 'QuickBooks disconnected successfully' 
    });
  } catch (error) {
    console.error('[QB DISCONNECT] Disconnect failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/qb-company/test-connection
 * Test current QB connection
 */
router.get('/test-connection', authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    console.log('[QB TEST] Testing connection...');
    
    // Get current settings first
    const settings = await CompanyQBSettings.getDefault();
    console.log('[QB TEST] Settings exist:', !!settings);
    console.log('[QB TEST] Has access token:', !!settings.quickbooks?.access_token);
    console.log('[QB TEST] Has realm ID:', !!settings.quickbooks?.realmId);
    console.log('[QB TEST] Token expires at:', settings.quickbooks?.access_token_expires_at);
    console.log('[QB TEST] Needs refresh:', settings.needsTokenRefresh());
    
    const initialized = await companyQBService.initialize();
    
    if (!initialized) {
      console.error('[QB TEST] Service failed to initialize');
      return res.status(400).json({ 
        success: false, 
        error: 'QuickBooks not connected or token refresh failed',
        details: {
          hasSettings: !!settings,
          hasAccessToken: !!settings.quickbooks?.access_token,
          hasRealmId: !!settings.quickbooks?.realmId,
          tokenExpired: settings.needsTokenRefresh()
        }
      });
    }
    
    console.log('[QB TEST] Service initialized, testing API call...');
    
    // Try to get company info as connection test
    const qbCustomers = await companyQBService.getAllQBCustomers();
    
    console.log('[QB TEST] API call successful, found', qbCustomers.length, 'customers');
    
    res.json({ 
      success: true, 
      message: 'Connection test successful',
      customerCount: qbCustomers.length
    });
  } catch (error) {
    console.error('[QB TEST] Connection test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;