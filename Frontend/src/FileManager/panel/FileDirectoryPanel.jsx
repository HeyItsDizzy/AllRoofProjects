import { useState, useRef } from "react";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import FolderSidebar from "./FolderSidebar";
import FolderContents from "./FolderContents";
import buildNestedTree from "@/FileManager/utils/buildNestedTree";
import { getSubfoldersAtPath, normalizePath } from "../utils/FMFunctions";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import { useFolderManager } from "@/FileManager/hooks/useFolderManager";



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
  fetchFolders,
  subfolders,
  loadingFolders,
  userRole,
  onDropFiles = () => {},
}) => {
  const axiosSecure = useAxiosSecure();
  const folderListRef = useRef(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  //console.log("📁 folderList", folderList);

  
  //const folderTree = buildNestedTree(folderList);


  if (!folderList?.length || !folderTree || Object.keys(folderTree).length === 0)
    {
    return (
      <div className="p-4 text-sm text-center text-gray-500">
        🚫 No folders or files to display.<br />
        Please sync from disk or check your project setup.
      </div>
    );
  }
 

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onDropFiles(droppedFiles);
    }
  };
 
  //Does Not work to display subfolders at all
  const rawSubfolders = getSubfoldersAtPath(folderTree, selectedPath) || {};
  const currentSubfolders = Object.fromEntries(
    Object.entries(rawSubfolders).filter(([key]) => key !== "__meta")
  ); //*/

  const currentFolderContents = folderContents[selectedPath] || [];
  
  
  return (
    <div
      className="file-panel-wrapper min-h-[300px] max-h-[600px] flex border rounded-md overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Left Sidebar */}
      <div className="folder-sidebar w-1/3 bg-gray-50 border-r p-4 space-y-2 overflow-y-auto">
      <FolderSidebar
  folderTree={folderTree}
  folders={folderList}
  selectedPath={selectedPath}
  setSelectedPath={setSelectedPath}
  newFolderName={newFolderName}
  setNewFolderName={setNewFolderName}
  userRole={userRole}
  folderListRef={folderListRef}
  loadingFolders={loadingFolders}
  addTempUIFolder={addTempUIFolder}
  removeTempFolder={removeTempFolder}
  createFolder={createFolder}
/>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 w-full p-3 ...">

      <FolderContents
        selectedPath={selectedPath}
        subfolders={currentSubfolders}
        folderContents={{ [selectedPath]: currentFolderContents }}
        setSelectedPath={setSelectedPath}
        setIsEditModalOpen={setIsEditModalOpen}
        onDropFiles={onDropFiles}
      />
      </div>
    </div>
  );
};

export default FileDirectoryPanel;
