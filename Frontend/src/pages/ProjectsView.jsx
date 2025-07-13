// ProjectsView.jsx - Project details and file management interface
/* PRODUCTION READY*/
import { Button } from "antd";
import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { IconBackArrow, IconDownload, IconFolder } from "../shared/IconSet.jsx";
import { Link, useParams, useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import AddressInput from "../Components/AddressInput";
import Swal from '@/shared/swalConfig';
import { AuthContext } from "../auth/AuthProvider";
import FileDirectoryPanel from "@/FileManager/panel/FileDirectoryPanel";
import FileDropModal from "@/FileManager/components/FileDropModal";
import { useFolderManager } from "@/FileManager/hooks/useFolderManager";
import FolderPanelWrapper from "@/FileManager/shared/FolderPanelWrapper";

// Constants
const DEFAULT_USER_ROLE = "User";
const MODAL_ANIMATION_DELAY = 600;
const SUCCESS_NOTIFICATION_TIMER = 2000;
const POLLING_ERROR_RETRY_DELAY = 5000;

/**
 * ProjectsView Component - Displays project details with file management capabilities
 * Handles project editing, file operations, and user permissions
 */
const ProjectsView = () => {
  // Environment configuration
  const ENABLE_WATCHERS = import.meta.env.VITE_ENABLE_WATCHERS !== "false";
  
  // Project state management
  const [project, setProject] = useState({});
  const [originalProject, setOriginalProject] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // File management state
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [sharedGhosts, setSharedGhosts] = useState({});
  
  // UI state management
  const [userCache, setUserCache] = useState({});
  const [folderPanelRefreshKey, setFolderPanelRefreshKey] = useState(0);
  const [modalSelectedPath, setModalSelectedPath] = useState(".");
  const [lockedHeight, setLockedHeight] = useState(null);
  
  // Refs for DOM manipulation
  const folderPanelRef = useRef();
  const componentRef = useRef();
  
  // Hooks and context
  const { projectId, id } = useParams();
  const axiosSecure = useAxiosSecure();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Computed values
  const userRole = user?.role || DEFAULT_USER_ROLE;
  const isUserLinked = project?.linkedUsers?.includes(user?.id);
  const projectAlias = `${project?.projectNumber || ""} - ${project?.name || ""}`;
  
  // Permission checks
  const isEditingAllowed = isEditing && (userRole === "Admin" || (userRole === "User" && isUserLinked));
  const isEstimatorEditingAllowed = isEditing && userRole === "Estimator";
  
  // Folder management hook
  const {
    folderList,
    folderTree,
    fetchFolders,
    selectedPath,
    setSelectedPath,
    setRefreshFlag,
  } = useFolderManager(id, user?.role || "user");

  /**
   * Validates project data before operations
   * @param {Object} projectData - Project object to validate
   * @returns {boolean} - True if project data is valid
   */
  const validateProjectData = useCallback((projectData) => {
    if (!projectData || !projectData._id) {
      return false;
    }
    return true;
  }, []);

  /**
   * Normalizes malformed location data
   * @param {Object|string} location - Location data to normalize
   * @returns {Object|string} - Normalized location data
   */
  const normalizeLocation = useCallback((location) => {
    if (typeof location === "object" && 
        (!location.full_address || location.full_address.trim() === "")) {
      return "";
    }
    return location;
  }, []);

  /**
   * Handles successful operations with user feedback
   * @param {string} title - Success message title
   * @param {string} text - Success message text
   * @param {Function} callback - Optional callback to execute
   */
  const handleSuccess = useCallback((title, text, callback) => {
    Swal.fire({
      icon: "success",
      title,
      text,
      timer: SUCCESS_NOTIFICATION_TIMER,
      showConfirmButton: false,
    });
    
    if (callback) callback();
  }, []);

  /**
   * Handles errors with user feedback
   * @param {string} title - Error message title
   * @param {string} text - Error message text
   * @param {Error} error - Original error object for logging
   */
  const handleError = useCallback((title, text, error) => {
    if (error) {
      // Log error for debugging without exposing sensitive data
      console.error(`❌ ${title}:`, error.message);
    }
    
    Swal.fire({
      icon: "error",
      title,
      text,
    });
  }, []);

  /**
   * Fetches project data from the server
   */
  const fetchProjectData = useCallback(async () => {
    if (!id) {
      handleError("Invalid Request", "Project ID is missing", new Error("Project ID undefined"));
      return;
    }

    try {
      const response = await axiosSecure.get(`/projects/get-project/${id}`);
      const fetchedProject = response.data.data;

      // Auto-link current user if they're a regular user
      if (!fetchedProject.linkedUsers.includes(user?.id) && userRole === "User") {
        fetchedProject.linkedUsers.push(user?.id);
      }

      setProject(fetchedProject);
      setOriginalProject(fetchedProject);
    } catch (error) {
      handleError("Failed to Load Project", "Unable to fetch project data", error);
    }
  }, [axiosSecure, id, user?.id, userRole, handleError]);

  /**
   * Fetches user data and builds user cache
   */
  const fetchUsersData = useCallback(async () => {
    try {
      const response = await axiosSecure.get("/users/get-users");
      if (response.data.success) {
        const usersMap = response.data.data.reduce((acc, user) => {
          acc[user._id] = user;
          return acc;
        }, {});
        setUserCache(usersMap);
      }
    } catch (error) {
      handleError("Failed to Load Users", "Unable to fetch user information", error);
    }
  }, [axiosSecure, handleError]);

  /**
   * Handles project update with validation and error handling
   */
  const handleUpdateProject = useCallback(async () => {
    if (!validateProjectData(project)) {
      handleError("Update Failed", "Project data is missing", new Error("Invalid project data"));
      return;
    }

    if (!originalProject) {
      setIsEditing(false);
      return;
    }

    try {
      const { _id, ...updatedProject } = project;
      const { _id: originalId, ...originalData } = originalProject;

      // Normalize location data
      updatedProject.location = normalizeLocation(updatedProject.location);

      // Check if there are actual changes
      if (JSON.stringify(updatedProject) === JSON.stringify(originalData)) {
        setIsEditing(false);
        return;
      }

      const response = await axiosSecure.patch(`/projects/update/${id}`, updatedProject);

      if (response?.data?.success) {
        handleSuccess("Project Updated", "Project updated successfully!", () => {
          setIsEditing(false);
          setOriginalProject(project);
        });

        // Attempt to rename folder on disk
        await handleFolderRename();
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      handleError("Update Failed", "Failed to update project. Please try again.", error);
    }
  }, [project, originalProject, axiosSecure, id, validateProjectData, normalizeLocation, handleSuccess, handleError]);

  /**
   * Handles folder rename operation on disk
   */
  const handleFolderRename = useCallback(async () => {
    try {
      const newFolderName = `${project.projectNumber} - ${project.name}`;
      await axiosSecure.put(`/files/${id}/folders/${id}`, {
        newName: newFolderName,
      });
    } catch (error) {
      // Non-critical error - don't show to user but log for debugging
      console.warn("⚠️ Disk folder rename failed:", error?.response?.data || error.message);
    }
  }, [project, axiosSecure, id]);

  /**
   * Implements long polling for disk change detection
   */
  const setupLongPolling = useCallback(() => {
    if (!ENABLE_WATCHERS || !id) return;

    let isCancelled = false;

    const longPollForDiskChanges = async () => {
      try {
        const response = await axiosSecure.get(`/files/${id}/watch-disk`);
        if (isCancelled) return;

        if (response?.data?.changed) {
          await fetchFolders();
        }

        // Continue polling
        longPollForDiskChanges();
      } catch (error) {
        if (!isCancelled) {
          setTimeout(() => longPollForDiskChanges(), POLLING_ERROR_RETRY_DELAY);
        }
      }
    };

    longPollForDiskChanges();

    return () => {
      isCancelled = true;
    };
  }, [ENABLE_WATCHERS, id, axiosSecure, fetchFolders]);

  /**
   * Handles modal close with animation and cleanup
   */
  const handleModalClose = useCallback(async () => {
    // Lock height for smooth animation
    if (folderPanelRef.current) {
      setLockedHeight(`${folderPanelRef.current.offsetHeight}px`);
    }

    setShowFolderModal(false);
    setDroppedFiles([]);
    setFolderPanelRefreshKey((prev) => prev + 1);

    // Remove height lock after animation
    setTimeout(() => setLockedHeight(null), MODAL_ANIMATION_DELAY);
  }, []);

  /**
   * Renders project form fields based on editing state
   * @param {string} field - Field name
   * @param {string} type - Input type
   * @param {*} value - Current value
   * @param {Function} onChange - Change handler
   * @param {string} displayValue - Display value for read-only mode
   * @returns {JSX.Element} - Form field component
   */
  const renderFormField = useCallback((field, type, value, onChange, displayValue) => {
    if (isEditing) {
      if (type === "textarea") {
        return (
          <textarea
            className="w-full border rounded-md p-2"
            value={value || ""}
            onChange={onChange}
          />
        );
      }
      
      if (type === "date") {
        return (
          <input
            type="date"
            className="w-full border rounded-md p-2"
            value={value || ""}
            onChange={onChange}
          />
        );
      }
      
      return (
        <input
          type={type}
          className="w-full border rounded-md p-2"
          value={value || ""}
          onChange={onChange}
        />
      );
    }
    
    return displayValue;
  }, [isEditing]);

  // Effect: Reset modal path when modal opens
  useEffect(() => {
    if (showFolderModal) {
      setModalSelectedPath(".");
    }
  }, [showFolderModal]);

  // Effect: Handle user permission redirects
  useEffect(() => {
    if (userRole === "User" && project?._id && !isUserLinked) {
      navigate("/forbidden");
    }
  }, [userRole, isUserLinked, project?._id, navigate]);

  // Effect: Fetch project data on mount
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Effect: Fetch users data
  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  // Effect: Setup long polling for file changes
  useEffect(() => {
    return setupLongPolling();
  }, [setupLongPolling]);

  return (
    <div className="min-h-screen pb-4 mt-4">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-4">
        <p className="flex gap-3 my-3">
          <Link to="/">
            <IconBackArrow className="text-2xl text-textGray" />
          </Link>
          Project View
        </p>
        
        {/* Action Buttons */}
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
        </div>
      </div>

      <div ref={componentRef}>
        {/* Project Name & Number Section */}
        <div className="w-full p-4 bg-white rounded-lg shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          {renderFormField(
            "name",
            "text",
            project?.name,
            (e) => setProject({ ...project, name: e.target.value }),
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800">{project?.name}</h2>
          )}
            {project?.projectNumber && (
              <div className="text-gray-600 text-lg sm:text-right">
                <strong>#:</strong>{" "}
                {isEditing ? (
                  <input
                    type="text"
                    className="border rounded-md p-2 w-32"
                    value={project.projectNumber}
                    onChange={(e) =>
                      setProject({ ...project, projectNumber: e.target.value })
                    }
                  />
                ) : (
                  project.projectNumber
                )}
              </div>
            )}
        </div>

        {/* Info Boxes Section */}
        <div className="flex flex-wrap my-6 gap-4">
          {/* Location Box */}
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
          
          {/* Due Date Box */}
          <div className="w-full sm:w-[174px] bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-500">Due Date</p>
            {renderFormField(
              "due_date",
              "date",
              project?.due_date,
              (e) => setProject({ ...project, due_date: e.target.value }),
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

        {/* Job Details Section */}
        <div className="bg-white p-4 rounded-md mb-4 shadow-sm">
          <h4 className="text-lg font-semibold mb-2">Job Scope/Details</h4>
          {renderFormField(
            "description",
            "textarea",
            project?.description,
            (e) => setProject({ ...project, description: e.target.value }),
            <div
              className="prose prose-sm max-w-none text-gray-800 bg-gray-50 border border-gray-200 p-4 rounded-md"
              dangerouslySetInnerHTML={{
                __html: (project?.description || "").replace(/\n/g, "<br />"),
              }}
            />
          )}
        </div>

        {/* Estimate Notes Section */}
        <div className="bg-white p-4 rounded-md shadow-sm">
          <h4 className="text-lg font-semibold mb-2">Estimate Notes</h4>
          {["notes", "assumptions", "exclusions"].map((section) => (
            <div key={section} className="mb-4">
              <label className="text-sm font-medium block mb-1 capitalize">{section}:</label>
              {renderFormField(
                section,
                "textarea",
                project?.estimateNotes?.[section],
                (e) =>
                  setProject({
                    ...project,
                    estimateNotes: {
                      ...project.estimateNotes,
                      [section]: e.target.value,
                    },
                  }),
                <p className="p-2 border rounded-md bg-gray-100">
                  {project?.estimateNotes?.[section] || `No ${section} specified`}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* File Management Section */}
        <div
          ref={folderPanelRef}
          className="relative bg-white p-4 rounded-md shadow-sm w-full mt-6"
          style={{ minHeight: lockedHeight || "auto" }}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-60 flex items-center justify-center text-blue-700 font-semibold rounded-md z-50 pointer-events-none">
              Drop files here to upload
            </div>
          )}

          {/* File Section Header */}
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
              <IconFolder className="text-gray-500" />
              File and attachment
            </h3>
           
            <div className="flex gap-2 items-center">
              <Button
                title="Edit Files/folders"
                className="bg-transparent border-blue-500 text-blue-600"
                onClick={() => setShowFolderModal(true)}
              >
                Edit Files/folders
              </Button>
            </div>
          </div>

          {/* Folder Panel Wrapper */}
          <FolderPanelWrapper
            projectId={id}
            userRole={user?.role || "User"}
            refreshKey={folderPanelRefreshKey}
          >
            {(folderManager) => (
              <FileDirectoryPanel
                {...folderManager}
                projectId={id}
                folderList={folderManager.folderList}
                uploadEnabled={!showFolderModal}
                files={sharedFiles}
                setFiles={setSharedFiles}
                ghostFilesByPath={sharedGhosts}
                setGhostFilesByPath={setSharedGhosts}
                folderContents={folderManager.folderContents}
              />
            )}
          </FolderPanelWrapper>
        </div>

        {/* Quote Breakdown Section */}
        <div className="w-full bg-white p-4 rounded-md shadow-sm mt-4">
          <h3 className="font-semibold text-lg">Project Quote Breakdown</h3>
          
          {/* Sub Total */}
          <div className="flex justify-between">
            <p className="text-gray-800">Sub Total</p>
            {renderFormField(
              "subTotal",
              "number",
              project?.subTotal || 0,
              (e) => setProject({ ...project, subTotal: parseFloat(e.target.value) || 0 }),
              <p className="text-gray-800">{project?.subTotal}</p>
            )}
          </div>
          
          {/* GST */}
          <div className="flex justify-between">
            <p className="text-gray-800">GST</p>
            {renderFormField(
              "gst",
              "number",
              project?.gst || 0,
              (e) => setProject({ ...project, gst: parseFloat(e.target.value) || 0 }),
              <p className="text-gray-800">{project?.gst}</p>
            )}
          </div>
          
          {/* Total */}
          <div className="h-[2px] bg-black my-1"></div>
          <div className="flex justify-between font-semibold text-textBlack">
            <h2 className="text-lg">Total</h2>
            <p className="text-gray-800">{project?.total}</p>
          </div>
        </div>

        {/* File Drop Modal */}
        {showFolderModal && (
          <FileDropModal
            projectId={id}
            projectAlias={projectAlias}
            selectedPath={modalSelectedPath}
            setSelectedPath={setModalSelectedPath}
            files={sharedFiles}
            setFiles={setSharedFiles}
            ghostFilesByPath={sharedGhosts}
            setGhostFilesByPath={setSharedGhosts}
            userRole={user?.role || "user"}
            onClose={handleModalClose}
            onUpload={({ files, folderPath }) => {
              // Handle file upload
            }}
          />
        )}

        {/* Footer - Created For Section */}
        <div className="bg-white p-4 mt-4 rounded-md shadow-sm">
          <h4 className="text-lg font-semibold mb-2">Created for:</h4>
          {project?.linkedUsers?.length > 0 ? (
            project.linkedUsers.map((userId) => {
              const linkedUser = userCache[userId];
              return linkedUser ? (
                <div key={`linked-user-${userId ?? crypto.randomUUID()}`}>
                  <h3 className="text-xl font-medium text-gray-800">
                    {linkedUser.name || "Unknown Name"}
                  </h3>
                  <p className="text-gray-600">{linkedUser.email || "No email"}</p>
                  <p className="text-gray-600">{linkedUser.phone || "No phone"}</p>
                  <p className="text-gray-600">
                    {typeof linkedUser.address === "object"
                      ? `${linkedUser.address.full_address?.split(",")[0] || "No Address"}, ${linkedUser.address.city || ""}, ${linkedUser.address.zip || ""}`
                      : linkedUser.address || "No address"}
                  </p>
                </div>
              ) : (
                <p key={`loading-${crypto.randomUUID()}`} className="text-gray-500">
                  Loading user information...
                </p>
              );
            })
          ) : (
            <p className="text-gray-500">No users assigned</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsView;
