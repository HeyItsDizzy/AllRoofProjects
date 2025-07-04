// FolderContents.jsx
import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconEdit, IconFolder, IconFile, IconDownload } from "@/shared/IconSet.jsx";
import { Button, Input } from "antd";
import Swal from '@/shared/swalConfig';
import SortableFile from "@/FileManager/dnd/SortableFile";
import {
  sortFolderKeys,
  isVisibleFolderKey,
  downloadToZIP,
  downloadFile,
  deleteFile,
  renameFile,
  uploadFileToFolder,
  DnDUpload,
  getLiveFileNames,
  safeSetFilesAndGhosts,
  getFolderMetaAtPath,
} from "@/FileManager/utils/FMFunctions";
import { useDropHandler } from "@/FileManager/hooks/useDropHandler";


import debounce from "lodash.debounce";
const debouncedLog = debounce((msg) => console.log(msg), 300);



const FolderContents = ({
  selectedPath,
  folderTree,
  subfolders,
  folderContents,
  setSelectedPath,
  setIsEditModalOpen,
  onDropFiles,
  axiosSecure,
  projectId,
  editable = false,
  files,
  setFiles,
  ghostFilesByPath,
  setGhostFilesByPath,
  }) => {

const currentFolderMeta = getFolderMetaAtPath(folderTree, selectedPath);


const currentFolderLabel =
  currentFolderMeta?.label ||
  (selectedPath === "." ? "Project Root" : selectedPath.split("/").pop());


  
  
  const contents = Object.fromEntries(
  Object.entries(subfolders || {}).filter(([k]) => !k.startsWith("__"))
  );

  useEffect(() => {
  console.log("📡 FolderContents received files:", files);
}, [files]);


  const visibleKeys = Object.entries(folderTree["."] || {}).filter(([key]) =>
  isVisibleFolderKey(key)
  );

const liveFiles = files

  //console.log("✅ Folder resolved for path:", selectedPath, folder);
  //console.log("📄#1 Files in folder as 'folder?.__files':", folder?.__files);
  //const [uploadProgress, setUploadProgress] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);
  const { handleDrop } = useDropHandler({
    projectId,
    selectedPath,
    axios: axiosSecure,
    setFiles,
    setGhostFilesByPath,
    ghostFilesByPath,        
    existingFileNames: files, 
    liveFiles: liveFiles,    
  });




  if (!folderTree?.["."]) {
    console.warn("📛 FolderContents: Missing root folderTree['.']");
    return null;
  }

  return (
    <div className="folder-content-area h-full flex flex-col">
      {/* Header (auto height) */}
  <div className="flex justify-between items-center mb-2">
    <h4 className="folder-content-title">
      Contents of <strong>{currentFolderLabel}</strong>
    </h4>

  <button
    title={`Download ${currentFolderLabel} as ZIP`}
    aria-label={`Download ${currentFolderLabel} as ZIP`}
    className="border border-green-500 text-green-600 px-4 py-[6px] rounded-md cursor-pointer flex items-center justify-center text-sm h-[32px] hover:bg-green-200 transition"
    onClick={() => downloadToZIP({ axiosSecure, selectedPath, projectId })}
  >
    <IconDownload size={25} className="text-green-500 mr-1" />
    {`${currentFolderLabel}`}
  </button>
</div>
  
      {/* Subfolder list (takes ~25% height) */}
      
      {contents && Object.keys(contents).length > 0 && (
        <div className="folder-sublist-wrapper">
          <ul className="space-y-1 flex flex-col gap-0 min-h-[60px] max-h-[140px] overflow-y-auto pr-1 mb-2 border-b border-gray-200">
          {sortFolderKeys(Object.entries(contents)).map(([key, sf]) => (
  <li
    key={key}
    onClick={() => setSelectedPath(`${selectedPath}/${key}`)}
    className={`flex items-center gap-2 px-1 py-0 rounded-md text-sm cursor-pointer transition-colors duration-150
      ${`${selectedPath}/${key}` === selectedPath
        ? "bg-blue-100 border border-blue-300 shadow"
        : "hover:bg-blue-50 hover:border hover:border-blue-400 hover:shadow-sm"}`}
  >
    <IconFolder className="text-gray-500 inline-block align-middle mr-2" />
    <span className="truncate">{key}</span>
  </li>
))}

</ul>

        </div>
      )}
  
      {/* Drop area / file list (fills remaining) */}
      <div className="flex-1 ">
{liveFiles.length > 0 ? (
  <div
    className={`h-full border-2 border-dashed p-4 flex flex-col justify-between rounded-md transition-all duration-20
      ${isDragOver ? "bg-blue-100 border-blue-800" : "bg-blue-50 border-blue-300"}`}
    onDragOver={(e) => {
      e.preventDefault();
      setIsDragOver(true);
    }}
    onDragLeave={(e) => {
      e.preventDefault();
      setIsDragOver(false);
    }}
    onDrop={(e) => {
      setIsDragOver(false);
      handleDrop(e);
    }}
  >
    <div className="flex-1 overflow-y-auto pr-1">
      <ul className="folder-file-list space-y-2 text-sm text-gray-800">
        {liveFiles.map((name, i) => {
          const displayName = typeof name === "string" ? name : name?.fileName || `File ${i + 1}`;
          return (
            <SortableFile
              key={`${selectedPath}/${displayName}`}
              id={`${selectedPath}/${displayName}`}
              fileName={displayName}
              axiosSecure={axiosSecure}
              selectedPath={selectedPath}
              projectId={projectId}
              editable={editable}


          onRename={(filePath) => { 
            // Ensure filePath is ALWAYS full path from project root!
            const oldName = filePath.split("/").pop();
            let fullPath;
            if (selectedPath === "." || filePath.startsWith(selectedPath)) {
              fullPath = filePath;
            } else {
              fullPath = selectedPath === "." ? oldName : `${selectedPath}/${oldName}`;
            }

            renameFile({
              axiosSecure,
              projectId,
              filePath: fullPath, // <<<<< ALWAYS FULL RELATIVE PATH!
              existingFiles: liveFiles,n
            }).then((res) => {
            if (!res) return;

            const updatedFiles = liveFiles.filter(f => {
              const name = typeof f === "string" ? f : f?.fileName;
              return name !== oldName && name !== res.newName;
            });

            const newList = [...updatedFiles, res.newName];

            safeSetFilesAndGhosts(setFiles, setGhostFilesByPath, newList, selectedPath);

            console.log("🧩 Renamed:", oldName, "→", res.newName, "→", newList);
          });
        }}



onDelete={(filePath) => {
  const deleted = filePath.split("/").pop();

  // 🔄 Only do UI update if backend (and user) confirmed
  deleteFile({
    axiosSecure,
    projectId,
    filePath,
  }).then((res) => {
    if (!res) return; // user cancelled or backend failed

    // NOW do the optimistic UI update (safe, only after confirmation!)
    const updatedFiles = files.filter(f => {
      const name = typeof f === "string" ? f : f?.fileName;
      return name !== deleted;
    });

    safeSetFilesAndGhosts(setFiles, setGhostFilesByPath, updatedFiles, selectedPath);
    // This should run after successful delete confirm!


    console.log("🗑️ Optimistically deleted:", deleted, "→", updatedFiles);
  });
}}






        
            />
          );
        })}
      </ul>
    </div>
    <div className="text-center text-sm text-gray-500 pt-4">
      <p className="italic text-blue-600">Drag and drop files here to upload.</p>
    </div>
  </div>
) : (
  <div
    className={`h-full w-full border-2 border-dashed flex items-end justify-center text-center p-6 rounded-md transition-all duration-20
      ${isDragOver ? "bg-blue-100 border-blue-800" : "bg-blue-50 border-blue-300"}`}
    onDragOver={(e) => {
      e.preventDefault();
      setIsDragOver(true);
    }}
    onDragLeave={(e) => {
      e.preventDefault();
      setIsDragOver(false);
    }}
    onDrop={(e) => {
      setIsDragOver(false);
      handleDrop(e);
    }}
  >
    <div className="text-sm">
      <p className="text-gray-500">No files in this folder.</p>
      <p className="text-blue-600 italic">Drag and drop files here to upload.</p>
    </div>
  </div>
)}

      </div>
    </div>
  );
  
  
};

export default FolderContents;
