import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconEdit, IconDelete } from "../../shared/IconSet";

/**
 * SortableFile component for rendering a sortable file item.
 * @param {Object} props - Component properties.
 * @param {string} props.id - The ID of the file.
 * @param {string} props.fileName - The name of the file.
 * @param {Function} props.onRename - Callback for renaming the file.
 * @param {Function} props.onDelete - Callback for deleting the file.
 */
const SortableFile = ({ id, fileName, onRename, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center justify-between border rounded p-2 text-sm">
      <span>{fileName}</span>
      <div className="flex gap-2">
        <button onClick={onRename} title="Rename">
          <IconEdit size={16} />
        </button>
        <button onClick={onDelete} title="Delete">
          <IconDelete size={16} />
        </button>
      </div>
    </div>
  );
};

export default SortableFile;
