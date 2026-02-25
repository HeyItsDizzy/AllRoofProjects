// src/FileManager/hooks/useDropHandler.js
import { useUploadManager } from "./useUploadManager";
import Swal from '../../shared/swalConfig';

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


  // Helper function to traverse folders and extract all files with progress feedback
  const getAllFilesFromDataTransfer = async (dataTransfer) => {
    const files = [];
    const items = Array.from(dataTransfer.items);
    
    // Show processing dialog for folder operations
    let processingDialog = null;
    
    if (items.some(item => item.webkitGetAsEntry()?.isDirectory)) {
      processingDialog = Swal.fire({
        title: 'Processing Folders...',
        html: 'Extracting files from folders, please wait...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }
    
    // Function to recursively read directory
    const readDirectory = async (dirReader, basePath = '') => {
      return new Promise((resolve) => {
        const entries = [];
        
        const readEntries = () => {
          dirReader.readEntries((results) => {
            if (results.length === 0) {
              resolve(entries);
            } else {
              entries.push(...results);
              readEntries(); // Continue reading (directories can return results in chunks)
            }
          });
        };
        
        readEntries();
      });
    };
    
    // Process each item
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        
        if (entry) {
          if (entry.isFile) {
            // It's a file
            try {
              const file = await new Promise((resolve, reject) => {
                entry.file(resolve, reject);
              });
              files.push(file);
            } catch (error) {
              console.warn('Failed to read file:', entry.name, error);
            }
          } else if (entry.isDirectory) {
            // It's a directory - traverse it recursively
            await traverseDirectory(entry, '');
          }
        }
      }
    }
    
    // Recursive function to traverse directories
    async function traverseDirectory(dirEntry, currentPath) {
      const dirReader = dirEntry.createReader();
      const entries = await readDirectory(dirReader, currentPath);
      
      for (const childEntry of entries) {
        const childPath = currentPath ? `${currentPath}/${childEntry.name}` : childEntry.name;
        
        if (childEntry.isFile) {
          try {
            const file = await new Promise((resolve, reject) => {
              childEntry.file(resolve, reject);
            });
            
            // Add relative path information to the file object
            Object.defineProperty(file, 'relativePath', {
              value: childPath,
              writable: false,
              enumerable: false
            });
            
            files.push(file);
          } catch (error) {
            console.warn('Failed to read file:', childPath, error);
          }
        } else if (childEntry.isDirectory) {
          // Recursively process subdirectories
          await traverseDirectory(childEntry, childPath);
        }
      }
    }
    
    // Close processing dialog
    if (processingDialog) {
      Swal.close();
    }
    
    return files;
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    
    // Try to get files with folder traversal support
    let files = [];
    
    try {
      // First try to get files with folder support
      files = await getAllFilesFromDataTransfer(event.dataTransfer);
      
      // If no files found, fall back to basic file list
      if (files.length === 0) {
        files = Array.from(event.dataTransfer.files);
      }
    } catch (error) {
      console.warn('Folder traversal failed, using basic file list:', error);
      files = Array.from(event.dataTransfer.files);
    }
    
    if (!files.length) return;

    await uploadFiles(files);
  };

  return { handleDrop };
};