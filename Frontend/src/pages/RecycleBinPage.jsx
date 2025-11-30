import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Tag, 
  Input, 
  Select, 
  Modal, 
  message, 
  Card, 
  Statistic, 
  Row, 
  Col, 
  Tooltip,
  Popconfirm,
  Progress,
  Avatar
} from 'antd';
import { 
  DeleteOutlined, 
  SearchOutlined, 
  FileOutlined, 
  FolderOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { IconRestore } from '@/shared/IconSet';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { AuthContext } from '../auth/AuthProvider';
import { formatDistance, format } from 'date-fns';
import './RecycleBinPage.css';

const { Search } = Input;
const { Option } = Select;
const { confirm } = Modal;

const RecycleBinPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    fileType: '',
    clientId: '',
    sortBy: 'deletedAt',
    sortOrder: 'desc'
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [clients, setClients] = useState([]);
  const [restoring, setRestoring] = useState(new Set());
  const [deleting, setDeleting] = useState(new Set());

  const axiosSecure = useAxiosSecure();
  const { user } = React.useContext(AuthContext);

  // Fetch recycle bin items
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.fileType && { fileType: filters.fileType }),
        ...(filters.clientId && { clientId: filters.clientId })
      });

      const response = await axiosSecure.get(`/api/recycle-bin/items?${params}`);
      
      if (response.data.success) {
        setItems(response.data.items);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination.total
        }));
      }
    } catch (error) {
      console.error('Error fetching recycle bin items:', error);
      message.error('Failed to load recycle bin items');
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.pageSize, filters, axiosSecure]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await axiosSecure.get('/api/recycle-bin/summary');
      
      if (response.data.success) {
        setSummary(response.data.overallSummary);
        
        // Extract unique clients from summaries
        const clientList = response.data.summaries.map(s => ({
          id: s.clientId,
          name: s.clientName || `Client ${s.clientId}`,
          itemCount: s.totalFiles
        }));
        setClients(clientList);
      }
    } catch (error) {
      console.error('Error fetching recycle bin summary:', error);
    }
  }, [axiosSecure]);

  // Load data on mount and filter changes
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Handle search
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle table pagination
  const handleTableChange = (pag, filters, sorter) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current,
      pageSize: pag.pageSize
    }));

    if (sorter.order) {
      setFilters(prev => ({
        ...prev,
        sortBy: sorter.field,
        sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc'
      }));
    }
  };

  // Restore single file
  const handleRestore = async (item) => {
    try {
      setRestoring(prev => new Set([...prev, item._id]));

      const response = await axiosSecure.post(`/api/recycle-bin/restore/${item._id}`);
      
      if (response.data.success) {
        message.success(`File "${item.fileName}" restored successfully`);
        fetchItems();
        fetchSummary();
      }
    } catch (error) {
      console.error('Error restoring file:', error);
      message.error(error.response?.data?.error || 'Failed to restore file');
    } finally {
      setRestoring(prev => {
        const newSet = new Set(prev);
        newSet.delete(item._id);
        return newSet;
      });
    }
  };

  // Permanently delete single file
  const handlePermanentDelete = async (item) => {
    try {
      setDeleting(prev => new Set([...prev, item._id]));

      const response = await axiosSecure.delete(`/api/recycle-bin/permanent/${item._id}`);
      
      if (response.data.success) {
        message.success(`File "${item.fileName}" permanently deleted`);
        fetchItems();
        fetchSummary();
      }
    } catch (error) {
      console.error('Error permanently deleting file:', error);
      message.error(error.response?.data?.error || 'Failed to delete file');
    } finally {
      setDeleting(prev => {
        const newSet = new Set(prev);
        newSet.delete(item._id);
        return newSet;
      });
    }
  };

  // Bulk restore
  const handleBulkRestore = async () => {
    if (selectedRowKeys.length === 0) return;

    try {
      setLoading(true);
      
      const response = await axiosSecure.post('/api/recycle-bin/restore-bulk', {
        recycleBinIds: selectedRowKeys
      });
      
      if (response.data.success) {
        message.success(`${response.data.restoredCount} files restored successfully`);
        if (response.data.failedCount > 0) {
          message.warning(`${response.data.failedCount} files failed to restore`);
        }
        setSelectedRowKeys([]);
        fetchItems();
        fetchSummary();
      }
    } catch (error) {
      console.error('Error bulk restoring files:', error);
      message.error('Failed to restore files');
    } finally {
      setLoading(false);
    }
  };

  // Bulk permanent delete
  const handleBulkPermanentDelete = async () => {
    if (selectedRowKeys.length === 0) return;

    confirm({
      title: 'Permanently Delete Files',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to permanently delete ${selectedRowKeys.length} files? This action cannot be undone.`,
      okText: 'Yes, Delete Permanently',
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          setLoading(true);
          
          const response = await axiosSecure.delete('/api/recycle-bin/permanent-bulk', {
            data: { recycleBinIds: selectedRowKeys }
          });
          
          if (response.data.success) {
            message.success(`${response.data.deletedCount} files permanently deleted`);
            setSelectedRowKeys([]);
            fetchItems();
            fetchSummary();
          }
        } catch (error) {
          console.error('Error bulk deleting files:', error);
          message.error('Failed to delete files');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Get expiry status
  const getExpiryStatus = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays <= 0) {
      return { status: 'expired', color: 'red', text: 'Expired' };
    } else if (diffDays <= 1) {
      return { status: 'critical', color: 'orange', text: `${diffDays} day left` };
    } else if (diffDays <= 3) {
      return { status: 'warning', color: 'yellow', text: `${diffDays} days left` };
    } else {
      return { status: 'safe', color: 'green', text: `${diffDays} days left` };
    }
  };

  // Table columns
  const columns = [
    {
      title: 'File',
      dataIndex: 'fileName',
      key: 'fileName',
      sorter: true,
      render: (text, record) => (
        <Space>
          {record.fileType === 'folder' ? (
            <FolderOutlined style={{ color: '#1890ff' }} />
          ) : (
            <FileOutlined style={{ color: '#52c41a' }} />
          )}
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-xs text-gray-500">{record.originalPath}</div>
          </div>
        </Space>
      )
    },
    {
      title: 'Size',
      dataIndex: 'fileSize',
      key: 'fileSize',
      sorter: true,
      render: (size) => formatFileSize(size),
      width: 100
    },
    {
      title: 'Deleted',
      dataIndex: 'deletedAt',
      key: 'deletedAt',
      sorter: true,
      render: (date) => (
        <Tooltip title={format(new Date(date), 'PPpp')}>
          <div>
            <div>{formatDistance(new Date(date), new Date(), { addSuffix: true })}</div>
            <div className="text-xs text-gray-500">{format(new Date(date), 'MMM dd, yyyy')}</div>
          </div>
        </Tooltip>
      ),
      width: 120
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date) => {
        const expiry = getExpiryStatus(date);
        return (
          <Tag color={expiry.color} icon={<ClockCircleOutlined />}>
            {expiry.text}
          </Tag>
        );
      },
      width: 120
    },
    {
      title: 'Type',
      dataIndex: 'fileType',
      key: 'fileType',
      render: (type) => (
        <Tag color={type === 'folder' ? 'blue' : 'green'}>
          {type}
        </Tag>
      ),
      width: 80
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Restore file">
            <Button
              type="primary"
              size="small"
              icon={<IconRestore size={16} />}
              loading={restoring.has(record._id)}
              onClick={() => handleRestore(record)}
            >
              Restore
            </Button>
          </Tooltip>
          
          <Popconfirm
            title="Permanently delete this file?"
            description="This action cannot be undone."
            onConfirm={() => handlePermanentDelete(record)}
            okText="Delete"
            okType="danger"
            cancelText="Cancel"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deleting.has(record._id)}
            >
              Delete
            </Button>
          </Popconfirm>

          {record.metadata.previewAvailable && (
            <Tooltip title="Preview">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  // TODO: Implement preview modal
                  message.info('Preview feature coming soon');
                }}
              />
            </Tooltip>
          )}
        </Space>
      ),
      width: 200,
      fixed: 'right'
    }
  ];

  // Row selection config
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ]
  };

  return (
    <div className="recycle-bin-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🗑️ Recycle Bin</h1>
          <p>Recover deleted files or permanently remove them</p>
        </div>
        
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchItems();
            fetchSummary();
          }}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <Row gutter={16} className="summary-cards mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Files"
                value={summary.totalFiles}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Size"
                value={summary.totalSizeFormatted}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Files"
                value={summary.fileCount}
                prefix={<FileOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Folders"
                value={summary.folderCount}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card className="filters-card mb-4">
        <Row gutter={16}>
          <Col span={8}>
            <Search
              placeholder="Search files and folders..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%' }}
              prefix={<SearchOutlined />}
            />
          </Col>
          
          <Col span={4}>
            <Select
              placeholder="File Type"
              allowClear
              style={{ width: '100%' }}
              value={filters.fileType}
              onChange={(value) => handleFilterChange('fileType', value)}
            >
              <Option value="file">Files</Option>
              <Option value="folder">Folders</Option>
            </Select>
          </Col>
          
          <Col span={6}>
            <Select
              placeholder="Client"
              allowClear
              style={{ width: '100%' }}
              value={filters.clientId}
              onChange={(value) => handleFilterChange('clientId', value)}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {clients.map(client => (
                <Option key={client.id} value={client.id}>
                  {client.name} ({client.itemCount} items)
                </Option>
              ))}
            </Select>
          </Col>
          
          <Col span={6}>
            <Space>
              <Button
                type="primary"
                icon={<IconRestore size={16} />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBulkRestore}
              >
                Restore Selected ({selectedRowKeys.length})
              </Button>
              
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBulkPermanentDelete}
              >
                Delete Selected
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={items}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items`
          }}
          loading={loading}
          onChange={handleTableChange}
          rowKey="_id"
          scroll={{ x: 1200 }}
          className="recycle-bin-table"
        />
      </Card>

      {/* Storage Usage Warning */}
      {summary && summary.totalSize > 0 && (
        <Card className="mt-4">
          <div className="storage-warning">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Storage Usage</span>
              <span className="text-sm text-gray-500">
                {summary.totalSizeFormatted} / 2.0 GB
              </span>
            </div>
            <Progress
              percent={Math.min(100, (summary.totalSize / (2 * 1024 * 1024 * 1024)) * 100)}
              status={summary.totalSize > 1.5 * 1024 * 1024 * 1024 ? 'exception' : 'normal'}
              format={(percent) => `${percent.toFixed(1)}%`}
            />
            {summary.totalSize > 1.5 * 1024 * 1024 * 1024 && (
              <div className="text-orange-600 text-sm mt-2">
                ⚠️ Recycle bin is approaching storage limit. Consider permanently deleting some files.
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RecycleBinPage;