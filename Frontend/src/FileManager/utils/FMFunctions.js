import { message } from "antd";
//import SortableFolder from "../dnd/SortableFolder";
import mime from "mime";
import Swal from '../../shared/swalConfig';
//import Swal from "sweetalert2";


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

  try {
    const res = await axiosSecure.get(
      `/files/${projectId}/download/${cleanPath}/${encodeURIComponent(fileName)}`,
      { responseType: "blob" }
    );

    const blob = new Blob([res.data], { type: mimeType });
    const blobURL = window.URL.createObjectURL(blob);

    // 🎯 Open images & PDFs in browser tab
const previewable = ["jpg", "jpeg", "png", "gif", "webp", "pdf"];

if (mode === "download") {
  // Force download always
  const a = document.createElement("a");
  a.href = blobURL;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(blobURL);
  return;
}

if (mode === "preview" && previewable.includes(ext)) {
  window.open(blobURL, "_blank");
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
    await axiosSecure.put(
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