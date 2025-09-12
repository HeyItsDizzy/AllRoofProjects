/* eslint-disable react/prop-types */
import { useState } from "react";
import { IconDown, IconUp } from "@/shared/IconSet.jsx";
import { Button, Drawer, Space } from "antd";
import { IconBackArrow } from "@/shared/IconSet.jsx";
import { IconDownload } from "@/shared/IconSet.jsx";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure.js";
import { useParams } from "react-router-dom";

const UserTableDetails = ({ id }) => {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);

  console.log(id);

  const axiosSecure = useAxiosSecure();
  const url = `/get-projects/${id}`;

  const showDrawer = () => {
    setOpen(true);
    // Fetch data only when the drawer is opened
    axiosSecure
      .get(url)
      .then((res) => {
        console.log(res.data);
        setProjects(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  const onClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        type="primary"
        className="text-primary bg-white border-stoke shadow-none hover:text-white hover:bg-primary"
        onClick={showDrawer}
      >
        View Projects
      </Button>
      <Drawer
        extra={<Space></Space>}
        title={
          <>
            <div className="flex gap-3">
              <IconBackArrow
                className=" my-auto hover:bottom-2"
                onClick={onClose}
              />
              <p className=""> Back</p>
            </div>
          </>
        }
        width={370}
        closable={false}
        onClose={onClose}
        open={open}
      >
        <div>
          {/* Render fetched projects data here */}
          {projects && projects.length > 0 ? (
            projects.map((project) => (
              <div key={project.id}>
                {/* Display project details */}
                <p>{project.name}</p>
              </div>
            ))
          ) : (
            <p>No projects found</p>
          )}
        </div>
      </Drawer>
    </>
  );
};

export default UserTableDetails;
