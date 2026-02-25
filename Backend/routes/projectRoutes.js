const express = require("express");
const router = express.Router();
const { projectsCollection, userCollection, clientCollection } = require("../db");
const { authenticateToken, authenticateAdmin, authorizeRole, authenticateTokenOrApiKey } = require("../middleware/auth");
const { ObjectId, Double } = require("mongodb");
const { tryRenameProjectFolder } = require("../features/fileManager/services/tryRenameProjectFolder");
const { createInitialProjectFolders } = require("../features/fileManager/controllers/folderController"); // ✅ NEW
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getProjectDiskPath } = require("../features/fileManager/services/pathUtils");
const { logDeprecation, logBug, logWarning } = require("../utils/logger");
const { normalizeProjectName } = require("../utils/projectNameNormalizer");

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

// ✅ Route to update specific project fields (Admin only for sensitive fields like projectNumber)
router.patch("/update/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    const userRole = req.user?.role;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    // 🚫 Admin-only restriction for sensitive fields (especially projectNumber)
    const adminOnlyFields = ['projectNumber', 'alias'];
    const hasAdminOnlyChanges = adminOnlyFields.some(field => updates.hasOwnProperty(field));
    
    if (hasAdminOnlyChanges && userRole !== 'Admin') {
      console.log(`🚫 Non-admin user ${req.user?.name || 'Unknown'} (${userRole}) attempted to update admin-only fields:`, 
                  Object.keys(updates).filter(key => adminOnlyFields.includes(key)));
      return res.status(403).json({ 
        success: false, 
        message: "Admin access required to update project number or alias" 
      });
    }

    // Normalize project name if it exists in the updates
    if (updates.name && typeof updates.name === 'string') {
      updates.name = normalizeProjectName(updates.name);
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

    // Check if projectNumber changed and update alias accordingly
    const projectNumberChanged = updates.projectNumber && 
                                 updates.projectNumber !== existingProject.projectNumber;
    
    if (projectNumberChanged && existingProject.alias) {
      const alias = existingProject.alias;
      
      // Check if it's a hybrid alias (contains '&')
      if (alias.includes('&')) {
        // Extract the obscure key from the old alias
        const parts = alias.split('&');
        if (parts.length === 2) {
          const obscureKey = parts[1];
          // Create new alias with updated project number
          updates.alias = `${updates.projectNumber}ART&${obscureKey}`;
          console.log(`🔄 Updated alias: ${existingProject.alias} → ${updates.alias}`);
        }
      }
      // Note: Legacy random aliases don't need project number updates
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

      // 🎯 SMART STATUS UPDATE: Only set to "Assigned" if project hasn't been worked on yet
      // Don't reset status if already in progress (In Progress, RFI, HOLD, Sent, etc.)
      const currentEstimateStatus = project.estimateStatus || project.status;
      const shouldUpdateStatus = !currentEstimateStatus || 
                                currentEstimateStatus === 'Estimate Requested' || 
                                currentEstimateStatus === 'Unknown';
      
      const statusUpdate = shouldUpdateStatus ? {
        estimateStatus: "Assigned",
        jobBoardStatus: "Assigned", // 🔄 DEV MODE: legacy field
        status: "Assigned" // 🔄 DEV MODE: legacy field (will be phased out)
      } : {};

      let updateProject;
      if (multiAssign) {
        if (!project.linkedEstimators.includes(estimatorId)) {
          updateProject = await projectCollectionRef.updateOne(
            { _id: new ObjectId(projectId) },
            { 
              $addToSet: { linkedEstimators: estimatorId },
              ...(Object.keys(statusUpdate).length > 0 ? { $set: statusUpdate } : {})
            }
          );
          console.log(`🔍 Multi-assign DB write result:`, { 
            matchedCount: updateProject.matchedCount, 
            modifiedCount: updateProject.modifiedCount,
            statusUpdate 
          });
        }
      } else {
        updateProject = await projectCollectionRef.updateOne(
          { _id: new ObjectId(projectId) },
          { 
            $set: { 
              linkedEstimators: [estimatorId],
              ...statusUpdate
            }
          }
        );
        console.log(`🔍 Single-assign DB write result:`, { 
          matchedCount: updateProject.matchedCount, 
          modifiedCount: updateProject.modifiedCount,
          statusUpdate 
        });
      }
      
      if (shouldUpdateStatus) {
        console.log(`✅ Status updated to "Assigned" (estimateStatus + legacy fields)`);
        
        // 🔍 DEBUG: Verify the update actually wrote to the database
        const verifyProject = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });
        console.log(`🔍 POST-UPDATE VERIFICATION:`, {
          estimateStatus: verifyProject.estimateStatus,
          jobBoardStatus: verifyProject.jobBoardStatus,
          status: verifyProject.status,
          linkedEstimators: verifyProject.linkedEstimators
        });
      } else {
        console.log(`ℹ️ Status NOT updated - project already in progress (${currentEstimateStatus})`);
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

      const statusMessage = shouldUpdateStatus 
        ? `Status set to "Assigned".`
        : `Status unchanged (already in progress).`;
      
      console.log(`✅ Estimator ${estimator.firstName} ${estimator.lastName} assigned to project ${projectId} successfully. ${statusMessage}`);
      res.json({ 
        success: true, 
        message: `Estimator ${estimator.firstName} ${estimator.lastName} assigned to project successfully. ${statusMessage}`,
        statusUpdated: shouldUpdateStatus
      });

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
    console.log("🎯 ════════════════════════════════════════════════════════");
    console.log("🎯 BACKEND: ADD PROJECT REQUEST RECEIVED");
    console.log("🎯 Auth Type:", req.authType || 'token');
    console.log("🎯 Project Name:", req.body.name);
    console.log("🎯 Contact Email:", req.body.contactEmail);
    console.log("🎯 Posting Date:", req.body.posting_date);
    console.log("🎯 Due Date:", req.body.due_date);
    console.log("🎯 ════════════════════════════════════════════════════════");

    const collection = await projectsCollection();
    const projectNumber = await generateProjectNumber(collection);

    // 1) Read linkedClients from the request
    const linkedClients = req.body.linkedClients || [];
    const linkedUsers   = req.body.linkedUsers   || [];

    const initialStatus = req.body.status || "New Lead";
    
    const newProject = {
      name: req.body.name,
      location: req.body.location,
      due_date: req.body.due_date,
      posting_date: req.body.posting_date,
      linkedClients,           // ← include this
      linkedUsers,
      description: req.body.description,
      subTotal: req.body.subTotal || 0,
      total:   req.body.total    || 0,
      gst:     req.body.gst      || 0,
      // DEV MODE: Initialize both legacy and new status fields
      status:  initialStatus,              // Legacy client status
      projectStatus: initialStatus,        // New client status
      jobBoardStatus: null,                // Legacy estimator status (null until assigned)
      estimateStatus: null,                // New estimator status (null until assigned)
      DateCompleted: null,                 // Initialize DateCompleted
      projectNumber,
      // 📸 Pricing Snapshot - Captured when estimate is sent
      pricingSnapshot: {
        capturedAt: null,               // Timestamp when pricing was locked
        clientPricingTier: null,        // Elite/Pro/Standard at time of estimate
        clientUseNewPricing: null,      // true/false - which pricing model was active
        priceMultiplier: null,          // Actual multiplier used (0.6, 0.7, 0.8, or 1.0)
        exchangeRate: null,             // NOK exchange rate if applicable
      },
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

    console.log("✅ ════════════════════════════════════════════════════════");
    console.log("✅ BACKEND: PROJECT CREATED SUCCESSFULLY");
    console.log("✅ Project ID:", createdId.toString());
    console.log("✅ Project Number:", projectNumber);
    console.log("✅ ════════════════════════════════════════════════════════");
    
    return res.status(201).json({
      success: true,
      message: "Project added successfully",
      data: { _id: createdId, ...newProject },
    });
  } catch (error) {
    console.error("❌ ════════════════════════════════════════════════════════");
    console.error("❌ BACKEND: PROJECT CREATION FAILED");
    console.error("❌ Error Message:", error.message);
    console.error("❌ Error Stack:", error.stack);
    console.error("❌ ════════════════════════════════════════════════════════");
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// ❌ OLD RESTRICTIVE ROUTE REMOVED - See line 2139 for new paginated endpoint that supports all roles

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
 * 🎯 SMART DETECTION: Search for projects by sender email + address
 * Enables thread detection for forwarded emails where headers change
 */
router.get("/search-by-sender-address", authenticateTokenOrApiKey("create_project"), async (req, res) => {
  try {
    const { senderEmail, address } = req.query;
    
    if (!senderEmail || !address) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing senderEmail or address parameter" 
      });
    }
    
    console.log(`🔍 Searching for project: sender=${senderEmail}, address=${address}`);
    
    const collection = await projectsCollection();
    
    // Search for projects that match:
    // 1. The sender email (in contactEmail or linkedClients)
    // 2. The address (in location.full_address or name)
    const project = await collection.findOne({
      $and: [
        // Match sender email
        {
          $or: [
            { contactEmail: senderEmail },
            { 'linkedClients.email': senderEmail }
          ]
        },
        // Match address (case-insensitive, partial match)
        {
          $or: [
            { 'location.full_address': { $regex: address, $options: 'i' } },
            { name: { $regex: address, $options: 'i' } },
            { address: { $regex: address, $options: 'i' } }
          ]
        }
      ]
    }, {
      sort: { posting_date: -1 } // Get most recent match
    });
    
    if (project) {
      console.log(`✅ Found project: ${project.projectNumber} - ${project.name}`);
      return res.json({ 
        success: true, 
        project: project 
      });
    } else {
      console.log(`❌ No project found for ${senderEmail} + ${address}`);
      return res.status(404).json({ 
        success: false, 
        message: "No matching project found" 
      });
    }
    
  } catch (error) {
    console.error("❌ Error searching by sender + address:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search for project",
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
      attachments = [],
      skipEmailSending = false // Default to false for email modal calls
    } = req.body;
    
    console.log(`📧 [SEND-ESTIMATE] Request received for project ${projectId}`);
    console.log(`📧 [SEND-ESTIMATE] To: ${contactEmail}`);
    console.log(`📧 [SEND-ESTIMATE] Skip email sending: ${skipEmailSending}`);
    console.log(`📧 [SEND-ESTIMATE] Attachments received:`, attachments);
    console.log(`📧 [SEND-ESTIMATE] Attachments length:`, attachments?.length || 0);
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    // Validate required fields only if sending actual email
    if (!skipEmailSending && (!contactEmail || !subject || !html)) {
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

    // 🚫 CHECK CLIENT ACCOUNT STATUS - Block sending if account is on HOLD
    // 📸 CAPTURE PRICING SNAPSHOT - Lock in pricing at time of estimate send
    let clientData = null;
    if (project.linkedClients && project.linkedClients.length > 0) {
      const Client = require('../config/Client');
      const clientId = project.linkedClients[0]; // Get first linked client
      
      try {
        clientData = await Client.findById(clientId);
        
        if (clientData && clientData.accountStatus === 'Hold') {
          console.log(`🚫 Blocked estimate send for project ${projectId} - Client account on HOLD (overdue invoices)`);
          return res.status(403).json({ 
            success: false, 
            message: `Cannot send estimate. Client account is on HOLD due to overdue invoices. Please contact accounting.`,
            code: 'ACCOUNT_ON_HOLD',
            clientId: clientData._id,
            clientName: clientData.name
          });
        }
        
        console.log(`✅ Client account status check passed (Status: ${clientData?.accountStatus || 'Active'})`);
      } catch (clientError) {
        console.error(`⚠️ Error checking client account status:`, clientError);
        // Continue with sending - don't block if there's an error checking
      }
    }

    // 📸 CAPTURE/UPDATE PRICING SNAPSHOT - Calculate unit price WITH multipliers, total WITHOUT additional multipliers
    if (!project.pricingSnapshot || !project.pricingSnapshot.capturedAt) {
      const tier = clientData?.loyaltyTier || clientData?.pricingTier || 'Casual';
      
      // Determine multiplier based on current loyalty tier
      let multiplier = 1.0;
      if (tier === 'Elite') {
        multiplier = 0.7; // Elite: 30% discount = $70
      } else if (tier === 'Pro') {
        multiplier = 0.8; // Pro: 20% discount = $80
      }
      
      // Base prices - current $100 system
      const BASE_PRICES = {
        'Basic': 75,
        'Standard': 100,
        'Std Highset': 115,
        'Detailed': 130,
        'Dtd Highset': 150,
        'Complex': 100,
        'Commercial': 100,
        'Townhouses': 100,
        'Hourly': 100,
        'Wall Cladding': 100,
        'Manual Price': parseFloat(project.Price || project.EstimatePrice || 0),
        'Nearmap Rebate': -5
      };
      
      const planType = project.PlanType || 'Standard';
      let basePrice = BASE_PRICES[planType] || 100;
      
      // Calculate unit price with multiplier
      let priceEach = 0;
      if (planType === 'Manual Price') {
        priceEach = basePrice; // Manual Price doesn't get discounts
        multiplier = 1.0;
      } else {
        priceEach = basePrice * multiplier; // Apply tier discount to unit price
      }
      
      // Calculate total: unit price × qty (NO additional multipliers)
      const qty = parseFloat(project.Qty || project.EstimateQty || project.EstQty || 1);
      const totalPrice = priceEach * qty; // Simple multiplication
      
      // Calculate dollar amount saved (for client insights/reports)
      const discountAmount = basePrice - priceEach;
      const totalDiscountAmount = discountAmount * qty;
      
      const pricingSnapshot = {
        capturedAt: new Date(),
        clientPricingTier: tier,
        loyaltyTier: tier, // Keep the loyalty tier for historical reference
        priceEach: new Double(Math.round(priceEach * 100) / 100),     // Unit price WITH tier discount
        totalPrice: new Double(Math.round(totalPrice * 100) / 100),   // Unit price × Qty (no additional multipliers)
        priceMultiplier: new Double(multiplier),                      // Keep for reference
        discountAmount: new Double(Math.round(discountAmount * 100) / 100),
        totalDiscountAmount: new Double(Math.round(totalDiscountAmount * 100) / 100),
        exchangeRate: null, // Will be set if NOK pricing is used
        lockedViaModal: !skipEmailSending, // Track how it was locked
        lockedViaStatusDropdown: skipEmailSending
      };

      // Update project with pricing snapshot
      await collection.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { pricingSnapshot } }
      );

      console.log(`📸 Pricing snapshot created for project ${projectId} (via ${skipEmailSending ? 'status dropdown' : 'send modal'}):`, {
        planType: project.PlanType || 'Standard',
        tier: pricingSnapshot.clientPricingTier,
        basePrice: `$${basePrice}`,
        multiplier: pricingSnapshot.priceMultiplier,
        priceEach: `$${pricingSnapshot.priceEach}`,
        qty: qty,
        totalPrice: `$${pricingSnapshot.totalPrice}`,
        discountPerUnit: `$${pricingSnapshot.discountAmount}`,
        totalSaved: `$${pricingSnapshot.totalDiscountAmount}`
      });
    } else {
      console.log(`ℹ️ Pricing snapshot already exists for project ${projectId} (captured ${project.pricingSnapshot.capturedAt}, multiplier: ${project.pricingSnapshot.priceMultiplier})`);
    }

    // Calculate client local time and timezone
    let clientLocalDate = new Date().toISOString().split('T')[0];
    let clientTimezone = 'UTC';
    
    try {
      // Get client timezone from project location
      const { getClientLocalDate } = require('../utils/timezoneUtils');
      clientTimezone = await getClientLocalDate(project, null, true); // Get timezone only
      const now = new Date();
      clientLocalDate = now.toLocaleDateString('en-CA', { timeZone: clientTimezone }); // YYYY-MM-DD format
      console.log(`📅 Client timezone detected: ${clientTimezone}, Local date: ${clientLocalDate}`);
    } catch (error) {
      console.error('Error calculating client local date:', error);
      clientLocalDate = new Date().toISOString().split('T')[0]; // Fallback to UTC
    }
    
    // ✅ Auto-update project estimateStatus to "Sent" with DateCompleted and estimateSent tracking
    // Note: Only add to estimateSent array if NOT called from status dropdown (to avoid duplicates)
    const now = new Date();
    const isoTimestamp = now.toISOString();
    
    let updateFields = {
      estimateStatus: "Sent",
      projectStatus: "Estimate Completed", // Client sees "Estimate Completed"
      status: "Estimate Completed", // Legacy field for compatibility
      jobBoardStatus: "Estimate Completed", // Legacy field
      DateCompleted: clientLocalDate, // ✅ Client's local date (e.g., 8-10 hours ahead)
    };
    
    // Only add timestamp to estimateSent array if sending actual email (not from status dropdown)
    if (!skipEmailSending) {
      // Get existing estimateSent array or initialize empty array
      const existingEstimateSent = project.estimateSent || [];
      const updatedEstimateSent = [...existingEstimateSent, isoTimestamp];
      updateFields.estimateSent = updatedEstimateSent;
    }
    
    const projectsCol = await projectsCollection();
    await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateFields }
    );

    // Send the email using the email service (skip if status dropdown call)
    let result = { messageId: 'skipped' };
    if (!skipEmailSending) {
      const emailService = require('../services/emailService');
      
      // Process attachments if provided
      let emailAttachments = [];
      if (attachments && attachments.length > 0) {
        const fs = require('fs').promises;
        
        console.log(`📎 Processing ${attachments.length} attachment(s) for email...`);
        console.log(`📎 Environment: ${process.env.NODE_ENV || 'development'}`);
        
        // Get project base path using standard utility
        const projectBasePath = getProjectDiskPath(project);
        console.log(`📎 Project Base Path: ${projectBasePath}`);
        
        for (const attachment of attachments) {
          try {
            const { folderPath, fileName } = attachment;
            
            console.log(`\n📎 Processing attachment:`);
            console.log(`   - Folder Path: ${folderPath}`);
            console.log(`   - File Name: ${fileName}`);
            
            // Construct full file path: projectBasePath + folderPath + fileName
            const filePath = path.join(projectBasePath, folderPath, fileName);
            console.log(`   - Full File Path: ${filePath}`);
            
            // Check if file exists
            const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
            console.log(`   - File Exists: ${fileExists}`);
            
            if (fileExists) {
              // Read file content
              const fileContent = await fs.readFile(filePath);
              const fileSizeKB = (fileContent.length / 1024).toFixed(2);
              
              emailAttachments.push({
                filename: fileName,
                content: fileContent,
                contentType: 'application/pdf'
              });
              
              console.log(`   ✅ File attached successfully (${fileSizeKB} KB)`);
            } else {
              console.warn(`   ⚠️ File not found at path: ${filePath}`);
              console.warn(`   ⚠️ Make sure the file exists in: ${projectBasePath}/${folderPath}/${fileName}`);
            }
          } catch (error) {
            console.error(`   ❌ Error attaching file ${attachment.fileName}:`, error.message);
            console.error(`   ❌ Error stack:`, error.stack);
          }
        }
        
        console.log(`\n📎 Total attachments ready: ${emailAttachments.length}/${attachments.length}\n`);
      }
      
      const emailData = {
        projectId,
        subject,
        html, // Complete HTML from frontend template with direct project URL
        attachments: emailAttachments
      };

      result = await emailService.sendEstimateComplete(contactEmail, emailData);
      console.log(`📧 Email sent successfully to ${contactEmail || contactEmail}`);
    } else {
      console.log(`ℹ️ Email sending skipped (status dropdown call)`);
    }

    console.log(`✅ Project ${projectId} updated: estimateStatus="Sent", DateCompleted=${clientLocalDate} (${clientTimezone})${!skipEmailSending ? ', estimateSent appended' : ', no timestamp added (status dropdown)'}`);

    // ✅ Auto-sync loyalty units for client (if client exists)
    if (project.linkedClients && project.linkedClients.length > 0) {
      const axios = require('axios');
      const clientId = project.linkedClients[0]; // Get first linked client
      
      try {
        // Call internal sync endpoint WITHOUT tier evaluation
        // Tier evaluation should only happen on the 1st of each month via cron
        await axios.post(`http://localhost:${process.env.PORT || 5000}/api/loyalty/client/${clientId}/sync-from-projects`, {
          evaluateTier: false // Tier evaluation only happens monthly via cron
        });
        console.log(`✅ Loyalty units synced for client ${clientId} (tier evaluation deferred to monthly cron)`);
      } catch (loyaltyError) {
        console.warn(`⚠️ Could not sync loyalty units for client ${clientId}:`, loyaltyError.message);
        // Don't fail the email send if loyalty sync fails
      }
    }

    res.json({
      success: true,
      message: `Estimate ${skipEmailSending ? 'status updated' : 'email sent'} successfully`,
      data: {
        messageId: result.messageId,
        recipient: skipEmailSending ? 'none' : (contactEmail || clientEmail),
        projectId
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

// ✅ LIGHTWEIGHT PROJECT INDEX - For month counting without full data
router.get("/get-project-index", authenticateToken(), async (req, res) => {
  try {
    console.log("📇 Fetching project index (lightweight)");
    
    const projectCollectionRef = await projectsCollection();
    const userRole = req.user?.role || "User";
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    
    // Build same role-based query as main endpoint
    let query = {};
    
    if (userRole === "Estimator") {
      query.linkedEstimators = { $in: [userId.toString()] };
      console.log(`🎯 Estimator filter for index: ${userId}`);
    } else if (userRole === "User") {
      const userCollectionRef = await userCollection();
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const userDoc = await userCollectionRef.findOne({ _id: userObjectId });
      
      if (userDoc?.linkedClients?.length > 0) {
        const userLinkedClientIds = userDoc.linkedClients.map(id => 
          typeof id === 'string' ? id : id.toString()
        );
        query.$or = [
          { linkedUsers: { $in: [userId.toString()] } },
          { linkedClients: { $in: userLinkedClientIds } }
        ];
      } else {
        query.linkedUsers = { $in: [userId.toString()] };
      }
    }
    
    // Fetch minimal fields for index (projectNumber, _id, linkedEstimators, State, ART_Inv)
    const projectIndex = await projectCollectionRef
      .find(query)
      .project({
        _id: 1,
        projectNumber: 1,
        linkedEstimators: 1,
        State: 1,
        ART_Inv: 1,
        posting_date: 1
      })
      .sort({ projectNumber: -1 })
      .toArray();
    
    console.log(`📇 Project index complete: ${projectIndex.length} projects`);
    
    res.json({
      success: true,
      data: projectIndex,
      totalCount: projectIndex.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching project index:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project index",
      error: error.message
    });
  }
});

// ✅ SERVER-SIDE SEARCH - Search across ALL projects in database
router.get("/search-projects", authenticateToken(), async (req, res) => {
  try {
    const searchTerm = req.query.q || req.query.search || '';
    const monthFilter = req.query.month; // Optional: filter by month while searching
    
    console.log(`🔍 Server search requested: "${searchTerm}", month: ${monthFilter || 'all'}`);
    
    if (!searchTerm.trim()) {
      return res.json({
        success: true,
        data: [],
        totalCount: 0,
        message: "No search term provided"
      });
    }
    
    const projectCollectionRef = await projectsCollection();
    const clientCollectionRef = await clientCollection();
    const userCollectionRef = await userCollection();
    const userRole = req.user?.role || "User";
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    
    // Build role-based query first
    let roleQuery = {};
    
    if (userRole === "Estimator") {
      roleQuery.linkedEstimators = { $in: [userId.toString()] };
    } else if (userRole === "User") {
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const userDoc = await userCollectionRef.findOne({ _id: userObjectId });
      
      if (userDoc?.linkedClients?.length > 0) {
        const userLinkedClientIds = userDoc.linkedClients.map(id => 
          typeof id === 'string' ? id : id.toString()
        );
        roleQuery.$or = [
          { linkedUsers: { $in: [userId.toString()] } },
          { linkedClients: { $in: userLinkedClientIds } }
        ];
      } else {
        roleQuery.linkedUsers = { $in: [userId.toString()] };
      }
    }
    
    // Build search query
    const searchRegex = new RegExp(searchTerm.trim(), 'i');
    const searchConditions = [
      { name: searchRegex },
      { projectNumber: searchRegex },
      { 'location.full_address': searchRegex },
      { 'location.state': searchRegex }, // ✅ Search in location.state
      { estimateStatus: searchRegex },
      { status: searchRegex },
      { ARTInvNumber: searchRegex } // ✅ Correct field name
    ];
    
    // Combine role query with search query
    let finalQuery = { ...roleQuery };
    if (roleQuery.$or) {
      // If role already has $or, use $and to combine
      finalQuery = {
        $and: [
          roleQuery,
          { $or: searchConditions }
        ]
      };
    } else {
      finalQuery.$or = searchConditions;
    }
    
    // Add month filter if provided
    if (monthFilter && monthFilter !== 'all') {
      const year = parseInt(monthFilter.split('-')[0]);
      const month = parseInt(monthFilter.split('-')[1]);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      finalQuery.posting_date = {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      };
    }
    
    // Use same projection as list view
    const LIST_VIEW_PROJECTION = {
      _id: 1, projectNumber: 1, name: 1,
      estimateStatus: 1, status: 1, // ✅ Current status fields (Feb 2026)
      posting_date: 1, due_date: 1, DateCompleted: 1, createdAt: 1,
      PlanType: 1, Qty: 1, EstQty: 1, EstInv: 1, EstPay: 1, EstPayStatus: 1,
      ManualPrice: 1, ARTInvNumber: 1, // ✅ Correct field name
      linkedClients: 1, linkedEstimators: 1, linkedUsers: 1,
      'location.full_address': 1, 'location.state': 1, // ✅ State from location object
      Comments: 1, pricingSnapshot: 1, InvoiceLine: 1
    };
    
    const searchResults = await projectCollectionRef
      .find(finalQuery)
      .project(LIST_VIEW_PROJECTION)
      .sort({ posting_date: -1, projectNumber: -1 })
      .toArray();
    
    console.log(`🎯 Search found ${searchResults.length} matching projects`);
    
    res.json({
      success: true,
      data: searchResults,
      totalCount: searchResults.length,
      searchTerm: searchTerm
    });
    
  } catch (error) {
    console.error("❌ Error in search-projects:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message
    });
  }
});

// ✅ NEW PAGINATED GET-PROJECTS ENDPOINT - Solves Performance Issues
router.get("/get-projects", authenticateToken(), async (req, res) => {
  try {
    console.log("✅ Reached the /get-projects route handler");
    
    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const requestedLimit = parseInt(req.query.limit) || 100;
    const limit = Math.min(requestedLimit, 1000); // Max 1000 items per page (allow "Load All")
    const skip = (page - 1) * limit;
    
    // Extract filter parameters
    const status = req.query.status;
    const search = req.query.search;
    const monthFilter = req.query.month; // e.g., "2025-10" for October 2025
    const estimatorId = req.query.estimatorId;
    
    console.log(`📄 Pagination: Page ${page}, Limit ${limit}, Skip ${skip}`);
    console.log(`🔍 Filters: Status=${status}, Search=${search}, Month=${monthFilter}, EstimatorId=${estimatorId}`);

    const projectCollectionRef = await projectsCollection();
    const userRole = req.user?.role || "User";
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    
    console.log(`👤 User from token: userId=${userId}, role=${userRole}`);
    
    // Build query based on user role and filters
    let query = {};
    
    // Role-based filtering
    if (userRole === "Estimator") {
      query.linkedEstimators = { $in: [userId.toString()] };
      console.log(`🎯 Estimator filter applied for user: ${userId}`);
    } else if (userRole === "User") {
      // For regular users, get their linked clients first
      const userCollectionRef = await userCollection();
      
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
      const userDoc = await userCollectionRef.findOne({ _id: userObjectId });
      
      if (userDoc && userDoc.linkedClients && userDoc.linkedClients.length > 0) {
        // Convert user's linked clients to strings for comparison
        const userLinkedClientIds = userDoc.linkedClients.map(id => 
          typeof id === 'string' ? id : id.toString()
        );
        
        console.log(`🎯 User (${userId}) linked clients: ${JSON.stringify(userLinkedClientIds)}`);
        
        // Show projects where:
        // 1. User is directly linked to the project OR
        // 2. Project has clients that match user's linked clients
        query.$or = [
          { linkedUsers: { $in: [userId.toString()] } },
          { linkedClients: { $in: userLinkedClientIds } }
        ];
      } else {
        // User has no linked clients - only show projects they're directly linked to
        console.log(`⚠️ User (${userId}) has no linked clients, showing only directly linked projects`);
        query.linkedUsers = { $in: [userId.toString()] };
      }
    }
    // Admin sees all projects (no additional filtering)
    
    // Apply additional filters
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (estimatorId && estimatorId !== 'all') {
      query.linkedEstimators = { $in: [estimatorId] };
    }
    
    if (monthFilter) {
      // Month filter: "2025-10" -> projects posted in October 2025
      const year = parseInt(monthFilter.split('-')[0]);
      const month = parseInt(monthFilter.split('-')[1]);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      query.posting_date = {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      };
    }
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { projectNumber: searchRegex },
        { description: searchRegex },
        { 'location.full_address': searchRegex }
      ];
      
      // Merge with existing $or conditions if they exist
      if (query.$or && userRole === "User") {
        query.$and = [
          { $or: query.$or }, // User role conditions
          { $or: [ // Search conditions
            { name: searchRegex },
            { projectNumber: searchRegex },
            { description: searchRegex },
            { 'location.full_address': searchRegex }
          ]}
        ];
        delete query.$or;
      }
    }
    
    console.log("🔍 Final MongoDB Query:", JSON.stringify(query, null, 2));
    
    // Get total count for pagination
    const totalProjects = await projectCollectionRef.countDocuments(query);
    const totalPages = Math.ceil(totalProjects / limit);
    
    // ✅ OPTIMIZED LIST PROJECTION - Only fields displayed in table
    const LIST_VIEW_PROJECTION = {
      // Core identifiers
      _id: 1,
      projectNumber: 1,
      name: 1,
      
      // Status fields
      estimateStatus: 1,
      jobBoardStatus: 1,
      status: 1,
      State: 1,
      
      // Dates
      posting_date: 1,
      due_date: 1,
      DateCompleted: 1,
      createdAt: 1,
      
      // Pricing fields
      PlanType: 1,
      Qty: 1,
      PriceEach: 1,
      EstQty: 1,
      EstInv: 1,
      EstPay: 1,
      EstPayStatus: 1,
      ManualPrice: 1,
      ART_Inv: 1,
      ARTInvNumber: 1, // ✅ Invoice number column
      InvoiceLine: 1,
      FlashingSet: 1,
      
      // Relationships
      linkedClients: 1,
      linkedEstimators: 1,
      linkedUsers: 1,
      
      // Location (full object for state access)
      location: 1, // ✅ Include full location to access location.state
      
      // Minimal metadata
      Comments: 1,
      pricingSnapshot: 1
      
      // Note: Only including needed fields - heavy fields (scope, notes, emailHistory, attachedFiles) automatically excluded
    };
    
    // Get paginated projects with projection and sorting
    const projects = await projectCollectionRef
      .find(query)
      .project(LIST_VIEW_PROJECTION)
      .sort({ posting_date: -1, projectNumber: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    console.log(`📊 Found ${projects.length} projects (page ${page} of ${totalPages}, total: ${totalProjects})`);
    
    // Return paginated response
    res.json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProjects: totalProjects,
        projectsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        status: status || 'All',
        search: search || '',
        month: monthFilter || '',
        estimatorId: estimatorId || ''
      }
    });
    
  } catch (error) {
    console.error("❌ Error in get-projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve projects",
      error: error.message
    });
  }
});

// ✅ GET PROJECTS BY IDS - For index-based filtering (month tabs, search)
router.post("/get-projects-by-ids", authenticateToken(), async (req, res) => {
  try {
    console.log("✅ Reached /get-projects-by-ids endpoint");
    
    const { projectIds = [], sortBy = 'posting_date', sortOrder = 'desc' } = req.body;
    
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "projectIds array is required and must not be empty"
      });
    }
    
    console.log(`📋 Loading ${projectIds.length} projects by IDs...`);
    
    const projectCollectionRef = await projectsCollection();
    
    // Convert string IDs to ObjectId
    const { ObjectId } = require('mongodb');
    const objectIds = projectIds.map(id => {
      try {
        return new ObjectId(id);
      } catch (err) {
        console.warn(`⚠️ Invalid ObjectId: ${id}`);
        return null;
      }
    }).filter(id => id !== null);
    
    // Same projection as get-projects for consistency
    const LIST_VIEW_PROJECTION = {
      _id: 1,
      projectNumber: 1,
      name: 1,
      estimateStatus: 1,
      status: 1,
      posting_date: 1,
      due_date: 1,
      DateCompleted: 1,
      createdAt: 1,
      PlanType: 1,
      Qty: 1,
      PriceEach: 1,
      EstQty: 1,
      EstInv: 1,
      EstPay: 1,
      EstPayStatus: 1,
      ManualPrice: 1,
      ARTInvNumber: 1,
      InvoiceLine: 1,
      FlashingSet: 1,
      linkedClients: 1,
      linkedEstimators: 1,
      linkedUsers: 1,
      location: 1,
      Comments: 1,
      pricingSnapshot: 1
    };
    
    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Get projects
    const projects = await projectCollectionRef
      .find({ _id: { $in: objectIds } })
      .project(LIST_VIEW_PROJECTION)
      .sort(sortObj)
      .toArray();
    
    console.log(`✅ Loaded ${projects.length} projects`);
    
    res.json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects
    });
    
  } catch (error) {
    console.error("❌ Error in get-projects-by-ids:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve projects",
      error: error.message
    });
  }
});

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

// ✅ DUAL-STATUS SYSTEM: Update Project Status and/or Estimate Status
router.patch("/:projectId", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { projectStatus, estimateStatus, status, linkedEstimators } = req.body; // Accept legacy 'status' + linkedEstimators
    
    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
    }

    const projectCollectionRef = await projectsCollection();
    const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const userRole = req.user?.role || "User";
    const userId = req.user?._id?.toString();
    const updateFields = {};
    
    // Handle linkedEstimators updates (for Estimators claiming/unclaiming and Admins)
    if (linkedEstimators !== undefined) {
      if (userRole === "Estimator") {
        // Estimators can only add/remove themselves
        const currentEstimators = project.linkedEstimators || [];
        const isAddingSelf = linkedEstimators.includes(userId) && !currentEstimators.includes(userId);
        const isRemovingSelf = !linkedEstimators.includes(userId) && currentEstimators.includes(userId);
        
        if (isAddingSelf || isRemovingSelf) {
          updateFields.linkedEstimators = linkedEstimators;
          console.log(`👷 Estimator ${isAddingSelf ? 'claiming' : 'unclaiming'} project ${projectId}`);
        } else {
          return res.status(403).json({ 
            success: false, 
            message: "Estimators can only add or remove themselves from projects." 
          });
        }
      } else if (userRole === "Admin") {
        // Admins can update any estimator assignments
        updateFields.linkedEstimators = linkedEstimators;
        console.log(`🔧 Admin updating linkedEstimators for project ${projectId}`);
      } else {
        return res.status(403).json({ 
          success: false, 
          message: "Users cannot update estimator assignments." 
        });
      }
    }
    
    // Handle legacy single-status updates
    if (status && !projectStatus && !estimateStatus) {
      // Legacy mode: Update old 'status' field only
      updateFields.status = status;
      console.log(`🔄 Legacy status update for project ${projectId}: ${status}`);
    } else {
      // NEW DUAL-STATUS SYSTEM
      
      // Migrate legacy status to new fields on first dual-status update
      if (project.status && !project.projectStatus && !project.estimateStatus) {
        console.log(`🔄 Migrating legacy status "${project.status}" to dual-status fields`);
        // Determine which field the legacy status belongs to
        const isEstimateStatus = [
          "Assigned", "In Progress", "In Progress: Walls", "RFI", "HOLD", 
          "Small Fix", "Awaiting Review", "Sent"
        ].includes(project.status);
        
        if (isEstimateStatus) {
          updateFields.estimateStatus = project.status;
          updateFields.projectStatus = "Estimate Requested"; // Default client status
        } else {
          updateFields.projectStatus = project.status;
          updateFields.estimateStatus = null;
        }
      }
      
      // ROLE-BASED UPDATE PERMISSIONS
      if (userRole === "Admin") {
        // Admins can update both (for testing/dev)
        if (projectStatus !== undefined) {
          updateFields.projectStatus = projectStatus;
          updateFields.status = projectStatus; // 🔄 DEV MODE: Also update legacy field
          console.log(`🔧 Admin updating projectStatus: ${projectStatus} (also updating legacy 'status')`);
          
          // SPECIAL: "Estimate Requested" sets BOTH fields simultaneously
          if (projectStatus === "Estimate Requested") {
            updateFields.estimateStatus = "Estimate Requested";
            updateFields.jobBoardStatus = "Estimate Requested"; // 🔄 DEV MODE: Also update legacy field
            console.log(`✨ Setting estimateStatus to "Estimate Requested" (dual-field update + legacy)`);
          }
        }
        if (estimateStatus !== undefined) {
          updateFields.estimateStatus = estimateStatus;
          updateFields.jobBoardStatus = estimateStatus; // 🔄 DEV MODE: Also update legacy field
          console.log(`🔧 Admin updating estimateStatus: ${estimateStatus} (also updating legacy 'jobBoardStatus')`);
          
          // AUTO-UPDATE projectStatus when estimate is "Sent" or "Estimate Completed"
          if (estimateStatus === "Sent" || estimateStatus === "Estimate Completed") {
            updateFields.projectStatus = "Estimate Completed";
            updateFields.status = "Estimate Completed"; // 🔄 DEV MODE: Also update legacy field
            console.log(`✨ Auto-updating projectStatus to "Estimate Completed" (also updating legacy 'status')`);
            
            // 📸 ENSURE PRICING SNAPSHOT EXISTS when marking as "Sent" (unified with send-estimate endpoint)
            if (estimateStatus === "Sent" && (!project.pricingSnapshot || !project.pricingSnapshot.capturedAt)) {
              console.log(`⚠️ Admin status update to "Sent" without pricing snapshot - will be created when status is saved`);
              // Note: The actual snapshot creation happens in the /send-estimate endpoint auto-trigger
              // This ensures both modal and dropdown use the same pricing logic
            }
          }
        }
      } else if (userRole === "User") {
        // Users can ONLY update projectStatus
        if (projectStatus !== undefined) {
          updateFields.projectStatus = projectStatus;
          updateFields.status = projectStatus; // 🔄 DEV MODE: Also update legacy field
          console.log(`👤 User updating projectStatus: ${projectStatus} (also updating legacy 'status')`);
          
          // SPECIAL: "Estimate Requested" sets BOTH fields simultaneously
          if (projectStatus === "Estimate Requested") {
            updateFields.estimateStatus = "Estimate Requested";
            updateFields.jobBoardStatus = "Estimate Requested"; // 🔄 DEV MODE: Also update legacy field
            console.log(`✨ Setting estimateStatus to "Estimate Requested" (dual-field update + legacy)`);
          }
          
          // CANCEL REQUEST LOGIC: User selects "Cancel Request" from locked dropdown
          if (projectStatus === "Cancel Request") {
            updateFields.estimateStatus = "Cancelled";
            updateFields.jobBoardStatus = "Cancelled"; // 🔄 DEV MODE: Also update legacy field
            updateFields.projectStatus = project.projectStatus || "Estimate Requested";
            updateFields.status = project.projectStatus || project.status || "Estimate Requested"; // 🔄 DEV MODE
            console.log(`❌ User cancelled estimate request - estimateStatus set to "Cancelled" (also updating legacy)`);
          }
        }
        if (estimateStatus !== undefined) {
          return res.status(403).json({ 
            success: false, 
            message: "Users cannot update estimate status." 
          });
        }
      } else if (userRole === "Estimator") {
        // Estimators can ONLY update estimateStatus
        if (estimateStatus !== undefined) {
          updateFields.estimateStatus = estimateStatus;
          updateFields.jobBoardStatus = estimateStatus; // 🔄 DEV MODE: Also update legacy field
          updateFields.status = estimateStatus; // 🔄 DEV MODE: Also update legacy 'status' field (will be phased out)
          console.log(`👷 Estimator updating estimateStatus: ${estimateStatus} (also updating legacy 'jobBoardStatus' + 'status')`);
          
          // AUTO-UPDATE projectStatus when estimate is "Sent" or "Estimate Completed"
          if (estimateStatus === "Sent" || estimateStatus === "Estimate Completed") {
            updateFields.projectStatus = "Estimate Completed";
            updateFields.status = "Estimate Completed"; // 🔄 DEV MODE: Also update legacy field
            console.log(`✨ Auto-updating projectStatus to "Estimate Completed" (also updating legacy 'status')`);
            
            // 📸 ENSURE PRICING SNAPSHOT EXISTS when marking as "Sent" (unified with send-estimate endpoint)
            if (estimateStatus === "Sent" && (!project.pricingSnapshot || !project.pricingSnapshot.capturedAt)) {
              console.log(`⚠️ Status update to "Sent" without pricing snapshot - will be created when status is saved`);
              // Note: The actual snapshot creation happens in the /send-estimate endpoint auto-trigger
              // This ensures both modal and dropdown use the same pricing logic
            }
          }
        }
        if (projectStatus !== undefined) {
          return res.status(403).json({ 
            success: false, 
            message: "Estimators cannot update project status." 
          });
        }
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No valid fields to update." 
      });
    }

    // 🔄 DEV MODE COMPATIBILITY: Log what's being updated
    console.log(`📝 Updating fields:`, Object.keys(updateFields).join(', '));

    // Update project in database
    const result = await projectCollectionRef.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found or no changes made",
      });
    }

    // Fetch updated project
    const updatedProject = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });

    // ✅ LOYALTY TRACKING: Sync when estimate is marked as "Sent" or "Estimate Completed"
    if ((estimateStatus === "Sent" || estimateStatus === "Estimate Completed") && 
        updatedProject.linkedClients && updatedProject.linkedClients.length > 0) {
      const axios = require('axios');
      const clientId = updatedProject.linkedClients[0];
      
      try {
        await axios.post(`http://localhost:${process.env.PORT || 5000}/api/loyalty/client/${clientId}/sync-from-projects`, {
          evaluateTier: true
        });
        console.log(`✅ Loyalty units synced for client ${clientId} (status change to ${estimateStatus})`);
      } catch (loyaltyError) {
        console.warn(`⚠️ Could not sync loyalty units:`, loyaltyError.message);
      }
    }

    console.log(`✅ Project ${projectId} status updated successfully`);
    res.json({
      success: true,
      message: "Project status updated successfully",
      data: updatedProject
    });

  } catch (error) {
    console.error("❌ Error updating project status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update project status",
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUICKBOOKS AUTO-INVOICE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create QuickBooks invoice for a project
 * POST /api/projects/:projectId/create-invoice
 */
router.post("/:projectId/create-invoice", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { forceCreate = false } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID" });
    }

    const projectsCol = await projectsCollection();
    const clientsCol = await clientCollection();

    // Get project
    const project = await projectsCol.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // ✅ Enhanced validation with better error messages
    if (!project.pricingSnapshot) {
      return res.status(400).json({
        success: false,
        message: "❌ No pricing data available. Please send estimate first to lock pricing.",
        code: "NO_PRICING_SNAPSHOT"
      });
    }

    // Check if already invoiced
    if (project.ARTInvNumber && !forceCreate) {
      return res.status(400).json({
        success: false,
        message: "✅ Project already invoiced",
        invoiceNumber: project.ARTInvNumber,
        code: "ALREADY_INVOICED"
      });
    }

    // Get client
    if (!project.linkedClients || project.linkedClients.length === 0) {
      return res.status(400).json({
        success: false,
        message: "❌ Project has no linked client",
        code: "NO_CLIENT"
      });
    }

    const clientId = project.linkedClients[0];
    const client = await clientsCol.findOne({ _id: new ObjectId(clientId) });
    
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    // Check if QuickBooks is connected for this client
    if (!client.quickbooks?.connected || !client.quickbooks?.accessToken) {
      return res.status(400).json({
        success: false,
        message: "QuickBooks not connected for this client. Please connect QuickBooks first.",
        clientName: client.name
      });
    }

    // Check if auto-invoice is enabled
    if (!client.quickbooks.autoInvoice && !forceCreate) {
      return res.status(400).json({
        success: false,
        message: "Auto-invoice is not enabled for this client",
        clientName: client.name
      });
    }

    // Get pricing from pricingSnapshot
    const snapshot = project.pricingSnapshot;
    if (!snapshot || !snapshot.priceEach || !snapshot.totalPrice) {
      return res.status(400).json({
        success: false,
        message: "Project has no pricing snapshot. Please send estimate first to lock pricing."
      });
    }

    const axios = require('axios');
    const qbBaseUrl = `http://localhost:${process.env.PORT || 5000}/api/quickbooks`;

    // Prepare invoice data
    const qty = parseFloat(project.Qty || 1);
    const priceEach = parseFloat(snapshot.priceEach || 0);
    const totalPrice = parseFloat(snapshot.totalPrice || 0);
    const planType = project.PlanType || 'Standard';

    // Create or get customer in QuickBooks
    const customerData = {
      DisplayName: client.name,
      PrimaryEmailAddr: {
        Address: client.mainContact?.email || client.mainContact?.accountsEmail
      },
      BillAddr: client.billingAddress ? {
        Line1: client.billingAddress.line1 || client.billingAddress.full_address,
        City: client.billingAddress.city,
        CountrySubDivisionCode: client.billingAddress.state,
        PostalCode: client.billingAddress.postalCode,
        Country: client.billingAddress.country
      } : undefined
    };

    let qbCustomerId = client.quickbooks.customerId;
    
    if (!qbCustomerId) {
      const customerResponse = await axios.post(`${qbBaseUrl}/get-or-create-customer`, {
        access_token: client.quickbooks.accessToken,
        realmId: client.quickbooks.realmId,
        customer: customerData
      });

      if (customerResponse.data.success) {
        qbCustomerId = customerResponse.data.data.Id;
        
        // Save customer ID to client
        await clientsCol.updateOne(
          { _id: client._id },
          { $set: { 'quickbooks.customerId': qbCustomerId } }
        );
        
        console.log(`✅ QuickBooks customer created/found: ${qbCustomerId}`);
      } else {
        throw new Error('Failed to create/find customer in QuickBooks');
      }
    }

    // Create or get service item
    const itemName = planType;
    const itemData = {
      Name: itemName,
      Type: 'Service',
      IncomeAccountRef: {
        value: '1' // Default sales account - adjust as needed
      }
    };

    let qbItemId = client.quickbooks.defaultServiceItem;
    
    if (!qbItemId) {
      const itemResponse = await axios.post(`${qbBaseUrl}/get-or-create-item`, {
        access_token: client.quickbooks.accessToken,
        realmId: client.quickbooks.realmId,
        item: itemData
      });

      if (itemResponse.data.success) {
        qbItemId = itemResponse.data.data.Id;
        console.log(`✅ QuickBooks item created/found: ${qbItemId}`);
      } else {
        throw new Error('Failed to create/find item in QuickBooks');
      }
    }

    // Build invoice
    const invoiceData = {
      CustomerRef: {
        value: qbCustomerId
      },
      Line: [
        {
          DetailType: 'SalesItemLineDetail',
          Amount: totalPrice,
          SalesItemLineDetail: {
            ItemRef: {
              value: qbItemId,
              name: planType
            },
            UnitPrice: priceEach,
            Qty: qty
          },
          Description: project.InvoiceLine || `${project.projectNumber} - ${project.name} - ${qty} x ${planType}`
        }
      ],
      CustomerMemo: {
        value: `Project: ${project.projectNumber}`
      },
      CustomField: [
        {
          DefinitionId: '1',
          Name: 'ProjectNumber',
          Type: 'StringType',
          StringValue: project.projectNumber
        }
      ]
    };

    // Add billing address if available
    if (client.billingAddress) {
      invoiceData.BillAddr = {
        Line1: client.billingAddress.line1 || client.billingAddress.full_address,
        City: client.billingAddress.city,
        CountrySubDivisionCode: client.billingAddress.state,
        PostalCode: client.billingAddress.postalCode,
        Country: client.billingAddress.country
      };
    }

    // Create invoice in QuickBooks
    const invoiceResponse = await axios.post(`${qbBaseUrl}/create-invoice`, {
      access_token: client.quickbooks.accessToken,
      realmId: client.quickbooks.realmId,
      invoice: invoiceData
    });

    if (!invoiceResponse.data.success) {
      throw new Error('Failed to create invoice in QuickBooks');
    }

    const qbInvoice = invoiceResponse.data.data;
    const invoiceNumber = qbInvoice.DocNumber;

    // Update project with invoice number
    await projectsCol.updateOne(
      { _id: project._id },
      { 
        $set: { 
          ARTInvNumber: invoiceNumber,
          quickbooksInvoiceId: qbInvoice.Id,
          invoicedAt: new Date()
        } 
      }
    );

    // Update client's last sync timestamp
    await clientsCol.updateOne(
      { _id: client._id },
      { $set: { 'quickbooks.lastSyncedAt': new Date() } }
    );

    console.log(`✅ QuickBooks invoice created: ${invoiceNumber} for project ${project.projectNumber}`);

    res.json({
      success: true,
      message: 'Invoice created successfully in QuickBooks',
      data: {
        invoiceNumber: invoiceNumber,
        invoiceId: qbInvoice.Id,
        total: totalPrice,
        projectNumber: project.projectNumber,
        quickbooksInvoice: qbInvoice
      }
    });

  } catch (error) {
    console.error("❌ Error creating QuickBooks invoice:", error);
    
    // Log error in client's sync errors
    if (error.response?.data) {
      const { projectId } = req.params;
      const project = await projectsCollection().then(col => col.findOne({ _id: new ObjectId(projectId) }));
      
      if (project?.linkedClients?.[0]) {
        const clientsCol = await clientCollection();
        await clientsCol.updateOne(
          { _id: new ObjectId(project.linkedClients[0]) },
          {
            $push: {
              'quickbooks.syncErrors': {
                timestamp: new Date(),
                error: error.message,
                projectId: projectId
              }
            }
          }
        );
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to create QuickBooks invoice",
      error: error.message,
      details: error.response?.data || null
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BULK INVOICE CREATION & INVOICE-READY PROJECTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get projects ready for invoicing
 * GET /api/projects/invoice-ready
 */
router.get("/invoice-ready", authenticateToken(), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Get user's linked clients
    const userCol = await userCollection();
    const currentUser = await userCol.findOne({ _id: new ObjectId(userId) });
    const linkedClients = currentUser?.linkedClients || [];

    console.log('🔍 DEBUG: User linked clients:', linkedClients);

    if (linkedClients.length === 0) {
      return res.json({ success: true, data: { ready: [], maybe: [], all: [] } });
    }

    const projectsCol = await projectsCollection();
    const clientsCol = await clientCollection();

    // DEBUG: Check total projects for this user
    const totalProjects = await projectsCol.countDocuments({
      linkedClients: { $in: linkedClients.map(id => new ObjectId(id)) }
    });
    console.log('🔍 DEBUG: Total projects for user:', totalProjects);

    // DEBUG: Check projects with different statuses
    const allStatuses = await projectsCol.distinct('estimateStatus', {
      linkedClients: { $in: linkedClients.map(id => new ObjectId(id)) }
    });
    console.log('🔍 DEBUG: All estimate statuses found:', allStatuses);

    // DEBUG: Check projects with estimateSent field
    const withEstimateSent = await projectsCol.countDocuments({
      linkedClients: { $in: linkedClients.map(id => new ObjectId(id)) },
      estimateSent: { $exists: true, $ne: null, $ne: [] }
    });
    console.log('🔍 DEBUG: Projects with estimateSent:', withEstimateSent);

    // DEBUG: Check projects without ARTInvNumber
    const withoutInvoiceNum = await projectsCol.countDocuments({
      linkedClients: { $in: linkedClients.map(id => new ObjectId(id)) },
      $or: [
        { ARTInvNumber: { $exists: false } },
        { ARTInvNumber: null },
        { ARTInvNumber: "" }
      ]
    });
    console.log('🔍 DEBUG: Projects without invoice number:', withoutInvoiceNum);

    // Find projects that are ready for invoicing
    const baseQuery = {
      linkedClients: { $in: linkedClients.map(id => new ObjectId(id)) },
      $or: [
        { ARTInvNumber: { $exists: false } }, // No invoice number field
        { ARTInvNumber: null }, // Invoice number is null
        { ARTInvNumber: "" } // Invoice number is empty string
      ]
    };

    // Perfect candidates: Have all required fields
    const readyQuery = {
      ...baseQuery,
      estimateSent: { $exists: true, $ne: null, $ne: [] }, // Has estimate sent
      estimateStatus: "Sent" // Estimate status is "Sent"
    };

    console.log('🔍 DEBUG: Ready query:', JSON.stringify(readyQuery, null, 2));

    // Maybe candidates: Missing some fields but not invoiced yet
    const maybeQuery = {
      ...baseQuery,
      $or: [
        { estimateSent: { $exists: false } }, // Missing estimate sent
        { estimateSent: null },
        { estimateSent: [] },
        { estimateStatus: { $ne: "Sent" } }, // Status not "Sent"
        { estimateStatus: { $exists: false } }
      ]
    };

    // Fetch ready projects
    const readyProjects = await projectsCol
      .find(readyQuery)
      .project({
        _id: 1,
        projectNumber: 1,
        name: 1,
        linkedClients: 1,
        PlanType: 1,
        Qty: 1,
        pricingSnapshot: 1,
        estimateSent: 1,
        estimateStatus: 1,
        posting_date: 1,
        due_date: 1,
        ARTInvNumber: 1
      })
      .sort({ posting_date: -1 })
      .toArray();

    // Fetch maybe projects
    const maybeProjects = await projectsCol
      .find(maybeQuery)
      .project({
        _id: 1,
        projectNumber: 1,
        name: 1,
        linkedClients: 1,
        PlanType: 1,
        Qty: 1,
        pricingSnapshot: 1,
        estimateSent: 1,
        estimateStatus: 1,
        posting_date: 1,
        due_date: 1,
        ARTInvNumber: 1
      })
      .sort({ posting_date: -1 })
      .toArray();

    // Add client info to each project
    const allProjects = [...readyProjects, ...maybeProjects];
    const clientIds = [...new Set(allProjects.flatMap(p => p.linkedClients))];
    const clients = await clientsCol
      .find({ _id: { $in: clientIds } })
      .project({ _id: 1, name: 1, quickbooks: 1 })
      .toArray();

    const clientMap = Object.fromEntries(clients.map(c => [c._id.toString(), c]));

    const enrichProject = (project) => ({
      ...project,
      client: project.linkedClients?.[0] ? clientMap[project.linkedClients[0].toString()] : null,
      canInvoice: project.linkedClients?.[0] ? clientMap[project.linkedClients[0].toString()]?.quickbooks?.connected : false,
      readyStatus: readyProjects.includes(project) ? 'ready' : 'maybe',
      missingFields: readyProjects.includes(project) ? [] : [
        ...(!project.estimateSent || project.estimateSent.length === 0 ? ['estimateSent'] : []),
        ...(project.estimateStatus !== "Sent" ? ['estimateStatus'] : [])
      ]
    });

    const enrichedReady = readyProjects.map(enrichProject);
    const enrichedMaybe = maybeProjects.map(enrichProject);

    res.json({
      success: true,
      data: {
        ready: enrichedReady,
        maybe: enrichedMaybe,
        all: [...enrichedReady, ...enrichedMaybe] // Combined for backward compatibility
      },
      count: {
        ready: enrichedReady.length,
        maybe: enrichedMaybe.length,
        total: enrichedReady.length + enrichedMaybe.length
      }
    });

  } catch (error) {
    console.error("❌ Error getting invoice-ready projects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get invoice-ready projects"
    });
  }
});

/**
 * Create invoices for multiple projects
 * POST /api/projects/bulk-create-invoices
 */
router.post("/bulk-create-invoices", authenticateToken(), async (req, res) => {
  try {
    const { projectIds } = req.body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Project IDs array is required"
      });
    }

    const results = [];
    
    for (const projectId of projectIds) {
      try {
        // Call the existing single invoice creation endpoint
        const axios = require('axios');
        const response = await axios.post(
          `http://localhost:${process.env.PORT || 5000}/api/projects/${projectId}/create-invoice`,
          { forceCreate: false },
          {
            headers: {
              'Authorization': req.headers.authorization,
              'Content-Type': 'application/json'
            }
          }
        );

        results.push({
          projectId,
          success: true,
          invoiceNumber: response.data.data?.invoiceNumber,
          message: response.data.message
        });

      } catch (error) {
        results.push({
          projectId,
          success: false,
          error: error.response?.data?.message || error.message,
          code: error.response?.data?.code
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.json({
      success: true,
      message: `Bulk invoice creation completed: ${successCount} successful, ${failCount} failed`,
      results,
      summary: {
        total: projectIds.length,
        successful: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    console.error("❌ Error in bulk invoice creation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create bulk invoices"
    });
  }
});

router.stack.forEach((layer) => {
    if (layer.route) {
        console.log(`✅ ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
    }
});


module.exports = router;
