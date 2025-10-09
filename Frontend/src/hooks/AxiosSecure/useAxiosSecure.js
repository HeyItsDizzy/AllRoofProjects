import axios from "axios";
import Swal from 'sweetalert2';
import { APP_CONFIG } from '../../config/version';

console.log("Full environment:\n- API_URL:", import.meta.env.VITE_API_BASE_URL, import.meta.env);

// In development mode, use relative URLs to enable Vite proxy
// In production, use the full URL from environment
const baseURL = import.meta.env.MODE === 'development' ? '/api' : import.meta.env.VITE_API_BASE_URL;

console.log("🔧 [AXIOS] Using baseURL:", baseURL, "| Mode:", import.meta.env.MODE);

const axiosSecure = axios.create({
  baseURL,
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
      
      // Store current URL for redirect after re-authentication (unless already on auth pages)
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      
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
    
    // Handle general 401 Unauthorized errors (token expired/invalid)
    if (error.response?.status === 401) {
      console.log(`🔄 Authentication failed (401), showing session expired popup`);
      
      // Store current URL for redirect after re-authentication (unless already on auth pages)
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.setItem('redirectAfterLogin', currentPath);
      }
      
      // Show session expired popup
      Swal.fire({
        title: "Session Expired",
        text: "Your session has expired. Please sign in again.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sign In",
        cancelButtonText: "Cancel"
      }).then((result) => {
        if (result.isConfirmed) {
          // Clear auth data and redirect to login
          localStorage.removeItem("authUser");
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          window.location.href = '/login';
        }
      });
      
      return Promise.reject(error);
    }
    
    // Handle 403 Forbidden errors - but only if it's a token issue, not permission issue
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || '';
      
      // Only show popup for token-related 403s, not permission issues
      if (errorMessage.includes('Token is invalid or expired')) {
        console.log(`🔄 Token expired (403), showing session expired popup`);
        
        // Store current URL for redirect after re-authentication (unless already on auth pages)
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login' && currentPath !== '/register') {
          localStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // Show session expired popup
        Swal.fire({
          title: "Session Expired",
          text: "Your session has expired. Please sign in again.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sign In",
          cancelButtonText: "Cancel"
        }).then((result) => {
          if (result.isConfirmed) {
            // Clear auth data and redirect to login
            localStorage.removeItem("authUser");
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            window.location.href = '/login';
          }
        });
        
        return Promise.reject(error);
      } else {
        // This is a real permission issue, let it through normally
        console.log(`❌ Permission denied (403): ${errorMessage}`);
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

const useAxiosSecure = () => {
  return axiosSecure;
};

export default useAxiosSecure;
