import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const RootRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser"); // Get user data from local storage
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (user) {
      // Redirect based on role
      if (user.role === "Admin") {
        navigate("/projects"); // Redirect Admins to Projects
      } else {
        navigate("/myprojects"); // Redirect Regular Users to Dashboard
      }
    } else {
      navigate("/login"); // Redirect to login if no user found
    }
  }, [navigate]);

  return null; // No UI, just a redirect
};

export default RootRedirect;
