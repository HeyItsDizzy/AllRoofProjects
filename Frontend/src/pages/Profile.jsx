import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "@/shared/Avatar";
import { resizeImage } from "../utils/ImageResizer";
import { calculateUserProfileStrength, calculateCompanyProfileStrength, getStrengthColors } from "../utils/profileStrength";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import InviteUserModal from "../components/InviteUserModal";
import { IconSync } from "@/shared/IconSet";

const BASE_URL = import.meta.env.VITE_STATIC_BASE_URL;

const Profile = () => {
  const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1 MB
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const isAdmin = user?.role === "Admin";
  const [isEditing, setIsEditing] = useState(false);
  const [showUserStrengthDetails, setShowUserStrengthDetails] = useState(false);
  const [showCompanyStrengthDetails, setShowCompanyStrengthDetails] = useState(false);

  const [userData, setUserData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {},
    avatar: "",
    logo: null,
  });
  
  
  const [previewUrl, setPreviewUrl] = useState(null);
  // Phone verification state
  const [phoneRegion, setPhoneRegion] = useState("AU");
  
  // Area code mappings with local format examples
  const areaCodes = {
    'AU': { code: '+61', flag: '🇦🇺', name: 'Australia', placeholder: '412 345 678', example: '(02) 1234 5678' },
    'US': { code: '+1', flag: '🇺🇸', name: 'United States', placeholder: '555 123 4567', example: '(555) 123-4567' },
    'NO': { code: '+47', flag: '🇳🇴', name: 'Norway', placeholder: '123 45 678', example: '12 34 56 78' },
    'IN': { code: '+91', flag: '🇮🇳', name: 'India', placeholder: '98765 43210', example: '+91 98765 43210' }
  };

  // Format phone number for display (combine area code + number)
  const getFormattedPhoneNumber = () => {
    if (!userData.phone) return '';
    
    try {
      // Try to parse and format with libphonenumber-js
      const phoneNumber = parsePhoneNumberFromString(userData.phone, phoneRegion);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.formatInternational();
      }
    } catch (error) {
      console.log('Phone parsing error:', error);
    }
    
    // Fallback: If phone already has area code, return as-is
    if (userData.phone.startsWith('+')) return userData.phone;
    
    // Otherwise combine with selected area code
    return `${areaCodes[phoneRegion].code} ${userData.phone}`;
  };

  // Extract just the number part (without area code) for input field
  const getPhoneNumberOnly = () => {
    if (!userData.phone) return '';
    
    try {
      // Try to parse with libphonenumber-js and get national format
      const phoneNumber = parsePhoneNumberFromString(userData.phone, phoneRegion);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.nationalNumber;
      }
    } catch (error) {
      console.log('Phone parsing error:', error);
    }
    
    // Fallback: If phone has area code, remove it
    const areaCode = areaCodes[phoneRegion].code;
    if (userData.phone.startsWith(areaCode)) {
      return userData.phone.replace(areaCode, '').trim();
    }
    
    // Remove any other area codes
    for (const region in areaCodes) {
      const code = areaCodes[region].code;
      if (userData.phone.startsWith(code)) {
        return userData.phone.replace(code, '').trim();
      }
    }
    
    return userData.phone;
  };

  // Detect region from phone number and set it
  const detectAndSetPhoneRegion = (phone) => {
    if (!phone) return;
    
    try {
      // Try to parse and detect country with libphonenumber-js
      const phoneNumber = parsePhoneNumberFromString(phone);
      if (phoneNumber && phoneNumber.isValid()) {
        const country = phoneNumber.country;
        // Map ISO country codes to our region codes
        const countryToRegion = {
          'AU': 'AU',
          'US': 'US', 
          'NO': 'NO'
        };
        
        if (countryToRegion[country]) {
          setPhoneRegion(countryToRegion[country]);
          return;
        }
      }
    } catch (error) {
      console.log('Phone detection error:', error);
    }
    
    // Fallback: manual detection
    if (!phone.startsWith('+')) return;
    
    for (const [region, info] of Object.entries(areaCodes)) {
      if (phone.startsWith(info.code)) {
        setPhoneRegion(region);
        break;
      }
    }
  };

  // Get properly formatted phone for display (read mode)
  const getDisplayPhoneNumber = () => {
    if (!userData.phone) return '';
    
    try {
      // Try to parse and format with libphonenumber-js
      const phoneNumber = parsePhoneNumberFromString(userData.phone, phoneRegion);
      if (phoneNumber && phoneNumber.isValid()) {
        // Use national format for read mode (local formatting)
        return phoneNumber.formatNational();
      }
    } catch (error) {
      console.log('Phone formatting error:', error);
    }
    
    // Fallback: If already formatted with area code, return as-is
    if (userData.phone.startsWith('+')) {
      return userData.phone;
    }
    
    // If just a number, format with current region
    return `${areaCodes[phoneRegion].code} ${userData.phone}`;
  };

  // Validate phone number
  const isValidPhoneNumber = (phone, region = phoneRegion) => {
    if (!phone) return false;
    
    try {
      const phoneNumber = parsePhoneNumberFromString(phone, region);
      return phoneNumber && phoneNumber.isValid();
    } catch (error) {
      return false;
    }
  };

  // Get phone number in international format for API calls
  const getInternationalPhoneNumber = () => {
    if (!userData.phone) return '';
    
    try {
      const phoneNumber = parsePhoneNumberFromString(userData.phone, phoneRegion);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.format('E.164'); // Returns +47XXXXXXXX format
      }
    } catch (error) {
      console.log('Phone formatting error:', error);
    }
    
    // Fallback to manual formatting
    if (userData.phone.startsWith('+')) {
      return userData.phone.replace(/\s+/g, ''); // Remove spaces
    }
    
    return `${areaCodes[phoneRegion].code}${userData.phone.replace(/\s+/g, '')}`;
  };
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const isEditingPhone = isEditing && userData.phone !== originalPhone;
  
  // Company data state
  const [companyData, setCompanyData] = useState({
    name: "",
    legalName: "",
    abn: "",
    logoUrl: "",
    billingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      region: "",
      full_address: "",
      streetNumber: ""
    },
    mainContact: {
      name: "",
      email: "",
      phone: ""
    }
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  
  // Company admin panel state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [companyAdmins, setCompanyAdmins] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false); // Track actual admin permissions
  
  // Linking codes state
  const [linkingCodes, setLinkingCodes] = useState({
    userLinkingCode: "",
    adminLinkingCode: ""
  });
  const [codesLoading, setCodesLoading] = useState(false);
  
  // Profile strength calculation
  const userStrength = React.useMemo(() => {
    return calculateUserProfileStrength({
      ...user,
      ...userData,
      phoneVerified
    });
  }, [user, userData, phoneVerified]);

  // Company profile strength for display (matches calculation on Company Profile page)
  const companyStrength = React.useMemo(() => {
    if (!companyData || Object.keys(companyData).length === 0) {
      return { percentage: 0, completedFields: 0, totalFields: 0 };
    }
    return calculateCompanyProfileStrength(companyData);
  }, [companyData]);

  // Fetch company data
  const fetchCompanyData = async () => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId) {
      setCompanyLoading(false);
      return;
    }
    
    setCompanyLoading(true);
    try {
      const res = await axiosSecure.get(`/clients/${clientId}`);
      const data = res.data.client || res.data;
      setCompanyData({
        name: data.name || "",
        legalName: data.legalName || "",
        abn: data.abn || "",
        logoUrl: data.logoUrl ? `${BASE_URL}${data.logoUrl}?t=${Date.now()}` : "",
        billingAddress: {
          line1: data.billingAddress?.line1 || "",
          line2: data.billingAddress?.line2 || "",
          city: data.billingAddress?.city || "",
          state: data.billingAddress?.state || "",
          postalCode: data.billingAddress?.postalCode || "",
          country: data.billingAddress?.country || "",
          region: data.billingAddress?.region || "",
          full_address: data.billingAddress?.full_address || "",
          streetNumber: data.billingAddress?.streetNumber || ""
        },
        mainContact: {
          name: data.mainContact?.name || "",
          email: data.mainContact?.email || "",
          phone: data.mainContact?.phone || ""
        }
      });
    } catch (err) {
      console.error("Error fetching company data:", err);
      setCompanyData({
        name: "",
        legalName: "",
        abn: "",
        logoUrl: "",
        billingAddress: {
          line1: "",
          line2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
          region: "",
          full_address: "",
          streetNumber: ""
        },
        mainContact: {
          name: "",
          email: "",
          phone: ""
        }
      });
    } finally {
      setCompanyLoading(false);
    }
  };

  // Fetch company users and admins
  const fetchCompanyUsers = async () => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId || !user?._id) {
      console.log('⏭️ Skipping company users fetch - missing clientId or user ID');
      return;
    }
    
    console.log('🔍 Fetching company users for client:', clientId);
    
    setUsersLoading(true);
    try {
      // Use the new client-based API to get company users
      const response = await axiosSecure.get(`/clients/${clientId}/users`);
      
      if (response.data.success) {
        setCompanyUsers(response.data.data.companyUsers || []);
        setCompanyAdmins(response.data.data.admins || []);
        setHasAdminAccess(true); // User has actual admin access
        console.log('✅ Company users fetched successfully, user has admin access');
      }
    } catch (err) {
      console.error("Error fetching company users:", err);
      // Permission error means user is not an admin
      if (err.response?.status === 403) {
        console.log('🚫 403 error - user does not have admin permissions');
        setCompanyUsers([]);
        setCompanyAdmins([]);
        setHasAdminAccess(false);
      } else {
        // Other errors - clear admin state to be safe
        console.log('❌ Other error - clearing admin state for safety');
        setCompanyUsers([]);
        setCompanyAdmins([]);
        setHasAdminAccess(false);
      }
    } finally {
      setUsersLoading(false);
    }
  };

  // Promote user to admin
  const promoteToAdmin = async (userId) => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId) return;
    
    try {
      const response = await axiosSecure.patch(`/clients/${clientId}/users/${userId}/promote`);
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: response.data.message,
          toast: true,
          timer: 2000,
          position: "top-end",
          showConfirmButton: false,
        });
        
        // Check if the promoted user needs to refresh their session
        if (response.data.requiresRefresh && response.data.targetUserId) {
          console.log("🔄 User role changed, updating session...");
          
          // If the promoted user is the current user, update their session
          if (response.data.targetUserId === user._id) {
            console.log("🔄 Current user was promoted, updating session...");
            
            // Check if we got a fresh token and updated user data
            if (response.data.freshToken && response.data.updatedUser) {
              console.log('🆕 Received fresh token, updating session immediately');
              // Update localStorage with fresh token and user data (both keys for compatibility)
              localStorage.setItem("authToken", response.data.freshToken);
              localStorage.setItem("token", response.data.freshToken);
              localStorage.setItem("authUser", JSON.stringify(response.data.updatedUser));
              // If axios instance uses in-memory token, update it here (if needed)
              if (axiosSecure.defaults && axiosSecure.defaults.headers) {
                axiosSecure.defaults.headers["Authorization"] = `Bearer ${response.data.freshToken}`;
              }
              // Update React context with fresh user data
              setUser(response.data.updatedUser);
              // Dispatch a custom event to trigger data refresh
              window.dispatchEvent(new CustomEvent('userPermissionsUpdated', {
                detail: { updatedUser: response.data.updatedUser }
              }));
              console.log('✅ Session updated successfully with fresh token');
              Swal.fire({
                icon: "success",
                title: "Role Updated",
                text: "You now have admin privileges and your access has been updated!",
                timer: 3000,
                showConfirmButton: false,
                position: "top-end",
                toast: true
              });
            } else {
              // Fallback for endpoints that don't provide fresh tokens yet
              Swal.fire({
                icon: "success",
                title: "Role Updated",
                text: "You now have admin privileges! Please sign in again to access admin features.",
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
          } else {
            // Show a notification to admins that the user should refresh
            Swal.fire({
              icon: "info",
              title: "Note",
              text: "The promoted user should refresh their browser to access admin features.",
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
              toast: true
            });
          }
        }
        
        fetchCompanyUsers(); // Refresh the lists
      }
    } catch (err) {
      console.error("Error promoting user:", err);
      const errorMessage = err.response?.data?.message || "Failed to promote user to admin.";
      Swal.fire("Error", errorMessage, "error");
    }
  };

  // Demote admin to user
  const demoteToUser = async (userId) => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId) return;
    
    // Check if this is the last admin
    if (companyAdmins.length === 1) {
      return Swal.fire({
        icon: "warning",
        title: "Cannot demote last admin",
        text: "A company must have at least one administrator. Promote another user to admin first.",
      });
    }
    
    try {
      const response = await axiosSecure.patch(`/clients/${clientId}/users/${userId}/demote`);
      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: response.data.message,
          toast: true,
          timer: 2000,
          position: "top-end",
          showConfirmButton: false,
        });
        
        // Check if the demoted user needs to refresh their session
        if (response.data.requiresRefresh && response.data.targetUserId) {
          console.log("🔄 User role changed, updating session...");
          
          // If the demoted user is the current user, update their session
          if (response.data.targetUserId === user._id) {
            console.log("🔄 Current user was demoted, updating session...");
            
            // Check if we got a fresh token and updated user data
            if (response.data.freshToken && response.data.updatedUser) {
              console.log('🆕 Received fresh token, updating session immediately');
              
              // Update localStorage with fresh token and user data
              localStorage.setItem("authToken", response.data.freshToken);
              localStorage.setItem("authUser", JSON.stringify(response.data.updatedUser));
              
              // Update React context with fresh user data
              setUser(response.data.updatedUser);
              
              // Dispatch a custom event to trigger data refresh
              window.dispatchEvent(new CustomEvent('userPermissionsUpdated', {
                detail: { updatedUser: response.data.updatedUser }
              }));
              
              console.log('✅ Session updated successfully with fresh token');
              
              Swal.fire({
                icon: "info",
                title: "Role Updated",
                text: "Your admin privileges have been removed and your access has been updated.",
                timer: 3000,
                showConfirmButton: false,
                position: "top-end",
                toast: true
              });
            } else {
              // Fallback for endpoints that don't provide fresh tokens yet
              Swal.fire({
                icon: "warning",
                title: "Role Updated",
                text: "Your admin privileges have been removed. Please sign in again to continue.",
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
          } else {
            // Show a notification to admins that the user should refresh
            Swal.fire({
              icon: "info",
              title: "Note",
              text: "The demoted user should refresh their browser to see updated permissions.",
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
              toast: true
            });
          }
        }
        
        fetchCompanyUsers(); // Refresh the lists
      }
    } catch (err) {
      console.error("Error demoting admin:", err);
      const errorMessage = err.response?.data?.message || "Failed to demote admin to user.";
      Swal.fire("Error", errorMessage, "error");
    }
  };

  // Remove user from company
  const removeUser = async (userId, isAdmin = false) => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId) return;
    
    // If removing self and is the last admin, prevent it
    if (userId === user._id && isAdmin && companyAdmins.length === 1) {
      return Swal.fire({
        icon: "warning",
        title: "Cannot remove last admin",
        text: "You are the last administrator. Promote another user to admin before removing yourself.",
      });
    }
    
    const result = await Swal.fire({
      title: "Remove User",
      text: `Are you sure you want to remove this user from the company?${userId === user._id ? " This will remove yourself!" : ""}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove user"
    });
    
    if (result.isConfirmed) {
      try {
        const response = await axiosSecure.delete(`/clients/${clientId}/users/${userId}`);
        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: response.data.message,
            toast: true,
            timer: 2000,
            position: "top-end",
            showConfirmButton: false,
          });
          fetchCompanyUsers(); // Refresh the lists
          
          // If user removed themselves, redirect to home or logout
          if (userId === user._id) {
            window.location.href = '/';
          }
        }
      } catch (err) {
        console.error("Error removing user:", err);
        const errorMessage = err.response?.data?.message || "Failed to remove user from company.";
        Swal.fire("Error", errorMessage, "error");
      }
    }
  };

  // Fetch linking codes
  const fetchLinkingCodes = async () => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId || !user?._id) {
      console.log('⏭️ Skipping linking codes fetch - missing clientId or user ID');
      return;
    }
    
    console.log('🔍 Fetching linking codes for client:', clientId);
    
    setCodesLoading(true);
    try {
      const response = await axiosSecure.get(`/clients/${clientId}/linking-codes`);
      if (response.data.success) {
        setLinkingCodes({
          userLinkingCode: response.data.data.userLinkingCode,
          adminLinkingCode: response.data.data.adminLinkingCode
        });
        // If we can fetch linking codes, user has admin access
        setHasAdminAccess(true);
        console.log('✅ Linking codes fetched successfully, user has admin access');
      }
    } catch (err) {
      console.error("Error fetching linking codes:", err);
      // Permission error means user is not an admin
      if (err.response?.status === 403) {
        console.log('🚫 403 error - user does not have admin permissions for linking codes');
        setLinkingCodes({ userLinkingCode: '', adminLinkingCode: '' });
        setHasAdminAccess(false);
      } else {
        // Other errors
        console.log('❌ Other error fetching linking codes');
        Swal.fire("Error", "Failed to fetch linking codes.", "error");
        setHasAdminAccess(false);
      }
    } finally {
      setCodesLoading(false);
    }
  };

  // Regenerate linking codes
  const regenerateCode = async (codeType) => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId) return;
    
    const result = await Swal.fire({
      title: `Regenerate ${codeType === 'user' ? 'User' : 'Admin'} Code`,
      text: "This will invalidate the current code. Are you sure?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, regenerate"
    });
    
    if (result.isConfirmed) {
      try {
        const response = await axiosSecure.post(`/clients/${clientId}/regenerate-codes`, {
          codeType
        });
        
        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: response.data.message,
            toast: true,
            timer: 2000,
            position: "top-end",
            showConfirmButton: false,
          });
          
          // Update the codes in state
          setLinkingCodes({
            userLinkingCode: response.data.data.userLinkingCode,
            adminLinkingCode: response.data.data.adminLinkingCode
          });
        }
      } catch (err) {
        console.error("Error regenerating code:", err);
        const errorMessage = err.response?.data?.message || "Failed to regenerate code.";
        Swal.fire("Error", errorMessage, "error");
      }
    }
  };

  // Copy code to clipboard
  const copyToClipboard = (code, type) => {
    navigator.clipboard.writeText(code).then(() => {
      Swal.fire({
        icon: "success",
        title: `${type} code copied to clipboard!`,
        toast: true,
        timer: 1500,
        position: "top-end",
        showConfirmButton: false,
      });
    }).catch(() => {
      Swal.fire("Error", "Failed to copy code to clipboard.", "error");
    });
  };

  const fetchProfile = async () => {
    try {
      const res = await axiosSecure.get("/users/profile");
      const data = res.data;
      if (data.success && data.data) {
        const phoneNumber = data.data.phone || "";
        
        setUserData((prev) => ({
          ...prev,
          companyName: data.data.company || "",
          email: data.data.email || "",
          firstName: data.data.firstName || "",
          lastName: data.data.lastName || "",
          phone: phoneNumber,
          address: data.data.address || {},
          avatar: `${data.data.avatar}?t=${Date.now()}`,
          phoneVerified: data.data.phoneVerified || false,
        }));

        // Detect and set phone region based on the loaded phone number
        if (phoneNumber) {
          detectAndSetPhoneRegion(phoneNumber);
        }

        setUser((prev) => ({
          ...prev,
          ...(data.data.avatar && { avatar: `${data.data.avatar}?t=${Date.now()}` }),
          ...(data.data.company && { company: data.data.company }),
        }));

        setPhoneVerified(data.data.phoneVerified || false);
        setOriginalPhone(phoneNumber);

        // Update profile score in background (silently)
        updateProfileScore(data.data);
      }
    } catch (error) {
      console.error("❌ Error fetching profile:", error);
    }
  };

  // Function to update profile score in the database
  const updateProfileScore = async (currentUserData = null) => {
    try {
      // Use provided data or current state
      const dataToUse = currentUserData || { ...user, ...userData, phoneVerified };
      
      // Calculate current profile strength
      const profileStrengthData = calculateUserProfileStrength(dataToUse);
      
      // Only update if score is different from what we might have stored
      if (profileStrengthData.percentage !== dataToUse.profileScore) {
        await axiosSecure.patch("/users/profile-score", {
          profileScore: profileStrengthData.percentage
        });
        console.log("✅ Profile score updated:", profileStrengthData.percentage);
      }
    } catch (error) {
      // Silently fail - don't show errors for background score updates
      console.warn("⚠️ Failed to update profile score:", error);
    }
  };

  useEffect(() => {
    const initializeProfile = async () => {
      // Fetch profile data
      fetchProfile();
      fetchCompanyData();
      
      // Admin data will be fetched by the other useEffect watching user.companyAdmin
    };
    
    initializeProfile();
  }, []);

  // Watch for changes in admin status and fetch admin data
  useEffect(() => {
    // Only fetch admin data when we have a user with linked clients
    // This prevents race conditions where user context isn't loaded yet
    if (user && user._id && user.linkedClients && user.linkedClients.length > 0) {
      console.log('🔍 User loaded with linked clients, checking admin permissions');
      fetchCompanyUsers();
      fetchLinkingCodes();
    } else {
      console.log('⏳ User or linked clients not loaded yet, skipping admin data fetch');
      // Reset admin access if user has no linked clients
      setHasAdminAccess(false);
    }
  }, [user?.companyAdmin, user?._id, user?.linkedClients]); // Depend on user ID, admin status, and linked clients

  // Watch for changes in user profile data and update score in background
  useEffect(() => {
    // Only update score if we have meaningful user data and not on initial load
    if (user && userData.firstName && (userData.firstName !== '' || userData.lastName !== '' || userData.phone !== '')) {
      // Debounce the score update to avoid too frequent calls
      const timeoutId = setTimeout(() => {
        updateProfileScore();
      }, 2000); // Wait 2 seconds after last change

      return () => clearTimeout(timeoutId);
    }
  }, [userData.firstName, userData.lastName, userData.phone, phoneVerified, userData.avatar]); // Watch key profile fields

  // Listen for permission updates from other components
  useEffect(() => {
    const handlePermissionUpdate = (event) => {
      console.log('🔄 Received permission update event, refreshing data');
      // Small delay to ensure React context has updated
      setTimeout(() => {
        if (user && user._id && user.linkedClients && user.linkedClients.length > 0) {
          console.log('🔄 Refreshing admin data after permission update');
          fetchCompanyUsers();
          fetchLinkingCodes();
        }
      }, 100);
    };

    window.addEventListener('userPermissionsUpdated', handlePermissionUpdate);
    
    return () => {
      window.removeEventListener('userPermissionsUpdated', handlePermissionUpdate);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    
    // Remove any existing formatting except numbers and spaces
    const cleaned = value.replace(/[^\d\s]/g, '');
    
    // Update userData with just the number part (no area code)
    setUserData((prev) => ({ ...prev, phone: cleaned }));
    
    // If number changed from original, mark as unverified
    const originalNumberOnly = getPhoneNumberOnly();
    if (cleaned !== originalNumberOnly) {
      setPhoneVerified(false);
      setUserData((prev) => ({
        ...prev,
        phone: cleaned,
        phoneVerified: false,
      }));
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserData((prev) => ({ ...prev, logo: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleLogoClick = (e) => {
    if (!isEditing) {
      e.preventDefault(); // Prevent file dialog from opening
      setIsEditing(true);
    }
    // If already editing, allow the file dialog to open naturally
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

const handleSubmit = async () => {
  try {
    // Calculate current profile strength
    const profileStrengthData = calculateUserProfileStrength({
      ...user,
      ...userData,
      phoneVerified
    });

    const updateData = {
      address: userData.address,
      company: userData.companyName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileScore: profileStrengthData.percentage, // Save the calculated score to DB
    };

    if (userData.phone !== originalPhone) {
      if (!phoneVerified) {
        return Swal.fire({
          icon: "warning",
          title: "Phone number not verified",
          text: "Please verify the new phone number before saving.",
        });
      } else {
        updateData.phone = userData.phone;
      }
    }

    let cacheBustedUrl = null;

    if (userData.logo instanceof File) {
      // --- resize the file down to max 800×800 and ~80% quality ---
      let avatarFile = await resizeImage(userData.logo, 800);

      const formData = new FormData();
      formData.append("avatar", avatarFile);

      try {
        const uploadRes = await axiosSecure.post("/users/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const { data } = uploadRes;
        if (data?.success && data?.url) {
          cacheBustedUrl = `${data.url}?t=${Date.now()}`;
          const updatedUser = {
            ...user,
            avatar: cacheBustedUrl,
            company: userData.companyName || user.company,
          };
          setUser(updatedUser);
          localStorage.setItem("authUser", JSON.stringify(updatedUser));
        } else {
          throw new Error(
            data?.message || "Avatar upload response missing expected fields."
          );
        }
      } catch (err) {
        // If the server rejects due to size limit, show a clear message
        if (avatarFile.size > MAX_AVATAR_SIZE) {
          return Swal.fire({
            icon: "error",
            title: "Upload Failed",
            text: "File is too large. Please choose an image smaller than 5 MB.",
          });
        }
        // Otherwise fall back to the generic error
        return Swal.fire({
          icon: "error",
          title: "Upload Failed",
          text:
            err.response?.data?.message ||
            err.message ||
            "Unexpected avatar upload error.",
        });
      }
    }

    const res = await axiosSecure.patch("/users/profile", updateData);
    const result = res.data;

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Profile updated successfully",
        toast: true,
        timer: 2500,
        position: "top-end",
        showConfirmButton: false,
      });

      if (cacheBustedUrl) {
        setUserData((prev) => ({
          ...prev,
          avatar: cacheBustedUrl,
          logo: null,
        }));
        setPreviewUrl(null);
      }

      setIsEditing(false);
      await fetchProfile();
    } else {
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: result.message || "Something went wrong",
      });
    }
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "An unexpected error occurred while updating your profile.",
    });
  }
};

  const testSMSCredentials = async () => {
    try {
      console.log('🔍 Testing SMS credentials...');
      const response = await axiosSecure.get("/users/test-sms-credentials");
      console.log('✅ SMS credentials test result:', response.data);
      
      Swal.fire({
        icon: "info",
        title: "SMS Credentials Test",
        text: "Check browser console and backend logs for details.",
        timer: 3000
      });
    } catch (error) {
      console.error('❌ SMS credentials test failed:', error);
      Swal.fire({
        icon: "error",
        title: "SMS Test Failed",
        text: error.response?.data?.message || "Failed to test SMS credentials"
      });
    }
  };

  const verifyCode = async () => {
    const fullPhoneNumber = getInternationalPhoneNumber();
    
    if (!userData.phone || !fullPhoneNumber) {
      return Swal.fire({
        icon: "warning",
        title: "Missing Phone Number",
        text: "Please enter your phone number before verifying.",
      });
    }

    // Validate phone number format
    if (!isValidPhoneNumber(userData.phone, phoneRegion)) {
      return Swal.fire({
        icon: "warning",
        title: "Invalid Phone Number",
        text: `Please enter a valid ${areaCodes[phoneRegion].name} phone number.`,
      });
    }

    try {
      // Step 1: Send verification code
      const sendResult = await Swal.fire({
        title: "Send Verification Code?",
        html: `<p>We'll send a verification code to <strong>${getDisplayPhoneNumber()}</strong></p>`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Send Code",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          console.log("🔍 Frontend: Sending verification request", {
            phoneNumber: fullPhoneNumber,
            region: phoneRegion
          });
          
          try {
            const response = await axiosSecure.post("/users/send-verification-code", {
              phoneNumber: fullPhoneNumber,
              region: phoneRegion
            });
            
            console.log("✅ Frontend: Verification request successful", response.data);
            return { data: response.data, region: phoneRegion };
          } catch (error) {
            console.error("❌ Frontend: Verification request failed", {
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              headers: error.response?.headers,
              message: error.message
            });
            
            const errorMsg = error.response?.data?.message || "Failed to send verification code";
            throw new Error(errorMsg);
          }
        }
      });

      if (!sendResult.isConfirmed || !sendResult.value) {
        return;
      }

      // Step 2: Get code from user
      const codeResult = await Swal.fire({
        title: "Enter Verification Code",
        html: `
          <p>A 4-digit code was sent to <strong>${getDisplayPhoneNumber()}</strong></p>
          <p style="font-size: 14px; color: #666; margin-top: 8px;">Code expires in 10 minutes</p>
        `,
        input: "text",
        inputPlaceholder: "Enter 4-digit code",
        showCancelButton: true,
        confirmButtonText: "Verify",
        cancelButtonText: "Cancel",
        inputAttributes: {
          maxlength: 4,
          autocapitalize: "off",
          autocorrect: "off",
          pattern: "[0-9]{4}",
          style: "text-align: center; font-size: 18px; letter-spacing: 0.5em;"
        },
        inputValidator: (value) => {
          if (!value || value.length !== 4 || !/^\d{4}$/.test(value)) {
            return "Please enter a valid 4-digit code";
          }
        },
        showLoaderOnConfirm: true,
        preConfirm: async (code) => {
          try {
            const response = await axiosSecure.post("/users/verify-phone-code", {
              code: code,
              phoneNumber: fullPhoneNumber,
              region: phoneRegion
            });
            return response.data;
          } catch (error) {
            const errorMsg = error.response?.data?.message || "Verification failed";
            throw new Error(errorMsg);
          }
        }
      });

      if (codeResult.isConfirmed && codeResult.value) {
        // Update local state
        setUserData((prev) => ({ 
          ...prev, 
          phoneVerified: true,
          phone: codeResult.value.data.phone 
        }));
        setPhoneVerified(true);

        Swal.fire({
          icon: "success",
          title: "Phone Verified!",
          text: "Your phone number has been successfully verified.",
          toast: true,
          timer: 3000,
          position: "top-end",
          showConfirmButton: false,
        });
      }

    } catch (err) {
      console.error("❌ Phone verification error:", err);
      Swal.fire({
        icon: "error",
        title: "Verification Failed",
        text: err.message || "Something went wrong during verification. Please try again.",
      });
    }
  };
  

  const handleEmailNotice = () => {
    Swal.fire({
      icon: "info",
      title: "Email is not editable",
      html: "If you need to change your email,<br>please contact <strong>All Roof Take-offs</strong> directly.",
    });    
  };
  

  return (
    <div className="min-h-screen bg-bgGray">
      {/* ── User Profile Section ── */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mt-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold text-textBlack">User Profile</h2>
          <div className="flex items-center gap-4">
            {/* Profile Strength Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Profile Strength:</span>
              <button
                onClick={() => setShowUserStrengthDetails(!showUserStrengthDetails)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-md ${getStrengthColors(userStrength.strength.color).bg} ${getStrengthColors(userStrength.strength.color).text} ${getStrengthColors(userStrength.strength.color).border}`}
                title="Click to see detailed breakdown"
              >
                {userStrength.strength.icon} {userStrength.percentage}% {userStrength.strength.level}
                <svg className={`w-3 h-3 ml-1 inline transition-transform ${showUserStrengthDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => setIsEditing((prev) => !prev)}
              className="text-primary underline w-fit sm:w-auto text-sm"
            >
              {isEditing ? "Cancel" : "Update Info"}
            </button>
          </div>
        </div>

        {/* User Profile Strength Details */}
        {showUserStrengthDetails && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-3">📊 Profile Completion Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'firstName', label: 'First Name', weight: 20 },
                { key: 'lastName', label: 'Last Name', weight: 20 },
                { key: 'email', label: 'Email', weight: 25 },
                { key: 'phone', label: 'Phone Number', weight: 20 },
                { key: 'phoneVerified', label: 'Phone Verification', weight: 10 },
                { key: 'avatar', label: 'Profile Picture', weight: 5 }
              ].map(field => {
                let isCompleted = false;
                switch (field.key) {
                  case 'firstName':
                  case 'lastName':
                  case 'email':
                  case 'phone':
                    isCompleted = userData[field.key] && userData[field.key].trim().length > 0;
                    break;
                  case 'phoneVerified':
                    isCompleted = userData.phoneVerified === true;
                    break;
                  case 'avatar':
                    // Only count as completed if user has actually uploaded an avatar
                    // Don't count default UI placeholder avatars or empty values
                    isCompleted = userData.avatar && 
                                 userData.avatar.length > 0 && 
                                 !userData.avatar.includes('ui-avatars.com') && // Exclude UI placeholder avatars
                                 !userData.avatar.includes('placeholder') &&   // Exclude any placeholder images
                                 userData.avatar !== 'default-avatar.png';     // Exclude default avatar files
                    break;
                }
                
                return (
                  <div key={field.key} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-white">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{field.weight} pts</span>
                      <span className={`w-4 h-4 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {isCompleted && <span className="text-white text-xs flex items-center justify-center">✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Total Score:</span>
                <span className="text-primary">{userStrength.percentage}/100 points</span>
              </div>
            </div>
          </div>
        )}

        {/* Profile Improvement Suggestions */}
        {userStrength.suggestions.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">💡 Improve Your Profile</h3>
            <p className="text-sm text-yellow-700 mb-3">Complete these fields to strengthen your profile:</p>
            <div className="flex flex-wrap gap-2">
              {userStrength.suggestions.map((suggestion, index) => (
                <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-300">
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        )}

        

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center gap-4 md:w-1/3 w-full">
            <div
              className={`w-64 h-64 rounded-full overflow-hidden flex items-center justify-center
              ${isEditing ? "border-4 border-blue-500" : "border-4 border-gray-300"}`}
            >
              <Avatar
                name={userData.companyName}
                avatarUrl={previewUrl || userData.avatar}
                size="xxl"
              />
            </div>

            <label
              htmlFor="logo-upload"
              onClick={handleLogoClick}
              className={`px-5 py-2 rounded-md text-white text-sm cursor-pointer transition 
                ${isEditing ? "bg-primary hover:bg-primary/90" : "bg-primary hover:bg-primary/90"}`}
            >
              {isEditing ? "Choose File" : "Update Profile"}
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={!isEditing}
                className="hidden"
              />
            </label>
            {userData.logo && (
              <p className="text-sm text-textGray mt-1">{userData.logo.name}</p>
            )}
          </div>

          <div className="md:w-2/3 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Row: First + Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                name="firstName"
                value={userData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={userData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={!isEditing}
              />
            </div>

            {/* Second Row: Email full-width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onClick={handleEmailNotice}
                readOnly
                className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 ${
                  isEditing ? "cursor-not-allowed" : "cursor-default"
                }`}
              />
            </div>

            {/* Third Row: Phone with area code selector */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="flex items-center gap-2 w-full">
                {/* Area Code Selector - only show when editing */}
                {isEditing && (
                  <select
                    value={phoneRegion}
                    onChange={(e) => setPhoneRegion(e.target.value)}
                    disabled={!isEditing}
                    className="flex-shrink-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="AU">{areaCodes.AU.flag} {areaCodes.AU.code}</option>
                    <option value="US">{areaCodes.US.flag} {areaCodes.US.code}</option>
                    <option value="NO">{areaCodes.NO.flag} {areaCodes.NO.code}</option>
                    <option value="IN">{areaCodes.IN.flag} {areaCodes.IN.code}</option>
                  </select>
                )}
                
                {/* Phone Number Input */}
                <input
                  type="tel"
                  name="phone"
                  value={isEditing ? getPhoneNumberOnly() : getDisplayPhoneNumber()}
                  onChange={handlePhoneChange}
                  placeholder={areaCodes[phoneRegion].placeholder}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0"
                  disabled={!isEditing}
                />
                
                {/* Verification Button/Status */}
                {userData.phoneVerified ? (
                  <span className="px-4 py-2 bg-yellow-400 text-black rounded-md text-sm hover:bg-primary/90 shrink-0">
                    Verified
                  </span>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={testSMSCredentials}
                      className="bg-gray-500 text-white px-3 py-2 rounded-md text-xs hover:bg-gray-600"
                      title="Test SMS Setup"
                    >
                      Test
                    </button>
                    <button
                      onClick={verifyCode}
                      className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary/90"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-8 text-right">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
      
      {/* ── Company Details Section ── */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mt-8 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Company Details</h2>
          <div className="flex items-center gap-4">
            {/* Company Strength Button */}
            {user?.linkedClients && user.linkedClients.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Company Strength:</span>
                <button
                  onClick={() => setShowCompanyStrengthDetails(!showCompanyStrengthDetails)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-md ${
                    companyStrength.percentage >= 150 ? 'bg-green-100 text-green-800 border-green-300' :
                    companyStrength.percentage >= 120 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    companyStrength.percentage >= 75 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  }`}
                  title="Click to see detailed breakdown"
                >
                  {companyStrength.percentage >= 150 ? '💚' :
                   companyStrength.percentage >= 120 ? '💙' :
                   companyStrength.percentage >= 75 ? '💛' :
                   '❤️'} {Math.round((companyStrength.percentage / 150) * 100)}% {
                    companyStrength.percentage >= 150 ? 'Complete' :
                    companyStrength.percentage >= 120 ? 'Trusted' :
                    companyStrength.percentage >= 75 ? 'Workable' :
                    'Incomplete'}
                  <svg className={`w-3 h-3 ml-1 inline transition-transform ${showCompanyStrengthDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
            {hasAdminAccess && (
              <button
                type="button"
                onClick={() => navigate('/company-profile?edit=true')}
                className="text-primary underline text-sm hover:text-blue-800"
              >
                Update Info
              </button>
            )}
          </div>
        </div>

        {/* Company Profile Strength Details */}
        {showCompanyStrengthDetails && user?.linkedClients && user.linkedClients.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-medium text-gray-800 mb-3">🏢 Company Completion Breakdown (150 Points Max)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: 'mainContact.email', label: 'Contact Email', weight: 30 },
                { key: 'mainContact.name', label: 'Contact Name', weight: 25 },
                { key: 'name', label: 'Company Name', weight: 20 },
                { key: 'legalName', label: 'Legal Entity Name', weight: 20 },
                { key: 'abn', label: 'ABN', weight: 20 },
                { key: 'billingAddress', label: 'Billing Address', weight: 15 },
                { key: 'logoUrl', label: 'Company Logo', weight: 15 },
                { key: 'mainContact.phone', label: 'Contact Phone', weight: 10 }
              ].map(field => {
                let isCompleted = false;
                
                if (field.key.includes('.')) {
                  const keys = field.key.split('.');
                  let value = companyData;
                  for (const key of keys) {
                    value = value?.[key];
                  }
                  isCompleted = value && value.toString().trim().length > 0;
                } else {
                  switch (field.key) {
                    case 'logoUrl':
                      isCompleted = companyData.logoUrl && companyData.logoUrl.length > 0;
                      break;
                    case 'billingAddress':
                      isCompleted = companyData.billingAddress && (
                        (companyData.billingAddress.line1 && companyData.billingAddress.line1.trim().length > 0) ||
                        (companyData.billingAddress.streetNumber && companyData.billingAddress.streetNumber.trim().length > 0) ||
                        (companyData.billingAddress.full_address && companyData.billingAddress.full_address.trim().length > 0)
                      ) && 
                      companyData.billingAddress.city && companyData.billingAddress.city.trim().length > 0 &&
                      companyData.billingAddress.state && companyData.billingAddress.state.trim().length > 0 &&
                      companyData.billingAddress.postalCode && companyData.billingAddress.postalCode.trim().length > 0;
                      break;
                    default:
                      isCompleted = companyData[field.key] && companyData[field.key].toString().trim().length > 0;
                  }
                }
                
                return (
                  <div key={field.key} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-white">
                    <span className="text-sm text-gray-700">{field.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{field.weight} pts</span>
                      <span className={`w-4 h-4 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {isCompleted && <span className="text-white text-xs flex items-center justify-center">✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <div className="flex justify-between items-center text-sm font-medium">
                <span>Total Score:</span>
                <span className="text-primary">{companyStrength.percentage}/150 points</span>
              </div>
            </div>
          </div>
        )}

        {/* Company Profile Improvement Suggestions */}
        {companyStrength.suggestions && companyStrength.suggestions.length > 0 && user?.linkedClients && user.linkedClients.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">💡 Improve Your Company Profile</h3>
            <p className="text-sm text-yellow-700 mb-3">Complete these fields to strengthen your company profile:</p>
            <div className="flex flex-wrap gap-2">
              {companyStrength.suggestions.map((suggestion, index) => (
                <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-300">
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {companyLoading ? (
          <div className="animate-pulse">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : user?.linkedClients && user.linkedClients.length > 0 ? (
          <div className="space-y-6">
            {/* Company Name with Logo */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                <Avatar
                  name={companyData.name}
                  avatarUrl={companyData.logoUrl || null}
                  size="lg"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {companyData.name || "Company Name Not Set"}
                </h3>
                {companyData.tradingName && (
                  <p className="text-sm text-gray-600">
                    Trading as: {companyData.tradingName}
                  </p>
                )}
              </div>
            </div>

            {/* Primary Contact Information */}
            <div>
              <h4 className="text-md font-medium text-gray-700 mb-3">Primary Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Contact Name
                  </label>
                  <p className="text-gray-900">
                    {companyData.mainContact?.name || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Contact Phone
                  </label>
                  <p className="text-gray-900">
                    {companyData.mainContact?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You're not currently linked to any company.</p>
            <button
              onClick={() => navigate('/company-profile')}
              className="text-primary underline hover:text-blue-800"
            >
              Set up your company profile
            </button>
          </div>
        )}
      </div>

      {/* ── Company Admin Panel ── */}
      {hasAdminAccess && (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mt-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Company Admin Panel</h2>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Invite User
            </button>
          </div>

          {/* Linking Codes Section - Always Visible */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Company Linking Codes</h3>
            {codesLoading ? (
              <div className="animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Linking Code */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-600 mb-2">User Linking Code</label>
                  <div className="inline-flex items-center gap-1">
                    <span
                      className="font-mono text-md cursor-pointer text-blue-600 border border-blue-600 rounded px-2 h-[24px] w-[95px] flex items-center justify-center"
                      onClick={() => copyToClipboard(linkingCodes.userLinkingCode, 'User')}
                      title="Click to copy"
                    >
                      {linkingCodes.userLinkingCode}
                    </span>
                    <button
                      onClick={() => regenerateCode('user')}
                      className="text-blue-600 border border-blue-600 rounded h-[24px] w-[24px] flex items-center justify-center hover:bg-blue-50 transition-colors"
                      title="Regenerate code"
                    >
                      <IconSync size={14} className="text-blue-600" />
                    </button>
                  </div>
                </div>

                {/* Admin Linking Code */}
                <div className="text-center">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Admin Linking Code</label>
                  <div className="inline-flex items-center gap-1">
                    <span
                      className="font-mono text-md cursor-pointer text-blue-600 border border-blue-600 rounded px-2 h-[24px] w-[95px] flex items-center justify-center"
                      onClick={() => copyToClipboard(linkingCodes.adminLinkingCode, 'Admin')}
                      title="Click to copy"
                    >
                      {linkingCodes.adminLinkingCode}
                    </span>
                    <button
                      onClick={() => regenerateCode('admin')}
                      className="text-blue-600 border border-blue-600 rounded h-[24px] w-[24px] flex items-center justify-center hover:bg-blue-50 transition-colors"
                      title="Regenerate code"
                    >
                      <IconSync size={14} className="text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {usersLoading ? (
            <div className="animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Company Administrators */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Company Administrators</h3>
                <div className="space-y-2">
                  {companyAdmins.map((admin) => (
                    <div key={admin._id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${admin.firstName} ${admin.lastName}`}
                          avatarUrl={admin.avatar}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.firstName} {admin.lastName}
                            {admin._id === user._id && " (You)"}
                          </p>
                          <p className="text-sm text-gray-600">{admin.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                          Admin
                        </span>
                        {companyAdmins.length > 1 && (
                          <button
                            onClick={() => demoteToUser(admin._id)}
                            className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                          >
                            Demote
                          </button>
                        )}
                        <button
                          onClick={() => removeUser(admin._id, true)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Company Users */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Company Users</h3>
                <div className="space-y-2">
                  {companyUsers.filter(u => !companyAdmins.find(admin => admin._id === u._id)).map((companyUser) => (
                    <div key={companyUser._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${companyUser.firstName} ${companyUser.lastName}`}
                          avatarUrl={companyUser.avatar}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {companyUser.firstName} {companyUser.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{companyUser.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full">
                          User
                        </span>
                        <button
                          onClick={() => promoteToAdmin(companyUser._id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => removeUser(companyUser._id, false)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {companyUsers.filter(u => !companyAdmins.find(admin => admin._id === u._id)).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No regular users in this company</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => {
            setShowInviteModal(false);
            fetchCompanyUsers(); // Refresh users after invite
          }}
        />
      )}
    </div>
  );
};

export default Profile;
