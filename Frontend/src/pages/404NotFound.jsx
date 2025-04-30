import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "../shared/NavBar"; // ✅ Import NavBar

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-bgGray">
      {/* ✅ Wrapped like layout NavBar */}
      <div className="border-b-[1px] border-textGray border-opacity-50 md:px-16 lg:px-24 sticky top-0 z-20 bg-bgGray bg-opacity-70">
        <NavBar />
      </div>
  
      {/* ✅ Main content area also wrapped like layout */}
      <div className="flex-grow px-4 md:px-16 lg:px-24">
        <div className="container mx-auto text-center py-10">
          <h1 className="text-4xl font-bold text-red-600">404 - Page Not Found</h1>
          <p className="text-lg mt-4 text-gray-700">
            The page you are looking for doesn't exist or has been moved.
          </p>
          <a href="/" className="text-primary underline mt-6 inline-block font-medium">
            Go back to the main page
          </a>
        </div>
      </div>
    </div>
  );
  
};

export default NotFound;
