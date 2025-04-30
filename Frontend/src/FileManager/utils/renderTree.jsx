import React from "react";
import SortableFolder from "../dnd/SortableFolder";

/**
 * Recursively renders a nested folder tree structure.
 * @param {object} tree - The nested folder tree
 * @param {object} expandedFolders - Expanded folder state
 * @param {string} selectedPath - Currently selected folder _id
 * @param {function} onSelect - Callback to set selected _id
 * @param {function} toggleExpand - Callback to expand/collapse folders
 * @param {number} level - Indentation level
 * @param {object} folderRefs - Ref map to scroll selected folder into view
 */
export default function renderTree(
  tree,
  expandedFolders = {},
  selectedPath = "",
  onSelect = () => {},
  toggleExpand = () => {},
  level = 0,
  folderRefs = { current: {} }
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
    .map(([key, value]) => {
      if (key === "__meta") return null;

      const __meta = value?.__meta || {};
      const folderName = __meta.name || key;
      const label = __meta.label || folderName.split("/").pop();
      const stableId = folderName; // Use path consistently

      if (!folderName || !label) return null;

      const isExpanded = expandedFolders?.[stableId] ?? false;

      const hasChildren = Object.keys(value).some((k) => k !== "__meta");

      return (
        <div
          key={stableId}
          className="ml-2"
          ref={(el) => {
            if (!folderRefs.current) folderRefs.current = {};
            folderRefs.current[stableId] = el;
          }}
        >
<SortableFolder
  id={folderName} // full path
  label={label}
  selected={folderName === selectedPath}
  isExpanded={!!isExpanded}
  hasChildren={hasChildren}
  onClick={() => {
    onSelect(folderName); // MATCHES right side
    toggleExpand(folderName);
  }}
  onToggleExpand={() => toggleExpand(folderName)}
/>



          {isExpanded && (
            <div className="ml-4 border-l border-gray-200 pl-2">
              {hasChildren ? (
                renderTree(
                  Object.fromEntries(Object.entries(value).filter(([k]) => k !== "__meta")),
                  expandedFolders,
                  selectedPath,
                  onSelect,
                  toggleExpand,
                  level + 1,
                  folderRefs
                )
              ) : (
                <div className="text-xs italic text-gray-400 mt-1">(empty)</div>
              )}
            </div>
          )}
        </div>
      );
    });
}
