// File Type Handler - Enhanced file operations for different file types
// Handles special file types like EML, PDF, images with appropriate actions

/**
 * Get file icon based on file extension
 * @param {string} fileName - The file name
 * @param {number} size - Icon size
 * @returns {JSX.Element} - Icon component
 */
export const getFileIcon = (fileName, size = 20) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const iconStyle = { width: size, height: size };
  
  switch (ext) {
    case 'eml':
    case 'msg':
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-blue-500 text-white rounded text-xs font-bold">
          📧
        </div>
      );
    case 'pdf':
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-red-500 text-white rounded text-xs font-bold">
          📄
        </div>
      );
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-green-500 text-white rounded text-xs font-bold">
          🖼️
        </div>
      );
    case 'doc':
    case 'docx':
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-blue-600 text-white rounded text-xs font-bold">
          📝
        </div>
      );
    case 'xls':
    case 'xlsx':
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-green-600 text-white rounded text-xs font-bold">
          📊
        </div>
      );
    case 'zip':
    case 'rar':
    case '7z':
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-yellow-600 text-white rounded text-xs font-bold">
          🗃️
        </div>
      );
    default:
      return (
        <div style={iconStyle} className="flex items-center justify-center bg-gray-500 text-white rounded text-xs font-bold">
          📄
        </div>
      );
  }
};

/**
 * Handle file opening based on file type
 * @param {Object} params - File handling parameters
 * @param {string} params.fileName - Name of the file
 * @param {string} params.selectedPath - Current folder path
 * @param {string} params.projectId - Project ID
 * @param {Function} params.axiosSecure - Axios instance
 * @param {string} params.mode - 'preview' or 'download'
 */
export const handleFileOpen = async ({ fileName, selectedPath, projectId, axiosSecure, mode = "preview" }) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Special handling for EML and MSG files
  if (ext === 'eml' || ext === 'msg') {
    await handleEmailFile({ fileName, selectedPath, projectId, axiosSecure });
    return true; // Return true to indicate the file was handled
  }
  
  // Use existing download function for other files
  const { downloadFile } = await import('./FMFunctions');
  await downloadFile({ axiosSecure, selectedPath, projectId, fileName, mode });
  return false; // Return false to indicate default handling was used
};

/**
 * Handle Email file opening (EML/MSG) - Download and attempt to open with default mail client
 * @param {Object} params - Email file parameters
 */
const handleEmailFile = async ({ fileName, selectedPath, projectId, axiosSecure }) => {
  try {
    console.log("📧 Opening email file:", fileName);
    
    // Determine MIME type based on extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = ext === 'msg' ? 'application/vnd.ms-outlook' : 'message/rfc822';
    
    // First, download the file
    const cleanPath = selectedPath === "." ? "" : encodeURIComponent(selectedPath);
    const res = await axiosSecure.get(
      `/files/${projectId}/download/${cleanPath}/${encodeURIComponent(fileName)}`,
      { responseType: "blob" }
    );

    const blob = new Blob([res.data], { type: mimeType });
    const blobURL = window.URL.createObjectURL(blob);

    // Try to open with system default mail client
    // This works by creating a download link and triggering it
    const a = document.createElement("a");
    a.href = blobURL;
    a.download = fileName;
    
    // For EML/MSG files, we want to try opening them directly if possible
    // Some browsers/systems will open email files with default mail client
    try {
      // First attempt: try to open directly (might work on some systems)
      const newWindow = window.open(blobURL, "_blank");
      
      // If the window didn't open or was blocked, fall back to download
      setTimeout(() => {
        if (!newWindow || newWindow.closed) {
          console.log("📧 Direct open failed, downloading email file for manual opening");
          a.click();
          
          // Show user-friendly message
          import('sweetalert2').then((SwalModule) => {
            const Swal = SwalModule.default;
            Swal.fire({
              icon: 'info',
              title: 'Email Downloaded',
              html: `
                <p>The email file <strong>${fileName}</strong> has been downloaded.</p>
                <p>Please open it with your default email client (Outlook, Mail, etc.)</p>
              `,
              confirmButtonText: 'OK',
              timer: 5000,
              timerProgressBar: true
            });
          });
        }
      }, 1000);
      
    } catch (directOpenError) {
      console.log("📧 Direct open not supported, downloading file");
      a.click();
      
      // Show user-friendly message
      import('sweetalert2').then((SwalModule) => {
        const Swal = SwalModule.default;
        Swal.fire({
          icon: 'info',
          title: 'Email Downloaded',
          html: `
            <p>The email file <strong>${fileName}</strong> has been downloaded.</p>
            <p>Please open it with your default email client (Outlook, Mail, etc.)</p>
          `,
          confirmButtonText: 'OK',
          timer: 5000,
          timerProgressBar: true
        });
      });
    }

    // Clean up blob URL after some time
    setTimeout(() => {
      window.URL.revokeObjectURL(blobURL);
    }, 10000);

  } catch (error) {
    console.error("❌ Email file handling failed:", error);
    import('sweetalert2').then((SwalModule) => {
      const Swal = SwalModule.default;
      Swal.fire("Error", `Failed to open email file: ${fileName}`, "error");
    });
  }
};

/**
 * Check if file type can be previewed in browser
 * @param {string} fileName - File name
 * @returns {boolean} - True if file can be previewed
 */
export const isPreviewable = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const previewableTypes = ["jpg", "jpeg", "png", "gif", "webp", "pdf"];
  return previewableTypes.includes(ext);
};

/**
 * Get appropriate action text for file type
 * @param {string} fileName - File name
 * @returns {string} - Action text
 */
export const getFileActionText = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (ext) {
    case 'eml':
    case 'msg':
      return 'Open Email';
    case 'pdf':
      return 'View PDF';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'View Image';
    default:
      return isPreviewable(fileName) ? 'Preview' : 'Download';
  }
};
