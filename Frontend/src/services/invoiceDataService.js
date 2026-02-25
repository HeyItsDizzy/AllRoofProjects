// invoiceDataService.js - Enhanced for MongoDB integration
/* Handles QuickBooks CSV imported data, live API data, and mock data */

import { mockCustomer, mockInvoices, calculateFinancialStats } from '@/data/mockInvoiceData';

// Configuration - auto-detect or override
const DATA_SOURCE = process.env.REACT_APP_DATA_SOURCE || 'auto';

class InvoiceDataService {
  constructor() {
    this.dataSource = DATA_SOURCE;
  }

  // Get customer data
  async getCustomer(customerId) {
    if (this.dataSource === 'mock') {
      return this.getMockCustomer(customerId);
    } else {
      return this.getLiveCustomer(customerId);
    }
  }

  // Get invoice/transaction data - ENHANCED for MongoDB
  async getInvoices(customerId = null, filters = {}) {
    if (this.dataSource === 'mock') {
      return this.getMockInvoices(customerId, filters);
    } else {
      return this.getMongoInvoices(customerId, filters);
    }
  }

  // Calculate financial summary - ENHANCED
  async getFinancialSummary(customerId = null) {
    const invoices = await this.getInvoices(customerId);
    const stats = calculateFinancialStats(invoices);
    
    return {
      openBalance: stats.openBalance,
      overduePayment: stats.overdueAmount,
      totalInvoiced: stats.totalInvoiced,
      totalPaid: stats.totalPaid,
      totalInvoices: invoices.filter(inv => inv.type === 'Invoice').length,
      totalPayments: invoices.filter(inv => inv.type === 'Payment').length
    };
  }

  // NEW: Get MongoDB invoices (CSV imported + live API data)
  async getMongoInvoices(customerId = null, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (customerId) {
        queryParams.append('customerId', customerId);
      }
      
      // Apply filters
      if (filters.status && filters.status !== 'all') {
        queryParams.append('status', filters.status);
      }
      
      if (filters.dataSource && filters.dataSource !== 'all') {
        queryParams.append('dataSource', filters.dataSource);
      }
      
      if (filters.dateRange && filters.dateRange.length === 2) {
        queryParams.append('dateFrom', filters.dateRange[0].toISOString());
        queryParams.append('dateTo', filters.dateRange[1].toISOString());
      }
      
      if (filters.searchText) {
        queryParams.append('search', filters.searchText);
      }

      const response = await fetch(`/api/invoices?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Transform MongoDB invoices to frontend format
        const transformedInvoices = result.data.map(this.transformMongoInvoice);
        
        // Also get payments for this customer if specified
        let transformedPayments = [];
        if (customerId) {
          const paymentsResult = await this.getMongoPayments(customerId, filters);
          transformedPayments = paymentsResult.map(this.transformMongoPayment);
        }
        
        // Combine invoices and payments for transaction feed
        return [...transformedInvoices, ...transformedPayments]
          .sort((a, b) => new Date(b.date) - new Date(a.date));
      } else {
        throw new Error(result.message || 'Failed to fetch invoices');
      }
      
    } catch (error) {
      console.error('Error fetching MongoDB invoices:', error);
      // Fallback to mock data if API fails
      return this.getMockInvoices(customerId, filters);
    }
  }

  // NEW: Get MongoDB payments
  async getMongoPayments(customerId = null, filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (customerId) {
        queryParams.append('customerId', customerId);
      }
      
      // Apply date filters
      if (filters.dateRange && filters.dateRange.length === 2) {
        queryParams.append('dateFrom', filters.dateRange[0].toISOString());
        queryParams.append('dateTo', filters.dateRange[1].toISOString());
      }

      const response = await fetch(`/api/payments?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch payments');
      }
      
    } catch (error) {
      console.error('Error fetching MongoDB payments:', error);
      return [];
    }
  }

  // MOCK DATA METHODS
  getMockCustomer(customerId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...mockCustomer,
          id: customerId
        });
      }, 100); // Simulate API delay
    });
  }

  getMockInvoices(customerId, filters = {}) {
    return new Promise((resolve) => {
      setTimeout(() => {
        let filteredInvoices = [...mockInvoices];

        // Apply filters
        if (filters.status && filters.status !== 'all') {
          filteredInvoices = filteredInvoices.filter(inv => inv.status === filters.status);
        }

        if (filters.type && filters.type !== 'all') {
          filteredInvoices = filteredInvoices.filter(inv => inv.type === filters.type);
        }

        if (filters.dateRange && filters.dateRange.length === 2) {
          const [startDate, endDate] = filters.dateRange;
          filteredInvoices = filteredInvoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate >= startDate && invDate <= endDate;
          });
        }

        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          filteredInvoices = filteredInvoices.filter(inv => 
            inv.customer.toLowerCase().includes(searchLower) ||
            inv.projectName?.toLowerCase().includes(searchLower) ||
            inv.memo?.toLowerCase().includes(searchLower) ||
            inv.id.toString().includes(searchLower)
          );
        }

        resolve(filteredInvoices);
      }, 200); // Simulate API delay
    });
  }

  // LIVE QUICKBOOKS API METHODS
  async getLiveCustomer(customerId) {
    try {
      const response = await fetch(`/api/quickbooks/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customer: ${response.statusText}`);
      }

      const qbCustomer = await response.json();
      
      // Transform QuickBooks customer data to our format
      return this.transformQBCustomer(qbCustomer);
    } catch (error) {
      console.error('Error fetching live customer data:', error);
      // Fallback to mock data if API fails
      return this.getMockCustomer(customerId);
    }
  }

  async getLiveInvoices(customerId, filters = {}) {
    try {
      const queryParams = new URLSearchParams({
        customerId,
        ...filters
      });

      const response = await fetch(`/api/quickbooks/invoices?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.statusText}`);
      }

      const qbInvoices = await response.json();
      
      // Transform QuickBooks invoice data to our format
      return qbInvoices.map(this.transformQBInvoice);
    } catch (error) {
      console.error('Error fetching live invoice data:', error);
      // Fallback to mock data if API fails
      return this.getMockInvoices(customerId, filters);
    }
  }

  // TRANSFORMATION METHODS
  transformQBCustomer(qbCustomer) {
    return {
      id: qbCustomer.Id,
      name: qbCustomer.Name,
      displayName: qbCustomer.DisplayName || qbCustomer.Name,
      email: qbCustomer.PrimaryEmailAddr?.Address || '',
      phone: qbCustomer.PrimaryPhone?.FreeFormNumber || '',
      billingAddress: qbCustomer.BillAddr ? {
        line1: qbCustomer.BillAddr.Line1 || '',
        city: qbCustomer.BillAddr.City || '',
        state: qbCustomer.BillAddr.CountrySubDivisionCode || '',
        postalCode: qbCustomer.BillAddr.PostalCode || '',
        country: qbCustomer.BillAddr.Country || ''
      } : null,
      shippingAddress: qbCustomer.ShipAddr ? {
        line1: qbCustomer.ShipAddr.Line1 || '',
        city: qbCustomer.ShipAddr.City || '',
        state: qbCustomer.ShipAddr.CountrySubDivisionCode || '',
        postalCode: qbCustomer.ShipAddr.PostalCode || '',
        country: qbCustomer.ShipAddr.Country || ''
      } : null,
      notes: qbCustomer.Notes || '',
      customFields: {},
      avatar: this.generateAvatar(qbCustomer.Name)
    };
  }

  transformQBInvoice(qbInvoice) {
    return {
      id: qbInvoice.Id,
      key: qbInvoice.Id,
      date: qbInvoice.TxnDate,
      type: qbInvoice.DetailType === 'Payment' ? 'Payment' : 'Invoice',
      customer: qbInvoice.CustomerRef?.name || '',
      projectNumber: qbInvoice.CustomField?.find(f => f.Name === 'ProjectNumber')?.StringValue || '',
      projectName: qbInvoice.CustomField?.find(f => f.Name === 'ProjectName')?.StringValue || '',
      memo: qbInvoice.PrivateNote || '',
      amount: parseFloat(qbInvoice.TotalAmt || 0),
      status: this.mapQBStatus(qbInvoice.EmailStatus, qbInvoice.Balance),
      dueDate: qbInvoice.DueDate || null,
      paymentDate: qbInvoice.TxnDate || null
    };
  }

  // TRANSFORMATION METHODS for MongoDB data
  transformMongoInvoice(mongoInvoice) {
    return {
      id: mongoInvoice._id,
      key: mongoInvoice._id,
      date: mongoInvoice.invoiceDate,
      type: 'Invoice',
      customer: mongoInvoice.customerName,
      projectNumber: mongoInvoice.qb_invoice_number || mongoInvoice.invoiceNumber,
      projectName: mongoInvoice.memo || `Service - ${mongoInvoice.customerName}`,
      memo: mongoInvoice.memo || '',
      amount: Math.abs(mongoInvoice.total || mongoInvoice.subtotal || 0),
      status: this.mapMongoStatus(mongoInvoice.status),
      dueDate: mongoInvoice.dueDate,
      paymentDate: null,
      openBalance: mongoInvoice.balanceDue || mongoInvoice.open_balance || 0,
      dataSource: mongoInvoice.dataSource || 'unknown',
      qbInvoiceNumber: mongoInvoice.qb_invoice_number,
      // Additional fields for enhanced display
      terms: mongoInvoice.terms,
      sentStatus: mongoInvoice.sent_status,
      arPaidStatus: mongoInvoice.ar_paid_status,
      lineItems: mongoInvoice.lineItems || []
    };
  }

  transformMongoPayment(mongoPayment) {
    // Find related invoice number from applications
    const relatedInvoice = mongoPayment.invoiceApplications?.[0]?.invoiceNumber || 
                          mongoPayment.qb_invoice_number || 
                          'Unknown';
    
    return {
      id: mongoPayment._id,
      key: mongoPayment._id,
      date: mongoPayment.paymentDate,
      type: 'Payment',
      customer: mongoPayment.customerName,
      projectNumber: relatedInvoice,
      projectName: mongoPayment.memo || `Payment for ${relatedInvoice}`,
      memo: mongoPayment.memo || '',
      amount: -Math.abs(mongoPayment.totalAmount || 0), // Negative for payments
      status: 'paid',
      dueDate: null,
      paymentDate: mongoPayment.paymentDate,
      openBalance: 0,
      dataSource: mongoPayment.dataSource || 'unknown',
      paymentMethod: mongoPayment.paymentMethod,
      // Additional fields
      appliedAmount: mongoPayment.invoiceApplications?.reduce((sum, app) => sum + (app.appliedAmount || 0), 0) || 0,
      unappliedAmount: mongoPayment.unappliedAmount || 0
    };
  }

  // Status mapping for MongoDB invoice statuses
  mapMongoStatus(mongoStatus) {
    const statusMap = {
      'Draft': 'draft',
      'Sent': 'sent', 
      'Paid': 'paid',
      'Partial': 'partial',
      'Overdue': 'overdue',
      'Void': 'void',
      'Viewed': 'sent' // Map viewed to sent for display
    };
    return statusMap[mongoStatus] || 'draft';
  }

  // UTILITY METHODS
  generateAvatar(name) {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  mapQBStatus(emailStatus, balance) {
    if (balance === 0) return 'paid';
    if (emailStatus === 'EmailSent') return 'sent';
    if (balance > 0) return 'overdue'; // This would need more logic for actual overdue calculation
    return 'draft';
  }

  getAccessToken() {
    // This would retrieve the stored QuickBooks access token
    return localStorage.getItem('qb_access_token') || process.env.REACT_APP_QB_ACCESS_TOKEN;
  }

  // PUBLIC METHODS FOR SWITCHING DATA SOURCE
  setDataSource(source) {
    if (['mock', 'live'].includes(source)) {
      this.dataSource = source;
    }
  }

  getDataSource() {
    return this.dataSource;
  }
}

// Export singleton instance
export default new InvoiceDataService();