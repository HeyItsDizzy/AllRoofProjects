// useFolderManager.js
import { useCallback, useEffect, useMemo, useState } from "react";
import useAxiosSecure from "../../hooks/AxiosSecure/useAxiosSecure";
import { message } from "antd";
import buildNestedTree from "../utils/buildNestedTree";
import { isAllowed } from "../shared/permissions";
import {
  extractFlatFolders,
  normalizePath,
  dedupeName,
} from "../utils/FMFunctions";
import Swal from "@/shared/swalConfig";

function showMessage(type, content) {
  message[type](content);
}

export const useFolderManager = (projectId, userRole = "user", refreshKey = 0) => {
  const axiosSecure = useAxiosSecure();

  const [folderTree, setFolderTree] = useState({});
  const [selectedPath, setSelectedPath] = useState("."); // default to project root
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [meta, setMeta] = useState(null);

  // 📁 Fetch folders from disk
  const fetchFolders = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoadingFolders(true);

      const res = await axiosSecure.get(`/files/${projectId}/folder-tree`);
      const flatTree = res.data || {};

      let metaData = null;

      try {
        const metaRes = await axiosSecure.get(`/files/${projectId}/meta`);
        metaData = metaRes.data || null;
      } catch (err) {
        console.warn("⚠️ Failed to fetch /meta directly, will fallback to folderTree['.'].__meta:", err?.message);
      }
      
      setMeta(metaData); // ✅ default to backend if it worked
      

      const allPaths = extractFlatFolders(flatTree);

      /*if (import.meta.env.DEV) {
        console.log("👀 Flattened folders (DEV):", allPaths);
      }*/

        console.log("🙅‍♂️ Filtering folders using isAllowed() for role:", userRole);

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
  }, [projectId, axiosSecure, userRole]);

  // ✅ Call only once per projectId change
  useEffect(() => {
    if (projectId) {
      fetchFolders();
    }
  }, [projectId, refreshKey]); // ✅ now reacts to refreshKey

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
      setSelectedPath(fullPath);
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
    setSelectedPath(fullPath);
    return safeName;
  },
  [folderTree, selectedPath]
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
    removeTempFolder,
    renameTempFolder,
    newFolderName,
    setNewFolderName,
    loadingFolders,
    subfolders,
    folderList,
    meta,
  };
};
