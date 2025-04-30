import { useCallback, useEffect, useMemo, useState } from "react";
import useAxiosSecure from "../../hooks/AxiosSecure/useAxiosSecure";
import { message } from "antd";
import buildNestedTree from "../utils/buildNestedTree";
import { canSeeFolder } from "../shared/canSeeFolder";
import {
  extractFlatFolders,
  normalizePath,
  dedupeName,
} from "../utils/FMFunctions";
import Swal from '@/shared/swalConfig';
//import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";

function showMessage(type, content) {
  message[type](content);
}


export const useFolderManager = (projectId, userRole = "user") => {
  const axiosSecure = useAxiosSecure();

  const [folderTree, setFolderTree] = useState({});
  const [selectedPath, setSelectedPath] = useState("Project");
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // 📁 Fetch folders from disk
  const fetchFolders = useCallback(async () => {
    if (!projectId) {
      console.warn("⛔ fetchFolders called without projectId");
      return;
    }

    try {
      setLoadingFolders(true);
      console.log("📡 Fetching folder tree from disk for projectId:", projectId);
      const res = await axiosSecure.get(`/files/${projectId}/folder-tree`);
      const flatTree = res.data || {};

      const allPaths = extractFlatFolders(flatTree);
      const cleanedPaths = allPaths.map(p => 
        p.replace(/^Project\/Project/, "Project")
         .replace(/^\/+/, "")
         .replace(/\/+$/, "")
         .replace(/\/{2,}/g, "/")
      );
      
      const nestedTree = buildNestedTree(cleanedPaths);
      console.log("🌳 Built nested tree:", nestedTree);

      setFolderTree({ ...nestedTree });
    } catch (err) {
      console.error("🔥 Error fetching folder tree:", err.message);
      setFolderTree({});
    } finally {
      setLoadingFolders(false);
    }
  }, [projectId, axiosSecure]);

  // 🧭 Subfolders for current selection
const subfolders = useMemo(() => {
  const parts = selectedPath?.split("/") || [];
  let current = folderTree;
  for (const part of parts) {
    if (!current?.[part]) return {};
    current = current[part];
  }
  return current;
}, [folderTree, selectedPath]);

  
  // 📦 Create folder using centralized logic
  const createFolder = useCallback(
    async (nameOverride) => {
      let folderNameToUse = nameOverride?.trim() || newFolderName?.trim();
  
      if (!projectId || !selectedPath || !folderNameToUse) {
        console.warn("⛔ Missing required fields to create folder.");
        return;
      }
  
      const siblingNames = Object.keys(subfolders || {});
      const alreadyExists = siblingNames.includes(folderNameToUse);
  
      // 🧠 Offer fallback or rename only if it already exists
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
  
        if (isDismissed) {
          console.log("🛑 Folder creation cancelled by user.");
          return;
        }
  
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
  
          if (!renameInput.value || !renameInput.value.trim()) {
            console.log("🛑 User cancelled rename input.");
            return;
          }
  
          folderNameToUse = renameInput.value.trim();
        }
      }
  
      const fullPath = normalizePath(selectedPath, folderNameToUse);
      console.log("📤 Creating folder at path:", fullPath);
  
      try {
        await axiosSecure.post(`/files/${projectId}/folders`, {
          path: fullPath,
        });
  
        showMessage("success", "📂 Folder created successfully");
  
        // ✅ Manually update local folderTree
        const treeCopy = { ...folderTree };
        const parts = fullPath.split("/");
        let current = treeCopy;
        for (const part of parts.slice(0, -1)) {
          if (!current[part]) current[part] = {};
          current = current[part];
        }
        const folderName = parts[parts.length - 1];
        current[folderName] = {
          __meta: {
            name: fullPath,
            label: folderName,
          },
        };
  
        setFolderTree(treeCopy); // ✅ update UI manually
        setNewFolderName(""); // clear temp field
        setSelectedPath(fullPath); // move focus
  
      } catch (err) {
        console.error("🔥 Folder creation error:", err?.response?.data || err.message);
        showMessage("error", "Failed to create folder");
      }
    },
    [projectId, selectedPath, newFolderName, folderTree, subfolders, axiosSecure]
  );
  
  

// 📦 Add temporary UI folder function
const addTempUIFolder = useCallback((tempName = "New Folder") => {
  if (!selectedPath) return;

  const parts = selectedPath.split("/");
  const treeCopy = { ...folderTree };
  let current = treeCopy;

  for (const part of parts) {
    if (!current[part]) current[part] = {};
    current = current[part];
  }

  const siblingNames = Object.keys(current); // ✅ names in the current folder
  const safeName = dedupeName(tempName, siblingNames); // ✅ e.g., "New Folder (2)"
  const fullPath = normalizePath(selectedPath, safeName);

  current[safeName] = {
    __meta: {
      name: fullPath,
      label: safeName,
      isTemporary: true,
    },
  };

  setFolderTree(treeCopy);
  setSelectedPath(fullPath);
  return safeName; // ✅ Tell caller what was created
}, [folderTree, selectedPath]);



const removeTempFolder = useCallback((tempName = "New Folder", parentPath = null) => {
  const basePath = parentPath || selectedPath;
  if (!basePath || !folderTree) return;

  const parts = normalizePath(basePath).split("/");

  if (parts.length < 1) {
    console.warn("⚠️ Prevented root deletion");
    return;
  }

  const treeCopy = { ...folderTree };
  let current = treeCopy;

  for (const part of parts) {
    if (!current[part]) return;
    current = current[part];
  }

  console.log("🧹 Removing temp folder:", tempName, "from", basePath);
  delete current[tempName];
  setFolderTree(treeCopy);
}, [folderTree, selectedPath]);





  // 🗂️ Flat folder list with role-based filtering
  const folderList = useMemo(() => {
    const all = extractFlatFolders(folderTree);
    return all.filter(canSeeFolder);
  }, [folderTree]);

  // 🎯 Initial fetch on project change
  useEffect(() => {
    if (projectId) {
      console.log("🔁 useEffect: Triggering fetchFolders()");
      fetchFolders();
    }
  }, [projectId, fetchFolders]);




  return {
    folderList,
    folderContents: {}, // Reserved for future use
    folderTree,
    selectedPath,
    setSelectedPath,
    fetchFolders,
    createFolder,
    addTempUIFolder,
    removeTempFolder,
    newFolderName,
    setNewFolderName,
    loadingFolders,
    subfolders,
  };
};
