import { Button } from "antd";
import { useEffect, useRef, useState, useContext } from "react";
import { IconBackArrow, IconDownload, IconFolder } from "../shared/IconSet";
import { Link, useParams, useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AddressInput from "../Components/AddressInput";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import { AuthContext } from "../auth/AuthProvider";
import FileDirectoryPanel from "@/FileManager/panel/FileDirectoryPanel";
import FileDropModal from "@/FileManager/components/FileDropModal";
import { useFolderManager } from "@/FileManager/hooks/useFolderManager";
import FolderPanelWrapper from "@/FileManager/shared/FolderPanelWrapper";

const DEFAULT_USER_ROLE = "User";


const ProjectsView = () => {
  const [project, setProject] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalProject, setOriginalProject] = useState(null);
  const [userCache, setUserCache] = useState({});

  const { id } = useParams();
  const axiosSecure = useAxiosSecure();
  const componentRef = useRef();
  const { user } = useContext(AuthContext);
  const userRole = user?.role || DEFAULT_USER_ROLE;
  const isUserLinked = project?.linkedUsers?.includes(user?.id);
  const navigate = useNavigate();

  const projectAlias = `${project?.projectNumber || ""} - ${project?.name || ""}`;

  const {
    folderList,
    folderTree,
    fetchFolders,
    selectedPath,
    setSelectedPath,
    setRefreshFlag,
  } = useFolderManager(id, user?.role || "user");

  const isEditingAllowed = isEditing && (userRole === "Admin" || (userRole === "User" && isUserLinked));
  const isEstimatorEditingAllowed = isEditing && userRole === "Estimator"; // 🔒 Future use
  
  useEffect(() => {
    console.log("🧹 ProjectView mounted for ID:", id);
    return () => {
      console.log("🧹 ProjectView unmounted for ID:", id);
    };
  }, [id]);
  
  // Redirect if user is not linked to the project
  useEffect(() => {
    if (userRole === "User" && project?._id && !isUserLinked) {
      navigate("/forbidden");
    }
  }, [userRole, isUserLinked, project?._id, navigate]);

  // Fetch project data
  useEffect(() => {
    if (!id) {
      console.error("❌ Project ID is undefined!");
      return;
    }

    axiosSecure.get(`/projects/get-project/${id}`)
      .then((res) => {
        console.log("🔍 Debug: Project Data:", res.data.data);
        const fetchedProject = res.data.data;

        if (!fetchedProject.linkedUsers.includes(user?.id) && userRole === "User") {
          fetchedProject.linkedUsers.push(user?.id);
        }

        setProject(fetchedProject);
        setOriginalProject(fetchedProject);
      })
      .catch((err) => {
        console.error("❌ Error fetching project:", err);
      });
  }, [axiosSecure, id]);

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosSecure.get("/users/get-users");
        if (response.data.success) {
          const usersMap = response.data.data.reduce((acc, user) => {
            acc[user._id] = user; // Store users by ID
            return acc;
          }, {});
          setUserCache(usersMap);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    console.log("🔍 Fetching users, Axios Created");
    fetchUsers();
  }, [axiosSecure]);


// ✅ Long Poll once per change – no infinite loop
useEffect(() => {
  if (!id) return;

  let isCancelled = false;

  const longPollForDiskChanges = async () => {
    try {
      //x/console.log("🛰️ Long poll triggered");
      const res = await axiosSecure.get(`/files/${id}/watch-disk`);

      if (isCancelled) return;

      if (res?.data?.changed) {
        console.log("📦 Detected disk change, refreshing folder tree...");
        await fetchFolders();
      } else {
        //x/console.log("🟡 No change this cycle.");
      }

      // Always re-call after response
      longPollForDiskChanges();

    } catch (err) {
      if (!isCancelled) {
        console.error("❌ Long polling error:", err);
        setTimeout(() => longPollForDiskChanges(), 5000); // Retry after delay
      }
    }
  };

  longPollForDiskChanges();

  return () => {
    isCancelled = true;
  };
}, [id, fetchFolders, axiosSecure]);


  // Handle project update
  const handleUpdateProject = async () => {
    try {
      if (!project) {
        console.error("❌ Project is not defined!");
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Project data is missing!",
        });
        return;
      }
  
      console.log("🔍 Project before update:", project);
      console.log("🔍 Original Project:", originalProject);
  
      if (!originalProject) {
        console.warn("⚠️ No original project available, exiting edit mode.");
        setIsEditing(false);
        return;
      }
  
      const { _id, ...updatedProject } = project;
      const { _id: originalId, ...originalData } = originalProject;
  
      // 🛠️ FIX: Normalize malformed location
      if (
        typeof updatedProject.location === "object" &&
        (!updatedProject.location.full_address || updatedProject.location.full_address.trim() === "")
      ) {
        updatedProject.location = "";
      }
  
      if (JSON.stringify(updatedProject) === JSON.stringify(originalData)) {
        console.log("🔍 No changes detected. Exiting edit mode.");
        setIsEditing(false);
        return;
      }
  
      console.log("🚀 Sending update request to server...");
      const response = await axiosSecure.patch(`/projects/update/${id}`, updatedProject);
  
      if (response?.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Project Updated",
          text: "Project updated successfully!",
          timer: 2000,
          showConfirmButton: false,
        });
        setIsEditing(false);
        setOriginalProject(project);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("❌ Error updating project:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Failed to update project. Please try again.",
      });
    }
  };
  

  // Handle download all files
  const handleDownloadAll = () => {
    project?.files?.forEach((file) => {
      if (file?.downloadableLink) {
        const link = document.createElement("a");
        link.href = file.downloadableLink;
        link.download = file.fileName || "downloaded-file";
        link.click();
      }
    });
  };

  // Handle download project details as PDF
  const handleDownloadPDF = async () => {
    const element = componentRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    while (heightLeft > 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, Math.min(imgHeight, pdfHeight));
      heightLeft -= pdfHeight;
      position -= pdfHeight;

      if (heightLeft > 0) {
        pdf.addPage();
        position = 0;
      }
    }

    pdf.save(`${project?.name || "Project_Details"}.pdf`);
  };
    
  
  //console.log("🧩 Final folderTree being passed to FolderTreeDND:", folderTree);



// ProjectsView.jsx Return block
return (
  <div className="min-h-screen pb-4 mt-4">
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <p className="flex gap-3 my-3">
        <Link to="/">
          <IconBackArrow className="text-2xl text-textGray" />
        </Link>
        Project View
      </p>
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <button
              className="px-4 py-2 rounded-md border-2 border-gray-400 text-gray-700"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-md border-2 border-green-500 bg-green-500 text-white"
              onClick={handleUpdateProject}
            >
              Save Changes
            </button>
          </>
        ) : (
          <button
            className="px-4 py-2 rounded-md border-2 border-blue-500 bg-blue-500 text-white"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        )}
        <button
          className="px-4 py-2 rounded-md border-2 border-gray-500"
          onClick={handleDownloadPDF}
        >
          <span className="flex gap-2 items-center">
            <IconDownload className="text-lg" /> Download
          </span>
        </button>
      </div>
    </div>

    <div ref={componentRef}>
      {/* Project Name & Number */}
      <div className="w-full p-4 bg-white rounded-lg shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        {isEditing ? (
          <input
            type="text"
            className="text-2xl sm:text-3xl font-semibold w-full sm:flex-grow border rounded-md p-2"
            value={project?.name || ""}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
          />
        ) : (
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">
            {project?.name}
          </h2>
        )}
        {project?.projectNumber && (
          <div className="text-gray-600 text-lg sm:text-right">
            <strong>#:</strong> {project.projectNumber}
          </div>
        )}
      </div>

      {/* Info Boxes */}
      <div className="flex flex-wrap my-6 gap-4">
        <div className="flex-1 min-w-[250px] bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Location</p>
          {isEditing ? (
            <AddressInput
              location={project?.location || {}}
              setLocation={(newLocation) => setProject({ ...project, location: newLocation })}
              isEditing={isEditing}
            />
          ) : (
            <h3 className="text-xl font-medium text-gray-800">
              {typeof project.location === "string"
                ? project.location
                : project.location?.full_address || "No Address Available"}
            </h3>
          )}
        </div>
        <div className="w-full sm:w-[174px] bg-white p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500">Due Date</p>
          {isEditing ? (
            <input
              type="date"
              className="w-full border rounded-md p-2"
              value={project?.due_date || ""}
              onChange={(e) => setProject({ ...project, due_date: e.target.value })}
            />
          ) : (
            <h3 className="text-xl font-medium text-gray-800">
              {project?.due_date
                ? new Date(project.due_date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "N/A"}
            </h3>
          )}
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-white p-4 rounded-md mb-4 shadow-sm">
        <h4 className="text-lg font-semibold mb-2">Job Scope/Details</h4>
        {isEditing ? (
          <textarea
            className="w-full border rounded-md p-2"
            value={project?.description || ""}
            onChange={(e) => setProject({ ...project, description: e.target.value })}
          />
        ) : (
          <div
            className="prose prose-sm max-w-none text-gray-800 bg-gray-50 border border-gray-200 p-4 rounded-md"
            dangerouslySetInnerHTML={{
              __html: (project?.description || "").replace(/\n/g, "<br />"),
            }}
          />
        )}
      </div>

      {/* Estimate Notes */}
      <div className="bg-white p-4 rounded-md shadow-sm">
        <h4 className="text-lg font-semibold mb-2">Estimate Notes</h4>
        {["notes", "assumptions", "exclusions"].map((section) => (
          <div key={section} className="mb-4">
            <label className="text-sm font-medium block mb-1 capitalize">{section}:</label>
            {isEditing ? (
              <textarea
                className="w-full border rounded-md p-2"
                value={project?.estimateNotes?.[section] || ""}
                onChange={(e) =>
                  setProject({
                    ...project,
                    estimateNotes: {
                      ...project.estimateNotes,
                      [section]: e.target.value,
                    },
                  })
                }
              />
            ) : (
              <p className="p-2 border rounded-md bg-gray-100">
                {project?.estimateNotes?.[section] || `No ${section} specified`}
              </p>
            )}
          </div>
        ))}
      </div>

      <div
  className="relative bg-white p-4 rounded-md shadow-sm w-full mt-6"
  onDragOver={(e) => {
    e.preventDefault();
    setIsDragging(true);
  }}
  onDragLeave={(e) => {
    e.preventDefault();
    setIsDragging(false);
  }}
  onDrop={(e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setDroppedFiles(dropped);
    setShowFolderModal(true); // This opens the modal
  }}
>
  {isDragging && (
    <div className="absolute inset-0 bg-blue-100 bg-opacity-60 flex items-center justify-center text-blue-700 font-semibold rounded-md z-50 pointer-events-none">
      Drop files here to upload
    </div>
  )}

  <div className="flex justify-between items-center mb-3">
    <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
      <IconFolder className="text-gray-500" />
      File and attachment
    </h3>
    {project?.files?.length > 0 && (
  <div className="flex gap-2 items-center">
    <Button
      className="bg-transparent border-blue-500 text-blue-600"
      onClick={() => setShowFolderModal(true)}
    >
      View
    </Button>

    <label
      htmlFor="uploadButtonProjectsView"
      className="border border-green-500 text-green-600 px-4 py-[6px] rounded-md cursor-pointer flex items-center justify-center text-sm h-[32px] hover:bg-green-50 transition"
    >
      Upload Files
      <input
        id="uploadButtonProjectsView"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files);
          if (selected?.length > 0) {
            setDroppedFiles(selected);
            setShowFolderModal(true);
          }
        }}
      />
    </label>

    <Button
      className="bg-transparent border-primary text-primary"
      onClick={handleDownloadAll}
    >
      Download all
    </Button>
  </div>
)}

  </div>

  <FolderPanelWrapper projectId={id} userRole={user?.role || "User"}>
  {(folderManager) => (
    <FileDirectoryPanel
    {...folderManager}
    folderList={folderManager.folderList}
  />
  
  )}
</FolderPanelWrapper>




</div>



      {/* Quote Breakdown Full Width */}
      <div className="w-full bg-white p-4 rounded-md shadow-sm mt-4">
        <h3 className="font-semibold text-lg">Project Quote Breakdown</h3>
        <div className="flex justify-between">
          <p className="text-gray-800">Sub Total</p>
          {isEditing ? (
            <input
              type="number"
              className="w-full border rounded-md p-2"
              value={project?.subTotal || 0}
              onChange={(e) =>
                setProject({ ...project, subTotal: parseFloat(e.target.value) || 0 })
              }
            />
          ) : (
            <p className="text-gray-800">{project?.subTotal}</p>
          )}
        </div>
        <div className="flex justify-between">
          <p className="text-gray-800">GST</p>
          {isEditing ? (
            <input
              type="number"
              className="w-full border rounded-md p-2"
              value={project?.gst || 0}
              onChange={(e) =>
                setProject({ ...project, gst: parseFloat(e.target.value) || 0 })
              }
            />
          ) : (
            <p className="text-gray-800">{project?.gst}</p>
          )}
        </div>
        <div className="h-[2px] bg-black my-1"></div>
        <div className="flex justify-between font-semibold text-textBlack">
          <h2 className="text-lg">Total</h2>
          <p className="text-gray-800">{project?.total}</p>
        </div>
      </div>

      {/* Folder Modal */}
      {showFolderModal && (
        <FileDropModal
  projectId={id}
  projectAlias={projectAlias}
  files={droppedFiles}
  userRole={user?.role || "user"} // ✅ This line enables role-based folder access
  onClose={() => {
    setShowFolderModal(false);
    setDroppedFiles([]);
  }}
  onUpload={({ files, folderPath }) => {
    console.log("Upload these files to:", folderPath, files);
  }}
/>

      )}

      {/* Footer */}
      <div className="bg-white p-4 mt-4 rounded-md shadow-sm">
        <h4 className="text-lg font-semibold mb-2">Created for:</h4>
        {project?.linkedUsers?.length > 0 ? (
  project.linkedUsers.map((userId) => {
    const user = userCache[userId];
    return user ? (
      <div key={`linked-user-${userId ?? crypto.randomUUID()}`}>
        <h3 className="text-xl font-medium text-gray-800">{user.name || "Unknown Name"}</h3>
        <p className="text-gray-600">{user.email || "No email"}</p>
        <p className="text-gray-600">{user.phone || "No phone"}</p>
        <p className="text-gray-600">
          {typeof user.address === "object"
            ? `${user.address.full_address?.split(",")[0] || "No Address"}, ${user.address.city || ""}, ${user.address.zip || ""}`
            : user.address || "No address"}
        </p>
      </div>
    ) : (
      <p key={`loading-${crypto.randomUUID()}`} className="text-gray-500">Loading...</p>
    );
  })
) : (
  <p className="text-gray-500">No users assigned</p>
)}

      </div>
    </div>
  </div>
);

}; // Closing ProjectsView function

export default ProjectsView;
