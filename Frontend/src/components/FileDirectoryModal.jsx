import { Modal, Button, Input, message } from "antd";
import { useState } from "react";
import FileDirectoryPanel from "../FileManager/panel/FileDirectoryPanel"; // Updated import path
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";

const FileDirectoryModal = ({ projectId, files, onClose, onUpload, userRole = "user" }) => {
  const [selectedPath, setSelectedPath] = useState("Project");
  const [droppedFiles, setDroppedFiles] = useState(files || []); // ✅ move here
  const [folderList, setFolderList] = useState([
    { name: "Project", role: "all" },
    { name: "Estimator", role: "estimator" },
    { name: "Admin", role: "admin" },
  ]);
  const [folderContents, setFolderContents] = useState({
    Project: ["site-map.pdf", "plans.dwg"],
    Estimator: ["estimator-notes.docx"],
    Admin: ["internal-report.xlsx"],
  });
  const [newFolderName, setNewFolderName] = useState("");

  const canSeeFolder = (folder) => {
    if (folder.role === "all") return true;
    if (folder.role === "admin" && userRole === "admin") return true;
    if (folder.role === "estimator" && ["admin", "estimator"].includes(userRole)) return true;
    return false;
  };

  const handleCreateFolder = (folderObj) => {
    const newFolderNameToUse = folderObj?.name || newFolderName?.trim();
  
    if (!newFolderNameToUse) return message.warning("Folder name can't be empty.");
    if (folderList.find((f) => f.name === newFolderNameToUse)) {
      return message.error("Folder already exists.");
    }
  
    const newFolder = {
      name: newFolderNameToUse,
      role: "all",
      userCreated: true,
    };
  
    setFolderList((prev) => [...prev, newFolder]);
    setFolderContents((prev) => ({ ...prev, [newFolder.name]: [] }));
  
    if (!folderObj) setNewFolderName(""); // Clear input only if using manual input
  };
  

  const handleSave = async () => {
    if (!droppedFiles.length) {
      return message.warning("No files to upload.");
    }
  
    const formData = new FormData();
    droppedFiles.forEach((file) => formData.append("files", file));
    formData.append("folderPath", selectedPath);
    formData.append("projectId", projectId);
  
    try {
      const axiosSecure = useAxiosSecure();
      const res = await axiosSecure.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      message.success("Files uploaded successfully!");
      onUpload?.({ files: droppedFiles, folderPath: selectedPath });
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
      message.error("Upload failed. Please try again.");
    }
  };
  
  
  const [currentPath, setCurrentPath] = useState(["Project"]); // stack of folders
  const fullPath = currentPath.join("/"); // e.g., Project/Subfolder
  
   

  return (
<Modal
  title="Upload Files to Folder"
  open={true}
  onCancel={onClose}
  width={750}
 styles={{
    body: {
      minHeight: "400px",
      maxHeight: "800px",
      overflowY: "auto",
    },}}
  footer={
    <div className="flex justify-end gap-2 px-4 py-2">
      <Button onClick={onClose}>Cancel</Button>

      <label
        htmlFor="uploadInsideModal"
        className="border border-blue-500 text-blue-600 px-4 py-[6px] rounded-md cursor-pointer flex items-center justify-center text-sm h-[32px]"
      >
        Upload Files
        <input
          id="uploadInsideModal"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files);
            if (selected?.length > 0) {
              setDroppedFiles(selected);
            }
          }}
        />
      </label>

      <Button type="primary" className="h-[32px] px-4 py-[6px]" onClick={handleSave}>
        Save to: <strong>{selectedPath?.split("/").pop() || "Project"}</strong>
      </Button>


    </div>
  }
>
<FileDirectoryPanel
  folders={folderList}
  selectedPath={selectedPath}
  setSelectedPath={setSelectedPath}
  folderContents={folderContents}
  files={files}
  newFolderName={newFolderName}
  setNewFolderName={setNewFolderName}
  handleCreateFolder={handleCreateFolder}
  userRole={userRole}
  onDropFiles={(files) => {
    setDroppedFiles(files);
    message.success("Files dropped — ready to upload.");
  }}
/>

</Modal>

    
  );
};

export default FileDirectoryModal;
