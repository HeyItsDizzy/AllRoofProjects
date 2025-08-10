import { Button, Drawer, Space } from "antd";
import { useContext, useState } from "react";
import { IconBackArrow } from "../shared/IconSet.jsx";
import { AuthContext } from "../auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { IconMenuDots } from "../shared/IconSet.jsx";
import Avatar from "../shared/Avatar";

const ProfileDrawer = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const isUser = user?.role === "User";

  const handleNavClick = (path) => {
    onClose();
    navigate(path);
  };

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => setOpen(false);
  const navigate = useNavigate();
  const handleLogOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div onClick={showDrawer} className="flex items-center gap-1 cursor-pointer">
        <Avatar
          key={user?.avatar} // 🔥 force re-render when avatar changes
          name={user?.name}
          avatarUrl={user?.avatar}
          size="md"
        />

        <div className="hidden md:block lg:block">
          <h3 className="font-bold">{user?.name || user?.name}</h3>
          <p className="text-textGray">{user?.email}</p>
        </div>
        <IconMenuDots />
      </div>

      <Drawer
        extra={<Space />}
        title={
          <div className="flex items-center justify-between">
            <div className="flex gap-3 items-center">
              <IconBackArrow className="cursor-pointer" onClick={onClose} />
              <p className="font-medium">Back</p>
            </div>
            <div className="flex gap-2">
              {isUser && (
                <Button className="bg-secondary text-white">
                  <Link to="/myProjects">My Projects</Link>
                </Button>
              )}
              <Button className="bg-red-500 text-white" onClick={handleLogOut}>
                Logout
              </Button>
            </div>
          </div>
        }
        width={370}
        closable={false}
        onClose={onClose}
        open={open}
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mt-4">
            <Avatar
              key={user?.avatar} // 🔥 force re-render when avatar changes
              name={user?.name || user?.name}
              avatarUrl={user?.avatar}
              size="xl"
            />
          </div>

          <h1 className="text-xl font-semibold mt-4 text-textBlack">
            {user?.name || user?.name}
          </h1>
          <p className="text-textGray text-sm mt-1">{user?.email}</p>

          {user?.address?.full_address ? (
            <div className="mt-2 text-sm text-gray-700 leading-tight">
              <p className="flex items-center justify-center gap-2">
                {user.address.full_address.split(",")[0]}
              </p>
              <p>
                {user.address.city}, {user.address.zip}
              </p>
              <p>{user.address.state}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 italic">No address provided</p>
          )}

          <p className="mt-2 text-sm text-gray-700">📱 {user?.phone}</p>
        </div>

        <hr className="my-4 border-gray-300" />

        <ul className="space-y-3 text-left px-6 text-sm">
          <li>
            <button
              onClick={() => handleNavClick("/profile")}
              className="block w-full text-left hover:underline text-primary font-medium"
            >
              {user?.companyAdmin ? "👤 My Profile / User Profiles" : "👤 My Profile"}
            </button>
          </li>

          {user?.companyAdmin && (
            <li>
              <button
                onClick={() => handleNavClick("/company-profile")}
                className="block w-full text-left hover:underline text-primary font-medium"
              >
                🏢 Company Profile
              </button>
            </li>
          )}

          <li>
            <button
              disabled
              title="Coming soon"
              className="block w-full text-left text-gray-400 font-medium cursor-not-allowed"
            >
              🧩 Templates
            </button>
          </li>

          <li>
            <button
              disabled
              title="Coming soon"
              className="block w-full text-left text-gray-400 font-medium cursor-not-allowed"
            >
              ⚙️ Settings
            </button>
          </li>

          <li>
            <button
              disabled
              title="Coming soon"
              className="block w-full text-left text-gray-400 font-medium cursor-not-allowed"
            >
              🆘 Support / Help
            </button>
          </li>
        </ul>
      </Drawer>
    </>
  );
};

export default ProfileDrawer;
