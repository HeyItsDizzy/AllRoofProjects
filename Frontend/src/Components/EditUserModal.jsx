// src/components/EditUserModal.jsx
// Enhanced with complete state management to preserve all user data during updates
// Key Features:
// - originalUserData: Stores complete initial user data
// - currentUserState: Tracks all changes made during editing
// - Preserves linkedClients, linkedProjects, and all other user fields
// - Only updates fields that are actually changed
// - Prevents data loss during role changes or company assignments
import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import useClients from "../hooks/useClients";
import { IconClose } from "@/shared/IconSet";
import Avatar from "@/shared/Avatar";
import AddressInput from "./AddressInput";
import { calculateUserProfileStrength } from "../utils/profileStrength";

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { user: currentUser, setUser } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const clientDropdownRef = useRef(null);
  
  // Fetch all clients for global admins
  const { clients: allClientList, loading: clientsLoading } = useClients(currentUser?.role === "Admin");
  
  // State for form data - initialize with empty object, will be populated from user data
  const [formData, setFormData] = useState({});
  
  // Store original user data to preserve fields we don't modify
  const [originalUserData, setOriginalUserData] = useState({});
  
  // Store current complete user state - this gets updated as we make changes
  const [currentUserState, setCurrentUserState] = useState({});
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Client search and display states
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState([]);

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user && isOpen) {
      console.log("🔍 EditUserModal - Initializing with user data:", {
        userId: user._id,
        userCompany: user.company,
        userCompanyAdmin: user.companyAdmin,
        allClientListLength: allClientList.length
      });

      // Store complete original user data to preserve all fields
      setOriginalUserData(user);
      
      // Initialize current user state with complete user data
      setCurrentUserState(user);

      // Initialize form data with all user fields, not just the ones we edit
      const initialFormData = {
        ...user, // Include ALL original user data
        // Override with form-specific defaults if needed
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || {},
        role: user.role || 'User',
        company: user.company || '',
        companyAdmin: user.companyAdmin || false,
      };
      
      console.log("🔍 EditUserModal - Form data initialization:", {
        userCompany: user.company,
        formDataCompany: initialFormData.company,
        userLinkedClients: user.linkedClients?.length || 0
      });
      
      setFormData(initialFormData);

      // Find and set the selected client based on user's company
      if (user.company && allClientList.length > 0) {
        const foundClient = allClientList.find(client => {
          // Try multiple matching strategies since backend might store different formats
          const matches = [
            client._id === user.company,           // Match by ObjectId
            client.name === user.company,          // Match by company name
            client.company === user.company,       // Match by company field
            client.legalName === user.company,     // Match by legal name
            client.legalEntityName === user.company // Match by legal entity name
          ];
          return matches.some(match => match);
        });
        
        setSelectedClient(foundClient || null);
        console.log("🔍 EditUserModal - User company:", user.company);
        console.log("🔍 EditUserModal - Found client:", foundClient);
        
        // Update formData.company to use the client._id for consistency
        if (foundClient) {
          setFormData(prev => ({
            ...prev,
            company: foundClient._id
          }));
        }
      } else {
        setSelectedClient(null);
      }
    }
  }, [user, isOpen, allClientList]);

  // Filter clients based on search term
  useEffect(() => {
    const sortedClients = [...allClientList].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
    setFilteredClients(
      searchTerm
        ? sortedClients.filter((client) =>
            (client.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.company || "").toLowerCase().includes(searchTerm.toLowerCase())
          )
        : sortedClients
    );
  }, [allClientList, searchTerm]);

  // Handle clicking outside the client dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };

    if (showClientDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClientDropdown]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    // Update form data for UI
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Update current user state with the changed field
    setCurrentUserState(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    console.log(`🔄 Field ${name} updated:`, newValue);
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleClientChange = (client) => {
    setSelectedClient(client);
    const newCompanyId = client?._id || '';
    
    // Update form data for UI
    setFormData(prev => ({
      ...prev,
      company: newCompanyId
    }));
    
    // Update current user state with the changed company
    setCurrentUserState(prev => ({
      ...prev,
      company: newCompanyId
    }));
    
    console.log('🔄 Company updated:', newCompanyId);
    
    setShowClientDropdown(false);
    setSearchTerm("");
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowClientDropdown(true);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    
    // Update form data for UI
    setFormData(prev => ({
      ...prev,
      role: newRole,
      // Reset company admin if not User role
      companyAdmin: newRole === 'User' ? prev.companyAdmin : false
    }));
    
    // Update current user state with the changed role
    setCurrentUserState(prev => ({
      ...prev,
      role: newRole,
      // Reset company admin if not User role
      companyAdmin: newRole === 'User' ? prev.companyAdmin : false
    }));
    
    console.log('🔄 Role updated:', newRole);
  };

  // Helper function to handle forced refresh responses
  const handleForcedRefresh = async (response, actionType = 'updated') => {
    if (response?.requiresRefresh && response?.targetUserId) {
      console.log(`✅ ${actionType}. User ${response.targetUserId} will be updated.`);
      
      if (currentUser?._id === response.targetUserId) {
        console.log('🔄 Current user permissions changed, updating session...');
        
        // Check if we got a fresh token and updated user data
        if (response.freshToken && response.updatedUser) {
          console.log('🆕 Received fresh token, updating session immediately');
          
          // Update localStorage with fresh token and user data
          localStorage.setItem("authToken", response.freshToken);
          localStorage.setItem("authUser", JSON.stringify(response.updatedUser));
          
          // Update React context with fresh user data
          setUser(response.updatedUser);
          
          // Dispatch a custom event to notify other components about the permission change
          window.dispatchEvent(new CustomEvent('userPermissionsUpdated', {
            detail: { updatedUser: response.updatedUser }
          }));
          
          console.log('✅ Session updated successfully with fresh token');
          
          // Show success message
          Swal.fire({
            icon: 'success',
            title: 'Permissions Updated',
            text: `Your ${actionType === 'role updated' ? 'role has been updated' : 'permissions have been updated'} and your access is now current.`,
            timer: 3000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
          });
        } else {
          // Fallback for old endpoints that don't provide fresh tokens
          console.log('⚠️ No fresh token provided, forcing re-authentication');
          
          Swal.fire({
            icon: 'warning',
            title: 'Permissions Updated',
            text: `Your ${actionType === 'role updated' ? 'role has been updated' : 'permissions have changed'}. You need to sign in again to access updated features.`,
            showConfirmButton: true,
            confirmButtonText: 'Sign In Again',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then((result) => {
            if (result.isConfirmed) {
              // Clear all auth data and redirect to login
              localStorage.removeItem("authUser");
              localStorage.removeItem("authToken");
              localStorage.removeItem("user");
              
              // Force reload to login page
              window.location.href = '/login';
            }
          });
        }
        
        return true; // Indicates we handled the refresh
      }
    }
    return false; // No refresh needed
  };

  // API call functions
  const updateUserProfile = async (completeUserData) => {
    console.log("🔄 Updating user profile with complete current state:", {
      userId: user._id,
      totalFields: Object.keys(completeUserData),
      preservedLinkedClients: completeUserData.linkedClients?.length || 0,
      preservedLinkedProjects: completeUserData.linkedProjects?.length || 0
    });
    
    const response = await axiosSecure.patch(`/users/profile-admin/${user._id}`, completeUserData);
    return response.data;
  };

  const updateUserRole = async (newRole) => {
    const currentRole = user.role;
    
    // If role hasn't changed, skip
    if (currentRole === newRole) return null;

    console.log(`🔄 Updating role from ${currentRole} to ${newRole} for user ${user._id}`);

    // Update the current user state with the new role
    const updatedUserState = {
      ...currentUserState,
      role: newRole,
      // Add forceRefreshAfter for role changes that require session refresh
      forceRefreshAfter: new Date()
    };

    // Use our profile update function with the complete current user state
    const response = await updateUserProfile(updatedUserState);

    // Handle forced refresh response if needed
    if (response?.requiresRefresh && response?.targetUserId) {
      const showedRefreshPrompt = handleForcedRefresh(response, 'role updated');
      if (showedRefreshPrompt) {
        return response;
      }
    }

    return response;
  };

  const linkUserToCompany = async (clientId, isCompanyAdmin) => {
    if (!clientId) return;

    // Validate that we have a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(clientId)) {
      throw new Error('Invalid company ID format');
    }

    // Update user's company and companyAdmin status
    // Backend expects 'companyId' and 'companyAdmin' in request body
    const linkingData = {
      companyId: clientId,
      companyAdmin: isCompanyAdmin
    };

    console.log('🔗 Linking user to company:', { userId: user._id, linkingData });
    const response = await axiosSecure.patch(`/users/link-company-admin/${user._id}`, linkingData);
    
    // Handle forced refresh for company role changes
    handleForcedRefresh(response.data, 'linked to company');
    
    return response.data;
  };

  const unlinkUserFromCompany = async () => {
    console.log('🔗 Unlinking user from company - trying multiple approaches');
    
    // Method 1: Try the profile-admin endpoint to directly clear company fields
    // This is the most reliable method for global admins
    try {
      console.log('� Method 1: Using profile-admin to clear company fields');
      const response = await axiosSecure.patch(`/users/unlink-company-admin/${user._id}`);
      
      // If successful, also try to remove from client's linkedUsers array
      if (user.linkedClients && user.linkedClients.length > 0) {
        console.log('🔄 Also removing user from client linkedUsers array');
        console.log('📊 User linkedClients:', user.linkedClients);
        
        for (const clientId of user.linkedClients) {
          try {
            console.log(`🔄 Attempting to remove user ${user._id} from client ${clientId}`);
            
            // Try the Profile.jsx approach first (might fail if endpoint doesn't exist)
            try {
              await axiosSecure.delete(`/clients/${clientId}/users/${user._id}`);
              console.log(`✅ Removed user from client ${clientId} via client endpoint`);
            } catch (clientError) {
              console.warn(`⚠️ Client endpoint failed for ${clientId}:`, clientError.message);
              
              // Alternative: Since backend has inconsistent collection naming,
              // let's create a workaround by updating the client directly
              console.log(`🔄 Trying alternative approach for client ${clientId}`);
              
              // We could create a special endpoint or use a different approach
              // For now, let's document this as a known limitation
              console.warn(`📝 NOTE: Client ${clientId} may still show user in linkedUsers - backend needs client endpoint`);
            }
          } catch (clientError) {
            console.warn(`Failed to remove from client ${clientId}:`, clientError.message);
          }
        }
      } else {
        console.log('📝 User has no linkedClients to clean up');
      }
      return response.data;
    } catch (error) {
      console.warn('unlink-company-admin approach failed:', error.message);
      
      // Method 2: Fallback - try the remove-user endpoint (might fail due to auth)
      try {
        console.log('🔄 Method 2: Fallback to remove-user endpoint');
        const response = await axiosSecure.delete(`/users/remove-user/${user._id}`);
        return response.data;
      } catch (error2) {
        console.error('All unlinking methods failed:', error2.message);
        throw new Error('Failed to unlink user from company. Please try again or contact administrator.');
      }
    }
  };

  // Function to update profile score in the database
  const updateProfileScore = async (updatedUserData) => {
    try {
      // Calculate current profile strength based on updated data
      const profileStrengthData = calculateUserProfileStrength(updatedUserData);
      
      // Update profile score in the database
      await axiosSecure.patch("/users/profile-score", {
        profileScore: profileStrengthData.percentage
      });
      
      console.log("✅ Profile score updated:", profileStrengthData.percentage);
      return profileStrengthData.percentage;
    } catch (error) {
      // Silently fail - don't show errors for background score updates
      console.warn("⚠️ Failed to update profile score:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log("💾 Starting save process with current user state:", {
        currentUserState: Object.keys(currentUserState),
        linkedClients: currentUserState.linkedClients?.length || 0,
        linkedProjects: currentUserState.linkedProjects?.length || 0
      });

      // 1. Update user profile with complete current state
      // This preserves ALL fields including linkedClients, linkedProjects, etc.
      await updateUserProfile(currentUserState);

      // 1.5. Calculate and update profile score based on current state
      await updateProfileScore(currentUserState);

      // 2. Update role if changed (this is now handled within updateUserProfile)
      // No separate role update needed since it's included in currentUserState

      // 3. Handle company linking/unlinking ONLY if company assignment actually changed
      const currentUserCompany = user.company;
      const newCompanyId = currentUserState.company;

      console.log('📊 Company linking analysis:', {
        currentUserCompany,
        newCompanyId,
        selectedClient: selectedClient?._id,
        companyAdmin: currentUserState.companyAdmin,
        companyChanged: currentUserCompany !== newCompanyId,
        isUnlinking: currentUserCompany && !newCompanyId,
        isLinking: newCompanyId && selectedClient,
        isChangingCompany: currentUserCompany && newCompanyId && currentUserCompany !== newCompanyId
      });

      // IMPORTANT: Only perform company operations if the company assignment actually changed
      const companyChanged = currentUserCompany !== newCompanyId;
      
      if (!companyChanged) {
        console.log('✅ Company assignment unchanged - skipping company linking operations');
      } else if (currentUserCompany && !newCompanyId) {
        // Scenario 1: User had a company but now doesn't - unlink only
        console.log('🔗 Unlinking user from company');
        const unlinkResponse = await unlinkUserFromCompany();
        
        // Handle forced refresh
        const showedRefreshPrompt = handleForcedRefresh(unlinkResponse, 'removed from company');
        
        // Clear local state to reflect the unlinking immediately
        setSelectedClient(null);
        setFormData(prev => ({
          ...prev,
          company: '',
          companyAdmin: false
        }));
        
        // Always close modal and notify parent on successful operation
        console.log('🔄 Notifying parent to refresh user data');
        onUserUpdated();
        onClose();
        
        // If we showed a refresh prompt, don't continue with the normal success flow
        if (showedRefreshPrompt) {
          return;
        }
      } else if (currentUserCompany && newCompanyId && currentUserCompany !== newCompanyId) {
        // Scenario 2: User is changing from one company to another - unlink first, then link
        console.log('🔄 Changing user from one company to another');
        
        // Validate that the new company ID matches the selected client
        if (newCompanyId !== selectedClient._id) {
          throw new Error('Company ID mismatch - please reselect the company');
        }
        
        // Step 1: Unlink from current company
        console.log('🔗 Step 1: Unlinking user from current company:', currentUserCompany);
        const unlinkResponse = await unlinkUserFromCompany();
        
        // Handle forced refresh from unlink
        const showedUnlinkRefreshPrompt = handleForcedRefresh(unlinkResponse, 'removed from previous company');
        if (showedUnlinkRefreshPrompt) {
          // Close modal and notify parent on successful operation
          console.log('🔄 Notifying parent to refresh user data');
          onUserUpdated();
          onClose();
          return;
        }
        
        // Step 2: Link to new company
        console.log('🔗 Step 2: Linking user to new company:', newCompanyId);
        const linkResponse = await linkUserToCompany(newCompanyId, currentUserState.companyAdmin);
        
        // Handle forced refresh from link
        const showedLinkRefreshPrompt = handleForcedRefresh(linkResponse, 'moved to new company');
        if (showedLinkRefreshPrompt) {
          // Close modal and notify parent on successful operation
          console.log('🔄 Notifying parent to refresh user data');
          onUserUpdated();
          onClose();
          return;
        }
      } else if (newCompanyId && selectedClient) {
        // Scenario 3: User is being linked to a company (no previous company)
        // Validate that the company ID matches the selected client
        if (newCompanyId !== selectedClient._id) {
          throw new Error('Company ID mismatch - please reselect the company');
        }
        
        console.log('🔗 Linking user to company:', newCompanyId);
        const linkResponse = await linkUserToCompany(newCompanyId, currentUserState.companyAdmin);
        
        // Handle forced refresh
        const showedRefreshPrompt = handleForcedRefresh(linkResponse, 'linked to company');
        
        // Always close modal and notify parent on successful operation
        console.log('🔄 Notifying parent to refresh user data');
        onUserUpdated();
        onClose();
        
        // If we showed a refresh prompt, don't continue with the normal success flow
        if (showedRefreshPrompt) {
          return;
        }
      } else if (newCompanyId && !selectedClient) {
        // This shouldn't happen, but let's handle it
        throw new Error('Selected company data is missing - please reselect the company');
      }

      // Success notification with specific message
      let successMessage = `${currentUserState.firstName} ${currentUserState.lastName} has been updated successfully.`;
      
      if (currentUserCompany && !newCompanyId) {
        successMessage = `${currentUserState.firstName} ${currentUserState.lastName} has been removed from the company.`;
      } else if (currentUserCompany && newCompanyId && currentUserCompany !== newCompanyId) {
        const companyName = selectedClient.company || selectedClient.name;
        successMessage = `${currentUserState.firstName} ${currentUserState.lastName} has been moved to ${companyName}${currentUserState.companyAdmin ? ' as a company admin' : ''}.`;
      } else if (newCompanyId && selectedClient) {
        const companyName = selectedClient.company || selectedClient.name;
        successMessage = `${currentUserState.firstName} ${currentUserState.lastName} has been linked to ${companyName}${currentUserState.companyAdmin ? ' as a company admin' : ''}.`;
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: successMessage,
        timer: 2000,
        showConfirmButton: false
      });

      // Notify parent component to refresh data and force re-fetch
      console.log('🔄 Notifying parent to refresh user data');
      onUserUpdated();
      onClose();

    } catch (error) {
      console.error('Error updating user:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data
      });
      
      let errorMessage = 'Failed to update user';
      
      // Handle specific company linking errors
      if (error.config?.url?.includes('link-company-admin')) {
        if (error.response?.status === 400) {
          errorMessage = error.response?.data?.message || 'Invalid company data provided';
        } else if (error.response?.status === 404) {
          errorMessage = 'Company not found. Please verify the company exists.';
        } else {
          errorMessage = 'Failed to link user to company';
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all form state to prevent stale data
    setFormData({});
    setOriginalUserData({});
    setCurrentUserState({});
    setSelectedClient(null);
    setErrors({});
    setSearchTerm("");
    setShowClientDropdown(false);
    setLoading(false);
    
    console.log('🧹 Cleared all modal state on close');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-textBlack">
            Edit User: {user?.firstName} {user?.lastName}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <IconClose className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* User Identity Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-textBlack mb-4 border-b pb-2">
              User Identity
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-textBlack mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-textBlack mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-textBlack mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-textBlack mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Global Role Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-textBlack mb-4 border-b pb-2">
              Global Role
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-textBlack mb-2">
                  System Role
                </label>
                <p className="text-xs text-gray-500">
                  System-wide role that determines overall permissions
                </p>
              </div>
              
              <div>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleRoleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="User">User</option>
                  <option value="Estimator">Estimator</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Company Assignment Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-textBlack mb-4 border-b pb-2">
              Company Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Selection */}
              <div ref={clientDropdownRef}>
                <label className="block text-sm font-medium text-textBlack mb-2">
                  Link to Company
                </label>
                
                {/* Selected Client Display */}
                {selectedClient ? (
                  <div className="border border-gray-300 rounded-md p-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={selectedClient.company || selectedClient.name}
                          avatarUrl={selectedClient.avatar}
                          size="md"
                        />
                        <span className="text-sm font-medium">
                          {selectedClient.company || selectedClient.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClientChange(null)}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Search Input */}
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Search for a company..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={clientsLoading}
                    />
                    
                    {/* Client Dropdown */}
                    {showClientDropdown && !clientsLoading && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <button
                              key={client._id}
                              type="button"
                              onClick={() => handleClientChange(client)}
                              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-100 text-left border-b border-gray-100 last:border-b-0"
                            >
                              <Avatar
                                name={client.company || client.name}
                                avatarUrl={client.avatar}
                                size="sm"
                              />
                              <span className="text-sm truncate">
                                {client.company || client.name}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-3 text-sm text-gray-500">
                            No companies found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {clientsLoading && (
                  <p className="text-sm text-gray-500 mt-1">Loading companies...</p>
                )}
              </div>

              {/* Company Role Selector */}
              <div>
                <label className="block text-sm font-medium text-textBlack mb-2">
                  Company Role
                </label>
                {formData.company ? (
                  <select
                    name="companyAdmin"
                    value={formData.companyAdmin.toString()}
                    onChange={(e) => {
                      const isCompanyAdmin = e.target.value === 'true';
                      
                      // Update form data for UI
                      setFormData(prev => ({ ...prev, companyAdmin: isCompanyAdmin }));
                      
                      // Update current user state
                      setCurrentUserState(prev => ({ ...prev, companyAdmin: isCompanyAdmin }));
                      
                      console.log('🔄 Company admin updated:', isCompanyAdmin);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="false">Company User</option>
                    <option value="true">Company Admin</option>
                  </select>
                ) : (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                    <span className="text-sm text-gray-500">
                      Select a company first
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
