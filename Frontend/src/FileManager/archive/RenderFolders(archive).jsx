import FolderRow from "./FolderRow";

const RenderFolders = ({
  tree,
  level = 0,
  selectedPath,
  setSelectedPath,
  dragHoveredFolder,
  setDragHoveredFolder,
  renameInput,
  setRenameInput,
  renamingFolder,
  setRenamingFolder,
  handleRename,
  handleDeleteFolder,
  projectId,
  message,
  canSeeFolder,
  onDropFiles,
  folderList,
}) => {


return Object.values(tree).map((folderNode, idx) => {
  const { name, label, role } = folderNode.__meta;
  const children = folderNode.children; // ✅ Accessed correctly outside of __meta

  if (!canSeeFolder({ name, role })) return null;

  return (
    <div key={name}>
      <FolderRow
        name={name}
        label={label}
        level={level}
        isEditing={renamingFolder === name}
        selectedPath={selectedPath}
        setSelectedPath={setSelectedPath}
        dragHoveredFolder={dragHoveredFolder}
        setDragHoveredFolder={setDragHoveredFolder}
        renameInput={renameInput}
        setRenameInput={setRenameInput}
        setRenamingFolder={setRenamingFolder}
        handleRename={handleRename}
        handleDeleteFolder={handleDeleteFolder}
        projectId={projectId}
        message={message}
        onDropFiles={onDropFiles}
        folderList={folderList}
      />

      {/* 🔁 Recursive render of child folders */}
      {children && Object.keys(children).length > 0 && (
        <RenderFolders
          tree={children}
          level={level + 1}
          selectedPath={selectedPath}
          setSelectedPath={setSelectedPath}
          dragHoveredFolder={dragHoveredFolder}
          setDragHoveredFolder={setDragHoveredFolder}
          renameInput={renameInput}
          setRenameInput={setRenameInput}
          renamingFolder={renamingFolder}
          setRenamingFolder={setRenamingFolder}
          handleRename={handleRename}
          handleDeleteFolder={handleDeleteFolder}
          projectId={projectId}
          message={message}
          canSeeFolder={canSeeFolder}
          onDropFiles={onDropFiles}
          folderList={folderList}
          
        />
      )}
    </div>
  );
});

  
};

export default RenderFolders;
