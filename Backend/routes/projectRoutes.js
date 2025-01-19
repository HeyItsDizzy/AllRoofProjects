const express = require("express");
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const projectsCollection = require("../db").projectsCollection; // Adjust if needed
const userCollection = require("../db").userCollection; // Adjust if needed
const { ObjectId } = require("mongodb");

// Route to add multiple projects
router.post("/add-projects", authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const projects = req.body;
    const result = await projectsCollection.insertMany(projects);
    return res.json({
      success: true,
      message: "All projects added successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to add projects",
      error: err.message,
    });
  }
});

// Route to add a single project
router.post("/addProject", authenticateToken(), async (req, res) => {
  try {
    const project = req.body;
    project.status = "running"; // Default project status
    const result = await projectsCollection.insertOne(project);
    return res.json({
      success: true,
      message: "Project added successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to add project",
      error: err.message,
    });
  }
});

// Route to update a project's status to "complete"
router.put("/updateProjectToComplete/:id", authenticateToken(), async (req, res) => {
  const projectId = req.params.id;
  try {
    const result = await projectsCollection.updateOne(
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

// Route to retrieve all projects
router.get("/get-projects", authenticateToken(), async (req, res) => {
  try {
    const { search, startDate } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate) {
      query.posting_date = { $gte: new Date(startDate) };
    }

    const projects = await projectsCollection.find(query).toArray();
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

// Route to retrieve a project by ID
router.get("/get-project/:id", authenticateToken(), async (req, res) => {
  const projectId = req.params.id;

  try {
    const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.json({
      success: true,
      message: "Project retrieved successfully",
      data: project,
    });
  } catch (err) {
    res.status(500).json({
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
    const projects = await projectsCollection.find({ userId: new ObjectId(userId) }).toArray();
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

// Route to assign a user to a project
router.patch("/asignUser/:projectId", authenticateToken(), authenticateAdmin(), async (req, res) => {
  const { projectId } = req.params;
  const assignedOn = req.body;

  try {
    const result = await projectsCollection.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { assignedOn } }
    );

    if (!result.modifiedCount) {
      return res.status(404).json({
        success: false,
        message: "Failed to assign user to project",
      });
    }

    return res.json({
      success: true,
      message: "User assigned to project successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to assign user to project",
      error: err.message,
    });
  }
});

module.exports = router;
