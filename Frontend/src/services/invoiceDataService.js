// invoiceDataService.js - Abstraction layer for invoice data
/* Handles switching between mock data and live QuickBooks API */

import { mockCustomer, mockInvoices, calculateFinancialStats } from '@/data/mockInvoiceData';

// Configuration - switch between 'mock' and 'live'
const DATA_SOURCE = process.env.REACT_APP_DATA_SOURCE || 'mock';

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

  // Get invoice/transaction data
  async getInvoices(customerId, filters = {}) {
    if (this.dataSource === 'mock') {
      return this.getMockInvoices(customerId, filters);
    } else {
      return this.getLiveInvoices(customerId, filters);
    }
  }

  // Calculate financial summary
  async getFinancialSummary(customerId) {
    const invoices = await this.getInvoices(customerId);
    const stats = calculateFinancialStats(invoices);
    
    return {
      openBalance: stats.openBalance,
      overduePayment: stats.overdueAmount,
      totalInvoiced: stats.totalInvoiced,
      totalPaid: stats.totalPaid
    };
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