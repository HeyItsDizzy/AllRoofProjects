import { message } from "antd";
//import SortableFolder from "../dnd/SortableFolder";
import mime from "mime";
import Swal from '../../shared/swalConfig';
import { createLoadingSpinner } from '../../shared/components/LoadingSpinner';
import axios from 'axios';
//import Swal from "sweetalert2";

// Create axios instance for file management operations (dev frontend talks to dev backend)
function createFileManagementAxios() {
  // In development: use local backend, in production: use live backend
  const isDevelopment = import.meta.env.MODE === 'development';
  const baseURL = isDevelopment 
    ? import.meta.env.VITE_API_BASE_URL          // Local backend for development
    : import.meta.env.VITE_FILE_API_BASE_URL;    // Live backend for production

  console.log("🔧 [FILE MANAGEMENT] Using", isDevelopment ? "LOCAL" : "LIVE", "backend:", baseURL);

  const axiosInstance = axios.create({ baseURL });
  
  // Add auth token if available
  const token = localStorage.getItem('accessToken');
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return axiosInstance;
}



//==========================================//
//==========  UTILITY FUNCTIONS  ===========//
//==========================================//

// 🔁 Normalize any path consistently
function normalizePath(...segments) {
  return segments
    .flatMap(segment => segment.split("/"))  // allow raw strings with slashes
    .filter((part) =>
      Boolean(part) &&
      part !== "children" &&
      part !== "hasMeta"
    )
    .join("/")
    .replace(/\/{2,}/g, "/")                 // clean up accidental double slashes
    .trim();
}

// 🧹 Recursively extract all flat folder paths from a tree
function extractFlatFolders(tree, prefix = "") {
  let result = [];

  for (const key in tree) {
    if (!Object.prototype.hasOwnProperty.call(tree, key)) continue;
    if (key.startsWith("__")) continue;

    const full = prefix ? `${prefix}/${key}` : key;
    result.push(full);

    if (
      tree[key] &&
      typeof tree[key] === "object" &&
      Object.keys(tree[key]).some((k) => !k.startsWith("__"))
    ) {
      result = result.concat(extractFlatFolders(tree[key], full));
    }
  }

  return result;
}

// 🚫 Filter out internal/system keys (e.g., "__files", "__meta", "__temp")
function isVisibleFolderKey(key) {
  return typeof key === "string" && !key.startsWith("__");
}

// 🌳 Insert a new folder into the folderTree state
//remake function here



// 🔠 Sort folder names using numeric + alphabetic order
function sortFolderKeys(entries) {
  return entries.sort(([a], [b]) => {
    const parseKey = (str) => {
      const name = str.split("/").pop();
      const match = name.match(/^(\d+)([a-zA-Z\s]*)/);
      return match ? [parseInt(match[1], 10), match[2] || ""] : [Infinity, name];
    };

    const [numA, suffixA] = parseKey(a);
    const [numB, suffixB] = parseKey(b);
    return numA !== numB ? numA - numB : suffixA.localeCompare(suffixB);
  });
}

// 📦 Utility to rebuild flat folder list from disk-based metadata
function buildFolderListFromDiskTree(metadata = {}) {
  const all = new Set();
  Object.keys(metadata).forEach((folderPath) => {
    const parts = folderPath.split("/").filter(Boolean);
    for (let i = 1; i <= parts.length; i++) {
      all.add(parts.slice(0, i).join("/"));
    }
  });

  return Array.from(all).map((name) => ({
    name,
    role: "all",
  }));
}

async function renameFolderPath({ projectId, axiosSecure, folderPath, newName, onSuccess }) {
  try {
    const normalizedPath = normalizePath(folderPath);
    
    // Split path and encode each segment separately to avoid double-encoding
    const pathSegments = normalizedPath.split('/').map(segment => encodeURIComponent(segment));
    const encodedPath = pathSegments.join('/');
    
    const endpoint = `/files/${projectId}/folders/${encodedPath}`;

    console.log("🔍 [RENAME FOLDER DEBUG]");
    console.log("   Original folderPath:", folderPath);
    console.log("   Normalized path:", normalizedPath);
    console.log("   Path segments:", normalizedPath.split('/'));
    console.log("   Encoded segments:", pathSegments);
    console.log("   Final encoded path:", encodedPath);
    console.log("   Full endpoint:", endpoint);
    console.log("   Project ID:", projectId);
    console.log("   New name:", newName);

    const res = await axiosSecure.put(endpoint, { newName });

    showMessage("success", "Folder renamed");
    if (onSuccess) onSuccess();
    return res?.data;
  } catch (err) {
    console.error("❌ Folder rename failed:");
    console.error("   Error status:", err?.response?.status);
    console.error("   Error message:", err?.message);
    console.error("   Response data:", err?.response?.data);
    console.error("   Request URL:", err?.config?.url);
    console.error("   Full error:", err);
    
    showMessage("error", "Rename failed");
    logMessage("❌ Folder rename failed:", err);
  }
}

// Utility function for logging messages
function logMessage(...args) {
  console.log(...args);
}

// Utility function for showing messages
function showMessage(type, content) {
  message[type](content);
}

function getSubfoldersAtPath(tree, path) {
  const parts = path === "." ? [] : path.split("/");
  let node = tree["."]; // ✅ start from virtual root node

  for (const part of parts) {
    if (!node || typeof node !== "object") return {};
    node = node[part];
  }

  return node || {};
}

// 📁 Get __meta from a folder path (e.g., for label)
function getFolderMetaAtPath(folderTree, path = ".") {
  const parts = path === "." ? [] : path.split("/");
  let current = folderTree?.["."];

  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = current[part];
  }

  return current?.__meta || null;
}


// 📦 Download entire folder as ZIP
async function downloadToZIP({ axiosSecure, selectedPath, projectId }) {
  try {
    const res = await axiosSecure.post(
      `/files/${projectId}/download-zip`,
      { folderPath: selectedPath },
      { responseType: "blob" }
    );

    const blob = new Blob([res.data], { type: "application/zip" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPath.replace(/\//g, "_") || "ProjectRoot"}.zip`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("❌ Download ZIP failed:", err);
    Swal.fire("Error", "Failed to download files", "error");
  }
}

// 📄 Download a single file
async function downloadFile({ axiosSecure, selectedPath, projectId, fileName, mode = "preview" }) {

  console.log("📥 downloadFile input:", {
    selectedPath,
    fileName,
    projectId,
  });

  if (!fileName || !projectId) {
    console.warn("❌ Missing fileName or projectId");
    return;
  }

  const ext = fileName.split('.').pop().toLowerCase();
  const mimeType = mime.getType(fileName) || "application/octet-stream";

  // ✅ Fix path logic — empty string for project root
  const cleanPath = selectedPath === "." ? "" : encodeURIComponent(selectedPath);

  // 🚀 KISS SOLUTION: For preview mode with previewable files, open directly from backend
  const previewable = ["jpg", "jpeg", "png", "gif", "webp", "pdf"];
  const imageTypes = ["jpg", "jpeg", "png", "gif", "webp"];
  
  if (mode === "preview" && previewable.includes(ext)) {
    // Performance tracking - start timer
    const startTime = performance.now();
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      console.log(`⏱️ [DEV] Preview started for ${fileName} at ${new Date().toLocaleTimeString()}`);
      console.log(`🔍 [DEV] File size estimate: ${fileName.length} chars in name`);
      console.log(`📊 [DEV] File extension: ${ext}`);
    }
    
    // 🔧 FIXED: Proper URL construction for both dev and prod
    let baseURL;
    
    if (isDev) {
      // Development: Use FILE_API_BASE_URL to point to live server for files
      const fileApiBaseUrl = import.meta.env.VITE_FILE_API_BASE_URL;
      if (fileApiBaseUrl) {
        baseURL = fileApiBaseUrl.replace('/api', ''); // Remove /api suffix if present
      } else {
        baseURL = window.location.origin; // Fallback to local
      }
    } else {
      // Production: Use current origin (nginx proxies /api to backend)
      baseURL = window.location.origin; // https://projects.allrooftakeoffs.com.au
    }
    
    // Build the complete URL - backend expects: /api/files/:projectId/download/...
    const directURL = `${baseURL}/api/files/${projectId}/download/${cleanPath}/${encodeURIComponent(fileName)}?preview=true`;
    
    if (isDev) {
      console.log('🚀 [DEV] Opening preview URL:', directURL);
      console.log(`📏 [DEV] URL length: ${directURL.length} characters`);
      console.log(`🔧 [DEV] Base URL: ${baseURL}`);
    }
    
    // ELEGANT UX: PDFs in new tab, Images in modal
    if (imageTypes.includes(ext)) {
      if (isDev) console.log('🖼️ [DEV] Opening image in elegant modal overlay');
      openImageModal(directURL, fileName, startTime);
      return;
    }
    
    // PDFs continue with new tab (perfect UX for documents)
    if (isDev) console.log('📄 [DEV] Opening PDF in new tab with browser viewer');
    const previewWindow = window.open(directURL, "_blank");
    
    // Track window load time (approximate)
    if (previewWindow) {
      const checkInterval = setInterval(() => {
        try {
          if (previewWindow.document && previewWindow.document.readyState === 'complete') {
            const loadTime = performance.now() - startTime;
            if (isDev) {
              console.log(`✅ [DEV] PDF loaded successfully: ${fileName}`);
              console.log(`⏱️ [DEV] Total load time: ${(loadTime / 1000).toFixed(2)} seconds`);
              if (loadTime > 3000) {
                console.warn(`⚠️ [DEV] SLOW LOAD WARNING: ${fileName} took ${(loadTime / 1000).toFixed(2)}s to load`);
              }
            }
            clearInterval(checkInterval);
          }
        } catch (e) {
          // Cross-origin restriction - can't access document
          // Just log the click time
          const clickTime = performance.now() - startTime;
          if (clickTime > 100) { // After initial click delay
            if (isDev) {
              console.log(`🔗 [DEV] PDF window opened: ${fileName}`);
              console.log(`⏱️ [DEV] Window open time: ${(clickTime / 1000).toFixed(2)} seconds`);
            }
            clearInterval(checkInterval);
          }
        }
      }, 100);
      
      // Clear interval after 30 seconds to prevent memory leaks
      setTimeout(() => clearInterval(checkInterval), 30000);
    }
    
    return;
  }

  // For download mode or non-previewable files, use blob method
  try {
    const res = await axiosSecure.get(
      `/files/${projectId}/download/${cleanPath}/${encodeURIComponent(fileName)}`,
      { responseType: "blob" }
    );

    const blob = new Blob([res.data], { type: mimeType });
    const blobURL = window.URL.createObjectURL(blob);

    if (mode === "download") {
      // Force download always
      const a = document.createElement("a");
      a.href = blobURL;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(blobURL);
      return;
    }

    // 🔁 Fallback: treat unknowns as download
    const a = document.createElement("a");
    a.href = blobURL;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(blobURL);

  } catch (err) {
    console.error("❌ File download failed:", err);
    Swal.fire("Error", `Failed to download ${fileName}`, "error");
  }
}

function sanitizeFilename(filename) {
  const maxLength = 150;

  // Extract extension
  const extMatch = filename.match(/\.[^.\s]{1,5}$/); // .jpg, .webp, .docx
  const ext = extMatch ? extMatch[0] : '';
  let base = filename.replace(ext, '');

  // Replace forbidden/special characters with hyphen
  base = base
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, '') // remove diacritics  
    .replace(/[^a-zA-Z0-9 _.-]/g, '-')        // Replace all bad chars
    .replace(/[\/\\:*?"<>|]/g, '-')           // Windows reserved
    .replace(/\s+/g, ' ')                     // Collapse whitespace
    .replace(/^\.+|\.+$/g, '')                // Strip leading/trailing dots
    .replace(/^ +| +$/g, '')                  // Trim leading/trailing spaces
    .replace(/[^\x00-\x7F]/g, '-');           // remove non-ASCII (includes ·)
    

  // Truncate filename if needed
  base = base.slice(0, maxLength);

if (safeName !== file.name) {
  console.warn(`🧼 Filename sanitized: "${file.name}" → "${safeName}"`);
}

  return `${base}${ext}`;
}

//==========================================//
//============  FILE  MANAGER  =============//
//==========================================//

//---------[Handle File Uploads]------------//
async function DnDUpload({
  files = [],
  projectId,
  selectedPath,
  axios,
  existingFileNames = [],
  setFiles,
  setUploadProgress,
  setGhostFilesByPath, // <--- NEW for ghost injection
}) {
  console.log("📤 [UPLOAD] Starting DnDUpload with:", files);
  if (!files.length) {
    console.warn("📤 [UPLOAD] No files provided.");
    return;
  }

for (const file of files) {
  const cleanedName = sanitizeFilename(file.name);
  const combinedNames = getLiveFileNames({ selectedPath, ghostFilesByPath, diskFileNames: existingFileNames });
  console.log("🧠 [DEBUG] getLiveFileNames from FMFunctions.js:");
console.log("   selectedPath:", selectedPath);
console.log("   ghostFilesByPath:", ghostFilesByPath[selectedPath]);
console.log("   diskFileNames:", existingFileNames);
console.log("   combinedNames (merged list):", combinedNames);

  const combinedSet = new Set(combinedNames);


  let finalName = cleanedName;
  const fileExists = combinedSet.has(cleanedName);

  if (fileExists) {
    const result = await Swal.fire({
      title: `File "${cleanedName}" exists`,
      text: "Do you want to overwrite it?",
      icon: "warning",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Overwrite",
      denyButtonText: "Keep both",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      console.log("✅ [DnD] User chose to overwrite.");
    } else if (result.isDenied) {
      finalName = dedupeName(cleanedName, [...combinedSet]);
      console.log(`🆕 [DnD] Renamed to avoid conflict: ${finalName}`);
    } else {
      console.log(`❌ [DnD] User cancelled upload: ${cleanedName}`);
      continue;
    }
  }

  try {
    await file.slice(0, 10).arrayBuffer(); // quick read probe

    await uploadFileToFolder({
      file,
      projectId,
      folderPath: selectedPath,
      axios,
      overrideName: finalName,
      onProgress: (percent) => {
        setUploadProgress?.((prev) => ({ ...prev, [file.name]: percent }));
        console.log(`📤 [UPLOAD] Progress for "${file.name}": ${percent}%`);
      },
    });

    if (typeof setGhostFilesByPath === "function") {
      setGhostFilesByPath(prev => ({
        ...prev,
        [selectedPath]: [...(prev[selectedPath] || []).filter(f => f !== finalName), finalName],
      }));
      console.log(`👻 [GHOST] Added "${finalName}" to ghosts for "${selectedPath}"`);
    }

    if (setFiles) {
      setFiles((prev) => {
        const names = prev.map(f => typeof f === "string" ? f : f?.fileName);
        if (names.includes(finalName)) return prev;
        return [...prev, finalName];
      });
    }
  } catch (err) {
    console.error(`❌ [DnD] Upload failed for ${file.name}:`, err);
  }
}


  console.log("📤 [UPLOAD] Finished uploading batch:", files);
}


const uploadFileToFolder = async ({ projectId, folderPath, file, onProgress, axios, overrideName }) => {
  console.log("📤 [UPLOAD] Begin:", file?.name || "(no name)");
  console.log("📁 folderPath:", folderPath);
  console.log("📦 projectId:", projectId);
  console.log("🧾 File size:", file?.size, "| type:", file?.type);
  console.log("🧪 arrayBuffer available?", typeof file?.arrayBuffer === "function");

  const formData = new FormData();
  formData.append("files", file, overrideName || file.name);
  formData.append("folderPath", folderPath);

  try {
    const res = await axios.post(`/files/${projectId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded * 100) / e.total);
        onProgress?.(percent);
      },
    });

    console.log("✅ [UPLOAD] Upload succeeded:", res.status, res.data);
    return res.data;
  } catch (err) {
    console.error("🔥 [UPLOAD] uploadFileToFolder failed:", err);
    throw err;
  }
};

//-----------[UI State Utilities]-----------//
function getLiveFileNames({ selectedPath = ".", ghostFilesByPath = {}, diskFileNames = [] }) {
  const ghosts = ghostFilesByPath[selectedPath] || [];

  const ghostNames = ghosts.map(f => typeof f === "string" ? f : f?.fileName);
  const ghostNameSet = new Set(ghostNames);

  const diskNames = diskFileNames.map(f => typeof f === "string" ? f : f?.fileName);

  // ⚠️ Only suppress disk names that have an exact match in ghostNames
  const filteredDisk = diskNames.filter(name => !ghostNameSet.has(name));

  const merged = [...filteredDisk, ...ghostNames];
  return Array.from(new Set(merged));
}

function dedupeName(fullName, existingFullNames = []) {
  if (!existingFullNames.includes(fullName)) return fullName;

  const ext = fullName.includes(".") ? "." + fullName.split(".").pop() : "";
  const base = fullName.replace(new RegExp(`${ext}$`), "");

  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;
  while (existingFullNames.includes(candidate)) {
    counter++;
    candidate = `${base} (${counter})${ext}`;
  }

  console.log(`🧠 [DEBUG] dedupeName: ${fullName} → ${candidate}`);
  return candidate;
}

function safelyAddFiles(prev, newFiles) {
  console.log("🧩 [UISTATE] safelyAddFiles | prev:", prev, "new:", newFiles);
  const currentNames = prev.map(f => typeof f === "string" ? f : f?.fileName);
  const dedupedPrev = Array.from(new Set(prev.map(f => typeof f === "string" ? f : f?.fileName)));
  const list = [...dedupedPrev];

  for (const name of newFiles) {
    if (!currentNames.includes(name)) {
      list.push(name);
      console.log(`🆕 [UISTATE] Added: "${name}"`);
    } else {
      console.log(`⚠️ [UISTATE] Skipped duplicate: "${name}"`);
    }
  }
  console.log("🧩 [UISTATE] Final merged:", list);
  return list;
}

function safeSetFilesAndGhosts(setFiles, setGhostFilesByPath, fileList, selectedPath) {
  const unique = Array.from(new Set(fileList.map(f => typeof f === "string" ? f : f?.fileName)));
  setFiles(unique);
  setGhostFilesByPath(prev => ({
    ...prev,
    [selectedPath]: unique,
  }));
  console.log("🪄 [SYNC] Updated UI state:", unique);
}


//------------[Rename / Delete]-------------//
// 📄 Rename a single file
async function renameFile({ axiosSecure, projectId, filePath, existingFiles = [] }) {
  const fileName = filePath.split("/").pop();
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "";
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  const { value: newBaseName } = await Swal.fire({
    title: "Rename File",
    input: "text",
    inputValue: baseName,
    showCancelButton: true,
    confirmButtonText: "Rename",
  });

  if (!newBaseName || newBaseName === baseName) return;

  const otherNames = existingFiles.filter((f) => f !== fileName);
  const dedupedBase = dedupeName(newBaseName, otherNames.map(f => f.replace(/\.[^/.]+$/, "")));
  const newName = `${dedupedBase}.${ext}`;
  const normalized = normalizePath(filePath);

  console.log("🔎 [RENAME] filePath input:", filePath);
  console.log("🔎 [RENAME] normalized:", normalized);
  console.log("🔎 [RENAME] Request URL:", `/files/${projectId}/files/${encodeURIComponent(normalized)}`);
  console.log("🔎 [RENAME] newName:", newName);

  console.log(`✏️ [RENAME] Renaming "${fileName}" → "${newName}"`);


  try {
    // Use file management axios instance like delete operation
    const fileAxios = createFileManagementAxios();
    
    await fileAxios.put(
      `/files/${projectId}/files/${encodeURIComponent(normalized)}`,
      { newName }
    );

    showMessage("success", `Renamed to: ${newName}`);
    return { newName };
  } catch (err) {
    console.error("❌ [RENAME] Rename failed:", err);
    Swal.fire("Error", `Failed to rename ${fileName}`, "error");
  }
}
// 📄 Delete a single file
async function deleteFile({ axiosSecure, projectId, filePath }) {
  const fileName = filePath.split("/").pop();

  const confirm = await Swal.fire({
    icon: "warning",
    title: `Delete "${fileName}"?`,
    text: "This will permanently remove the file.",
    showCancelButton: true,
    confirmButtonText: "Delete",
  });

  if (!confirm.isConfirmed) return;

  const normalized = normalizePath(filePath);

  console.log(`🗑 [DELETE] Attempting delete for: ${fileName}`);

  try {
    await axiosSecure.delete(
      `/files/${projectId}/files/${encodeURIComponent(normalized)}`
    );

    showMessage("success", `Deleted: ${fileName}`);
    return { deleted: fileName };
  } catch (err) {
    console.error("❌ [DELETE] Delete failed:", err);
    Swal.fire("Error", `Failed to delete ${fileName}`, "error");
  }
}

//==========================================//
//========== END OF FILE MANAGER ===========//
//==========================================//


/**
 * Open image in modal to bypass browser navigation issues
 * @param {string} imageUrl - Direct URL to image
 * @param {string} fileName - Name of the file
 * @param {number} startTime - Performance tracking start time
 */
async function openImageModal(imageUrl, fileName, startTime) {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Create modal overlay
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    cursor: pointer;
  `;
  
  // Create image element
  const img = document.createElement('img');
  img.style.cssText = `
    max-width: 95%;
    max-height: 95%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  `;
  
  // Create loading indicator with spinner and progress
  const loadingContainer = document.createElement('div');
  loadingContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    color: white;
  `;

  // Create spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;

  // Add CSS animation for spinner
  if (!document.getElementById('spinner-animation')) {
    const style = document.createElement('style');
    style.id = 'spinner-animation';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }

  // Create loading text
  const loadingText = document.createElement('div');
  loadingText.style.cssText = `
    font-size: 18px;
    text-align: center;
    animation: pulse 2s ease-in-out infinite;
  `;
  loadingText.textContent = fileName;

  // Create buffer gauge container
  const gaugeContainer = document.createElement('div');
  gaugeContainer.style.cssText = `
    width: 300px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;

  // Create buffer gauge bar
  const gaugeBar = document.createElement('div');
  gaugeBar.style.cssText = `
    height: 8px;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    border-radius: 6px;
    width: 0%;
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
  `;

  // Create buffer percentage text
  const bufferText = document.createElement('div');
  bufferText.style.cssText = `
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    text-align: center;
    margin-top: 8px;
  `;
  bufferText.textContent = 'Loading... 0%';

  // Assemble gauge
  gaugeContainer.appendChild(gaugeBar);
  
  // Assemble loading container
  loadingContainer.appendChild(spinner);
  loadingContainer.appendChild(loadingText);
  loadingContainer.appendChild(gaugeContainer);
  loadingContainer.appendChild(bufferText);
  
  // Create performance indicator for dev mode
  const perfIndicator = document.createElement('div');
  if (isDev) {
    perfIndicator.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: #4ade80;
      font-size: 12px;
      font-family: monospace;
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #4ade80;
    `;
    perfIndicator.textContent = `Loading... 0.0s`;
  }
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    gap: 10px;
    align-items: center;
  `;
  
  // Create "Open in new tab" button
  const openTabBtn = document.createElement('button');
  openTabBtn.style.cssText = `
    background: rgba(59, 130, 246, 0.8);
    border: none;
    color: white;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: background-color 0.2s;
  `;
  openTabBtn.innerHTML = '🔗 Open in Tab';
  openTabBtn.onmouseover = () => openTabBtn.style.background = 'rgba(59, 130, 246, 1)';
  openTabBtn.onmouseout = () => openTabBtn.style.background = 'rgba(59, 130, 246, 0.8)';
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    font-size: 24px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  `;
  closeBtn.innerHTML = '×';
  closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
  closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  
  // Add buttons to container
  buttonContainer.appendChild(openTabBtn);
  buttonContainer.appendChild(closeBtn);
  
  // Add elements to modal
  modal.appendChild(loadingContainer);
  modal.appendChild(buttonContainer);
  if (isDev) modal.appendChild(perfIndicator);
  document.body.appendChild(modal);
  
  // Close modal handlers
  const closeModal = () => {
    document.body.removeChild(modal);
  };
  
  // Open in new tab handler
  openTabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(imageUrl, "_blank");
    if (isDev) {
      const openTime = performance.now() - startTime;
      console.log(`🔗 [DEV] Image opened in new tab: ${fileName} after ${(openTime / 1000).toFixed(2)}s`);
    }
  });
  
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  
  // Add escape key handler
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Performance tracking interval for dev mode
  let perfInterval;
  let bufferInterval;
  
  if (isDev) {
    perfInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      perfIndicator.textContent = `Loading... ${elapsed.toFixed(1)}s`;
      if (elapsed > 3) {
        perfIndicator.style.color = '#f59e0b'; // Orange for slow
      }
      if (elapsed > 6) {
        perfIndicator.style.color = '#ef4444'; // Red for very slow
      }
    }, 100);
  }

  // Simulate buffer loading progress
  let progress = 0;
  bufferInterval = setInterval(() => {
    if (progress < 95) {
      // Simulate realistic loading - fast start, then slower
      const increment = progress < 30 ? Math.random() * 15 : 
                       progress < 60 ? Math.random() * 8 : 
                       progress < 80 ? Math.random() * 3 : 
                       Math.random() * 1;
      
      progress = Math.min(95, progress + increment);
      gaugeBar.style.width = `${progress}%`;
      bufferText.textContent = `Loading... ${Math.round(progress)}%`;
      
      // Change color as it progresses
      if (progress > 70) {
        gaugeBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      } else if (progress > 40) {
        gaugeBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      }
    }
  }, 100 + Math.random() * 200); // Variable timing for realistic feel
  
  try {
    if (isDev) {
      console.log('🌐 [DEV] Loading image in elegant modal:', imageUrl);
      console.log(`📏 [DEV] Image URL length: ${imageUrl.length} characters`);
    } else {
      console.log('🌐 [PROD] Loading image in modal:', imageUrl);
    }
    
    // Since nginx is fixed, we can now load images directly via src
    // This gives us the modal UX with reliable loading
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      
      // Complete the buffer animation
      clearInterval(bufferInterval);
      gaugeBar.style.width = '100%';
      gaugeBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      bufferText.textContent = 'Complete! 100%';
      
      // Add a brief delay to show completion, then fade out loading
      setTimeout(() => {
        loadingContainer.style.transition = 'opacity 0.5s ease';
        loadingContainer.style.opacity = '0';
        
        setTimeout(() => {
          if (modal.contains(loadingContainer)) {
            modal.removeChild(loadingContainer);
          }
          
          // Add fade-in effect for image
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.5s ease';
          modal.appendChild(img);
          
          // Trigger fade-in
          setTimeout(() => {
            img.style.opacity = '1';
          }, 50);
          
        }, 500);
      }, 300);
      
      if (isDev) {
        console.log(`✅ [DEV] Image loaded successfully in modal: ${fileName}`);
        console.log(`⏱️ [DEV] Total load time: ${(loadTime / 1000).toFixed(2)} seconds`);
        
        if (loadTime > 3000) {
          console.warn(`⚠️ [DEV] SLOW LOAD WARNING: ${fileName} took ${(loadTime / 1000).toFixed(2)}s to load`);
          console.log(`📊 [DEV] Consider optimizing this image or checking network conditions`);
        }
        
        perfIndicator.textContent = `✅ Loaded in ${(loadTime / 1000).toFixed(2)}s`;
        perfIndicator.style.color = loadTime > 3000 ? '#ef4444' : '#10b981';
        clearInterval(perfInterval);
      }
    };
    
    img.onerror = () => {
      const errorTime = performance.now() - startTime;
      
      // Clear intervals and show error state
      clearInterval(bufferInterval);
      if (isDev) {
        clearInterval(perfInterval);
        console.error(`❌ [DEV] Image failed to load: ${fileName} after ${(errorTime / 1000).toFixed(2)} seconds`);
        perfIndicator.textContent = `❌ Failed after ${(errorTime / 1000).toFixed(2)}s`;
        perfIndicator.style.color = '#ef4444';
      }
      
      // Update loading UI to show error
      gaugeBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
      bufferText.textContent = 'Failed to load';
      loadingText.textContent = `Failed to load ${fileName}`;
      loadingText.style.color = '#ff6b6b';
      spinner.style.display = 'none';
    };
    
    // Load the image directly (nginx routes work now!)
    img.src = imageUrl;
    
  } catch (error) {
    const errorTime = performance.now() - startTime;
    
    // Clear intervals
    clearInterval(bufferInterval);
    if (isDev) {
      console.error(`❌ [DEV] Failed to load image: ${fileName} after ${(errorTime / 1000).toFixed(2)} seconds`, error);
      perfIndicator.textContent = `❌ Error after ${(errorTime / 1000).toFixed(2)}s`;
      perfIndicator.style.color = '#ef4444';
      clearInterval(perfInterval);
    }
    
    // Update loading UI to show error
    gaugeBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
    bufferText.textContent = 'Error occurred';
    loadingText.textContent = `Failed to load ${fileName}: ${error.message}`;
    loadingText.style.color = '#ff6b6b';
    spinner.style.display = 'none';
  }
}

// Exporting all functions for use in other modules
export {
  //FILE  MANAGER
  normalizePath,
  extractFlatFolders,
  sortFolderKeys,
  renameFolderPath,
  buildFolderListFromDiskTree,
  getSubfoldersAtPath,
  getFolderMetaAtPath,
  isVisibleFolderKey,
  downloadToZIP,
  downloadFile,
  sanitizeFilename,
  //FILE  MANAGER
  DnDUpload,
  uploadFileToFolder,
  getLiveFileNames,
  dedupeName,
  safelyAddFiles,
  safeSetFilesAndGhosts,
  deleteFile,
  renameFile,
};