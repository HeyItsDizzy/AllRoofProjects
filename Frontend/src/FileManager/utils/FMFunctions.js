import { message } from "antd";
import { canSeeFolder } from "../shared/canSeeFolder";
import SortableFolder from "../dnd/SortableFolder";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";


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

async function handleRename({ type = "file", projectId, axiosSecure, targetId, newName, onSuccess }) {
  try {
    const endpoint =
      type === "folder"
        ? `/files/${projectId}/folders/rename`
        : `/files/${projectId}/files/${targetId}`;

    const res = await axiosSecure.put(endpoint, {
      ...(type === "folder" ? { oldPath: targetId, newName } : { newName }),
    });

    showMessage("success", `${type === "folder" ? "Folder" : "File"} renamed`);
    if (onSuccess) onSuccess();
    return res?.data;
  } catch (err) {
    showMessage("error", "Rename failed");
    logMessage("❌ Rename error:", err);
  }
}

function dedupeName(baseName, existingNames = []) {
  if (!existingNames.includes(baseName)) return baseName;

  let counter = 2;
  while (existingNames.includes(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
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
  const parts = path.split("/");
  let node = tree;

  for (const part of parts) {
    if (!node || typeof node !== "object") return {};
    node = node[part];
  }

  // Return the full node, not just children
  return node || {};
}



// Exporting all functions for use in other modules//Cannot find, confirm if needs creation or not
/*
handleFileDrop - FileDropModal.jsx  
handleDragOver - FileDropModal.jsx  
handleClose - FileDropModal.jsx  
generateFileRows - RenderFolders(archive).jsx  
getExtensionIcon - SortableFolder.jsx  
renameFile - FileListDND.jsx  
deleteFile - FileListDND.jsx  
downloadFile - FileListDND.jsx  
sortFiles - FileListDND.jsx
*/

// Exporting all functions for use in other modules
export {
  normalizePath,
  extractFlatFolders,
  sortFolderKeys,
  handleRename,
  dedupeName,
  buildFolderListFromDiskTree,
  getSubfoldersAtPath,
};