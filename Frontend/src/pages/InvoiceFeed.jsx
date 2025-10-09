// InvoiceFeed.jsx - Invoice history feed with customer header
/* PRODUCTION READY - QuickBooks Integration Frontend */
import React, { useState, useEffect, useContext } from "react";
import { Button, Input, Select, DatePicker, Table, Tag, Space, Card, Statistic, Row, Col, Avatar, Tabs } from "antd";
import { IconSearch, IconFilter, IconDownload, IconView, IconEdit, IconMail, IconPhone, IconEdit as IconEditPen, IconDown, IconRight } from "@/shared/IconSet";
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
  const [dataSource, setDataSource] = useState(invoiceDataService.getDataSource());
  
  // Collapsible container states (collapsed by default)
  const [isBillingExpanded, setIsBillingExpanded] = useState(false);
  const [isLegalExpanded, setIsLegalExpanded] = useState(false);

  // Load data from service
  const loadData = async () => {
    setLoading(true);
    try {
      const customerId = "1"; // This would come from route params or context
      
      // Load customer and invoices in parallel
      const [customer, invoiceList] = await Promise.all([
        invoiceDataService.getCustomer(customerId),
        invoiceDataService.getInvoices(customerId, {
          status: statusFilter,
          searchText,
          dateRange
        })
      ]);

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
      console.error('Error loading invoice data:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load invoice data. Please try again.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle between mock and live data
  const toggleDataSource = () => {
    const newSource = dataSource === 'mock' ? 'live' : 'mock';
    invoiceDataService.setDataSource(newSource);
    setDataSource(newSource);
    loadData(); // Reload with new data source
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

  // Table columns configuration
  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (date) => dayjs(date).format('DD/MM/YY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 80,
    },
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id, record) => record.type === 'Payment' ? '—' : id,
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      width: 180,
      render: (customer) => (
        <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
          {customer}
        </div>
      ),
    },
    {
      title: 'Project',
      key: 'project',
      width: 200,
      render: (_, record) => {
        if (!record.projectNumber) return '—';
        return (
          <div>
            <div className="font-medium text-gray-900">{record.projectNumber}</div>
            <div className="text-sm text-gray-500 truncate">{record.projectName}</div>
          </div>
        );
      },
    },
    {
      title: 'Memo',
      dataIndex: 'memo',
      key: 'memo',
      width: 150,
      render: (memo) => memo || '—',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount) => (
        <span className={`font-medium ${amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {amount < 0 ? '-' : ''}A${Math.abs(amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status, record) => {
        const config = statusConfig[status];
        
        if (status === 'overdue') {
          return (
            <div>
              <Tag color={config.color} className="font-medium mb-1">
                {config.text} {record.overdayDays} days
              </Tag>
              {record.memo && (
                <div className="text-xs text-gray-600 mt-1">
                  {record.memo}
                </div>
              )}
            </div>
          );
        }
        
        if (status === 'void') {
          return (
            <div>
              <Tag color={config.color} className="font-medium">
                {config.text}
              </Tag>
            </div>
          );
        }
        
        return (
          <div>
            <Tag color={config.color} className="font-medium">
              {config.text}
            </Tag>
            {record.memo && record.memo !== 'Voided' && (
              <div className="text-xs text-gray-600 mt-1">
                {record.memo}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<IconView size={14} />}
            onClick={() => handleViewTransaction(record.id)}
            title="View"
          />
          <Button
            type="text"
            size="small"
            icon={<IconDownload size={14} />}
            onClick={() => handleDownloadTransaction(record.id)}
            title="Print"
            disabled={record.type === 'Payment'}
          />
          <Button
            type="text"
            size="small"
            className="text-gray-400"
            title="More actions"
          >
            ⋮
          </Button>
        </Space>
      ),
    },
  ];

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

  // Event handlers
  const handleViewTransaction = (transactionId) => {
    console.log('View transaction:', transactionId);
    // TODO: Implement transaction view modal or navigation
  };

  const handleDownloadTransaction = (transactionId) => {
    console.log('Download transaction:', transactionId);
    // TODO: Implement QuickBooks PDF download
  };

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
    loadData(); // Load data from service instead of mock data
  }, [statusFilter, searchText, dateRange]); // Reload when filters change

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
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {selectedCustomer?.name}
              </h2>
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
            <div className="flex space-x-3">
              <Button
                type="default"
                onClick={toggleDataSource}
                className="border-blue-300 text-blue-600 hover:border-blue-500"
              >
                Using: {dataSource === 'mock' ? 'Mock Data' : 'Live QuickBooks'}
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
              <div className={`w-3 h-3 rounded-full ${dataSource === 'mock' ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
              <span className="text-sm text-gray-600">
                {dataSource === 'mock' 
                  ? 'Currently showing mock data for development. Click toggle to switch to live QuickBooks data.' 
                  : 'Connected to live QuickBooks data. All transactions are real-time synced.'}
              </span>
            </div>
            <Button type="link" size="small" onClick={toggleDataSource}>
              Switch to {dataSource === 'mock' ? 'Live' : 'Mock'} Data
            </Button>
          </div>
        </Card>
      </div>


    </div>
  );
};

export default InvoiceFeed;