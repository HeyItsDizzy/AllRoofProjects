// src/components/AddClientModal.jsx - Reusable Add Client Modal
import { useState } from "react";
import { Modal, Input, message, Tag, Button } from "antd";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import AddressInput from "./AddressInput";

/**
 * AddClientModal - Reusable modal for creating new clients
 * @param {boolean} isVisible - Controls modal visibility
 * @param {function} onClose - Callback when modal closes
 * @param {function} onClientCreated - Callback when client is successfully created, receives new client data
 */
export default function AddClientModal({ isVisible, onClose, onClientCreated }) {
  const [newClientData, setNewClientData] = useState({
    name: "",
    mainContact: {
      name: "",
      phone: "",
      email: "",
    },
    billingAddress: null,
    accountStatus: "Active", // Default to Active for new clients
    selectedCountry: "", // For country/region selector
    tags: [],
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [newTag, setNewTag] = useState("");

  const axiosSecure = useAxiosSecure();

  // Country options with their region codes
  const countryOptions = [
    { country: "Australia", region: "AU" },
    { country: "United States", region: "US" },
    { country: "Norway", region: "NO" },
  ];

  // Reset form when modal closes
  const handleClose = () => {
    if (!creatingClient) {
      setNewClientData({
        name: "",
        mainContact: {
          name: "",
          phone: "",
          email: "",
        },
        billingAddress: null,
        accountStatus: "Active",
        selectedCountry: "",
        tags: [],
      });
      setNewTag("");
      onClose();
    }
  };

  // Handle country selection
  const handleCountryChange = (country) => {
    const selectedOption = countryOptions.find(opt => opt.country === country);
    
    setNewClientData(prev => ({
      ...prev,
      selectedCountry: country,
      billingAddress: prev.billingAddress ? {
        ...prev.billingAddress,
        country: selectedOption.country,
        region: selectedOption.region
      } : {
        country: selectedOption.country,
        region: selectedOption.region
      }
    }));
  };

  // Tag management functions
  const addTag = () => {
    if (newTag.trim() && !newClientData.tags.includes(newTag.trim().toLowerCase())) {
      setNewClientData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setNewClientData(prev => ({
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

  // Create new client function
  const createNewClient = async () => {
    // Validate required fields
    if (!newClientData.name.trim()) {
      message.error("Client name is required");
      return;
    }
    
    if (newClientData.mainContact.email && !/\S+@\S+\.\S+/.test(newClientData.mainContact.email)) {
      message.error("Please enter a valid email address");
      return;
    }

    setCreatingClient(true);
    try {
      const clientData = {
        name: newClientData.name,
        username: newClientData.name, // Use name as username fallback
        mainContact: {
          name: newClientData.mainContact.name,
          phone: newClientData.mainContact.phone,
          email: newClientData.mainContact.email,
          accountsEmail: newClientData.mainContact.email
        },
        accountStatus: newClientData.accountStatus || "Active", // Include account status
        tags: newClientData.tags,
      };

      // Only add billing address if it has valid region and country (required by backend)
      if (newClientData.billingAddress && 
          newClientData.billingAddress.region && 
          newClientData.billingAddress.country) {
        clientData.billingAddress = newClientData.billingAddress;
      }

      const response = await axiosSecure.post("/clients", clientData);
      
      // Call the callback with the new client data
      if (onClientCreated) {
        onClientCreated(response.data);
      }
      
      message.success("Client created successfully!");
      handleClose();
    } catch (err) {
      console.error("Failed to create client:", err);
      const errorMessage = err.response?.data?.message || "Failed to create client. Please try again.";
      message.error(errorMessage);
    } finally {
      setCreatingClient(false);
    }
  };

  return (
    <Modal
      title="Add New Client"
      open={isVisible}
      onOk={createNewClient}
      onCancel={handleClose}
      okText={creatingClient ? "Creating..." : "Create Client"}
      cancelText="Cancel"
      confirmLoading={creatingClient}
      cancelButtonProps={{ disabled: creatingClient }}
      width={600}
      maskClosable={!creatingClient}
      destroyOnClose
    >
      <div className="space-y-4 py-4">
        {/* Client Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client/Company Name *
          </label>
          <Input
            value={newClientData.name}
            onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter client or company name"
            size="large"
            disabled={creatingClient}
            maxLength={100}
          />
        </div>

        {/* Main Contact Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Main Contact
          </label>
          <div className="space-y-3">
            <Input
              value={newClientData.mainContact.name}
              onChange={(e) => setNewClientData(prev => ({ 
                ...prev, 
                mainContact: { ...prev.mainContact, name: e.target.value }
              }))}
              placeholder="Contact person name"
              size="large"
              disabled={creatingClient}
            />
            <Input
              value={newClientData.mainContact.phone}
              onChange={(e) => setNewClientData(prev => ({ 
                ...prev, 
                mainContact: { ...prev.mainContact, phone: e.target.value }
              }))}
              placeholder="Phone number"
              size="large"
              disabled={creatingClient}
            />
            <Input
              value={newClientData.mainContact.email}
              onChange={(e) => setNewClientData(prev => ({ 
                ...prev, 
                mainContact: { ...prev.mainContact, email: e.target.value }
              }))}
              placeholder="Email address"
              type="email"
              size="large"
              disabled={creatingClient}
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Tags (Optional)
          </label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                placeholder="Add search tags (e.g., 'hjs' for 'Henry James Solutions', 'mag' for 'M.A.G. roofing')"
                size="large"
                disabled={creatingClient}
              />
              <Button onClick={addTag} disabled={creatingClient || !newTag.trim()} size="large">
                Add
              </Button>
            </div>
            {newClientData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {newClientData.tags.map(tag => (
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Status
          </label>
          <select
            value={newClientData.accountStatus}
            onChange={(e) => setNewClientData(prev => ({ ...prev, accountStatus: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={creatingClient}
          >
            <option value="Active">Active</option>
            <option value="Hold">Hold</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Set to &quot;Hold&quot; to restrict file downloads and uploads for this client
          </p>
        </div>

        {/* Billing Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Billing Address (Optional)
          </label>
          
          {/* Country Selector */}
          <div className="mb-3">
            <select
              value={newClientData.selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              disabled={creatingClient}
            >
              <option value="">Select Country</option>
              {countryOptions.map(opt => (
                <option key={opt.region} value={opt.country}>
                  {opt.country}
                </option>
              ))}
            </select>
          </div>
          
          {/* Address Input - Only show if country is selected */}
          {newClientData.selectedCountry && (
            <AddressInput
              location={newClientData.billingAddress}
              setLocation={(newAddress) => {
                // Preserve the selected country/region when address changes
                const selectedOption = countryOptions.find(opt => opt.country === newClientData.selectedCountry);
                setNewClientData(prev => ({ 
                  ...prev, 
                  billingAddress: newAddress ? {
                    ...newAddress,
                    country: selectedOption.country,
                    region: selectedOption.region
                  } : {
                    country: selectedOption.country,
                    region: selectedOption.region
                  }
                }));
              }}
              disabled={creatingClient}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
