import { useContext, useEffect, useState } from "react";
import { GoChevronDown } from "react-icons/go";
import { CiSearch } from "react-icons/ci";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";
import { Button } from "antd";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import { MdIncompleteCircle } from "react-icons/md";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";
import { AuthContext } from "../auth/AuthProvider";

const MyProjects = () => {
  const [activeButton, setActiveButton] = useState("All Projects");
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const id = user._id;

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // Determine start date based on selected filter
  const getStartDate = () => {
    const today = new Date();
    if (activeButton === "New Projects") {
      today.setDate(today.getDate() - 7); // Last week
    } else if (activeButton === "Last Updated") {
      today.setDate(today.getDate() - 3); // Last 3 days
    }
    return activeButton === "All Projects" ? null : today.toISOString();
  };

  // Fetch projects based on search, active button, and date filter
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axiosSecure.get(`/get-projects/${id}`, {
          params: {
            search,
            startDate: getStartDate(),
          },
        });
        setProjects(response.data.data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    const debounceFetch = setTimeout(fetchProjects, 500);

    return () => clearTimeout(debounceFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axiosSecure, search, activeButton]);

  // Fetch users for assignment options

  const handleMarkComplete = async (projectId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Do you want to mark this project as complete?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, mark it complete!",
      cancelButtonText: "No, keep it running",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axiosSecure.put(
            `/updateProjectToComplete/${projectId}`
          );
          if (response.data.success) {
            // Update the state to reflect the status change
            setProjects((prevProjects) =>
              prevProjects.map((project) =>
                project._id === projectId
                  ? { ...project, status: "complete" }
                  : project
              )
            );
            Swal.fire(
              "Success!",
              "Project has been marked as complete.",
              "success"
            );
          } else {
            Swal.fire(
              "Error",
              response.data.message || "Failed to update project status",
              "error"
            );
          }
        } catch (error) {
          console.error("Error marking project as complete:", error);
          Swal.fire("Error", "An error occurred. Please try again.", "error");
        }
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire("Cancelled", "The project remains unchanged.", "info");
      }
    });
  };

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto my-6 flex flex-col md:flex-row md:justify-between items-center gap-4">
        <div className="relative">
          <CiSearch className="absolute top-[11px] left-2" />
          <input
            type="text"
            placeholder="Search"
            className="pl-10 h-9 rounded-md placeholder:text-medium"
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white">
          {["All Projects", "New Projects", "Last Updated"].map((label) => (
            <button
              key={label}
              className={`px-4 py-1 rounded-full transition-colors duration-300 ${
                activeButton === label
                  ? "bg-secondary text-white"
                  : "bg-transparent text-textGray"
              }`}
              onClick={() => setActiveButton(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto bg-white p-4 rounded-md">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="text-left h-10 bg-primary-10 text-medium">
              <td className="pl-2 max-w-52">
                <span className="flex items-center">
                  Project Name <GoChevronDown />
                </span>
              </td>
              <td>Assign With</td>
              <td>Country</td>
              <td>Posting Date</td>
              <td>Cost</td>
              <td>Deadline</td>
              <td>Action</td>
            </tr>
          </thead>
          <tbody>
            {projects.length > 0 ? (
              projects.map((project) => (
                <tr key={project._id} className="border-t-[1px] text-semiBold">
                  <td className="pl-2 py-2 max-w-52">
                    <span className="font-semibold">{project.name}</span>
                    <br />
                    {project.description && (
                      <span>{project.description.substring(0, 30)}...</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {project.assignedOn ? (
                        <>
                          {project.assignedOn?.image ? (
                            <img
                              className="rounded-full w-10 h-10 my-1"
                              src={project.assignedOn?.image}
                              alt=""
                            />
                          ) : (
                            <div className="rounded-full w-10 h-10 flex justify-center align-middle bg-bgGray">
                              <h1 className="h-fit my-auto text-xl text-textBlack font-serif font-medium">
                                {project.name.slice(0, 2)}
                              </h1>
                            </div>
                          )}
                          <p className="my-2">{project.assignedOn?.name}</p>
                        </>
                      ) : (
                        <p>Not Assigned</p>
                      )}
                    </div>
                  </td>
                  <td>{project.location}</td>
                  <td>{project.posting_date}</td>
                  <td>${project.total}</td>
                  <td>{project.dateline}</td>
                  <td className="text-primary">
                    <div className="flex justify-around">
                      <Button>
                        <Link to={`/project/${project._id}`}>View</Link>
                      </Button>
                      <div className="w-fit my-auto ">
                        {project.status === "running" || !project.status ? (
                          <button className="flex">
                            <MdIncompleteCircle
                              className="text-secondary border-2 text-2xl rounded-full  p-1 border-secondary"
                              onClick={() => handleMarkComplete(project._id)}
                            />
                          </button>
                        ) : (
                          <p className="text-success font-semibold text-center w-full capitalize">
                            {/* {project.status} */}
                            <IoCheckmarkDoneCircleOutline className="text-2xl" />
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-4">
                  No projects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyProjects;
