import React, { useState, useEffect } from "react";
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
import SortableFolder from "./SortableFolder";
import renderTree from "../utils/renderTree";

/**
 * FolderTreeDND component for rendering a draggable and sortable folder tree.
 * @param {Object} props - Component properties.
 * @param {Object} props.folderTree - The folder tree structure.
 * @param {string} props.selectedPath - The currently selected folder path.
 * @param {Function} props.onSelect - Callback for selecting a folder.
 * @param {Function} props.onMoveFolder - Callback for moving a folder.
 * @param {string} [props.userRole="User"] - The role of the user.
 */
const FolderTreeDND = ({
  folderTree = {},
  selectedPath,
  onSelect,
  onMoveFolder,
  userRole = "User",
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const sensors = useSensors(useSensor(PointerSensor));

  /**
   * Toggle the expanded state of a folder.
   * @param {string} folderId - The ID of the folder to toggle.
   */
  const toggleExpand = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  /**
   * Effect to expand folders based on the selected path.
   */
  useEffect(() => {
    if (!folderTree || !selectedPath) return;

    const segments = selectedPath.split("/");
    const expandedPath = {};

    for (let i = 1; i <= segments.length; i++) {
      const partial = segments.slice(0, i).join("/");
      expandedPath[partial] = true;
    }

    setExpandedFolders((prev) => ({
      ...prev,
      ...expandedPath,
    }));
  }, [folderTree, selectedPath]);

  /**
   * Handle the end of a drag event.
   * @param {Object} event - The drag event.
   */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onMoveFolder(active.id, over.id);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={Object.values(folderTree)
          .filter((t) => t?.__meta?.name)
          .map((t) => t.__meta.name)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1 overflow-y-auto max-h-[540px] pr-1">
          {renderTree(folderTree)}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default FolderTreeDND;
