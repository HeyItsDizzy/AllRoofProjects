// routes/clientRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User     = require('../config/User');
const Client = require('../config/Client');  // ← your schema file
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();
const { ObjectId } = require("mongodb");

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/root/ART/ProjectManagerApp/Backend/uploads/avatars/client';
    console.log(`🔍 [LOGO] Attempting to create directory: ${uploadDir}`);
    if (!fs.existsSync(uploadDir)) {
      console.log(`📁 [LOGO] Directory doesn't exist, creating: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ [LOGO] Directory created successfully: ${uploadDir}`);
    } else {
      console.log(`✅ [LOGO] Directory already exists: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const filename = `${req.params.id}_logo.png`;
    console.log(`📝 [LOGO] Generated filename: ${filename}`);
    cb(null, filename);
  }
});

// Configure multer for header image uploads
const headerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/root/ART/ProjectManagerApp/Backend/uploads/client/headers';
    console.log(`🔍 [HEADER] Attempting to create directory: ${uploadDir}`);
    if (!fs.existsSync(uploadDir)) {
      console.log(`📁 [HEADER] Directory doesn't exist, creating: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ [HEADER] Directory created successfully: ${uploadDir}`);
    } else {
      console.log(`✅ [HEADER] Directory already exists: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const filename = `${req.params.id}_header.png`;
    console.log(`📝 [HEADER] Generated filename: ${filename}`);
    cb(null, filename);
  }
});

// Configure multer for footer image uploads
const footerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = '/root/ART/ProjectManagerApp/Backend/uploads/client/footers';
    console.log(`🔍 [FOOTER] Attempting to create directory: ${uploadDir}`);
    if (!fs.existsSync(uploadDir)) {
      console.log(`📁 [FOOTER] Directory doesn't exist, creating: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ [FOOTER] Directory created successfully: ${uploadDir}`);
    } else {
      console.log(`✅ [FOOTER] Directory already exists: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const filename = `${req.params.id}_footer.png`;
    console.log(`📝 [FOOTER] Generated filename: ${filename}`);
    cb(null, filename);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const headerUpload = multer({
  storage: headerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const footerUpload = multer({
  storage: footerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});


// GET /api/clients
router.get('/', authenticateToken(), async (req, res, next) => {
  try {
    const list = await Client.find().sort('name');
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/clients
router.post('/', authenticateToken(), async (req, res, next) => {
  try {
    const newClient = new Client(req.body);
    await newClient.save();
    
    res.status(201).json(newClient);
  } catch (err) {
    console.error("❌ [POST /clients] Error creating client:", err);
    next(err);
  }
});

// PATCH /api/clients/:clientId — update company details
router.patch('/:clientId', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID.' });
    }

    const updated = await Client.findByIdAndUpdate(clientId, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    res.json({ success: true, client: updated });
  } catch (err) {
    console.error("❌ [PATCH /clients/:clientId] Error updating client:", err);
    console.error("❌ [PATCH /clients/:clientId] Error details:", {
      name: err.name,
      message: err.message,
      errors: err.errors
    });
    next(err);
  }
});

// GET /api/clients/:clientId — fetch one client by ID
router.get('/:clientId',
  authenticateToken(),
  async (req, res, next) => {
    try {
      const { clientId } = req.params;
      if (!mongoose.isValidObjectId(clientId)) {
        return res
          .status(400)
          .json({ success: false, message: 'Invalid client ID.' });
      }
      const client = await Client.findById(clientId);
      if (!client) {
        return res
          .status(404)
          .json({ success: false, message: 'Client not found.' });
      }
      res.json({ success: true, client });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /api/clients/assignUser/:clientId ────────────────────────
router.patch(  '/assignUser/:clientId',
  authenticateToken(),
  async (req, res) => {
   // 1) Log the incoming body
   console.log('🔍 [assignUser] req.body:', req.body);
   console.log('🔍 [assignUser] clientId param:', req.params.clientId);
    const { userId, multiAssign = false } = req.body;
    const { clientId } = req.params;

    if (
      !mongoose.isValidObjectId(clientId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Client or User ID.' });
    }

    try {
      const client = await Client.findById(clientId);
      console.log('🔍 [assignUser] found client:', !!client);
      const user   = await User.findById(userId);
      console.log('🔍 [assignUser] found user:', !!user, user);
      if (!client || !user) {
        return res
          .status(404)
          .json({ success: false, message: 'Client or User not found.' });
      }

      // update client.linkedUsers
      if (multiAssign) {
        client.linkedUsers.addToSet(userId);
      } else {
        client.linkedUsers = [userId];
      }
      await client.save();

      // update user: set company name and linkedClients
      user.company = client.name;  // Set the company field to client name for human readability
      if (user.linkedClients) {
        user.linkedClients.addToSet(clientId);
      } else {
        user.linkedClients = [clientId];
      }
      await user.save();

      res.json({
        success: true,
        message: `User ${user.name} assigned to client ${client.name}.`,
      });
    } catch (err) {
      console.error('Error assigning user to client:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// ─── PATCH /api/clients/unassignUser/:clientId ──────────────────────
router.patch(  '/unassignUser/:clientId',
  authenticateToken(),
  async (req, res) => {
    console.log("🔍 [unassignUser] req.body:", req.body);
    const { userId } = req.body;
    const { clientId } = req.params;

    if (
      !mongoose.isValidObjectId(clientId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Client or User ID.' });
    }

    try {
      // pull from client.linkedUsers
      await Client.findByIdAndUpdate(clientId, {
        $pull: { linkedUsers: userId },
      });

      // pull from user.linkedClients and clear company field
      await User.findByIdAndUpdate(userId, {
        $pull: { linkedClients: clientId },
        $unset: { company: "" }  // Clear the company field
      });

      res.json({ success: true, message: 'User unassigned from client.' });
    } catch (err) {
      console.error('Error unassigning user from client:', err);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
);

// ── Generate User Linking Code ─────────────────────────────────────────────
router.patch( "/linkCompanyUser/:id",
  authenticateToken(),
  async (req, res) => {
    try {
      const clientId = req.params.id;
      // 10-character uppercase alphanumeric
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const code = Array.from({ length: 10 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { userLinkingCode: code },
        { new: true }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found." });
      }
      res.json({ success: true, code });
    } catch (err) {
      console.error("Error generating user linking code:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Generate Admin Linking Code ────────────────────────────────────────────
router.patch( "/linkCompanyAdmin/:id",
  authenticateToken(),
  authenticateAdmin(),
  async (req, res) => {
    try {
      const clientId = req.params.id;
      // 10-character uppercase alphanumeric
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const code = Array.from({ length: 10 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { adminLinkingCode: code },
        { new: true }
      );
      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Client not found." });
      }
      res.json({ success: true, code });
    } catch (err) {
      console.error("Error generating admin linking code:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT SETTINGS - Image uploads and branding preferences
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/clients/:id/logo - Upload company logo
router.post('/:id/logo', 
  authenticateToken(),
  logoUpload.single('logo'),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      
      if (!req.file) {
        console.log(`❌ [LOGO] No file received for client ${clientId}`);
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      console.log(`📥 [LOGO] File received for client ${clientId}:`);
      console.log(`   - Original filename: ${req.file.originalname}`);
      console.log(`   - Saved filename: ${req.file.filename}`);
      console.log(`   - Full file path: ${req.file.path}`);
      console.log(`   - File size: ${req.file.size} bytes`);
      console.log(`   - MIME type: ${req.file.mimetype}`);

      // Construct the URL for the uploaded logo
      const logoUrl = `/uploads/avatars/client/${req.file.filename}`;
      console.log(`🔗 [LOGO] Generated URL: ${logoUrl}`);

      // Update the client with the new logo URL
      const updated = await Client.findByIdAndUpdate(
        clientId,
        { logoUrl: logoUrl },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      console.log(`✅ [LOGO] File saved successfully for client ${clientId}`);
      console.log(`💾 [LOGO] Database updated with logoUrl: ${logoUrl}`);

      res.json({ 
        success: true, 
        logoUrl: logoUrl,
        message: 'Company logo uploaded successfully' 
      });

    } catch (err) {
      console.error('❌ [LOGO] Error uploading company logo:', err);
      next(err);
    }
  }
);

// POST /api/clients/:id/header-image - Upload header image
router.post('/:id/header-image', 
  authenticateToken(),
  headerUpload.single('headerImage'),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      
      if (!req.file) {
        console.log(`❌ [HEADER] No file received for client ${clientId}`);
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      console.log(`📥 [HEADER] File received for client ${clientId}:`);
      console.log(`   - Original filename: ${req.file.originalname}`);
      console.log(`   - Saved filename: ${req.file.filename}`);
      console.log(`   - Full file path: ${req.file.path}`);
      console.log(`   - File size: ${req.file.size} bytes`);
      console.log(`   - MIME type: ${req.file.mimetype}`);

      const headerImageUrl = `/uploads/client/headers/${req.file.filename}`;
      console.log(`🔗 [HEADER] Generated URL: ${headerImageUrl}`);

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { headerImageUrl: headerImageUrl },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      console.log(`✅ [HEADER] File saved successfully for client ${clientId}`);
      console.log(`💾 [HEADER] Database updated with headerImageUrl: ${headerImageUrl}`);

      res.json({ 
        success: true, 
        headerImageUrl: headerImageUrl,
        message: 'Header image uploaded successfully' 
      });

    } catch (err) {
      console.error('❌ [HEADER] Error uploading header image:', err);
      next(err);
    }
  }
);

// POST /api/clients/:id/footer-image - Upload footer image
router.post('/:id/footer-image', 
  authenticateToken(),
  footerUpload.single('footerImage'),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      
      if (!req.file) {
        console.log(`❌ [FOOTER] No file received for client ${clientId}`);
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      console.log(`📥 [FOOTER] File received for client ${clientId}:`);
      console.log(`   - Original filename: ${req.file.originalname}`);
      console.log(`   - Saved filename: ${req.file.filename}`);
      console.log(`   - Full file path: ${req.file.path}`);
      console.log(`   - File size: ${req.file.size} bytes`);
      console.log(`   - MIME type: ${req.file.mimetype}`);

      const footerImageUrl = `/uploads/client/footers/${req.file.filename}`;
      console.log(`🔗 [FOOTER] Generated URL: ${footerImageUrl}`);

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { footerImageUrl: footerImageUrl },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      console.log(`✅ [FOOTER] File saved successfully for client ${clientId}`);
      console.log(`💾 [FOOTER] Database updated with footerImageUrl: ${footerImageUrl}`);

      res.json({ 
        success: true, 
        footerImageUrl: footerImageUrl,
        message: 'Footer image uploaded successfully' 
      });

    } catch (err) {
      console.error('❌ [FOOTER] Error uploading footer image:', err);
      next(err);
    }
  }
);

// PATCH /api/clients/:id/header-ratio - Update header ratio preference
router.patch('/:id/header-ratio', 
  authenticateToken(),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      const { headerRatio } = req.body;

      if (!['2:1', '3:1'].includes(headerRatio)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid header ratio. Must be "2:1" or "3:1"' 
        });
      }

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { headerRatio: headerRatio },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      res.json({ 
        success: true, 
        headerRatio: headerRatio,
        message: 'Header ratio updated successfully' 
      });

    } catch (err) {
      console.error('Error updating header ratio:', err);
      next(err);
    }
  }
);

// PATCH /api/clients/:id/header-fit - Update header fit preference
router.patch('/:id/header-fit', 
  authenticateToken(),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      const { headerFit } = req.body;

      if (typeof headerFit !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid header fit. Must be a boolean value' 
        });
      }

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { headerFit: headerFit },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      res.json({ 
        success: true, 
        headerFit: headerFit,
        message: 'Header fit updated successfully' 
      });

    } catch (err) {
      console.error('Error updating header fit:', err);
      next(err);
    }
  }
);

// PATCH /api/clients/:id/footer-placement - Update footer placement preference
router.patch('/:id/footer-placement', 
  authenticateToken(),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      const { footerPlacement } = req.body;

      if (!['full', 'left', 'center', 'right'].includes(footerPlacement)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid footer placement. Must be "full", "left", "center", or "right"' 
        });
      }

      const updated = await Client.findByIdAndUpdate(
        clientId,
        { footerPlacement: footerPlacement },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Client not found' });
      }

      res.json({ 
        success: true, 
        footerPlacement: footerPlacement,
        message: 'Footer placement updated successfully' 
      });

    } catch (err) {
      console.error('Error updating footer placement:', err);
      next(err);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY USER MANAGEMENT (Admin only)
// ══════════════════════════════════════════════════════════════════════════════

// Get company users by client ID - for company admins only
router.get('/:clientId/users', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;
    
    // Validate client ID
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID.' });
    }

    // Get current user to check admin status and company
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if user is a company admin
    if (!currentUser.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if current user is admin of this company
    if (currentUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only manage users from your own company." 
      });
    }

    // Get all users from this company
    const companyUsers = await User.find({
      company: client.name,
      isDeleted: { $ne: true },
      isBlock: { $ne: true }
    }).select('firstName lastName email phone avatar companyAdmin company createdAt lastLogin');

    // Separate admins and regular users
    const admins = companyUsers.filter(user => user.companyAdmin);
    const users = companyUsers.filter(user => !user.companyAdmin);

    res.json({
      success: true,
      data: {
        client: client,
        companyUsers,
        admins,
        users,
        totalCount: companyUsers.length,
        adminCount: admins.length,
        userCount: users.length
      }
    });

  } catch (err) {
    console.error("❌ Error fetching company users:", err);
    next(err);
  }
});

// Promote user to company admin
router.patch('/:clientId/users/:userId/promote', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId, userId: targetUserId } = req.params;
    const userId = req.user?.userId;
    
    // Validate IDs
    if (!mongoose.isValidObjectId(clientId) || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid client or user ID.' });
    }

    // Get current user to check admin status and company
    const currentUser = await User.findById(userId);
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if current user is admin of this company
    if (currentUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only manage users from your own company." 
      });
    }

    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    // Check if target user is in the same company
    if (targetUser.company !== currentUser.company) {
      return res.status(403).json({ 
        success: false, 
        message: "Can only manage users within your company." 
      });
    }

    // Check if user is already an admin
    if (targetUser.companyAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: "User is already a company admin." 
      });
    }

    // Promote user to admin
    targetUser.companyAdmin = true;
    targetUser.forceRefreshAfter = new Date(); // Force target user to refresh on next API call
    const savedUser = await targetUser.save();

    // Use the saved user data for the message to ensure we have the latest fields
    const userObj = savedUser.toObject(); // Convert to plain object
    const userName = userObj.firstName || userObj.name || 'User';
    const userLastName = userObj.lastName || '';
    const fullName = `${userName} ${userLastName}`.trim();

    res.json({
      success: true,
      message: `${fullName} promoted to company admin.`,
      data: savedUser,
      requiresRefresh: true, // Signal frontend that target user needs to refresh
      targetUserId: targetUserId
    });

  } catch (err) {
    console.error("❌ Error promoting user:", err);
    next(err);
  }
});

// Demote admin to regular user
router.patch('/:clientId/users/:userId/demote', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId, userId: targetUserId } = req.params;
    const userId = req.user?.userId;
    
    // Validate IDs
    if (!mongoose.isValidObjectId(clientId) || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid client or user ID.' });
    }

    // Get current user to check admin status and company
    const currentUser = await User.findById(userId);
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if current user is admin of this company
    if (currentUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only manage users from your own company." 
      });
    }

    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    // Check if target user is in the same company
    if (targetUser.company !== currentUser.company) {
      return res.status(403).json({ 
        success: false, 
        message: "Can only manage users within your company." 
      });
    }

    // Check if user is an admin
    if (!targetUser.companyAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: "User is not a company admin." 
      });
    }

    // Check if this is the last admin
    const adminCount = await User.countDocuments({
      company: currentUser.company,
      companyAdmin: true,
      isDeleted: { $ne: true },
      isBlock: { $ne: true }
    });

    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot demote the last company admin. Promote another user to admin first."
      });
    }

    // Demote admin to user
    targetUser.companyAdmin = false;
    targetUser.forceRefreshAfter = new Date(); // Force target user to refresh on next API call
    const savedUser = await targetUser.save();

    // Use the saved user data for the message to ensure we have the latest fields
    const userName = savedUser.firstName || savedUser.name || 'User';
    const userLastName = savedUser.lastName || '';
    const fullName = `${userName} ${userLastName}`.trim();

    res.json({
      success: true,
      message: `${fullName} demoted to regular user.`,
      data: savedUser,
      requiresRefresh: true, // Signal frontend that target user needs to refresh
      targetUserId: targetUserId
    });

  } catch (err) {
    console.error("❌ Error demoting admin:", err);
    next(err);
  }
});

// Remove user from company
router.delete('/:clientId/users/:userId', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId, userId: targetUserId } = req.params;
    const userId = req.user?.userId;
    
    // Validate IDs
    if (!mongoose.isValidObjectId(clientId) || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid client or user ID.' });
    }

    // Get current user to check admin status and company
    const currentUser = await User.findById(userId);
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if current user is admin of this company
    if (currentUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only manage users from your own company." 
      });
    }

    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    // Check if target user is in the same company
    if (targetUser.company !== currentUser.company) {
      return res.status(403).json({ 
        success: false, 
        message: "Can only manage users within your company." 
      });
    }

    // If removing an admin, check if this is the last admin
    if (targetUser.companyAdmin) {
      const adminCount = await User.countDocuments({
        company: currentUser.company,
        companyAdmin: true,
        isDeleted: { $ne: true },
        isBlock: { $ne: true }
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot remove the last company admin. Promote another user to admin first."
        });
      }
    }

    // Remove user from company (unlink them)
    targetUser.company = undefined;
    targetUser.companyAdmin = undefined;
    targetUser.linkedClients = [];
    const savedUser = await targetUser.save();

    // Also remove user from client's linkedUsers array
    await Client.findByIdAndUpdate(
      clientId,
      { $pull: { linkedUsers: targetUserId } }
    );

    // Use the saved user data for the message to ensure we have the latest fields
    const userName = savedUser.firstName || savedUser.name || 'User';
    const userLastName = savedUser.lastName || '';
    const fullName = `${userName} ${userLastName}`.trim();

    res.json({
      success: true,
      message: `${fullName} removed from company.`,
      data: targetUser
    });

  } catch (err) {
    console.error("❌ Error removing user:", err);
    next(err);
  }
});

// Get company/client details with user count
router.get('/:clientId/details', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;
    
    // Validate client ID
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID.' });
    }

    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if user has access to this company
    if (currentUser.company !== client.name && !currentUser.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only view details of your own company." 
      });
    }

    // Get user count for this company
    const userCount = await User.countDocuments({
      company: client.name,
      isDeleted: { $ne: true },
      isBlock: { $ne: true }
    });

    const adminCount = await User.countDocuments({
      company: client.name,
      companyAdmin: true,
      isDeleted: { $ne: true },
      isBlock: { $ne: true }
    });

    res.json({
      success: true,
      data: {
        ...client.toObject(),
        userCount,
        adminCount,
        regularUserCount: userCount - adminCount
      }
    });

  } catch (err) {
    console.error("❌ Error fetching client details:", err);
    next(err);
  }
});

// Get company linking codes - for company admins only
router.get('/:clientId/linking-codes', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;
    
    // Validate client ID
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID.' });
    }

    // Get current user to check admin status and company
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if user is a company admin
    if (!currentUser.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if current user is admin of this company
    if (currentUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only view linking codes for your own company." 
      });
    }

    res.json({
      success: true,
      data: {
        clientId: client._id,
        companyName: client.name,
        userLinkingCode: client.userLinkingCode,
        adminLinkingCode: client.adminLinkingCode
      }
    });

  } catch (err) {
    console.error("❌ Error fetching linking codes:", err);
    next(err);
  }
});

// Regenerate company linking codes - for company admins only
router.post('/:clientId/regenerate-codes', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { codeType } = req.body; // 'user' or 'admin' or 'both'
    const userId = req.user?.userId;
    
    // Validate client ID
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID.' });
    }

    // Validate code type
    if (!['user', 'admin', 'both'].includes(codeType)) {
      return res.status(400).json({ success: false, message: 'Invalid code type. Must be "user", "admin", or "both".' });
    }

    // Get current user to check admin status and company
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if user is a company admin
    if (!currentUser.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if current user is admin of this company
    if (currentUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. You can only regenerate codes for your own company." 
      });
    }

    // Generate new codes
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const updateFields = {};
    if (codeType === 'user' || codeType === 'both') {
      updateFields.userLinkingCode = generateCode();
    }
    if (codeType === 'admin' || codeType === 'both') {
      updateFields.adminLinkingCode = generateCode();
    }

    // Update client with new codes
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      success: true,
      message: `${codeType === 'both' ? 'Both codes' : codeType + ' code'} regenerated successfully.`,
      data: {
        clientId: updatedClient._id,
        companyName: updatedClient.name,
        userLinkingCode: updatedClient.userLinkingCode,
        adminLinkingCode: updatedClient.adminLinkingCode,
        regenerated: codeType
      }
    });

  } catch (err) {
    console.error("❌ Error regenerating linking codes:", err);
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════

module.exports = router;