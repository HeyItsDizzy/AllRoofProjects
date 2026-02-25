// UploadButton.jsx
import React from "react";
import { useUploadManager } from "../hooks/useUploadManager";
import Swal from '../../shared/swalConfig';

const UploadButton = ({
  projectId,
  selectedPath,
  axiosSecure,
  existingFileNames = [],
  setFiles,
  setGhostFilesByPath,
  ghostFilesByPath = {},           // ✅ ADD THIS LINE
  liveFiles = [],                  // ✅ ADD THIS LINE
  uploadEnabled = true,
  buttonId = `upload-${selectedPath.replace(/\W+/g, "_")}-${uploadEnabled ? "active" : "inactive"}`,
  positionClass = "",
  isOnHold = false, // NEW: Account hold status
}) => {
const currentLabel = selectedPath === "." ? "Project Root" : selectedPath?.split("/").pop();

const { uploadFiles } = useUploadManager({
  projectId,
  selectedPath,
  axios: axiosSecure,
  setFiles,
  setGhostFilesByPath,
  existingFileNames,
  ghostFilesByPath,
  liveFiles,
});


  return (
    <label
      htmlFor={isOnHold ? undefined : buttonId}
      title={isOnHold ? "Uploads disabled while account is on hold" : `Upload files to ${currentLabel}`}
      className={`z-50 border px-4 py-[6px] rounded-md flex items-center justify-center text-sm h-[36px] shadow-md transition ${positionClass} ${
        isOnHold 
          ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed' 
          : 'border-green-500 text-green-700 bg-white cursor-pointer hover:bg-green-100'
      }`}
      onClick={(e) => {
        if (isOnHold) {
          e.preventDefault();
          Swal.fire({
            title: "Uploads Disabled",
            text: "File uploads are disabled while your account is on hold. Please contact support or resolve outstanding invoices to restore upload access.",
            icon: "warning",
            confirmButtonText: "OK"
          });
        }
      }}
    >
      Upload to – {currentLabel}
<input
  id={buttonId}
  type="file"
  multiple
  className="hidden"
  onChange={async (e) => {
    if (!uploadEnabled || isOnHold) {
      console.warn(`🛑 Upload disabled. Ignoring file selection in: ${selectedPath}`);
      return;
    }

    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    await uploadFiles(selected);

    Swal.toast({
      title: `Files uploaded to ${selectedPath || "Unknown Folder"}`,
      icon: "success",
      timer: 1000,
      position: "center",
      showProgress: false,
    });

    console.log(`✅ Toast - Files uploaded to ${selectedPath || "Unknown Folder"}`);
  }}
/>

    </label>
  );
};

export default UploadButton;
