// routes/quickbooksRoutes.js
const express = require('express');
const OAuthClient = require('intuit-oauth');
const router = express.Router();

// Initialize QuickBooks OAuth client
const createOAuthClient = () => {
  // Detect dev mode (backend runs on port 5002 in dev, 5000 in production)
  const isDevMode = process.argv.includes('--dev') || process.env.HTTP_PORT_DEV;
  const redirectUri = isDevMode 
    ? process.env.QB_REDIRECT_URI_DEV 
    : process.env.QB_REDIRECT_URI;
  
  // Use sandbox for development, production for live deployment
  const environment = isDevMode ? 'sandbox' : 'production';
    
  console.log('🔧 QB OAuth Client Config:', {
    isDevMode,
    environment,
    redirectUri,
    configuredEnv: process.env.QB_ENVIRONMENT || 'sandbox'
  });
  
  return new OAuthClient({
    clientId: process.env.QB_CLIENT_ID,
    clientSecret: process.env.QB_CLIENT_SECRET,
    environment: environment,
    redirectUri: redirectUri
  });
};

// =================== AUTHORIZATION ===================

/**
 * Get OAuth authorization URL
 * GET /api/quickbooks/auth-url
 */
router.get('/auth-url', (req, res) => {
  try {
    const { state } = req.query;
    
    const oauthClient = createOAuthClient();
    
    // Generate authorization URL with accounting scope
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: state || 'default-state'
    });

    res.json({
      success: true,
      authUrl: authUri
    });

  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate authorization URL'
    });
  }
});

// =================== TOKEN EXCHANGE ===================

/**
 * Exchange authorization code for access token
 * POST /api/quickbooks/token
 */
router.post('/token', async (req, res) => {
  try {
    const { code, redirectUri, realmId, state } = req.body;

    console.log('🔄 QuickBooks token exchange request:', {
      code: code ? 'present' : 'missing',
      redirectUri: redirectUri,
      realmId: realmId,
      state: state ? 'present' : 'missing'
    });

    if (!code || !realmId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: code and realmId'
      });
    }

    const oauthClient = createOAuthClient();
    
    console.log('🔧 OAuth client config:', {
      environment: process.env.QB_ENVIRONMENT || 'sandbox',
      redirectUri: process.env.QB_REDIRECT_URI,
      clientId: process.env.QB_CLIENT_ID ? 'present' : 'missing'
    });
    
    // Exchange code for token using the authorization code directly
    console.log('🔗 Exchanging code:', code.substring(0, 20) + '...');
    
    const authResponse = await oauthClient.createToken(redirectUri + '?code=' + code + '&realmId=' + realmId + '&state=' + encodeURIComponent(state || ''));
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
    console.error('❌ QuickBooks token exchange error:', {
      message: error.message,
      status: error.status,
      intuit_tid: error.intuit_tid,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(400).json({
      success: false,
      error: error.message || 'Token exchange failed',
      details: error.intuit_tid || null,
      errorCode: error.status || 'unknown'
    });
  }
});

// =================== DEBUG TEST ===================

/**
 * Test QuickBooks OAuth configuration
 * GET /api/quickbooks/test
 */
router.get('/test', (req, res) => {
  try {
    const OAuthClient = require('intuit-oauth');
    
    const testConfig = {
      environment: process.env.QB_ENVIRONMENT || 'sandbox',
      clientId: process.env.QB_CLIENT_ID,
      redirectUri: process.env.QB_REDIRECT_URI,
      hasClientSecret: !!process.env.QB_CLIENT_SECRET,
    };

    // Try to create OAuth client
    const oauthClient = createOAuthClient();
    
    // Generate a test auth URL
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'test-state-123'
    });

    res.json({
      success: true,
      message: 'QuickBooks OAuth configuration test passed',
      config: testConfig,
      testAuthUrl: authUri.substring(0, 150) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ QuickBooks test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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
  const config = {
    environment: process.env.QB_ENVIRONMENT || 'sandbox',
    clientId: process.env.QB_CLIENT_ID,
    redirectUri: process.env.QB_REDIRECT_URI,
    hasClientSecret: !!process.env.QB_CLIENT_SECRET,
    hasAppId: !!process.env.QB_APP_ID,
  };

  console.log('🔍 QuickBooks config check:', {
    ...config,
    clientSecret: config.hasClientSecret ? 'configured' : 'missing'
  });

  res.json({
    success: true,
    data: config,
    timestamp: new Date().toISOString()
  });
});

// =================== INVOICE CREATION ===================

/**
 * Create an invoice in QuickBooks
 * POST /api/quickbooks/create-invoice
 */
router.post('/create-invoice', async (req, res) => {
  try {
    const { access_token, realmId, invoice } = req.body;

    if (!access_token || !realmId || !invoice) {
      return res.status(400).json({
        success: false,
        error: 'Access token, realmId, and invoice data are required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;
    oauthClient.getToken().realmId = realmId;

    const baseUrl = oauthClient.environment === 'production' 
      ? 'https://quickbooks.api.intuit.com/' 
      : 'https://sandbox-quickbooks.api.intuit.com/';

    // Create invoice
    const response = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/invoice`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoice)
    });

    console.log('QuickBooks invoice created successfully:', response.json.Invoice.Id);

    res.json({
      success: true,
      data: response.json.Invoice,
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('QuickBooks invoice creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create invoice',
      details: error.intuit_tid || null
    });
  }
});

/**
 * Get customer by display name or create if doesn't exist
 * POST /api/quickbooks/get-or-create-customer
 */
router.post('/get-or-create-customer', async (req, res) => {
  try {
    const { access_token, realmId, customer } = req.body;

    if (!access_token || !realmId || !customer) {
      return res.status(400).json({
        success: false,
        error: 'Access token, realmId, and customer data are required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;
    oauthClient.getToken().realmId = realmId;

    const baseUrl = oauthClient.environment === 'production' 
      ? 'https://quickbooks.api.intuit.com/' 
      : 'https://sandbox-quickbooks.api.intuit.com/';

    // Search for existing customer
    const searchQuery = `SELECT * FROM Customer WHERE DisplayName = '${customer.DisplayName.replace(/'/g, "\\'")}'`;
    
    const searchResponse = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/query?query=${encodeURIComponent(searchQuery)}`,
      method: 'GET'
    });

    // If customer exists, return it
    if (searchResponse.json.QueryResponse?.Customer?.length > 0) {
      console.log('QuickBooks customer found:', searchResponse.json.QueryResponse.Customer[0].Id);
      return res.json({
        success: true,
        data: searchResponse.json.QueryResponse.Customer[0],
        message: 'Customer found'
      });
    }

    // Create new customer
    const createResponse = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/customer`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customer)
    });

    console.log('QuickBooks customer created successfully:', createResponse.json.Customer.Id);

    res.json({
      success: true,
      data: createResponse.json.Customer,
      message: 'Customer created successfully'
    });

  } catch (error) {
    console.error('QuickBooks customer error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get or create customer',
      details: error.intuit_tid || null
    });
  }
});

/**
 * Get or create a service item for invoicing
 * POST /api/quickbooks/get-or-create-item
 */
router.post('/get-or-create-item', async (req, res) => {
  try {
    const { access_token, realmId, item } = req.body;

    if (!access_token || !realmId || !item) {
      return res.status(400).json({
        success: false,
        error: 'Access token, realmId, and item data are required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;
    oauthClient.getToken().realmId = realmId;

    const baseUrl = oauthClient.environment === 'production' 
      ? 'https://quickbooks.api.intuit.com/' 
      : 'https://sandbox-quickbooks.api.intuit.com/';

    // Search for existing item
    const searchQuery = `SELECT * FROM Item WHERE Name = '${item.Name.replace(/'/g, "\\'")}'`;
    
    const searchResponse = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/query?query=${encodeURIComponent(searchQuery)}`,
      method: 'GET'
    });

    // If item exists, return it
    if (searchResponse.json.QueryResponse?.Item?.length > 0) {
      console.log('QuickBooks item found:', searchResponse.json.QueryResponse.Item[0].Id);
      return res.json({
        success: true,
        data: searchResponse.json.QueryResponse.Item[0],
        message: 'Item found'
      });
    }

    // Create new item
    const createResponse = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/item`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });

    console.log('QuickBooks item created successfully:', createResponse.json.Item.Id);

    res.json({
      success: true,
      data: createResponse.json.Item,
      message: 'Item created successfully'
    });

  } catch (error) {
    console.error('QuickBooks item error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get or create item',
      details: error.intuit_tid || null
    });
  }
});

// =================== INVOICE MANAGEMENT ===================

/**
 * Get all invoices from QuickBooks
 * GET /api/quickbooks/invoices
 */
router.get('/invoices', async (req, res) => {
  try {
    const { access_token, realmId, dateFrom, dateTo, status } = req.query;

    if (!access_token || !realmId) {
      return res.status(400).json({
        success: false,
        error: 'Access token and realmId are required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;
    oauthClient.getToken().realmId = realmId;

    const baseUrl = oauthClient.environment === 'production' 
      ? 'https://quickbooks.api.intuit.com/' 
      : 'https://sandbox-quickbooks.api.intuit.com/';

    // Build query string for filtering
    let queryString = "SELECT * FROM Invoice";
    const conditions = [];
    
    if (dateFrom) {
      conditions.push(`TxnDate >= '${dateFrom}'`);
    }
    if (dateTo) {
      conditions.push(`TxnDate <= '${dateTo}'`);
    }
    
    if (conditions.length > 0) {
      queryString += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    queryString += " ORDER BY TxnDate DESC";
    
    console.log('🔍 QB Invoice Query:', queryString);

    // Fetch invoices
    const response = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/query?query=${encodeURIComponent(queryString)}`,
      method: 'GET'
    });

    const invoices = response.json.QueryResponse?.Invoice || [];
    console.log(`📦 Found ${invoices.length} invoices from QuickBooks`);

    // Also fetch customer data to enrich invoice info
    const customerResponse = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/query?query=${encodeURIComponent("SELECT * FROM Customer")}`,
      method: 'GET'
    });

    const customers = customerResponse.json.QueryResponse?.Customer || [];
    const customerMap = Object.fromEntries(customers.map(c => [c.Id, c]));

    // Enrich invoices with customer data and format for frontend
    const enrichedInvoices = invoices.map(invoice => {
      const customer = customerMap[invoice.CustomerRef?.value];
      return {
        id: invoice.Id,
        invoiceNumber: invoice.DocNumber,
        customerName: customer?.Name || invoice.CustomerRef?.name,
        customerEmail: customer?.PrimaryEmailAddr?.Address || '',
        invoiceDate: invoice.TxnDate,
        dueDate: invoice.DueDate,
        subtotal: parseFloat(invoice.TotalAmt || 0) - parseFloat(invoice.TxnTaxDetail?.TotalTax || 0),
        taxAmount: parseFloat(invoice.TxnTaxDetail?.TotalTax || 0),
        total: parseFloat(invoice.TotalAmt || 0),
        balance: parseFloat(invoice.Balance || 0),
        status: invoice.EmailStatus === 'EmailSent' ? 'Sent' : 
                invoice.Balance === 0 ? 'Paid' : 
                new Date(invoice.DueDate) < new Date() ? 'Overdue' : 'Draft',
        lineItems: invoice.Line?.filter(line => line.DetailType === 'SalesItemLineDetail').map(line => ({
          description: line.Description || line.SalesItemLineDetail?.ItemRef?.name,
          quantity: parseFloat(line.SalesItemLineDetail?.Qty || 1),
          rate: parseFloat(line.SalesItemLineDetail?.UnitPrice || 0),
          amount: parseFloat(line.Amount || 0)
        })) || [],
        quickbooksData: {
          id: invoice.Id,
          syncToken: invoice.SyncToken,
          txnDate: invoice.TxnDate,
          emailStatus: invoice.EmailStatus,
          printStatus: invoice.PrintStatus
        }
      };
    });

    res.json({
      success: true,
      data: enrichedInvoices,
      count: enrichedInvoices.length,
      meta: {
        environment: oauthClient.environment,
        realmId: realmId,
        query: queryString
      }
    });

  } catch (error) {
    console.error('QuickBooks invoice fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoices from QuickBooks',
      details: error.intuit_tid || null
    });
  }
});

/**
 * Get specific invoice from QuickBooks
 * GET /api/quickbooks/invoices/:invoiceId
 */
router.get('/invoices/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { access_token, realmId } = req.query;

    if (!access_token || !realmId) {
      return res.status(400).json({
        success: false,
        error: 'Access token and realmId are required'
      });
    }

    const oauthClient = createOAuthClient();
    oauthClient.getToken().access_token = access_token;
    oauthClient.getToken().realmId = realmId;

    const baseUrl = oauthClient.environment === 'production' 
      ? 'https://quickbooks.api.intuit.com/' 
      : 'https://sandbox-quickbooks.api.intuit.com/';

    // Fetch specific invoice
    const response = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/invoice/${invoiceId}`,
      method: 'GET'
    });

    const invoice = response.json.Invoice;
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Get customer details
    const customerResponse = await oauthClient.makeApiCall({
      url: `${baseUrl}v3/company/${realmId}/customer/${invoice.CustomerRef.value}`,
      method: 'GET'
    });

    const customer = customerResponse.json.Customer;

    // Format detailed invoice data
    const detailedInvoice = {
      id: invoice.Id,
      invoiceNumber: invoice.DocNumber,
      customerName: customer?.Name || invoice.CustomerRef?.name,
      customerEmail: customer?.PrimaryEmailAddr?.Address || '',
      billingAddress: customer?.BillAddr ? {
        street: customer.BillAddr.Line1 || '',
        city: customer.BillAddr.City || '',
        state: customer.BillAddr.CountrySubDivisionCode || '',
        postalCode: customer.BillAddr.PostalCode || '',
        country: customer.BillAddr.Country || ''
      } : {},
      invoiceDate: invoice.TxnDate,
      dueDate: invoice.DueDate,
      terms: invoice.SalesTermRef?.name || '',
      subtotal: parseFloat(invoice.TotalAmt || 0) - parseFloat(invoice.TxnTaxDetail?.TotalTax || 0),
      taxAmount: parseFloat(invoice.TxnTaxDetail?.TotalTax || 0),
      total: parseFloat(invoice.TotalAmt || 0),
      balance: parseFloat(invoice.Balance || 0),
      status: invoice.EmailStatus === 'EmailSent' ? 'Sent' : 
              invoice.Balance === 0 ? 'Paid' : 
              new Date(invoice.DueDate) < new Date() ? 'Overdue' : 'Draft',
      message: invoice.CustomerMemo?.value || '',
      lineItems: invoice.Line?.filter(line => line.DetailType === 'SalesItemLineDetail').map((line, index) => ({
        lineNumber: index + 1,
        description: line.Description || line.SalesItemLineDetail?.ItemRef?.name || '',
        quantity: parseFloat(line.SalesItemLineDetail?.Qty || 1),
        rate: parseFloat(line.SalesItemLineDetail?.UnitPrice || 0),
        amount: parseFloat(line.Amount || 0),
        taxable: line.SalesItemLineDetail?.TaxCodeRef?.value !== 'NON'
      })) || [],
      quickbooksData: {
        id: invoice.Id,
        syncToken: invoice.SyncToken,
        txnDate: invoice.TxnDate,
        createTime: invoice.CreateTime,
        lastUpdatedTime: invoice.LastUpdatedTime,
        emailStatus: invoice.EmailStatus,
        printStatus: invoice.PrintStatus
      }
    };

    res.json({
      success: true,
      data: detailedInvoice
    });

  } catch (error) {
    console.error('QuickBooks single invoice fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoice from QuickBooks',
      details: error.intuit_tid || null
    });
  }
});

module.exports = router;