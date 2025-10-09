// src/Layout/User.jsx
import NavBar from "@/shared/NavBar";
import { Outlet } from "react-router-dom";
import useRouteTitle from "@/hooks/useRouteTitle";
import RoleSwitcher from "../components/RoleSwitcher";
import "../styles/cls-fix.css";

const User = () => {
  // ← this will pick up your routes' handle.title metadata
  useRouteTitle();

  return (
    <div className="bg-bgGray min-h-screen">
      <RoleSwitcher />
      <div className="border-b-[1px] border-textGray border-opacity-50 stable-padding sticky top-0 z-20 bg-bgGray navbar-container">
        <NavBar />
      </div>
      <div className="stable-padding">
        <Outlet />
      </div>
    </div>
  );
};

export default User;
