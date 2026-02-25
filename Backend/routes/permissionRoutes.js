// routes/permissionRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

// In-memory storage for permissions (in production, use database)
let permissionMatrix = {};

// GET /permissions/matrix - Get current permission matrix
router.get("/matrix", authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    // If no permissions exist, return default permissions
    if (Object.keys(permissionMatrix).length === 0) {
      permissionMatrix = getDefaultPermissions();
    }

    res.json({
      success: true,
      permissions: permissionMatrix
    });
  } catch (error) {
    console.error("Error fetching permission matrix:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
      error: error.message
    });
  }
});

// POST /permissions/matrix - Update permission matrix
router.post("/matrix", authenticateToken(), authenticateAdmin(), async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Invalid permissions data"
      });
    }

    // Update the permission matrix
    permissionMatrix = permissions;

    // TODO: In production, save to database
    console.log("📝 Permission matrix updated:", Object.keys(permissions).length, "permissions");

    res.json({
      success: true,
      message: "Permission matrix updated successfully",
      permissions: permissionMatrix
    });
  } catch (error) {
    console.error("Error updating permission matrix:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update permissions",
      error: error.message
    });
  }
});

// GET /permissions/users/:userId - Get permissions for specific user
router.get("/user/:userId", authenticateToken(), async (req, res) => {
  try {
    const { userId } = req.params;

    // TODO: Get user role from database
    // For now, we'll use the requesting user's role
    const userRole = req.user?.role || "User";

    if (Object.keys(permissionMatrix).length === 0) {
      permissionMatrix = getDefaultPermissions();
    }

    // Extract permissions for this user's role
    const userPermissions = {};
    Object.keys(permissionMatrix).forEach(permission => {
      userPermissions[permission] = permissionMatrix[permission][userRole] || false;
    });

    res.json({
      success: true,
      role: userRole,
      permissions: userPermissions
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user permissions",
      error: error.message
    });
  }
});

// Helper function to generate default permissions
function getDefaultPermissions() {
  const permissions = {};
  
  // Define all permissions
  const allPermissions = [
    // Projects
    'projects.view',
    'projects.create', 
    'projects.edit',
    'projects.delete',
    'projects.assign',
    'projects.manage_status',
    
    // Users
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.block',
    'users.promote',
    
    // Clients
    'clients.view',
    'clients.create',
    'clients.edit',
    'clients.delete',
    'clients.link_users',
    
    // Files
    'files.view',
    'files.upload',
    'files.download',
    'files.delete',
    'files.create_folders',
    'files.manage_structure',
    
    // System
    'system.settings',
    'system.logs',
    'system.backup',
    'system.user_sessions'
  ];

  // Initialize all permissions for all roles
  allPermissions.forEach(permission => {
    permissions[permission] = {
      Admin: true,
      User: false,
      Estimator: false,
      Client: false,
    };
  });

  // Set basic permissions for User role
  const userPermissions = [
    'projects.view',
    'files.view',
    'files.upload',
    'files.download'
  ];
  userPermissions.forEach(permission => {
    permissions[permission].User = true;
  });

  // Set permissions for Estimator role (includes User permissions plus more)
  const estimatorPermissions = [
    ...userPermissions,
    'projects.create',
    'projects.edit',
    'projects.manage_status',
    'clients.view',
    'files.create_folders'
  ];
  estimatorPermissions.forEach(permission => {
    permissions[permission].Estimator = true;
  });

  // Set limited permissions for Client role
  const clientPermissions = [
    'projects.view',
    'files.view',
    'files.download'
  ];
  clientPermissions.forEach(permission => {
    permissions[permission].Client = true;
  });

  return permissions;
}

module.exports = router;
