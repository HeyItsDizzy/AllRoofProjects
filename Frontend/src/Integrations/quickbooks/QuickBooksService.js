/**
 * QuickBooks API Service
 * Service layer for common QuickBooks operations
 */

import QuickBooksClient from './QuickBooksClient';

class QuickBooksService {
  constructor(client) {
    this.client = client;
  }

  // =================== CUSTOMERS ===================

  /**
   * Get all customers
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of customers
   */
  async getAllCustomers(options = {}) {
    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const query = options.query || "SELECT * FROM Customer";
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.Customer || [];
  }

  /**
   * Create a new customer
   * @param {Object} customerData - Customer information
   * @returns {Promise<Object>} Created customer
   */
  async createCustomer(customerData) {
    const customer = {
      Name: customerData.name,
      CompanyName: customerData.companyName,
      BillAddr: customerData.billingAddress ? {
        Line1: customerData.billingAddress.line1,
        Line2: customerData.billingAddress.line2,
        City: customerData.billingAddress.city,
        Country: customerData.billingAddress.country,
        CountrySubDivisionCode: customerData.billingAddress.state,
        PostalCode: customerData.billingAddress.postalCode
      } : undefined,
      ShipAddr: customerData.shippingAddress ? {
        Line1: customerData.shippingAddress.line1,
        Line2: customerData.shippingAddress.line2,
        City: customerData.shippingAddress.city,
        Country: customerData.shippingAddress.country,
        CountrySubDivisionCode: customerData.shippingAddress.state,
        PostalCode: customerData.shippingAddress.postalCode
      } : undefined,
      PrimaryPhone: customerData.phone ? {
        FreeFormNumber: customerData.phone
      } : undefined,
      PrimaryEmailAddr: customerData.email ? {
        Address: customerData.email
      } : undefined,
      Notes: customerData.notes
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/customer`,
      method: 'POST',
      data: { Customer: customer }
    });

    return response.QueryResponse?.Customer?.[0] || response;
  }

  /**
   * Update an existing customer
   * @param {string} customerId - Customer ID
   * @param {Object} customerData - Updated customer information
   * @param {string} syncToken - Current sync token
   * @returns {Promise<Object>} Updated customer
   */
  async updateCustomer(customerId, customerData, syncToken) {
    const customer = {
      Id: customerId,
      SyncToken: syncToken,
      ...customerData
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/customer`,
      method: 'POST',
      data: { Customer: customer }
    });

    return response.QueryResponse?.Customer?.[0] || response;
  }

  // =================== ITEMS ===================

  /**
   * Get all items
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of items
   */
  async getAllItems(options = {}) {
    const query = options.query || "SELECT * FROM Item";
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.Item || [];
  }

  /**
   * Create a new item
   * @param {Object} itemData - Item information
   * @returns {Promise<Object>} Created item
   */
  async createItem(itemData) {
    const item = {
      Name: itemData.name,
      Description: itemData.description,
      Type: itemData.type || 'Inventory', // Inventory, Service, NonInventory
      UnitPrice: itemData.unitPrice,
      QtyOnHand: itemData.qtyOnHand,
      InvStartDate: itemData.invStartDate || new Date().toISOString().split('T')[0],
      TrackQtyOnHand: itemData.trackQtyOnHand !== false,
      IncomeAccountRef: itemData.incomeAccountRef ? {
        value: itemData.incomeAccountRef
      } : undefined,
      AssetAccountRef: itemData.assetAccountRef ? {
        value: itemData.assetAccountRef
      } : undefined,
      ExpenseAccountRef: itemData.expenseAccountRef ? {
        value: itemData.expenseAccountRef
      } : undefined
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/item`,
      method: 'POST',
      data: { Item: item }
    });

    return response.QueryResponse?.Item?.[0] || response;
  }

  // =================== INVOICES ===================

  /**
   * Get all invoices
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of invoices
   */
  async getAllInvoices(options = {}) {
    const query = options.query || "SELECT * FROM Invoice";
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.Invoice || [];
  }

  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice information
   * @returns {Promise<Object>} Created invoice
   */
  async createInvoice(invoiceData) {
    const invoice = {
      CustomerRef: {
        value: invoiceData.customerId
      },
      Line: invoiceData.lineItems.map((item, index) => ({
        Id: (index + 1).toString(),
        LineNum: index + 1,
        Amount: item.amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            value: item.itemId,
            name: item.itemName
          },
          UnitPrice: item.unitPrice,
          Qty: item.quantity
        }
      })),
      DueDate: invoiceData.dueDate,
      TxnDate: invoiceData.txnDate || new Date().toISOString().split('T')[0],
      DocNumber: invoiceData.docNumber,
      PrivateNote: invoiceData.privateNote,
      CustomerMemo: invoiceData.customerMemo ? {
        value: invoiceData.customerMemo
      } : undefined
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/invoice`,
      method: 'POST',
      data: { Invoice: invoice }
    });

    return response.QueryResponse?.Invoice?.[0] || response;
  }

  /**
   * Send invoice via email
   * @param {string} invoiceId - Invoice ID
   * @param {string} emailAddress - Recipient email
   * @returns {Promise<Object>} Send result
   */
  async sendInvoice(invoiceId, emailAddress) {
    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/invoice/${invoiceId}/send?sendTo=${encodeURIComponent(emailAddress)}`,
      method: 'POST'
    });

    return response;
  }

  // =================== ESTIMATES ===================

  /**
   * Get all estimates
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of estimates
   */
  async getAllEstimates(options = {}) {
    const query = options.query || "SELECT * FROM Estimate";
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.Estimate || [];
  }

  /**
   * Create a new estimate
   * @param {Object} estimateData - Estimate information
   * @returns {Promise<Object>} Created estimate
   */
  async createEstimate(estimateData) {
    const estimate = {
      CustomerRef: {
        value: estimateData.customerId
      },
      Line: estimateData.lineItems.map((item, index) => ({
        Id: (index + 1).toString(),
        LineNum: index + 1,
        Amount: item.amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: {
            value: item.itemId,
            name: item.itemName
          },
          UnitPrice: item.unitPrice,
          Qty: item.quantity
        }
      })),
      ExpirationDate: estimateData.expirationDate,
      TxnDate: estimateData.txnDate || new Date().toISOString().split('T')[0],
      DocNumber: estimateData.docNumber,
      PrivateNote: estimateData.privateNote,
      CustomerMemo: estimateData.customerMemo ? {
        value: estimateData.customerMemo
      } : undefined
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/estimate`,
      method: 'POST',
      data: { Estimate: estimate }
    });

    return response.QueryResponse?.Estimate?.[0] || response;
  }

  /**
   * Convert estimate to invoice
   * @param {string} estimateId - Estimate ID
   * @returns {Promise<Object>} Created invoice
   */
  async convertEstimateToInvoice(estimateId) {
    // First get the estimate
    const estimate = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/estimate/${estimateId}`
    });

    const estimateData = estimate.QueryResponse?.Estimate?.[0];
    if (!estimateData) {
      throw new Error('Estimate not found');
    }

    // Create invoice from estimate data
    const invoice = {
      CustomerRef: estimateData.CustomerRef,
      Line: estimateData.Line,
      TxnDate: new Date().toISOString().split('T')[0],
      PrivateNote: `Converted from Estimate #${estimateData.DocNumber}`,
      LinkedTxn: [{
        TxnId: estimateId,
        TxnType: "Estimate"
      }]
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/invoice`,
      method: 'POST',
      data: { Invoice: invoice }
    });

    return response.QueryResponse?.Invoice?.[0] || response;
  }

  // =================== ACCOUNTS ===================

  /**
   * Get all accounts
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of accounts
   */
  async getAllAccounts(options = {}) {
    const query = options.query || "SELECT * FROM Account";
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.Account || [];
  }

  // =================== PAYMENTS ===================

  /**
   * Get all payments
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of payments
   */
  async getAllPayments(options = {}) {
    const query = options.query || "SELECT * FROM Payment";
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.Payment || [];
  }

  /**
   * Create a payment
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Created payment
   */
  async createPayment(paymentData) {
    const payment = {
      CustomerRef: {
        value: paymentData.customerId
      },
      TotalAmt: paymentData.totalAmount,
      TxnDate: paymentData.txnDate || new Date().toISOString().split('T')[0],
      PaymentMethodRef: paymentData.paymentMethodRef ? {
        value: paymentData.paymentMethodRef
      } : undefined,
      DepositToAccountRef: paymentData.depositToAccountRef ? {
        value: paymentData.depositToAccountRef
      } : undefined,
      Line: paymentData.invoiceIds ? paymentData.invoiceIds.map((invoiceId, index) => ({
        Amount: paymentData.amounts[index],
        LinkedTxn: [{
          TxnId: invoiceId,
          TxnType: "Invoice"
        }]
      })) : undefined
    };

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/payment`,
      method: 'POST',
      data: { Payment: payment }
    });

    return response.QueryResponse?.Payment?.[0] || response;
  }

  // =================== REPORTS ===================

  /**
   * Get profit and loss report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Report data
   */
  async getProfitAndLossReport(options = {}) {
    const params = new URLSearchParams({
      start_date: options.startDate || '2024-01-01',
      end_date: options.endDate || new Date().toISOString().split('T')[0],
      summarize_column_by: options.summarizeColumnBy || 'Month'
    });

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/reports/ProfitAndLoss?${params.toString()}`
    });

    return response;
  }

  /**
   * Get balance sheet report
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Report data
   */
  async getBalanceSheetReport(options = {}) {
    const params = new URLSearchParams({
      date: options.date || new Date().toISOString().split('T')[0]
    });

    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/reports/BalanceSheet?${params.toString()}`
    });

    return response;
  }

  // =================== UTILITIES ===================

  /**
   * Search for entities by name
   * @param {string} entityType - Entity type (Customer, Item, etc.)
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Search results
   */
  async searchEntities(entityType, searchTerm) {
    const query = `SELECT * FROM ${entityType} WHERE Name LIKE '%${searchTerm}%'`;
    const queryResponse = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/query?query=${encodeURIComponent(query)}`
    });

    return queryResponse.QueryResponse?.[entityType] || [];
  }

  /**
   * Get entity by ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<Object>} Entity data
   */
  async getEntityById(entityType, entityId) {
    const response = await this.client.makeApiCall({
      endpoint: `/v3/company/{realmId}/${entityType.toLowerCase()}/${entityId}`
    });

    return response.QueryResponse?.[entityType]?.[0] || response;
  }
}

export default QuickBooksService;