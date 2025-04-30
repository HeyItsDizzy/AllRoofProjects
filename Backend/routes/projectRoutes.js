const express = require("express");
const router = express.Router();
const { projectsCollection, userCollection } = require("../db");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const { ObjectId } = require("mongodb");
const { tryRenameProjectFolder } = require("../features/fileManager/services/tryRenameProjectFolder");

console.log("✅ projectRoutes.js is being loaded...");


// ✅ Route to Assign User to a Project
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
      // Folder rename logic
      const updatedProject = { ...existingProject, ...updates }; // simulate what Mongo now contains
      await tryRenameProjectFolder(existingProject, updatedProject);
    }

    return res.json({ success: true, message: "Project updated successfully." });

  } catch (error) {
    console.error("❌ Error updating project:", error);
    res.status(500).json({ success: false, message: "Failed to update project." });
  }
});

router.get("/test", (req, res) => {
  res.json({ success: true, message: "Test route is working!" });
});

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

  // ✅ Ensure we're using the correct collection reference
  const count = await collection.countDocuments({
    projectNumber: { $regex: `^${baseNumber}` }, // ✅ Matches projects with the same year-month
  });

  return `${baseNumber}${String(count + 1).padStart(3, "0")}`;
};


// Route to add a single project
router.post("/addProject", async (req, res) => {
  try {
    console.log("📩 Received Project Data:", req.body);

    const collection = await projectsCollection();
    const projectNumber = await generateProjectNumber(collection);

    const newProject = {
      name: req.body.name,
      location: req.body.location,
      due_date: req.body.due_date,
      posting_date: req.body.posting_date,
      linkedUsers: req.body.linkedUsers || [],
      description: req.body.description,
      subTotal: req.body.subTotal || 0,
      total: req.body.total || 0,
      gst: req.body.gst || 0,
      status: req.body.status || "New Lead",
      projectNumber: projectNumber,
    };

    const result = await collection.insertOne(newProject);

    if (!result.insertedId) {
      throw new Error("Failed to add project.");
    }

// Auto-create folder structure
const { createInitialProjectFolders } = require("../features/fileManager/services/folderScaffolder");

const fullProject = { ...newProject, _id: result.insertedId };

try {
  await createInitialProjectFolders(fullProject);
  console.log("📁 Root folder and role-protected subfolders created.");
} catch (folderErr) {
  console.warn("⚠️ Folder structure creation failed:", folderErr.message);
}


    // ✅ Only One Response Sent Now
    return res.status(201).json({
      success: true,
      message: "Project added successfully",
      data: { _id: result.insertedId, ...newProject }
    });

  } catch (error) {
    console.error("❌ Error adding project:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
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

    // Query without the filter to fetch all projects
    console.log("Querying MongoDB...");
    const projects = await collection.find({}).maxTimeMS(5000).toArray();
    console.log("Projects Found:", projects.length);

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





// Route to retrieve user data
/*router.get("/get-userData", authenticateToken(), async (req, res) => {
  try {
    const collection = await userCollection(); // Ensure this is defined correctly
    const users = await collection.find({}).toArray(); // Adjust filter logic as needed
    return res.json({
      success: true,
      message: "User data retrieved successfully",
      data: users,
    });
  } catch (err) {
    console.error("Error retrieving user data:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user data",
      error: err.message,
    });
  }
});*/


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


// Route to retrieve projects by user ID
router.get("/get-projects/:id", authenticateToken(), async (req, res) => {
  const userId = req.params.id;

  try {
    const collection = await projectsCollection();
    const projects = await collection.find({ userId: new ObjectId(userId) }).toArray();
    if (!projects.length) {
      return res.status(404).json({
        success: false,
        message: "No projects found for this user",
      });
    }

    return res.json({
      success: true,
      message: "Projects retrieved successfully",
      data: projects,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve projects",
      error: err.message,
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
