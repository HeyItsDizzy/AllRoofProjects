// src/hooks/AxiosPublic/useAxiosPublic.js
import axios from "axios";
import { APP_CONFIG } from '../../config/version';

console.log("public VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
console.log("Full environment:", import.meta.env);

// In development mode, use the environment variable for local backend
// In production, use the full URL from environment
const baseURL = import.meta.env.VITE_API_BASE_URL;

console.log("🔧 [AXIOS PUBLIC] Using baseURL:", baseURL, "| Mode:", import.meta.env.MODE);

// Create an Axios instance
const axiosPublic = axios.create({
  baseURL, // Base URL for API requests
  withCredentials: true, // Send cookies and credentials with requests
});

// Add request interceptor to include version headers
axiosPublic.interceptors.request.use(
  (config) => {
    // Add version headers for backend version checking
    config.headers['X-App-Version'] = APP_CONFIG.VERSION;
    
    // Get deployment ID from localStorage if available
    const deploymentId = localStorage.getItem('deploymentId');
    if (deploymentId) {
      config.headers['X-Deployment-Id'] = deploymentId;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
