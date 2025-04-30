import React from "react";
import { IconEdit, IconFolder, IconFile} from "@/shared/IconSet";
import { Button, Input } from "antd";
import { sortFolderKeys } from "@/FileManager/utils/FMFunctions";

const FolderContents = ({
  selectedPath,
  subfolders,
  folderContents,
  setSelectedPath,
  setIsEditModalOpen,
  onDropFiles,
}) => {
  return (
    <div className="folder-content-area h-full flex flex-col">
      {/* Header (auto height) */}
      <div className="folder-content-header">
        <h4 className="folder-content-title">
          Contents of <strong>{selectedPath.split("/").pop()}</strong>
        </h4>
      </div>
  
      {/* Subfolder list (takes ~25% height) */}
      {subfolders && Object.values(subfolders).some(sf => sf?.__meta?.label) && (
        <div className=" folder-sublist-wrapper">
          <h5 className="folder-sublist-label text-sm text-gray-700">Subfolders</h5>
          <ul className="space-y-1 flex flex-col gap-0 h-[140px] overflow-y-auto pr-1 mb-2 border-b border-gray-200">
  {sortFolderKeys(Object.entries(subfolders)).map(([key, sf]) => (
    sf?.__meta?.label && (
      <li
        key={sf.__meta.name}
        onClick={() => setSelectedPath(sf.__meta.name)}
        className={`flex items-center gap-2 px-1 py-0 rounded-md cursor-pointer transition-colors duration-150
          ${sf.__meta.name === selectedPath
            ? "bg-blue-100 border border-blue-300 shadow"
            : "hover:bg-blue-50 hover:border hover:border-blue-400 hover:shadow-sm"}`}
      >
        <IconFolder className="text-gray-500 inline-block align-middle mr-2" />
        <span className="truncate">{sf.__meta.label}</span>
      </li>
    )
  ))}
</ul>

        </div>
      )}
  
      {/* Drop area / file list (fills remaining) */}
      <div className="flex-1 ">
        {folderContents[selectedPath]?.length > 0 ? (
          <div
            className="h-full border-2 border-dashed border-blue-300 bg-blue-50 p-4 flex flex-col justify-between
             hover:bg-blue-100 hover:border-blue-500 rounded-md transition-all duration-200"
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = Array.from(e.dataTransfer.files);
              if (dropped?.length > 0) onDropFiles(dropped);
            }}
          >
            <div className="flex-1 overflow-y-auto pr-1">
              <ul className="folder-file-list space-y-2 text-sm text-gray-800">
                {folderContents[selectedPath].map((file, i) => {
                  const fileName = typeof file === "string" ? file : file?.fileName || `File ${i + 1}`;
                  return (
                    <li
                      key={`file-${fileName}-${i}`}
                      className="flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-100"
                    >
                      <IconFile className="text-gray-500" />
                      {fileName}
                    </li>
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
            className="h-full w-full border-2 border-dashed border-blue-300 bg-blue-50 rounded-md flex items-end
             justify-center text-center p-6 hover:bg-blue-100 hover:border-blue-500 transition-all duration-200"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFiles = Array.from(e.dataTransfer.files);
              if (droppedFiles?.length > 0) onDropFiles(droppedFiles);
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
