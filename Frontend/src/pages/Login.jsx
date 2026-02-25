//Login.jsx
import { Input, notification, Alert } from "antd"; 
import logo from "../assets/logo.png";
import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../auth/AuthProvider";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosPublic from "@/hooks/AxiosPublic/useAxiosPublic"; 
import ForgotPasswordModal from "../components/ForgotPasswordModal"; // Ensure this is the correct path

const Login = () => {
  const { setUser } = useContext(AuthContext); 
  const [showResetModal, setShowResetModal] = useState(false);
  const [searchParams] = useSearchParams();
  const isNoAccessRedirect = searchParams.get('noaccess') === 'true';

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Check for prefilled email from version update redirect
  useEffect(() => {
    const prefillEmail = localStorage.getItem('prefillEmail');
    if (prefillEmail) {
      setEmail(prefillEmail);
      localStorage.removeItem('prefillEmail'); // Clear after using
      console.log('🔄 Prefilled email from version update:', prefillEmail);
    }
  }, []);

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

        // Check if there's a stored redirect URL from a direct link access attempt
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          localStorage.removeItem('redirectAfterLogin');
          console.log("Redirecting to stored URL after login:", redirectUrl);
          return navigate(redirectUrl);
        }

        // ── Redirect non-admins without any linkedClients ─────────────────
        if (user.role !== "Admin" && (!user.linkedClients || user.linkedClients.length === 0)) {
          console.log("No linkedClients found → redirecting to /company-choice");
          return navigate("/company-choice");
        }
        // ────────────────────────────────────────────────────────────────────

        // All authenticated users go to the unified projects view
        console.log(`Redirecting ${user.role} to /projects`);
        navigate("/projects");
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
        {isNoAccessRedirect && (
          <Alert
            message="Sign In Required"
            description="You need to be signed in to access that content. Please sign in below or create an account, and you'll be redirected to your requested page."
            type="info"
            showIcon
            className="mb-6"
          />
        )}
        
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
            className="w-full bg-gray-200 text-gray-700 font-semibold py-2 rounded-md mt-4 text-center block hover:bg-gray-300 transition-colors"
          >
            Register
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
          // After password reset, redirect to login page for user to sign in
          // They will then be properly routed based on their linkedClients status
        }}
      />
    </div>
  );
};

export default Login;
