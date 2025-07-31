// src/components/ForgotPasswordModal.jsx
import { useState } from "react";
import axiosPublic from "../hooks/AxiosPublic/useAxiosPublic";
import Swal from "@/shared/swalConfig";

const ForgotPasswordModal = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep]     = useState("email");    // "email" | "verify" | "reset"
  const [email, setEmail]   = useState("");
  const [code, setCode]     = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sendCode = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await axiosPublic.post("/forgot-password", { email });
      localStorage.setItem("resetEmail", email);
      Swal.fire("Code Sent","Check your inbox.","success");
      setStep("verify");
    } catch {
      Swal.fire("Error","Could not send code.","error");
    } finally { setLoading(false); }
  };

  const verifyCode = async e => {
    e.preventDefault(); setLoading(true);
    try {
      await axiosPublic.post("/verify-reset-code", {
        email: localStorage.getItem("resetEmail"),
        code
      });
      Swal.fire("Code Verified","Enter a new password.","success");
      setStep("reset");
    } catch {
      Swal.fire("Invalid Code","Please check your 6-digit code.","error");
    } finally { setLoading(false); }
  };

  const resetPassword = async e => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      return Swal.fire("Mismatch","Passwords must match.","error");
    }
    setLoading(true);
    try {
      await axiosPublic.post("/reset-password", {
        email: localStorage.getItem("resetEmail"),
        code,
        newPassword: newPass
      });
      Swal.fire("Success","Your password has been updated.","success");
      onComplete?.();   // e.g. navigate to login or company-choice
    } catch {
      Swal.fire("Error","Could not reset password.","error");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">
          {{
            email:  "Forgot Password",
            verify: "Enter Verification Code",
            reset:  "Set New Password"
          }[step]}
        </h2>

        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-4">
            <label>
              <span>Email address</span>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="you@example.com"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-200 rounded">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className={`px-4 py-2 rounded text-white ${loading?"bg-gray-400":"bg-primary"}`}>
                {loading ? "Sending…" : "Send Code"}
              </button>
            </div>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={verifyCode} className="space-y-4">
            <label>
              <span>6-Digit Code</span>
              <input
                type="text" maxLength={6} required value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full mt-1 p-2 border rounded text-center"
                placeholder="123456"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-200 rounded">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className={`px-4 py-2 rounded text-white ${loading?"bg-gray-400":"bg-primary"}`}>
                {loading ? "Verifying…" : "Verify Code"}
              </button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <label>
              <span>New Password</span>
              <input
                type="password" required value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="••••••••"
              />
            </label>
            <label>
              <span>Confirm Password</span>
              <input
                type="password" required value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
                placeholder="••••••••"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-200 rounded">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className={`px-4 py-2 rounded text-white ${loading?"bg-gray-400":"bg-primary"}`}>
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
