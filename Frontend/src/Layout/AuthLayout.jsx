// src/Layout/AuthLayout.jsx
import { Outlet } from "react-router-dom";
import useRouteTitle from "@/hooks/useRouteTitle";

const AuthLayout = () => {
  useRouteTitle(); // so login/register also update the tab title

  return (
    <div className="h-screen bg-gray-100 flex justify-center items-center">
      <div className="max-w-sm w-full bg-white p-8 rounded-lg shadow-lg">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
