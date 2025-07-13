/* PRODUCTION READY*/
import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../auth/AuthProvider";

// Keep the same signature you were using (children)
// so nothing changes in your routes.jsx
const PrivateRoutes = ({ children }) => {
  const { user, isAuthReady } = useContext(AuthContext);
  const location = useLocation();

  // 1) While we haven’t finished the initial auth check, show a spinner/UI
  if (!isAuthReady) {
    return (
      <div className="h-screen flex justify-center items-center">
        <p className="text-center">Checking authentication…</p>
      </div>
    );
  }

  // 2) Once auth is ready, if there's no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3) Otherwise render whatever was inside <PrivateRoutes>…</PrivateRoutes>
  return children;
};

export default PrivateRoutes;
