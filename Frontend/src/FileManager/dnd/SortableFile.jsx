import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconEdit, IconDelete, IconDownload, IconView } from "../../shared/IconSet.jsx";
import { downloadFile, renameFile, deleteFile } from "../utils/FMFunctions";
import Swal from "../../shared/swalConfig";
import { handleFileOpen, getFileIcon } from "../utils/fileTypeHandler.jsx";

/**
 * SortableFile component for rendering a sortable file item.
 *
 * @param {Object} props - Component properties.
 * @param {string} props.id - The unique ID for DnD sorting.
 * @param {string} props.fileName - The display name of the file.
 * @param {Function} props.onRename - Handler for renaming the file.
 * @param {Function} props.onDelete - Handler for deleting the file.
 * @param {Function} props.axiosSecure - Axios instance for secure requests.
 * @param {string} props.selectedPath - The current folder path.
 * @param {string} props.projectId - ID of the active project.
 * @param {boolean} props.editable - Whether the file is editable.
 */

const SortableFile = ({
  id,
  fileName,
  axiosSecure,
  selectedPath,
  projectId,
  onRename,
  onDelete,
  editable = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDownload = (e) => {
    e.stopPropagation(); // Prevent DnD or other click events
    downloadFile({
      axiosSecure,
      selectedPath,
      projectId,
      fileName,
      mode: "download",
    });
  };

  const handlePreview = async (e) => {
    e.stopPropagation();

    // Use the new file type handler for enhanced file opening
    const handled = await handleFileOpen(fileName, {
      axiosSecure,
      selectedPath,
      projectId,
      mode: "preview"
    });

    // If the file type wasn't handled by our custom handler, fall back to default
    if (!handled) {
      const ext = fileName.split(".").pop().toLowerCase();
      const previewable = ["jpg", "jpeg", "png", "gif", "webp", "pdf"];

      if (previewable.includes(ext)) {
        downloadFile({
          axiosSecure,
          selectedPath,
          projectId,
          fileName,
          mode: "preview",
        });
      } else {
        const confirm = await Swal.fire({
          icon: "question",
          title: "Cannot preview this file type",
          text: "Would you like to download it instead?",
          showCancelButton: true,
          confirmButtonText: "Download",
        });

        if (confirm.isConfirmed) {
          downloadFile({
            axiosSecure,
            selectedPath,
            projectId,
            fileName,
            mode: "download",
          });
        }
      }
    }
  };

  const handleDoubleClick = async () => {
    // Use the new file type handler for enhanced file opening
    const handled = await handleFileOpen(fileName, {
      axiosSecure,
      selectedPath,
      projectId,
      mode: "preview"
    });

    // If the file type wasn't handled by our custom handler, fall back to default
    if (!handled) {
      downloadFile({
        axiosSecure,
        selectedPath,
        projectId,
        fileName,
        mode: "preview",
      });
    }
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={handleDoubleClick}
      className="flex items-center justify-between border rounded p-0 text-sm hover:bg-blue-50 group transition"
    >
      <div className="flex items-center gap-2 flex-1 truncate">
        {getFileIcon(fileName, 16)}
        <span className="truncate">{fileName}</span>
      </div>


      <div className="flex gap-2 items-center">
        {/* View Button */}
        <button
          onClick={handlePreview}
          className="invisible group-hover:visible p-1 hover:bg-green-100 rounded transition"
          title="View"
        >
          <IconView size={16} className="text-green-600" />
        </button>

        {/* Force Download Button */}
        <button
          onClick={handleDownload}
          className="invisible group-hover:visible p-1 hover:bg-blue-100 rounded transition"
          title="Download"
        >
          <IconDownload size={16} className="text-blue-600" />
        </button>

        {editable && (
          <>
            {/* Rename Button */}
<button
  onClick={(e) => {
    e.stopPropagation();
    onRename?.(fileName); // fileName = file path or something unique passed by parent
  }}
  className="invisible group-hover:visible p-1 hover:bg-yellow-100 rounded transition"
  title="Rename"
>
  <IconEdit size={16} className="text-yellow-600" />
</button>
{/* Delete Button */}
<button
  onClick={(e) => {
    e.stopPropagation();
    onDelete?.(id);
  }}
  className="invisible group-hover:visible p-1 hover:bg-red-100 rounded transition"
  title="Delete"
>
  <IconDelete size={16} className="text-red-600" />
</button>

          </>
        )}
      </div>
    </div>
  );
};

export default SortableFile;