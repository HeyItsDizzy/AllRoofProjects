import React, { useState } from 'react';
import { 
  Badge, 
  Button, 
  Dropdown, 
  List, 
  Typography, 
  Space, 
  Tag, 
  Tooltip,
  Empty,
  Divider
} from 'antd';
import { 
  DeleteOutlined, 
  BellOutlined, 
  RestoreOutlined,
  FileOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { formatDistance } from 'date-fns';
import useRecycleBinSocket from '@/hooks/useRecycleBinSocket';
import './RecycleBinNotifications.css';

const { Text } = Typography;

/**
 * RecycleBin Notifications Component
 * Shows real-time notifications for file deletions, restorations, and cleanup
 */
const RecycleBinNotifications = ({ showButton = true, placement = "bottomRight" }) => {
  const [visible, setVisible] = useState(false);
  
  const {
    notifications,
    notificationCount,
    clearNotifications,
    getRecentNotifications,
    hasRecentDeletions,
    hasRecentRestorations,
    isConnected
  } = useRecycleBinSocket();

  // Get icon for notification type
  const getNotificationIcon = (event) => {
    switch (event) {
      case 'file_deleted':
      case 'file_moved_to_recycle_bin':
        return <DeleteOutlined style={{ color: '#ff7875' }} />;
      case 'file_restored':
        return <RestoreOutlined style={{ color: '#52c41a' }} />;
      case 'items_permanently_deleted':
        return <DeleteOutlined style={{ color: '#ff4d4f' }} />;
      case 'cleanup_completed':
        return <ClearOutlined style={{ color: '#1890ff' }} />;
      default:
        return <BellOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // Get color for notification type
  const getNotificationColor = (event) => {
    switch (event) {
      case 'file_deleted':
      case 'file_moved_to_recycle_bin':
        return 'orange';
      case 'file_restored':
        return 'green';
      case 'items_permanently_deleted':
        return 'red';
      case 'cleanup_completed':
        return 'blue';
      default:
        return 'default';
    }
  };

  // Format notification message
  const formatNotificationMessage = (notification) => {
    const { event, data } = notification;
    
    switch (event) {
      case 'file_deleted':
        return `File "${data.fileName}" moved to recycle bin`;
      
      case 'file_moved_to_recycle_bin':
        return data.deletionMethod === 'filesystem_watch' 
          ? `File "${data.fileName}" deleted externally`
          : `File "${data.fileName}" moved to recycle bin`;
      
      case 'file_restored':
        return `File "${data.fileName}" restored`;
      
      case 'items_permanently_deleted':
        return `${data.deletedCount} files permanently deleted`;
      
      case 'cleanup_completed':
        return data.cleanupCount > 0 
          ? `${data.cleanupCount} expired files cleaned up`
          : 'Recycle bin cleanup completed';
      
      default:
        return 'RecycleBin update';
    }
  };

  // Get file type icon
  const getFileTypeIcon = (notification) => {
    const { event, data } = notification;
    
    if (event === 'file_deleted' || event === 'file_moved_to_recycle_bin') {
      return data.fileType === 'folder' ? 
        <FolderOutlined style={{ color: '#1890ff' }} /> : 
        <FileOutlined style={{ color: '#52c41a' }} />;
    }
    
    return null;
  };

  // Recent notifications for dropdown
  const recentNotifications = getRecentNotifications(10);

  // Dropdown menu content
  const dropdownContent = (
    <div className="recycle-bin-notifications-dropdown">
      <div className="dropdown-header">
        <Space className="w-full justify-between">
          <Space>
            <DeleteOutlined />
            <Text strong>RecycleBin Notifications</Text>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="status-dot"></div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {isConnected ? 'Live' : 'Offline'}
              </Text>
            </div>
          </Space>
          
          {notificationCount > 0 && (
            <Button 
              type="text" 
              size="small" 
              icon={<ClearOutlined />}
              onClick={() => {
                clearNotifications();
                setVisible(false);
              }}
            >
              Clear All
            </Button>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div className="notifications-list">
        {recentNotifications.length === 0 ? (
          <Empty 
            description="No recent notifications"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '20px 0' }}
          />
        ) : (
          <List
            size="small"
            dataSource={recentNotifications}
            renderItem={(notification) => (
              <List.Item className="notification-item">
                <Space className="w-full" align="start">
                  <div className="notification-icon">
                    {getNotificationIcon(notification.event)}
                  </div>
                  
                  <div className="notification-content flex-1">
                    <div className="notification-message">
                      <Text>{formatNotificationMessage(notification)}</Text>
                      {getFileTypeIcon(notification)}
                    </div>
                    
                    <div className="notification-meta">
                      <Space size={8}>
                        <Tag 
                          size="small" 
                          color={getNotificationColor(notification.event)}
                          style={{ margin: 0 }}
                        >
                          {notification.event.replace('_', ' ')}
                        </Tag>
                        
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          <ClockCircleOutlined style={{ marginRight: 2 }} />
                          {formatDistance(new Date(notification.timestamp), new Date(), { 
                            addSuffix: true 
                          })}
                        </Text>
                        
                        {notification.data?.projectName && (
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {notification.data.projectName}
                          </Text>
                        )}
                      </Space>
                    </div>
                  </div>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />
      
      <div className="dropdown-footer">
        <Button 
          type="link" 
          size="small" 
          block
          onClick={() => {
            setVisible(false);
            // Navigate to RecycleBin page
            window.location.href = '/recycle-bin';
          }}
        >
          View All in RecycleBin
        </Button>
      </div>
    </div>
  );

  if (!showButton) {
    return dropdownContent;
  }

  // Determine badge status
  const badgeStatus = hasRecentDeletions ? 'warning' : 
                     hasRecentRestorations ? 'success' : 
                     'default';

  return (
    <Dropdown
      overlay={dropdownContent}
      placement={placement}
      trigger={['click']}
      visible={visible}
      onVisibleChange={setVisible}
      overlayClassName="recycle-bin-notifications-overlay"
    >
      <Badge 
        count={notificationCount} 
        size="small"
        status={!isConnected ? 'error' : badgeStatus}
        title={`${notificationCount} RecycleBin notifications`}
      >
        <Tooltip title="RecycleBin Notifications">
          <Button 
            type="text" 
            icon={<DeleteOutlined />}
            className={`recycle-bin-notification-button ${
              hasRecentDeletions ? 'has-deletions' : ''
            } ${hasRecentRestorations ? 'has-restorations' : ''}`}
          />
        </Tooltip>
      </Badge>
    </Dropdown>
  );
};

export default RecycleBinNotifications;