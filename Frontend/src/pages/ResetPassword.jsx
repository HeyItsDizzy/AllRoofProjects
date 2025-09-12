import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import axiosPublic from "@/hooks/AxiosPublic/useAxiosPublic"; // Adjust as needed

const ResetPassword = () => {
  const { token } = useParams(); // Get token from URL
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== retypePassword) {
      return Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "Please make sure your passwords match.",
      });
    }

    try {
      // Placeholder for actual backend logic
      const response = await axiosPublic.post("/reset-password", { token, newPassword });

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Password Reset Successful",
          text: "You can now log in with your new password.",
        });

        navigate("/login");
      } else {
        Swal.fire({
          icon: "error",
          title: "Reset Failed",
          text: response.data.message || "Something went wrong.",
        });
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text: "An error occurred while resetting your password.",
      });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Reset Your Password</h2>
        <form onSubmit={handleResetPassword}>
          <div className="mb-4">
            <label className="block mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1">Retype Password</label>
            <input
              type="password"
              value={retypePassword}
              onChange={(e) => setRetypePassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full border border-gray-300 rounded px-3 py-2"
              required
            />
          </div>

          <button type="submit" className="w-full bg-primary text-white font-semibold py-2 rounded-md">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
