import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "../shared/Avatar";
import { resizeImage } from "@/utils/imageHelpers";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import InviteUserModal from "../components/InviteUserModal";
import { IconSync } from "../shared/IconSet";

const BASE_URL = import.meta.env.VITE_STATIC_BASE_URL;

const Profile = () => {
  const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1 MB
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const { user, setUser, refreshUser } = useContext(AuthContext);
  const isAdmin = user?.role === "Admin";
  const [isEditing, setIsEditing] = useState(false);

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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const isEditingPhone = isEditing && userData.phone !== originalPhone;
  
  // Company data state
  const [companyData, setCompanyData] = useState({
    name: "",
    tradingName: "",
    logoUrl: "",
    mainContact: {
      name: "",
      phone: ""
    }
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  
  // Company admin panel state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [companyAdmins, setCompanyAdmins] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Linking codes state
  const [linkingCodes, setLinkingCodes] = useState({
    userLinkingCode: "",
    adminLinkingCode: ""
  });
  const [codesLoading, setCodesLoading] = useState(false);


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
        tradingName: data.tradingName || "",
        logoUrl: data.logoUrl ? `${BASE_URL}${data.logoUrl}?t=${Date.now()}` : "",
        mainContact: {
          name: data.mainContact?.name || "",
          phone: data.mainContact?.phone || ""
        }
      });
    } catch (err) {
      console.error("Error fetching company data:", err);
      setCompanyData({
        name: "",
        tradingName: "",
        logoUrl: "",
        mainContact: { name: "", phone: "" }
      });
    } finally {
      setCompanyLoading(false);
    }
  };

  // Fetch company users and admins
  const fetchCompanyUsers = async () => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId || !user?.companyAdmin) {
      return;
    }
    
    setUsersLoading(true);
    try {
      // Use the new client-based API to get company users
      const response = await axiosSecure.get(`/clients/${clientId}/users`);
      
      if (response.data.success) {
        setCompanyUsers(response.data.data.companyUsers || []);
        setCompanyAdmins(response.data.data.admins || []);
      }
    } catch (err) {
      console.error("Error fetching company users:", err);
      setCompanyUsers([]);
      setCompanyAdmins([]);
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
          console.log("🔄 User role changed, they may need to refresh to see new permissions");
          
          // If the promoted user is the current user, refresh their context immediately
          if (response.data.targetUserId === user._id) {
            console.log("🔄 Current user was promoted, refreshing user context...");
            await refreshUser();
            Swal.fire({
              icon: "success",
              title: "Role Updated",
              text: "You now have admin privileges!",
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
              toast: true
            });
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
          console.log("🔄 User role changed, they may need to refresh to see updated permissions");
          
          // If the demoted user is the current user, refresh their context immediately
          if (response.data.targetUserId === user._id) {
            console.log("🔄 Current user was demoted, refreshing user context...");
            await refreshUser();
            Swal.fire({
              icon: "info",
              title: "Role Updated",
              text: "Your admin privileges have been removed.",
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
              toast: true
            });
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
    if (!clientId || !user?.companyAdmin) return;
    
    setCodesLoading(true);
    try {
      const response = await axiosSecure.get(`/clients/${clientId}/linking-codes`);
      if (response.data.success) {
        setLinkingCodes({
          userLinkingCode: response.data.data.userLinkingCode,
          adminLinkingCode: response.data.data.adminLinkingCode
        });
      }
    } catch (err) {
      console.error("Error fetching linking codes:", err);
      Swal.fire("Error", "Failed to fetch linking codes.", "error");
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
        setUserData((prev) => ({
          ...prev,
          companyName: data.data.company || "",
          email: data.data.email || "",
          firstName: data.data.firstName || "",
          lastName: data.data.lastName || "",
          phone: data.data.phone || "",
          address: data.data.address || {},
          avatar: `${data.data.avatar}?t=${Date.now()}`,
          phoneVerified: data.data.phoneVerified || false,
        }));

        setUser((prev) => ({
          ...prev,
          ...(data.data.avatar && { avatar: `${data.data.avatar}?t=${Date.now()}` }),
          ...(data.data.company && { company: data.data.company }),
        }));

        setPhoneVerified(data.data.phoneVerified || false);
        setOriginalPhone(data.data.phone || "");
      }
    } catch (error) {
      console.error("❌ Error fetching profile:", error);
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

  // Watch for changes in admin status and clear admin data if needed
  useEffect(() => {
    if (!user?.companyAdmin) {
      // Clear admin-specific data when user loses admin privileges
      setCompanyUsers([]);
      setCompanyAdmins([]);
      setLinkingCodes({ userLinkingCode: "", adminLinkingCode: "" });
      setUsersLoading(false);
      setCodesLoading(false);
    } else {
      // Fetch admin data when user gains admin privileges
      fetchCompanyUsers();
      fetchLinkingCodes();
    }
  }, [user?.companyAdmin]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    
    // Remove any existing formatting except numbers and +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Try to format the phone number for display
    let formattedValue = cleaned;
    try {
      const phoneNumber = parsePhoneNumberFromString(cleaned, 'AU');
      if (phoneNumber && phoneNumber.isValid()) {
        formattedValue = phoneNumber.formatNational();
      }
    } catch (error) {
      // If formatting fails, use cleaned value
      console.log('Phone formatting error:', error);
    }
    
    // Only update if it contains valid phone characters
    if (/^\+?[0-9\s\(\)\-]*$/.test(formattedValue)) {
      setUserData((prev) => ({ ...prev, phone: formattedValue }));
      if (formattedValue !== originalPhone) {
        setPhoneVerified(false);
        setUserData((prev) => ({
          ...prev,
          phone: formattedValue,
          phoneVerified: false,
        }));
      }
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserData((prev) => ({ ...prev, logo: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
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
    const updateData = {
      address: userData.address,
      company: userData.companyName,
      firstName: userData.firstName,
      lastName: userData.lastName,
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

  const verifyCode = async () => {
    if (!userData.phone) {
      return Swal.fire({
        icon: "warning",
        title: "Missing Phone Number",
        text: "Please enter your phone number before verifying.",
      });
    }
  
    // 📨 Simulated SMS send (log it)
    console.log(`📨 Simulating SMS to ${userData.phone} with code: 0000`);
  
    const result = await Swal.fire({
      title: "Enter Verification Code",
      input: "text",
      inputLabel: "A 4-digit code was sent to your phone",
      inputPlaceholder: "Enter code",
      showCancelButton: true,
      inputAttributes: {
        maxlength: 4,
        autocapitalize: "off",
        autocorrect: "off",
      },
    });
  
    if (result.isConfirmed && result.value === "0000") {
      setUserData((prev) => ({ ...prev, phoneVerified: true }));
      setPhoneVerified(true);
  
      try {
        await axiosSecure.patch("/users/profile", { phoneVerified: true });
      } catch (err) {
        console.error("❌ Failed to update phoneVerified in DB:", err.message);
      }
  
      Swal.fire({
        icon: "success",
        title: "Phone Verified",
        toast: true,
        timer: 2000,
        position: "top-end",
        showConfirmButton: false,
      });
    } else if (result.isConfirmed) {
      Swal.fire({
        icon: "error",
        title: "Incorrect Code",
        text: "The code you entered is incorrect.",
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
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="text-primary underline w-fit sm:w-auto text-sm"
          >
            {isEditing ? "Cancel" : "Update Info"}
          </button>
        </div>

        

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
              className={`px-5 py-2 rounded-md text-white text-sm cursor-pointer transition 
                ${isEditing ? "bg-primary hover:bg-primary/90" : "bg-gray-400 cursor-not-allowed"}`}
            >
              Choose File
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

            {/* Third Row: Phone full-width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="flex items-center gap-2 w-full">
                <input
                  type="tel"
                  name="phone"
                  value={userData.phone}
                  onChange={handlePhoneChange}
                  placeholder="e.g., 0412 345 678"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0"
                  disabled={!isEditing}
                />
                {userData.phoneVerified ? (
                  <span className="px-4 py-2 bg-yellow-400 text-black rounded-md text-sm hover:bg-primary/90 shrink-0">
                    Verified
                  </span>
                ) : (
                  <button
                    onClick={verifyCode}
                    className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary/90 shrink-0"
                  >
                    Verify
                  </button>
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
          {user?.companyAdmin && (
            <button
              type="button"
              onClick={() => navigate('/company-profile?edit=true')}
              className="text-primary underline text-sm hover:text-blue-800"
            >
              Update Info
            </button>
          )}
        </div>
        
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
      {user?.companyAdmin && (
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
