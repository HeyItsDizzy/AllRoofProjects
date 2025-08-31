/* PRODUCTION READY*/
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
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
      
      setUser(userData);
    }

    setLoading(false);
    setIsAuthReady(true);
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
