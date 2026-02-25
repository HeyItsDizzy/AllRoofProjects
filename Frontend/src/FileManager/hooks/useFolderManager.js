// useFolderManager.js
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import useAxiosSecure from "../../hooks/AxiosSecure/useAxiosSecure";
import useAxiosFile from "../../hooks/AxiosFile/useAxiosFile";
import { message } from "antd";
import buildNestedTree from "../utils/buildNestedTree";
import { isAllowed } from "../shared/permissions";
import {
  extractFlatFolders,
  normalizePath,
  dedupeName,
} from "../utils/FMFunctions";
import Swal from "../../shared/swalConfig";
import { useLiveFolderSync } from "./useLiveFolderSync";

function showMessage(type, content) {
  message[type](content);
}

export const useFolderManager = (projectId, userRole = "user", refreshKey = 0, onFileChange = null) => {
  const axiosSecure = useAxiosSecure();
  const axiosFile = useAxiosFile(); // Use file-specific axios for file operations

  const [folderTree, setFolderTree] = useState({});
  const [selectedPath, setSelectedPath] = useState("."); // default to project root
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [meta, setMeta] = useState(null);

  // Removed project fetch since meta file contains all needed info

  // 📁 Fetch folders from disk
  const fetchFolders = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoadingFolders(true);

      const res = await axiosFile.get(`/files/${projectId}/folder-tree`);
      const flatTree = res.data || {};

      let metaData = null;

      try {
        const metaRes = await axiosFile.get(`/files/${projectId}/meta`);
        metaData = metaRes.data || null;
      } catch (err) {
        console.warn("⚠️ Failed to fetch /meta directly, will fallback to folderTree['.'].__meta:", err?.message);
      }
      
      setMeta(metaData); // ✅ default to backend if it worked
      

      const allPaths = extractFlatFolders(flatTree);

      /*if (import.meta.env.DEV) {
        console.log("👀 Flattened folders (DEV):", allPaths);
      }*/

        // console.log("🙅‍♂️ Filtering folders using isAllowed() for role:", userRole);

      const cleanedPaths = allPaths.map((p) =>
        p
          .replace(/^Project\/Project/, "Project")
          .replace(/^\/+/, "")
          .replace(/\/+$/, "")
          .replace(/\/{2,}/g, "/")
      );

      const nestedTree = buildNestedTree(cleanedPaths);

// ✅ TRUST BACKEND — assume it’s already filtered
const displayTree = {
  ...flatTree,
  ".": {
    ...flatTree["."],
    __meta: {
      name: ".",
      label: "🏠 Project Root",
    },
  },
};

setFolderTree({
  ".": {
    ...flatTree,
    __meta: {
      name: ".",
      label: "🏠 Project Root",
    },
  },
});


      // ✅ Fallback to folderTree["."].__meta if no meta from /meta
if (!metaData && filteredTree["."]?.__meta) {
  console.warn("⛑️ Fallback: using meta from folderTree['.'].__meta");
  setMeta(filteredTree["."]?.__meta);
}

    } catch (err) {
      console.error("🔥 Error fetching folder tree:", err?.message);
      setFolderTree({});
    } finally {
      setLoadingFolders(false);
    }
  }, [projectId, axiosFile, userRole]);

  // ✅ Call folders when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchFolders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, refreshKey]);

  // Live sync will be initialized after folder functions are defined

  // 🧭 Subfolders of selected path
  const subfolders = useMemo(() => {
    if (!selectedPath || !folderTree["."]) return {};
  
    const parts = selectedPath === "." ? [] : selectedPath.split("/");
    let current = folderTree["."];
  
    for (const part of parts) {
      if (!current?.[part]) return {};
      current = current[part];
    }
  
    // 🧠 Strip __meta to return only subfolder entries
    return Object.entries(current || {}).reduce((acc, [key, value]) => {
      if (key !== "__meta") acc[key] = value;
      return acc;
    }, {});
  }, [folderTree, selectedPath]);
  
  

const createFolder = useCallback(
  async (nameOverride) => {
    let folderNameToUse = nameOverride?.trim() || newFolderName?.trim();
    if (!projectId || !selectedPath || !folderNameToUse) return;

    const siblingNames = Object.keys(subfolders || {});
    const alreadyExists = siblingNames.includes(folderNameToUse);

    if (alreadyExists) {
      const suggested = dedupeName(folderNameToUse, siblingNames);

      const { isConfirmed, isDismissed, isDenied } = await Swal.fire({
        icon: "warning",
        title: `Folder "${folderNameToUse}" already exists`,
        text: `Do you want to create "${suggested}" instead?`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: `Yes, use "${suggested}"`,
        denyButtonText: "Rename manually",
        cancelButtonText: "Cancel",
      });

      if (isDismissed) return;

      if (isConfirmed) {
        folderNameToUse = suggested;
      }

      if (isDenied) {
        const renameInput = await Swal.fire({
          title: "Rename Folder",
          input: "text",
          inputValue: folderNameToUse,
          showCancelButton: true,
        });

        if (!renameInput.value || !renameInput.value.trim()) return;

        folderNameToUse = renameInput.value.trim();
      }
    }

    const fullPath = normalizePath(selectedPath, folderNameToUse);
    console.log("📤 Creating folder at path:", fullPath);

    if (!fullPath || typeof fullPath !== "string") {
      console.warn("⚠️ Invalid fullPath:", fullPath);
      showMessage("error", "Cannot create folder — path was invalid.");
      return;
    }

    try {
      await axiosSecure.post(`/files/${projectId}/folders`, {
        path: fullPath,
      });

      showMessage("success", "📂 Folder created successfully");

      // 📡 REMOVED: Let ghost folders handle UI updates instead
      // notifyFolderChange({
      //   type: 'folder created',
      //   fileName: folderNameToUse,
      //   relativePath: fullPath,
      //   isFolder: true
      // });

      // ─── AUTO‐UPDATE .meta.json ACL & STRUCTURE ────────────────────────
      if (meta) {
        // 1) Determine creator ACL: always Admin + creator’s role
        const newAllowed = ["Admin"];
        if (userRole === "User")      newAllowed.push("User");
        else if (userRole === "Estimator") newAllowed.push("Estimator");
        else if (userRole === "Admin")     newAllowed.push("User", "Estimator");

        // 2) Build updated meta object
        const updatedMeta = {
          ...meta,
          structure: [...(meta.structure || []), folderNameToUse],
          allowedRoles: {
            ...meta.allowedRoles,
            [folderNameToUse]: newAllowed,
          },
        };

        // 3) Persist it
        await axiosSecure.put(`/files/${projectId}/meta`, updatedMeta);

        // 4) Refresh local state
        setMeta(updatedMeta);
      }


      // ✅ Let the disk watcher / syncFromDisk handle the UI update
      setNewFolderName("");
      // DON'T auto-navigate into created folder - stay in current directory
      // setSelectedPath(fullPath);
    } catch (err) {
      console.error("🔥 Folder creation error:", err?.response?.data || err.message);
      showMessage("error", "Failed to create folder");
    }
  },
  [projectId, selectedPath, newFolderName, subfolders, axiosSecure]
);


const addTempUIFolder = useCallback(
  (tempName = "New Folder") => {
    if (!selectedPath) return;

    const parts = selectedPath === "." ? [] : selectedPath.split("/");
    const treeCopy = { ...folderTree };
    let current = treeCopy["."]; // 🌱 always start from root

    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    const siblingNames = Object.keys(current);
    const safeName = dedupeName(tempName, siblingNames);

    // 🛡️ PREVENT DUPLICATE: only if not already in UI
    if (current[safeName]) {
      console.log("⛔ Folder already exists in UI:", safeName);
      return;
    }

    const fullPath = normalizePath(selectedPath, safeName);

    current[safeName] = {
      __meta: {
        name: fullPath,
        label: safeName,
        isTemporary: true,
      },
    };

    setFolderTree(treeCopy);
    // DON'T auto-navigate into temp folder - stay in current directory
    // setSelectedPath(fullPath);
    return safeName;
  },
  [folderTree, selectedPath]
);

// 📡 Add ghost folder to any specific path (for live sync)
const addGhostFolderToPath = useCallback(
  (folderName, targetPath = ".") => {
    const parts = targetPath === "." ? [] : targetPath.split("/");
    const treeCopy = { ...folderTree };
    let current = treeCopy["."]; // 🌱 always start from root

    // Navigate to target path
    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }

    // Check if folder already exists - PREVENT DUPLICATES
    if (current[folderName]) {
      console.log("⛔ Folder already exists in UI:", folderName, "at path:", targetPath);
      console.log("� Live sync: Skipping duplicate folder creation");
      return folderName; // Return early without updating state
    }

    const fullPath = normalizePath(targetPath, folderName);

    current[folderName] = {
      __meta: {
        name: fullPath,
        label: folderName,
        isTemporary: true,
        isFromLiveSync: true, // Mark as coming from live sync
      },
    };

    setFolderTree(treeCopy);
    console.log(`📁 Added ghost folder "${folderName}" to path "${targetPath}"`);
    return folderName;
  },
  [folderTree]
);

  
  const removeTempFolder = useCallback(
    (tempName = "New Folder", parentPath = null) => {
      const basePath = parentPath || selectedPath;
      if (!basePath || !folderTree) return;
  
      const parts = basePath === "." ? [] : basePath.split("/");
      const treeCopy = { ...folderTree };
      let current = treeCopy["."];
  
      for (const part of parts) {
        if (!current[part]) return;
        current = current[part];
      }
  
      delete current[tempName];
      setFolderTree(treeCopy);
    },
    [folderTree, selectedPath]
  );
  
  const renameTempFolder = (oldName, newName, parentPath = ".") => {
    setFolderTree(prev => {
      const updated = { ...prev };
      let current = updated["."]; // root of the tree
  
      const parts = parentPath === "." ? [] : parentPath.split("/");
  
      for (const part of parts) {
        if (!current?.[part]) {
          console.warn("⛔ renameTempFolder: parent path missing", parentPath);
          return prev;
        }
        current = current[part];
      }
  
      if (!current?.[oldName]) {
        console.warn("⛔ renameTempFolder: target folder missing", oldName);
        return prev;
      }
  
      const folderData = current[oldName];
      delete current[oldName];
      current[newName] = folderData;
  
      console.log(`✅ UI renameTempFolder: ${parentPath}/${oldName} → ${newName}`);
      return updated;
    });
  };
  
  // 🔄 Live folder sync - Using ghost folder system for efficient updates
  const processedEventsRef = useRef(new Set());
  const addGhostFolderRef = useRef(addGhostFolderToPath);
  const removeTempFolderRef = useRef(removeTempFolder);
  const fetchFoldersRef = useRef(fetchFolders);
  
  // Compute project display name from meta data (simplified)
  const projectDisplayName = useMemo(() => {
    // Try different meta field combinations
    if (meta?.projectName) return meta.projectName;
    if (meta?.projectNumber && meta?.projectName) return `${meta.projectNumber} - ${meta.projectName}`;
    if (meta?.project_name) return meta.project_name;
    if (meta?.projectNumber && meta?.name) return `${meta.projectNumber} - ${meta.name}`;
    if (meta?.project_number && meta?.project_name) return `${meta.project_number} - ${meta.project_name}`;
    if (meta?.number && meta?.name) return `${meta.number} - ${meta.name}`;
    if (meta?.name) return meta.name;
    
    // Fallback to project ID
    return `Project ${projectId?.slice(-8) || 'Unknown'}`;
  }, [meta, projectId]);
  
  // Update refs when functions change
  useEffect(() => {
    addGhostFolderRef.current = addGhostFolderToPath;
    removeTempFolderRef.current = removeTempFolder;
    fetchFoldersRef.current = fetchFolders;
  }, [addGhostFolderToPath, removeTempFolder, fetchFolders]);
  
  const handleLiveFolderChange = useCallback((changeData) => {
    console.log('🔄 Live folder change detected:', changeData);
    
    // Create a unique key for this event to prevent duplicates
    const eventKey = `${changeData.type}-${changeData.relativePath}-${changeData.isFolder}-${changeData.timestamp}`;
    
    // Check if we've already processed this exact event
    if (processedEventsRef.current.has(eventKey)) {
      console.log('⏭️ Skipping duplicate event:', eventKey);
      return;
    }
    
    // Add to processed events and remove after 2 seconds
    processedEventsRef.current.add(eventKey);
    setTimeout(() => {
      processedEventsRef.current.delete(eventKey);
    }, 2000);

    // Handle file changes (modified, added, removed)
    if (!changeData.isFolder) {
      console.log(`📄 Live sync: File "${changeData.type}" - ${changeData.fileName}`);
      console.log(`📄 File path: ${changeData.relativePath}`);
      console.log(`📞 onFileChange callback type:`, typeof onFileChange);
      console.log(`📞 onFileChange callback exists:`, !!onFileChange);
      
      // Call the file change callback if provided
      if (typeof onFileChange === 'function') {
        console.log('✅ Calling onFileChange callback for file update...');
        onFileChange(changeData);
        console.log('✅ onFileChange callback completed');
      } else {
        console.log('⚠️ No onFileChange callback provided - user must manually refresh');
        // No automatic fallback - let user manually refresh if needed
      }
      return;
    }
    
    // Use ghost folder system for efficient UI updates
    if (changeData.isFolder && changeData.type === 'folder added') {
      // Extract folder name and parent path from relativePath
      const relativePath = changeData.relativePath || '';
      const pathParts = relativePath.split('/').filter(part => part.length > 0);
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/') || '.';
      
      console.log(`📁 Live sync: Adding folder "${folderName}" to path "${parentPath}"`);
      console.log(`📁 Full relative path: "${relativePath}"`);
      
      // Add the folder to UI using ghost system at the correct path
      addGhostFolderRef.current(folderName, parentPath);
    }
    
    // Handle folder removed events
    if (changeData.isFolder && changeData.type === 'folder removed') {
      // Extract folder name and parent path from relativePath
      const relativePath = changeData.relativePath || '';
      const pathParts = relativePath.split('/').filter(part => part.length > 0);
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/') || '.';
      
      console.log(`🗑️ Live sync: Removing folder "${folderName}" from path "${parentPath}"`);
      console.log(`🗑️ Full relative path: "${relativePath}"`);
      
      // Remove the folder from UI using ghost system
      removeTempFolderRef.current(folderName, parentPath);
    }
  }, [onFileChange]); // Remove fetchFolders dependency - use ref instead

  const { isConnected: isLiveSyncConnected, notifyFolderChange } = useLiveFolderSync({
    projectId,
    projectName: projectDisplayName,
    onFolderChange: handleLiveFolderChange,
    enabled: true // Re-enabled with ghost folder integration
  });

  const folderList = useMemo(() => {
    return extractFlatFolders(folderTree);
  }, [folderTree]);
  

  return {
    folderTree,
    selectedPath,
    setSelectedPath,
    fetchFolders,
    createFolder,
    addTempUIFolder,
    addGhostFolderToPath,
    removeTempFolder,
    renameTempFolder,
    newFolderName,
    setNewFolderName,
    loadingFolders,
    subfolders,
    folderList,
    meta,
    isLiveSyncConnected,
    notifyFolderChange,
  };
};
