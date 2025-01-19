import { Button, Drawer, message, Spin } from "antd";
import { useState } from "react";
import { FaArrowLeftLong, FaFileArrowUp } from "react-icons/fa6";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";
import Dragger from "antd/es/upload/Dragger";
import { InboxOutlined } from "@ant-design/icons";

const UploadFile = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null); // Single file state
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const axiosSecure = useAxiosSecure();
  const url = `/upload-file/${projectId}`;

  const showDrawer = () => {
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file); // Attach the file

    setUploading(true); // Start loading
    setUploadStatus(""); // Clear any previous messages

    try {
      // eslint-disable-next-line no-unused-vars
      const response = await axiosSecure.post(url, formData, {
        headers: {
          "Content-Type": "multipart/form-data", // Set content type
        },
      });
      setUploadStatus("File uploaded successfully!");
      message.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("File upload failed. Please try again.");
      message.error("File upload failed. Please try again.");
    } finally {
      setUploading(false); // End loading
    }
  };

  return (
    <div>
      <button
        className="px-2 py-1 w-full rounded-md border-2 border-secondary"
        onClick={showDrawer}
      >
        <span className="flex justify-center gap-2">
          <FaFileArrowUp className="mt-1 " /> Upload File
        </span>
      </button>
      <Drawer
        title={
          <>
            <div className="flex gap-3">
              <FaArrowLeftLong
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
            multiple={false}
            beforeUpload={(file) => {
              setFile(file);
              message.success(`${file.name} file selected.`);
              return false; // Prevents automatic upload
            }}
            onRemove={() => setFile(null)} // Optional: clear file on remove
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Support for a single or bulk upload. Strictly prohibited from
              uploading company data or other banned files.
            </p>
          </Dragger>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
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
