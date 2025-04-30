// src/shared/IconSet.js

// Material Design
import {
    MdOutlineEdit,
    MdOutlineDeleteOutline,
    MdOutlineFileDownload,
    MdCreateNewFolder,
    MdArrowBackIosNew,
    MdIncompleteCircle,
    MdUploadFile,
  } from "react-icons/md";

  // Font Awesome v5
  import {
    FaFolderOpen,
    FaFileAlt,
    FaChevronDown,
    FaChevronUp,
    FaChevronRight,
    FaChevronLeft, 
    FaPlusCircle,
    FaPlusSquare,
    FaMinusSquare,
  } from "react-icons/fa";
  
  // Font Awesome v6 (separate package)
  import {
    FaArrowLeftLong as Fa6ArrowLeftLong,
    FaFileArrowUp,
  } from "react-icons/fa6";
  
  // Carbon Icons
  import { CiSearch, CiBellOn } from "react-icons/ci";
  
  // Ionicons
  import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
  import { IoIosMenu } from "react-icons/io";
  
  // Heroicons (AntD UI Extras)
  import { HiDotsVertical } from "react-icons/hi";
  
  // Named Exports for Consistency
  export {
    // 🔁 Navigation
    Fa6ArrowLeftLong as IconBackArrow,
    MdArrowBackIosNew as IconBackSmall,
    IoIosMenu as IconSidebarMenu,
  
    // 📁 File System Actions
    MdCreateNewFolder as IconNewFolder,
    FaPlusCircle as IconNewFile,
    MdOutlineEdit as IconEdit,
    MdOutlineDeleteOutline as IconDelete,
  
    // 📤 File Transfer
    MdOutlineFileDownload as IconDownload,
    MdUploadFile as IconUploadFile,
    FaFileArrowUp as IconFileArrowUp,
  
    // 🗂️ File & Folder Icons
    FaFolderOpen as IconFolder,
    FaFileAlt as IconFile,
  
    // 🧭 UI Controls & Indicators
    FaChevronDown as IconDown,
    FaChevronUp as IconUp,
    FaChevronRight as IconRight,   // ▶ for collapsed folders or next
    FaChevronLeft as IconLeft,     // ◀ optional, for back navigation or collapse-all
    HiDotsVertical as IconMenuDots,
    CiSearch as IconSearch,
    CiBellOn as IconBell,
    FaPlusSquare as IconExpandBox,
    FaMinusSquare as IconCollapseBox,
  
    // ✅ Status Indicators
    MdIncompleteCircle as IconPending,
    IoCheckmarkDoneCircleOutline as IconComplete,
  };
  