/* PRODUCTION READY*/
import { createContext, useEffect, useState } from "react";
import versionService from "../services/versionService";
import axios from "axios";

export const AuthContext = createContext();

// Create a simple axios instance for auth validation (without interceptors to avoid circular dependencies)
const authAxios = axios.create({
  baseURL: import.meta.env.MODE === 'development' ? '/api' : import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for dev overrides first
      const devUserOverride = localStorage.getItem("devUserOverride");
      const devRoleOverride = localStorage.getItem("devRoleOverride");
      
      let storedUser = localStorage.getItem("authUser");
      const token = localStorage.getItem("authToken");

      // Also check for "user" key (used by dev tools)
      if (!storedUser) {
        storedUser = localStorage.getItem("user");
      }

      if (storedUser && token) {
        let userData = JSON.parse(storedUser);
        
        // If there's a full user override, use that instead
        if (devUserOverride) {
          try {
            userData = JSON.parse(devUserOverride);
          } catch (e) {
            // If parsing fails, just apply role override
            if (devRoleOverride) {
              userData = { ...userData, role: devRoleOverride };
            }
          }
        } else if (devRoleOverride) {
          // Apply just role override if no full user override
          userData = { ...userData, role: devRoleOverride };
        }
        
        // Validate the token by making a request to the backend
        // Don't validate tokens on startup - let the component API calls handle this
        // This avoids interfering with the axios interceptor popup flow
        console.log("🔐 Auth startup: Found stored user and token, setting user without validation");
        console.log(`👤 User role: ${userData.role}`);
        setUser(userData);
        
        // Start version checking for authenticated users (ALL ROLES)
        console.log(`🔄 Starting version check service for user: ${userData.email} (${userData.role})`);
        versionService.startPeriodicCheck(5); // Check every 5 minutes
      }

      setLoading(false);
      setIsAuthReady(true);
    };

    initializeAuth();

    // Cleanup version checking on unmount
    return () => {
      versionService.stopPeriodicCheck();
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    // Clear dev overrides on logout
    localStorage.removeItem("devRoleOverride");
    localStorage.removeItem("devUserOverride");
    localStorage.removeItem("originalUser");
    setUser(null);
    
    // Stop version checking when user logs out
    versionService.stopPeriodicCheck();
  };

  const refreshUser = async () => {
    // Don't refresh if we have dev overrides active
    const devRoleOverride = localStorage.getItem("devRoleOverride");
    const devUserOverride = localStorage.getItem("devUserOverride");
    
    if (devRoleOverride || devUserOverride) {
      console.log("🔧 Skipping user refresh due to dev override");
      return;
    }
    
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const res = await fetch("https://projects.allrooftakeoffs.com.au/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const updatedUser = await res.json();
      if (updatedUser.success && updatedUser.data) {
        setUser(updatedUser.data);
        localStorage.setItem("authUser", JSON.stringify(updatedUser.data));
      }
    } catch (err) {
      console.error("❌ Failed to refresh user:", err);
    }
  };


  const authInformation = { user, loading, isAuthReady, logout, setUser, refreshUser };


  return (
    <AuthContext.Provider value={authInformation}>
      {!isAuthReady ? (
        <div className="h-screen flex justify-center items-center">
          <p className="text-center">Loading authentication...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
