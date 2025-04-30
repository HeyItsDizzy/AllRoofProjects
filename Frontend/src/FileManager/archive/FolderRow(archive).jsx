import {  IconEdit,  IconDelete, IconFolder, } from "../../shared/IconSet";

const FolderRow = ({
  name,
  label,
  level,
  isEditing,
  selectedPath,
  setSelectedPath,
  dragHoveredFolder,
  setDragHoveredFolder,
  renameInput,
  setRenameInput,
  setRenamingFolder,
  handleRename,
  handleDeleteFolder,
  projectId,
  message,
  onDropFiles,
  folderList,
}) => {



  return (
    <div style={{ paddingLeft: `${level * 16}px` }}>
<div
  data-folder-name={name}
  draggable={!isEditing} // prevent dragging while editing
  onDragStart={(e) => {
    e.dataTransfer.setData("text/plain", name); // Store dragged folder name
  }}
  onClick={() => setSelectedPath(name)}
  onDragOver={(e) => {
    e.preventDefault();
    setDragHoveredFolder(name);
  }}
  onDragLeave={(e) => {
    e.preventDefault();
    setDragHoveredFolder(null);
  }}
  onDrop={(e) => {
    e.preventDefault();
    const draggedName = e.dataTransfer.getData("text/plain");
  
    if (!draggedName || draggedName === name) return;
  
    // Prevent circular nesting
    if (name.startsWith(draggedName + "/")) {
      message.warning("Cannot move a folder into one of its own subfolders.");
      return;
    }
  
    const draggedLabel = draggedName.split("/").pop(); // "Unit A"
    let newBasePath = `${name}/${draggedLabel}`;
    let newPath = newBasePath;
  
    // 🔎 Check for naming conflict
    let count = 1;
    //const existingNames = folderList.map((f) => f.name);
    /*const existingNames = (folderList || []).map((f) => f.name);*/

    while (existingNames.includes(newPath)) {
      newPath = `${newBasePath} (${count++})`;
    }
  
    // ✅ Prevent rename if path is unchanged
    if (newPath === draggedName) {
      console.log("🚫 Skipping rename — path unchanged.");
      return;
    }
    
    // ✅ Proceed with rename
    handleRename(draggedName, newPath);
    setSelectedPath(newPath);
    setDragHoveredFolder(null);
  }}
  
  onDragEnter={() => {
    setSelectedPath(name);
  }}
  className={`flex items-center gap-2 px-3 py-1 rounded-md cursor-pointer transition min-h-[32px] ${
    selectedPath === name
      ? "bg-blue-100 text-blue-700 border border-blue-300"
      : dragHoveredFolder === name
      ? "bg-yellow-50 text-yellow-700 border-2 border-dashed border-yellow-500"
      : "hover:bg-gray-200 text-gray-700"
  }`}
  style={{ paddingLeft: `${level * 24}px` }}
>

        <div className="flex justify-between items-center w-full">
          <div
            className="flex items-center gap-2 overflow-x-auto scrollbar-none"
            ref={(el) => {
              if (selectedPath === name || dragHoveredFolder === name) {
                setTimeout(() => {
                  if (el && el.scrollWidth > el.clientWidth) {
                    const scrollTo = el.scrollWidth / 2 - el.clientWidth / 2;
                    el.scrollTo({ left: scrollTo, behavior: "smooth" });
                  }
                  
                }, 10);
              }
            }}
          >
            <IconFolder
              className={`shrink-0 ${
                selectedPath === name ? "text-blue-600" : "text-gray-500"
              }`}
            />
            {isEditing ? (
              <input
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename(name, renameInput);
                    setRenamingFolder(null);
                  }
                }}
                onBlur={() => setRenamingFolder(null)}
                className="border border-gray-300 rounded px-1 text-xs w-full"
                autoFocus
              />
            ) : (
              <span className="truncate">{label}</span>
            )}
          </div>
  
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setRenamingFolder(name);
                  setRenameInput(label);
                }}
                className="text-blue-500 hover:text-blue-700"
                title="Rename folder"
              >
                <IconEdit size={14} />
              </button>
              <button
                onClick={() => handleDeleteFolder(name)}
                className="text-red-500 hover:text-red-700"
                title="Delete folder"
              >
                <IconDelete size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  };
  
  export default FolderRow;
  