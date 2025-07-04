// src/FileManager/hooks/useDropHandler.js
import { useUploadManager } from "./useUploadManager";

export const useDropHandler = ({
  projectId,
  selectedPath,
  axios,
  setFiles,
  setGhostFilesByPath,
  ghostFilesByPath = {},
  existingFileNames = [],
  liveFiles = [],
}) => {
  const { uploadFiles } = useUploadManager({
    projectId,
    selectedPath,
    axios,
    setFiles,
    setGhostFilesByPath,
    ghostFilesByPath,       // ✅ Required to prevent crash
    existingFileNames,
    liveFiles,
  });

  // ...


  const handleDrop = async (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;

    await uploadFiles(files);
  };

  return { handleDrop };
};