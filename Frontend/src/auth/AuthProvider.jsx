import { createContext, useEffect, useState } from "react";
import axiosPublic from "../hooks/AxiosPublic/useAxiosPublic";
export const AuthContext = createContext();

// eslint-disable-next-line react/prop-types
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user data
  const [loading, setLoading] = useState(true); // Simulate loading state
  //const axiosPublic = axiosPublic(); // Use axios instance for secure requests
  // const navigate = useNavigate();

  // Check local storage for existing user
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const token = localStorage.getItem("authToken");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser)); // Set user if found in local storage
    }
    setLoading(false); // Loading complete
  }, []);

//Debug before login
  console.log("axiosPublic:", axiosPublic);

// Login function with backend integration
const login = async ({ email, password }) => {
  try {
    console.log("Attempting login with:", { email, password });

    const response = await axiosPublic.post("/login", { email, password });

    console.log("Login Response:", response);

    if (response.data.success) {
      const { user, token } = response.data.data;

      // Store the user and token in localStorage
      localStorage.setItem("authUser", JSON.stringify(user));
      localStorage.setItem("authToken", token);

      // Update state with user data
      setUser(user);
      console.log("User successfully logged in:", user);
    } else {
      console.error("Login failed:", response.data.message);
      alert(`Login failed: ${response.data.message}`);
    }
  } catch (error) {
    console.error("Login Error:", error.message);
    alert("An error occurred during login. Please try again.");
  }
};


  // Logout function
  const logout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    setUser(null); // Clear user from state
  };

  const authInformation = {
    user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authInformation}>
      {loading ? (
        <div className="h-screen flex justify-center items-center">
          <p className="text-center">Loading...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
