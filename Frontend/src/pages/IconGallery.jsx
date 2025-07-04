import React from "react";
import {
  IconBackArrow,
  IconBackSmall,
  IconSidebarMenu,
  IconNewFolder,
  IconNewFile,
  IconEdit,
  IconDelete,
  IconView,
  IconDownload,
  IconUploadFile,
  IconFileArrowUp,
  IconFolder,
  IconFile,
  IconPdf,
  IconWord,
  IconExcel,
  IconImage,
  IconZip,
  IconCode,
  IconDown,
  IconUp,
  IconRight,
  IconLeft,
  IconExpandBox,
  IconCollapseBox,
  IconMenuDots,
  IconSearch,
  IconBell,
  IconPending,
  IconComplete,
  getFileIcon,
} from "../shared/IconSet.jsx";

const groupedIcons = {
  "⬅️ Navigation": {
    IconBackArrow,
    IconBackSmall,
    IconSidebarMenu,
  },
  "🗂️ File Operations": {
    IconNewFolder,
    IconNewFile,
    IconEdit,
    IconDelete,
    IconView,
    IconDownload,
    IconUploadFile,
    IconFileArrowUp,
  },
  "🗂️ File & Folder Icons": {
    IconFolder,
    IconFile,
    IconPdf,
    IconWord,
    IconExcel,
    IconImage,
    IconZip,
    IconCode,
  },
  "➡️ Arrows": {
    IconDown,
    IconUp,
    IconRight,
    IconLeft,
  },
  "🔲 Expand/Collapse": {
    IconExpandBox,
    IconCollapseBox,
  },
  "⚙️ Other UI Icons": {
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

      {/* 🔍 File Extension Icon Demos */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold mb-4">🧷 File Extension Demos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {["report.pdf", "invoice.docx", "budget.xlsx", "photo.jpg", "backup.zip", "data.txt", "unknown.xyz","WebPhoto.webp"].map((file) => (
            <div
              key={file}
              className="flex flex-col items-center p-4 bg-white border rounded shadow-sm hover:shadow-md transition"
            >
              {getFileIcon(file, 32,)}
              <span className="text-xs text-center text-gray-600 break-all">{file}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IconGallery;
