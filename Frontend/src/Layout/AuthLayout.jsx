import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="h-screen bg-gray-100 flex justify-center items-center">
      <div className="max-w-sm w-full bg-white p-8 rounded-lg shadow-lg">
        {/* This is where the Login or Register page content will be rendered */}
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
