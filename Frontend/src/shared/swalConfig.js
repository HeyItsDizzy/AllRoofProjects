// src/shared/swalConfig.js
import SweetAlert from 'sweetalert2';


/**
 * 🔔 MODAL STYLE (custom full-screen alerts)
 * Custom SweetAlert2 modal config styled with Tailwind
 * Use this for big alerts, prompts, confirm dialogs etc.
 */
const fire = SweetAlert.mixin({
  // ⚙️ Modal Behavior
  position: 'center',
  allowOutsideClick: true,
  allowEscapeKey: true,
  allowEnterKey: true,
  showConfirmButton: true,
  focusConfirm: true,
  buttonsStyling: false,

  // 🎨 Modal Styling (Tailwind classes)
  customClass: {
    popup: 'rounded-xl shadow-xl border border-gray-200 p-6 bg-white',
    title: 'text-lg font-semibold text-gray-800',
    htmlContainer: 'text-sm text-gray-600 leading-relaxed',
    confirmButton: 'swal2-confirm bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500',
    cancelButton: 'swal2-cancel bg-gray-600 text-white text-sm font-medium px-5 py-2.5 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400',
    input: 'swal2-input min-w-[300px] max-w-full border border-gray-300 rounded-md px-4 py-2 mt-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500',
    actions: 'flex gap-4 justify-end mt-6',
    icon: '',
    closeButton: 'text-gray-400 hover:text-gray-600',
    validationMessage: 'text-sm text-red-600 mt-2',
  },

  // 📋 Default Texts
  confirmButtonText: 'OK',
  cancelButtonText: 'Cancel',
  denyButtonText: 'No',
  showCancelButton: false,
  showDenyButton: false,
  showCloseButton: true,

  // 🎭 Animation
  backdrop: true,
  showClass: {
    popup: 'swal2-show animate__animated animate__fadeInDown',
  },
  hideClass: {
    popup: 'swal2-hide animate__animated animate__fadeOutUp',
  },

  // 🧠 UX Behavior
  timerProgressBar: false,
  reverseButtons: true,
  scrollbarPadding: false,
  grow: false,
  heightAuto: true,

  // ⌨️ Input Fields
  inputAttributes: {
    autocapitalize: 'off',
    autocomplete: 'off',
  },

  // 🧪 Dev hooks
  didOpen: () => {},
  willClose: () => {},
  showLoaderOnConfirm: false,

  // 🧱 HTML enabled by default (be careful)
  html: '',
});

/**
 * 🍞 TOAST STYLE (quick, mini alerts)
 * Use for success messages, notices, auto-dismiss alerts
 */
const toast = ({
  title = '',
  icon = 'success',
  timer = 1000,
  position = 'top-end',
  showProgress = false,
} = {}) => {
  return SweetAlert.mixin({
    toast: true,
    position,
    showConfirmButton: false,
    timer,
    timerProgressBar: showProgress,
    customClass: {
      popup: 'rounded-md bg-white text-sm px-4 py-2 shadow border border-gray-200',
      title: 'text-gray-800 text-sm',
    },
  }).fire({ icon, title });
};


/**
 * 🧪 OTHER (example: placeholder function)
 * You can replace this with confirm dialog, input modal, etc.
 */
const other = () => 'pass';

// ✅ Unified export for easy use
// Use like: swal.fire(), swal.toast(), swal.other()
const Swal = {
  fire: fire.fire.bind(fire),  // Modal (custom styled)
  toast,                       // Toast (top-end, auto-close)
  other,                       // Placeholder (returns 'pass')
  showLoading: SweetAlert.showLoading.bind(SweetAlert), // Loading spinner
  close: SweetAlert.close.bind(SweetAlert), // Close modal
};

export default Swal;
