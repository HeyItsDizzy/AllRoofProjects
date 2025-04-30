import { Button, Drawer, message, Spin } from "antd";
import { useState } from "react";
import { IconBackArrow, IconFileArrowUp } from "../shared/IconSet";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import Dragger from "antd/es/upload/Dragger";
import { InboxOutlined } from "@ant-design/icons";

const UploadFile = ({ projectId, triggerId }) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const axiosSecure = useAxiosSecure();
  const url = `/upload-file/${projectId}`;


    const showDrawer = () => {
      setOpen(true);
    };
  
  
    const handleUpload = async () => {
      if (!files.length) return;
    
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file)); // backend must support array "files[]"
    
      setUploading(true);
      setUploadStatus("");
    
      try {
        const response = await axiosSecure.post(url, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setUploadStatus("Files uploaded successfully!");
        message.success("Files uploaded successfully!");
        setFiles([]); // Clear selection after upload
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadStatus("File upload failed. Please try again.");
        message.error("File upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    

  const onClose = () => {
    setOpen(false);
  };


  return (
    <div>
<button
  id={triggerId || ""}
  className="px-2 py-1 w-full rounded-md border-2 border-secondary"
  onClick={showDrawer}
>
        <span className="flex justify-center gap-2">
          <IconFileArrowUp className="mt-1 " /> Upload File
        </span>
      </button>
      <Drawer
        title={
          <>
            <div className="flex gap-3">
              <IconBackArrow
                className="my-auto hover:bottom-2"
                onClick={onClose}
              />
              <p className=""> Back</p>
            </div>
          </>
        }
        width={370}
        closable={false}
        onClose={onClose}
        open={open}
      >
        <div>
          <Dragger
            name="file"
            multiple={true}
            beforeUpload={(file) => {
              setFiles((prev) => [...prev, file]);
              message.success(`${file.name} added to upload list.`);
              return false; // Prevent auto upload
            }}
            onRemove={(file) => {
              setFiles((prev) => prev.filter((f) => f.uid !== file.uid));
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
  Upload one or more files. Drag-and-drop or click to select.
</p>

          </Dragger>
          <Button
  onClick={handleUpload}
  disabled={files.length === 0 || uploading}

            className="mt-4 bg-secondary text-white w-full"
          >
            {uploading ? (
              <span className="text-secondary">
                Uploading <Spin size="small" />
              </span>
            ) : (
              "Upload"
            )}
          </Button>
          {uploadStatus && <p className="mt-2 text-center">{uploadStatus}</p>}
        </div>
      </Drawer>
    </div>
  );
};

export default UploadFile;
