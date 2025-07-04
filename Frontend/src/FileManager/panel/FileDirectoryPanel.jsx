// FileDirectoryPanel.jsx
import { useState, useRef, useEffect } from "react";
import Swal from '@/shared/swalConfig';
import FolderSidebar from "./FolderSidebar";
import FolderContents from "./FolderContents";
import { getSubfoldersAtPath, isVisibleFolderKey, renameFolderPath, getLiveFileNames } from "../utils/FMFunctions";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";           
import { IconDelete } from "@/shared/IconSet.jsx"; 
import UploadButton from "@/FileManager/components/UploadButton";

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
}) => {
  const axiosSecure = useAxiosSecure();
  const folderListRef = useRef(null);
  const panelRef = useRef(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [lockedHeight, setLockedHeight] = useState(null);

  const [ghostFilesByPath, setGhostFilesByPath] = useState({});
  const [files, setFiles] = useState([]);

  const normalizedSelectedPath = selectedPath === '.' ? '.' : selectedPath.replace(/^\.\/+/, '');
  //const diskFiles = folderContents?.[normalizedSelectedPath]?.__files || [];

 const [uiDiskFilesByPath, setUiDiskFilesByPath] = useState({});


  const rawSubfolders = getSubfoldersAtPath(folderTree, normalizedSelectedPath) || {};
  const diskFiles = rawSubfolders?.__files || [];

    const liveFiles = getLiveFileNames({
    selectedPath: normalizedSelectedPath,
    ghostFilesByPath,
    diskFileNames: diskFiles,
  });

  const currentSubfolders = Object.fromEntries(
    Object.entries(rawSubfolders).filter(([key]) => key !== "__meta")
  );

console.log("🗂️ [FDPANEL] selectedPath:", normalizedSelectedPath);
console.log("🗂️ [FDPANEL] folderNode/rawSubfolders:", rawSubfolders);
console.log("🗂️ [FDPANEL] diskFiles:", diskFiles);
console.log("🗂️ [FDPANEL] setUiDiskFilesByPath:", uiDiskFilesByPath);
console.log("🗂️ [FDPANEL] ghostFilesByPath:", ghostFilesByPath[normalizedSelectedPath]);
console.log("🗂️ [FDPANEL] liveFiles (merged):", liveFiles);

  const handleRename = async (path) => {
    const oldName = path.split("/").pop();
    const parentPath = path.split("/").slice(0, -1).join("/") || ".";
    const protectedRootFolders = ["Admin", "BOQ", "Estimator"];
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
    const protectedRootFolders = ["Admin", "BOQ", "Estimator"];
    const isRootLevel = parentPath === ".";

    if (path === "." || (isRootLevel && protectedRootFolders.includes(folderName))) {
      await Swal.fire("Restricted", `Cannot delete ${folderName}`, "warning");
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: `Delete "${folderName}"?`,
      text: "All nested files and folders will also be deleted.",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axiosSecure.delete(`/files/${projectId}/folders/${encodeURIComponent(path)}`);
      removeTempFolder(folderName, parentPath);
      Swal.fire("Deleted", `"${folderName}" has been removed.`, "success");
    } catch (err) {
      console.error("❌ Folder delete failed:", err);
      Swal.fire("Error", "Failed to delete folder", "error");
    }
  };

useEffect(() => {
  const rawSubfolders = getSubfoldersAtPath(folderTree, normalizedSelectedPath) || {};
  const diskFiles = rawSubfolders?.__files || [];
  setFiles(
    getLiveFileNames({
      selectedPath: normalizedSelectedPath,
      ghostFilesByPath,
      diskFileNames: diskFiles,
    })
  );
  // ⬇️ ONLY run on folder/disk change!
}, [folderTree, normalizedSelectedPath]);




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
    <div className="flex flex-col min-h-[400px] border rounded-md overflow-hidden bg-white">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 bg-gray-50 border-r flex flex-col justify-between">
          <div className="p-4 overflow-y-auto">
            <FolderSidebar
              folderTree={folderTree}
              folders={folderList}
              selectedPath={normalizedSelectedPath}
              setSelectedPath={setSelectedPath}
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

        {/* Contents */}
        <div className="flex-1 p-3 overflow-y-auto">
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
            files={files}
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
