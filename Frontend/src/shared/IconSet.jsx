// Lucide Icons (Pin)
import { LuPin as IconPin, LuPinOff as IconUnpin } from "react-icons/lu";
// src/shared/IconSet.jsx

// ─────────── Imports ───────────

// Material Design
import {
  MdOutlineEdit as IconEdit,
  MdOutlineDeleteOutline as IconDelete,
  MdOutlineFileDownload as IconDownload,
  MdCreateNewFolder as IconNewFolder,
  MdArrowBackIosNew as IconBackSmall,
  MdIncompleteCircle as IconPending,
  MdUploadFile as IconUploadFile, 
  MdUpload as IconUpload,
  MdStorage as IconDatabase,
  MdRemoveRedEye as IconView,
  MdBlock as IconBlock,
  MdCheckCircle as IconUnblock,
  MdPersonAdd as IconInvite,
  MdRefresh as IconRefresh,
  MdKeyboardArrowUp as IconPromote,
  MdKeyboardArrowDown as IconDemote,
  MdForwardToInbox as IconSend,
  MdClose as IconClose,
  MdFilterList as IconFilter,
  MdEmail as IconMail,
  MdPhone as IconPhone,
  MdHome as IconHome,
  MdContentCopy as IconDuplicate,
  MdShoppingCart as IconCart,
  MdBarChart as IconChart,
  MdChatBubble as IconChat,
  MdSettings as IconSettings,
  MdAutoAwesome as IconSparkles,
  MdAccessTime as IconClock,
  MdInfoOutline as IconInfo,
  MdAttachMoney as IconDollar,
  MdCloud as IconCloud,
  MdPalette as IconPalette,
  MdRestore as IconRestore,
  MdUndo as IconUndo,
} from "react-icons/md";

// Font Awesome v5
import {
  FaFolderOpen as IconFolder,
  FaFileAlt as IconFile,
  FaChevronDown as IconDown,
  FaChevronUp as IconUp,
  FaChevronRight as IconRight,
  FaChevronLeft as IconLeft,
  FaPlusCircle as IconNewFile,
  FaPlus as IconPlus,
  FaPlusSquare as IconExpandBox,
  FaMinusSquare as IconCollapseBox,
  FaRegSave as IconSave,
  FaRuler as IconScale,
} from "react-icons/fa";

// Font Awesome v6
import {
  FaArrowLeftLong as IconBackArrow,
  FaFileArrowUp as IconFileArrowUp,
  FaFilePdf as IconPdf,
  FaFileWord as IconWord,
  FaFileExcel as IconExcel,
  FaFileImage as IconImage,
  FaFileZipper as IconZip,
  FaFileCode as IconCode,
} from "react-icons/fa6";

// Carbon Icons
import {
  CiSearch as IconSearch,
  CiBellOn as IconBell,
} from "react-icons/ci";

// Ionicons
import {
  IoCheckmarkDoneCircleOutline as IconComplete,
} from "react-icons/io5";
import {
  IoIosMenu as IconSidebarMenu,
  IoMdSync as IconSync,
} from "react-icons/io";
import { ImWarning as IconWarning } from "react-icons/im";

// Heroicons
import { HiDotsVertical as IconMenuDots } from "react-icons/hi";

// ─────────── Utility: getFileIcon() ───────────

const fileIconMap = {
  pdf:  { icon: IconPdf,  color: "text-red-500" },
  doc:  { icon: IconWord, color: "text-blue-500" },
  docx: { icon: IconWord, color: "text-blue-500" },
  xls:  { icon: IconExcel, color: "text-green-600" },
  xlsx: { icon: IconExcel, color: "text-green-600" },
  jpg:  { icon: IconImage, color: "text-yellow-600" },
  jpeg: { icon: IconImage, color: "text-yellow-600" },
  png:  { icon: IconImage, color: "text-yellow-600" },
  gif:  { icon: IconImage, color: "text-yellow-600" },
  webp: { icon: IconImage, color: "text-yellow-600" },
  zip:  { icon: IconZip, color: "text-purple-600" },
  rar:  { icon: IconZip, color: "text-purple-600" },
  "7z": { icon: IconZip, color: "text-purple-600" },
  json: { icon: IconCode, color: "text-gray-600" },
  csv:  { icon: IconCode, color: "text-gray-600" },
  txt:  { icon: IconCode, color: "text-gray-600" },
};

function getFileIcon(fileName, size = 32, colorClass = null) {
  const ext = fileName.split(".").pop().toLowerCase();
  const fallback = { icon: IconFile, color: "text-slate-400" };

  const { icon: IconComponent, color } = fileIconMap[ext] || fallback;

  return <IconComponent size={size} className={colorClass || color} />;
}



// ─────────── Exports ───────────

export {
  // Pin Icons
  IconPin,
  IconUnpin,
  // Navigation
  IconBackArrow,
  IconBackSmall,
  IconSidebarMenu,

  // File System Actions
  IconNewFolder,
  IconNewFile,
  IconPlus,
  IconEdit,
  IconDelete,
  IconView,
  IconSave,

  // File Transfer
  IconDownload,
  IconUpload,
  IconUploadFile,
  IconFileArrowUp,

  // File & Folder Icons
  IconFolder,
  IconFile,
  IconPdf,
  IconWord,
  IconExcel,
  IconImage,
  IconZip,
  IconCode,

  // UI Controls & Indicators
  IconDown,
  IconUp,
  IconRight,
  IconLeft,
  IconMenuDots,
  IconSearch,
  IconBell,
  IconExpandBox,
  IconCollapseBox,
  IconFilter,

  // Status Indicators
  IconPending,
  IconComplete,
  IconSync,
  IconWarning,

  // User Management
  IconBlock,
  IconUnblock,
  IconInvite,
  IconRefresh,
  IconPromote,
  IconDemote,
  IconSend,
  IconClose,

  // Recycle Bin & Undo
  IconRestore,
  IconUndo,

  // Communication
  IconMail,
  IconPhone,

  // Dashboard & General UI
  IconHome,
  IconScale,
  IconDuplicate,
  IconCart,
  IconChart,
  IconChat,
  IconSettings,
  IconSparkles,
  IconClock,
  IconInfo,
  IconDollar,
  IconCloud,
  IconDatabase,
  IconPalette,

  // Utility
  getFileIcon,
};