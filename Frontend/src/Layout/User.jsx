import NavBar from "../shared/NavBar";
import { Outlet } from "react-router-dom";

const User = () => {
  return (
    <div className="bg-bgGray ">
      <div className="border-b-[1px] border-textGray border-opacity-50 md:px-16 lg:px-24 sticky top-0 z-20 bg-bgGray bg-opacity-70">
        <NavBar />
      </div>
      <div className="px-4 md:px-16 lg:px-24">
        <Outlet />
      </div>
    </div>
  );
};

export default User;
