// src/Layout/User.jsx
import NavBar from "@/shared/NavBar";
import { Outlet } from "react-router-dom";
import useRouteTitle from "@/hooks/useRouteTitle";
import RoleSwitcher from "../components/RoleSwitcher";

const User = () => {
  // ← this will pick up your routes' handle.title metadata
  useRouteTitle();

  return (
    <div className="bg-bgGray min-h-screen">
      <RoleSwitcher />
      <div className="border-b-[1px] border-textGray border-opacity-50 md:px-16 lg:px-24 sticky top-0 z-20 bg-bgGray">
        <NavBar />
      </div>
      <div className="px-4 md:px-16 lg:px-24">
        <Outlet />
      </div>
    </div>
  );
};

export default User;
