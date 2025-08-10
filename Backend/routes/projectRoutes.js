const express = require("express");
const router = express.Router();
const { projectsCollection, userCollection, clientCollection } = require("../db");
const { authenticateToken, authenticateAdmin, authorizeRole } = require("../middleware/auth");
const { ObjectId } = require("mongodb");
const { tryRenameProjectFolder } = require("../features/fileManager/services/tryRenameProjectFolder");
const { createInitialProjectFolders } = require("../features/fileManager/controllers/folderController"); // ✅ NEW
const fs = require("fs");
const path = require("path");
const { getProjectDiskPath } = require("../features/fileManager/services/pathUtils");

// Load API keys for service authentication
let apiKeys = {};
try {
  const apiKeysPath = path.join(__dirname, "../config/api-keys.json");
  apiKeys = JSON.parse(fs.readFileSync(apiKeysPath, "utf-8"));
} catch (err) {
  console.warn("⚠️ Could not load API keys:", err.message);
}


console.log("✅ projectRoutes.js is being loaded...");

// ✅ Route to Assign Client to a Project (Admin only)
router.patch(
  "/assignClient/:projectId",
  authenticateToken(),
  authorizeRole("Admin"),
  async (req, res) => {
    try {
      const { clientId, multiAssign = false } = req.body;
      const projectId = req.params.projectId;

      if (!clientId || !projectId) {
        return res.status(400).json({ success: false, message: "Client ID and Project ID are required." });
      }

      if (!ObjectId.isValid(clientId) || !ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: "Invalid Client ID or Project ID." });
      }

      console.log(`🔍 Looking up client: ${clientId}`);
      const clientCollectionRef  = await clientCollection();
      const projectCollectionRef = await projectsCollection();

      const client = await clientCollectionRef.findOne({ _id: new ObjectId(clientId) });
      if (!client) {
        console.log(`❌ Client not found: ${clientId}`);
        return res.status(404).json({ success: false, message: "Client not found." });
      }

      console.log(`🔍 Looking up project: ${projectId}`);
      const project = await projectCollectionRef.findOne({ _id: new ObjectId(projectId) });
      if (!project) {
        console.log(`❌ Project not found: ${projectId}`);
        return res.status(404).json({ success: false, message: "Project not found." });
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
          { $addToSet: { linkedProjects: projectId } }
        );
      }

      // Check update success
      if (
        (updateProject?.modifiedCount === 0 && multiAssign) ||
        (updateClient?.modifiedCount === 0)
      ) {
        return res.status(500).json({ success: false, message: "Failed to update client or project." });
      }

      console.log(`✅ Client ${client.name} assigned to project ${projectId} successfully.`);
      res.json({ success: true, message: `Client ${client.name} assigned to project successfully.` });

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


// ✅ Route to update specific project fields
router.patch("/update/:id", authenticateToken(), async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid Project ID." });
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
router.post("/addProject", authenticateToken(), async (req, res) => {
  try {
    console.log("📩 Received Project Data:", req.body);

    const collection = await projectsCollection();
    const projectNumber = await generateProjectNumber(collection);

    // 1) Read linkedClients from the request
    const linkedClients = req.body.linkedClients || [];
    const linkedUsers   = req.body.linkedUsers   || [];

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
      status:  req.body.status   || "New Lead",
      projectNumber,
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
        { $push: { linkedProjects: createdId } }
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

// Route to get projects (Admin)
router.get("/get-projects", authenticateToken(), authenticateAdmin(), async (req, res) => {
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

// Route to get projects (User)
router.get("/get-user-projects", authenticateToken(), async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID" });
    }

    const collection = await projectsCollection();

    const userProjects = await collection
      .find({ linkedUsers: { $in: [userId] } }) // Match by string userId only
      .toArray();

    return res.json({
      success: true,
      message: "Projects for user fetched successfully",
      data: userProjects,
    });
  } catch (error) {
    console.error("❌ Error fetching user projects:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
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

    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
    console.log(timestamp, " - ✅ Project found:", project.name);

    // If the project is found, return the data
    return res.json({
      success: true,
      message: "Project retrieved successfully",
      data: project,
    });
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

    // Check user permissions
    const user = req.user;
    const userRole = user?.role || "User";
    const isUserLinked = project?.linkedUsers?.includes(user?.userId || user?._id);

    // Admin can access any project, Users can only access linked projects
    if (userRole !== "Admin" && !isUserLinked) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

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

console.log("✅ projectRoutes.js successfully registered!");

console.log("🔍 Routes in projectRoutes.js:");
router.stack.forEach((layer) => {
    if (layer.route) {
        console.log(`✅ ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
    }
});


module.exports = router;
