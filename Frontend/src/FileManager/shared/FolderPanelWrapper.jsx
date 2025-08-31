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
  //console.log("🧪 FolderTree raw:", folderTree);
  //console.log("🧪 FolderList flat:", folderList);
  return (
    <div className="p-4 text-red-500 text-sm font-medium">
      ⚠️ No folders available. Please sync from disk or check your project setup.
    </div>
  );
};

const FolderPanelWrapper = ({ projectId, userRole = "user", refreshKey = 0, onFileChange = null, children }) => {
  const folderManager = useFolderManager(projectId, userRole, refreshKey, onFileChange);

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

  const rootNode = folderTree?.["."] || {};
  const hasVisibleFolders = Object.entries(rootNode)
    .filter(([key]) => key !== "__meta")
    .length > 0;

  if (!hasVisibleFolders) {
    return renderNoFoldersMessage(folderTree, folderList);
  }

  // Children must be a function that receives (folderManager) and returns JSX
  return children(folderManager);
};

export default FolderPanelWrapper;
