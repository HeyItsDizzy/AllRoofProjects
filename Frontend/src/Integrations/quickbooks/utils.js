/**
 * QuickBooks Utils
 * Utility functions for QuickBooks integration
 */

import { QUICKBOOKS_CONFIG, formatQBDate, parseQBDate } from './config';

/**
 * Format currency for QuickBooks
 * @param {number} amount - Amount to format
 * @returns {number} Formatted amount
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 0;
  return Math.round(amount * 100) / 100;
};

/**
 * Parse QuickBooks reference object
 * @param {Object} ref - Reference object from QB
 * @returns {Object} Parsed reference
 */
export const parseReference = (ref) => {
  if (!ref) return null;
  return {
    id: ref.value,
    name: ref.name
  };
};

/**
 * Create QuickBooks reference object
 * @param {string} id - Entity ID
 * @param {string} name - Entity name (optional)
 * @returns {Object} Reference object
 */
export const createReference = (id, name = null) => {
  const ref = { value: id };
  if (name) ref.name = name;
  return ref;
};

/**
 * Parse QuickBooks address object
 * @param {Object} addr - Address object from QB
 * @returns {Object} Parsed address
 */
export const parseAddress = (addr) => {
  if (!addr) return null;
  return {
    line1: addr.Line1 || '',
    line2: addr.Line2 || '',
    line3: addr.Line3 || '',
    line4: addr.Line4 || '',
    line5: addr.Line5 || '',
    city: addr.City || '',
    country: addr.Country || '',
    countrySubDivisionCode: addr.CountrySubDivisionCode || '',
    postalCode: addr.PostalCode || '',
    lat: addr.Lat || '',
    long: addr.Long || ''
  };
};

/**
 * Create QuickBooks address object
 * @param {Object} address - Address data
 * @returns {Object} QB address object
 */
export const createAddress = (address) => {
  if (!address) return null;
  
  const addr = {};
  if (address.line1) addr.Line1 = address.line1;
  if (address.line2) addr.Line2 = address.line2;
  if (address.line3) addr.Line3 = address.line3;
  if (address.line4) addr.Line4 = address.line4;
  if (address.line5) addr.Line5 = address.line5;
  if (address.city) addr.City = address.city;
  if (address.country) addr.Country = address.country;
  if (address.countrySubDivisionCode) addr.CountrySubDivisionCode = address.countrySubDivisionCode;
  if (address.postalCode) addr.PostalCode = address.postalCode;
  if (address.lat) addr.Lat = address.lat;
  if (address.long) addr.Long = address.long;
  
  return Object.keys(addr).length > 0 ? addr : null;
};

/**
 * Parse QuickBooks phone object
 * @param {Object} phone - Phone object from QB
 * @returns {string} Phone number
 */
export const parsePhone = (phone) => {
  if (!phone) return '';
  return phone.FreeFormNumber || '';
};

/**
 * Create QuickBooks phone object
 * @param {string} phoneNumber - Phone number
 * @returns {Object} QB phone object
 */
export const createPhone = (phoneNumber) => {
  if (!phoneNumber) return null;
  return { FreeFormNumber: phoneNumber };
};

/**
 * Parse QuickBooks email object
 * @param {Object} email - Email object from QB
 * @returns {string} Email address
 */
export const parseEmail = (email) => {
  if (!email) return '';
  return email.Address || '';
};

/**
 * Create QuickBooks email object
 * @param {string} emailAddress - Email address
 * @returns {Object} QB email object
 */
export const createEmail = (emailAddress) => {
  if (!emailAddress) return null;
  return { Address: emailAddress };
};

/**
 * Calculate line total from QuickBooks line item
 * @param {Object} line - Line item from QB
 * @returns {number} Line total
 */
export const calculateLineTotal = (line) => {
  if (!line) return 0;
  
  if (line.Amount) {
    return parseFloat(line.Amount);
  }
  
  const detail = line.SalesItemLineDetail || line.ItemBasedExpenseLineDetail;
  if (detail && detail.UnitPrice && detail.Qty) {
    return parseFloat(detail.UnitPrice) * parseFloat(detail.Qty);
  }
  
  return 0;
};

/**
 * Calculate total from QuickBooks line items
 * @param {Array} lines - Array of line items
 * @returns {number} Total amount
 */
export const calculateTotal = (lines) => {
  if (!Array.isArray(lines)) return 0;
  
  return lines.reduce((total, line) => {
    return total + calculateLineTotal(line);
  }, 0);
};

/**
 * Build QuickBooks query string
 * @param {string} entityType - Entity type (Customer, Item, etc.)
 * @param {Object} filters - Query filters
 * @returns {string} Query string
 */
export const buildQuery = (entityType, filters = {}) => {
  let query = `SELECT * FROM ${entityType}`;
  
  const conditions = [];
  
  // Common filters
  if (filters.name) {
    conditions.push(`Name LIKE '%${filters.name}%'`);
  }
  
  if (filters.active !== undefined) {
    conditions.push(`Active = ${filters.active}`);
  }
  
  if (filters.id) {
    conditions.push(`Id = '${filters.id}'`);
  }
  
  if (filters.type) {
    conditions.push(`Type = '${filters.type}'`);
  }
  
  if (filters.startDate && filters.endDate) {
    conditions.push(`TxnDate >= '${formatQBDate(filters.startDate)}' AND TxnDate <= '${formatQBDate(filters.endDate)}'`);
  }
  
  if (filters.customerId) {
    conditions.push(`CustomerRef = '${filters.customerId}'`);
  }
  
  if (filters.vendorId) {
    conditions.push(`VendorRef = '${filters.vendorId}'`);
  }
  
  // Add custom conditions
  if (filters.customConditions) {
    conditions.push(...filters.customConditions);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  // Add ordering
  if (filters.orderBy) {
    query += ` ORDER BY ${filters.orderBy}`;
    if (filters.orderDirection) {
      query += ` ${filters.orderDirection}`;
    }
  }
  
  // Add limit
  if (filters.maxResults) {
    query += ` MAXRESULTS ${filters.maxResults}`;
  }
  
  return query;
};

/**
 * Validate QuickBooks entity data
 * @param {string} entityType - Entity type
 * @param {Object} data - Entity data
 * @returns {Object} Validation result
 */
export const validateEntity = (entityType, data) => {
  const errors = [];
  
  switch (entityType) {
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.CUSTOMER:
      if (!data.Name) errors.push('Customer name is required');
      break;
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.ITEM:
      if (!data.Name) errors.push('Item name is required');
      if (!data.Type) errors.push('Item type is required');
      if (data.Type === 'Inventory' && data.UnitPrice === undefined) {
        errors.push('Unit price is required for inventory items');
      }
      break;
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.INVOICE:
      if (!data.CustomerRef?.value) errors.push('Customer is required');
      if (!data.Line || data.Line.length === 0) errors.push('At least one line item is required');
      break;
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.ESTIMATE:
      if (!data.CustomerRef?.value) errors.push('Customer is required');
      if (!data.Line || data.Line.length === 0) errors.push('At least one line item is required');
      break;
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.PAYMENT:
      if (!data.CustomerRef?.value) errors.push('Customer is required');
      if (!data.TotalAmt) errors.push('Payment amount is required');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Transform entity data for QuickBooks API
 * @param {string} entityType - Entity type
 * @param {Object} data - Raw entity data
 * @returns {Object} Transformed data
 */
export const transformEntityData = (entityType, data) => {
  switch (entityType) {
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.CUSTOMER:
      return transformCustomerData(data);
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.ITEM:
      return transformItemData(data);
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.INVOICE:
      return transformInvoiceData(data);
      
    case QUICKBOOKS_CONFIG.ENTITY_TYPES.ESTIMATE:
      return transformEstimateData(data);
      
    default:
      return data;
  }
};

/**
 * Transform customer data
 * @param {Object} data - Customer data
 * @returns {Object} Transformed customer data
 */
const transformCustomerData = (data) => {
  const customer = {
    Name: data.name,
    CompanyName: data.companyName,
    Notes: data.notes
  };
  
  if (data.billingAddress) {
    customer.BillAddr = createAddress(data.billingAddress);
  }
  
  if (data.shippingAddress) {
    customer.ShipAddr = createAddress(data.shippingAddress);
  }
  
  if (data.phone) {
    customer.PrimaryPhone = createPhone(data.phone);
  }
  
  if (data.email) {
    customer.PrimaryEmailAddr = createEmail(data.email);
  }
  
  return customer;
};

/**
 * Transform item data
 * @param {Object} data - Item data
 * @returns {Object} Transformed item data
 */
const transformItemData = (data) => {
  const item = {
    Name: data.name,
    Description: data.description,
    Type: data.type || 'Inventory',
    UnitPrice: data.unitPrice,
    TrackQtyOnHand: data.trackQtyOnHand !== false
  };
  
  if (data.type === 'Inventory') {
    item.QtyOnHand = data.qtyOnHand || 0;
    item.InvStartDate = formatQBDate(data.invStartDate || new Date());
  }
  
  if (data.incomeAccountRef) {
    item.IncomeAccountRef = createReference(data.incomeAccountRef);
  }
  
  if (data.assetAccountRef) {
    item.AssetAccountRef = createReference(data.assetAccountRef);
  }
  
  if (data.expenseAccountRef) {
    item.ExpenseAccountRef = createReference(data.expenseAccountRef);
  }
  
  return item;
};

/**
 * Transform invoice data
 * @param {Object} data - Invoice data
 * @returns {Object} Transformed invoice data
 */
const transformInvoiceData = (data) => {
  const invoice = {
    CustomerRef: createReference(data.customerId),
    TxnDate: formatQBDate(data.txnDate || new Date()),
    DueDate: formatQBDate(data.dueDate),
    DocNumber: data.docNumber,
    PrivateNote: data.privateNote,
    Line: data.lineItems.map((item, index) => ({
      Id: (index + 1).toString(),
      LineNum: index + 1,
      Amount: formatCurrency(item.amount),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: createReference(item.itemId, item.itemName),
        UnitPrice: formatCurrency(item.unitPrice),
        Qty: item.quantity
      }
    }))
  };
  
  if (data.customerMemo) {
    invoice.CustomerMemo = { value: data.customerMemo };
  }
  
  return invoice;
};

/**
 * Transform estimate data
 * @param {Object} data - Estimate data
 * @returns {Object} Transformed estimate data
 */
const transformEstimateData = (data) => {
  const estimate = {
    CustomerRef: createReference(data.customerId),
    TxnDate: formatQBDate(data.txnDate || new Date()),
    ExpirationDate: formatQBDate(data.expirationDate),
    DocNumber: data.docNumber,
    PrivateNote: data.privateNote,
    Line: data.lineItems.map((item, index) => ({
      Id: (index + 1).toString(),
      LineNum: index + 1,
      Amount: formatCurrency(item.amount),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: createReference(item.itemId, item.itemName),
        UnitPrice: formatCurrency(item.unitPrice),
        Qty: item.quantity
      }
    }))
  };
  
  if (data.customerMemo) {
    estimate.CustomerMemo = { value: data.customerMemo };
  }
  
  return estimate;
};

/**
 * Handle QuickBooks API errors
 * @param {Error} error - Error object
 * @returns {Object} Processed error
 */
export const handleQBError = (error) => {
  let message = 'An error occurred';
  let code = null;
  let type = 'unknown';
  
  if (error.response?.data?.Fault) {
    const fault = error.response.data.Fault;
    message = fault.Error?.[0]?.Detail || fault.Error?.[0]?.code || message;
    code = fault.Error?.[0]?.code;
    type = fault.type || 'api';
  } else if (error.message) {
    message = error.message;
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      type = 'authentication';
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      type = 'permission';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      type = 'not_found';
    } else if (error.message.includes('timeout')) {
      type = 'timeout';
    }
  }
  
  return {
    message,
    code,
    type,
    originalError: error
  };
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Result of function
 */
export const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Don't retry certain types of errors
      const processedError = handleQBError(error);
      if (processedError.type === 'authentication' || processedError.type === 'permission') {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

/**
 * Generate unique identifier for local use
 * @returns {string} Unique identifier
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

export default {
  formatCurrency,
  parseReference,
  createReference,
  parseAddress,
  createAddress,
  parsePhone,
  createPhone,
  parseEmail,
  createEmail,
  calculateLineTotal,
  calculateTotal,
  buildQuery,
  validateEntity,
  transformEntityData,
  handleQBError,
  retryWithBackoff,
  generateId,
  deepClone
};