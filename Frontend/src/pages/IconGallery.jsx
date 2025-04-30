import React from "react";
import {
  IconBackArrow,
  IconBackSmall,
  IconSidebarMenu,

  IconNewFolder,
  IconNewFile,
  IconEdit,
  IconDelete,

  IconDownload,
  IconUploadFile,
  IconFileArrowUp,

  IconFolder,
  IconFile,

  IconDown,
  IconUp,
  IconRight,
  IconLeft,
  IconExpandBox,    // ✅ new
  IconCollapseBox,  // ✅ new
  IconMenuDots,
  IconSearch,
  IconBell,

  IconPending,
  IconComplete,
} from "../shared/IconSet";

const groupedIcons = {
  "🔁 Navigation": {
    IconBackArrow,
    IconBackSmall,
    IconSidebarMenu,
  },
  "📁 File System Actions": {
    IconNewFolder,
    IconNewFile,
    IconEdit,
    IconDelete,
  },
  "📤 File Transfer": {
    IconDownload,
    IconUploadFile,
    IconFileArrowUp,
  },
  "🗂️ File & Folder Icons": {
    IconFolder,
    IconFile,
  },
"🧭 UI Controls & Indicators": {
  IconDown,
  IconUp,
  IconRight,
  IconLeft,
  IconExpandBox,
  IconCollapseBox,
  IconMenuDots,
  IconSearch,
  IconBell,
},
  "✅ Status Indicators": {
    IconPending,
    IconComplete,
  },
};

const IconGallery = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">All Icons in IconSet.js</h1>

      {Object.entries(groupedIcons).map(([category, icons]) => (
        <div key={category} className="mb-10">
          <h2 className="text-lg font-semibold mb-4">{category}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Object.entries(icons).map(([name, IconComponent]) => (
              <div
                key={name}
                className="flex flex-col items-center p-4 bg-white border rounded shadow-sm hover:shadow-md transition"
              >
                <IconComponent size={32} className="mb-2 text-gray-700" />
                <span className="text-xs text-center text-gray-600 break-all">{name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default IconGallery;
