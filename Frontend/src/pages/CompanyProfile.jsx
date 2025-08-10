// src/pages/CompanyProfile.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import Avatar from "../shared/Avatar";
import { resizeImage } from "@/utils/imageHelpers";
import CompanyDetails from '../components/CompanyDetails';

const BASE_URL = import.meta.env.VITE_STATIC_BASE_URL;

export default function CompanyProfile() {
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
  const axiosSecure = useAxiosSecure();
  const { user, setUser } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const [isEditingImages, setIsEditingImages] = useState(false);

  // Check if we're in "new company" mode
  const isNewMode = searchParams.get('mode') === 'new';

  // Helper function to get client ID from user's linkedClients
  const getClientId = () => {
    const clientId = user?.linkedClients?.[0];
    if (!clientId) {
      console.error("❌ No client ID found in user.linkedClients");
      return null;
    }
    return clientId;
  };

  const [imageData, setImageData] = useState({
    companyName: "",
    logo: null,
    headerImage: null,
    footerImage: null,
    logoUrl: "",
    headerImageUrl: "",
    footerImageUrl: "",
    headerRatio: "2:1", // Default ratio
    headerFit: false, // Default fit setting
  });

  const [headerRatio, setHeaderRatio] = useState("2:1");
  const [headerFit, setHeaderFit] = useState(false); // New state for fit option
  const [footerPlacement, setFooterPlacement] = useState("full");
  const [hasPreviewChanges, setHasPreviewChanges] = useState(false); // Track if user made preview changes
  
  // Wrapper functions to track preview changes
  const handleHeaderRatioChange = (ratio) => {
    setHeaderRatio(ratio);
    if (!isEditingImages) {
      setHasPreviewChanges(true);
    }
  };
  
  const handleHeaderFitChange = (fit) => {
    setHeaderFit(fit);
    if (!isEditingImages) {
      setHasPreviewChanges(true);
    }
  };
  
  const handleFooterPlacementChange = (placement) => {
    setFooterPlacement(placement);
    if (!isEditingImages) {
      setHasPreviewChanges(true);
    }
  };

  const [previewUrls, setPreviewUrls] = useState({
    logo: null,
    headerImage: null,
    footerImage: null,
  });

  const fetchCompanyImages = async () => {
    try {
      const clientId = getClientId();
      if (!clientId) return;
      
      const res = await axiosSecure.get(`/clients/${clientId}`);
      const data = res.data;
      if (data.success && data.client) {
        const savedRatio = data.client.headerRatio || "2:1";
        const savedFit = data.client.headerFit || false;
        const savedPlacement = data.client.footerPlacement || "full";
        setImageData((prev) => ({
          ...prev,
          companyName: data.client.name || "",
          logoUrl: data.client.logoUrl ? `${BASE_URL}${data.client.logoUrl}?t=${Date.now()}` : "",
          headerImageUrl: data.client.headerImageUrl ? `${BASE_URL}${data.client.headerImageUrl}?t=${Date.now()}` : "",
          footerImageUrl: data.client.footerImageUrl ? `${BASE_URL}${data.client.footerImageUrl}?t=${Date.now()}` : "",
          headerRatio: savedRatio,
          headerFit: savedFit,
          footerPlacement: savedPlacement,
        }));
        setHeaderRatio(savedRatio);
        setHeaderFit(savedFit);
        setFooterPlacement(savedPlacement);
      }
    } catch (error) {
      console.error("Error fetching company images:", error);
    }
  };

  useEffect(() => {
    if (user?.company) {
      fetchCompanyImages();
    }
  }, [user?.company]);

  const handleImageUpload = (imageType) => (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        Swal.fire({
          icon: "error",
          title: "File too large",
          text: "Please choose an image smaller than 5 MB.",
        });
        return;
      }
      
      setImageData((prev) => ({ ...prev, [imageType]: file }));
      setPreviewUrls((prev) => ({ 
        ...prev, 
        [imageType]: URL.createObjectURL(file) 
      }));
    }
  };

  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  const handleSubmitImages = async () => {
    try {
      const clientId = getClientId();
      if (!clientId) return;
      
      const uploadPromises = [];
      
      // Upload company logo
      if (imageData.logo instanceof File) {
        const resizedLogo = await resizeImage(imageData.logo, 800);
        const logoFormData = new FormData();
        logoFormData.append("logo", resizedLogo);
        uploadPromises.push(
          axiosSecure.post(`/clients/${clientId}/logo`, logoFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        );
      }

      // Upload header image
      if (imageData.headerImage instanceof File) {
        const resizedHeader = await resizeImage(imageData.headerImage, 1200);
        const headerFormData = new FormData();
        headerFormData.append("headerImage", resizedHeader);
        headerFormData.append("headerRatio", headerRatio);
        uploadPromises.push(
          axiosSecure.post(`/clients/${clientId}/header-image`, headerFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        );
      }

      // Upload footer image
      if (imageData.footerImage instanceof File) {
        const resizedFooter = await resizeImage(imageData.footerImage, 1200);
        const footerFormData = new FormData();
        footerFormData.append("footerImage", resizedFooter);
        footerFormData.append("footerPlacement", footerPlacement);
        uploadPromises.push(
          axiosSecure.post(`/clients/${clientId}/footer-image`, footerFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        );
      }

      // Save header ratio preference even if no new image is uploaded
      if (headerRatio !== imageData.headerRatio) {
        uploadPromises.push(
          axiosSecure.patch(`/clients/${clientId}/header-ratio`, { headerRatio })
        );
      }

      // Save header fit preference even if no new image is uploaded
      if (headerFit !== imageData.headerFit) {
        uploadPromises.push(
          axiosSecure.patch(`/clients/${clientId}/header-fit`, { headerFit })
        );
      }

      // Save footer placement preference even if no new image is uploaded
      if (footerPlacement !== imageData.footerPlacement) {
        uploadPromises.push(
          axiosSecure.patch(`/clients/${clientId}/footer-placement`, { footerPlacement })
        );
      }

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
        
        Swal.fire({
          icon: "success",
          title: "Images updated successfully",
          toast: true,
          timer: 2500,
          position: "top-end",
          showConfirmButton: false,
        });

        // Reset form and preview states
        setImageData((prev) => ({
          ...prev,
          logo: null,
          headerImage: null,
          footerImage: null,
        }));
        setPreviewUrls({
          logo: null,
          headerImage: null,
          footerImage: null,
        });
        
        setIsEditingImages(false);
        setHasPreviewChanges(false); // Reset preview changes after save
        await fetchCompanyImages();
      } else {
        Swal.fire({
          icon: "info",
          title: "No changes to save",
          text: "Please select at least one image to upload.",
        });
      }
    } catch (err) {
      console.error("Error uploading images:", err);
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text: err.response?.data?.message || "An error occurred while uploading images.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-bgGray">
      {/* ── Company Images Section ── */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mt-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6">
          <h2 className="text-xl font-semibold text-textBlack">Company Images</h2>
          <button
            onClick={() => {
              setIsEditingImages((prev) => !prev);
              setHasPreviewChanges(false); // Reset preview changes when toggling edit mode
            }}
            className="text-primary underline w-fit sm:w-auto text-sm"
          >
            {isEditingImages ? "Cancel" : "Update Images"}
          </button>
        </div>

        {/* 5x5 Grid Layout - Perfect Square Cells */}
        <div className="grid grid-cols-5 grid-rows-5 gap-4 mb-8 aspect-square max-w-2xl mx-auto">
          {/* Header Image - Takes 2x2 (top-left) */}
          <div className="col-span-2 row-span-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-textBlack">Header Image</h3>
              {/* Ratio Selector and Fit Toggle */}
              <div className="flex gap-1 items-center">
                <button
                  onClick={() => handleHeaderRatioChange("2:1")}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    headerRatio === "2:1" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  2:1
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => handleHeaderRatioChange("3:1")}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    headerRatio === "3:1" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  3:1
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
                <span className="text-gray-400 mx-1">|</span>
                <button
                  onClick={() => handleHeaderFitChange(!headerFit)}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    headerFit 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  Fit
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
            
            <div
              className={`flex-1 rounded-lg overflow-hidden flex items-center justify-center bg-gray-100
              ${headerRatio === "2:1" ? "max-h-[100px] max-w-[200px]" : "max-h-[100px] max-w-[300px]"}
              ${isEditingImages ? "border-4 border-blue-500" : "border-4 border-gray-300"}`}
            >
              {(previewUrls.headerImage || imageData.headerImageUrl) ? (
                <img
                  src={previewUrls.headerImage || imageData.headerImageUrl}
                  alt="Header"
                  className={`w-full h-full ${headerFit ? 'object-contain' : 'object-cover'} ${
                    headerRatio === "2:1" ? "aspect-[2/1]" : "aspect-[3/1]"
                  }`}
                />
              ) : (
                <div className="text-gray-400 text-center p-2">
                  <div className="text-lg mb-1">📄</div>
                  <div className="text-xs">Header Image</div>
                  <div className="text-xs text-primary">{headerRatio}</div>
                </div>
              )}
            </div>
            <label
              htmlFor="header-upload"
              className={`px-2 py-1 rounded-md text-white text-xs cursor-pointer transition w-fit self-start
                ${isEditingImages ? "bg-primary hover:bg-primary/90" : "bg-gray-400 cursor-not-allowed"}`}
            >
              Choose Header
              <input
                id="header-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload('headerImage')}
                disabled={!isEditingImages}
                className="hidden"
              />
            </label>
            {imageData.headerImage && (
              <p className="text-xs text-textGray text-left break-words">{imageData.headerImage.name}</p>
            )}
            <div className="col-span-2 row-start-3 flex flex-col justify-center gap-3 p-2 h-[90px]">
              <div className="h-5 bg-gray-300 rounded"></div>
              <div className="h-5 bg-gray-300 rounded"></div>
            </div>
          </div>

          {/* Company Logo - Takes 2x2 (top-right, columns 3-4) */}
          <div className="col-span-2 col-start-3 row-span-2 flex flex-col items-center gap-2">
            <h3 className="text-sm font-medium text-textBlack">Company Logo</h3>
            <div
              className={`flex-1 aspect-square rounded-full overflow-hidden flex items-center justify-center max-w-full
              ${isEditingImages ? "border-4 border-blue-500" : "border-4 border-gray-300"}`}
            >
              <Avatar
                name={imageData.companyName}
                avatarUrl={previewUrls.logo || imageData.logoUrl}
                size="responsive"
              />
            </div>
            <label
              htmlFor="logo-upload"
              className={`px-2 py-1 rounded-md text-white text-xs cursor-pointer transition w-fit
                ${isEditingImages ? "bg-primary hover:bg-primary/90" : "bg-gray-400 cursor-not-allowed"}`}
            >
              Choose Logo
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload('logo')}
                disabled={!isEditingImages}
                className="hidden"
              />
            </label>
            {imageData.logo && (
              <p className="text-xs text-textGray text-center break-words">{imageData.logo.name}</p>
            )}
          </div>

          {/* Document Content Row 3 - 3 boxes, each 2 cells wide */}
          <div className="col-span-3 row-start-3 flex flex-col justify-around gap-1 p-2">
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
          </div>
          <div className="col-span-1 col-start-5 row-start-3 flex flex-col justify-center gap-1 p-2">
            {/* Empty cell for spacing */}
          </div>

          {/* Document Content Row 4 - 3 boxes, each 3 cells wide */}
          <div className="col-span-4 row-start-4 flex flex-col justify-around gap-1 p-2">
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
            <div className="h-5 bg-gray-300 rounded"></div>
          </div>

          {/* Footer Banner - Takes 4x1 (bottom, spans columns 1-4) */}
          <div className="col-span-4 row-start-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-textBlack">Footer Banner</h3>
              {/* Placement Selector */}
              <div className="flex gap-1">
                <button
                  onClick={() => handleFooterPlacementChange("full")}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    footerPlacement === "full" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  Full (6:1)
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => handleFooterPlacementChange("left")}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    footerPlacement === "left" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  Left
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => handleFooterPlacementChange("center")}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    footerPlacement === "center" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  Center
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
                <button
                  onClick={() => handleFooterPlacementChange("right")}
                  title={!isEditingImages && hasPreviewChanges ? "Preview only - click 'Update Images' to save changes" : ""}
                  className={`px-2 py-1 text-xs rounded transition relative ${
                    footerPlacement === "right" 
                      ? "bg-primary text-white" 
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  } ${!isEditingImages && hasPreviewChanges ? "ring-1 ring-orange-300" : ""}`}
                >
                  Right
                  {!isEditingImages && hasPreviewChanges && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
            <div
              className={`flex-1 rounded-lg overflow-hidden bg-gray-100 flex w-[540px] h-[90px]
              ${footerPlacement === "full" ? "justify-center" : 
                footerPlacement === "left" ? "justify-start" :
                footerPlacement === "center" ? "justify-center" : "justify-end"}
              items-center
              ${isEditingImages ? "border-4 border-blue-500" : "border-4 border-gray-300"}`}
            >
              {(previewUrls.footerImage || imageData.footerImageUrl) ? (
                <div className={`h-full flex items-center justify-center
                  ${footerPlacement === "full" ? "w-full" :
                    footerPlacement === "left" ? "w-1/2 justify-start" :
                    footerPlacement === "center" ? "w-2/3" : "w-1/2 justify-end"}`}
                >
                  <img
                    src={previewUrls.footerImage || imageData.footerImageUrl}
                    alt="Footer Banner"
                    className={`h-full object-cover
                      ${footerPlacement === "full" ? "w-full" : "max-w-full"}`}
                  />
                </div>
              ) : (
                <div className="text-gray-400 text-center p-2">
                  <div className="text-lg mb-1">🏷️</div>
                  <div className="text-xs">Footer Banner</div>
                  <div className="text-xs text-primary capitalize">{footerPlacement}</div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Button - Takes 1x1 (bottom-right, position 5:5) */}
          <div className="col-start-5 row-start-5 flex flex-col items-center justify-center gap-1">
            <label
              htmlFor="footer-upload"
              className={`px-2 py-1 rounded-md text-white text-xs cursor-pointer transition
                ${isEditingImages ? "bg-primary hover:bg-primary/90" : "bg-gray-400 cursor-not-allowed"}`}
            >
              Upload Banner
              <input
                id="footer-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload('footerImage')}
                disabled={!isEditingImages}
                className="hidden"
              />
            </label>
            {imageData.footerImage && (
              <p className="text-xs text-textGray text-center break-words max-w-full">{imageData.footerImage.name}</p>
            )}
          </div>
        </div>

        {isEditingImages && (
          <div className="mt-8 text-right">
            <button
              onClick={handleSubmitImages}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Save Images
            </button>
          </div>
        )}
      </div>
      
      {/* ── Company Details Section ── */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 mt-8">
        <CompanyDetails isNewMode={isNewMode} />
      </div>
    </div>
  );
}
