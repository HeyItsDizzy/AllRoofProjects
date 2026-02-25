/**
 * Project Dashboard Routes
 * 
 * API endpoints for the Project Dashboard feature including:
 * - Dashboard data aggregation
 * - Project files management
 * - Tasks management
 * - Activity feed
 * 
 * All routes are protected with authentication
 */

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

console.log("✅ projectDashboardRoutes.js is being loaded...");

/**
 * Helper function to resolve project ID or alias to project document
 * Handles both MongoDB ObjectId and security alias strings
 */
async function resolveProject(projectIdOrAlias) {
  const { projectsCollection } = require("../db");
  const projectsCol = await projectsCollection();
  
  let project;
  let resolvedProjectId;
  
  if (ObjectId.isValid(projectIdOrAlias)) {
    // Standard MongoDB ObjectId lookup
    resolvedProjectId = new ObjectId(projectIdOrAlias);
    project = await projectsCol.findOne({ _id: resolvedProjectId });
  } else {
    // Security alias lookup (e.g., "25-11048ART&7ae4e5a9fff59c37e45432526c1298dc")
    project = await projectsCol.findOne({ alias: projectIdOrAlias });
    if (project) {
      resolvedProjectId = project._id;
    }
  }
  
  return { project, resolvedProjectId };
}

/**
 * GET /api/projects/:projectId/dashboard
 * 
 * Aggregate endpoint that fetches all data needed for the dashboard home view
 * Returns: project details, file counts, task counts, latest uploads, pending tasks, etc.
 */
router.get("/projects/:projectId/dashboard", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;

    // Resolve project from ID or alias
    const { project, resolvedProjectId } = await resolveProject(projectId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Get database connection
    const db = require("../db").db || (await require("../db").connectDB());
    
    const projectFilesCol = db.collection("project_files");
    const projectTasksCol = db.collection("project_tasks");
    const projectQuotesCol = db.collection("project_quotes");
    const projectOrdersCol = db.collection("project_orders");
    const projectTakeoffsCol = db.collection("project_takeoffs");
    const projectActivityCol = db.collection("project_activity");
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // 2. Get file statistics
    const fileStats = await projectFilesCol.aggregate([
      { $match: { projectId: resolvedProjectId, status: "active" } },
      {
        $facet: {
          total: [{ $count: "count" }],
          byCategory: [
            { $group: { _id: "$category", count: { $sum: 1 } } }
          ],
          latest: [
            { $sort: { uploadedAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: 1,
                size: 1,
                uploadedAt: 1,
                category: 1,
                uploadedByName: 1,
                extension: 1
              }
            }
          ]
        }
      }
    ]).toArray();

    const fileData = fileStats[0] || { total: [], byCategory: [], latest: [] };
    const totalFiles = fileData.total[0]?.count || 0;
    const latestUploads = fileData.latest || [];
    
    // Transform file categories to match dashboard format
    const fileCategories = fileData.byCategory.map(cat => ({
      label: cat._id || "other",
      count: cat.count
    }));

    // 3. Get task statistics
    const taskStats = await projectTasksCol.aggregate([
      { $match: { projectId: resolvedProjectId } },
      {
        $facet: {
          total: [{ $count: "count" }],
          pending: [
            { $match: { status: { $in: ["pending", "in_progress"] } } },
            { $count: "count" }
          ],
          pendingList: [
            { $match: { status: { $in: ["pending", "in_progress"] } } },
            { $sort: { priority: 1, dueDate: 1 } }, // Sort by priority then due date
            { $limit: 5 },
            {
              $project: {
                title: 1,
                description: 1,
                priority: 1,
                dueDate: 1,
                status: 1,
                assignedToNames: 1
              }
            }
          ]
        }
      }
    ]).toArray();

    const taskData = taskStats[0] || { total: [], pending: [], pendingList: [] };
    const totalTasks = taskData.total[0]?.count || 0;
    const pendingTasksCount = taskData.pending[0]?.count || 0;
    const pendingTasks = taskData.pendingList || [];

    // 4. Get quote statistics
    const quoteStats = await projectQuotesCol.aggregate([
      { $match: { projectId: resolvedProjectId } },
      {
        $facet: {
          drafts: [
            { $match: { status: "draft" } },
            { $count: "count" }
          ],
          latest: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { total: 1 } }
          ]
        }
      }
    ]).toArray();

    const quoteData = quoteStats[0] || { drafts: [], latest: [] };
    const draftQuoteCount = quoteData.drafts[0]?.count || 0;
    const latestQuoteAmount = quoteData.latest[0]?.total || 0;

    // 5. Get order statistics
    const orderStats = await projectOrdersCol.aggregate([
      { $match: { projectId: resolvedProjectId } },
      {
        $facet: {
          open: [
            { $match: { status: { $in: ["pending", "confirmed", "processing", "partially_received"] } } },
            { $count: "count" }
          ]
        }
      }
    ]).toArray();

    const orderData = orderStats[0] || { open: [] };
    const openOrderCount = orderData.open[0]?.count || 0;

    // 6. Get takeoff statistics
    const takeoffStats = await projectTakeoffsCol.findOne(
      { projectId: resolvedProjectId, status: { $in: ["approved", "pending_review"] } },
      { sort: { version: -1 } } // Get latest version
    );

    const roofFaces = takeoffStats?.roofFaces || 0;
    const wallFaces = takeoffStats?.wallFaces || 0;

    // 7. Get recent activity
    const recentActivity = await projectActivityCol.find(
      { projectId: resolvedProjectId },
      {
        sort: { timestamp: -1 },
        limit: 10,
        projection: {
          action: 1,
          description: 1,
          actorName: 1,
          timestamp: 1,
          entityType: 1,
          important: 1
        }
      }
    ).toArray();

    // 8. Generate Rusty AI insights (placeholder - will be enhanced with real AI)
    const insights = [];
    
    // Add insight if tasks are overdue
    const overdueTasks = await projectTasksCol.countDocuments({
      projectId: resolvedProjectId,
      status: { $in: ["pending", "in_progress"] },
      dueDate: { $lt: new Date() }
    });
    
    if (overdueTasks > 0) {
      insights.push({
        type: "warning",
        title: "Overdue Tasks",
        description: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''} requiring attention.`,
        action: "View Tasks"
      });
    }

    // Add insight if no recent file uploads
    const daysSinceLastUpload = project.dashboard?.stats?.lastFileUpload 
      ? Math.floor((Date.now() - new Date(project.dashboard.stats.lastFileUpload).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    if (daysSinceLastUpload && daysSinceLastUpload > 7) {
      insights.push({
        type: "info",
        title: "No Recent Uploads",
        description: `No files uploaded in the last ${daysSinceLastUpload} days.`,
        action: "Upload Files"
      });
    }

    // Add insight if project is in quoting stage for a while
    if (project.dashboard?.progressStage === "quoting" && project.dashboard?.progressPercentage < 60) {
      insights.push({
        type: "info",
        title: "Quote Status",
        description: "Project is in quoting stage. Consider sending a quote to the client.",
        action: "Create Quote"
      });
    }

    // 9. Build response object matching frontend expectations
    const dashboardData = {
      // Project basics
      projectId: project._id,
      projectNumber: project.projectNumber,
      projectName: project.name,
      projectAddress: project.address,
      
      // Progress
      progress: {
        currentStage: project.dashboard?.progressStage || "design",
        percentage: project.dashboard?.progressPercentage || 0,
        lastUpdate: project.dashboard?.lastProgressUpdate || project.createdAt
      },
      
      // Files
      files: latestUploads,
      fileCategories: fileCategories,
      totalFiles: totalFiles,
      
      // Tasks
      tasks: pendingTasks,
      totalTasks: totalTasks,
      pendingTasksCount: pendingTasksCount,
      
      // Insights
      insights: insights,
      
      // Takeoffs
      takeoffs: {
        roofFaces: roofFaces,
        wallFaces: wallFaces,
        totalFaces: roofFaces + wallFaces
      },
      
      // Quotes
      quotes: {
        draftCount: draftQuoteCount,
        latestAmount: latestQuoteAmount
      },
      
      // Orders
      orders: {
        openCount: openOrderCount,
        statusText: openOrderCount > 0 ? `${openOrderCount} open order${openOrderCount > 1 ? 's' : ''}` : "No open orders"
      },
      
      // Supplier Info
      supplier: project.dashboard?.supplierInfo || {
        selectedSupplier: null,
        material: null,
        pricePerSqm: null
      },
      
      // Wind Region
      windRegion: project.dashboard?.windRegion || {
        detectedRegion: null,
        verified: false
      },
      
      // Selected Color
      selectedColor: project.dashboard?.selectedColor || null,
      
      // Recent Activity
      recentActivity: recentActivity,
      
      // Stats
      stats: project.dashboard?.stats || {}
    };

    return res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message
    });
  }
});

/**
 * PATCH /api/projects/:projectId/dashboard/progress
 * 
 * Update project progress stage and percentage
 */
router.patch("/projects/:projectId/dashboard/progress", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { progressStage, progressPercentage } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();

    const updateFields = { "dashboard.lastProgressUpdate": new Date() };
    
    if (progressStage) {
      updateFields["dashboard.progressStage"] = progressStage;
    }
    
    if (progressPercentage !== undefined) {
      updateFields["dashboard.progressPercentage"] = Math.min(100, Math.max(0, progressPercentage));
    }

    const result = await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found or no changes made" });
    }

    // Log activity
    const db = require("../db").db;
    const activityCol = db.collection("project_activity");
    await activityCol.insertOne({
      projectId: new ObjectId(projectId),
      action: "progress_updated",
      actionType: "update",
      entityType: "project",
      entityId: new ObjectId(projectId),
      actorId: req.user?._id ? new ObjectId(req.user._id) : null,
      actorName: req.user?.name || "System",
      description: `Progress updated to ${progressStage || "current stage"} at ${progressPercentage || 0}%`,
      timestamp: new Date(),
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: "Progress updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating progress:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update progress",
      error: error.message
    });
  }
});

/**
 * PATCH /api/projects/:projectId/dashboard/supplier
 * 
 * Update supplier information
 */
router.patch("/projects/:projectId/dashboard/supplier", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { selectedSupplier, materialType, pricePerSqm } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();

    const supplierInfo = {};
    if (selectedSupplier !== undefined) supplierInfo["dashboard.supplierInfo.selectedSupplier"] = selectedSupplier;
    if (materialType !== undefined) supplierInfo["dashboard.supplierInfo.materialType"] = materialType;
    if (pricePerSqm !== undefined) supplierInfo["dashboard.supplierInfo.pricePerSqm"] = pricePerSqm;
    supplierInfo["dashboard.supplierInfo.lastPriceUpdate"] = new Date();

    const result = await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: supplierInfo }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.json({
      success: true,
      message: "Supplier information updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating supplier info:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update supplier information",
      error: error.message
    });
  }
});

/**
 * PATCH /api/projects/:projectId/dashboard/wind-region
 * 
 * Update wind region information
 */
router.patch("/projects/:projectId/dashboard/wind-region", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { detectedRegion, verified, manualOverride, notes } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();

    const windRegionInfo = {};
    if (detectedRegion !== undefined) windRegionInfo["dashboard.windRegion.detectedRegion"] = detectedRegion;
    if (verified !== undefined) {
      windRegionInfo["dashboard.windRegion.verified"] = verified;
      if (verified) {
        windRegionInfo["dashboard.windRegion.verifiedBy"] = req.user?._id ? new ObjectId(req.user._id) : null;
        windRegionInfo["dashboard.windRegion.verifiedAt"] = new Date();
      }
    }
    if (manualOverride !== undefined) windRegionInfo["dashboard.windRegion.manualOverride"] = manualOverride;
    if (notes !== undefined) windRegionInfo["dashboard.windRegion.notes"] = notes;

    const result = await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: windRegionInfo }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.json({
      success: true,
      message: "Wind region information updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating wind region:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update wind region",
      error: error.message
    });
  }
});

/**
 * PATCH /api/projects/:projectId/dashboard/color
 * 
 * Update selected roofing color
 */
router.patch("/projects/:projectId/dashboard/color", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { selectedColor, colorCode } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();

    const colorInfo = {
      "dashboard.selectedColor": selectedColor || null,
      "dashboard.colorCode": colorCode || null
    };

    const result = await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: colorInfo }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.json({
      success: true,
      message: "Color selection updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating color:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update color",
      error: error.message
    });
  }
});

/**
 * =================================================================
 *                     PROJECT TASKS ROUTES
 * =================================================================
 */

/**
 * GET /api/projects/:projectId/tasks
 * 
 * Get all tasks for a project with optional filtering
 * Query params: status, priority, assignedTo, limit, offset
 */
router.get("/projects/:projectId/tasks", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignedTo, limit = 50, offset = 0 } = req.query;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const db = require("../db").db;
    const tasksCol = db.collection("project_tasks");

    // Build query
    const query = { projectId: new ObjectId(projectId) };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo && ObjectId.isValid(assignedTo)) {
      query.assignedTo = new ObjectId(assignedTo);
    }

    // Get tasks with pagination
    const tasks = await tasksCol.find(query)
      .sort({ priority: 1, dueDate: 1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    // Get total count for pagination
    const totalCount = await tasksCol.countDocuments(query);

    return res.json({
      success: true,
      data: tasks,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });

  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tasks",
      error: error.message
    });
  }
});

/**
 * POST /api/projects/:projectId/tasks
 * 
 * Create a new task for a project
 */
router.post("/projects/:projectId/tasks", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      priority = "medium",
      type = "action",
      assignedTo = [],
      dueDate,
      category,
      tags = []
    } = req.body;

    if (!ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }

    const db = require("../db").db;
    const tasksCol = db.collection("project_tasks");
    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();

    // Get project number for denormalization
    const project = await projectsCol.findOne({ _id: new ObjectId(projectId) });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Convert assignedTo to ObjectIds
    const assignedToIds = assignedTo
      .filter(id => ObjectId.isValid(id))
      .map(id => new ObjectId(id));

    // Get assigned user names (optional - for denormalization)
    const { userCollection } = require("../db");
    const usersCol = await userCollection();
    const assignedUsers = await usersCol.find(
      { _id: { $in: assignedToIds } },
      { projection: { name: 1 } }
    ).toArray();
    const assignedToNames = assignedUsers.map(u => u.name);

    // Create task
    const task = {
      projectId: new ObjectId(projectId),
      projectNumber: project.projectNumber,
      title,
      description: description || "",
      priority,
      type,
      assignedTo: assignedToIds,
      assignedToNames,
      createdBy: req.user?._id ? new ObjectId(req.user._id) : null,
      createdByName: req.user?.name || "Unknown",
      status: "pending",
      progress: 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category || null,
      tags,
      linkedFileIds: [],
      linkedTaskIds: [],
      checklist: [],
      comments: [],
      reminders: [],
      recurring: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date()
    };

    const result = await tasksCol.insertOne(task);

    // Update project stats
    await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      {
        $inc: {
          "dashboard.stats.totalTasks": 1,
          "dashboard.stats.pendingTasks": 1
        },
        $set: { "dashboard.stats.lastActivity": new Date() }
      }
    );

    // Log activity
    const activityCol = db.collection("project_activity");
    await activityCol.insertOne({
      projectId: new ObjectId(projectId),
      projectNumber: project.projectNumber,
      action: "task_created",
      actionType: "create",
      entityType: "task",
      entityId: result.insertedId,
      entityName: title,
      actorId: req.user?._id ? new ObjectId(req.user._id) : null,
      actorName: req.user?.name || "System",
      actorRole: req.user?.role || "User",
      actorType: "user",
      description: `Created task: ${title}`,
      details: { priority, dueDate, assignedTo: assignedToNames },
      timestamp: new Date(),
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: "Task created successfully",
      data: { ...task, _id: result.insertedId }
    });

  } catch (error) {
    console.error("❌ Error creating task:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: error.message
    });
  }
});

/**
 * PATCH /api/projects/:projectId/tasks/:taskId
 * 
 * Update a task (status, progress, completion, etc.)
 */
router.patch("/projects/:projectId/tasks/:taskId", authenticateToken(), async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const updates = req.body;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid project or task ID" });
    }

    const db = require("../db").db;
    const tasksCol = db.collection("project_tasks");

    // Get existing task
    const existingTask = await tasksCol.findOne({ _id: new ObjectId(taskId), projectId: new ObjectId(projectId) });
    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Build update object
    const updateFields = {
      updatedAt: new Date(),
      lastActivityAt: new Date()
    };

    // Track changes for activity log
    const changes = [];

    if (updates.title !== undefined) {
      updateFields.title = updates.title;
      if (updates.title !== existingTask.title) {
        changes.push({ field: "title", oldValue: existingTask.title, newValue: updates.title });
      }
    }
    if (updates.description !== undefined) updateFields.description = updates.description;
    if (updates.priority !== undefined) {
      updateFields.priority = updates.priority;
      if (updates.priority !== existingTask.priority) {
        changes.push({ field: "priority", oldValue: existingTask.priority, newValue: updates.priority });
      }
    }
    if (updates.status !== undefined) {
      updateFields.status = updates.status;
      if (updates.status !== existingTask.status) {
        changes.push({ field: "status", oldValue: existingTask.status, newValue: updates.status });
      }
      
      // If completing task
      if (updates.status === "completed" && existingTask.status !== "completed") {
        updateFields.completedAt = new Date();
        updateFields.completedBy = req.user?._id ? new ObjectId(req.user._id) : null;
        updateFields.progress = 100;
      }
    }
    if (updates.progress !== undefined) {
      updateFields.progress = Math.min(100, Math.max(0, updates.progress));
    }
    if (updates.dueDate !== undefined) {
      updateFields.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    }

    const result = await tasksCol.updateOne(
      { _id: new ObjectId(taskId), projectId: new ObjectId(projectId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Task not found or no changes made" });
    }

    // Update project stats if status changed
    if (updates.status && updates.status !== existingTask.status) {
      const { projectsCollection } = require("../db");
      const projectsCol = await projectsCollection();
      
      const statsUpdate = { "dashboard.stats.lastActivity": new Date() };
      
      // Adjust pending count
      if (updates.status === "completed" && existingTask.status !== "completed") {
        statsUpdate["dashboard.stats.pendingTasks"] = -1;
      } else if (updates.status !== "completed" && existingTask.status === "completed") {
        statsUpdate["dashboard.stats.pendingTasks"] = 1;
      }
      
      if (statsUpdate["dashboard.stats.pendingTasks"] !== undefined) {
        await projectsCol.updateOne(
          { _id: new ObjectId(projectId) },
          { 
            $inc: { "dashboard.stats.pendingTasks": statsUpdate["dashboard.stats.pendingTasks"] },
            $set: { "dashboard.stats.lastActivity": statsUpdate["dashboard.stats.lastActivity"] }
          }
        );
      }
    }

    // Log activity if there were changes
    if (changes.length > 0) {
      const activityCol = db.collection("project_activity");
      await activityCol.insertOne({
        projectId: new ObjectId(projectId),
        projectNumber: existingTask.projectNumber,
        action: updates.status === "completed" ? "task_completed" : "task_updated",
        actionType: "update",
        entityType: "task",
        entityId: new ObjectId(taskId),
        entityName: updateFields.title || existingTask.title,
        actorId: req.user?._id ? new ObjectId(req.user._id) : null,
        actorName: req.user?.name || "System",
        description: updates.status === "completed" 
          ? `Completed task: ${existingTask.title}`
          : `Updated task: ${existingTask.title}`,
        changes,
        important: updates.status === "completed",
        timestamp: new Date(),
        createdAt: new Date()
      });
    }

    return res.json({
      success: true,
      message: "Task updated successfully"
    });

  } catch (error) {
    console.error("❌ Error updating task:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update task",
      error: error.message
    });
  }
});

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * 
 * Delete a task
 */
router.delete("/projects/:projectId/tasks/:taskId", authenticateToken(), async (req, res) => {
  try {
    const { projectId, taskId } = req.params;

    if (!ObjectId.isValid(projectId) || !ObjectId.isValid(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid project or task ID" });
    }

    const db = require("../db").db;
    const tasksCol = db.collection("project_tasks");

    // Get task before deleting
    const task = await tasksCol.findOne({ _id: new ObjectId(taskId), projectId: new ObjectId(projectId) });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Delete task
    await tasksCol.deleteOne({ _id: new ObjectId(taskId) });

    // Update project stats
    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();
    
    const statsUpdate = {
      "dashboard.stats.totalTasks": -1,
      "dashboard.stats.lastActivity": new Date()
    };
    
    if (task.status !== "completed") {
      statsUpdate["dashboard.stats.pendingTasks"] = -1;
    }
    
    await projectsCol.updateOne(
      { _id: new ObjectId(projectId) },
      { $inc: statsUpdate }
    );

    // Log activity
    const activityCol = db.collection("project_activity");
    await activityCol.insertOne({
      projectId: new ObjectId(projectId),
      projectNumber: task.projectNumber,
      action: "task_deleted",
      actionType: "delete",
      entityType: "task",
      entityId: new ObjectId(taskId),
      entityName: task.title,
      actorId: req.user?._id ? new ObjectId(req.user._id) : null,
      actorName: req.user?.name || "System",
      description: `Deleted task: ${task.title}`,
      timestamp: new Date(),
      createdAt: new Date()
    });

    return res.json({
      success: true,
      message: "Task deleted successfully"
    });

  } catch (error) {
    console.error("❌ Error deleting task:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete task",
      error: error.message
    });
  }
});

/**
 * =================================================================
 *                   PROJECT ACTIVITY ROUTES
 * =================================================================
 */

/**
 * GET /api/projects/:projectId/activity
 * 
 * Get activity feed for a project with pagination
 * Query params: limit, offset, actionType, important
 */
router.get("/projects/:projectId/activity", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 20, offset = 0, actionType, important } = req.query;

    // Resolve project from ID or alias
    const { project, resolvedProjectId } = await resolveProject(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const db = require("../db").db;
    const activityCol = db.collection("project_activity");

    // Build query
    const query = { projectId: resolvedProjectId };
    if (actionType) query.actionType = actionType;
    if (important === "true") query.important = true;

    // Get activity with pagination
    const activities = await activityCol.find(query)
      .sort({ timestamp: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    // Get total count for pagination
    const totalCount = await activityCol.countDocuments(query);

    return res.json({
      success: true,
      data: activities,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount
      }
    });

  } catch (error) {
    console.error("❌ Error fetching activity:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activity",
      error: error.message
    });
  }
});

/**
 * POST /api/projects/:projectId/activity
 * 
 * Manually log an activity (for custom actions)
 */
router.post("/projects/:projectId/activity", authenticateToken(), async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      action,
      actionType = "update",
      entityType,
      entityId,
      entityName,
      description,
      details = {},
      important = false
    } = req.body;

    if (!action || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Action and description are required" 
      });
    }

    // Resolve project from ID or alias
    const { project, resolvedProjectId } = await resolveProject(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const db = require("../db").db;
    const activityCol = db.collection("project_activity");
    const { projectsCollection } = require("../db");
    const projectsCol = await projectsCollection();
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // Create activity log
    const activity = {
      projectId: resolvedProjectId,
      projectNumber: project.projectNumber,
      action,
      actionType,
      entityType: entityType || null,
      entityId: entityId && ObjectId.isValid(entityId) ? new ObjectId(entityId) : null,
      entityName: entityName || null,
      actorId: req.user?._id ? new ObjectId(req.user._id) : null,
      actorName: req.user?.name || "System",
      actorRole: req.user?.role || "User",
      actorType: "user",
      description,
      details,
      source: "web_app",
      important,
      timestamp: new Date(),
      createdAt: new Date()
    };

    await activityCol.insertOne(activity);

    // Update project last activity
    await projectsCol.updateOne(
      { _id: resolvedProjectId },
      { $set: { "dashboard.stats.lastActivity": new Date() } }
    );

    return res.json({
      success: true,
      message: "Activity logged successfully"
    });

  } catch (error) {
    console.error("❌ Error logging activity:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to log activity",
      error: error.message
    });
  }
});

module.exports = router;
