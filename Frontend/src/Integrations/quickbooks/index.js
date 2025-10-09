/**
 * QuickBooks Integration Index
 * Main export file for QuickBooks integration
 */

// Core client and authentication
export { default as QuickBooksClient } from './QuickBooksClient';
export { default as useQuickBooksAuth } from './useQuickBooksAuth';
export { default as QuickBooksService } from './QuickBooksService';

// Configuration and constants
export { 
  default as QUICKBOOKS_CONFIG,
  getEnvironmentConfig,
  validateEnvironmentVariables,
  buildApiUrl,
  formatQBDate,
  parseQBDate,
  DEFAULT_CLIENT_CONFIG
} from './config';

// React components
export {
  QuickBooksConnectButton,
  QuickBooksStatus,
  QuickBooksCallback,
  QuickBooksCompanyInfo,
  QuickBooksIntegration
} from './components';

// Utility functions
export {
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
} from './utils';

// Create a default configured client instance
export const createQuickBooksClient = (config = {}) => {
  return new QuickBooksClient({
    ...DEFAULT_CLIENT_CONFIG,
    ...config
  });
};

// Create a service instance with a client
export const createQuickBooksService = (client = null) => {
  const qbClient = client || createQuickBooksClient();
  return new QuickBooksService(qbClient);
};

// Export everything as default for convenience
export default {
  // Classes
  QuickBooksClient,
  QuickBooksService,
  
  // Hooks
  useQuickBooksAuth,
  
  // Components
  QuickBooksConnectButton,
  QuickBooksStatus,
  QuickBooksCallback,
  QuickBooksCompanyInfo,
  QuickBooksIntegration,
  
  // Configuration
  QUICKBOOKS_CONFIG,
  getEnvironmentConfig,
  validateEnvironmentVariables,
  buildApiUrl,
  formatQBDate,
  parseQBDate,
  DEFAULT_CLIENT_CONFIG,
  
  // Utilities
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
  deepClone,
  
  // Factory functions
  createQuickBooksClient,
  createQuickBooksService
};