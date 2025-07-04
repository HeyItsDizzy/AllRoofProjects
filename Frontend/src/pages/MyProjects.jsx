import { useContext, useEffect, useState } from "react";
import { IconDown } from "../shared/IconSet.jsx";
import { IconSearch } from "../shared/IconSet.jsx";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import { Button } from "antd";
import { Link } from "react-router-dom";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import { IconPending } from "../shared/IconSet.jsx";
import { IconComplete } from "../shared/IconSet.jsx";
import { AuthContext } from "../auth/AuthProvider";

const MyProjects = () => {
  const [activeButton, setActiveButton] = useState("All Projects");
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const id = user._id; // Fetch logged-in user ID
  const url = `/projects/get-projects/${id}`;

  // Handle search input
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  // Determine date filter based on selected button
  const getStartDate = () => {
    const today = new Date();
    if (activeButton === "New Projects") {
      today.setDate(today.getDate() - 7);
    } else if (activeButton === "Last Updated") {
      today.setDate(today.getDate() - 3);
    }
    return activeButton === "All Projects" ? null : today.toISOString();
  };

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axiosSecure.get(url, {
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
  }, [axiosSecure, search, activeButton]);

  // Mark project as complete
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
          const response = await axiosSecure.put(`/updateProjectToComplete/${projectId}`);
          if (response.data.success) {
            setProjects((prevProjects) =>
              prevProjects.map((project) =>
                project._id === projectId
                  ? { ...project, status: "complete" }
                  : project
              )
            );
            Swal.fire("Success!", "Project has been marked as complete.", "success");
          } else {
            Swal.fire("Error", response.data.message || "Failed to update project status", "error");
          }
        } catch (error) {
          console.error("Error marking project as complete:", error);
          Swal.fire("Error", "An error occurred. Please try again.", "error");
        }
      }
    });
  };

  return (
    <div className="min-h-screen">
      {/* Search and Filters */}
      <div className="w-full mx-auto my-6 flex flex-col md:flex-row md:justify-between items-center gap-4">
        <div className="relative">
          <IconSearch className="absolute top-[11px] left-2" />
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
                activeButton === label ? "bg-secondary text-white" : "bg-transparent text-textGray"
              }`}
              onClick={() => setActiveButton(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto bg-white p-4 rounded-md">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="text-left h-10 bg-primary-10 text-medium">
              <td className="pl-2 max-w-52">
                <span className="flex items-center">
                  Project Name <IconDown />
                </span>
              </td>
              <td>Linked User</td>
              <td>Address</td>
              <td>Date Posted</td>
              <td>Cost</td>
              <td>Due Date</td>
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
                    {project.linkedUsers ? (
                      <>
                        {project.linkedUsers?.image ? (
                          <img
                            className="rounded-full w-10 h-10 my-1"
                            src={project.linkedUsers?.image}
                            alt=""
                          />
                        ) : (
                          <div className="rounded-full w-10 h-10 flex justify-center align-middle bg-bgGray">
                            <h1 className="h-fit my-auto text-xl text-textBlack font-serif font-medium">
                              {project.name.slice(0, 2)}
                            </h1>
                          </div>
                        )}
                        <p className="my-2">{project.linkedUsers?.name}</p>
                      </>
                    ) : (
                      <p>Not Assigned</p>
                    )}
                  </td>
                  <td>{project.location}</td>
                  <td>{project.posting_date}</td>
                  <td>${project.total}</td>
                  <td>{project.due_date}</td>
                  <td className="text-primary">
                    <div className="flex justify-around">
                      <Button>
                        <Link to={`/project/${project._id}`}>View</Link>
                      </Button>
                      <div className="w-fit my-auto ">
                        {project.status === "New Lead" || !project.status ? (
                          <button className="flex">
                            <IconPending
                              className="text-secondary border-2 text-2xl rounded-full  p-1 border-secondary"
                              onClick={() => handleMarkComplete(project._id)}
                            />
                          </button>
                        ) : (
                          <p className="text-success font-semibold text-center w-full capitalize">
                            <IconComplete className="text-2xl" />
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
