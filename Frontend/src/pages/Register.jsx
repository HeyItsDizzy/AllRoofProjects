// Register.jsx
/* PRODUCTION READY*/
import logo from "../assets/logo.png";
import { Input, Checkbox, Alert } from "antd";
import { useState, useContext } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosPublic from "@/hooks/AxiosPublic/useAxiosPublic";
import Swal from '@/shared/swalConfig';
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { AuthContext } from "../auth/AuthProvider";
import TermsModal from "../components/TermsModal";
import PrivacyModal from "../components/PrivacyModal";

const Register = () => {
  // State management for form validation and error handling
  const [passErr, setPassErr] = useState("");
  const [resError, setResError] = useState({});
  const [isAgreed, setIsAgreed] = useState(false);
  const [address, setAddress] = useState({});
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const isNoAccessRedirect = searchParams.get('noaccess') === 'true';

  // Navigation and authentication context
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  /**
   * Validates email format using regex pattern
   * @param {string} email - Email address to validate
   * @returns {boolean} - True if email is valid
   */
  const validateEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  /**
   * Validates phone number for registration - lenient validation for multi-country support
   * Only checks for invalid special characters, allows various international formats
   * @param {string} rawPhone - Raw phone number input
   * @returns {object} - Object containing validation status and cleaned phone
   */
  const validateAndFormatPhone = (rawPhone) => {
    // Remove spaces, dashes, parentheses - common formatting
    const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
    
    // Check for invalid special characters (allow only digits, +, and common separators)
    const hasInvalidChars = /[^0-9+\s\-\(\)\.]/g.test(rawPhone);
    
    if (hasInvalidChars) {
      return { isValid: false };
    }
    
    // Basic length check - too short or too long
    if (cleaned.length < 6 || cleaned.length > 20) {
      return { isValid: false };
    }

    return {
      isValid: true,
      smsReadyPhone: cleaned,        // Store cleaned version for backend
      displayPhone: rawPhone.trim(), // Keep original format for display
    };
  };


  /**
   * Handles user authentication after successful registration
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const handleAutoLogin = async (email, password) => {
    try {
      const loginResponse = await axiosPublic.post("/login", { email, password });

      if (loginResponse.data.success) {
        const { user: loggedInUser, token } = loginResponse.data.data;
        
        // Store authentication data in localStorage
        localStorage.setItem("authUser", JSON.stringify(loggedInUser));
        localStorage.setItem("authToken", token);
        
        // Update React context with user data
        setUser(loggedInUser);

        // Show success notification
        Swal.fire({
          icon: "success",
          title: "Welcome!",
          text: "Your account was created and you've been logged in.",
          timer: 2000,
          showConfirmButton: false,
        });

        // Check if there's a stored redirect URL from a direct link access attempt
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          localStorage.removeItem('redirectAfterLogin');
          console.log("Redirecting to stored URL after registration:", redirectUrl);
          return navigate(redirectUrl);
        }

        // Check if user needs to link to a company first
        if (loggedInUser.role !== "Admin" && (!loggedInUser.linkedClients || loggedInUser.linkedClients.length === 0)) {
          console.log("New user has no linkedClients → redirecting to /company-choice");
          navigate("/company-choice");
        } else {
          // Navigate to projects dashboard
          navigate("/projects");
        }
      } else {
        setResError({ message: "Account created, but login failed. Please try logging in." });
      }
    } catch (err) {
      setResError({ message: "Login failed after registration. Please try logging in manually." });
    }
  };

  /**
   * Main registration handler - validates form data and processes registration
   * @param {Event} e - Form submission event
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    const form = e.target;
  
    // Extract and clean form data
    const fullName = form.fullName.value.trim();
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
    const email = form.email.value.trim();
    const rawPhone = form.phone.value.trim();
    const password = form.password.value;
    const reTypePassword = form.reTypePassword.value;
  
    // Validate email format
    if (!validateEmail(email)) {
      setResError({ message: "Please enter a valid email address." });
      return;
    }
  
    // Validate and format phone number (lenient for registration)
    const phoneValidation = validateAndFormatPhone(rawPhone);
    if (!phoneValidation.isValid) {
      setResError({ message: "Please enter a valid phone number (no special characters except +, -, (), spaces)." });
      return;
    }
  
    // Validate password confirmation
    if (password !== reTypePassword) {
      setPassErr("Passwords do not match.");
      return;
    }

    // Prepare user data for registration
    const userData = {
      firstName,
      lastName,
      name: fullName,
      email,
      phone: phoneValidation.smsReadyPhone,
      displayPhone: phoneValidation.displayPhone,
      password,
    };

    try {
      // Attempt user registration
      const response = await axiosPublic.post("/register", userData);

      if (response.data.success) {
        // Registration successful, attempt automatic login
        await handleAutoLogin(email, password);
      } else {
        setResError(response.data);
      }
    } catch (err) {
      setResError({ message: err?.response?.data?.message || "Something went wrong." });
    }
  };

  /**
   * Handles terms and conditions agreement checkbox
   * @param {Event} e - Checkbox change event
   */
  const handleAgreementChange = (e) => {
    setIsAgreed(e.target.checked);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Main registration container */}
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md mx-auto">
        
        {isNoAccessRedirect && (
          <Alert
            message="Authentication Required"
            description="You need to be logged in to access that project. Please create an account below or sign in if you already have one."
            type="info"
            showIcon
            className="mb-6"
          />
        )}
        
        {/* Logo and header section */}
        <div className="py-4 flex flex-col justify-center mx-auto w-full">
          <div className="w-full text-center">
            <img src={logo} className="w-32 mx-auto" alt="Company Logo" />
            <div className="my-4">
              <h2 className="text-smallBold text-textBlack">Create an Account</h2>
              <p className="text-textGray text-semiBold">
                Enter your details to create an account.
              </p>
            </div>
          </div>
  
          {/* Registration form */}
          <form onSubmit={handleRegister} className="w-full max-w-xs mx-auto">
            {/* Error message display */}
            {resError?.message && (
              <p className="text-red-500 text-sm mb-2">{resError.message}</p>
            )}

            {/* Full Name Input */}
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Full Name</label>
              <Input
                name="fullName"
                required
                placeholder="e.g. Jane Smith"
                className="w-full"
                variant="filled"
              />
            </div>
  
  
            {/* Email Input */}
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Email</label>
              <Input
                name="email"
                autoComplete="email"
                required
                placeholder="Enter your email"
                className="w-full"
                variant="filled"
              />
            </div>
  
            {/* Phone Input */}
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Phone</label>
              <Input
                name="phone"
                autoComplete="tel"
                required
                placeholder="Enter your phone"
                className="w-full"
                variant="filled"
              />
            </div>
  
            {/* Password Input */}
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Password</label>
              <Input.Password
                name="password"
                autoComplete="new-password"
                required
                placeholder="Enter your password"
                className="w-full"
                variant="filled"
              />
            </div>
  
            {/* Confirm Password Input */}
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Retype Password</label>
              <Input.Password
                name="reTypePassword"
                autoComplete="new-password"
                required
                placeholder="Re-enter your password"
                onChange={() => setPassErr("")}
                className="w-full"
                variant="filled"
              />
            </div>
  
            {/* Password mismatch error */}
            {passErr && <p className="text-red-500">{passErr}</p>}
  
            {/* Terms and conditions agreement */}
            <div className="flex flex-col gap-1 mt-4">
              <Checkbox onChange={handleAgreementChange}>
                I agree to the{" "}
                <span
                  className="text-primary underline cursor-pointer"
                  onClick={() => setIsTermsModalOpen(true)}
                >
                  Terms and Conditions
                </span>
                {" "}and{" "}
                <span
                  className="text-primary underline cursor-pointer"
                  onClick={() => setIsPrivacyModalOpen(true)}
                >
                  Privacy Policy
                </span>
              </Checkbox>
            </div>
  
            {/* Submit button */}
            <button
              type="submit"
              disabled={!isAgreed}
              className={`w-full bg-primary text-white font-semibold py-2 rounded-md ${
                !isAgreed ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Create account
            </button>
          </form>
  
          {/* Login link */}
          <p className="text-blue-400 underline mt-4">
            <Link to="/login">Already have an account? Login</Link>
          </p>
        </div>
      </div>
      {/* 📄 Terms & Conditions Modal */}
      <TermsModal
        visible={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
      <PrivacyModal
        visible={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};

export default Register;
