/**
 * QuickInvoiceCreator.jsx
 * Smart component for bulk invoice creation from completed projects
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, Button, Table, Tag, Space, Checkbox, message, 
  Statistic, Row, Col, Alert, Modal, Progress, Typography 
} from 'antd';
import { 
  DollarCircleOutlined, CheckCircleOutlined, 
  ExclamationCircleOutlined, FileTextOutlined,
  BulbOutlined, ThunderboltOutlined, QuestionCircleOutlined 
} from '@ant-design/icons';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const QuickInvoiceCreator = () => {
  const axiosSecure = useAxiosSecure();
  
  // State
  const [invoiceReadyProjects, setInvoiceReadyProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Load invoice-ready projects
  const loadInvoiceReadyProjects = async () => {
    setLoading(true);
    try {
      const response = await axiosSecure.get('/projects/invoice-ready');
      const data = response.data.data;
      
      // Handle both old format (array) and new format (object with ready/maybe)
      if (Array.isArray(data)) {
        setInvoiceReadyProjects(data || []);
      } else {
        // New format with ready and maybe categories
        const allProjects = [...(data.ready || []), ...(data.maybe || [])];
        setInvoiceReadyProjects(allProjects);
      }
    } catch (error) {
      message.error('Failed to load invoice-ready projects');
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoiceReadyProjects();
  }, []);

  // Create single invoice
  const createSingleInvoice = async (projectId, projectName) => {
    try {
      const response = await axiosSecure.post(`/projects/${projectId}/create-invoice`);
      message.success(`✅ Invoice created for ${projectName}`);
      loadInvoiceReadyProjects(); // Refresh list
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to create invoice';
      message.error(errorMsg);
    }
  };

  // Create bulk invoices
  const createBulkInvoices = async () => {
    if (selectedProjects.length === 0) {
      message.warning('Please select projects to invoice');
      return;
    }

    setBulkCreating(true);
    try {
      const response = await axiosSecure.post('/projects/bulk-create-invoices', {
        projectIds: selectedProjects
      });
      
      setBulkResults(response.data);
      setShowResults(true);
      setSelectedProjects([]);
      loadInvoiceReadyProjects(); // Refresh list

    } catch (error) {
      message.error('Failed to create bulk invoices');
    } finally {
      setBulkCreating(false);
    }
  };

  // Table columns
  const columns = [
    {
      title: '',
      dataIndex: '_id',
      width: 50,
      render: (id, record) => (
        <Checkbox
          checked={selectedProjects.includes(id)}
          disabled={!record.canInvoice}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedProjects([...selectedProjects, id]);
            } else {
              setSelectedProjects(selectedProjects.filter(pid => pid !== id));
            }
          }}
        />
      ),
    },
    {
      title: 'Project',
      dataIndex: 'projectNumber',
      render: (number, record) => (
        <div>
          <Text strong>{number}</Text><br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Client',
      dataIndex: 'client',
      render: (client) => (
        <div>
          <Text>{client?.name || 'No Client'}</Text><br />
          <Tag color={client?.quickbooks?.connected ? 'green' : 'red'} size="small">
            {client?.quickbooks?.connected ? 'QB Connected' : 'QB Not Connected'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Plan & Pricing',
      dataIndex: 'pricingSnapshot',
      render: (snapshot, record) => (
        <div>
          <Text strong>{record.PlanType || 'Standard'}</Text><br />
          <Text style={{ fontSize: '12px' }}>
            {record.Qty}x @ ${snapshot?.priceEach || 0} = ${snapshot?.totalPrice || 0}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'readyStatus',
      render: (status, record) => {
        const isReady = status === 'ready';
        return (
          <div>
            <Tag color={isReady ? "green" : "orange"}>
              {isReady ? "Ready" : "Maybe"}
            </Tag>
            {!isReady && record.missingFields?.length > 0 && (
              <div style={{ fontSize: '11px', color: '#999' }}>
                Missing: {record.missingFields.join(', ')}
              </div>
            )}
            {record.estimateStatus && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                {record.estimateStatus}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      render: (date) => date ? dayjs(date).format('MMM D, YYYY') : '-',
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => {
        const isReady = record.readyStatus === 'ready';
        const canInvoice = record.canInvoice && isReady;
        
        if (!isReady) {
          return (
            <Button
              size="small"
              disabled
              title={`Missing: ${record.missingFields?.join(', ') || 'Required fields'}`}
            >
              Fix Data
            </Button>
          );
        }
        
        return (
          <Button
            type="primary"
            size="small"
            disabled={!canInvoice}
            onClick={() => createSingleInvoice(record._id, record.projectNumber)}
            icon={<FileTextOutlined />}
            title={!record.canInvoice ? 'Client QuickBooks not connected' : 'Create invoice'}
          >
            Invoice
          </Button>
        );
      },
    },
  ];

  // Calculate totals
  const readyProjects = invoiceReadyProjects.filter(p => p.readyStatus === 'ready');
  const maybeProjects = invoiceReadyProjects.filter(p => p.readyStatus === 'maybe');
  
  const totalValue = readyProjects.reduce((sum, project) => 
    sum + (project.pricingSnapshot?.totalPrice || 0), 0
  );
  
  const selectedValue = selectedProjects.reduce((sum, projectId) => {
    const project = invoiceReadyProjects.find(p => p._id === projectId);
    return sum + (project?.pricingSnapshot?.totalPrice || 0);
  }, 0);

  const canInvoiceCount = readyProjects.filter(p => p.canInvoice).length;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Ready to Invoice"
              value={readyProjects.length}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Maybe"
              value={maybeProjects.length}
              prefix={<QuestionCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="QB Connected"
              value={canInvoiceCount}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Value"
              value={totalValue}
              precision={2}
              prefix={<DollarCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Selected Value"
              value={selectedValue}
              precision={2}
              prefix={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Instructions */}
      {readyProjects.length === 0 && maybeProjects.length > 0 && (
        <Alert
          message="Projects Need Attention"
          description="Some projects are missing required fields (estimate sent, status = 'Sent'). Fix the data to make them ready for invoicing."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {readyProjects.length > 0 && canInvoiceCount === 0 && (
        <Alert
          message="QuickBooks Connection Required"
          description="To create invoices, clients must first connect their QuickBooks accounts in Settings."
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Bulk Actions */}
      <Card 
        title={
          <Space>
            <BulbOutlined />
            <span>Smart Invoice Creator</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              onClick={() => setSelectedProjects(
                readyProjects
                  .filter(p => p.canInvoice)
                  .map(p => p._id)
              )}
              disabled={canInvoiceCount === 0}
            >
              Select All Ready ({canInvoiceCount})
            </Button>
            <Button
              type="primary"
              onClick={createBulkInvoices}
              disabled={selectedProjects.length === 0}
              loading={bulkCreating}
            >
              Create {selectedProjects.length} Invoices
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={invoiceReadyProjects}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>

      {/* Bulk Results Modal */}
      <Modal
        title="Bulk Invoice Creation Results"
        open={showResults}
        onCancel={() => setShowResults(false)}
        footer={[
          <Button key="close" onClick={() => setShowResults(false)}>
            Close
          </Button>
        ]}
        width={800}
      >
        {bulkResults && (
          <div>
            <Progress
              percent={Math.round((bulkResults.summary.successful / bulkResults.summary.total) * 100)}
              success={{ percent: Math.round((bulkResults.summary.successful / bulkResults.summary.total) * 100) }}
              style={{ marginBottom: '16px' }}
            />
            
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={8}>
                <Statistic title="Total" value={bulkResults.summary.total} />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Successful" 
                  value={bulkResults.summary.successful} 
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Failed" 
                  value={bulkResults.summary.failed} 
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {bulkResults.results?.map((result, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <Space>
                    {result.success ? 
                      <CheckCircleOutlined style={{ color: '#52c41a' }} /> : 
                      <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                    }
                    <Text strong>Project {result.projectId.slice(-8)}:</Text>
                    {result.success ? (
                      <Text>Invoice {result.invoiceNumber} created</Text>
                    ) : (
                      <Text type="danger">{result.error}</Text>
                    )}
                  </Space>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuickInvoiceCreator;