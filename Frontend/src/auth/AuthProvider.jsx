/* PRODUCTION READY*/
import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const token = localStorage.getItem("authToken");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
    setIsAuthReady(true);
  }, []);

  const logout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    setUser(null);
  };

  const refreshUser = async () => {
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
