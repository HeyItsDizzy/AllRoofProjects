import { useState, useEffect, useRef } from "react";
import { Modal, Tabs, Input, Button, Tag, Progress, message, Select } from "antd";
import AddressInput from "./AddressInput";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";

const { TabPane } = Tabs;

export default function EditClientModal({ client, isOpen, onClose, onUpdate }) {
  const axiosSecure = useAxiosSecure();
  
  // Tags input state
  const [newTag, setNewTag] = useState("");
  
  // Client editing state
  const [formData, setFormData] = useState({
    name: "",
    mainContact: {
      name: "",
      phone: "",
      email: "",
    },
    billingAddress: null,
    accountStatus: "Active",
    tags: [],
  });
  
  // Loyalty tier state
  const [tierInfo, setTierInfo] = useState(null);
  const [tierLoading, setTierLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualPoints, setManualPoints] = useState("");
  const [manualMonths, setManualMonths] = useState("");
  const [initialPoints, setInitialPoints] = useState(0);
  const [initialMonths, setInitialMonths] = useState(0);
  const pointsTimerRef = useRef(null);
  const monthsTimerRef = useRef(null);

  // Initialize form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || client.username || "",
        mainContact: {
          name: client.mainContact?.name || client.name || "",
          phone: client.mainContact?.phone || client.phone || "",
          email: client.mainContact?.email || client.email || "",
        },
        billingAddress: client.billingAddress || client.address || null,
        accountStatus: client.accountStatus || "Active",
        tags: client.tags || [],
      });
      
      // Fetch tier info when modal opens
      fetchTierInfo();
    }
  }, [client]);

  // Fetch loyalty tier information
  const fetchTierInfo = async () => {
    if (!client?._id) return;
    
    setTierLoading(true);
    try {
      const response = await axiosSecure.get(`/loyalty/client/${client._id}`);
      console.log('📊 Loyalty Tier Data:', response.data);
      setTierInfo(response.data);
      // Update manual input fields with current values
      const points = response.data?.data?.protection?.currentPoints || 0;
      const months = response.data?.data?.protection?.monthsHeld || 0;
      setManualPoints(points.toString());
      setManualMonths(months.toString());
      setInitialPoints(points);
      setInitialMonths(months);
    } catch (error) {
      // If 404, set default tier info (loyalty is default for all clients)
      if (error.response?.status === 404) {
        console.log("Client doesn't have loyalty data yet, using defaults");
        setTierInfo({
          success: true,
          data: {
            loyaltyTier: 'Elite',
            tierProtectionPoints: 0,
            tierProtectionMonths: 0,
            cashbackBalance: 0
          }
        });
        setManualPoints(0);
        setManualMonths(0);
      } else {
        console.error("Error fetching tier info:", error);
        message.error("Failed to load loyalty tier information");
      }
    } finally {
      setTierLoading(false);
    }
  };

  // Save client changes
  const handleSave = async () => {
    if (!formData.name?.trim()) {
      message.error("Client name is required");
      return;
    }

    setSaving(true);
    try {
      // Save basic client info
      await axiosSecure.patch(`/clients/${client._id}`, {
        name: formData.name,
        mainContact: formData.mainContact,
        billingAddress: formData.billingAddress,
        address: formData.billingAddress, // Keep both for compatibility
        accountStatus: formData.accountStatus,
        tags: formData.tags,
      });

      // Save tier changes if any
      const newPoints = parseFloat(manualPoints);
      if (!isNaN(newPoints) && newPoints >= 0 && newPoints !== initialPoints) {
        const pointsAdjustment = newPoints - initialPoints;
        await axiosSecure.post(`/loyalty/client/${client._id}/adjust-protection-points`, {
          adjustment: pointsAdjustment,
          reason: 'Manual admin adjustment'
        });
      }

      const newMonths = parseInt(manualMonths);
      if (!isNaN(newMonths) && newMonths >= 0 && newMonths <= 3 && newMonths !== initialMonths) {
        const monthsAdjustment = newMonths - initialMonths;
        await axiosSecure.post(`/loyalty/client/${client._id}/adjust-protection-months`, {
          adjustment: monthsAdjustment,
          reason: 'Manual admin adjustment'
        });
      }
      
      message.success("Client updated successfully");
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error updating client:", error);
      message.error(error.response?.data?.message || "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  // Tag management functions
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Store selected tier in state
  const [selectedTier, setSelectedTier] = useState('');

  // Update selected tier when tier info loads
  useEffect(() => {
    if (tierInfo?.data?.loyaltyTier) {
      setSelectedTier(tierInfo.data.loyaltyTier.toLowerCase());
    }
  }, [tierInfo]);

  // Manual tier override - save immediately since it's a major change
  const handleManualTierUpdate = async (newTier) => {
    setTierLoading(true);
    try {
      await axiosSecure.post(`/loyalty/client/${client._id}/manual-tier-update`, {
        tier: newTier,
        reason: 'Manual admin override'
      });
      message.success(`Tier updated to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}`);
      setSelectedTier(newTier);
      await fetchTierInfo();
    } catch (error) {
      console.error("Error updating tier manually:", error);
      message.error(error.response?.data?.message || "Failed to update tier");
    } finally {
      setTierLoading(false);
    }
  };

  // Adjust protection points (for +0.5/-0.5 buttons)
  const handleAdjustProtectionPoints = (adjustment) => {
    const value = parseFloat(adjustment);
    if (isNaN(value) || value === 0) return;
    
    const currentValue = parseFloat(manualPoints) || 0;
    const newValue = Math.max(0, currentValue + value);
    setManualPoints(newValue.toString());
  };

  // Mark changes as pending when manual input changes
  const handlePointsChange = (value) => {
    setManualPoints(value);
  };

  // Adjust protection points (for +0.5/-0.5 buttons)
  const handleAdjustProtectionMonths = (adjustment) => {
    const value = parseInt(adjustment);
    if (isNaN(value) || value === 0) return;
    
    const currentValue = parseInt(manualMonths) || 0;
    const newValue = Math.max(0, Math.min(3, currentValue + value));
    setManualMonths(newValue.toString());

  };

  // Mark changes as pending when manual input changes
  const handleMonthsChange = (value) => {
    setManualMonths(value);
  };

  // Helper functions for tier display
  const getTierColor = (tier) => {
    switch (tier) {
      case 'elite': return '#FFD700';
      case 'pro': return '#C0C0C0';
      default: return '#CD7F32';
    }
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'elite': return 'gold';
      case 'pro': return 'blue';
      default: return 'default';
    }
  };

  const getTierPrice = (tier) => {
    switch (tier) {
      case 'elite': return 70;
      case 'pro': return 80;
      default: return 100;
    }
  };

  return (
    <Modal
      title={`Edit Client: ${client?.name || client?.username || ''}`}
      open={isOpen}
      onCancel={onClose}
      onOk={handleSave}
      okText={saving ? "Saving..." : "Save Changes"}
      cancelText="Cancel"
      confirmLoading={saving}
      width={900}
      maskClosable={!saving}
      cancelButtonProps={{ disabled: saving }}
    >
      <div className="space-y-6 py-4">
        {/* Client Details Section */}
        <div className="grid grid-cols-2 gap-4">
          {/* Client Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client/Company Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter client or company name"
              disabled={saving}
              maxLength={100}
            />
          </div>

          {/* Main Contact - Condensed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Name
            </label>
            <Input
              value={formData.mainContact.name}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                mainContact: { ...prev.mainContact, name: e.target.value }
              }))}
              placeholder="Contact person name"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              value={formData.mainContact.phone}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                mainContact: { ...prev.mainContact, phone: e.target.value }
              }))}
              placeholder="Phone number"
              disabled={saving}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              value={formData.mainContact.email}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                mainContact: { ...prev.mainContact, email: e.target.value }
              }))}
              placeholder="Email address"
              type="email"
              disabled={saving}
            />
          </div>

          {/* Tags */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Tags
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagInputKeyPress}
                  placeholder="Add search tags (e.g., 'hjs' for 'Henry James Solutions', 'mag' for 'M.A.G. roofing')"
                  disabled={saving}
                />
                <Button onClick={addTag} disabled={saving || !newTag.trim()}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map(tag => (
                    <Tag
                      key={tag}
                      closable
                      onClose={() => removeTag(tag)}
                      color="blue"
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500">
                Tags help you find clients quickly when assigning projects. Use abbreviations or alternative names.
              </p>
            </div>
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Status
            </label>
            <select
              value={formData.accountStatus}
              onChange={(e) => setFormData(prev => ({ ...prev, accountStatus: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              disabled={saving}
            >
              <option value="Active">Active</option>
              <option value="Hold">Hold</option>
            </select>
          </div>

          {/* Address */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Address
            </label>
            <AddressInput
              location={formData.billingAddress}
              setLocation={(newAddress) => setFormData(prev => ({ 
                ...prev, 
                billingAddress: newAddress
              }))}
              disabled={saving}
            />
          </div>
        </div>

        {/* Loyalty Tier Section - Simplified */}
        {tierLoading ? (
          <div className="flex items-center justify-center py-8 border-t pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading tier information...</p>
            </div>
          </div>
        ) : tierInfo ? (
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Loyalty Tier Management</h3>
            
            {/* Simplified Form Layout */}
            <div className="space-y-3">
              {/* Current Tier */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-40">
                  Current Tier
                </label>
                <Select
                  value={selectedTier || 'casual'}
                  onChange={handleManualTierUpdate}
                  style={{ width: '100%' }}
                  options={[
                    { value: 'casual', label: 'Casual - $100/est' },
                    { value: 'pro', label: 'Pro - $80/est (-20%)' },
                    { value: 'elite', label: 'Elite - $70/est (-30%)' }
                  ]}
                  disabled={tierLoading}
                />
              </div>

              {/* Protection Points */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-40">
                  Protection Points
                </label>
                <Button
                  size="middle"
                  onClick={() => handleAdjustProtectionPoints('-0.5')}
                  disabled={tierLoading}
                >
                  -0.5
                </Button>
                <Input
                  value={manualPoints}
                  onChange={(e) => handlePointsChange(e.target.value)}
                  disabled={tierLoading}
                  style={{ width: '80px' }}
                  type="number"
                  min="0"
                  step="0.5"
                />
                <Button
                  size="middle"
                  onClick={() => handleAdjustProtectionPoints('0.5')}
                  disabled={tierLoading}
                  type="primary"
                >
                  +0.5
                </Button>
              </div>

              {/* Protection Months */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-40">
                  Protection Months<br />(Max 3)
                </label>
                <Button
                  size="middle"
                  onClick={() => handleAdjustProtectionMonths('-1')}
                  disabled={tierLoading}
                >
                  -1
                </Button>
                <Input
                  value={manualMonths}
                  onChange={(e) => handleMonthsChange(e.target.value)}
                  disabled={tierLoading}
                  style={{ width: '80px' }}
                  type="number"
                  min="0"
                  max="3"
                />
                <Button
                  size="middle"
                  onClick={() => handleAdjustProtectionMonths('1')}
                  disabled={tierLoading}
                  type="primary"
                >
                  +1
                </Button>
              </div>

              {/* Cashback Credits */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 w-40">
                  Cashback Credits
                </label>
                <Input
                  value={`$${tierInfo.data?.cashbackBalance || 0}`}
                  disabled
                  placeholder="Not yet configured"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Tier Pricing Reference */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Tier Pricing & Benefits</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white rounded border border-gray-200">
                  <p className="font-medium mb-1">Casual (0-5)</p>
                  <p className="text-lg font-bold text-gray-700">$100/est</p>
                  <p className="text-xs text-gray-500 mt-1">No protection</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-blue-700 mb-1">Pro (6-10)</p>
                  <p className="text-lg font-bold text-blue-600">$80/est</p>
                  <p className="text-xs text-blue-600 mt-1">-20% • 5 pts = 1 mo</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="font-medium text-yellow-700 mb-1">Elite (11+)</p>
                  <p className="text-lg font-bold text-yellow-600">$70/est</p>
                  <p className="text-xs text-yellow-600 mt-1">-30% • 10 pts = 1 mo</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Loyalty Tier Management</h3>
            <p className="text-sm text-gray-600 mb-4">
              Loyalty tiers are enabled by default for all clients. Tiers are automatically calculated based on monthly usage from your job board.
            </p>
            
            {/* Simplified Form Layout - Empty State */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Current Tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Tier
                </label>
                <Select
                  value="elite"
                  style={{ width: '100%' }}
                  options={[
                    { value: 'casual', label: 'Casual - $100/est' },
                    { value: 'pro', label: 'Pro - $80/est (-20%)' },
                    { value: 'elite', label: 'Elite - $70/est (-30%)' }
                  ]}
                  disabled
                />
              </div>

              {/* Protection Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protection Points
                </label>
                <div className="flex gap-2">
                  <Input value="0" disabled className="flex-1" />
                  <Button size="middle" disabled>-1</Button>
                  <Button size="middle" disabled type="primary">+1</Button>
                </div>
              </div>

              {/* Protection Months */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protection Months (Max 3)
                </label>
                <div className="flex gap-2">
                  <Input value="0" disabled className="flex-1" />
                  <Button size="middle" disabled>-1</Button>
                  <Button size="middle" disabled type="primary">+1</Button>
                </div>
              </div>

              {/* Cashback Credits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cashback Credits
                </label>
                <Input value="$0" disabled placeholder="Not yet configured" />
              </div>
            </div>

            {/* Tier Pricing Reference */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Tier Pricing & Benefits</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-white rounded border border-gray-200">
                  <p className="font-medium mb-1">Casual (0-5)</p>
                  <p className="text-lg font-bold text-gray-700">$100/est</p>
                  <p className="text-xs text-gray-500 mt-1">No protection</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-medium text-blue-700 mb-1">Pro (6-10)</p>
                  <p className="text-lg font-bold text-blue-600">$80/est</p>
                  <p className="text-xs text-blue-600 mt-1">-20% • 5 pts = 1 mo</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="font-medium text-yellow-700 mb-1">Elite (11+)</p>
                  <p className="text-lg font-bold text-yellow-600">$70/est</p>
                  <p className="text-xs text-yellow-600 mt-1">-30% • 10 pts = 1 mo</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
