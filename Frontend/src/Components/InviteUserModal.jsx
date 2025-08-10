// src/components/InviteUserModal.jsx
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "../shared/Avatar";
import useClients from "../hooks/useClients";
import AssignClient from "./AssignClient";

const InviteUserModal = ({ isOpen, onClose, onInviteSent }) => {
  const { user: currentUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  
  // Fetch clients based on user role - global admins get all clients, company admins get none (we'll fetch their specific client)
  const { clients: allClientList, loading: clientsLoading } = useClients(currentUser?.role === "Admin");
  
  // State for the user's specific linked client (for company admins)
  const [userLinkedClient, setUserLinkedClient] = useState(null);
  const [linkedClientLoading, setLinkedClientLoading] = useState(false);
  
  // Create the effective client list
  const clientList = currentUser?.role === "Admin" ? allClientList : (userLinkedClient ? [userLinkedClient] : []);
  
  // Fetch user's specific linked client if they're not a global admin
  useEffect(() => {
    const fetchUserLinkedClient = async () => {
      if (currentUser?.role !== "Admin" && currentUser?.linkedClients?.length > 0) {
        setLinkedClientLoading(true);
        try {
          const userLinkedClientId = currentUser.linkedClients[0].$oid || currentUser.linkedClients[0];
          const response = await axiosSecure.get(`/clients/${userLinkedClientId}`);
          const clientData = response.data.client || response.data;
          setUserLinkedClient(clientData);
        } catch (error) {
          console.error("❌ Error fetching user linked client:", error);
        } finally {
          setLinkedClientLoading(false);
        }
      }
    };
    
    fetchUserLinkedClient();
  }, [currentUser, axiosSecure]);
  
  const [formData, setFormData] = useState({
    email: '',
    companyAdmin: false,
    company: '',
    linkingCode: '',
    sendEmail: true,
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
      // Auto-populate company for non-global admins when their linked client is available
      if (currentUser?.role !== "Admin" && userLinkedClient && !selectedClient) {
        setSelectedClient(userLinkedClient);
        setFormData(prev => ({
          ...prev,
          company: userLinkedClient._id,
          linkingCode: getCurrentLinkingCode(userLinkedClient, prev.companyAdmin)
        }));
      }
    }, [currentUser, userLinkedClient, selectedClient]);  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    const currentLinkingCode = getCurrentLinkingCode(client, formData.companyAdmin);
    setFormData(prev => ({
      ...prev,
      company: client._id,
      linkingCode: currentLinkingCode
    }));
    setShowClientModal(false);
    if (errors.company) {
      setErrors(prev => ({
        ...prev,
        company: ''
      }));
    }
  };

  // Get the appropriate linking code based on role selection
  const getCurrentLinkingCode = (client, isAdmin) => {
    if (!client) return '';
    
    if (isAdmin) {
      // Use admin linking code
      return client.adminLinkingCode || client.linkingCode || client._id;
    } else {
      // Use user linking code  
      return client.userLinkingCode || client.linkingCode || client._id;
    }
  };

  // Update linking code when role changes
  const handleRoleChange = (e) => {
    const { value } = e.target;
    const isAdmin = value === 'true';
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        companyAdmin: isAdmin
      };
      
      // For non-global admins, always use their linked client
      if (currentUser?.role !== "Admin" && userLinkedClient) {
        setSelectedClient(userLinkedClient);
        newFormData.company = userLinkedClient._id;
        newFormData.linkingCode = getCurrentLinkingCode(userLinkedClient, isAdmin);
      } else if (selectedClient) {
        // Update linking code for selected client (for global admins)
        newFormData.linkingCode = getCurrentLinkingCode(selectedClient, isAdmin);
      }
      
      return newFormData;
    });
  };

  // Filter clients based on search term
  const filteredClients = React.useMemo(() => {
    if (!clientList || !Array.isArray(clientList)) return [];
    
    if (!searchTerm.trim()) return clientList;
    
    const searchLower = searchTerm.toLowerCase();
    return clientList.filter(client => 
      client.name?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.linkingCode?.toLowerCase().includes(searchLower)
    );
  }, [clientList, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12);
      
      const inviteData = {
        email: formData.email,
        companyAdmin: formData.companyAdmin,
        company: formData.company, // Send company ID (proper way)
        linkingCode: formData.linkingCode,
        sendEmail: formData.sendEmail,
        invitedBy: currentUser._id,
      };

      console.log('🚀 Frontend: Sending invitation request:', inviteData);

      // Send invite request
      const response = await axiosSecure.post('/users/company-invite', inviteData);
      
      console.log('✅ Frontend: Received response:', response.data);
      
      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'User Invited Successfully!',
          text: formData.sendEmail 
            ? `An invitation email has been sent to ${formData.email} with the linking code: ${formData.linkingCode}` 
            : `Linking code ready: ${formData.linkingCode}`,
          confirmButtonText: 'OK'
        });
        
        onInviteSent();
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to invite user';
      
      Swal.fire({
        icon: 'error',
        title: 'Invitation Failed',
        text: `${errorMessage} (Status: ${error.response?.status || 'Unknown'})`,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      companyAdmin: false,
      company: currentUser?.role !== "Admin" ? currentUser?.company || '' : '',
      linkingCode: '',
      sendEmail: true,
    });
    setErrors({});
    setSelectedClient(currentUser?.role !== "Admin" ? { name: currentUser?.company } : null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-textBlack">Invite New User</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-textBlack mb-1">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter email address"
              required
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-sm font-medium text-textBlack mb-1">
              Company User/Admin
            </label>
            <select
              name="companyAdmin"
              value={formData.companyAdmin.toString()}
              onChange={handleRoleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={currentUser?.role !== 'Admin' && !currentUser?.companyAdmin}
            >
              <option value="false">Company User</option>
              <option value="true">Company Admin</option>
            </select>
          </div>

          {/* Company Selection Button */}
          <div>
            <label className="block text-sm font-medium text-textBlack mb-1">
              Company (Client) *
            </label>
            
            {currentUser?.role === 'Admin' ? (
              <div>
                {/* Selected Client Display */}
                {selectedClient ? (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={selectedClient.name}
                        avatarUrl={selectedClient.avatar}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium">{selectedClient.name}</div>
                        <div className="text-sm text-gray-500">Linking Code: {selectedClient.linkingCode || selectedClient._id}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setFormData(prev => ({...prev, company: '', linkingCode: ''}));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClientModal(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-left text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    Click to select company...
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                {selectedClient ? (
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={selectedClient.name}
                      avatarUrl={selectedClient.avatar}
                      size="sm"
                    />
                    <div>
                      <div className="font-medium">{selectedClient.name}</div>
                      <div className="text-sm text-gray-500">Linking Code: {formData.linkingCode || getCurrentLinkingCode(selectedClient, formData.companyAdmin)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">{formData.company || 'No company assigned'}</div>
                )}
              </div>
            )}
            
            {errors.company && (
              <p className="text-red-500 text-xs mt-1">{errors.company}</p>
            )}
          </div>

          {/* Linking Code Display */}
          {selectedClient && formData.linkingCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                {formData.companyAdmin ? 'Company Admin' : 'Company User'} Linking Code:
              </label>
              <div className="flex items-center gap-2">
                <code className="bg-blue-100 px-4 py-3 rounded text-blue-900 font-mono text-xl flex-1 text-center font-bold">
                  {formData.linkingCode}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(formData.linkingCode)}
                  className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                  title="Copy linking code"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm text-blue-700 mt-2 bg-blue-100 p-2 rounded">
                📧 <strong>Email Instructions:</strong> Send them to <code>/register</code> and tell them to use this linking code to connect to their company.
              </p>
            </div>
          )}

          {/* Send Email Option */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="sendEmail"
              id="sendEmail"
              checked={formData.sendEmail}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="sendEmail" className="ml-2 block text-sm text-textBlack">
              Send invitation email to user
            </label>
          </div>

          {/* Info Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              {formData.sendEmail
                ? `An email will be sent to ${formData.email} with instructions to register and the linking code to join ${selectedClient?.name || 'the selected company'} as a ${formData.companyAdmin ? 'Company Admin' : 'Company User'}.`
                : `The linking code ${formData.linkingCode} is ready to share with the user for ${selectedClient?.name || 'the selected company'}.`
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedClient}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>

        {/* AssignClient Modal - Selection Mode */}
        {showClientModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-textBlack">Select Company</h3>
                <button
                  onClick={() => setShowClientModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {/* Client List */}
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                {clientsLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading companies...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No companies found</div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client._id}
                      onClick={() => handleClientSelect(client)}
                      className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-3 transition-colors"
                    >
                      <Avatar
                        name={client.name}
                        avatarUrl={client.avatar}
                        size="md"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        <div className="text-xs space-y-1">
                          <div className="text-blue-600">
                            Company User Code: {client.userLinkingCode || client.linkingCode || client._id}
                          </div>
                          <div className="text-purple-600">
                            Company Admin Code: {client.adminLinkingCode || client.linkingCode || client._id}
                          </div>
                        </div>
                      </div>
                      <div className="text-blue-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteUserModal;
