// hooks/AxiosFile/useAxiosFile.js
import { useEffect, useMemo, useRef } from "react";
import axios from "axios";

const useAxiosFile = () => {
  const interceptorsSetup = useRef(false);

  // Development: Use VPS for file operations, Production: Use FILE_API_BASE_URL if set, otherwise regular API_BASE_URL
  const fileApiBaseUrl = import.meta.env.MODE === 'development' 
    ? (import.meta.env.VITE_FILE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL)  // Dev: proxy file ops to VPS
    : (import.meta.env.VITE_FILE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL);  // Production fallback
  
  // Only log once per hook instance (removed repetitive logging)

  // Memoize axios instance creation - only recreate if baseURL changes
  const axiosFile = useMemo(() => {
    const instance = axios.create({
      baseURL: fileApiBaseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true, // Important for cross-origin requests with cookies
    });

    // Only log creation once per unique instance (removed repetitive logging)

    return instance;
  }, [fileApiBaseUrl]);

  useEffect(() => {
    // Prevent duplicate interceptor setup
    if (interceptorsSetup.current) return;

    const requestIntercept = axiosFile.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem("authToken");
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosFile.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        
        if (error?.response?.status === 401 && !prevRequest?.sent) {
          prevRequest.sent = true;
          // Handle token refresh if needed - you might want to implement this
          // For now, just log the error
          console.error("🗂️ [AXIOS FILE] Unauthorized request to file API:", error);
        }
        
        return Promise.reject(error);
      }
    );

    interceptorsSetup.current = true;

    return () => {
      axiosFile.interceptors.request.eject(requestIntercept);
      axiosFile.interceptors.response.eject(responseIntercept);
      interceptorsSetup.current = false;
    };
  }, [axiosFile]); // Only depend on axiosFile, which is now memoized

  return axiosFile;
};

export default useAxiosFile;