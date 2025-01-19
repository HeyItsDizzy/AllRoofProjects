import { Button, Drawer, Space } from "antd";
import { useContext, useState } from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
import { AuthContext } from "../auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import { BsThreeDotsVertical } from "react-icons/bs";

const ProfileDroyer = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const isUser = user?.role === "User";

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  const navigate = useNavigate();
  const handelLogOut = () => {
    logout();
    navigate("/login");
  };
  return (
    <>
      <div onClick={showDrawer} className="flex items-center gap-1">
        {user?.image ? (
          <img src={user?.image} className=" w-11 h-11 rounded-full" alt="" />
        ) : (
          <div className="rounded-full w-11  h-11 flex justify-center align-middle bg-secondary">
            <h1 className="h-fit my-auto text-xl text-textBlack font-serif font-medium">
              {user?.name.slice(0, 2)}
            </h1>
          </div>
        )}
        <div>
          <h3 className="font-bold hidden md:block lg:block">{user?.name}</h3>
          <p className="text-textGray hidden md:block lg:block">
            {user?.email}
          </p>
        </div>
        <BsThreeDotsVertical />
      </div>
      <Drawer
        extra={<Space></Space>}
        title={
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-3 h-fit">
                <FaArrowLeftLong
                  className=" my-auto hover:bottom-2"
                  onClick={onClose}
                />
                <p className=""> Back</p>
              </div>
              <div className="flex h-fit gap-2">
                {isUser && (
                  <Button className="bg-secondary text-white">
                    <Link to="/myProjects">My Projects</Link>
                  </Button>
                )}
                <Button
                  className="bg-red-500 text-white"
                  onClick={handelLogOut}
                >
                  Logout
                </Button>
              </div>
            </div>
          </>
        }
        width={370}
        closable={false}
        onClose={onClose}
        open={open}
      >
        <div className="text-center">
          <div>
            {user?.image ? (
              <img
                src={user?.image}
                className="w-44 rounded-full mx-auto"
                alt=""
              />
            ) : (
              <div className="rounded-full mx-auto w-40 h-40 flex justify-center align-middle bg-secondary">
                <h1 className="h-fit my-auto text-7xl text-textBlack font-serif font-medium">
                  {user?.name.slice(0, 2)}
                </h1>
              </div>
            )}
          </div>
          <h1 className="text-textBlack text-xl font-serif my-3">
            {user?.name}
          </h1>
          <p>{user?.email}</p>
          <p>{user?.address}</p>
          <p>{user?.phone}</p>
        </div>
      </Drawer>
    </>
  );
};

export default ProfileDroyer;
