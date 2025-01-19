import axios from "axios";

console.log("public VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
console.log("Full environment:", import.meta.env);

// Create an Axios instance
const axiosPublic = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Base URL for API requests
  withCredentials: true, // Send cookies and credentials with requests
});

// Log after Axios instance is created
console.log("After axios.create, API Base URL:", axiosPublic.defaults.baseURL);

// Add interceptors for error handling
axiosPublic.interceptors.response.use(
  (response) => {
    // Log successful responses (optional, useful for debugging)
    console.log("Axios Public Response:", response);
    return response;
  },
  (error) => {
    // Log errors globally
    console.error("Axios Public Error:", error.response?.data || error.message);
    // Optionally, handle specific error codes (e.g., 401 Unauthorized)
    if (error.response?.status === 401) {
      console.warn("Unauthorized request - redirecting to login.");
      // You can add redirection logic here if needed
    }
    return Promise.reject(error);
  }
);

export default axiosPublic;
