import { CiBellOn } from "react-icons/ci";
import { HiDotsVertical } from "react-icons/hi";
import logo from "../assets/logo.png";
import { Link, useLocation } from "react-router-dom";
import ProfileDrawer from "../Components/ProfileDrawer";
import { IoIosMenu } from "react-icons/io";
import { Drawer } from "antd";
import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import Avatar from "./Avatar"; // Adjust path if necessary

const NavBar = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const { user } = useContext(AuthContext);
  const role = user?.role;
  const isAdmin = role === "Admin";
  const isEstimator = role === "Estimator";
  const isUser = role === "User";

  const getProjectsPath = () => {
    if (isAdmin) return "/projects";
    if (isEstimator) return "/estimates";
    return "/MyProjects";
  };

  const navLinks = [
    {
      name: "Job Board",
      path: "/job-board",
      show: isAdmin || isEstimator,
    },
    {
      name: "Projects",
      path: getProjectsPath(),
      show: !!role,
      activeMatch: "/projects",
    },
    {
      name: "Users",
      path: "/users",
      show: isAdmin || isEstimator,
    },
  ];


  const renderLink = (link) => (
    <li key={link.name}>
      <Link
        to={link.path}
        className={`$ {
          location.pathname.startsWith(link.path)
            ? "underline font-bold text-textBlack"
            : ""
        }`}
      >
        {link.name}
      </Link>
    </li>
  );

  return (
    <div className="w-full top-0 left-0 right-0 bg-gray-100 px-0">
      {/* Large and medium devices */}
      <nav className="hidden md:flex lg:flex justify-between py-2 bg-gray-100 w-[100%] mx-auto px-6 rounded-lg mt-3">
        <div>
          <a href="https://www.allrooftakeoffs.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="Logo" className="w-36" />
          </a>
        </div>

        <div className="flex my-auto text-textGray">
          <ul className="flex gap-4 text-semiBold items-center">
            {navLinks.filter((link) => link.show).map((link) => renderLink(link))}
          </ul>
        </div>

        <ProfileDrawer>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm cursor-pointer">
            <Avatar
              key={user?.avatar} // 🔥 force re-render when avatar changes
              name={user?.company || user?.name}
              avatarUrl={user?.avatar}
              size="lg"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">
                {user?.company || user?.name}
              </span>
              <span className="text-xs text-gray-500">{user?.email}</span>
            </div>
            <HiDotsVertical className="ml-auto text-gray-400" />
          </div>
        </ProfileDrawer>
      </nav>

      {/* Small devices */}
      <nav className="flex justify-between items-center p-2 md:hidden lg:hidden bg-gray-100 w-full px-4">
        <div>
          <IoIosMenu onClick={showDrawer} className="text-2xl" />
          <Drawer title="Menu" placement="right" width={300} onClose={onClose} open={open}>
            <div className="h-fit text-center gap-6 text-textGray">
              <ul className="text-semiBold space-y-4">
                {navLinks.filter((link) => link.show).map((link) => renderLink(link))}
              </ul>
            </div>
          </Drawer>
        </div>

        <div>
          <a href="https://www.allrooftakeoffs.com" target="_blank" rel="noopener noreferrer">
            <img src={logo} alt="Logo" className="w-32" />
          </a>
        </div>

        <div className="flex gap-3 h-fit items-center">
          <button>
            <CiBellOn className="w-10 h-10 p-2 border-2 border-gray-400 rounded-full" />
          </button>
          <ProfileDrawer />
        </div>
      </nav>
    </div>
  );
};

export default NavBar;
