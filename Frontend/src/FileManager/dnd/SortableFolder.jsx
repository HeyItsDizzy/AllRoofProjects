import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {  IconFolder,  IconExpandBox,  IconCollapseBox,} from "../../shared/IconSet";

/**
 * SortableFolder component for rendering a sortable folder item.
 * @param {Object} props - Component properties.
 * @param {string} props.id - The ID of the folder.
 * @param {string} props.label - The label of the folder.
 * @param {boolean} props.isExpanded - Whether the folder is expanded.
 * @param {boolean} props.selected - Whether the folder is selected.
 * @param {Function} props.onClick - Callback for clicking the folder.
 * @param {Function} props.onToggleExpand - Callback for toggling the folder expansion.
 * @param {Function} props.onRename - Callback for renaming the folder.
 * @param {Function} props.onDelete - Callback for deleting the folder.
 */
const SortableFolder = ({
  id,
  label,
  isExpanded,
  selected,
  onClick,
  onToggleExpand,
  hasChildren = false // ✅ pass this in from renderTree
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
<div
  ref={setNodeRef}
  style={style}
  onMouseDown={onClick}
  className={`inline-flex items-center pl-2 pr-3 py-1 rounded text-sm whitespace-nowrap truncate overflow-hidden
    ${selected
      ? "bg-blue-100 border border-blue-300 shadow"
      : "hover:bg-blue-50 hover:border hover:border-blue-400 hover:shadow-sm"
    }`}
  
>

      {/* Expand/Collapse Toggle */}
      {hasChildren ? (
        <button
          onMouseDown={(e) => {
            e.stopPropagation(); // ✅ stops DND and parent click
            onToggleExpand();    // ✅ works now
          }}
          className="mr-1 text-gray-400 hover:text-gray-700 shrink-0"
        >
          {isExpanded ? <IconCollapseBox size={16} /> : <IconExpandBox size={16} />}
        </button>
      ) : (
        <span className="w-[16px] mr-1 inline-block" />
      )}
  
      {/* Folder Icon */}
      <IconFolder className="text-gray-500 mr-2 shrink-0" size={16} />
  
      {/* Folder Label (click + drag logic here) */}
      <span
        className="truncate cursor-pointer flex-1"
        onMouseDown={onClick}
        {...attributes}
        {...listeners} // ✅ apply DND only to this span
      >
        {label}
      </span>
    </div>
  );
  
};

export default SortableFolder;
