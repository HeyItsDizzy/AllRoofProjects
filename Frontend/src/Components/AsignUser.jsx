import { Button, Modal } from "antd";
import React from "react";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";
import Swal from "sweetalert2";

const AssignUser = ({ users = [], projectId }) => {
  const [open, setOpen] = React.useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = React.useState(false);

  const showLoading = () => {
    setOpen(true);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
    }, 400);
  };

  const axiosSecure = useAxiosSecure();
  const url = `/asignUser/${projectId}`;

  const handelAsignUser = (user) => {
    console.log(user);

    Swal.fire({
      title: `Do you want to asign this project on ${user?.name}`,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      denyButtonText: `No`,
    }).then((result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        axiosSecure
          .patch(url, user)
          .then((res) => {
            if (res.data.success) {
              showLoading();
              Swal.fire(`Asign project on ${user?.name}`);
            } else {
              alert(res.data.message);
              Swal.fire(res.data.message);
            }
            console.log(res.data);
          })
          .catch((err) => console.log(err));
      } else if (result.isDenied) {
        Swal.fire("Project are not asigned");
      }
    });
  };

  return (
    <>
      <Button
        type="primary"
        className="bg-white text-textBlack border-secondary shadow-none"
        onClick={showLoading}
      >
        Assign user
      </Button>
      <Modal footer="" open={open} onCancel={() => setOpen(false)} width={300}>
        <div className="my-4">
          {users.map((user) => (
            <div key={user._id} className="mt-1">
              <button
                onClick={() => handelAsignUser(user)}
                className="flex gap-2 items-center"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    className="w-10 h-10 rounded-full"
                    alt={user.name}
                  />
                ) : (
                  <div className="rounded-full w-10 h-10 flex justify-center items-center bg-bgGray">
                    <h1 className="text-xl text-textBlack font-serif font-medium">
                      {user.name.slice(0, 2)}
                    </h1>
                  </div>
                )}
                <span>{user.name}</span>
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default AssignUser;
