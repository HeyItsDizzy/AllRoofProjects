import React from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableFile } from "./SortableFile";
import Swal from '../../shared/swalConfig';
//import Swal from "sweetalert2";

/**
 * FileListDND component for rendering a draggable and sortable list of files.
 * @param {Object} props - Component properties.
 * @param {Array} props.files - List of files to display.
 * @param {string} props.folderPath - The path of the folder containing the files.
 * @param {Function} props.onMove - Callback for moving a file.
 * @param {Function} props.onRename - Callback for renaming a file.
 * @param {Function} props.onDelete - Callback for deleting a file.
 */
const FileListDND = ({ files = [], folderPath, onMove, onRename, onDelete }) => {
  const sensors = useSensors(useSensor(PointerSensor));

  /**
   * Handle the end of a drag event.
   * @param {Object} event - The drag event.
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Trigger backend move logic (e.g., move file within folder or to another one)
    onMove(active.id, folderPath);
  };

  /**
   * Handle file rename.
   * @param {string} fileName - The name of the file to rename.
   */
  const handleRename = async (fileName) => {
    const { value: newName } = await Swal.fire({
      title: 'Enter new file name:',
      input: 'text',
      inputValue: fileName,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to write something!';
        }
      }
    });

    if (newName) {
      onRename(fileName, newName);
    }
  };

  /**
   * Handle file delete.
   * @param {string} fileName - The name of the file to delete.
   */
  const handleDelete = async (fileName) => {
    const confirmed = await Swal.fire({
      title: `Delete ${fileName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
    });

    if (confirmed.isConfirmed) {
      onDelete(fileName);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={files.map((f) => (typeof f === "string" ? f : f?.fileName))}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {files.map((file, i) => {
            const fileName = typeof file === "string" ? file : file?.fileName || `File ${i + 1}`;
            return (
              <SortableFile
                key={fileName}
                id={fileName}
                fileName={fileName}
                onRename={() => handleRename(fileName)}
                onDelete={() => handleDelete(fileName)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default FileListDND;
