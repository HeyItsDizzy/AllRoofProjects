// 🧠 [UP] useUploadManager.js
import { uploadFileToFolder, dedupeName, safelyAddFiles } from "../utils/FMFunctions";
import Swal from '../../shared/swalConfig';
import JSZip from 'jszip';

// Helper function to get supported file extensions
const getSupportedExtensions = () => {
  return [
    // Documents
    'PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT',
    // Images  
    'JPG', 'JPEG', 'PNG', 'GIF', 'WEBP',
    // CAD
    'DWG', 'DXF', 
    // Archives
    'ZIP', 'RAR', '7Z',
    // Data
    'CSV', 'JSON',
    // Email
    'EML', 'MSG'
  ];
};

// Helper function to format file extensions for display
const formatExtensionsForDisplay = () => {
  const extensions = getSupportedExtensions();
  return extensions.join(', ');
};

// 🗜️ Helper function to extract ZIP files on client-side
const extractZipFile = async (file) => {
  console.log("🗜️ [ZIP] Starting client-side extraction:", file.name);
  
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const extractedFiles = [];
    
    // Process each file in the ZIP
    for (const [relativePath, zipEntry] of Object.entries(zipContent.files)) {
      // Skip directories and hidden files
      if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('/.')) {
        continue;
      }
      
      console.log(`📂 [ZIP] Extracting: ${relativePath}`);
      
      // Get file content as blob
      const fileBlob = await zipEntry.async('blob');
      
      // Create File object with proper path structure
      const extractedFile = new File([fileBlob], relativePath.split('/').pop(), {
        type: fileBlob.type || 'application/octet-stream'
      });
      
      // Add relativePath property to preserve folder structure
      extractedFile.relativePath = relativePath;
      
      extractedFiles.push(extractedFile);
    }
    
    console.log(`✅ [ZIP] Extracted ${extractedFiles.length} files from ${file.name}`);
    return extractedFiles;
    
  } catch (error) {
    console.error("❌ [ZIP] Extraction failed:", error);
    throw new Error(`Failed to extract ZIP file: ${error.message}`);
  }
};

export const useUploadManager = ({
  projectId,
  selectedPath = ".",
  axios,
  setFiles,
  setGhostFilesByPath,
  liveFiles = [],
  ghostFilesByPath = {},
  existingFileNames = [],
}) => {

const uploadFiles = async (files) => {
  console.log("🚀 [UP] Starting uploadFiles...");
  if (!files?.length) {
    console.warn("🚫 [UP] No files provided.");
    return;
  }

  // File size validation (50MB limit to match server)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
  const validFiles = files.filter(f => f.name?.includes("."));
  const uploaded = [];
  const failed = [];
  let allFilesToUpload = [];

  console.log("✅ [UP] Valid files:", validFiles.map(f => f.name));

  // 🗜️ Pre-process: Extract ZIP files if any
  for (const file of validFiles) {
    const isZipFile = file.name.toLowerCase().endsWith('.zip');
    
    if (isZipFile) {
      console.log(`🗜️ [UP] Detected ZIP file: ${file.name}, attempting extraction...`);
      
      try {
        // Show extraction progress
        const extractResult = await Swal.fire({
          title: 'Extracting ZIP File',
          text: `Extracting "${file.name}"...`,
          icon: 'info',
          showConfirmButton: false,
          allowOutsideClick: false,
          didOpen: async () => {
            Swal.showLoading();
            
            try {
              const extractedFiles = await extractZipFile(file);
              
              Swal.close();
              
              // Ask user what to do with ZIP
              const result = await Swal.fire({
                title: `Extracted ${extractedFiles.length} files`,
                text: `From "${file.name}". Do you want to upload the extracted files and delete the ZIP?`,
                icon: 'success',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Upload extracted files',
                denyButtonText: 'Upload ZIP as-is',
                cancelButtonText: 'Cancel'
              });
              
              if (result.isConfirmed) {
                // Upload extracted files instead of ZIP
                allFilesToUpload.push(...extractedFiles);
                console.log(`✅ [UP] Will upload ${extractedFiles.length} extracted files instead of ZIP`);
              } else if (result.isDenied) {
                // Upload the original ZIP file
                allFilesToUpload.push(file);
                console.log(`📦 [UP] Will upload original ZIP file: ${file.name}`);
              }
              // If cancelled, file is skipped
              
            } catch (error) {
              Swal.close();
              console.error(`❌ [UP] ZIP extraction failed for ${file.name}:`, error);
              
              // Ask if user wants to upload ZIP anyway
              const fallbackResult = await Swal.fire({
                title: 'Extraction Failed',
                text: `Could not extract "${file.name}". Upload as regular ZIP file?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Upload ZIP',
                cancelButtonText: 'Skip'
              });
              
              if (fallbackResult.isConfirmed) {
                allFilesToUpload.push(file);
              }
            }
          }
        });
        
      } catch (error) {
        console.error(`❌ [UP] ZIP processing failed for ${file.name}:`, error);
        allFilesToUpload.push(file); // Fallback to original file
      }
    } else {
      // Regular file, add as-is
      allFilesToUpload.push(file);
    }
  }

  console.log(`📋 [UP] Final upload queue: ${allFilesToUpload.length} files`);

  // Process files one by one to handle failures gracefully
  for (const file of allFilesToUpload) {
    const originalName = file.name;

    const ghostList = ghostFilesByPath?.[selectedPath] || [];
    const allNames = [...existingFileNames, ...ghostList];

    const combinedNames = allNames.map((f) =>
      typeof f === "string" ? f : f?.fileName
    );

    const alreadyExists = combinedNames.includes(originalName);
    let finalName = originalName;

    console.log(`🔍 [UP] Processing: ${originalName}`);
    console.log(`🧠 [UP] File "${originalName}" already exists?`, alreadyExists);

    // Handle file conflicts
    if (alreadyExists) {
      const result = await Swal.fire({
        title: `File "${originalName}" exists`,
        text: "Do you want to overwrite it?",
        icon: "warning",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Overwrite",
        denyButtonText: "Keep both",
      });

      if (result.isDismissed || result.isDenied) {
        if (result.isDenied) {
          finalName = dedupeName(originalName, combinedNames);
          console.log(`🔄 [UP] Renamed to avoid conflict: ${finalName}`);
        } else {
          console.log(`⏭️ [UP] Skipping: ${originalName}`);
          continue;
        }
      }
    }

    // Check file size before uploading
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`❌ [UP] File too large: ${originalName} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      
      // Create placeholder for oversized file
      const placeholderName = `${originalName}.failed`;
      failed.push({
        name: originalName,
        reason: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > 50MB)`,
        placeholder: placeholderName
      });
      
      // Add placeholder to UI
      if (setGhostFilesByPath) {
        setGhostFilesByPath((prev) => {
          const cleaned = (prev[selectedPath] || []).filter(name => name !== placeholderName);
          return {
            ...prev,
            [selectedPath]: [...cleaned, placeholderName],
          };
        });
      }
      continue;
    }

    try {
      // Handle folder structure preservation
      let uploadPath = selectedPath;
      let uploadName = finalName;
      
      // If file has relativePath (from folder drag), preserve folder structure
      if (file.relativePath) {
        const pathParts = file.relativePath.split('/');
        const fileName = pathParts.pop(); // Remove filename from path
        const folderPath = pathParts.join('/');
        
        // Combine selected path with relative folder path
        uploadPath = selectedPath === '.' ? folderPath : `${selectedPath}/${folderPath}`;
        uploadName = fileName;
        
        console.log(`📂 [UP] Preserving folder structure: ${file.relativePath} -> ${uploadPath}/${uploadName}`);
      } else {
        console.log(`📂 [UP] Preserving folder structure: ${originalName} -> ${selectedPath}/${finalName}`);
      }

      console.log(`📤 [UP] Uploading "${originalName}" as "${uploadName || finalName}" to "${uploadPath}/"...`);

      await uploadFileToFolder({
        file,
        folderPath: uploadPath,
        projectId,
        axios: axios,
        overrideName: uploadName || finalName,
        onProgress: (percent) => {
          console.log(`📶 [UP] Upload progress [${originalName}]: ${percent}%`);
        },
      });

      uploaded.push(uploadName || finalName);
      console.log(`✅ [UP] Successfully uploaded: ${uploadName || finalName}`);

      // Update ghost files
      if (setGhostFilesByPath) {
        setGhostFilesByPath((prev) => {
          const cleaned = (prev[selectedPath] || []).filter(name => name !== (uploadName || finalName));
          return {
            ...prev,
            [selectedPath]: [...cleaned, uploadName || finalName],
          };
        });
      }
    } catch (err) {
      console.error(`❌ [UP] Upload failed for "${originalName}":`, err);
      
      // Determine error type and create appropriate placeholder
      let errorReason = "Upload failed";
      let showSupportedExtensions = false;
      
      // Handle different error types
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        if (err.request?.status === 413 || err.message.includes('413') || err.message.includes('Request Entity Too Large')) {
          errorReason = `Request too large (total payload > server limit)`;
        } else if (err.request?.status === 403) {
          errorReason = `Access denied`;
        } else if (err.message.includes('CORS')) {
          errorReason = `CORS error - check server configuration`;
        } else {
          errorReason = `Network error - check connection`;
        }
      } else if (err.response?.status === 400) {
        errorReason = `Invalid file type`;
        showSupportedExtensions = true;
      } else if (err.response?.status === 413) {
        errorReason = `File or request too large`;
      } else {
        errorReason = `Upload error: ${err.message || 'Unknown error'}`;
      }
      
      // Create placeholder for failed file
      const placeholderName = `${originalName}.failed`;
      failed.push({
        name: originalName,
        reason: errorReason,
        placeholder: placeholderName,
        showSupportedExtensions
      });
      
      // Add placeholder to UI
      if (setGhostFilesByPath) {
        setGhostFilesByPath((prev) => {
          const cleaned = (prev[selectedPath] || []).filter(name => name !== placeholderName);
          return {
            ...prev,
            [selectedPath]: [...cleaned, placeholderName],
          };
        });
      }
    }
  }

  // Show summary of results
  if (failed.length > 0) {
    const failedList = failed.map(f => `• ${f.name}: ${f.reason}`).join('\n');
    let errorMessage = `${failed.length} file(s) failed to upload:\n\n${failedList}`;
    
    // Add supported extensions if any file had type errors
    const hasTypeErrors = failed.some(f => f.showSupportedExtensions);
    if (hasTypeErrors) {
      errorMessage += `\n\n💡 Supported Extensions:\n${formatExtensionsForDisplay()}`;
    }
    
    errorMessage += `\n\n📏 Upload Limits:\n• Maximum file size: 50MB per file\n• Folders are supported and extracted automatically\n• Only files with valid extensions are allowed\n• ZIP files can be extracted automatically`;
    
    if (uploaded.length > 0) {
      errorMessage += `\n\n✅ ${uploaded.length} file(s) uploaded successfully.`;
      errorMessage += `\n🔧 Failed files are marked with .failed extension - you can try uploading them individually.`;
    }

    await Swal.fire({
      icon: failed.length === allFilesToUpload.length ? "error" : "warning",
      title: failed.length === allFilesToUpload.length ? "Upload Failed" : "Partial Upload Success",
      html: `<div class="text-left whitespace-pre-line">${errorMessage}</div>`,
      confirmButtonText: "OK"
    });
  } else if (uploaded.length > 0) {
    // All successful
    console.log(`🎉 [UP] All ${uploaded.length} files uploaded successfully!`);
  }

  // 💾 Update UI list if files were uploaded
  if (setFiles && uploaded.length) {
    console.log("🔄 [UP] Updating UI with files:", uploaded);
    setFiles((prev) => {
      const newList = safelyAddFiles(prev, uploaded);
      console.log("🧩 [UP] Merged list:", newList);
      return newList;
    });
  }

  console.log("✅ [UP] uploadFiles complete");
};

  return { uploadFiles };
};

// Export the helper functions for use in other components
export { getSupportedExtensions, formatExtensionsForDisplay };
