import axios from "axios";
import Swal from 'sweetalert2';

console.log("Full environment:\n- API_URL:", import.meta.env.VITE_API_BASE_URL, import.meta.env);

const axiosSecure = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // Using Vite's environment variable
  withCredentials: true,
});

axiosSecure.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    if (!config.headers["Accept"]) {
      config.headers["Accept"] = "application/json, text/plain, */*";
    }

    // Debug logging for phone verification endpoints
    if (config.url?.includes('verification-code') || config.url?.includes('verify-phone')) {
      console.log("🔍 Axios Request Debug:", {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data,
        hasToken: !!token,
        token: token ? `${token.substring(0, 20)}...` : null
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle forced refreshes
axiosSecure.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check for forced refresh requirement
    if (error.response?.status === 401 && error.response?.data?.requiresRefresh) {
      console.log("🔄 Session expired due to role change, forcing re-authentication");
      
      // Show user-friendly message and force re-login
      Swal.fire({
        icon: "warning",
        title: "Session Expired", 
        text: "Your permissions have changed. Please sign in again to continue.",
        showConfirmButton: true,
        confirmButtonText: 'Sign In Again',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then((result) => {
        if (result.isConfirmed) {
          // Clear all auth data
          localStorage.removeItem("authUser");
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          
          // Redirect to login
          window.location.href = '/login';
        }
      });
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

const useAxiosSecure = () => {
  return axiosSecure;
};

export default useAxiosSecure;
