import React, { useState, useEffect, useRef, useContext } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { IconUp, IconNewFolder } from "../../shared/IconSet.jsx";
import { sortFolderKeys, normalizePath, isVisibleFolderKey, } from "../utils/FMFunctions";
import renderTree from "../utils/renderTree";
import Swal from '../../shared/swalConfig';
//import Swal from "sweetalert2";
import { AuthContext } from "../../auth/AuthProvider";

import debounce from "lodash.debounce";
const debouncedLog = debounce((...args) => {console.log(...args);}, 300);


/**
 * FolderSidebar
 * Renders left panel of folder tree, handles drag & drop and folder creation.
 */
const FolderSidebar = ({
  folderTree = {},
  folders = [],
  selectedPath,
  setSelectedPath,
  newFolderName,
  setNewFolderName,
  addTempUIFolder,
  removeTempFolder,
  createFolder,
  folderListRef,
  loadingFolders,
  onMoveFolder = () => {},
  meta,
  editable = false,
  handleRename = () => {},
  handleDelete = () => {},

}) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  useEffect(() => {
    setExpandedFolders((prev) => ({ ...prev, ".": true }));
  }, []);
  

  const sensors = useSensors(useSensor(PointerSensor));
  const folderRefs = useRef({});
  const folderDepth = selectedPath.split("/").length;

  const toggleExpand = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  useEffect(() => {
    if (!selectedPath) return;
    const segments = selectedPath.split("/");
    const expandedPath = {};
    for (let i = 1; i <= segments.length; i++) {
      const partial = segments.slice(0, i).join("/");
      expandedPath[partial] = true;
    }
    setExpandedFolders((prev) => ({
      ...prev,
      ...expandedPath,
    }));
  }, [selectedPath]);

  useEffect(() => {
    const el = folderRefs.current[selectedPath];
    if (el && el.scrollIntoView) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: folderDepth <= 2 ? "start" : "center",
      });
    }
  }, [selectedPath]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onMoveFolder(active.id, over.id);
  };

  const scrollContainerRef = useRef();

  // inside the component body, before your ACL block:
  const { user } = useContext(AuthContext);
  const role = user?.role;


  // ─── ACL via meta.structure & meta.allowedRoles ──────────────────────────
  // Only keep folders listed in meta.structure and allowed for this role
  const visibleRootFolders = (meta.structure || []).filter((name) =>
    (meta.allowedRoles[name] || []).includes(role)
  );

  // Rebuild a tiny tree containing only those folders
  const filteredTree = {
    ".": visibleRootFolders.reduce((acc, name) => {
      if (folderTree["."]?.[name]) acc[name] = folderTree["."][name];
      return acc;
    }, {}),
  };

  // debouncedLog("🔒 FolderSidebar role:", role);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Folders</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (selectedPath) {
                const parts = selectedPath.split("/").filter(Boolean);
                parts.pop();
                const newPath = parts.length === 0 ? "." : parts.join("/");
                setSelectedPath(newPath);
              }
              
            }}
            title="Go up one level"
            className="p-1 rounded hover:bg-gray-100"
          >
            <IconUp size={18} />
          </button>

          <button
  onClick={async () => {
    const tempName = "New Folder";
    const parentPath = selectedPath; // store before it changes
    const createdTempName = addTempUIFolder(tempName); // ✅ track actual name
    

    const { value: folderName } = await Swal.fire({
      title: "Name Your New Folder",
      input: "text",
      inputPlaceholder: "Enter folder name",
      showConfirmButton: true,
      showCancelButton: true,
    });

    if (folderName && folderName.trim()) {
      const finalName = folderName.trim();
      setNewFolderName(finalName);
    
      // Save to disk
      await createFolder(finalName);
    
      // ✅ Reflect new folder instantly
      addTempUIFolder(finalName);
    
      // ✅ Remove ghost
      removeTempFolder(createdTempName, parentPath);
    
    

      
    } else {
      await Swal.fire({
        icon: "info",
        title: "Cancelled",
        text: "Folder creation cancelled",
      });
      
      // ✅ Instantly remove 'New Folder' from UI
      removeTempFolder(createdTempName, parentPath); // 💥 use parent path
      setSelectedPath(parentPath);


      
    }
  }}
  title="Add Folder"
  className="p-1 rounded hover:bg-gray-100"
>
  <IconNewFolder size={20} />
</button>

        </div>
      </div>

      {/* Folder Tree */}


<div
  ref={scrollContainerRef}
  className="flex-1 overflow-y-auto overflow-x-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
>

        <div className="min-w-max">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-1">


            {renderTree(
              filteredTree,  // now driven by meta.Structure & allowedRoles
              expandedFolders,
              selectedPath,
              setSelectedPath,
              toggleExpand,
              0,
              folderRefs,
              role,
              meta,
              ".",            // parentPath
              editable,       
              handleRename,   
              handleDelete,    
              scrollContainerRef
            )}

            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default FolderSidebar;
