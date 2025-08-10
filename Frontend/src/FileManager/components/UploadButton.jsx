// UploadButton.jsx
import React from "react";
import { useUploadManager } from "@/FileManager/hooks/useUploadManager";
import Swal from '@/shared/swalConfig';

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
      htmlFor={buttonId}
      className={`z-50 border border-green-500 text-green-700 px-4 py-[6px] rounded-md cursor-pointer flex items-center justify-center text-sm h-[36px] bg-white shadow-md hover:bg-green-100 transition ${positionClass}`}
    >
      Upload to – {currentLabel}
<input
  id={buttonId}
  type="file"
  multiple
  className="hidden"
  onChange={async (e) => {
    if (!uploadEnabled) {
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
