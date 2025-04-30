import { createContext, useEffect, useState } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    const token = localStorage.getItem("authToken");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser)); 
    }
    setLoading(false); // Once loading is done, set to false
  }, []);

  const logout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    setUser(null); // Clear user from state
  };

  const authInformation = { user, loading, logout, setUser };

  return (
    <AuthContext.Provider value={authInformation}>
      {loading ? (
        <div className="h-screen flex justify-center items-center">
          <p className="text-center">Loading...</p>
        </div>
      ) : (
        children // Render children (routes) if user is logged in
      )}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
