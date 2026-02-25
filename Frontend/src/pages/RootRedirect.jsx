import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RootRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser"); // Get user data from local storage
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user) {
      // All authenticated users go to the unified projects view
      navigate("/projects"); // Unified route for all roles
    } else {
      navigate("/login"); // Redirect to login if no user found
    }
  }, [navigate]);

  return null; // No UI, just a redirect
};

export default RootRedirect;
