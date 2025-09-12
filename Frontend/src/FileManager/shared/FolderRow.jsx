// FolderRow.jsx
import { IconEdit, IconDelete } from "../../shared/IconSet.jsx";

const FolderRow = ({ 
  path, 
  name, 
  isSelected, 
  onSelect, 
  editable = false, 
  onRename, 
  onDelete 
}) => {
  return (
    <div
      onClick={() => onSelect(path)}
      className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition-all
        ${isSelected ? "bg-blue-100 border border-blue-300" : "hover:bg-gray-100"}`}
    >
      <span className="truncate">{name}</span>

      {editable && (
        <div className="hidden group-hover:flex gap-2 text-gray-400">
          <IconEdit
            size={16}
            onClick={(e) => {
              e.stopPropagation();
              onRename(path);
            }}
            className="hover:text-blue-500 cursor-pointer"
          />
          <IconDelete
            size={16}
            onClick={(e) => {
              e.stopPropagation();
              onDelete([path]);
            }}
            className="hover:text-red-500 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};

export default FolderRow;
