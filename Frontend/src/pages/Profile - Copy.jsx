import React, { useState, useEffect, useContext } from "react";
import AddressInput from "../Components/AddressInput";
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import Avatar from "@/shared/Avatar";
import { resizeImage } from "@/utils/imageHelpers";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Profile = () => {
  const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 5 MB
  const axiosSecure = useAxiosSecure();
  const { user, setUser } = useContext(AuthContext);
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
    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\s+/g, "");
    if (/^\+?[0-9]*$/.test(value)) {
      setUserData((prev) => ({ ...prev, phone: value }));
      if (value !== originalPhone) {
        setPhoneVerified(false);
        setUserData((prev) => ({
          ...prev,
          phone: value,
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
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-textBlack">My Profile</h1>
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
              className={`px-5 py-2 rounded text-white text-sm cursor-pointer transition 
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
              <label className="block mb-1 text-textGray">First Name</label>
              <input
                type="text"
                name="firstName"
                value={userData.firstName}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
                disabled={!isEditing}
              />
            </div>

            <div>
              <label className="block mb-1 text-textGray">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={userData.lastName}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
                disabled={!isEditing}
              />
            </div>

            {/* Second Row: Email full-width */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-textGray">Email</label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onClick={handleEmailNotice}
                readOnly
                className={`w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 ${
                  isEditing ? "cursor-not-allowed" : "cursor-default"
                }`}
              />
            </div>

            {/* Third Row: Phone full-width */}
            <div className="md:col-span-2">
              <label className="block mb-1 text-textGray">Phone</label>
              <div className="flex items-center gap-2 w-full">
                <input
                  type="tel"
                  name="phone"
                  value={userData.phone}
                  onChange={handlePhoneChange}
                  className="flex-grow border border-gray-300 rounded px-3 py-2 min-w-0"
                  disabled={!isEditing}
                />
                {userData.phoneVerified ? (
                  <span className="px-4 py-2 bg-yellow-400 text-black rounded text-sm hover:bg-primary/90 shrink-0">
                    Verified
                  </span>
                ) : (
                  <button
                    onClick={verifyCode}
                    className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary/90 shrink-0"
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
              className="bg-primary text-white px-6 py-2 rounded"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
