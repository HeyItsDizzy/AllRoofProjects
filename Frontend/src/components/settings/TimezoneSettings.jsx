/**
 * TimezoneSettings Component
 * Allows users to select their timezone preference
 * Updates user profile with timezone settings for proper date handling
 */
import { useState, useEffect } from 'react';
import { Card, Select, Button, message, Divider, Typography, Tag } from 'antd';
import { GlobalOutlined, ClockCircleOutlined, UserOutlined, EnvironmentOutlined } from '@ant-design/icons';
import useTimezone from '@/hooks/useTimezone';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { useAuth } from '@/auth/AuthProvider';

const { Option, OptGroup } = Select;
const { Title, Text } = Typography;

const TimezoneSettings = () => {
  const { user, setUser } = useAuth();
  const { userRegion, userTimezone, timezoneConfig, getTimezoneInfo } = useTimezone();
  const [selectedRegion, setSelectedRegion] = useState(userRegion);
  const [selectedTimezone, setSelectedTimezone] = useState(userTimezone);
  const [loading, setLoading] = useState(false);
  const axiosSecure = useAxiosSecure();

  // Get current timezone info
  const currentTzInfo = getTimezoneInfo();

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    // Auto-select default timezone for region
    const defaultTz = timezoneConfig[region].default;
    setSelectedTimezone(defaultTz);
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);

      const updateData = {
        region: selectedRegion,
        timezone: selectedTimezone
      };

      // Update user preferences on server
      const response = await axiosSecure.patch('/users/timezone-settings', updateData);

      if (response.data.success) {
        // Update local user state
        setUser(prev => ({
          ...prev,
          region: selectedRegion,
          timezone: selectedTimezone
        }));

        message.success('Timezone settings updated successfully!');
      } else {
        message.error('Failed to update timezone settings');
      }
    } catch (error) {
      console.error('Error updating timezone settings:', error);
      message.error('Failed to update timezone settings');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = selectedRegion !== userRegion || selectedTimezone !== userTimezone;

  return (
    <Card 
      className="max-w-2xl mx-auto"
      title={
        <div className="flex items-center gap-2">
          <GlobalOutlined className="text-blue-600" />
          <span>Timezone Settings</span>
        </div>
      }
    >
      {/* Current Settings Display */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <ClockCircleOutlined className="text-blue-600" />
          <Text strong>Current Timezone Settings</Text>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Text type="secondary">Region:</Text>
            <div className="flex items-center gap-1">
              <Tag color="blue">{currentTzInfo.regionName}</Tag>
            </div>
          </div>
          
          <div>
            <Text type="secondary">Timezone:</Text>
            <div>
              <Text code>{currentTzInfo.timezone}</Text>
            </div>
          </div>
          
          <div>
            <Text type="secondary">UTC Offset:</Text>
            <div>
              <Text strong>{currentTzInfo.offset}</Text>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Text type="secondary">Business Hours: </Text>
          <Text>
            {currentTzInfo.businessHours.start}:00 - {currentTzInfo.businessHours.end}:00
          </Text>
        </div>
      </div>

      <Divider />

      {/* Region Selection */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <EnvironmentOutlined className="text-green-600" />
          <Text strong>Select Your Region</Text>
        </div>
        
        <Select
          value={selectedRegion}
          onChange={handleRegionChange}
          size="large"
          style={{ width: '100%' }}
          placeholder="Select your region"
        >
          <Option value="AU">
            <div className="flex items-center gap-2">
              <span>🇦🇺</span>
              <span>Australia (GMT+6 to +10)</span>
            </div>
          </Option>
          <Option value="US">
            <div className="flex items-center gap-2">
              <span>🇺🇸</span>
              <span>United States (GMT-10 to -5)</span>
            </div>
          </Option>
          <Option value="NO">
            <div className="flex items-center gap-2">
              <span>🇳🇴</span>
              <span>Norway (GMT+2)</span>
            </div>
          </Option>
        </Select>
      </div>

      {/* Timezone Selection */}
      {selectedRegion && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ClockCircleOutlined className="text-blue-600" />
            <Text strong>Select Your Timezone</Text>
          </div>
          
          <Select
            value={selectedTimezone}
            onChange={setSelectedTimezone}
            size="large"
            style={{ width: '100%' }}
            placeholder="Select your specific timezone"
            showSearch
            optionFilterProp="children"
          >
            {Object.entries(timezoneConfig[selectedRegion].zones).map(([tzId, tzInfo]) => (
              <Option key={tzId} value={tzId}>
                <div className="py-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{tzId.split('/')[1]}</span>
                    <span className="text-gray-500 text-xs">{tzInfo.offset}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {tzInfo.cities.join(', ')}
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-between items-center">
        <div>
          {hasChanges && (
            <Text type="warning" className="text-sm">
              <ClockCircleOutlined className="mr-1" />
              You have unsaved timezone changes
            </Text>
          )}
        </div>
        
        <Button
          type="primary"
          size="large"
          loading={loading}
          disabled={!hasChanges}
          onClick={handleSaveSettings}
          icon={<GlobalOutlined />}
        >
          Save Timezone Settings
        </Button>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <Text type="secondary" className="text-sm">
          <strong>Why set your timezone?</strong><br />
          • Ensures dates and times in emails are formatted correctly for your region<br />
          • Provides accurate business hours calculations<br />
          • Improves client communication by using appropriate date formats<br />
          • Helps coordinate work across multiple time zones (AU, US, NO)
        </Text>
      </div>
    </Card>
  );
};

export default TimezoneSettings;