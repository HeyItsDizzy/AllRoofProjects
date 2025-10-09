const express = require("express");
const router = express.Router();
const { projectsCollection, userCollection, clientCollection } = require("../db");
const { authenticateToken, authenticateAdmin, authorizeRole, authenticateTokenOrApiKey } = require("../middleware/auth");
const { ObjectId } = require("mongodb");
const { tryRenameProjectFolder } = require("../features/fileManager/services/tryRenameProjectFolder");
const { createInitialProjectFolders } = require("../features/fileManager/controllers/folderController"); // ✅ NEW
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getProjectDiskPath } = require("../features/fileManager/services/pathUtils");
const { logDeprecation, logBug, logWarning } = require("../utils/logger");
const { normalizeProjectName, normalizeProjectNameWithProperCase } = require("../utils/projectNameNormalizer");

// Load API keys for service authentication
let apiKeys = {};
try {
  const apiKeysPath = path.join(__dirname, "../config/api-keys.json");
  apiKeys = JSON.parse(fs.readFileSync(apiKeysPath, "utf-8"));
} catch (err) {
  console.warn("⚠️ Could not load API keys:", err.message);
}


console.log("✅ projectRoutes.js is being loaded...");

// ✅ Route to Assign Client to a Project (Admin only for manual assignment, Users can claim unassigned projects)
router.patch(
  "/assignClient/:projectId",
  authenticateToken(),
  async (req, res) => {
    try {
      const { clientId, multiAssign = false } = req.body;
      const projectId = req.params.projectId;
      const userRole = req.user?.role || "User";

      if (!clientId || !projectId) {
        return res.status(400).json({ success: false, message: "Client ID and Project ID are required." });
      }

      if (!ObjectId.isValid(clientId) || !ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: "Invalid Client ID or Project ID." });
      }

      console.log(`🔍 Looking up client: ${clientId}`);
      const clientCollectionRef  = await clientCollection();
      const projectCollectionRef = await projectsCollection();

      // Get the project to check if it's unassigned
      const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });
      if (!project) {
        console.log(`❌ Project not found: ${projectId}`);
        return res.status(404).json({ success: false, message: "Project not found." });
      }

      // Role-based validation
      if (userRole === "User") {
        console.log(`🔍 User claiming project - UserRole: ${userRole}`);
        
        // Users can only claim unassigned projects
        const isUnassignedProject = !project.linkedClients || project.linkedClients.length === 0;
        console.log(`🔍 Project assignment status - linkedClients: ${JSON.stringify(project.linkedClients)}, isUnassigned: ${isUnassignedProject}`);
        
        if (!isUnassignedProject) {
          return res.status(403).json({ success: false, message: "Users can only claim unassigned projects." });
        }

        // Users can only assign to their own linked clients
        const userId = req.user?.userId || req.user?._id;
        console.log(`🔍 User ID: ${userId}, Client ID to assign: ${clientId}`);
        
        const userCollectionRef = await userCollection();
        const userDoc = await userCollectionRef.findOne({ _id: new ObjectId(userId) });
        
        console.log(`🔍 User document: ${JSON.stringify(userDoc?.linkedClients || 'No linkedClients')}`);
        
        if (!userDoc || !userDoc.linkedClients || userDoc.linkedClients.length === 0) {
          return res.status(403).json({ success: false, message: "You must be linked to a client to claim projects." });
        }

        // Check if the clientId matches any of the user's linked clients (handle ObjectId comparison)
        const userLinkedClientIds = userDoc.linkedClients.map(id => 
          typeof id === 'string' ? id : id.toString()
        );
        
        console.log(`🔍 User linked client IDs: ${JSON.stringify(userLinkedClientIds)}`);
        
        if (!userLinkedClientIds.includes(clientId)) {
          return res.status(403).json({ success: false, message: "You can only assign projects to your linked clients." });
        }

        console.log(`✅ User validation passed - allowing project claim`);
      }
      // Admins can assign any project to any client (existing functionality)

      const client = await clientCollectionRef.findOne({ _id: new ObjectId(clientId) });
      if (!client) {
        console.log(`❌ Client not found: ${clientId}`);
        return res.status(404).json({ success: false, message: "Client not found." });
      }

      // Ensure linkedClients is an array
      if (!Array.isArray(project.linkedClients)) {
        project.linkedClients = [];
      }

      let updateProject;
      if (multiAssign) {
        if (!project.linkedClients.includes(clientId)) {
          updateProject = await projectCollectionRef.updateOne(
            { _id: new ObjectId(projectId) },
            { $addToSet: { linkedClients: clientId } }
          );
        }
      } else {
        updateProject = await projectCollectionRef.updateOne(
          { _id: new ObjectId(projectId) },
          { $set: { linkedClients: [clientId] } }
        );
      }

      // Optionally keep track on the client side too
      if (!Array.isArray(client.linkedProjects)) {
        client.linkedProjects = [];
      }

      let updateClient;
      if (!client.linkedProjects.includes(projectId)) {
        updateClient = await clientCollectionRef.updateOne(
          { _id: new ObjectId(clientId) },
          { $addToSet: { linkedProjects: projectId } }  // projectId is already a string from URL params
        );
      }

      // Check update success
      if (
        (updateProject?.modifiedCount === 0 && multiAssign) ||
        (updateClient?.modifiedCount === 0)
      ) {
        return res.status(500).json({ success: false, message: "Failed to update client or project." });
      }

      console.log(`✅ Client ${client.name} assigned to project ${projectId} successfully by ${userRole}: ${req.user?.name || req.user?.userId}`);
      res.json({ success: true, message: `Project successfully ${userRole === 'User' ? 'claimed' : 'assigned'} to client: ${client.name}` });

    } catch (error) {
      console.error("❌ Error updating project assignment:", error);
      res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
  }
);

// ✅ Route to Assign User to a Project - Change this to Assign User to a Client
router.patch("/assignUser/:projectId", authenticateToken(), async (req, res) => {
  try {
    const { userId, multiAssign = false } = req.body;
    const projectId = req.params.projectId;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: "User ID and Project ID are required." });
    }

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid User ID or Project ID." });
    }

    console.log(`🔍 Looking up user: ${userId}`);
    const userCollectionRef = await userCollection();
    const projectCollectionRef = await projectsCollection();

    const user = await userCollectionRef.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ success: false, message: "User not found." });
    }

    console.log(`🔍 Looking up project: ${projectId}`);
    const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      console.log(`❌ Project not found: ${projectId}`);
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Ensure linkedUsers is an array
    if (!Array.isArray(project.linkedUsers)) {
      project.linkedUsers = [];
    }

    let updateProject;
    if (multiAssign) {
      if (!project.linkedUsers.includes(userId)) {
        updateProject = await projectCollectionRef.updateOne(
          { _id: new ObjectId(projectId) },
          { $addToSet: { linkedUsers: userId } }
        );
      }
    } else {
      updateProject = await projectCollectionRef.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { linkedUsers: [userId] } }
      );
    }

    // Ensure linkedProjects is an array
    if (!Array.isArray(user.linkedProjects)) {
      user.linkedProjects = [];
    }

    let updateUser;
    if (!user.linkedProjects.includes(projectId)) {
      updateUser = await userCollectionRef.updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { linkedProjects: projectId } }
      );
    }

    // Check update success
    if (
      (updateProject?.modifiedCount === 0 && multiAssign) ||
      (updateUser?.modifiedCount === 0)
    ) {
      return res.status(500).json({ success: false, message: "Failed to update user or project." });
    }

    console.log(`✅ User ${user.name} assigned to project ${projectId} successfully.`);
    res.json({ success: true, message: `User ${user.name} assigned to project successfully.` });

  } catch (error) {
    console.error("❌ Error updating project assignment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
});

// ✅ Route to update project status
router.patch("/update-status/:projectId", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    const collection = await projectsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found or status unchanged" });
    }

    res.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// ✅ Route to update JobBoard-specific project fields
router.patch("/update-jobboard/:projectId", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const jobData = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    const collection = await projectsCollection();

    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { jobBoardData: jobData } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found or no changes made." });
    }

    res.json({ success: true, message: "Job Board data updated successfully." });
  } catch (error) {
    console.error("❌ Error updating Job Board data:", error);
    res.status(500).json({ success: false, message: "Failed to update Job Board fields.", error: error.message });
  }
});

// ✅ Route to update JobBoard status specifically (Feature #31 - Dual Status System)
router.patch("/update-jobboard-status/:projectId", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { jobBoardStatus, status } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    if (!jobBoardStatus) {
      return res.status(400).json({ success: false, message: "JobBoard status is required" });
    }

    const collection = await projectsCollection();

    // Build update object - update both jobBoardStatus and regular status if provided
    const updateFields = { jobBoardStatus };
    if (status) {
      updateFields.status = status;
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found or status unchanged" });
    }

    const statusInfo = status ? ` and status to "${status}"` : '';
    console.log(`🎯 JobBoard status updated to "${jobBoardStatus}"${statusInfo} for project ${projectId}`);
    res.json({ success: true, message: "JobBoard status updated successfully" });
  } catch (error) {
    console.error("Error updating JobBoard status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});


// ✅ Route to update specific project fields
router.patch("/update/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    // Normalize project name if it exists in the updates
    if (updates.name && typeof updates.name === 'string') {
      updates.name = normalizeProjectNameWithProperCase(updates.name);
    }

    const collection = await projectsCollection();
    const existingProject = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Prevent unnecessary updates
    const { _id, ...existingData } = existingProject;
    if (JSON.stringify(existingData) === JSON.stringify(updates)) {
      return res.status(200).json({ success: true, message: "No changes detected." });
    }

    // Perform the DB update
    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updates }
    );

    if (result.modifiedCount > 0) {
      const updatedProject = {
        ...existingProject,
        ...updates,
        createdAt: existingProject.createdAt, // ✅ lock in disk location
      };
    
      try {
        const renameResult = await tryRenameProjectFolder(existingProject, updatedProject);
        
        if (!renameResult?.success) {
          console.warn("⚠️ Rename failed or folder missing. Attempting to create folder structure...");
          await createInitialProjectFolders(updatedProject);
        } else {
          console.log("✅ Folder renamed successfully.");
        }
      } catch (err) {
        console.warn("⚠️ Error during folder rename. Fallback to creating folder structure:", err.message);
        await createInitialProjectFolders(updatedProject);
      }
    }
    

    return res.json({ success: true, message: "Project updated successfully." });

  } catch (error) {
    console.error("❌ Error updating project:", error);
    res.status(500).json({ success: false, message: "Failed to update project." });
  }
});

// ✅ Route to Delete a Project (Admin only)
router.delete("/delete/:id", authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    console.log(`🗑️ Deleting project: ${project.name} (${project.projectNumber})`);

    // 1. Delete project files from disk using direct service call
    try {
      const projectRootPath = getProjectDiskPath(project, "", "AU");
      
      if (fs.existsSync(projectRootPath)) {
        // Stop watching the project before deletion (if file manager is available)
        try {
          const { stopWatchingProject, isWatching } = require("../features/fileManager/services/diskWatcher");
          if (isWatching(projectId)) {
            stopWatchingProject(projectId);
            console.log(`✅ Stopped watching project ${projectId} before deletion`);
          }
        } catch (watchError) {
          console.warn("⚠️ File watcher service unavailable:", watchError.message);
        }

        // Delete the entire project directory
        fs.rmSync(projectRootPath, { recursive: true, force: true });
        console.log(`✅ Project files deleted from disk: ${projectRootPath}`);
      } else {
        console.log(`⚠️ Project folder not found on disk: ${projectRootPath}`);
      }
    } catch (fileError) {
      console.warn("⚠️ File deletion failed:", fileError.message);
      // Continue with database cleanup even if file deletion fails
    }

    // 2. Remove project references from linked users (Database cleanup)
    if (project.linkedUsers && Array.isArray(project.linkedUsers) && project.linkedUsers.length > 0) {
      try {
        const userCollectionRef = await userCollection();
        const validUserIds = project.linkedUsers
          .filter(userId => userId && ObjectId.isValid(userId))
          .map(userId => new ObjectId(userId));
        
        if (validUserIds.length > 0) {
          await userCollectionRef.updateMany(
            { _id: { $in: validUserIds } },
            { $pull: { linkedProjects: projectId } }
          );
          console.log(`✅ Removed project reference from ${validUserIds.length} users`);
        }
      } catch (userError) {
        console.error("⚠️ Error removing project from users:", userError.message);
      }
    }

    // 3. Remove project references from linked clients (Database cleanup)
    if (project.linkedClients && Array.isArray(project.linkedClients) && project.linkedClients.length > 0) {
      try {
        const clientCollectionRef = await clientCollection();
        const validClientIds = project.linkedClients
          .filter(clientId => clientId && ObjectId.isValid(clientId))
          .map(clientId => new ObjectId(clientId));
        
        if (validClientIds.length > 0) {
          await clientCollectionRef.updateMany(
            { _id: { $in: validClientIds } },
            { $pull: { linkedProjects: projectId } }
          );
          console.log(`✅ Removed project reference from ${validClientIds.length} clients`);
        }
      } catch (clientError) {
        console.error("⚠️ Error removing project from clients:", clientError.message);
      }
    }

    // 4. Delete the project from database
    const result = await collection.deleteOne({ _id: new ObjectId(projectId) });

    if (result.deletedCount === 0) {
      return res.status(500).json({ success: false, message: "Failed to delete project from database." });
    }

    console.log(`✅ Project deleted successfully: ${project.name}`);

    return res.json({
      success: true,
      message: "Project and all associated files deleted successfully.",
      data: { deletedProject: project.name, projectNumber: project.projectNumber }
    });

  } catch (error) {
    console.error("❌ Error deleting project:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete project.", 
      error: error.message 
    });
  }
});

router.get("/test", (req, res) => {
  res.json({ success: true, message: "Test route is working!" });
});

// ✅ Route to Unassign Client from a Project (Admin only)
router.patch(
  "/unassignClient/:projectId",
  authenticateToken(),
  authorizeRole("Admin"),
  async (req, res) => {
    try {
      const { clientId } = req.body;
      const projectId    = req.params.projectId;

      if (!clientId || !projectId) {
        return res
          .status(400)
          .json({ success: false, message: "Client ID and Project ID are required." });
      }

      // Ensure valid ObjectId format
      if (!ObjectId.isValid(clientId) || !ObjectId.isValid(projectId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Client ID or Project ID." });
      }

      // Retrieve collections
      const clientCollectionRef  = await clientCollection();
      const projectCollectionRef = await projectsCollection();

      // Remove clientId from project's linkedClients array
      const projectUpdate = await projectCollectionRef.updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { linkedClients: clientId.toString() } }
      );

      // Remove projectId from client's linkedProjects array
      const clientUpdate = await clientCollectionRef.updateOne(
        { _id: new ObjectId(clientId) },
        { $pull: { linkedProjects: projectId.toString() } }
      );

      // Check if either update succeeded
      if (projectUpdate.modifiedCount > 0 || clientUpdate.modifiedCount > 0) {
        return res
          .status(200)
          .json({ success: true, message: "Client unassigned from project successfully." });
      }

      return res
        .status(404)
        .json({ success: false, message: "Client or Project not found, or no changes made." });
    } catch (error) {
      console.error("❌ Error unassigning client from project:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error", error: error.message });
    }
  }
);

// ✅ Route to Assign Estimator to a Project (Admin only)
router.patch(
  "/assignEstimator/:projectId",
  authenticateToken(),
  authorizeRole("Admin"),
  async (req, res) => {
    try {
      const { estimatorId, multiAssign = false } = req.body;
      const projectId = req.params.projectId;

      if (!estimatorId || !projectId) {
        return res.status(400).json({ success: false, message: "Estimator ID and Project ID are required." });
      }

      if (!ObjectId.isValid(estimatorId) || !ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: "Invalid Estimator ID or Project ID." });
      }

      console.log(`🔍 Looking up estimator: ${estimatorId}`);
      const userCollectionRef = await userCollection();
      const projectCollectionRef = await projectsCollection();

      const estimator = await userCollectionRef.findOne({ _id: new ObjectId(estimatorId) });
      if (!estimator) {
        console.log(`❌ Estimator not found: ${estimatorId}`);
        return res.status(404).json({ success: false, message: "Estimator not found." });
      }

      // Verify the user is actually an estimator or admin
      if (estimator.role !== "Estimator" && estimator.role !== "Admin") {
        return res.status(400).json({ 
          success: false, 
          message: "User must be an Estimator or Admin to be assigned to projects." 
        });
      }

      console.log(`🔍 Looking up project: ${projectId}`);
      const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });
      if (!project) {
        console.log(`❌ Project not found: ${projectId}`);
        return res.status(404).json({ success: false, message: "Project not found." });
      }

      // Ensure linkedEstimators is an array
      if (!Array.isArray(project.linkedEstimators)) {
        project.linkedEstimators = [];
      }

      let updateProject;
      if (multiAssign) {
        if (!project.linkedEstimators.includes(estimatorId)) {
          updateProject = await projectCollectionRef.updateOne(
            { _id: new ObjectId(projectId) },
            { 
              $addToSet: { linkedEstimators: estimatorId },
              $set: { status: "Assigned" } // 🎯 Auto-set status to "Assigned"
            }
          );
        }
      } else {
        updateProject = await projectCollectionRef.updateOne(
          { _id: new ObjectId(projectId) },
          { 
            $set: { 
              linkedEstimators: [estimatorId],
              status: "Assigned" // 🎯 Auto-set status to "Assigned"
            }
          }
        );
      }

      // Optionally keep track on the estimator side too
      if (!Array.isArray(estimator.linkedProjects)) {
        estimator.linkedProjects = [];
      }

      let updateEstimator;
      if (!estimator.linkedProjects.includes(projectId)) {
        updateEstimator = await userCollectionRef.updateOne(
          { _id: new ObjectId(estimatorId) },
          { $addToSet: { linkedProjects: projectId } }
        );
      }

      // Check update success
      if (
        (updateProject?.modifiedCount === 0 && multiAssign) ||
        (updateEstimator?.modifiedCount === 0)
      ) {
        return res.status(500).json({ success: false, message: "Failed to update estimator or project." });
      }

      console.log(`✅ Estimator ${estimator.firstName} ${estimator.lastName} assigned to project ${projectId} successfully. Status set to "Assigned".`);
      res.json({ success: true, message: `Estimator ${estimator.firstName} ${estimator.lastName} assigned to project successfully. Status updated to "Assigned".` });

    } catch (error) {
      console.error("❌ Error updating project estimator assignment:", error);
      res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
  }
);

// ✅ Route to Unassign Estimator from a Project (Admin only)
router.patch(
  "/unassignEstimator/:projectId",
  authenticateToken(),
  authorizeRole("Admin"),
  async (req, res) => {
    try {
      const { estimatorId } = req.body;
      const projectId = req.params.projectId;

      if (!estimatorId || !projectId) {
        return res
          .status(400)
          .json({ success: false, message: "Estimator ID and Project ID are required." });
      }

      // Ensure valid ObjectId format
      if (!ObjectId.isValid(estimatorId) || !ObjectId.isValid(projectId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Estimator ID or Project ID." });
      }

      // Retrieve collections
      const userCollectionRef = await userCollection();
      const projectCollectionRef = await projectsCollection();

      // Remove estimatorId from project's linkedEstimators array
      const projectUpdate = await projectCollectionRef.updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { linkedEstimators: estimatorId.toString() } }
      );

      // Remove projectId from estimator's linkedProjects array
      const estimatorUpdate = await userCollectionRef.updateOne(
        { _id: new ObjectId(estimatorId) },
        { $pull: { linkedProjects: projectId.toString() } }
      );

      // Check if either update succeeded
      if (projectUpdate.modifiedCount > 0 || estimatorUpdate.modifiedCount > 0) {
        return res
          .status(200)
          .json({ success: true, message: "Estimator unassigned from project successfully." });
      }

      return res
        .status(404)
        .json({ success: false, message: "Estimator or Project not found, or no changes made." });
    } catch (error) {
      console.error("❌ Error unassigning estimator from project:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error", error: error.message });
    }
  }
);

// ✅ Route to Unassign User from a Project
router.patch("/unassignUser/:projectId", authenticateToken(), async (req, res) => {
  try {
    const { userId } = req.body;
    const projectId = req.params.projectId;

    if (!userId || !projectId) {
      return res.status(400).json({ success: false, message: "User ID and Project ID are required" });
    }

    // Ensure collections are properly retrieved
    const userCollectionInstance = await userCollection();
    const projectCollectionInstance = await projectsCollection();

    // ✅ Remove userId from Project's `linkedUsers` array
    const projectUpdate = await projectCollectionInstance.updateOne(
      { _id: new ObjectId(projectId) },
      { $pull: { linkedUsers: userId.toString() } } // Ensure userId is treated as a string
    );

    // ✅ Remove projectId from User's `linkedProjects` array (if applicable)
    const userUpdate = await userCollectionInstance.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { linkedProjects: projectId.toString() } } // Ensure projectId is a string
    );

    // ✅ Check if the update was actually performed
    if (projectUpdate.modifiedCount > 0 || userUpdate.modifiedCount > 0) {
      return res.status(200).json({ success: true, message: "User unassigned from project successfully" });
    }

    return res.status(404).json({ success: false, message: "User or Project not found, or no changes made" });

  } catch (error) {
    console.error("Error unassigning user from project:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
});

const generateProjectNumber = async (collection) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const baseNumber = `${year}-${month}`;

  // 1) Load all existing projectNumbers for this month
  const docs = await collection
    .find({ projectNumber: { $regex: `^${baseNumber}` } })
    .project({ projectNumber: 1, _id: 0 })
    .toArray();

  // 2) Parse out the numeric suffixes
  const usedNumbers = docs
    .map(d => parseInt(d.projectNumber.slice(baseNumber.length), 10))
    .filter(n => !isNaN(n));

  // 3) Find the first missing integer starting from 1
  let nextNum = 1;
  while (usedNumbers.includes(nextNum)) {
    nextNum++;
  }

  // 4) Zero-pad to three digits and return
  const suffix = String(nextNum).padStart(3, "0");
  return `${baseNumber}${suffix}`;
};

// Route to add a project (and link clients)
router.post("/addProject", authenticateTokenOrApiKey("create_project"), async (req, res) => {
  try {
    console.log("📩 Received Project Data:", req.body);

    // Validate required fields
    if (!req.body.name || req.body.name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Project name is required"
      });
    }

    const collection = await projectsCollection();
    const projectNumber = await generateProjectNumber(collection);

    // 1) Read linkedClients from the request
    const linkedClients = req.body.linkedClients || [];
    const linkedUsers   = req.body.linkedUsers   || [];

    const newProject = {
      name: normalizeProjectNameWithProperCase(req.body.name || ""),
      location: req.body.location || "Address to be confirmed",
      due_date: req.body.due_date || new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      posting_date: req.body.posting_date || new Date().toISOString(),
      linkedClients,           // ← include this
      linkedUsers,
      description: req.body.description || "No description provided",
      subTotal: req.body.subTotal || 0,
      total:   req.body.total    || 0,
      gst:     req.body.gst      || 0,
      status:  req.body.status   || "New Lead",
      projectNumber,
      metadata: req.body.metadata || {}
    };

    // 2) Insert the project
    const result = await collection.insertOne(newProject);
    if (!result.insertedId) throw new Error("Failed to add project.");

    const createdId = result.insertedId;
    const fullProject = { ...newProject, _id: createdId };

    // 3) Update each client to push this project into their linkedProjects
    if (linkedClients.length) {
      const clientColl = await clientCollection();
      await clientColl.updateMany(
        { _id: { $in: linkedClients.map((id) => new ObjectId(id)) } },
        { $push: { linkedProjects: createdId.toString() } }
      );
    }

    // 4) Create folder structure (unchanged)
    try {
      await createInitialProjectFolders(fullProject);
      console.log("📁 Root folder and role-protected subfolders created.");
    } catch (folderErr) {
      console.warn("⚠️ Folder structure creation failed:", folderErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Project added successfully",
      data: { _id: createdId, ...newProject },
    });
  } catch (error) {
    console.error("❌ Error adding project:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// Route to get projects (Admin & Estimator)
router.get("/get-projects", authenticateToken(), authorizeRole("Admin", "Estimator"), async (req, res) => {
  console.log("✅ Reached the /get-projects route handler");

  try {
    const collection = await projectsCollection();  // Ensure you await the async function
    const user = req.user;
    const isAdmin = user.role === "Admin";

    console.log("User Role:", user.role);
    console.log("User ID:", user._id);

    // Query using aggregation for proper numeric project number sorting
    console.log("Querying MongoDB with numeric aggregation sort...");
    const projects = await collection.aggregate([
      {
        $addFields: {
          yearPart: { $toInt: { $arrayElemAt: [ { $split: [ "$projectNumber", "-" ] }, 0 ] } },
          numPart:  { $toInt: { $arrayElemAt: [ { $split: [ "$projectNumber", "-" ] }, 1 ] } }
        }
      },
      {
        $sort: { yearPart: -1, numPart: -1 }
      }
    ]).toArray();

    console.log("Projects Found:", projects.length);
    console.log("Project Order:", projects.map(p => p.projectNumber));

    return res.json({
      success: true,
      message: "Projects fetched successfully",
      data: projects,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve projects",
      error: error.message,
    });
  }
});

// Route to get projects for user's linked clients
router.get("/get-client-projects", authenticateToken(), async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID" });
    }

    console.log("🔍 Getting client projects for user:", userId);

    // First, get the user to find their linked clients
    const userCollectionRef = await userCollection();
    const user = await userCollectionRef.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("🔍 User found, linked clients:", user.linkedClients);

    // If user has no linked clients, return empty array
    if (!user.linkedClients || user.linkedClients.length === 0) {
      console.log("⚠️ User has no linked clients");
      return res.json({
        success: true,
        message: "No projects found - user not linked to any clients",
        data: [],
      });
    }

    // Handle both ObjectId format and string format for linkedClients
    const clientIds = user.linkedClients.map(client => {
      if (typeof client === 'object' && client.$oid) {
        return new ObjectId(client.$oid);
      } else if (typeof client === 'string') {
        return new ObjectId(client);
      } else if (client instanceof ObjectId) {
        return client;
      }
      return new ObjectId(client);
    });

    console.log("🔍 Processed client IDs:", clientIds);

    // Get all clients the user is linked to
    const clientCollectionRef = await clientCollection();
    const linkedClients = await clientCollectionRef.find({
      _id: { $in: clientIds }
    }).toArray();

    console.log("🔍 Found linked clients:", linkedClients.length);

    // Collect all project IDs from all linked clients
    const allProjectIds = linkedClients.flatMap(client => 
      (client.linkedProjects || []).map(projectId => new ObjectId(projectId))
    );

    console.log("🔍 All project IDs from clients:", allProjectIds.length);

    if (allProjectIds.length === 0) {
      console.log("⚠️ No projects found in linked clients");
      return res.json({
        success: true,
        message: "No projects found for user's linked clients",
        data: [],
      });
    }

    // Get all projects that the user has access to through their clients
    const projectCollectionRef = await projectsCollection();
    const clientProjects = await projectCollectionRef.find({
      _id: { $in: allProjectIds }
    }).sort({ createdAt: -1 }).toArray();

    console.log("✅ Found client projects:", clientProjects.length);

    return res.json({
      success: true,
      message: "Client projects fetched successfully",
      data: clientProjects,
    });
  } catch (error) {
    logBug("Error fetching client projects", error, {
      userId: req.user?.userId,
      userName: req.user?.name,
      userRole: req.user?.role,
      endpoint: '/projects/get-client-projects',
      context: 'Main client projects endpoint'
    }, req);
    
    console.error("❌ Error fetching client projects:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch client projects",
      error: error.message,
    });
  }
});

// Legacy endpoint - DEPRECATED: Use /get-client-projects instead
router.get("/get-user-projects", authenticateToken(), async (req, res) => {
  // Log deprecation to custom log file with enhanced details
  logDeprecation("/get-user-projects endpoint called - should use /get-client-projects", {
    userId: req.user?.userId,
    userName: req.user?.name,
    userRole: req.user?.role,
    endpoint: '/projects/get-user-projects',
    recommendedEndpoint: '/projects/get-client-projects',
    deprecationReason: 'Endpoint renamed to better reflect client-based project access',
    migrationInstructions: 'Replace /get-user-projects with /get-client-projects in client code'
  }, req);
  
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID" });
    }

    console.log("🔄 Legacy endpoint: Redirecting to /get-client-projects logic for user:", userId);

    // First, get the user to find their linked clients
    const userCollectionRef = await userCollection();
    const user = await userCollectionRef.findOne({ _id: new ObjectId(userId) });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("🔍 User found, linked clients:", user.linkedClients);

    // If user has no linked clients, return empty array
    if (!user.linkedClients || user.linkedClients.length === 0) {
      console.log("⚠️ User has no linked clients");
      return res.json({
        success: true,
        message: "No projects found - user not linked to any clients",
        data: [],
      });
    }

    // Handle both ObjectId format and string format for linkedClients
    const clientIds = user.linkedClients.map(client => {
      if (typeof client === 'object' && client.$oid) {
        return new ObjectId(client.$oid);
      } else if (typeof client === 'string') {
        return new ObjectId(client);
      } else if (client instanceof ObjectId) {
        return client;
      }
      return new ObjectId(client);
    });

    console.log("🔍 Processed client IDs:", clientIds);

    // Get all clients the user is linked to
    const clientCollectionRef = await clientCollection();
    const linkedClients = await clientCollectionRef.find({
      _id: { $in: clientIds }
    }).toArray();

    console.log("🔍 Found linked clients:", linkedClients.length);

    // Collect all project IDs from all linked clients
    const allProjectIds = linkedClients.flatMap(client => 
      (client.linkedProjects || []).map(projectId => new ObjectId(projectId))
    );

    console.log("🔍 All project IDs from clients:", allProjectIds.length);

    if (allProjectIds.length === 0) {
      console.log("⚠️ No projects found in linked clients");
      return res.json({
        success: true,
        message: "No projects found for user's linked clients",
        data: [],
      });
    }

    // Get all projects that the user has access to through their clients
    const projectCollectionRef = await projectsCollection();
    const clientProjects = await projectCollectionRef.find({
      _id: { $in: allProjectIds }
    }).sort({ createdAt: -1 }).toArray();

    console.log("✅ Found client projects via legacy endpoint:", clientProjects.length);

    return res.json({
      success: true,
      message: "Client projects fetched successfully (via deprecated endpoint - please update to /get-client-projects)",
      data: clientProjects,
    });
  } catch (error) {
    logBug("Error in legacy get-user-projects endpoint", error, {
      userId: req.user?.userId,
      userName: req.user?.name,
      userRole: req.user?.role,
      endpoint: '/projects/get-user-projects',
      context: 'Legacy endpoint error handling'
    }, req);
    
    console.error("❌ Error in legacy get-user-projects endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch client projects",
      error: error.message,
    });
  }
});

// Route to update a project's status to "complete"
router.put("/updateProjectToComplete/:id", authenticateToken(), async (req, res) => {
  const projectId = req.params.id;
  try {
    const collection = await projectsCollection();
    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { status: "complete" } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found or already completed",
      });
    }

    return res.json({
      success: true,
      message: "Project marked as complete",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update project status",
      error: err.message,
    });
  }
});

// Route to retrieve a project by ID
router.get("/get-project/:id", authenticateToken(), async (req, res) => {
  const projectId = req.params.id;
  console.log("🛠️ Fetching Project ID:", projectId);

  try {
    const collection = await projectsCollection();

    // Log before calling DB
    console.log("🛠️ Searching for project in database...");

    // Retrieve the project by ID
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    // If the project is not found, return a 404 response
    if (!project) {
      console.log("❌ Project not found in database!");
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check user permissions using client-based access
    const user = req.user;
    const userRole = user?.role || "User";
    const userId = user?.userId || user?._id;

    // Admin and Estimator can access any project
    if (userRole === "Admin" || userRole === "Estimator") {
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      console.log(timestamp, " - ✅ Project found (Admin/Estimator access):", project.name);
      
      return res.json({
        success: true,
        message: "Project retrieved successfully",
        data: project,
      });
    }

    // For regular users, check client-based access
    if (userRole === "User") {
      try {
        // Get user to find their linked clients
        const userCollectionRef = await userCollection();
        const userDoc = await userCollectionRef.findOne({ _id: new ObjectId(userId) });
        
        if (!userDoc || !userDoc.linkedClients || userDoc.linkedClients.length === 0) {
          console.log("⚠️ User has no linked clients for project access");
          return res.status(403).json({ success: false, message: "Access denied - no client access." });
        }

        // Get user's linked clients
        const clientCollectionRef = await clientCollection();
        const clientIds = userDoc.linkedClients.map(client => {
          if (typeof client === 'object' && client.$oid) {
            return new ObjectId(client.$oid);
          }
          return new ObjectId(client);
        });

        const linkedClients = await clientCollectionRef.find({
          _id: { $in: clientIds }
        }).toArray();

        // Check if any of the user's clients have access to this project
        const hasProjectAccess = linkedClients.some(client => 
          client.linkedProjects && client.linkedProjects.includes(project._id.toString())
        );

        // Allow access to unassigned projects (projects with no linkedClients)
        const isUnassignedProject = !project.linkedClients || project.linkedClients.length === 0;

        if (!hasProjectAccess && !isUnassignedProject) {
          console.log("⚠️ User's clients don't have access to this project");
          return res.status(403).json({ success: false, message: "Access denied - project not accessible through your client." });
        }

        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0];
        console.log(timestamp, " - ✅ Project found (Client-based access):", project.name);
        
        return res.json({
          success: true,
          message: "Project retrieved successfully",
          data: project,
        });

      } catch (error) {
        console.error("❌ Error checking client-based access:", error);
        return res.status(500).json({ success: false, message: "Failed to verify access permissions." });
      }
    }

    // Default deny
    return res.status(403).json({ success: false, message: "Access denied." });
  } catch (err) {
    console.error("❌ Error retrieving project:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve project",
      error: err.message,
    });
  }
});

// ===== PROJECT ALIAS SECURITY ROUTES =====

/**
 * Generate a hybrid alias for a project
 * Format: projectNumber&obscureKey (e.g., "AR2024-001&d0b76d33892783569144ead863d774b3")
 */
router.post("/generate-alias/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Generate hybrid alias: projectNumberART&obscureKey
    const crypto = require('crypto');
    const obscureKey = crypto.randomBytes(16).toString('hex'); // 32 character hex string
    const projectNumber = project.projectNumber || `PROJ-${projectId.slice(-6)}`;
    const hybridAlias = `${projectNumber}ART&${obscureKey}`;

    // Update project with alias
    await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { alias: hybridAlias, aliasCreatedAt: new Date() } }
    );

    console.log(`🔒 Generated hybrid alias "${hybridAlias}" for project ${projectId}`);

    res.json({
      success: true,
      message: "Hybrid alias generated successfully",
      data: { alias: hybridAlias }
    });

  } catch (error) {
    console.error("❌ Error generating alias:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate alias",
      error: error.message
    });
  }
});

/**
 * Resolve a hybrid alias to get project data
 * Supports multiple formats:
 * - Hybrid: "projectNumber&obscureKey" (e.g., "AR2024-001&d0b76d33892783569144ead863d774b3")
 * - Legacy random: "d0b76d33892783569144ead863d774b3" (32 char hex)
 * - Legacy ObjectId: "507f1f77bcf86cd799439011" (24 char hex)
 */
router.get("/resolve-alias/:alias", authenticateToken(), async (req, res) => {
  try {
    const alias = req.params.alias;
    
    // Validate alias format
    const isHybridAlias = alias.includes('&');
    const isLegacyRandomAlias = /^[a-f0-9]{32}$/.test(alias);
    const isLegacyObjectId = /^[a-f0-9]{24}$/.test(alias);
    
    if (!isHybridAlias && !isLegacyRandomAlias && !isLegacyObjectId) {
      return res.status(400).json({ success: false, message: "Invalid alias format." });
    }

    const collection = await projectsCollection();
    let project;

    if (isHybridAlias) {
      // Handle hybrid alias: projectNumber&obscureKey
      project = await collection.findOne({ alias: alias });
    } else if (isLegacyRandomAlias) {
      // Handle legacy random alias (32 char hex)
      project = await collection.findOne({ alias: alias });
    } else if (isLegacyObjectId) {
      // Handle legacy ObjectId (24 char hex)
      project = await collection.findOne({ _id: new ObjectId(alias) });
    }

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Check user permissions using client-based access
    const user = req.user;
    const userRole = user?.role || "User";
    const userId = user?.userId || user?._id;

    // Admin and Estimator can access any project
    if (userRole === "Admin" || userRole === "Estimator") {
      return res.json({ success: true, message: "Project resolved successfully.", data: project });
    }

    // For regular users, check client-based access
    if (userRole === "User") {
      try {
        // Get user to find their linked clients
        const userCollectionRef = await userCollection();
        const userDoc = await userCollectionRef.findOne({ _id: new ObjectId(userId) });
        
        if (!userDoc || !userDoc.linkedClients || userDoc.linkedClients.length === 0) {
          console.log("⚠️ User has no linked clients for project access");
          return res.status(403).json({ success: false, message: "Access denied - no client access." });
        }

        // Get user's linked clients
        const clientCollectionRef = await clientCollection();
        const clientIds = userDoc.linkedClients.map(client => {
          if (typeof client === 'object' && client.$oid) {
            return new ObjectId(client.$oid);
          }
          return new ObjectId(client);
        });

        const linkedClients = await clientCollectionRef.find({
          _id: { $in: clientIds }
        }).toArray();

        // Check if any of the user's clients have access to this project
        const hasProjectAccess = linkedClients.some(client => 
          client.linkedProjects && client.linkedProjects.includes(project._id.toString())
        );

        // Allow access to unassigned projects (projects with no linkedClients)
        const isUnassignedProject = !project.linkedClients || project.linkedClients.length === 0;

        if (!hasProjectAccess && !isUnassignedProject) {
          console.log("⚠️ User's clients don't have access to this project");
          return res.status(403).json({ success: false, message: "Access denied - project not accessible through your client." });
        }

        console.log("✅ User has client-based access to project");
        return res.json({ success: true, message: "Project resolved successfully.", data: project });

      } catch (error) {
        console.error("❌ Error checking client-based access:", error);
        return res.status(500).json({ success: false, message: "Failed to verify access permissions." });
      }
    }

    // Default deny
    return res.status(403).json({ success: false, message: "Access denied." });

    console.log(`🔓 Resolved alias "${alias}" to project ${project._id}`);

    res.json({
      success: true,
      message: "Project retrieved successfully",
      data: project
    });

  } catch (error) {
    console.error("❌ Error resolving alias:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve alias",
      error: error.message
    });
  }
});

/**
 * Get or create hybrid alias for a project
 * Returns existing alias if available, creates new hybrid one if needed
 * Format: projectNumber&obscureKey
 */
router.get("/get-alias/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    let alias = project.alias;

    // If no alias exists, or it's a legacy format, create new hybrid alias
    const isHybridAlias = alias && alias.includes('&');
    
    if (!alias || !isHybridAlias) {
      const crypto = require('crypto');
      const obscureKey = crypto.randomBytes(16).toString('hex');
      const projectNumber = project.projectNumber || `PROJ-${projectId.slice(-6)}`;
      alias = `${projectNumber}ART&${obscureKey}`;

      await collection.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { alias: alias, aliasCreatedAt: new Date() } }
      );

      console.log(`🔒 Created new hybrid alias "${alias}" for project ${projectId}`);
    }

    res.json({
      success: true,
      message: "Hybrid alias retrieved successfully",
      data: { alias: alias, projectId: projectId }
    });

  } catch (error) {
    console.error("❌ Error getting alias:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get alias",
      error: error.message
    });
  }
});

/**
 * Generate read-only token for project viewing
 * Creates a secure token that allows public access to project view
 */
router.post("/generate-readonly-token/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { expiresInDays = 30 } = req.body; // Default 30 days expiration
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Generate secure read-only token
    const readOnlyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Store token in project document
    await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          readOnlyToken: readOnlyToken,
          readOnlyTokenExpiresAt: expiresAt,
          readOnlyTokenCreatedAt: new Date()
        } 
      }
    );

    console.log(`🔐 Generated read-only token for project ${projectId}, expires: ${expiresAt}`);

    res.json({
      success: true,
      message: "Read-only token generated successfully",
      data: { 
        token: readOnlyToken, 
        expiresAt: expiresAt,
        viewUrl: `${process.env.FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au'}/project/view/${readOnlyToken}`
      }
    });

  } catch (error) {
    console.error("❌ Error generating read-only token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate read-only token",
      error: error.message
    });
  }
});

/**
 * Get project data using read-only token (public route)
 * No authentication required - uses token for access
 */
router.get("/view-readonly/:token", async (req, res) => {
  try {
    const token = req.params.token;
    
    if (!token || token.length !== 64) { // 32 bytes = 64 hex chars
      return res.status(400).json({ success: false, message: "Invalid read-only token format." });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ 
      readOnlyToken: token,
      readOnlyTokenExpiresAt: { $gt: new Date() } // Token must not be expired
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: "Project not found or read-only token has expired." 
      });
    }

    // Return limited project data for read-only view
    const readOnlyProject = {
      _id: project._id,
      name: project.name,
      location: project.location,
      projectNumber: project.projectNumber,
      description: project.description,
      status: project.status,
      posting_date: project.posting_date,
      due_date: project.due_date,
      // Don't include sensitive data like linkedUsers, linkedClients, etc.
    };

    console.log(`👁️ Read-only access granted for project ${project._id} via token`);

    res.json({
      success: true,
      message: "Project retrieved successfully (read-only)",
      data: readOnlyProject,
      readOnly: true
    });

  } catch (error) {
    console.error("❌ Error accessing project via read-only token:", error);
    res.status(500).json({
      success: false,
      message: "Failed to access project",
      error: error.message
    });
  }
});

/**
 * Send estimate complete email to client
 * Frontend sends complete HTML template and subject
 */
router.post("/send-estimate/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { 
      contactEmail, 
      contactName, 
      projectAddress, 
      estimateDescription, 
      optionalBody,
      companyLogoUrl,
      subject,
      html,
      attachments = []
    } = req.body;
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    if (!contactEmail || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: contactEmail, subject, html" 
      });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Send the email using the email service with frontend-generated content
    const emailService = require('../services/emailService');
    
    const emailData = {
      projectId,
      subject,
      html // Complete HTML from frontend template with direct project URL
    };

    const result = await emailService.sendEstimateComplete(contactEmail, emailData);

    // 🆕 FEATURE #31: Update JobBoard status to "Sent" while keeping project status as "Estimate Complete"
    // This creates dual status system - JobBoard shows "Sent", Projects page shows "Estimate Complete"
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $set: { 
          jobBoardStatus: "Sent",
          estimateSentDate: new Date()
        }
      }
    );

    console.log(`📧 Estimate complete email sent for project ${projectId} to ${contactEmail}`);
    console.log(`🎯 JobBoard status updated to "Sent" for project ${projectId}`);

    res.json({
      success: true,
      message: "Estimate complete email sent successfully",
      data: {
        messageId: result.messageId,
        recipient: contactEmail,
        projectId,
        statusUpdated: updateResult.modifiedCount > 0
      }
    });

  } catch (error) {
    console.error("❌ Error sending estimate complete email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send estimate complete email",
      error: error.message
    });
  }
});

// ✅ Route to Send Job Delayed Notification Email
router.post("/send-job-delayed/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const { 
      clientEmail, 
      clientName, 
      projectName, 
      delayReason, 
      newCompletionDate,
      dayOfWeek,
      optionalMessage,
      companyLogoUrl 
    } = req.body;
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    if (!clientEmail || !projectName || !delayReason || !newCompletionDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: clientEmail, projectName, delayReason, newCompletionDate" 
      });
    }

    const collection = await projectsCollection();
    const project = await collection.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Send the job delayed email using the email service
    const emailService = require('../services/emailService');
    
    const emailData = {
      clientName,
      projectName,
      projectNumber: project.projectNumber, // Use projectNumber from database
      delayReason,
      newCompletionDate,
      dayOfWeek,
      companyLogoUrl,
      optionalMessage
    };

    const result = await emailService.sendJobDelayed(clientEmail, emailData);

    console.log(`📧 Job delayed notification sent for project ${projectId} to ${clientEmail}`);

    res.json({
      success: true,
      message: "Job delayed notification sent successfully",
      data: {
        messageId: result.messageId,
        recipient: clientEmail,
        projectId,
        newCompletionDate
      }
    });

  } catch (error) {
    console.error("❌ Error sending job delayed notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send job delayed notification",
      error: error.message
    });
  }
});

// ✅ Route to Get Project Path for Rusty's Phase 2
router.get("/get-project-path/:projectId", authenticateTokenOrApiKey(), async (req, res) => {
  try {
    const projectId = req.params.projectId;

    if (!projectId || !ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid Project ID is required." });
    }

    const projectCollectionRef = await projectsCollection();
    const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Get project disk path
    const projectPath = getProjectDiskPath(project);

    res.json({
      success: true,
      projectPath: projectPath,
      message: "Project path retrieved successfully"
    });

  } catch (error) {
    console.error("❌ Error getting project path:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get project path",
      error: error.message
    });
  }
});

// ✅ Route to Save Email Files for Existing Project (Rusty's Phase 2)
router.post("/save-email-files/:projectId", authenticateTokenOrApiKey(), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { emailContent, attachments } = req.body;

    if (!projectId || !ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid Project ID is required." });
    }

    if (!emailContent) {
      return res.status(400).json({ success: false, message: "Email content is required." });
    }

    const projectCollectionRef = await projectsCollection();
    const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Get project disk path
    const projectPath = getProjectDiskPath(project);
    const scopeFolder = path.join(projectPath, "Scope");

    // Ensure Scope folder exists
    if (!fs.existsSync(scopeFolder)) {
      fs.mkdirSync(scopeFolder, { recursive: true });
      console.log("📁 Created Scope folder:", scopeFolder);
    }

    console.log(`📧 Saving email files for project ${project.projectNumber}: "${emailContent.subject}"`);

    // Save email content to text file
    const emailText = [
      `Subject: ${emailContent.subject || 'No Subject'}`,
      `Date: ${emailContent.date || new Date().toISOString()}`,
      `From: ${emailContent.from || 'Unknown'}`,
      `To: ${emailContent.to || 'Unknown'}`,
      ``,
      `--- EMAIL CONTENT ---`,
      emailContent.body || 'No email body provided.',
      ``,
      `--- END EMAIL ---`,
      `Processed by Rusty AI on ${new Date().toISOString()}`
    ].join('\n');

    const bodyPath = path.join(scopeFolder, "email_content.txt");
    fs.writeFileSync(bodyPath, emailText, 'utf8');
    console.log(`📝 Email content saved to: ${bodyPath}`);

    // Save attachments
    let attachmentCount = 0;
    if (attachments && Array.isArray(attachments)) {
      for (const attachment of attachments) {
        try {
          if (attachment.filename && attachment.content) {
            // Sanitize filename
            const safeFilename = attachment.filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const attachmentPath = path.join(scopeFolder, safeFilename);
            
            // Write attachment content (assuming it's already a buffer or base64)
            const content = Buffer.isBuffer(attachment.content) ? 
              attachment.content : 
              Buffer.from(attachment.content, 'base64');
              
            fs.writeFileSync(attachmentPath, content);
            console.log(`📎 Attachment saved: ${safeFilename}`);
            attachmentCount++;
          }
        } catch (attachmentError) {
          console.error(`⚠️ Failed to save attachment ${attachment.filename}:`, attachmentError.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Email files saved successfully to Scope folder`,
      data: {
        projectPath: scopeFolder,
        savedTo: scopeFolder,
        attachmentsProcessed: attachmentCount,
        emailSaved: true
      }
    });

  } catch (error) {
    console.error("❌ Error processing email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save email files",
      error: error.message
    });
  }
});

// ✅ Route to Process Email for Existing Project (Scope Request)
router.post("/process-email/:projectId", authenticateTokenOrApiKey(), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { emailFile } = req.body;

    if (!projectId || !ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid Project ID is required." });
    }

    if (!emailFile || !emailFile.data) {
      return res.status(400).json({ success: false, message: "Email file data is required." });
    }

    const projectCollectionRef = await projectsCollection();
    const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    // Get project disk path
    const projectPath = getProjectDiskPath(project);
    const scopeFolder = path.join(projectPath, "Scope");

    // Ensure Scope folder exists
    if (!fs.existsSync(scopeFolder)) {
      fs.mkdirSync(scopeFolder, { recursive: true });
      console.log("📁 Created Scope folder:", scopeFolder);
    }

    // Dynamically import email processing functions (since this is server environment)
    const { simpleParser } = require("mailparser");
    const MimeNode = require("nodemailer/lib/mime-node");

    // Convert base64 data to buffer
    const emailBuffer = Buffer.from(emailFile.data, 'base64');
    
    // Parse the email
    const parsed = await simpleParser(emailBuffer);
    
    console.log(`📧 Processing email for project ${project.projectNumber}: "${parsed.subject}"`);

    // Clean subject for file naming
    const cleanSubject = (parsed.subject || "Email").replace(/[^\w\s-]/g, "").slice(0, 60).replace(/\s+/g, "_");
    
    // Save clean email content
    const cleanEmailContent = parsed.html ? 
      stripHtmlTags(parsed.html) : 
      (parsed.text || "No email body provided.");

    const bodyPath = path.join(scopeFolder, "email_body.txt");
    const aiOptimizedContent = [
      `Subject: ${parsed.subject || 'No Subject'}`,
      `Date: ${new Date().toISOString().split('T')[0]}`,
      `From: ${parsed.from?.text || 'Unknown'}`,
      `To: ${parsed.to?.text || 'Unknown'}`,
      ``,
      `--- EMAIL CONTENT ---`,
      cleanEmailContent,
      ``,
      `--- METADATA ---`,
      `Original Length: ${cleanEmailContent.length} characters`,
      `Attachments: ${parsed.attachments?.length || 0} files`
    ].join('\n');
    
    fs.writeFileSync(bodyPath, aiOptimizedContent);
    console.log("📝 Saved email content to:", bodyPath);

    // Process attachments
    let processedAttachments = 0;
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        // Skip tracking images and small files
        if (att.contentType?.startsWith("image/")) {
          const filename = (att.filename || '').toLowerCase();
          const trackingPatterns = ['pixel', 'tracking', 'beacon', 'transparent', 'clear', '1x1'];
          const isTrackingImage = trackingPatterns.some(pattern => filename.includes(pattern));
          
          if (isTrackingImage || att.content.length < 10240) { // Skip files smaller than 10KB
            console.log("🚫 Skipped small/tracking image:", att.filename);
            continue;
          }
        }

        // Save valid attachments
        const attPath = path.join(scopeFolder, att.filename);
        fs.writeFileSync(attPath, att.content);
        console.log("📎 Saved attachment:", att.filename);
        processedAttachments++;
      }
    }

    // Build and save .eml file
    const emlPath = path.join(scopeFolder, `${cleanSubject}.eml`);
    try {
      const mime = new MimeNode("multipart/alternative");
      mime.setHeader("Date", parsed.date || new Date().toUTCString());
      mime.setHeader("From", parsed.from?.text || "noreply@example.com");
      mime.setHeader("To", parsed.to?.text || "undisclosed-recipients");
      mime.setHeader("Subject", parsed.subject || "Project Email");

      if (parsed.text) {
        mime.appendChild(new MimeNode("text/plain").setContent(parsed.text));
      }
      if (parsed.html) {
        mime.appendChild(new MimeNode("text/html").setContent(parsed.html));
      }

      const eml = mime.build();
      fs.writeFileSync(emlPath, eml);
      console.log("📨 Saved .eml file:", emlPath);
    } catch (err) {
      console.warn("⚠️ .eml generation error (ignored):", err.message);
    }

    res.json({
      success: true,
      message: `Email processed successfully`,
      data: {
        projectNumber: project.projectNumber,
        emailSubject: parsed.subject,
        attachmentsProcessed: processedAttachments,
        savedTo: scopeFolder
      }
    });

  } catch (error) {
    console.error("❌ Error processing email:", error);
    res.status(500).json({
      success: false,
      message: "Error processing email",
      error: error.message
    });
  }
});

// Helper function to strip HTML tags (same as emailhandler.js)
function stripHtmlTags(html) {
  if (!html) return '';
  
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n$1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '$1')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// ✅ Route to Process Email Files for a Project (Rusty automation integration)
router.post(
  "/process-email/:projectId",
  authenticateToken(),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { emailFile } = req.body;

      if (!projectId || !emailFile) {
        return res.status(400).json({ 
          success: false, 
          message: "Project ID and email file are required." 
        });
      }

      if (!ObjectId.isValid(projectId)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid Project ID." 
        });
      }

      // Get the project
      const projectCollectionRef = await projectsCollection();
      const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });

      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found." 
        });
      }

      // TODO: Implement Rusty automation integration
      // For now, return a mock response to prevent frontend errors
      console.log(`📧 Email processing requested for project: ${project.projectName}`);
      console.log(`📎 Email file: ${emailFile.name} (${emailFile.size} bytes)`);

      // Mock successful response
      const mockResponse = {
        success: true,
        message: "Email processed successfully",
        data: {
          emailSubject: `Mock Subject from ${emailFile.name}`,
          attachmentsProcessed: 2,
          filesCreated: [
            "email-content.txt",
            "attachment-1.pdf"
          ],
          rustyProcessingId: crypto.randomUUID()
        }
      };

      res.status(200).json(mockResponse);

    } catch (error) {
      console.error("❌ Error processing email:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during email processing.",
        error: error.message 
      });
    }
  }
);

console.log("✅ projectRoutes.js successfully registered!");

console.log("🔍 Routes in projectRoutes.js:");
// ✅ CLEANUP ROUTE: Convert ObjectId entries to strings in linkedProjects arrays
router.post("/cleanup-linked-projects", authenticateToken(), authorizeRole("Admin"), async (req, res) => {
  try {
    const clientColl = await clientCollection();
    
    // Find all clients with linkedProjects that contain ObjectId entries
    const clients = await clientColl.find({
      linkedProjects: { $exists: true, $ne: [] }
    }).toArray();
    
    let updatedCount = 0;
    
    for (const client of clients) {
      if (Array.isArray(client.linkedProjects)) {
        // Convert any ObjectId entries to strings
        const cleanedProjects = client.linkedProjects.map(projectId => {
          if (typeof projectId === 'object' && projectId.$oid) {
            return projectId.$oid; // Convert ObjectId to string
          }
          return projectId.toString(); // Ensure all are strings
        });
        
        // Update the client if there were changes
        const hasChanges = client.linkedProjects.some((projectId, index) => 
          (typeof projectId === 'object' && projectId.$oid) || 
          projectId.toString() !== cleanedProjects[index]
        );
        
        if (hasChanges) {
          await clientColl.updateOne(
            { _id: client._id },
            { $set: { linkedProjects: cleanedProjects } }
          );
          updatedCount++;
          console.log(`✅ Updated client ${client.name} linkedProjects`);
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Cleanup completed. Updated ${updatedCount} clients.`,
      updatedCount 
    });
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    res.status(500).json({ 
      success: false, 
      message: "Cleanup failed", 
      error: error.message 
    });
  }
});

router.stack.forEach((layer) => {
    if (layer.route) {
        console.log(`✅ ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
    }
});


module.exports = router;
