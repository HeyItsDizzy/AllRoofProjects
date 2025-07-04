import { Modal } from "antd";
import { useState, useContext } from "react";
import FileDirectoryPanel from "@/FileManager/panel/FileDirectoryPanel";
import FolderPanelWrapper from "../shared/FolderPanelWrapper";
import { AuthContext } from "../../auth/AuthProvider";

/**
 * FileDropModal – editable file viewer modal
 * 📁 Just loads FileDirectoryPanel in editable mode
 */
const FileDropModal = ({
  projectId,
  selectedPath,
  setSelectedPath,
  files,
  setFiles,
  ghostFilesByPath,
  setGhostFilesByPath,
  onClose,
}) => {
  const { user } = useContext(AuthContext);

  // Local state overrides
  //const [selectedPath, setSelectedPath] = useState(".");
  //const [files, setFiles] = useState([]);
  //const [ghostFilesByPath, setGhostFilesByPath] = useState({});

  return (
    <Modal
      title="Edit Files / Folders"
      open={true}
      onCancel={onClose}
      width={1200}
      footer={null}
      styles={{
        minHeight: "400px",
        maxHeight: "800px",
        overflowY: "auto",
        overflowX: "auto",
      }}
    >
      <FolderPanelWrapper projectId={projectId} userRole={user?.role || "User"}>
        {(folderManager) => (
<FileDirectoryPanel
  {...folderManager}
  selectedPath={selectedPath}
  setSelectedPath={setSelectedPath}
  editable={true}
  projectId={projectId}
  files={files}
  setFiles={setFiles}
  ghostFilesByPath={ghostFilesByPath}
  setGhostFilesByPath={setGhostFilesByPath}
  uploadEnabled={true} // Modal is always active
  folderContents={folderManager.folderContents}
/>
        )}
      </FolderPanelWrapper>
    </Modal>
  );
};

export default FileDropModal;
