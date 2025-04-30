// Register.jsx
import logo from "../assets/logo.png";
import { Input, Checkbox } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate for navigation
import axiosPublic from "../hooks/AxiosPublic/useAxiosPublic";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import AddressInput from "../Components/AddressInput"; // adjust if path is different

const Register = () => {
  const [passErr, setPassErr] = useState("");
  const [resError, setResError] = useState({});
  const [isAgreed, setIsAgreed] = useState(false);
  const [address, setAddress] = useState({});
  const navigate = useNavigate(); // Added navigate for redirection

  const handleRegister = async (e) => {
    e.preventDefault();
    const form = e.target;
  
    const fullName = form.fullName.value.trim();
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
  
    const company = form.company.value.trim();
    const email = form.email.value.trim();
    const rawPhone = form.phone.value.trim();
    const password = form.password.value;
    const reTypePassword = form.reTypePassword.value;
  
    // ✅ Check email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setResError({ message: "Please enter a valid email address." });
      return;
    }
  
    // ✅ Format + validate phone number (default country = AU)
    const phoneNumber = parsePhoneNumberFromString(rawPhone, 'AU');
    if (!phoneNumber || !phoneNumber.isValid()) {
      setResError({ message: "Please enter a valid phone number." });
      return;
    }
  
    const smsReadyPhone = phoneNumber.format("E.164");       // For backend/API
    const displayPhone = phoneNumber.formatNational();       // For UI use if needed
  
    if (password !== reTypePassword) {
      setPassErr("Passwords do not match.");
      return;
    }
  
    const userData = {
      firstName,
      lastName,
      name: fullName,
      company,
      email,
      phone: smsReadyPhone,     // E.164 format for backend/API
      displayPhone: displayPhone, // Local-friendly view for profile page
      password,
    };
    
  
    try {
      const response = await axiosPublic.post("/register", userData);
      if (response.data.success) {
        // 🔐 Immediately log in
        const loginResponse = await axiosPublic.post("/login", {
          email,
          password,
        });
      
        if (loginResponse.data.success) {
          // ✅ Store user in localStorage/context
          localStorage.setItem("authUser", JSON.stringify(loginResponse.data.data));
      
          setUser(loginResponse.data.data); // <- assuming you're using AuthContext
      
          Swal.fire({
            icon: "success",
            title: "Welcome!",
            text: "Your account was created and you’ve been logged in.",
            timer: 2000,
            showConfirmButton: false,
          });
      
          navigate("/MyProjects"); // or wherever the logged-in user should go
        } else {
          setResError({ message: "Account created, but login failed. Please try logging in." });
        }
      }
       else {
        setResError(response.data);
      }
    } catch (err) {
      console.error("❌ Registration error:", err);
      setResError({ message: err?.response?.data?.message || "Something went wrong." });
    }
  };

  const onChange = (e) => {
    setIsAgreed(e.target.checked);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {/* Light Grey Container */}
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md mx-auto">
      
        {/* Form and logo */}
        <div className="py-4 flex flex-col justify-center mx-auto w-full">
          <div className="w-full text-center">
            <img src={logo} className="w-32 mx-auto" alt="Logo" />
            <div className="my-4">
              <h2 className="text-smallBold text-textBlack">Create an Account</h2>
              <p className="text-textGray text-semiBold">
                Enter your details to create an account.
              </p>
            </div>
          </div>
  
          {/* Registration form */}
          <form onSubmit={handleRegister} className="w-full max-w-xs mx-auto">
          {resError?.message && (
            <p className="text-red-500 text-sm mb-2">{resError.message}</p>
          )}

  
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
  
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Company Name</label>
              <Input
                name="company"
                required
                placeholder="e.g. All Roof Take-offs"
                className="w-full"
                variant="filled"
              />
            </div>
  
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Email</label>
              <Input
                name="email"
                required
                placeholder="Enter your email"
                className="w-full"
                variant="filled"
              />
            </div>
  
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Phone</label>
              <Input
                name="phone"
                required
                placeholder="Enter your phone"
                className="w-full"
                variant="filled"
              />
            </div>
  
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Password</label>
              <Input.Password
                name="password"
                required
                placeholder="Enter your password"
                className="w-full"
                variant="filled"
              />
            </div>
  
            <div className="flex flex-col mb-4">
              <label className="mb-2 text-semiBold">Retype Password</label>
              <Input.Password
                name="reTypePassword"
                required
                placeholder="Re-enter your password"
                onChange={() => setPassErr("")}
                className="w-full"
                variant="filled"
              />
            </div>
  
            {passErr && <p className="text-red-500">{passErr}</p>}
  
            <div>
              <Checkbox onChange={onChange}>
                By clicking create account button, you agree to our{" "}
                <span className="text-semiBold">
                  <a href="#">Terms and Conditions</a>
                </span>{" "}
                and{" "}
                <span className="text-semiBold">
                  <a href="#">Privacy Policy</a>
                </span>
                .
              </Checkbox>
            </div>
  
            <button
              disabled={!isAgreed}
              className={`w-full bg-primary text-white font-semibold py-2 rounded-md ${
                !isAgreed ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Create account
            </button>
          </form>
  
          <p className="text-blue-400 underline mt-4">
            <Link to="/login">Already have an account? Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
