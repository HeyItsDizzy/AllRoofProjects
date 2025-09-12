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

const FolderPanelWrapper = ({ projectId, projectNumber = null, projectName = null, userRole = "user", refreshKey = 0, onFileChange = null, children }) => {
  const folderManager = useFolderManager(projectId, userRole, refreshKey, onFileChange);

  const {
    folderTree,
    folderList,
    loadingFolders,
    selectedPath,
    folderContents,
  } = folderManager;

  // Create user-friendly project display
  const getProjectDisplay = () => {
    if (projectNumber && projectName) {
      return `${projectNumber} - ${projectName}`;
    } else if (projectName) {
      return projectName;
    } else if (projectNumber) {
      return projectNumber;
    }
    return 'Loading project...';
  };

  // Show a simple loading placeholder while loading to maintain layout
  // Remove the full-screen spinner approach as it conflicts with page layout
  if (loadingFolders) {
    return (
      <div className="flex flex-col min-h-[400px] border rounded-md overflow-hidden bg-white relative">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            {/* Simple inline spinner */}
            <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <div className="text-gray-600 font-medium">Loading folder structure...</div>
            <div className="text-gray-400 text-sm mt-1">{getProjectDisplay()}</div>
          </div>
        </div>
      </div>
    );
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
