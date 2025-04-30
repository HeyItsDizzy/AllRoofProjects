// src/shared/swalConfig.js
import Swal from 'sweetalert2';

// Custom SweetAlert2 mixin with full modern config
const customSwal = Swal.mixin({
  // ⚙️ Layout / Structure
  position: 'center',
  allowOutsideClick: true,
  allowEscapeKey: true,
  allowEnterKey: true,
  showConfirmButton: true,
  focusConfirm: true,
  buttonsStyling: false,

  // 🎨 Custom styling (Tailwind-based)
  customClass: {
    popup: 'rounded-xl shadow-xl border border-gray-200 p-6 bg-white',
    title: 'text-lg font-semibold text-gray-800',
    htmlContainer: 'text-sm text-gray-600 leading-relaxed',
  
    // 🛠️ Updated buttons: match size/spacing of default Swal
    confirmButton: 'swal2-confirm bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500',
    cancelButton: 'swal2-cancel bg-gray-600 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400',
  
    // Input styling (match default sizing)
    input: 'swal2-input w-full border border-gray-300 rounded-md px-4 py-2 mt-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500',
  
    actions: 'flex gap-4 justify-end mt-6',
    icon: '',
    closeButton: 'text-gray-400 hover:text-gray-600',
    validationMessage: 'text-sm text-red-600 mt-2',
  },

  // 🧾 Common text options
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  denyButtonText: 'No',
  showCancelButton: false,
  showDenyButton: false,
  showCloseButton: true,

  // 📦 Appearance/Animation
  backdrop: true,
  showClass: {
    popup: 'swal2-show animate__animated animate__fadeInDown'
  },
  hideClass: {
    popup: 'swal2-hide animate__animated animate__fadeOutUp'
  },
  timerProgressBar: false,

  // 🛠️ Behavior defaults
  reverseButtons: true,
  scrollbarPadding: false,
  grow: false,
  heightAuto: true,

  // 🔠 Input settings (if used)
  inputAttributes: {
    autocapitalize: 'off',
    autocomplete: 'off'
  },

  // 🧩 Accessibility
  ariaLabel: 'SweetAlert modal',

  // 🧪 Dev/testing
  didOpen: () => {},
  willClose: () => {},

  // 🛎️ Loader
  showLoaderOnConfirm: false,

  // 🔐 Security
  allowHtml: true,
});

export default customSwal;
