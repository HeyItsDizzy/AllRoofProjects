// src/components/LoyaltyTierModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, message, Tabs, Progress, Tag } from 'antd';
import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';
import { IconClose } from '@/shared/IconSet';

const { TabPane } = Tabs;

export default function LoyaltyTierModal({ client, isOpen, onClose, onUpdate }) {
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(false);
  const [tierInfo, setTierInfo] = useState(null);
  const [unitsToAdd, setUnitsToAdd] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && client) {
      fetchTierInfo();
    }
  }, [isOpen, client]);

  const fetchTierInfo = async () => {
    try {
      setLoading(true);
      const response = await axiosSecure.get(`/loyalty/client/${client._id}`);
      setTierInfo(response.data.data);
    } catch (error) {
      message.error('Failed to load tier information');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnits = async () => {
    const units = parseInt(unitsToAdd);
    if (!units || units < 1) {
      message.error('Please enter a valid number of units');
      return;
    }

    try {
      setLoading(true);
      await axiosSecure.post(`/loyalty/client/${client._id}/add-units`, { units });
      message.success(`Added ${units} units successfully`);
      setUnitsToAdd('');
      await fetchTierInfo();
      if (onUpdate) onUpdate();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to add units');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setLoading(true);
      const response = await axiosSecure.post(`/loyalty/client/${client._id}/evaluate`);
      message.success('Tier evaluation completed');
      await fetchTierInfo();
      if (onUpdate) onUpdate();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to evaluate tier');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'elite': return '#FFD700';
      case 'pro': return '#C0C0C0';
      case 'standard': return '#CD7F32';
      default: return '#999';
    }
  };

  const getTierBadgeColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'elite': return 'gold';
      case 'pro': return 'blue';
      case 'standard': return 'default';
      default: return 'default';
    }
  };

  const calculateProgress = () => {
    if (!tierInfo) return 0;
    
    const thresholds = {
      standard: 6,
      pro: 11,
      elite: 11
    };

    const currentTier = tierInfo.currentTier.toLowerCase();
    const threshold = thresholds[currentTier];
    
    if (currentTier === 'elite') {
      return 100; // Elite is max tier
    }

    // Use last month's units (which determined current tier)
    const lastMonthUnits = tierInfo.monthlyHistory && tierInfo.monthlyHistory.length > 0
      ? tierInfo.monthlyHistory[0].estimateUnits || 0
      : 0;

    return Math.min((lastMonthUnits / threshold) * 100, 100);
  };

  const getNextTierInfo = () => {
    if (!tierInfo) return null;

    const currentTier = tierInfo.currentTier.toLowerCase();
    if (currentTier === 'elite') {
      return { name: 'Elite (Max)', threshold: tierInfo.currentMonthUnits };
    }
    if (currentTier === 'pro') {
      return { name: 'Elite', threshold: 11 };
    }
    return { name: 'Pro', threshold: 6 };
  };

  if (!tierInfo) {
    return (
      <Modal
        title={`Loyalty Tier - ${client?.name}`}
        open={isOpen}
        onCancel={onClose}
        footer={null}
        width={800}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Modal>
    );
  }

  const nextTier = getNextTierInfo();
  const progress = calculateProgress();

  return (
    <Modal
      title={
        <div className="flex items-center justify-between pr-8">
          <span className="text-xl font-bold">Loyalty Tier Management</span>
          <Tag color={getTierBadgeColor(tierInfo.currentTier)} className="text-sm px-3 py-1">
            {tierInfo.currentTier.toUpperCase()}
          </Tag>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      className="loyalty-tier-modal"
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-1">{client.name}</h3>
        <p className="text-sm text-gray-500">
          Enrolled: {tierInfo.enrolledDate ? new Date(tierInfo.enrolledDate).toLocaleDateString() : 'Not enrolled'}
        </p>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Overview Tab */}
        <TabPane tab="Overview" key="overview">
          <div className="space-y-6">
            {/* Current Tier Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Tier</p>
                  <p className="text-2xl font-bold" style={{ color: getTierColor(tierInfo.currentTier) }}>
                    {tierInfo.currentTier.toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Price per Unit</p>
                  <p className="text-2xl font-bold text-green-600">${tierInfo.pricePerUnit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Discount</p>
                  <p className="text-2xl font-bold text-purple-600">{tierInfo.discount}%</p>
                </div>
              </div>
            </div>

            {/* Last Month Performance (determines current tier) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold">Last Month (Dec 2025)</h4>
                <span className="text-sm text-gray-600">
                  {tierInfo.monthlyHistory && tierInfo.monthlyHistory.length > 0
                    ? tierInfo.monthlyHistory[0].estimateUnits || 0
                    : 0} units
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Determined your current tier: <strong className="text-blue-600">{tierInfo.currentTier}</strong>
              </div>
            </div>

            {/* Current Month Accumulating (for next tier evaluation) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-blue-800">This Month (Jan 2026)</h4>
                <span className="text-sm text-blue-600">
                  {tierInfo.currentMonthUnits} / {nextTier.threshold} units
                </span>
              </div>
              <Progress 
                percent={progress} 
                strokeColor={getTierColor(nextTier.name)}
                format={(percent) => `${Math.round(percent)}%`}
              />
              <p className="text-xs text-gray-500 mt-1">
                {tierInfo.currentTier.toLowerCase() === 'elite' 
                  ? 'You are at the highest tier!' 
                  : `${nextTier.threshold - tierInfo.currentMonthUnits} more units to reach ${nextTier.name} tier`
                }
              </p>
            </div>

            {/* Protection Status */}
            {tierInfo.protection && tierInfo.currentTier.toLowerCase() !== 'casual' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span>🛡️</span> Protection Status
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Protection Months</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {tierInfo.protection.monthsHeld}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Points</p>
                    <p className="text-xl font-bold text-blue-600">
                      {tierInfo.protection.currentPoints} / {tierInfo.protection.pointsNeededForNext}
                    </p>
                  </div>
                </div>
                <Progress 
                  percent={(tierInfo.protection.currentPoints / tierInfo.protection.pointsNeededForNext) * 100}
                  strokeColor="#EAB308"
                  className="mt-3"
                />
              </div>
            )}

            {/* Cashback Balance */}
            {tierInfo.cashbackBalance > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">💰 Cashback Available</h4>
                <p className="text-3xl font-bold text-green-600">${tierInfo.cashbackBalance}</p>
              </div>
            )}
          </div>
        </TabPane>

        {/* Add Units Tab */}
        <TabPane tab="Add Units" key="add-units">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Units to Add
              </label>
              <Input
                type="number"
                min={1}
                value={unitsToAdd}
                onChange={(e) => setUnitsToAdd(e.target.value)}
                placeholder="Enter number of units"
                size="large"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be added to the current month's estimate units
              </p>
            </div>

            <Button
              type="primary"
              onClick={handleAddUnits}
              loading={loading}
              disabled={!unitsToAdd || parseInt(unitsToAdd) < 1}
              size="large"
              className="w-full"
            >
              Add {unitsToAdd || '0'} Units
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold mb-2">📊 Tier Thresholds</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Standard (Bronze):</span>
                  <span className="font-semibold">0-5 units/month - $100/unit</span>
                </li>
                <li className="flex justify-between">
                  <span>Pro (Silver):</span>
                  <span className="font-semibold">6-10 units/month - $80/unit (20% off)</span>
                </li>
                <li className="flex justify-between">
                  <span>Elite (Gold):</span>
                  <span className="font-semibold">11+ units/month - $70/unit (30% off)</span>
                </li>
              </ul>
            </div>
          </div>
        </TabPane>

        {/* History Tab */}
        <TabPane tab="History" key="history">
          <div className="space-y-4">
            {tierInfo.monthlyHistory && tierInfo.monthlyHistory.length > 0 ? (
              <div>
                <h4 className="font-semibold mb-3">Monthly Usage History</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {tierInfo.monthlyHistory.map((record, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                      <div>
                        <p className="font-medium">{new Date(record.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        <p className="text-sm text-gray-600">
                          {record.units} units • {record.tier} tier
                        </p>
                      </div>
                      <div className="text-right">
                        <Tag color={getTierBadgeColor(record.tier)}>{record.tier}</Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No history available yet
              </div>
            )}
          </div>
        </TabPane>
      </Tabs>

      {/* Actions Footer */}
      <div className="mt-6 pt-4 border-t flex justify-between">
        <Button onClick={handleEvaluate} loading={loading}>
          Evaluate Tier Now
        </Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
