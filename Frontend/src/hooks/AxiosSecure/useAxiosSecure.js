import axios from "axios";
import Swal from 'sweetalert2';
import { APP_CONFIG } from '../../config/version';

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

    // Add version headers for backend version checking
    config.headers['X-App-Version'] = APP_CONFIG.VERSION;
    
    // Get deployment ID from localStorage if available
    const deploymentId = localStorage.getItem('deploymentId');
    if (deploymentId) {
      config.headers['X-Deployment-Id'] = deploymentId;
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

// Response interceptor to handle forced refreshes and version mismatches
axiosSecure.interceptors.response.use(
  (response) => {
    // Store deployment ID from successful responses
    if (response.data?.deploymentId) {
      localStorage.setItem('deploymentId', response.data.deploymentId);
    }
    return response;
  },
  (error) => {
    // Handle version-related errors (426 Upgrade Required)
    if (error.response?.status === 426) {
      const { code, message, currentVersion, deploymentId } = error.response.data;
      
      console.log("🔄 Version mismatch detected, forcing app refresh");
      
      let title = "App Update Required";
      let text = message || "A new version is available. Please refresh the application.";
      
      if (code === "VERSION_OUTDATED") {
        title = "Outdated Version";
        text = `Your app version is outdated. Please refresh to get the latest version (${currentVersion}).`;
      } else if (code === "DEPLOYMENT_MISMATCH") {
        title = "New Version Available";
        text = "A new version has been deployed. Please refresh to get the latest updates.";
      }
      
      // Store the new deployment ID
      if (deploymentId) {
        localStorage.setItem('deploymentId', deploymentId);
      }
      
      Swal.fire({
        icon: "warning",
        title,
        text,
        showConfirmButton: true,
        confirmButtonText: 'Refresh App',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then((result) => {
        if (result.isConfirmed) {
          // Clear all local storage
          localStorage.clear();
          // Force hard refresh
          window.location.reload(true);
        }
      });
      
      return Promise.reject(error);
    }
    
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
