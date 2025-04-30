import { Modal, Button } from "antd";
import { useState, useContext } from "react";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import FileDirectoryPanel from "@/FileManager/panel/FileDirectoryPanel";
import useAxiosSecure from "../../hooks/AxiosSecure/useAxiosSecure";
import { AuthContext } from "../../auth/AuthProvider";
import FolderPanelWrapper from "../shared/FolderPanelWrapper";
import { useFolderManager } from "../hooks/useFolderManager";


/**
 * FileDropModal component for uploading files to a folder.
 * @param {Object} props - Component properties.
 * @param {string} props.projectId - The ID of the project.
 * @param {Array} props.files - Initial files to be uploaded.
 * @param {Function} props.onClose - Callback to close the modal.
 * @param {Function} props.onUpload - Callback after files are uploaded.
 * @param {string} [props.userRole="user"] - The role of the user.
 * @param {string} [props.projectAlias=""] - The alias of the project.
 */
const FileDropModal = ({ projectId, files, onClose, onUpload, userRole = "user", projectAlias = "" }) => {
  const [droppedFiles, setDroppedFiles] = useState(files || []);
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  const {
    selectedPath,
    setSelectedPath,
  } = useFolderManager(projectId, user?.role || "user");

  /**
   * Handle file upload.
   */
  const handleSave = async () => {
    if (!droppedFiles.length) {
      return Swal.fire('Warning', 'No files to upload.', 'warning');
    }

    const formData = new FormData();
    droppedFiles.forEach((file) => formData.append("files", file));
    formData.append("folderPath", selectedPath);
    formData.append("projectId", projectId);

    try {
      await axiosSecure.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire('Success', 'Files uploaded successfully!', 'success');
      onUpload?.({ files: droppedFiles, folderPath: selectedPath });
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
      Swal.fire('Error', 'Upload failed. Please try again.', 'error');
    }
  };

  /**
   * Handle file selection.
   * @param {Event} e - The file input change event.
   */
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected?.length > 0) {
      setDroppedFiles(selected);
    }
  };

  return (
    <Modal
      title="Upload Files to Folder"
      open={true}
      onCancel={onClose}
      width={750}
      bodyStyle={{
        minHeight: "400px",
        maxHeight: "800px",
        overflowY: "auto",
      }}
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
              onChange={handleFileSelect}
            />
          </label>

          <Button type="primary" className="h-[32px] px-4 py-[6px]" onClick={handleSave}>
            Save to: <strong>{selectedPath?.split("/").pop() || "Project"}</strong>
          </Button>
        </div>
      }
    >
      <FolderPanelWrapper projectId={projectId} userRole={user?.role || "User"}>
        {(folderManager) => (
          <FileDirectoryPanel {...folderManager} />
        )}
      </FolderPanelWrapper>
    </Modal>
  );
};

export default FileDropModal;
