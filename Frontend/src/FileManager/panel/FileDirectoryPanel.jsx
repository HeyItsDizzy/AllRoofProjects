// src/FileManager/panel/FileDirectoryPanel.jsx
import { useState, useRef, useEffect , useContext} from "react";
import Swal from '../../shared/swalConfig';
import FolderSidebar from "./FolderSidebar";
import FolderContents from "./FolderContents";
import { getSubfoldersAtPath, isVisibleFolderKey, renameFolderPath, getLiveFileNames, downloadToZIP } from "../utils/FMFunctions";
import useAxiosSecure from "../../hooks/AxiosSecure/useAxiosSecure";           
import { IconDelete, IconSidebarMenu, IconDownload  } from "../../shared/IconSet.jsx"; 
import UploadButton from "../components/UploadButton";

const FileDirectoryPanel = ({
  folderTree,
  folderList,
  folderContents = {},
  selectedPath,
  setSelectedPath,
  newFolderName,
  setNewFolderName,
  createFolder,
  addTempUIFolder,
  removeTempFolder,
  renameTempFolder,
  fetchFolders,
  meta,
  loadingFolders,
  userRole,
  onDropFiles = () => {},
  editable = false,
  uploadEnabled = false,
  projectId,
  files,
  setFiles,
  ghostFilesByPath,
  setGhostFilesByPath,
}) => {
  const axiosSecure = useAxiosSecure();
  const folderListRef = useRef(null);
  const panelRef = useRef(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lockedHeight, setLockedHeight] = useState(null);

  const normalizedSelectedPath = selectedPath === '.' ? '.' : selectedPath.replace(/^\.\/+/, '');
  //const diskFiles = folderContents?.[normalizedSelectedPath]?.__files || [];

 const [uiDiskFilesByPath, setUiDiskFilesByPath] = useState({});


  // ─── Build contents based on meta.structure & allowedRoles ─────────────
  const rawSubfolders = getSubfoldersAtPath(folderTree, normalizedSelectedPath) || {};
  
  // Compute files for the current selected path from ghost system
  const diskFiles = rawSubfolders?.__files || [];
  const currentPathFiles = getLiveFileNames({
    selectedPath: normalizedSelectedPath,
    ghostFilesByPath,
    diskFileNames: diskFiles,
  });
  const allKeys = Object.keys(rawSubfolders).filter((k) => k !== "__meta" && k !== "__files");

  // For root level, only show folders that are in meta.structure AND allowed for this role
  // For non-root levels, show all folders except those starting with "."
  const allowedFolders = allKeys.filter((name) => {
    // Always hide dot folders
    if (name.startsWith(".")) return false;
    
    // For root level (selectedPath === "."), use strict ACL
    if (normalizedSelectedPath === ".") {
      if (!meta.structure.includes(name)) return false;
      return (meta.allowedRoles[name] || []).includes(userRole);
    }
    
    // For non-root levels, show all folders (user-created folders should be visible)
    return true;
  });

  // Rehydrate currentSubfolders as an object for FolderContents
  const currentSubfolders = Object.fromEntries(
    allowedFolders.map((name) => [name, rawSubfolders[name]])
  );


/*console.log("🗂️ [FDPANEL] selectedPath:", normalizedSelectedPath);
console.log("🗂️ [FDPANEL] folderNode/rawSubfolders:", rawSubfolders);
console.log("🗂️ [FDPANEL] diskFiles:", diskFiles);
console.log("🗂️ [FDPANEL] setUiDiskFilesByPath:", uiDiskFilesByPath);
console.log("🗂️ [FDPANEL] ghostFilesByPath:", ghostFilesByPath[normalizedSelectedPath]);
console.log("🗂️ [FDPANEL] liveFiles (merged):", liveFiles);*/

  const handleRename = async (path) => {
    const oldName = path.split("/").pop();
    const parentPath = path.split("/").slice(0, -1).join("/") || ".";
    // root-level folders that no non-Admin may delete:
    const protectedRootFolders = ["Admin", "BOQ", "Estimator", "Scope"];
    const isRootLevel = parentPath === ".";

    if (path === "." || (isRootLevel && protectedRootFolders.includes(oldName))) {
      await Swal.fire("Restricted", `Cannot rename ${oldName}`, "warning");
      return;
    }

    const { value: newName } = await Swal.fire({
      title: "Rename Folder",
      input: "text",
      inputValue: oldName,
      showCancelButton: true,
      confirmButtonText: "Rename",
    });

    if (!newName || newName === oldName) return;

    try {
      await renameFolderPath({
        projectId,
        axiosSecure,
        folderPath: path,
        newName,
        onSuccess: () => renameTempFolder(oldName, newName, parentPath),
      });
      Swal.fire("Renamed", `Renamed to ${newName}`, "success");
    } catch (err) {
      console.error("Rename error:", err);
      Swal.fire("Error", "Rename failed", "error");
    }
  };

  const handleDelete = async (path) => {
    const folderName = path.split("/").pop();
    const parentPath = path.split("/").slice(0, -1).join("/") || ".";
    const isRootLevel = parentPath === ".";

   // Only these core root folders are ever non-deletable:
   const protectedRoots = ["BOQ", "Admin", "Estimator", "Scope"];

    // 2) Block deleting the root itself, or any root folder this role lacks access to
   if (
     path === "." ||
     (isRootLevel && protectedRoots.includes(folderName) && userRole !== "Admin")
   ) {
      await Swal.fire("Restricted", `Cannot delete ${folderName}`, "warning");
      return;
    }

    // 3) Confirm deletion
    const confirm = await Swal.fire({
      icon: "warning",
      title: `Delete "${folderName}"?`,
      text: "All nested files and folders will also be deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });
    if (!confirm.isConfirmed) return;

    // 4) Perform delete
    try {
      console.log("🗑️ [DELETE] Attempting to delete folder:");
      console.log("  - Original path:", path);
      console.log("  - Encoded path:", encodeURIComponent(path));
      console.log("  - Full URL:", `/files/${projectId}/folders/${encodeURIComponent(path)}`);
      console.log("  - Project ID:", projectId);
      
      const response = await axiosSecure.delete(
        `/files/${projectId}/folders/${encodeURIComponent(path)}`
      );
      
      console.log("✅ [DELETE] Folder deletion successful:", response.data);
      removeTempFolder(folderName, parentPath);
      Swal.fire("Deleted", `"${folderName}" has been removed.`, "success");
    } catch (err) {
      console.error("❌ [DELETE] Folder deletion failed:");
      console.error("  - Error object:", err);
      console.error("  - Response status:", err.response?.status);
      console.error("  - Response data:", err.response?.data);
      console.error("  - Request URL:", err.config?.url);
      console.error("  - Request method:", err.config?.method);
      
      // Extract detailed error information
      const errorData = err.response?.data;
      const statusCode = err.response?.status;
      const errorMessage = errorData?.error || "Unknown error";
      const errorDetails = errorData?.details || err.message;
      
      let userMessage = "Failed to delete folder";
      let swalIcon = "error";
      
      // Provide specific error messages based on status code and error type
      switch (statusCode) {
        case 404:
          if (errorData?.requestedPath) {
            userMessage = `Folder not found: "${errorData.requestedPath}"`;
            console.error("❌ [DELETE] Path issue - Requested:", errorData.requestedPath);
            console.error("❌ [DELETE] Full disk path:", errorData.fullDiskPath);
            console.error("❌ [DELETE] Project base path:", errorData.projectBasePath);
          } else {
            userMessage = "Folder or project not found";
          }
          break;
          
        case 403:
          userMessage = `Cannot delete protected folder: "${folderName}"`;
          swalIcon = "warning";
          break;
          
        case 400:
          if (errorMessage.includes("not a folder")) {
            userMessage = `"${folderName}" is not a folder`;
          } else if (errorMessage.includes("Missing folder path")) {
            userMessage = "Invalid folder path provided";
            console.error("❌ [DELETE] Path parameter issue - received params:", errorData?.receivedParams);
          } else {
            userMessage = `Invalid request: ${errorMessage}`;
          }
          break;
          
        case 409:
          userMessage = `Folder "${folderName}" is in use or not empty`;
          break;
          
        case 500:
          if (errorData?.errorCode) {
            userMessage = `Server error (${errorData.errorCode}): ${errorMessage}`;
          } else {
            userMessage = `Server error: ${errorMessage}`;
          }
          break;
          
        default:
          userMessage = `${errorMessage}: ${errorDetails}`;
      }
      
      // Show detailed error in Swal
      Swal.fire({
        icon: swalIcon,
        title: "Delete Failed",
        text: userMessage,
        footer: process.env.NODE_ENV === 'development' ? 
          `Status: ${statusCode} | Path: ${path} | Details: ${errorDetails}` : 
          null
      });
    }
  };


  useEffect(() => {
    if (loadingFolders && panelRef.current) {
      setLockedHeight(panelRef.current.offsetHeight);
    } else {
      setLockedHeight(null);
    }
  }, [loadingFolders]);

  if (loadingFolders) return <div className="p-4 text-gray-500 text-sm italic">📂 Loading folder structure...</div>;
  if (!folderTree?.["."] || Object.keys(folderTree["."]).filter(k => k !== "__meta").length === 0)
    return <div className="p-4 text-sm text-center text-gray-500">🚫 No folders or files to display.</div>;

  return (
    <div className="flex flex-col min-h-[400px] border rounded-md overflow-hidden bg-white relative">
      {/* Mobile-only top bar with menu button and current folder */}
      <div className="flex items-center gap-3 px-3 py-2 border-b bg-white sm:hidden">
        <button
          aria-label={isDrawerOpen ? "Close Folders Menu" : "Open Folders Menu"}
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <IconSidebarMenu className="text-xl text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-gray-800 truncate block">
            📁 {normalizedSelectedPath === '.' ? 'Project Root' : normalizedSelectedPath.split('/').pop()}
          </span>
          <span className="text-xs text-gray-500">
            Tap menu to navigate folders
          </span>
        </div>
        {/* Download ZIP Button */}
        <button
          title={`Download ${normalizedSelectedPath === '.' ? 'Project Root' : normalizedSelectedPath.split('/').pop()} as ZIP`}
          aria-label="Download as ZIP"
          className="border border-green-500 text-green-600 px-2 py-1 rounded-md text-xs hover:bg-green-50 transition-colors flex items-center gap-1"
          onClick={() => downloadToZIP({ axiosSecure, selectedPath: normalizedSelectedPath, projectId })}
        >
          <IconDownload size={16} className="text-green-500" />
          ZIP
        </button>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <div className="hidden sm:flex w-1/3 bg-gray-50 border-r flex-col justify-between">
          <div className="p-4 overflow-y-auto">
           <FolderSidebar
             folderTree={folderTree}
             meta={meta}
             userRole={userRole}
             selectedPath={normalizedSelectedPath}
             setSelectedPath={setSelectedPath}
             addTempUIFolder={addTempUIFolder}
             removeTempFolder={removeTempFolder}
             createFolder={createFolder}
             editable={editable}
             handleRename={handleRename}
             handleDelete={handleDelete}
             setNewFolderName={setNewFolderName}
             newFolderName={newFolderName}
           />
          </div>
        </div>

        {/* Sidebar Drawer Mobile - CONTAINED WITHIN PANEL */}
        <div 
          className={`sm:hidden bg-gray-50 border-r flex-col transition-all duration-300 ease-in-out overflow-hidden ${
            isDrawerOpen ? 'w-72 flex' : 'w-0'
          }`}
        >
          {isDrawerOpen && (
            <div className="flex flex-col h-full min-w-0">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-3 border-b bg-gray-100 flex-shrink-0">
                <h3 className="font-semibold text-sm text-gray-800">Folders</h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-md hover:bg-gray-200 transition-colors flex-shrink-0"
                  aria-label="Close menu"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-3">
                <FolderSidebar
                  folderTree={folderTree}
                  folders={folderList}
                  selectedPath={normalizedSelectedPath}
                  setSelectedPath={(path) => {
                    setSelectedPath(path);
                    setIsDrawerOpen(false); // Close drawer when folder is selected
                  }}
                  newFolderName={newFolderName}
                  setNewFolderName={setNewFolderName}
                  userRole={userRole}
                  folderListRef={folderListRef}
                  loadingFolders={loadingFolders}
                  addTempUIFolder={addTempUIFolder}
                  removeTempFolder={removeTempFolder}
                  createFolder={createFolder}
                  meta={meta}
                  editable={editable}
                  handleRename={handleRename}
                  handleDelete={handleDelete}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 overflow-y-auto min-w-0">
          <FolderContents
            selectedPath={normalizedSelectedPath}
            subfolders={currentSubfolders}
            folderTree={folderTree}
            setSelectedPath={setSelectedPath}
            setIsEditModalOpen={setIsEditModalOpen}
            onDropFiles={onDropFiles}
            axiosSecure={axiosSecure}
            projectId={projectId}
            editable={editable}
            files={currentPathFiles}
            folderContents={folderContents}
            ghostFilesByPath={ghostFilesByPath}
            setGhostFilesByPath={setGhostFilesByPath}
            setFiles={setFiles}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-3 bg-white flex justify-between items-center">
        {editable && (
          <div
            onDrop={(e) => {
              e.preventDefault();
              const payload = e.dataTransfer.getData("application/json");
              if (!payload) return;
              const { paths } = JSON.parse(payload);
              handleDelete(paths);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-2 bg-gray-100 rounded-lg shadow px-3 py-1 border border-gray-300 text-gray-600 cursor-pointer"
          >
            <IconDelete size={26} />
            <span className="font-semibold">Drop here to Delete</span>
          </div>
        )}

        <UploadButton
          key={`upload-${normalizedSelectedPath}`}
          selectedPath={normalizedSelectedPath}
          projectId={projectId}
          axiosSecure={axiosSecure}
          setFiles={setFiles}
          setGhostFilesByPath={setGhostFilesByPath}
          liveFiles={files}
          uploadEnabled={uploadEnabled}
          ghostFilesByPath={ghostFilesByPath}
        />
      </div>
    </div>
  );
};

export default FileDirectoryPanel;
