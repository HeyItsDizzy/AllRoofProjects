  // routes/clientRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

// POST /api/clients/notify-payment - Send payment notification to accounts
router.post('/notify-payment', authenticateToken(), async (req, res, next) => {
  try {
    const { invoiceNumbers, clientId, userId } = req.body;
    const requestUserId = req.user?.userId;
    
    // Validate input
    if (!invoiceNumbers || !clientId || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: invoiceNumbers, clientId, or userId.' 
      });
    }

    // Verify requesting user matches
    if (requestUserId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only submit payment notifications for yourself.' 
      });
    }

    // Get user and client information
    const user = await User.findById(userId);
    const client = await Client.findById(clientId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Get EmailService (singleton instance)
    const emailService = require('../services/emailService');

    // Prepare user name
    const userName = user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.name || 'Unknown User';
    const userEmail = user.email || 'No email on file';
    const companyName = client.name || 'Unknown Company';

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #10b981;">💰 Payment Notification</h2>
            <p style="margin: 0; color: #666; font-size: 14px;">A client has reported making a payment</p>
          </div>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Client Information</h3>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500; width: 40%;">Company:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 600;">${companyName}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User Name:</td>
                <td style="padding: 8px 0; color: #111827;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User Email:</td>
                <td style="padding: 8px 0; color: #111827;">${userEmail}</td>
              </tr>
              <tr style="background-color: #f9fafb;">
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Client ID:</td>
                <td style="padding: 8px 0; color: #6b7280; font-family: monospace; font-size: 12px;">${clientId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">User ID:</td>
                <td style="padding: 8px 0; color: #6b7280; font-family: monospace; font-size: 12px;">${userId}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #92400e;">📋 Invoice Number(s) Reported as Paid</h3>
            <div style="background: white; padding: 15px; border-radius: 4px; border-left: 3px solid #fbbf24;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${invoiceNumbers}</p>
            </div>
          </div>

          <div style="background: #e0f2fe; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; color: #075985; font-size: 14px;">
              <strong>⚠️ Action Required:</strong> Please verify the payment in your accounting system and update the client's account status accordingly.
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              This is an automated notification from the All Roof Take-offs Project Manager
            </p>
            <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
              Sent at ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })} AEDT
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email
    await emailService.sendUniversalEmail(
      'accounts@allrooftakeoffs.com.au',
      {
        subject: `💰 Payment Notification - ${companyName} - Invoice(s): ${invoiceNumbers}`,
        html: emailHtml
      }
    );

    console.log(`✅ Payment notification sent for client: ${companyName}, invoices: ${invoiceNumbers}`);

    res.json({
      success: true,
      message: 'Payment notification sent to accounts team.',
      data: {
        companyName,
        userName,
        invoiceNumbers
      }
    });

  } catch (err) {
    console.error("❌ Error sending payment notification:", err);
    next(err);
  }
});

// POST /api/clients
router.post('/', authenticateToken(), async (req, res, next) => {
  try {
    const newClient = new Client(req.body);
    
    // Automatically enroll in loyalty tier system
    newClient.loyaltyTier = 'Casual';
    newClient.tierEffectiveDate = new Date();
    newClient.loyaltySystemEnrolledDate = new Date();
    newClient.tierProtectionType = 'none';
    newClient.tierProtectionQty = 0;
    newClient.tierProtectionPoints = 0;
    newClient.protectionPointsBalance = 0;
    newClient.currentMonthEstimateUnits = 0;
    newClient.totalUnitsBilledAllTime = 0;
    newClient.hasMetMinimumBillingRequirement = false;
    newClient.monthlyUsageHistory = [];
    newClient.protectionPointsHistory = [];
    newClient.cashbackCredits = 0;
    newClient.cashbackHistory = [];
    
    // Generate linking codes automatically
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    newClient.userLinkingCode = generateCode();
    newClient.adminLinkingCode = generateCode();
    
    await newClient.save();
    
    console.log(`✅ New client created and enrolled in loyalty system: ${newClient.name}`);
    console.log(`🔗 Generated linking codes - User: ${newClient.userLinkingCode}, Admin: ${newClient.adminLinkingCode}`);
    
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
    const { userId, multiAssign = false, isAdmin = false } = req.body;
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
      
      // Set companyAdmin if isAdmin is true
      if (isAdmin === true) {
        user.companyAdmin = true;
        console.log('🔍 [assignUser] Setting user as company admin');
      }
      
      await user.save();

      res.json({
        success: true,
        message: `User ${user.name} assigned to client ${client.name}${isAdmin ? ' as company administrator' : ''}.`,
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

    // Generate fresh token with updated permissions
    const { generateFreshToken } = require('../utils/tokenUtils');
    const freshToken = generateFreshToken(savedUser);

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
      targetUserId: targetUserId,
      freshToken: freshToken,  // New token with updated permissions
      updatedUser: userObj     // Fresh user data
    });

  } catch (err) {
    console.error("❌ Error promoting user:", err);
    next(err);
  }
});

// Request admin access - sends email to all company admins
router.post('/:clientId/users/:userId/request-admin-access', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId, userId: requestingUserId } = req.params;
    const userId = req.user?.userId;
    
    // Validate IDs
    if (!mongoose.isValidObjectId(clientId) || !mongoose.isValidObjectId(requestingUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid client or user ID.' });
    }

    // Verify requesting user is the authenticated user
    if (userId !== requestingUserId) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only request access for yourself." 
      });
    }

    // Get requesting user
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if already an admin
    if (requestingUser.companyAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: "You are already a company admin." 
      });
    }

    // Get the client/company
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if user belongs to this company
    if (requestingUser.company !== client.name) {
      return res.status(403).json({ 
        success: false, 
        message: "You don't belong to this company." 
      });
    }

    // Find all company admins from the same company
    const companyAdmins = await User.find({ 
      company: requestingUser.company, 
      companyAdmin: true 
    });

    if (companyAdmins.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No company admins found. Please contact support." 
      });
    }

    // Generate a secure one-time token for promotion
    const promotionToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store token in user document (you may want to create a separate collection for this)
    requestingUser.promotionToken = promotionToken;
    requestingUser.promotionTokenExpiry = tokenExpiry;
    await requestingUser.save();

    // Generate approval link
    // Detect dev mode (backend runs on port 5002 in dev, 5000 in production)
    const isDevMode = process.argv.includes('--dev') || process.env.HTTP_PORT_DEV;
    const backendUrl = isDevMode 
      ? 'http://localhost:5002'
      : (process.env.FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au');
    
    const approvalLink = `${backendUrl}/api/clients/${clientId}/users/${requestingUserId}/approve-promotion?token=${promotionToken}`;
    
    console.log(`🔗 [Admin Access Request] Generated approval link (${isDevMode ? 'DEV' : 'PROD'}): ${approvalLink}`);

    // Prepare email data
    const requestingUserName = requestingUser.firstName ? `${requestingUser.firstName} ${requestingUser.lastName || ''}`.trim() : requestingUser.name;
    const adminEmails = companyAdmins.map(admin => admin.email).filter(Boolean);

    res.json({
      success: true,
      message: "Admin access request sent to company administrators.",
      adminEmails: adminEmails,
      requestingUser: requestingUserName,
      approvalLink: approvalLink,
      companyName: client.name
    });

  } catch (err) {
    console.error("❌ Error requesting admin access:", err);
    next(err);
  }
});

// Approve promotion via email link (no auth required - uses token)
router.get('/:clientId/users/:userId/approve-promotion', async (req, res, next) => {
  try {
    const { clientId, userId: targetUserId } = req.params;
    const { token } = req.query;
    
    // Validate IDs
    if (!mongoose.isValidObjectId(clientId) || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">Invalid Request</h1>
            <p>The promotion link is invalid.</p>
          </body>
        </html>
      `);
    }

    if (!token) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">Missing Token</h1>
            <p>No authorization token provided.</p>
          </body>
        </html>
      `);
    }

    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">User Not Found</h1>
            <p>The user could not be found.</p>
          </body>
        </html>
      `);
    }

    // Verify token
    if (targetUser.promotionToken !== token) {
      return res.status(403).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">Invalid Token</h1>
            <p>The authorization token is invalid or has already been used.</p>
          </body>
        </html>
      `);
    }

    // Check if token is expired
    if (new Date() > targetUser.promotionTokenExpiry) {
      return res.status(403).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #dc2626;">Token Expired</h1>
            <p>This promotion link has expired. Please request access again.</p>
          </body>
        </html>
      `);
    }

    // Check if user is already an admin
    if (targetUser.companyAdmin) {
      return res.status(400).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #f59e0b;">Already Promoted</h1>
            <p>This user is already a company administrator.</p>
          </body>
        </html>
      `);
    }

    // Promote user to admin
    targetUser.companyAdmin = true;
    targetUser.forceRefreshAfter = new Date();
    targetUser.promotionToken = undefined; // Clear the token
    targetUser.promotionTokenExpiry = undefined;
    await targetUser.save();

    const userName = targetUser.firstName ? `${targetUser.firstName} ${targetUser.lastName || ''}`.trim() : targetUser.name;

    res.status(200).send(`
      <html>
        <head>
          <title>Promotion Successful</title>
        </head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <svg style="width: 64px; height: 64px; margin: 0 auto 20px; color: #10b981;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 style="color: #10b981; margin-bottom: 16px;">Promotion Successful!</h1>
            <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">
              <strong>${userName}</strong> has been successfully promoted to Company Administrator.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              The user will have access to financial information and administrative features on their next login.
            </p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${process.argv.includes('--dev') || process.env.HTTP_PORT_DEV ? 'http://localhost:5173' : (process.env.FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au')}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; font-weight: 500;">
                Return to Dashboard
              </a>
            </div>
          </div>
        </body>
      </html>
    `);

  } catch (err) {
    console.error("❌ Error approving promotion:", err);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #dc2626;">Error</h1>
          <p>An error occurred while processing the promotion. Please try again or contact support.</p>
        </body>
      </html>
    `);
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

    // Generate fresh token with updated permissions
    const { generateFreshToken } = require('../utils/tokenUtils');
    const freshToken = generateFreshToken(savedUser);

    // Use the saved user data for the message to ensure we have the latest fields
    const userName = savedUser.firstName || savedUser.name || 'User';
    const userLastName = savedUser.lastName || '';
    const fullName = `${userName} ${userLastName}`.trim();

    res.json({
      success: true,
      message: `${fullName} demoted to regular user.`,
      data: savedUser,
      requiresRefresh: true, // Signal frontend that target user needs to refresh
      targetUserId: targetUserId,
      freshToken: freshToken,  // New token with updated permissions
      updatedUser: savedUser.toObject() // Fresh user data
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
// 🗑️ DELETE CLIENT - Comprehensive cleanup of all references
// ═══════════════════════════════════════════════════════════════════════════════

router.delete('/:clientId', authenticateToken(), async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const userId = req.user?.userId;

    console.log(`🗑️ [DELETE] Starting comprehensive client deletion for ID: ${clientId}`);
    
    // Validate client ID
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid client ID format.' 
      });
    }

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found.' 
      });
    }

    console.log(`🗑️ [DELETE] Found client: ${client.name}`);

    // Check permissions - Only admin can delete clients
    const currentUser = await User.findById(userId);
    if (!currentUser || currentUser.role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required to delete clients.' 
      });
    }

    console.log(`🗑️ [DELETE] Admin permissions verified for user: ${currentUser.name}`);

    // Start comprehensive cleanup process
    const cleanupResults = {
      clientDeleted: false,
      projectsUpdated: 0,
      usersUpdated: 0,
      orphanedUsers: 0
    };

    // 1. Get database collections
    const { projectsCollection, userCollection } = require('../db');
    const projectCollectionRef = await projectsCollection();
    const userCollectionRef = await userCollection();

    // 2. Remove client reference from all projects
    console.log(`🗑️ [DELETE] Removing client ${clientId} from project linkedClients arrays...`);
    const projectUpdateResult = await projectCollectionRef.updateMany(
      { linkedClients: clientId },
      { $pull: { linkedClients: clientId } }
    );
    cleanupResults.projectsUpdated = projectUpdateResult.modifiedCount;
    console.log(`✅ [DELETE] Updated ${cleanupResults.projectsUpdated} projects`);

    // 3. Remove client reference from all users' linkedClients arrays
    console.log(`🗑️ [DELETE] Removing client ${clientId} from user linkedClients arrays...`);
    const userLinkUpdateResult = await User.updateMany(
      { linkedClients: clientId },
      { $pull: { linkedClients: clientId } }
    );
    cleanupResults.usersUpdated = userLinkUpdateResult.modifiedCount;
    console.log(`✅ [DELETE] Updated ${cleanupResults.usersUpdated} users' linkedClients arrays`);

    // 4. Handle users whose company field matches this client's name
    console.log(`🗑️ [DELETE] Clearing company field for users belonging to: ${client.name}`);
    const companyUserUpdateResult = await User.updateMany(
      { company: client.name },
      { 
        $unset: { company: "" },
        $set: { companyAdmin: false }
      }
    );
    cleanupResults.orphanedUsers = companyUserUpdateResult.modifiedCount;
    console.log(`✅ [DELETE] Cleared company field for ${cleanupResults.orphanedUsers} users`);

    // 5. Handle users in the client's linkedUsers array (if any)
    if (client.linkedUsers && client.linkedUsers.length > 0) {
      console.log(`🗑️ [DELETE] Handling ${client.linkedUsers.length} users linked to this client...`);
      await User.updateMany(
        { _id: { $in: client.linkedUsers } },
        { 
          $unset: { company: "" },
          $set: { companyAdmin: false },
          $pull: { linkedClients: clientId }
        }
      );
      console.log(`✅ [DELETE] Processed users from client's linkedUsers array`);
    }

    // 6. Double-check: Remove any remaining references to this client ID from all collections
    console.log(`🗑️ [DELETE] Performing final cleanup sweep for client ID: ${clientId}`);
    
    // Remove from any projects that might still have the reference (safety net)
    const finalProjectCleanup = await projectCollectionRef.updateMany(
      { $or: [
        { linkedClients: clientId },
        { linkedClients: new mongoose.Types.ObjectId(clientId) }
      ]},
      { $pull: { 
        linkedClients: { $in: [clientId, new mongoose.Types.ObjectId(clientId)] }
      }}
    );
    
    // Remove from any users that might still have the reference (safety net)
    const finalUserCleanup = await User.updateMany(
      { $or: [
        { linkedClients: clientId },
        { linkedClients: new mongoose.Types.ObjectId(clientId) }
      ]},
      { $pull: { 
        linkedClients: { $in: [clientId, new mongoose.Types.ObjectId(clientId)] }
      }}
    );
    
    console.log(`✅ [DELETE] Final sweep completed - Projects: ${finalProjectCleanup.modifiedCount}, Users: ${finalUserCleanup.modifiedCount}`);

    // 7. Finally, delete the client document
    console.log(`🗑️ [DELETE] Deleting client document...`);
    await Client.findByIdAndDelete(clientId);
    cleanupResults.clientDeleted = true;
    console.log(`✅ [DELETE] Client document deleted successfully`);

    // 8. Log comprehensive cleanup summary
    console.log(`🎯 [DELETE COMPLETE] Cleanup Summary:
      - Client "${client.name}" deleted: ✅
      - Projects updated (linkedClients removed): ${cleanupResults.projectsUpdated}
      - Users updated (linkedClients removed): ${cleanupResults.usersUpdated}
      - Users with company field cleared: ${cleanupResults.orphanedUsers}
      - Total operations: ${cleanupResults.projectsUpdated + cleanupResults.usersUpdated + cleanupResults.orphanedUsers + 1}
    `);

    res.json({
      success: true,
      message: `Client "${client.name}" and all associated references have been permanently deleted.`,
      cleanupSummary: {
        clientName: client.name,
        clientId: clientId,
        projectsAffected: cleanupResults.projectsUpdated,
        usersAffected: cleanupResults.usersUpdated + cleanupResults.orphanedUsers,
        totalOperations: cleanupResults.projectsUpdated + cleanupResults.usersUpdated + cleanupResults.orphanedUsers + 1
      }
    });

  } catch (err) {
    console.error("❌ [DELETE ERROR] Failed to delete client:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete client and cleanup references.", 
      error: err.message 
    });
  }
});

// ─── API ENDPOINT: Find Client by Contact Email (for Rusty AI auto-assignment) ──
router.post('/find-by-contact-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    console.log(`🔍 [Rusty] Looking up client by mainContact.email: ${email}`);

    // Find client by mainContact.email (case-insensitive)
    const client = await Client.findOne({
      'mainContact.email': { $regex: new RegExp(`^${email}$`, 'i') }
    }).select('_id name mainContact');

    if (!client) {
      console.log(`ℹ️ [Rusty] No client found with mainContact.email: ${email}`);
      return res.status(404).json({
        success: false,
        message: "No client found with this contact email"
      });
    }

    console.log(`✅ [Rusty] Client found: ${client.name} (${client._id})`);

    res.json({
      success: true,
      client: {
        _id: client._id,
        name: client.name,
        mainContact: client.mainContact
      }
    });

  } catch (err) {
    console.error("❌ Error finding client by contact email:", err);
    res.status(500).json({
      success: false,
      message: "Failed to find client",
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUICKBOOKS INTEGRATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Connect QuickBooks to a client
 * POST /api/clients/:clientId/quickbooks/connect
 */
router.post('/:clientId/quickbooks/connect', authenticateToken(), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { realmId, accessToken, refreshToken, tokenExpiry } = req.body;

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }

    if (!realmId || !accessToken || !refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required QuickBooks credentials'
      });
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      {
        $set: {
          'quickbooks.connected': true,
          'quickbooks.realmId': realmId,
          'quickbooks.accessToken': accessToken,
          'quickbooks.refreshToken': refreshToken,
          'quickbooks.tokenExpiry': tokenExpiry || new Date(Date.now() + 3600000), // 1 hour default
          'quickbooks.connectedAt': new Date(),
          'quickbooks.lastTokenRefresh': new Date()
        }
      },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    console.log(`✅ QuickBooks connected for client: ${client.name}`);

    res.json({
      success: true,
      message: 'QuickBooks connected successfully',
      data: {
        connected: true,
        realmId: realmId,
        connectedAt: client.quickbooks.connectedAt
      }
    });

  } catch (err) {
    console.error('❌ Error connecting QuickBooks:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to connect QuickBooks',
      error: err.message
    });
  }
});

/**
 * Update QuickBooks settings for a client
 * PATCH /api/clients/:clientId/quickbooks/settings
 */
router.patch('/:clientId/quickbooks/settings', authenticateToken(), async (req, res) => {
  try {
    const { clientId } = req.params;
    const { autoInvoice, invoicePrefix, defaultServiceItem } = req.body;

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }

    const updateData = {};
    if (typeof autoInvoice !== 'undefined') updateData['quickbooks.autoInvoice'] = autoInvoice;
    if (invoicePrefix) updateData['quickbooks.invoicePrefix'] = invoicePrefix;
    if (defaultServiceItem) updateData['quickbooks.defaultServiceItem'] = defaultServiceItem;

    const client = await Client.findByIdAndUpdate(
      clientId,
      { $set: updateData },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    console.log(`✅ QuickBooks settings updated for client: ${client.name}`);

    res.json({
      success: true,
      message: 'QuickBooks settings updated successfully',
      data: {
        autoInvoice: client.quickbooks?.autoInvoice,
        invoicePrefix: client.quickbooks?.invoicePrefix,
        defaultServiceItem: client.quickbooks?.defaultServiceItem
      }
    });

  } catch (err) {
    console.error('❌ Error updating QuickBooks settings:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update QuickBooks settings',
      error: err.message
    });
  }
});

/**
 * Disconnect QuickBooks from a client
 * POST /api/clients/:clientId/quickbooks/disconnect
 */
router.post('/:clientId/quickbooks/disconnect', authenticateToken(), async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      {
        $set: {
          'quickbooks.connected': false,
          'quickbooks.accessToken': null,
          'quickbooks.refreshToken': null,
          'quickbooks.tokenExpiry': null
        }
      },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    console.log(`✅ QuickBooks disconnected for client: ${client.name}`);

    res.json({
      success: true,
      message: 'QuickBooks disconnected successfully'
    });

  } catch (err) {
    console.error('❌ Error disconnecting QuickBooks:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect QuickBooks',
      error: err.message
    });
  }
});

/**
 * Get QuickBooks status for a client
 * GET /api/clients/:clientId/quickbooks/status
 */
router.get('/:clientId/quickbooks/status', authenticateToken(), async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client ID' });
    }

    const client = await Client.findById(clientId);

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    res.json({
      success: true,
      data: {
        connected: client.quickbooks?.connected || false,
        realmId: client.quickbooks?.realmId || null,
        connectedAt: client.quickbooks?.connectedAt || null,
        autoInvoice: client.quickbooks?.autoInvoice || false,
        lastSyncedAt: client.quickbooks?.lastSyncedAt || null,
        tokenExpiry: client.quickbooks?.tokenExpiry || null,
        syncErrors: client.quickbooks?.syncErrors || []
      }
    });

  } catch (err) {
    console.error('❌ Error getting QuickBooks status:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get QuickBooks status',
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════

module.exports = router;