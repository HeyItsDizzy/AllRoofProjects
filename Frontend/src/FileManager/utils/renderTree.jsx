import React from "react";
import SortableFolder from "../dnd/SortableFolder";
import { isAllowed } from "../shared/permissions";
import { isVisibleFolderKey } from "./FMFunctions";

/**
 * Recursively renders a nested folder tree structure.
 * @param {object} tree - The nested folder tree
 * @param {object} expandedFolders - Expanded folder state
 * @param {string} selectedPath - Currently selected folder path (e.g. './BOQ/1st Folder')
 * @param {function} onSelect - Callback to set selected folder
 * @param {function} toggleExpand - Callback to expand/collapse folders
 * @param {number} level - Indentation level
 * @param {object} folderRefs - Ref map to scroll selected folder into view
 * @param {string} userRole - Current user role
 * @param {object} meta - Meta data for permissions
 * @param {string} parentPath - Path from parent node (e.g. './BOQ')
 */
export default function renderTree(
  tree,
  expandedFolders = {},
  selectedPath = "",
  onSelect = () => {},
  toggleExpand = () => {},
  level = 0,
  folderRefs = { current: {} },
  userRole = "User",
  meta = null,
  parentPath = ".",
  editable = false,
  handleRename = () => {},
  handleDelete = () => {},
  scrollContainerRef = null
) {
  return Object.entries(tree)
    .sort(([a], [b]) => {
      const extractSortKey = (str) => {
        const name = str.split("/").pop();
        const match = name.match(/^(\d+)([a-zA-Z\s]*)/);
        return match ? [parseInt(match[1], 10), match[2] || ""] : [Infinity, name];
      };
      const [numA, suffixA] = extractSortKey(a);
      const [numB, suffixB] = extractSortKey(b);
      return numA !== numB ? numA - numB : suffixA.localeCompare(suffixB);
    })
    .filter(
  ([k, v]) =>
    isVisibleFolderKey(k) &&
    typeof v === "object" &&
    !Array.isArray(v)
)

    .map(([key, value]) => {
      if (key === "__meta") return null;

      const __meta = value?.__meta || {};
      const folderLabel = __meta.label || (key === "." ? "Project Root" : key);
      const folderName = key;

      const currentPath = parentPath === "." ? folderName : `${parentPath}/${folderName}`;


      //if (import.meta.env.DEV) console.log("📁 Attempting to render:", currentPath);

      const isExpanded = expandedFolders?.[currentPath] ?? false;
      const hasChildren = Object.keys(value).some((k) => k !== "__meta");
      const isSelected = selectedPath === currentPath;

      return (
        <div
          key={currentPath}
          className="ml-2"
          ref={(el) => {
            if (!folderRefs.current) folderRefs.current = {};
            folderRefs.current[currentPath] = el;
          }}
        >
<SortableFolder
  id={currentPath}
  label={folderLabel}
  selected={isSelected}
  isExpanded={isExpanded}
  hasChildren={hasChildren}
  scrollContainerRef={scrollContainerRef}
  onClick={() => {
    onSelect(currentPath);
    toggleExpand(currentPath);
  }}
  onToggleExpand={() => toggleExpand(currentPath)}
  onRename={editable ? (currentPath) => handleRename(currentPath) : undefined}
  onDelete={editable ? (currentPath) => handleDelete(currentPath) : undefined}
/>

          {isExpanded && (
            <div className="ml-4 border-l border-gray-200 pl-2">
{hasChildren ? (
  renderTree(
    Object.fromEntries(
  Object.entries(value).filter(
    ([k, v]) =>
      isVisibleFolderKey(k) &&
      typeof v === "object" &&
      !Array.isArray(v)
  )
),
    expandedFolders,
    selectedPath,
    onSelect,
    toggleExpand,
    level + 1,
    folderRefs,
    userRole,
    meta,
    currentPath,      // parentPath
    editable,         // ✅ pass this too
    handleRename,     // ✅ pass rename handler
    handleDelete      // ✅ pass delete handler
  )
) : (
  <div className="text-xs italic text-gray-400 mt-1">({folderLabel} empty)</div>
)}

            </div>
          )}
        </div>
      );
    });
}
