import React from "react";
import { useFolderManager } from "../hooks/useFolderManager";

// Function to render loading message
const renderLoadingMessage = () => (
  <div className="p-4 text-gray-500 text-sm italic">
    📂 Loading folder structure...
  </div>
);

// Function to render no folders available message
const renderNoFoldersMessage = (folderTree, folderList) => {
  console.log("🧪 FolderTree raw:", folderTree);
  console.log("🧪 FolderList flat:", folderList);
  return (
    <div className="p-4 text-red-500 text-sm font-medium">
      ⚠️ No folders available. Please sync from disk or check your project setup.
    </div>
  );
};

const FolderPanelWrapper = ({ projectId, userRole = "user", children }) => {
  const folderManager = useFolderManager(projectId, userRole);

  const {
    folderTree,
    folderList,
    loadingFolders,
    selectedPath,
    folderContents,
  } = folderManager;

  if (loadingFolders) {
    return renderLoadingMessage();
  }

  if (!folderTree || Object.keys(folderTree).length === 0) {
    return renderNoFoldersMessage(folderTree, folderList);
  }

  // Children must be a function that receives (folderManager) and returns JSX
  return children(folderManager); // Child is a function that receives all folder logic
};

export default FolderPanelWrapper;
