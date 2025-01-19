import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom"; // Added useLocation
import { AuthContext } from "../auth/AuthProvider";

// eslint-disable-next-line react/prop-types
/*// Temp Bypass of AUTH, uncomment when working
const AdminRoutes = ({ children }) => {
  const { loading, user } = useContext(AuthContext);

  const location = useLocation(); // Get the current location for redirection after login

  const existToken = localStorage.getItem("authToken");

  // If the authentication state is still loading, display a loading message
  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  // If user exists, render the protected children (i.e., the page content)
  if (user && existToken && user.role === "Admin") {
    return children;
  }

  // If no user is logged in, redirect to the login page
  return <Navigate to="/login" state={{ from: location }} />;
};
*/
const AdminRoutes = ({ children }) => {
  // Bypass all authentication and directly return children
  return children;
};

export default AdminRoutes;