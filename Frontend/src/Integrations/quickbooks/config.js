/**
 * QuickBooks Configuration
 * Configuration settings and constants for QuickBooks integration
 */

export const QUICKBOOKS_CONFIG = {
  // OAuth Endpoints
  ENDPOINTS: {
    AUTHORIZE: 'https://appcenter.intuit.com/connect/oauth2',
    TOKEN: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    REVOKE: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    USER_INFO_SANDBOX: 'https://sandbox-accounts.platform.intuit.com/v1/openid_connect/userinfo',
    USER_INFO_PRODUCTION: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
    JWKS: 'https://oauth.platform.intuit.com/op/v1/jwks'
  },

  // API Base URLs
  API_BASE_URLS: {
    SANDBOX: 'https://sandbox-quickbooks.api.intuit.com/',
    PRODUCTION: 'https://quickbooks.api.intuit.com/'
  },

  // QuickBooks Online App URLs
  QBO_URLS: {
    SANDBOX: 'https://sandbox.qbo.intuit.com/app/',
    PRODUCTION: 'https://qbo.intuit.com/app/'
  },

  // Available Scopes
  SCOPES: {
    ACCOUNTING: 'com.intuit.quickbooks.accounting',
    PAYMENT: 'com.intuit.quickbooks.payment',
    PAYROLL: 'com.intuit.quickbooks.payroll',
    TIME_TRACKING: 'com.intuit.quickbooks.payroll.timetracking',
    BENEFITS: 'com.intuit.quickbooks.payroll.benefits',
    PROFILE: 'profile',
    EMAIL: 'email',
    PHONE: 'phone',
    ADDRESS: 'address',
    OPENID: 'openid',
    INTUIT_NAME: 'intuit_name'
  },

  // Default scope combinations
  DEFAULT_SCOPES: {
    BASIC: ['com.intuit.quickbooks.accounting', 'openid'],
    FULL: ['com.intuit.quickbooks.accounting', 'com.intuit.quickbooks.payment', 'openid', 'profile', 'email'],
    PAYROLL: ['com.intuit.quickbooks.payroll', 'com.intuit.quickbooks.payroll.timetracking', 'openid']
  },

  // Token expiration times (in seconds)
  TOKEN_EXPIRY: {
    ACCESS_TOKEN: 3600,      // 1 hour
    REFRESH_TOKEN: 8726400   // 101 days
  },

  // API Version
  API_VERSION: 'v3',

  // Common QuickBooks entity types
  ENTITY_TYPES: {
    ACCOUNT: 'Account',
    CUSTOMER: 'Customer',
    VENDOR: 'Vendor',
    EMPLOYEE: 'Employee',
    ITEM: 'Item',
    INVOICE: 'Invoice',
    BILL: 'Bill',
    PAYMENT: 'Payment',
    ESTIMATE: 'Estimate',
    PURCHASE_ORDER: 'PurchaseOrder',
    SALES_RECEIPT: 'SalesReceipt',
    CREDIT_MEMO: 'CreditMemo',
    REFUND_RECEIPT: 'RefundReceipt',
    JOURNAL_ENTRY: 'JournalEntry',
    TIME_ACTIVITY: 'TimeActivity',
    CLASS: 'Class',
    DEPARTMENT: 'Department',
    TAX_CODE: 'TaxCode',
    TAX_RATE: 'TaxRate',
    PAYMENT_METHOD: 'PaymentMethod',
    TERM: 'Term',
    COMPANY_INFO: 'CompanyInfo',
    PREFERENCES: 'Preferences'
  },

  // Account types
  ACCOUNT_TYPES: {
    ASSET: 'Asset',
    BANK: 'Bank',
    ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
    OTHER_CURRENT_ASSET: 'Other Current Asset',
    FIXED_ASSET: 'Fixed Asset',
    OTHER_ASSET: 'Other Asset',
    LIABILITY: 'Liability',
    ACCOUNTS_PAYABLE: 'Accounts Payable',
    CREDIT_CARD: 'Credit Card',
    OTHER_CURRENT_LIABILITY: 'Other Current Liability',
    LONG_TERM_LIABILITY: 'Long Term Liability',
    EQUITY: 'Equity',
    INCOME: 'Income',
    EXPENSE: 'Expense',
    COST_OF_GOODS_SOLD: 'Cost of Goods Sold',
    OTHER_INCOME: 'Other Income',
    OTHER_EXPENSE: 'Other Expense'
  },

  // Item types
  ITEM_TYPES: {
    INVENTORY: 'Inventory',
    NON_INVENTORY: 'NonInventory',
    SERVICE: 'Service',
    GROUP: 'Group',
    CATEGORY: 'Category'
  },

  // Payment types
  PAYMENT_TYPES: {
    CASH: 'Cash',
    CHECK: 'Check',
    CREDIT_CARD: 'CreditCard',
    OTHER: 'Other'
  },

  // Invoice/Estimate statuses
  TRANSACTION_STATUS: {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    CLOSED: 'Closed',
    REJECTED: 'Rejected'
  },

  // Tax types
  TAX_TYPES: {
    TAX_ON_SALES: 'TaxOnSales',
    TAX_ON_PURCHASES: 'TaxOnPurchases'
  },

  // Common error codes
  ERROR_CODES: {
    INVALID_TOKEN: '3200',
    TOKEN_EXPIRED: '401',
    INSUFFICIENT_PERMISSION: '010001',
    OBJECT_NOT_FOUND: '610',
    STALE_OBJECT_ERROR: '5010',
    BUSINESS_VALIDATION_ERROR: '6000'
  },

  // Report types
  REPORT_TYPES: {
    PROFIT_AND_LOSS: 'ProfitAndLoss',
    BALANCE_SHEET: 'BalanceSheet',
    CASH_FLOW: 'CashFlow',
    TRIAL_BALANCE: 'TrialBalance',
    GENERAL_LEDGER: 'GeneralLedger',
    AGED_RECEIVABLES: 'AgedReceivables',
    AGED_PAYABLES: 'AgedPayables',
    CUSTOMER_SALES: 'CustomerSales',
    VENDOR_EXPENSES: 'VendorExpenses',
    ITEM_SALES: 'ItemSales',
    TRANSACTION_LIST: 'TransactionList'
  },

  // Date formats
  DATE_FORMATS: {
    API_DATE: 'YYYY-MM-DD',
    DISPLAY_DATE: 'MM/DD/YYYY',
    ISO_DATE: 'YYYY-MM-DDTHH:mm:ss.sssZ'
  },

  // Webhook event types
  WEBHOOK_EVENTS: {
    CREATE: 'Create',
    UPDATE: 'Update',
    DELETE: 'Delete',
    VOID: 'Void',
    EMAILED: 'Emailed'
  },

  // Batch operation limits
  BATCH_LIMITS: {
    MAX_BATCH_SIZE: 30,
    MAX_QUERY_RESULTS: 1000
  },

  // File upload limits
  FILE_LIMITS: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_TYPES: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv']
  }
};

// Environment-specific configuration
export const getEnvironmentConfig = (environment = 'sandbox') => {
  const isProd = environment === 'production';
  
  return {
    apiBaseUrl: isProd ? QUICKBOOKS_CONFIG.API_BASE_URLS.PRODUCTION : QUICKBOOKS_CONFIG.API_BASE_URLS.SANDBOX,
    qboUrl: isProd ? QUICKBOOKS_CONFIG.QBO_URLS.PRODUCTION : QUICKBOOKS_CONFIG.QBO_URLS.SANDBOX,
    userInfoEndpoint: isProd ? QUICKBOOKS_CONFIG.ENDPOINTS.USER_INFO_PRODUCTION : QUICKBOOKS_CONFIG.ENDPOINTS.USER_INFO_SANDBOX,
    environment
  };
};

// Helper function to validate required environment variables
export const validateEnvironmentVariables = () => {
  const required = [
    'REACT_APP_QB_CLIENT_ID',
    'REACT_APP_QB_CLIENT_SECRET',
    'REACT_APP_QB_ENVIRONMENT',
    'REACT_APP_QB_REDIRECT_URI'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('Missing QuickBooks environment variables:', missing);
    return false;
  }
  
  return true;
};

// Helper function to build API URL
export const buildApiUrl = (environment, endpoint, realmId = null) => {
  const baseUrl = getEnvironmentConfig(environment).apiBaseUrl;
  const cleanEndpoint = endpoint.replace(/^\//, '');
  
  if (realmId && cleanEndpoint.includes('{realmId}')) {
    return `${baseUrl}${cleanEndpoint.replace('{realmId}', realmId)}`;
  }
  
  return `${baseUrl}${cleanEndpoint}`;
};

// Helper function to format QuickBooks date
export const formatQBDate = (date) => {
  if (!date) return null;
  
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper function to parse QuickBooks date
export const parseQBDate = (qbDate) => {
  if (!qbDate) return null;
  return new Date(qbDate);
};

// Default configuration object for QuickBooksClient
export const DEFAULT_CLIENT_CONFIG = {
  environment: process.env.REACT_APP_QB_ENVIRONMENT || 'sandbox',
  clientId: process.env.REACT_APP_QB_CLIENT_ID,
  clientSecret: process.env.REACT_APP_QB_CLIENT_SECRET,
  redirectUri: process.env.REACT_APP_QB_REDIRECT_URI || `${window.location.origin}/quickbooks/callback`,
  scopes: QUICKBOOKS_CONFIG.DEFAULT_SCOPES.BASIC,
  logging: process.env.NODE_ENV === 'development'
};

export default QUICKBOOKS_CONFIG;