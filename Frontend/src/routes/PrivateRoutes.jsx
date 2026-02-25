/* PRODUCTION READY*/
import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../auth/AuthProvider";

// Keep the same signature you were using (children)
// so nothing changes in your routes.jsx
const PrivateRoutes = ({ children }) => {
  const { user, isAuthReady } = useContext(AuthContext);
  const location = useLocation();

  // 1) While we haven't finished the initial auth check, show a spinner/UI
  if (!isAuthReady) {
    return (
      <div className="h-screen flex justify-center items-center">
        <p className="text-center">Checking authentication…</p>
      </div>
    );
  }

  // 2) Once auth is ready, if there's no user, redirect to login with intended URL
  if (!user) {
    // Store the intended URL in localStorage for retrieval after login
    // Only store URLs that require authentication (not login/register pages)
    if (location.pathname !== '/login' && location.pathname !== '/register') {
      // Only store direct project links and other protected content
      // Don't store general navigation like /projects, /profile etc. to avoid UX confusion
      if (location.pathname.startsWith('/project/') || 
          location.pathname.startsWith('/addNewProject') ||
          location.pathname.startsWith('/clients') ||
          location.pathname.startsWith('/user-management')) {
        localStorage.setItem('redirectAfterLogin', location.pathname + location.search);
        console.log("Stored redirect URL for authentication:", location.pathname + location.search);
      }
    }
    
    // Always redirect to login for authentication
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3) Check if non-admin user has linkedClients - redirect to company-choice if not
  // Exclude certain routes to avoid redirect loops
  const excludedPaths = ['/company-choice', '/company-profile', '/forbidden', '/login', '/register'];
  const shouldCheckCompany = !excludedPaths.includes(location.pathname);
  
  if (shouldCheckCompany && user.role !== "Admin" && (!user.linkedClients || user.linkedClients.length === 0)) {
    console.log("PrivateRoutes: No linkedClients found → redirecting to /company-choice");
    return <Navigate to="/company-choice" state={{ from: location }} replace />;
  }

  // 4) Otherwise render whatever was inside <PrivateRoutes>…</PrivateRoutes>
  return children;
};

export default PrivateRoutes;
