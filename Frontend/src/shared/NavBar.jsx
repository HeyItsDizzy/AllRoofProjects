import { CiBellOn } from "react-icons/ci";
import logo from "../assets/logo.png";
import { Link } from "react-router-dom";
import ProfileDroyer from "../Components/ProfileDroyer";
import { IoIosMenu } from "react-icons/io";

import { Button, Drawer } from "antd";
import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";

const NavBar = () => {
  const [activeLink, setActiveLink] = useState("users");
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [placement, setPlacement] = useState("right");

  const handleLinkClick = (link) => setActiveLink(link);
  const showDrawer = () => setOpen(true);
  const onClose = () => setOpen(false);

  const { user } = useContext(AuthContext);

  const isAdmin = user?.role === "Admin";

  return (
    <div>
      {/* Large and medium devices */}
      <nav className="hidden md:flex lg:flex justify-between py-2">
        <div>
          <img src={logo} alt="Logo" className="w-36" />
        </div>

        {isAdmin ? (
          <div className="flex my-auto text-textGray">
            <ul className="flex gap-4 text-semiBold">
              <li>
                <Link
                  to="/users"
                  className={`${
                    activeLink === "users"
                      ? "underline font-bold text-textBlack"
                      : ""
                  }`}
                  onClick={() => handleLinkClick("users")}
                >
                  Users
                </Link>
              </li>
              <li>
                <Link
                  to="/projects"
                  className={`${
                    activeLink === "projects"
                      ? "underline font-bold text-textBlack"
                      : ""
                  }`}
                  onClick={() => handleLinkClick("projects")}
                >
                  Projects
                </Link>
              </li>
            </ul>
          </div>
        ) : (
          <></>
        )}

        <div className="flex gap-3 h-fit items-center">
          <Button className="text-white bg-primary py-5">
            <Link to="/addNewProject">Upload Project</Link>
          </Button>
          <button>
            <CiBellOn className="w-10 h-10 p-2 border-2 border-gray-400 rounded-full" />
          </button>
          <ProfileDroyer />
        </div>
      </nav>

      {/* Small devices */}
      <nav className="flex justify-between items-center p-2 md:hidden lg:hidden">
        {isAdmin && (
          <div>
            <IoIosMenu onClick={showDrawer} className="text-2xl" />
            <Drawer
              title="Close"
              placement={placement}
              width={300}
              onClose={onClose}
              open={open}
            >
              <div className="h-fit text-center gap-6 text-textGray">
                <ul className="text-semiBold">
                  <li>
                    <Link
                      to="/users"
                      className={`${
                        activeLink === "users"
                          ? "underline font-bold text-textBlack"
                          : ""
                      }`}
                      onClick={() => handleLinkClick("users")}
                    >
                      Users
                    </Link>
                  </li>
                  <li className="my-5">
                    <Link
                      to="/projects"
                      className={`${
                        activeLink === "projects"
                          ? "underline font-bold text-textBlack"
                          : ""
                      }`}
                      onClick={() => handleLinkClick("projects")}
                    >
                      Projects
                    </Link>
                  </li>
                </ul>
                <Button className="text-white bg-primary py-5">
                  <Link to="/addNewProject">Upload Project</Link>
                </Button>
              </div>
            </Drawer>
          </div>
        )}

        <div>
          <img src={logo} alt="Logo" className="w-32" />
        </div>

        <div className="flex gap-3 h-fit items-center">
          <Button className="text-white bg-primary  text-sm p-2 md:hidden lg:hidden">
            <Link to="/addNewProject">Upload Project</Link>
          </Button>
          <button>
            <CiBellOn className="w-10 h-10 p-2 border-2 border-gray-400 rounded-full" />
          </button>
          <ProfileDroyer />
          {/* <BsThreeDotsVertical /> */}
        </div>
      </nav>
    </div>
  );
};

export default NavBar;
