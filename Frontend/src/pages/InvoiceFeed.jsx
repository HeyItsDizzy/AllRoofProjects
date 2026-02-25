// InvoiceFeed.jsx - Invoice history feed with customer header
/* PRODUCTION READY - QuickBooks Integration & CSV Import Frontend */
import React, { useState, useEffect, useContext } from "react";
import { Button, Input, Select, DatePicker, Table, Tag, Space, Card, Statistic, Row, Col, Avatar, Tabs, Modal, Upload, message } from "antd";
import { IconSearch, IconFilter, IconDownload, IconView, IconEdit, IconMail, IconPhone, IconEdit as IconEditPen, IconDown, IconRight, IconUpload, IconDatabase, IconRefresh } from "@/shared/IconSet";
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import dayjs from 'dayjs';
import invoiceDataService from '@/services/invoiceDataService';
import { calculateFinancialStats } from '@/data/mockInvoiceData';
import styles from './InvoiceFeed.module.css';

const { Option } = Select;
const { RangePicker } = DatePicker;

const InvoiceFeed = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  // State management
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0
  });

  // Data source indicator
  const [dataSource, setDataSource] = useState('auto'); // 'auto', 'live', 'mock'
  const [qbConnected, setQbConnected] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  
  // Admin controls for data management
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [dataSourceFilter, setDataSourceFilter] = useState('all'); // 'all', 'csv', 'api', 'local'
  const [showAdmin, setShowAdmin] = useState(false); // Admin panel toggle
  const [lineItemSyncLoading, setLineItemSyncLoading] = useState(false);
  
  // Admin client selector
  const [adminSelectedClientId, setAdminSelectedClientId] = useState(null);
  const [availableClients, setAvailableClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  
  // Collapsible container states (collapsed by default)
  const [isBillingExpanded, setIsBillingExpanded] = useState(false);
  const [isLegalExpanded, setIsLegalExpanded] = useState(false);
  
  // Toggle data source
  const toggleDataSource = () => {
    if (dataSource === 'live') {
      setDataSource('mock');
    } else if (dataSource === 'mock') {
      setDataSource('auto'); // Will auto-detect based on QB connection
    } else {
      // Trying to switch to 'live' - check if QB tokens exist
      if (!qbConnected) {
        setShowReconnectModal(true);
        return; // Don't switch data source, show modal instead
      }
      setDataSource('live');
    }
    // Reload data with new source
    setTimeout(loadData, 100);
  };

  // Handle QuickBooks reconnection
  const handleReconnectQuickBooks = () => {
    setShowReconnectModal(false);
    window.location.href = '/admin/quickbooks';
  };

  // Handle modal cancel
  const handleReconnectCancel = () => {
    setShowReconnectModal(false);
    // Stay on current data source, don't change
  };

  // Handle QuickBooks invoice sync
  const handleSyncInvoices = async () => {
    setSyncLoading(true);
    try {
      console.log('🔄 Triggering QB invoice sync...');
      
      // Try to get client ID for targeted sync
      let clientId = user?.linkedClient;
      if (!clientId && user?.linkedClients?.length > 0) {
        clientId = user.linkedClients[0];
      }

      const syncOptions = {
        fullSync: false, // Incremental sync by default
        dateFrom: null,
        dateTo: null
      };

      let syncResponse;
      if (clientId) {
        // Sync specific client
        syncResponse = await axiosSecure.post(`/invoices/sync/${clientId}`, syncOptions);
      } else {
        // Sync all clients
        syncResponse = await axiosSecure.post('/invoices/sync', syncOptions);
      }

      const results = syncResponse.data.data;
      
      Swal.fire({
        title: 'Sync Complete!',
        html: `
          <div class="text-left">
            <p><strong>✅ ${results.totalInvoices}</strong> invoices processed</p>
            <p><strong>🆕 ${results.newInvoices}</strong> new invoices added</p>
            <p><strong>🔄 ${results.updatedInvoices}</strong> invoices updated</p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Refresh Page'
      }).then((result) => {
        if (result.isConfirmed) {
          // Reload the invoice data
          loadData();
        }
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      Swal.fire({
        title: 'Sync Failed',
        text: error.response?.data?.message || 'Failed to sync QuickBooks invoices. Please try again.',
        icon: 'error'
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Handle CSV import
  const handleCSVImport = async (file) => {
    setImportLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      console.log('📁 Starting CSV import...');
      
      const response = await axiosSecure.post('/invoices/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const stats = response.data.data;
        setImportStats(stats);
        
        Swal.fire({
          title: 'Import Complete!',
          html: `
            <div class="text-left">
              <p><strong>📊 ${stats.totalRows}</strong> CSV rows processed</p>
              <p><strong>👥 ${stats.customersCreated}</strong> customers created</p>
              <p><strong>📄 ${stats.invoicesProcessed}</strong> invoices imported</p>
              <p><strong>💰 ${stats.paymentsProcessed}</strong> payments imported</p>
              ${stats.errors.length > 0 ? `<p><strong>⚠️ ${stats.errors.length}</strong> errors encountered</p>` : ''}
            </div>
          `,
          icon: stats.errors.length > 0 ? 'warning' : 'success',
          confirmButtonText: 'Refresh Data'
        }).then((result) => {
          if (result.isConfirmed) {
            loadData();
          }
        });
      }
    } catch (error) {
      console.error('❌ CSV import failed:', error);
      Swal.fire({
        title: 'Import Failed',
        text: error.response?.data?.message || 'Failed to import CSV file. Please try again.',
        icon: 'error'
      });
    } finally {
      setImportLoading(false);
      setShowImportModal(false);
    }
    
    return false; // Prevent default upload
  };

  // Handle default CSV import (from server)
  const handleDefaultImport = async () => {
    setImportLoading(true);
    
    try {
      console.log('📁 Starting default CSV import...');
      
      const response = await axiosSecure.post('/invoices/import/default');

      if (response.data.success) {
        const stats = response.data.data;
        
        Swal.fire({
          title: 'Import Complete!',
          html: `
            <div class="text-left">
              <p><strong>📊 ${stats.totalRows}</strong> CSV rows processed</p>
              <p><strong>👥 ${stats.customersCreated}</strong> customers created</p>
              <p><strong>📄 ${stats.invoicesProcessed}</strong> invoices imported</p>
              <p><strong>💰 ${stats.paymentsProcessed}</strong> payments imported</p>
              ${stats.errors.length > 0 ? `<p><strong>⚠️ ${stats.errors.length}</strong> errors encountered</p>` : ''}
            </div>
          `,
          icon: stats.errors.length > 0 ? 'warning' : 'success',
          confirmButtonText: 'Refresh Data'
        }).then((result) => {
          if (result.isConfirmed) {
            loadData();
          }
        });
      }
    } catch (error) {
      console.error('❌ Default CSV import failed:', error);
      Swal.fire({
        title: 'Import Failed',
        text: error.response?.data?.message || 'Failed to import default CSV file. Please try again.',
        icon: 'error'
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Handle line item sync from QuickBooks API
  const handleSyncLineItems = async () => {
    setLineItemSyncLoading(true);
    
    try {
      console.log('🔄 Starting line item sync from QuickBooks API...');
      
      const response = await axiosSecure.post('/invoices/import/sync-line-items');

      if (response.data.success) {
        const results = response.data.data;
        
        Swal.fire({
          title: 'Line Item Sync Complete!',
          html: `
            <div class="text-left">
              <p><strong>📄 ${results.totalCsvInvoices}</strong> CSV invoices found</p>
              <p><strong>✅ ${results.updatedInvoices}</strong> invoices updated with line items</p>
              <p><strong>⏭️ ${results.skippedInvoices}</strong> invoices skipped (no QB connection)</p>
              ${results.errors.length > 0 ? `<p><strong>❌ ${results.errors.length}</strong> errors encountered</p>` : ''}
            </div>
          `,
          icon: results.errors.length > 0 ? 'warning' : 'success',
          confirmButtonText: 'Refresh Data'
        }).then((result) => {
          if (result.isConfirmed) {
            loadData();
          }
        });
      }
    } catch (error) {
      console.error('❌ Line item sync failed:', error);
      Swal.fire({
        title: 'Sync Failed',
        text: error.response?.data?.message || 'Failed to sync line items from QuickBooks API. Please try again.',
        icon: 'error'
      });
    } finally {
      setLineItemSyncLoading(false);
    }
  };

  // Load available clients for admin selector
  const loadAvailableClients = async () => {
    if (!user?.isAdmin) return;
    
    setClientsLoading(true);
    try {
      const response = await axiosSecure.get('/clients');
      const clients = response.data || [];
      setAvailableClients(clients);
      console.log('📋 Loaded', clients.length, 'clients for admin selector');
    } catch (error) {
      console.error('❌ Failed to load clients:', error);
      message.error('Failed to load client list');
    } finally {
      setClientsLoading(false);
    }
  };

  // Handle admin client selection
  const handleAdminClientChange = (clientId) => {
    setAdminSelectedClientId(clientId);
    console.log('🔄 Admin selected client:', clientId);
    // Reload data for selected client
    setTimeout(loadData, 100);
  };

  // Get import status
  const getImportStatus = async () => {
    try {
      const response = await axiosSecure.get('/invoices/import/status');
      
      if (response.data.success) {
        const status = response.data.data;
        
        Swal.fire({
          title: 'Import Status',
          html: `
            <div class="text-left">
              <h4>Database Statistics:</h4>
              <p><strong>📄 ${status.statistics.totalInvoices}</strong> total invoices</p>
              <p><strong>📁 ${status.statistics.csvInvoices}</strong> from CSV import</p>
              <p><strong>🔗 ${status.statistics.apiInvoices}</strong> from QuickBooks API</p>
              <p><strong>💰 ${status.statistics.totalPayments}</strong> total payments</p>
              <p><strong>👥 ${status.statistics.uniqueCustomers}</strong> unique customers</p>
              
              ${status.dateRange.earliest ? `
                <h4>Date Range:</h4>
                <p><strong>From:</strong> ${new Date(status.dateRange.earliest).toLocaleDateString()}</p>
                <p><strong>To:</strong> ${new Date(status.dateRange.latest).toLocaleDateString()}</p>
              ` : ''}
            </div>
          `,
          icon: 'info',
          confirmButtonText: 'Close'
        });
      }
    } catch (error) {
      console.error('❌ Failed to get import status:', error);
      message.error('Failed to retrieve import status');
    }
  };

  // Load data from service
  const loadData = async () => {
    setLoading(true);
    try {
      // Three-tier fallback for finding client ID (same as useClientAccountStatus)
      let clientId = user?.linkedClient; // Try singular field first (legacy)
      
      // Admin override: use selected client if admin has chosen one
      if (user?.isAdmin && adminSelectedClientId) {
        clientId = adminSelectedClientId;
        console.log('🔧 Admin override: Using selected client:', clientId);
      } else if (!clientId && user?.linkedClients?.length > 0) {
        clientId = user.linkedClients[0]; // Try array format
        console.log('✅ InvoiceFeed: Using linkedClients[0]:', clientId);
      }
      
      if (!clientId && user?.company) {
        // Fetch by company name
        try {
          const response = await axiosSecure.get('/clients', { 
            params: { search: user.company } 
          });
          const matchingClient = response.data?.find(c => c.name === user.company);
          if (matchingClient) {
            clientId = matchingClient._id;
            console.log('✅ InvoiceFeed: Found client by company name:', user.company, '→', clientId);
          }
        } catch (error) {
          console.error('❌ InvoiceFeed: Error searching client by company name:', error);
        }
      }
      
      if (!clientId) {
        console.log('⚠️ InvoiceFeed: No linkedClient found for user', {
          userName: user?.name,
          linkedClients: user?.linkedClients,
          linkedClient: user?.linkedClient,
          company: user?.company
        });
        Swal.fire({
          title: 'No Client Linked',
          text: 'Your account is not linked to a client. Please contact support.',
          icon: 'warning'
        });
        setLoading(false);
        return;
      }

      // Fetch client data from backend
      console.log('🔍 InvoiceFeed: Fetching client data from /clients/' + clientId);
      const clientResponse = await axiosSecure.get(`/clients/${clientId}`);
      const customer = clientResponse.data?.client || clientResponse.data;
      console.log('📦 InvoiceFeed: Client data:', customer);
      console.log('🔍 InvoiceFeed: QuickBooks data:', customer?.quickbooks);
      console.log('🔍 InvoiceFeed: QB Connected?', customer?.quickbooks?.connected);
      console.log('🔍 InvoiceFeed: Has access_token?', !!customer?.quickbooks?.access_token);
      console.log('🔍 InvoiceFeed: Has realmId?', !!customer?.quickbooks?.realmId);
      
      // Set QB connection status
      const hasQBTokens = !!(customer?.quickbooks?.access_token && customer?.quickbooks?.realmId);
      setQbConnected(hasQBTokens);
      
      // Load invoices based on data source preference
      let invoiceList = [];
      let actualDataSource = dataSource; // Track what data we actually got
      
      // Auto-detect if dataSource is 'auto'
      if (dataSource === 'auto') {
        actualDataSource = hasQBTokens ? 'live' : 'mock';
      }
      
      // Force live QB data if selected or auto-detected
      if ((actualDataSource === 'live' || dataSource === 'live') && hasQBTokens) {
        try {
          console.log('🔍 InvoiceFeed: Fetching unified transactions from MongoDB...');
          const params = {
            status: statusFilter !== 'all' ? statusFilter : undefined,
            dateFrom: dateRange[0]?.format('YYYY-MM-DD'),
            dateTo: dateRange[1]?.format('YYYY-MM-DD'),
            limit: pagination.pageSize,
            offset: (pagination.current - 1) * pagination.pageSize
          };
          
          // Remove undefined params
          Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
          
          const localResponse = await axiosSecure.get('/invoices/transactions', { params });
          
          invoiceList = localResponse.data.data || [];
          console.log('✅ InvoiceFeed: Loaded', invoiceList.length, 'transactions (invoices + payments) from MongoDB');
          
          // Update pagination with server data
          if (localResponse.data.pagination) {
            setPagination(prev => ({
              ...prev,
              total: localResponse.data.pagination.total
            }));
          }
          
          // Search filter client-side if needed (server handles most filtering)
          if (searchText && !params.search) {
            invoiceList = invoiceList.filter(transaction => 
              transaction.number?.toLowerCase().includes(searchText.toLowerCase()) ||
              transaction.customer?.toLowerCase().includes(searchText.toLowerCase()) ||
              transaction.memo?.toLowerCase().includes(searchText.toLowerCase())
            );
          }
          
          // Successfully got live data
          actualDataSource = 'live';
          
        } catch (qbError) {
          console.error('❌ QB invoice fetch failed:', qbError);
          // Fallback to mock data but don't change user's selection
          invoiceList = await invoiceDataService.getInvoices(clientId, {
            status: statusFilter,
            searchText,
            dateRange
          });
          // Keep user's selected data source, they'll see the QB connection warning
        }
      } else if (dataSource === 'live' && !hasQBTokens) {
        // User wants live data but no QB connection - show message and load mock
        console.log('⚠️ InvoiceFeed: User selected live data but no QB connection available');
        invoiceList = await invoiceDataService.getInvoices(clientId, {
          status: statusFilter,
          searchText,
          dateRange
        });
        
        // Show warning about QB connection needed
        if (dataSource === 'live') {
          setTimeout(() => {
            message.warning({
              content: 'QuickBooks connection required for live data. Showing mock data instead.',
              duration: 4
            });
          }, 500);
        }
      } else {
        console.log('⚠️ InvoiceFeed: Using mock/service data');
        // Use service data if QB not connected or mock mode selected
        invoiceList = await invoiceDataService.getInvoices(clientId, {
          status: statusFilter,
          searchText,
          dateRange
        });
        actualDataSource = 'mock';
      }
      
      // Only update dataSource if it was 'auto' - preserve user's explicit choice
      if (dataSource === 'auto') {
        setDataSource(actualDataSource);
      }

      // Calculate financial summary
      const stats = calculateFinancialStats(invoiceList);
      
      // Update customer with calculated stats
      const customerWithStats = {
        ...customer,
        financialSummary: {
          openBalance: stats.openBalance,
          overduePayment: stats.overdueAmount
        }
      };

      setSelectedCustomer(customerWithStats);
      setInvoices(invoiceList);
      setPagination(prev => ({ ...prev, total: invoiceList.length }));
      
    } catch (error) {
      console.error('❌ InvoiceFeed: Error loading invoice data:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load invoice data. Please try again.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Status configurations
  const statusConfig = {
    paid: { color: 'green', text: 'Paid' },
    sent: { color: 'blue', text: 'Sent' },
    draft: { color: 'orange', text: 'Draft' },
    overdue: { color: 'red', text: 'Overdue' },
    closed: { color: 'green', text: 'Closed' },
    void: { color: 'gray', text: 'Voided' }
  };

  // Table columns configuration - Enhanced QB Transaction List Format
  const columns = [
    {
      title: 'DATE',
      dataIndex: 'date',
      key: 'date',
      width: 90,
      render: (date) => dayjs(date).format('D/M/YY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'TYPE',
      dataIndex: 'type',
      key: 'type', 
      width: 90,
      render: (type) => (
        <span className={`font-medium ${type === 'Invoice' ? 'text-blue-600' : 'text-green-600'}`}>
          {type}
        </span>
      ),
    },
    {
      title: 'NO.',
      dataIndex: 'number',
      key: 'number',
      width: 80,
      render: (number, record) => {
        if (record.type === 'Payment') return '—';
        return (
          <span className="font-mono text-gray-900">
            {number}
          </span>
        );
      },
    },
    {
      title: 'CUSTOMER',
      dataIndex: 'customer',
      key: 'customer',
      width: 180,
      render: (customer) => (
        <div className="font-medium text-gray-900">
          {customer}
        </div>
      ),
    },
    {
      title: 'MEMO',
      dataIndex: 'memo',
      key: 'memo',
      width: 200,
      render: (memo, record) => {
        // For payments, show which invoices it's applied to
        if (record.type === 'Payment' && record.invoiceApplications?.length > 0) {
          const invoiceList = record.invoiceApplications
            .map(app => `#${app.invoiceNumber}: A$${app.appliedAmount.toFixed(2)}`)
            .join(', ');
          return (
            <div>
              {memo && <div className="text-gray-900">{memo}</div>}
              <div className="text-xs text-blue-600 mt-1">
                Applied to: {invoiceList}
              </div>
            </div>
          );
        }
        
        // For invoices, show memo or payment info
        if (record.type === 'Invoice' && record.payments?.length > 0) {
          const totalPaid = record.amount - record.balanceDue;
          return (
            <div>
              {memo && <div className="text-gray-900">{memo}</div>}
              <div className="text-xs text-green-600 mt-1">
                A${totalPaid.toFixed(2)} paid
              </div>
            </div>
          );
        }
        
        return memo || '—';
      },
    },
    {
      title: 'AMOUNT',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right',
      render: (amount) => (
        <span className="font-medium text-gray-900">
          A${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'STATUS',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        // Payment status handling
        if (record.type === 'Payment') {
          return (
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              <span className="text-sm font-medium">Closed</span>
            </div>
          );
        }

        // Invoice status handling with overdue calculation
        const getStatusDisplay = () => {
          if (status === 'Paid') {
            return {
              icon: <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>,
              text: 'Paid',
              color: 'text-green-600'
            };
          }
          
          if (record.isOverdue) {
            const overdueDays = Math.floor((new Date() - new Date(record.dueDate)) / (1000 * 60 * 60 * 24));
            return {
              icon: <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>,
              text: `Overdue ${overdueDays} days`,
              color: 'text-orange-600',
              subtext: `Sent ${dayjs(record.dueDate).subtract(7, 'day').format('D/M/YY')}`
            };
          }
          
          if (status === 'Partial') {
            return {
              icon: <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>,
              text: 'Partial',
              color: 'text-yellow-600'
            };
          }
          
          return {
            icon: <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>,
            text: status,
            color: 'text-blue-600'
          };
        };

        const statusDisplay = getStatusDisplay();
        
        return (
          <div>
            <div className={`flex items-center text-sm font-medium ${statusDisplay.color}`}>
              {statusDisplay.icon}
              {statusDisplay.text}
            </div>
            {statusDisplay.subtext && (
              <div className="text-xs text-gray-500 ml-4">
                {statusDisplay.subtext}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'ACTION',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            className="text-blue-600 px-0"
            onClick={() => handleViewTransaction(record)}
          >
            View/Edit
          </Button>
          {record.type === 'Invoice' && record.canReceivePayment && (
            <>
              <span className="text-gray-300">|</span>
              <Button
                type="link"
                size="small" 
                className="text-blue-600 px-0"
                onClick={() => handleReceivePayment(record)}
              >
                Receive payment
              </Button>
            </>
          )}
          {record.type === 'Invoice' && (
            <>
              <span className="text-gray-300">|</span>
              <Button
                type="link"
                size="small"
                className="text-blue-600 px-0"
                onClick={() => handlePrintInvoice(record)}
              >
                Print
              </Button>
            </>
          )}
          <Button
            type="text"
            size="small"
            icon="▼"
            className="text-gray-400 ml-1"
            onClick={() => handleMoreActions(record)}
          />
        </Space>
      ),
    },
  ];

  // Enhanced event handlers for QB-style actions
  const handleViewTransaction = (record) => {
    console.log('👁️ View/Edit transaction:', record);
    if (record.type === 'Invoice') {
      // Navigate to invoice edit page or modal
      window.location.href = `/invoicing?edit=${record._id}`;
    } else {
      // View payment details with invoice linkage
      Swal.fire({
        title: `Payment ${record.number}`,
        html: `
          <div class="text-left">
            <p><strong>Amount:</strong> A$${record.amount.toFixed(2)}</p>
            <p><strong>Date:</strong> ${dayjs(record.date).format('DD/MM/YYYY')}</p>
            <p><strong>Method:</strong> ${record.paymentMethod || 'Unknown'}</p>
            ${record.invoiceApplications?.length ? `
              <h4 class="mt-3 mb-2">Applied to Invoices:</h4>
              <ul class="text-sm">
                ${record.invoiceApplications.map(app => 
                  `<li>Invoice #${app.invoiceNumber}: A$${app.appliedAmount.toFixed(2)}</li>`
                ).join('')}
              </ul>
            ` : ''}
          </div>
        `,
        width: 500,
        showConfirmButton: false,
        showCloseButton: true
      });
    }
  };

  const handleReceivePayment = (record) => {
    console.log('💳 Receive payment for invoice:', record);
    // Navigate to receive payment page
    window.location.href = `/receive-payment?invoice=${record._id}`;
  };

  const handlePrintInvoice = (record) => {
    console.log('🖨️ Print invoice:', record);
    // Open print view
    window.open(`/invoices/${record._id}/print`, '_blank');
  };

  const handleMoreActions = (record) => {
    console.log('⚙️ More actions for:', record);
    // Show dropdown with additional actions
  };

  // Event handlers - defined before tabItems to avoid hoisting issues
  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    // TODO: Implement status filtering
  };

  // Tab items configuration for Antd Tabs
  const tabItems = [
    {
      key: 'transactions',
      label: 'Transaction List',
      children: (
        <>
          {/* Filters */}
          <div className="mb-4">
            <Row gutter={16} align="middle">
              <Col xs={24} sm={6}>
                <Button className="w-full">Batch actions</Button>
              </Col>
              <Col xs={24} sm={4}>
                <Select
                  placeholder="Type"
                  className="w-full"
                  defaultValue="all"
                >
                  <Option value="all">All plus deposits</Option>
                  <Option value="invoices">Invoices only</Option>
                  <Option value="payments">Payments only</Option>
                </Select>
              </Col>
              <Col xs={24} sm={4}>
                <Select
                  placeholder="Status"
                  className="w-full"
                  defaultValue="all"
                  onChange={handleStatusFilter}
                >
                  <Option value="all">All</Option>
                  <Option value="paid">Paid</Option>
                  <Option value="overdue">Overdue</Option>
                  <Option value="draft">Draft</Option>
                </Select>
              </Col>
              <Col xs={24} sm={4}>
                <Select
                  placeholder="Date"
                  className="w-full"
                  defaultValue="all"
                >
                  <Option value="all">All</Option>
                  <Option value="thisMonth">This Month</Option>
                  <Option value="lastMonth">Last Month</Option>
                  <Option value="thisYear">This Year</Option>
                </Select>
              </Col>
              <Col xs={24} sm={6}>
                <Space>
                  <Button type="link" className="text-blue-600">
                    View Recurring Templates
                  </Button>
                  <Button type="link" className="text-blue-600">
                    📝 Feedback
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>

          {/* Transactions Table */}
          <Table
            columns={columns}
            dataSource={invoices}
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} transactions`,
            }}
            scroll={{ x: 1200 }}
            size="middle"
            className={styles.transactionTable}
          />
        </>
      )
    },
    {
      key: 'statements',
      label: 'Statements',
      children: (
        <div className="text-center py-12 text-gray-500">
          Customer statements will be available here
        </div>
      )
    },
    {
      key: 'recurring',
      label: 'Recurring Transactions',
      children: (
        <div className="text-center py-12 text-gray-500">
          Recurring transaction templates will be available here  
        </div>
      )
    },
    {
      key: 'details',
      label: 'Customer Details',
      children: (
        <div className="text-center py-12 text-gray-500">
          Detailed customer information will be available here
        </div>
      )
    },
    {
      key: 'notes',
      label: (
        <span>
          Notes <span className="bg-red-500 text-white rounded-full px-1 text-xs ml-1">NEW</span>
        </span>
      ),
      children: (
        <div className="text-center py-12 text-gray-500">
          Customer notes and communications will be available here
        </div>
      )
    },
    {
      key: 'tasks',
      label: (
        <span>
          Tasks <span className="bg-red-500 text-white rounded-full px-1 text-xs ml-1">NEW</span>
        </span>
      ),
      children: (
        <div className="text-center py-12 text-gray-500">
          Customer-related tasks will be available here
        </div>
      )
    }
  ];

  const handleSearch = (value) => {
    setSearchText(value);
    // TODO: Implement search filtering
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    // TODO: Implement date range filtering
  };

  // Initialize component
  useEffect(() => {
    if (user) {
      loadData(); // Load data from service instead of mock data
      
      // Load clients for admin selector
      if (user.isAdmin) {
        loadAvailableClients();
      }
    }
  }, [user, statusFilter, searchText, dateRange, adminSelectedClientId]); // Reload when admin changes client

  const CustomerHeader = () => (
    <Card className="mb-6 shadow-sm">
      <Row gutter={24}>
        {/* Customer Avatar and Basic Info */}
        <Col xs={24} md={6}>
          <div className="flex items-start space-x-4">
            <Avatar 
              size={64} 
              className="bg-gray-600 text-white font-bold text-xl flex-shrink-0"
              src={selectedCustomer?.logoUrl || null}
            >
              {!selectedCustomer?.logoUrl && selectedCustomer?.avatar}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedCustomer?.name}
                </h2>
                {user?.isAdmin && adminSelectedClientId && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                    Admin View
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-1">{selectedCustomer?.legalName}</p>
              {selectedCustomer?.abrData?.EntityTypeName && (
                <p className="text-sm text-gray-500 mb-3">{selectedCustomer.abrData.EntityTypeName}</p>
              )}
              
              {/* Action Icons */}
              <div className="flex space-x-2">
                <Button 
                  type="text" 
                  size="small" 
                  icon={<IconMail size={16} />} 
                  className="p-2 hover:bg-gray-100 rounded-lg border" 
                  title="Send Email"
                />
                <Button 
                  type="text" 
                  size="small" 
                  icon={<IconPhone size={16} />} 
                  className="p-2 hover:bg-gray-100 rounded-lg border" 
                  title="Call Customer"
                />
                <Button 
                  type="text" 
                  size="small" 
                  icon={<IconEditPen size={16} />} 
                  className="p-2 hover:bg-gray-100 rounded-lg border" 
                  title="Edit Customer"
                />
              </div>
            </div>
          </div>
        </Col>

        {/* Contact Information & Business Details */}
        <Col xs={24} md={10}>
          <div className="space-y-4">
            {/* Primary Contact Container */}
            <Card size="small" className="shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Name</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedCustomer?.mainContact?.name || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Phone</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedCustomer?.mainContact?.phone || selectedCustomer?.phone || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedCustomer?.mainContact?.email || selectedCustomer?.email || 'Not specified'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Address Information Container - Collapsible */}
            <Card size="small" className="shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsBillingExpanded(!isBillingExpanded)}>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-sm text-gray-600">Accounts Email</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedCustomer?.mainContact?.accountsEmail || 'Not specified'}
                      </span>
                      {isBillingExpanded ? <IconDown size={14} className="text-gray-500" /> : <IconRight size={14} className="text-gray-500" />}
                    </div>
                  </div>
                </div>
                
                {isBillingExpanded && (
                  <>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-600">Billing Address</span>
                      <div className="flex flex-col items-end">
                        {selectedCustomer?.billingAddress?.full_address ? (
                          <>
                            <span className="text-sm font-medium text-gray-900 text-right">
                              {selectedCustomer.billingAddress.line1}
                              {selectedCustomer.billingAddress.line2 && `, ${selectedCustomer.billingAddress.line2}`}
                            </span>
                            <span className="text-sm font-medium text-gray-900 text-right">
                              {selectedCustomer.billingAddress.city}, {selectedCustomer.billingAddress.state} {selectedCustomer.billingAddress.postalCode}
                            </span>
                          </>
                        ) : (
                          <Button type="link" size="small" className="p-0 h-auto text-blue-600">
                            Add billing address
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Shipping Address</span>
                      {selectedCustomer?.shippingAddress ? (
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-gray-900 text-right">
                            {selectedCustomer.shippingAddress.line1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 text-right">
                            {selectedCustomer.shippingAddress.city}, {selectedCustomer.shippingAddress.state} {selectedCustomer.shippingAddress.postalCode}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-900 italic">Same as billing</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Business Registration Container - Collapsible */}
            <Card size="small" className="shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsLegalExpanded(!isLegalExpanded)}>
                  <span className="text-sm text-gray-600">Australian Business Number (ABN)</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {selectedCustomer?.abrData?.Abn || selectedCustomer?.abn || 'Not provided'}
                    </span>
                    {isLegalExpanded ? <IconDown size={14} className="text-gray-500" /> : <IconRight size={14} className="text-gray-500" />}
                  </div>
                </div>

                {isLegalExpanded && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600"></span>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center space-x-1">
                        {selectedCustomer?.abrData?.AbnStatus && (
                          <span className="text-sm text-green-600">
                            {selectedCustomer.abrData.AbnStatus}
                          </span>
                        )}
                        {selectedCustomer?.abrData?.capturedAt && (
                          <span className="text-xs text-gray-400">
                            • Verified {new Date(selectedCustomer.abrData.capturedAt).toLocaleDateString('en-AU')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isLegalExpanded && (
                  <>
                    {(selectedCustomer?.abrData?.Acn || selectedCustomer?.acn) && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Australian Company Number (ACN)</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedCustomer?.abrData?.Acn || selectedCustomer?.acn}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">GST Registered</span>
                      <div className="flex items-center space-x-1">
                        <span className={`text-sm font-medium ${selectedCustomer?.gstRegistered === 'yes' ? 'text-green-600' : 'text-gray-900'}`}>
                          {selectedCustomer?.gstRegistered === 'yes' ? 'Yes' : 'No'}
                        </span>
                        {selectedCustomer?.abrData?.Gst && (
                          <span className="text-xs text-gray-500">
                            Since {selectedCustomer.abrData.Gst}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Notes Container - Only show if notes exist */}
            {selectedCustomer?.notes && (
              <Card size="small" className="shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Notes</span>
                  <span className="text-sm font-medium text-gray-900 max-w-48 text-right">
                    {selectedCustomer.notes}
                  </span>
                </div>
              </Card>
            )}
          </div>
        </Col>

        {/* Financial Summary */}
        <Col xs={24} md={8}>
          {user?.companyAdmin !== false ? (
            // Show financial data for company admins
            <div className="bg-green-50 border border-[#009245] rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-[#009245] rounded-full mr-2"></div>
                <h3 className="text-base font-semibold text-gray-800">Your Account Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-800">Total Outstanding</span>
                  </div>
                  <div className="ml-4">
                    <span className="font-bold text-xl text-gray-800">
                      A${selectedCustomer?.financialSummary?.openBalance?.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-800">Total Overdue</span>
                  </div>
                  <div className="ml-4">
                    <span className="font-bold text-xl text-gray-800">
                      A${selectedCustomer?.financialSummary?.overduePayment?.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Show access request for non-admin users
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                <h3 className="text-base font-semibold text-gray-800">Your Account Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Financial information is available for company admins only
                  </p>
                  <Button 
                    type="primary"
                    onClick={async () => {
                      try {
                        // Get client ID using same logic as loadData
                        let clientId = user?.linkedClient;
                        if (!clientId && user?.linkedClients?.length > 0) {
                          clientId = user.linkedClients[0];
                        }
                        if (!clientId && user?.company) {
                          const response = await axiosSecure.get('/clients', { 
                            params: { search: user.company } 
                          });
                          const matchingClient = response.data?.find(c => c.name === user.company);
                          if (matchingClient) {
                            clientId = matchingClient._id;
                          }
                        }

                        if (!clientId) {
                          Swal.fire({
                            title: 'Error',
                            text: 'Unable to determine your company. Please contact support.',
                            icon: 'error'
                          });
                          return;
                        }

                        // Request admin access
                        const response = await axiosSecure.post(`/clients/${clientId}/users/${user._id}/request-admin-access`);
                        
                        if (response.data.success) {
                          Swal.fire({
                            title: 'Request Sent!',
                            html: `
                              <p class="text-gray-600 mb-4">Your request for admin access has been sent to:</p>
                              <div class="bg-gray-50 p-3 rounded mb-4">
                                <p class="text-sm font-medium text-gray-900">${response.data.adminEmails.join(', ')}</p>
                              </div>
                              <p class="text-sm text-gray-500">Company administrators can approve your request by clicking the link in their email.</p>
                              <div class="mt-4 p-3 bg-blue-50 rounded text-left">
                                <p class="text-xs text-gray-700 font-medium mb-2">For testing purposes, the approval link is:</p>
                                <a href="${response.data.approvalLink}" class="text-xs text-blue-600 break-all" target="_blank">${response.data.approvalLink}</a>
                              </div>
                            `,
                            icon: 'success',
                            confirmButtonText: 'OK'
                          });
                        }
                      } catch (error) {
                        console.error('❌ Error requesting admin access:', error);
                        const errorMessage = error.response?.data?.message || 'Failed to send request. Please try again.';
                        Swal.fire({
                          title: 'Error',
                          text: errorMessage,
                          icon: 'error'
                        });
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Request Admin Access
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Col>
      </Row>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoice Feed</h1>
              <p className="mt-2 text-gray-600">Customer transaction history and invoice management</p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Admin Client Selector */}
              {user?.isAdmin && (
                <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Admin Mode</span>
                  <span className="text-sm font-medium text-gray-600">Client:</span>
                  <Select
                    placeholder={`Default (${user?.company || 'Your Client'})`}
                    value={adminSelectedClientId}
                    onChange={handleAdminClientChange}
                    loading={clientsLoading}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    style={{ minWidth: 220 }}
                    options={availableClients.map(client => ({
                      value: client._id,
                      label: `${client.name}${client.quickbooks?.access_token ? ' 🔗' : ''}`,
                      disabled: false
                    }))}
                    allowClear
                    onClear={() => setAdminSelectedClientId(null)}
                    dropdownRender={(menu) => (
                      <div>
                        {menu}
                        <div className="border-t border-gray-200 p-2 text-xs text-gray-500">
                          🔗 = QuickBooks Connected
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}
              
              <Button
                type="default"
                onClick={toggleDataSource}
                className={`border-blue-300 text-blue-600 hover:border-blue-500 ${!qbConnected && dataSource === 'live' ? 'border-red-300 text-red-600' : ''}`}
              >
                {dataSource === 'live' ? 'Live QuickBooks' : 
                 dataSource === 'mock' ? 'Mock Data' : 
                 qbConnected ? 'Auto (Live)' : 'Auto (Mock)'}
                {!qbConnected && dataSource === 'live' && ' ⚠️'}
              </Button>
              {qbConnected && (
                <Button
                  type="default"
                  size="large"
                  onClick={handleSyncInvoices}
                  loading={syncLoading}
                  className="border-purple-300 text-purple-600 hover:border-purple-500 hover:text-purple-700"
                >
                  {syncLoading ? 'Syncing...' : '🔄 Sync QB'}
                </Button>
              )}
              {qbConnected && (
                <Button
                  type="default"
                  size="large"
                  onClick={handleSyncLineItems}
                  loading={lineItemSyncLoading}
                  className="border-indigo-300 text-indigo-600 hover:border-indigo-500 hover:text-indigo-700"
                >
                  {lineItemSyncLoading ? '📋 Syncing...' : '📋 Sync Line Items'}
                </Button>
              )}
              <Button
                type="default"
                size="large"
                onClick={() => window.location.href = '/quick-invoices'}
                className="border-green-300 text-green-600 hover:border-green-500 hover:text-green-700"
              >
                Bulk Invoice Creator
              </Button>
              <Button
                type="primary"
                size="large"
                onClick={() => window.location.href = '/invoicing'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        </div>

        {/* Customer Header */}
        {selectedCustomer && <CustomerHeader />}

        {/* Tabs for different views */}
        <Card>
          <Tabs defaultActiveKey="transactions" className="mb-4" items={tabItems} />
        </Card>

        {/* Data Source Status */}
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                dataSource === 'live' ? 'bg-green-400' : 
                dataSource === 'mock' ? 'bg-yellow-400' : 
                qbConnected ? 'bg-green-400' : 'bg-yellow-400'
              }`}></div>
              <span className="text-sm text-gray-600">
                {dataSource === 'live' 
                  ? 'Displaying live QuickBooks transactions (invoices + payments). All data is real-time synced.'
                  : dataSource === 'mock' 
                  ? 'Displaying mock transaction data for development and testing purposes.'
                  : qbConnected
                  ? 'Auto mode: Connected to QuickBooks, displaying live transactions.'
                  : 'Auto mode: QuickBooks not connected, displaying mock transaction data.'
                }
                {!qbConnected && dataSource === 'live' && ' ⚠️ QuickBooks not connected - switch to mock data or connect QB.'}
              </span>
            </div>
            <div className="flex space-x-2">
              <Button type="link" size="small" onClick={toggleDataSource}>
                Switch to {dataSource === 'live' ? 'Mock' : dataSource === 'mock' ? 'Auto' : 'Live'} Data
              </Button>
              {!qbConnected && (
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => window.location.href = '/admin/quickbooks'}
                  className="text-blue-600"
                >
                  Connect QuickBooks
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* QuickBooks Reconnect Modal */}
        <Modal
          title="QuickBooks Connection Required"
          open={showReconnectModal}
          onCancel={handleReconnectCancel}
          footer={[
            <Button key="cancel" onClick={handleReconnectCancel}>
              Cancel
            </Button>,
            <Button 
              key="reconnect" 
              type="primary" 
              onClick={handleReconnectQuickBooks}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Connect to QuickBooks
            </Button>,
          ]}
          width={500}
        >
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              To view live QuickBooks invoices, you need to connect your QuickBooks account first.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    What happens next?
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• You'll be redirected to QuickBooks Settings</li>
                    <li>• Click "Connect to QuickBooks" to authorize</li>
                    <li>• Return here to view your live invoice data</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>


    </div>
  );
};

export default InvoiceFeed;