import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "@/shared/NavBar"; // ✅ Import NavBar

const Forbidden = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ✅ Only render NavBar if it's not already included via a parent layout */}
      {location.pathname !== "/forbidden" && <NavBar />} 

      <div className="flex-grow container mx-auto text-center py-10 px-4">
        <h1 className="text-4xl font-bold text-red-600">403 - Forbidden</h1>
        <p className="text-lg mt-4 text-gray-700">
          You do not have permission to access this page.
        </p>
        <a href="/" className="text-primary underline mt-6 inline-block font-medium">
          Go back to the main page
        </a>
      </div>
    </div>
  );
};

export default Forbidden;
