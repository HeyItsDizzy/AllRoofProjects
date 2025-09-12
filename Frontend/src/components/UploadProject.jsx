import { Button, Drawer, Space, Upload, message } from "antd";
import { useState } from "react";
import { IconBackArrow } from "../shared/IconSet.jsx";
import { IconDownload, IconUploadFile } from "../shared/IconSet.jsx";
import * as XLSX from "xlsx"; // Import XLSX for file extraction
import axios from "axios"; // Use axios to send data to the backend
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";

const UploadProject = () => {
  const [open, setOpen] = useState(false);

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  /**
   * ===========================
   * UPLOAD FILE RELATED
   * ===========================
   */
  const { Dragger } = Upload;
  const axiosSecure = useAxiosSecure();

  // Function to handle file upload
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // Assuming the first sheet is the required one
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert sheet to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Hit the endpoint with the extracted data
      try {
        const response = await axiosSecure.post("/add-projects", jsonData);
        message.success("File uploaded and data sent successfully.");
        console.log("Response from server:", response.data);
      } catch (err) {
        message.error("Failed to upload data.");
        console.error("Error uploading data:", err);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const props = {
    name: "file",
    multiple: false, // Only allow one file upload at a time
    beforeUpload(file) {
      const isXlsx =
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      if (!isXlsx) {
        message.error(`${file.name} is not an Excel file`);
      }
      return isXlsx || Upload.LIST_IGNORE;
    },
    customRequest({ file, onSuccess }) {
      setTimeout(() => {
        onSuccess("ok"); // Simulate the success callback
      }, 0);
      handleFileUpload(file); // Handle file processing
    },
  };

  console.log(props);

  return (
    <div>
      <Button className="text-white bg-primary py-5" onClick={showDrawer}>
        Upload Project
      </Button>
      <Drawer
        extra={<Space></Space>}
        title={
          <div className="flex gap-3">
            <IconBackArrow
              className="my-auto hover:bottom-2"
              onClick={onClose}
            />
            <p>Back</p>
          </div>
        }
        width={370}
        closable={false}
        onClose={onClose}
        open={open}
      >
        <div className="min-h-[80vh] flex flex-col justify-between">
          <div className="h-44 bg-blue-50 border-dotted border-blue-600 rounded-md">
            <Dragger {...props} className="bg-secondary">
              <p className="flex justify-center my-2">
                <IconUploadFile className="text-2xl text-textGray" />
              </p>
              <p className="ant-upload-text">
                Click or drag file to this area to upload
              </p>
            </Dragger>
          </div>
          <div>
            <button className="px-2 py-2 rounded-md w-full bg-primary">
              <span className="flex justify-center gap-2">
                <IconDownload className="mt-1" /> Upload
              </span>
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default UploadProject;
