/**
 * Invoice Reference & Sample Data
 * Complete examples for creating invoices aligned with QuickBooks structure
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE INVOICE DATA
// ═══════════════════════════════════════════════════════════════════════════════

const sampleInvoiceData = {
  // Basic invoice from your screenshot
  roofingTakeoffInvoice: {
    customerName: "Sample Client",
    customerEmail: "client@example.com",
    invoiceDate: "2026-02-11",
    dueDate: "2026-02-18",
    terms: "7 Days",
    billingAddress: {
      street: "123 Main Street",
      city: "Sydney", 
      state: "NSW",
      postalCode: "2000",
      country: "Australia"
    },
    lineItems: [
      {
        lineNumber: 1,
        serviceDate: "2026-02-11",
        productService: "Service Takeoff - Casual Tier",
        description: "Roof takeoff measurements and material calculations",
        quantity: 1,
        rate: 100.00,
        amount: 100.00,
        taxable: true,
        taxCode: "GST"
      },
      {
        lineNumber: 2,
        serviceDate: "2026-02-11", 
        productService: "Service Takeoff - Elite Tier",
        description: "Premium takeoff with detailed specifications",
        quantity: 1,
        rate: 70.00,
        amount: 70.00,
        taxable: true,
        taxCode: "GST"
      },
      {
        lineNumber: 3,
        serviceDate: "2026-02-11",
        productService: "Service Takeoff - ProTier", 
        description: "Professional grade takeoff with CAD drawings",
        quantity: 1,
        rate: 80.00,
        amount: 80.00,
        taxable: true,
        taxCode: "GST"
      }
    ],
    subtotal: 250.00,
    taxRate: 0.10,
    taxAmount: 25.00,
    total: 275.00,
    balanceDue: 275.00,
    amountsAre: "Exclusive of Tax",
    invoiceMessage: "Thanks and Kind regards\nRodney Pedersen\nPSB: 464-799\nA/N: 6095 1744 8",
    paymentOptions: {
      acceptCards: true,
      paypalEnabled: true,
      ccEmails: []
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE BUILDER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

class InvoiceBuilder {
  constructor() {
    this.invoice = {
      lineItems: [],
      taxRate: 0.10, // 10% GST
      amountsAre: "Exclusive of Tax",
      terms: "7 Days",
      status: "Draft"
    };
  }

  // Set customer information
  setCustomer(customerId, customerName, customerEmail) {
    this.invoice.customerId = customerId;
    this.invoice.customerName = customerName;
    this.invoice.customerEmail = customerEmail;
    return this;
  }

  // Set billing address
  setBillingAddress(address) {
    this.invoice.billingAddress = {
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'Australia'
    };
    return this;
  }

  // Set dates
  setDates(invoiceDate = new Date(), terms = "7 Days") {
    this.invoice.invoiceDate = invoiceDate;
    this.invoice.terms = terms;
    
    // Calculate due date based on terms
    const dueDate = new Date(invoiceDate);
    const daysToAdd = parseInt(terms.replace(/\D/g, '')) || 7;
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    this.invoice.dueDate = dueDate;
    
    return this;
  }

  // Add line item
  addLineItem(productService, description = '', quantity = 1, rate = 0, taxable = true) {
    const lineNumber = this.invoice.lineItems.length + 1;
    const amount = quantity * rate;
    
    this.invoice.lineItems.push({
      lineNumber,
      serviceDate: this.invoice.invoiceDate || new Date(),
      productService,
      description,
      quantity,
      rate,
      amount,
      taxable,
      taxCode: taxable ? 'GST' : 'Tax Free'
    });
    
    return this;
  }

  // Add project-based line items
  addProjectLineItems(project) {
    const pricingSnapshot = project.pricingSnapshot;
    
    if (pricingSnapshot) {
      this.addLineItem(
        `${project.PlanType || 'Standard'} Takeoff Service`,
        `Project: ${project.projectNumber} - ${project.name}`,
        project.Qty || 1,
        pricingSnapshot.priceEach || pricingSnapshot.totalPrice || 0
      );
    } else {
      // Fallback for projects without pricing snapshot
      this.addLineItem(
        'Roof Takeoff Service',
        `Project: ${project.projectNumber} - ${project.name}`,
        1,
        150.00 // Default rate
      );
    }
    
    return this;
  }

  // Set invoice message/notes
  setMessage(message) {
    this.invoice.invoiceMessage = message;
    return this;
  }

  // Enable payment options
  setPaymentOptions(acceptCards = true, paypalEnabled = false, ccEmails = []) {
    this.invoice.paymentOptions = {
      acceptCards,
      paypalEnabled,
      ccEmails
    };
    return this;
  }

  // Calculate totals
  calculateTotals() {
    this.invoice.subtotal = this.invoice.lineItems.reduce((sum, item) => sum + item.amount, 0);
    
    const taxableAmount = this.invoice.lineItems
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.amount, 0);
    
    this.invoice.taxAmount = Math.round(taxableAmount * this.invoice.taxRate * 100) / 100;
    this.invoice.total = this.invoice.subtotal + this.invoice.taxAmount;
    this.invoice.balanceDue = this.invoice.total;
    
    return this;
  }

  // Build final invoice object
  build() {
    return this.calculateTotals().invoice;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICKBOOKS INVOICE FORMATTER
// ═══════════════════════════════════════════════════════════════════════════════

class QuickBooksInvoiceFormatter {
  static formatForQuickBooks(invoice) {
    return {
      Invoice: {
        // Customer reference (must exist in QB)
        CustomerRef: {
          value: invoice.quickbooks?.customerId || "1", // QB Customer ID
          name: invoice.customerName
        },
        
        // Invoice details
        DocNumber: invoice.invoiceNumber,
        TxnDate: this.formatDate(invoice.invoiceDate),
        DueDate: this.formatDate(invoice.dueDate),
        
        // Billing address
        BillAddr: {
          Line1: invoice.billingAddress?.street,
          City: invoice.billingAddress?.city,
          CountrySubDivisionCode: invoice.billingAddress?.state,
          PostalCode: invoice.billingAddress?.postalCode,
          Country: invoice.billingAddress?.country
        },
        
        // Line items
        Line: [
          ...invoice.lineItems.map((item, index) => ({
            Id: (index + 1).toString(),
            LineNum: item.lineNumber,
            Amount: item.amount,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: {
                value: "1", // QB Item ID (must exist)
                name: item.productService
              },
              Qty: item.quantity,
              UnitPrice: item.rate,
              TaxCodeRef: {
                value: item.taxable ? "2" : "NON" // QB Tax Code
              }
            }
          })),
          // Subtotal line
          {
            Amount: invoice.total,
            DetailType: "SubTotalLineDetail"
          }
        ],
        
        // Email settings
        EmailStatus: "NotSet",
        BillEmail: {
          Address: invoice.customerEmail
        },
        
        // Terms
        SalesTermRef: {
          value: this.getTermsValue(invoice.terms)
        },
        
        // Customer message
        CustomerMemo: {
          value: invoice.invoiceMessage
        }
      }
    };
  }

  static formatDate(date) {
    return new Date(date).toISOString().split('T')[0];
  }

  static getTermsValue(terms) {
    const termMap = {
      'Due on receipt': '1',
      '7 Days': '2', 
      '14 Days': '3',
      '30 Days': '4',
      '60 Days': '5'
    };
    return termMap[terms] || '2';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════════

const usageExamples = {
  // Create invoice from project data
  createFromProject: (project, client) => {
    const invoice = new InvoiceBuilder()
      .setCustomer(client._id, client.name, client.email)
      .setBillingAddress(client.address || {})
      .setDates(new Date(), "7 Days")
      .addProjectLineItems(project)
      .setMessage("Thanks for your business!\n\nAll Roof Take-offs\nProfessional Takeoff Services")
      .setPaymentOptions(true, true, [])
      .build();
      
    return invoice;
  },

  // Create multi-service invoice
  createMultiService: (client) => {
    const invoice = new InvoiceBuilder()
      .setCustomer(client._id, client.name, client.email)
      .setDates(new Date(), "14 Days")
      .addLineItem("Service Takeoff - Casual Tier", "Basic roof measurements", 1, 100.00)
      .addLineItem("Service Takeoff - Elite Tier", "Detailed takeoff with specifications", 1, 70.00)
      .addLineItem("Service Takeoff - ProTier", "Premium service with CAD", 1, 80.00)
      .setMessage("Professional takeoff services completed")
      .build();
      
    return invoice;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const invoiceValidation = {
  validateInvoice: (invoice) => {
    const errors = [];
    
    if (!invoice.customerName) errors.push('Customer name is required');
    if (!invoice.customerEmail) errors.push('Customer email is required');
    if (!invoice.lineItems || invoice.lineItems.length === 0) errors.push('At least one line item required');
    if (invoice.total <= 0) errors.push('Invoice total must be greater than 0');
    
    // Validate line items
    invoice.lineItems?.forEach((item, index) => {
      if (!item.productService) errors.push(`Line ${index + 1}: Product/Service required`);
      if (item.quantity <= 0) errors.push(`Line ${index + 1}: Quantity must be greater than 0`);
      if (item.rate < 0) errors.push(`Line ${index + 1}: Rate cannot be negative`);
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = {
  sampleInvoiceData,
  InvoiceBuilder,
  QuickBooksInvoiceFormatter,
  usageExamples,
  invoiceValidation
};