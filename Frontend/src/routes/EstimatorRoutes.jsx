import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom"; // Import required hooks
import { AuthContext } from "../auth/AuthProvider"; // Import AuthContext

// eslint-disable-next-line react/prop-types
const EstimatorRoutes = ({ children }) => {
  const { loading, user } = useContext(AuthContext); // Extract loading and user from AuthContext
  const location = useLocation(); // Get the current location for redirection

  const existToken = localStorage.getItem("authToken"); // Check for authToken in localStorage

  // If the authentication state is still loading, display a loading message
  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <p className="text-center">Loading...</p>
      </div>
    );
  }

  // If user exists and is an Admin or Estimator, render the protected children (i.e., the page content)
  if (user && existToken && (user.role === "Admin" || user.role === "Estimator")) {
    return children;
  }

  // If user exists but is not an Admin or Estimator, redirect to the "No Access" page
  if (user && existToken && user.role !== "Admin" && user.role !== "Estimator") {
    return <Navigate to="/forbidden" state={{ from: location }} />;
  }

  // If no user is logged in, redirect to the login page
  return <Navigate to="/login" state={{ from: location }} />;
};

export default EstimatorRoutes;
