import './index.css';  // Import Tailwind's compiled styles
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/routes";  // This file contains the router setup
import AuthProvider from "./auth/AuthProvider"; 

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <StrictMode>
      <RouterProvider router={router} />  {/* Only this line is needed */}
    </StrictMode>
  </AuthProvider>
);