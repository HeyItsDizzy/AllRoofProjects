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
    config.headers["Access-Control-Allow-Credentials"] = "true";

    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    if (!config.headers["Accept"]) {
      config.headers["Accept"] = "application/json, text/plain, */*";
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
      console.log("🔄 Session expired due to role change, forcing page refresh");
      
      // Show user-friendly message
      Swal.fire({
        icon: "warning",
        title: "Session Updated", 
        text: "Your permissions have changed. The page will refresh to update your access.",
        showConfirmButton: false,
        timer: 3000
      }).then(() => {
        // Force a page refresh to get new token with updated permissions
        window.location.reload();
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
