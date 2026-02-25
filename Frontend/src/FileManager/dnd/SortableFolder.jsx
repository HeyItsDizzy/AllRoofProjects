import React, { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {  IconFolder,  IconExpandBox,  IconCollapseBox, IconEdit, IconDelete} from "../../shared/IconSet.jsx";

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
  hasChildren = false,
  onRename, 
  onDelete,
  scrollContainerRef // ✅ add this 
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const [hoverPos, setHoverPos] = useState(null);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hoverAnchorX = hoverPos?.anchorX || hoverPos?.x;
  const tooltipRef = useRef(null);


return (
  <div
    ref={setNodeRef}
    style={style}
    onMouseDown={onClick}
onMouseEnter={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();

  let x = rect.right;
let maxX = window.innerWidth - 10;

if (scrollContainerRef?.current) {
  const containerRect = scrollContainerRef.current.getBoundingClientRect();
  maxX = containerRect.right - 10;
  x = Math.min(rect.right, maxX);
}

  const anchorY = rect.top + rect.height / 2;

setHoverPos({
  id,
  x,
  anchorY,
  label
});

}}


    onMouseLeave={() => setHoverPos(null)}
    className={`group inline-flex items-center justify-between pl-2 pr-3 py-1 rounded text-sm whitespace-nowrap w-full
      ${selected
        ? "bg-blue-100 border border-blue-300 shadow"
        : "hover:bg-blue-50 hover:border hover:border-blue-400 hover:shadow-sm"
      }`}
  >
    {/* 👈 Left: Expand Toggle, Icon, Label */}
    <div className="flex items-center gap-2 overflow-hidden">
      {hasChildren ? (
        <button
          onMouseDown={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="text-gray-400 hover:text-gray-700 shrink-0"
        >
          {isExpanded ? <IconCollapseBox size={16} /> : <IconExpandBox size={16} />}
        </button>
      ) : (
        <span className="w-[16px] inline-block" />
      )}

      <IconFolder className="text-gray-500 shrink-0" size={16} />

      <span
        className="truncate cursor-pointer flex-1"
        {...attributes}
        {...listeners}
      >
        {label}
      </span>
    </div>

    {/* 👉 Right: Edit + Delete on hover */}
    <div className="relative">
      {(onRename || onDelete) && hoverPos && (
<div
  ref={tooltipRef} // ← 👈 NEW
style={{
  position: "fixed",
  top: `${hoverPos.anchorY - 10}px`,
  //left: `${Math.min(hoverPos.x, hoverPos.maxX-20)}px`, // removed +50
  left: `${hoverPos.x}px`, //New

  maxWidth: "180px",
  zIndex: 50,
}}


  className="flex items-center gap-2 bg-white border border-gray-300 rounded shadow px-2 py-1"
>


          {onRename && (
            <IconEdit
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                onRename(id);
                setHoverPos(null);
              }}
              title="Rename folder"
              className="text-gray-500 hover:text-blue-500 cursor-pointer"
            />
          )}

          {onDelete && (
            <IconDelete
              size={16}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
                setHoverPos(null);
              }}
              title="Delete folder"
              className="text-gray-500 hover:text-red-500 cursor-pointer"
            />
          )}

          {/* ✅ Folder name preview */}
<span className="ml-2 text-gray-400 text-xs italic truncate max-w-[100px]">
  {label}
</span>


        </div>
      )}
    </div>
  </div>
);

  
  
};

export default SortableFolder;
