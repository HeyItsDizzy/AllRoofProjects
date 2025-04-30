import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    Swal.fire({
      icon: "info",
      title: "Reset Link Sent",
      text: `If an account exists for ${email}, a reset link has been sent.`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Reset Your Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            required
            placeholder="Enter your email"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Send Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
