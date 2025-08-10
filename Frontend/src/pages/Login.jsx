//Login.jsx
import { Input, notification } from "antd"; 
import logo from "../assets/logo.png";
import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import axiosPublic from "../hooks/AxiosPublic/useAxiosPublic"; 
import ForgotPasswordModal from "../components/ForgotPasswordModal"; // Ensure this is the correct path

const Login = () => {
  const { setUser } = useContext(AuthContext); 
  const [showResetModal, setShowResetModal] = useState(false);

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Handle form submission for login
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      console.log("Attempting login with:", { email, password });

      const response = await axiosPublic.post("/login", { email, password });

      console.log("Login Response:", response);

      if (response.data.success) {
        const { user, token } = response.data.data;

        localStorage.setItem("authUser", JSON.stringify(user));
        localStorage.setItem("authToken", token);

        setUser(user);
        console.log("User successfully logged in:", user);

        // ── Redirect non-admins without any linkedClients ─────────────────
        if (user.role !== "Admin" && (!user.linkedClients || user.linkedClients.length === 0)) {
          console.log("No linkedClients found → redirecting to /company-choice");
          return navigate("/company-choice");
        }
        // ────────────────────────────────────────────────────────────────────

        if (user.role === "Admin") {
          console.log("Redirecting Admin to /job-board");
          navigate("/job-board"); 
        } else {
          navigate("/MyProjects"); 
        }
      } else {
        alert(`Login failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Login Error:", error.message); 
      notification.error({
        message: "Login Failed",
        description: error.response?.data?.message || "Invalid email or password",
        placement: "topRight",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-20 rounded-xl shadow-lg w-full max-w-md mx-auto">
        <div className="py-4 flex flex-col justify-center mx-auto w-full">
          <div className="w-full text-center">
            <img src={logo} className="w-48 mx-auto" alt="Logo" />
            <div className="my-4">
              <h2 className="text-smallBold text-textBlack">Welcome!</h2>
              <p className="text-textGray text-semiBold">
                Enter your email and password to login.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="w-full max-w-xs mx-auto">
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Email</label>
              <Input
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full"
                variant="filled"
              />
            </div>
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Password</label>
              <Input.Password
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full"
                variant="filled"
              />
            </div>
            <button className="w-full bg-primary text-white font-semibold py-2 rounded-md">
              Login
            </button>
          </form>
          <Link
            to="/register"
            className="text-blue-400 underline mt-4 text-center"
          >
            Create account
          </Link>

          {/* Forgot Password Button */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="text-sm text-primary underline mt-2"
          >
            Forgot Password?
          </button>
        </div>
      </div>

      {/* ForgotPasswordModal Component (3-step: send, verify, reset) */}
      <ForgotPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onComplete={() => {
          setShowResetModal(false);
          // After full flow, route to company choice (then eventually login)
          navigate("/company-choice");
        }}
      />
    </div>
  );
};

export default Login;
