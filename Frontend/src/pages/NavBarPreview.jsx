import React from "react";
import NavBar from "@/shared/NavBar"; // Adjust the path to where your NavBar is located

const NavBarPreview = () => {
  return (
    <div className="h-screen bg-gray-200 flex justify-center items-center">
      <NavBar />
    </div>
  );
};

export default NavBarPreview;
