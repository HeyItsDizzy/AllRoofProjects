const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { authenticateToken, authenticateAdmin, authenticateCompanyAdmin } = require("../middleware/auth");
const { userCollection, clientCollection } = require("../db");
const { avatarUpload } = require("../middleware/upload");
const path = require("path");
const fs = require("fs");
const User = require('../config/User');
const Client = require('../config/Client');


// Middleware to get user collection
const getUserCollection = async (req, res, next) => {
  try {
    const collection = await userCollection();
    if (!collection) throw new Error("userCollection() returned undefined");
    req.collection = collection;
    console.log("✅ Users collection accessed successfully!");
    next();
  } catch (err) {
    console.error("❌ Failed to access user collection:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user collection.",
      error: err.message,
    });
  }
};

// Middleware to validate ObjectId
const validateObjectId = (req, res, next) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid user ID format." });
  }
  next();
};

// Common projection fields
const userProjection = {
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  address: 1,
  org: 1,
  company: 1,
  companyAdmin: 1,
  linkedClients: 1,  // Include linkedClients for frontend access
  avatar: 1,
  role: 1,
  phoneVerified: 1,
  profileScore: 1,   // Include profile score for UserManagement page
  isBlock: 1,        // Include for user status in frontend
  isDeleted: 1,      // Include for user status in frontend
  updatedAt: 1,      // Include for sorting by last update
  createdAt: 1,      // Include for sorting by creation date
};

// Get all users (Admin only)
router.get("/get-users", authenticateToken(), authenticateAdmin(), getUserCollection, async (req, res) => {
  try {
    const users = await req.collection.find({}, { projection: userProjection }).toArray();
    res.status(200).json({
      success: true,
      message: "All users retrieved successfully.",
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
      error: err.message,
    });
  }
});

// Route to retrieve user data
router.get("/get-userData", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const users = await req.collection.find({}).toArray();
    res.json({
      success: true,
      message: "User data retrieved successfully",
      data: users,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user data",
      error: err.message,
    });
  }
});

// Route to get a single user by ID
router.get("/get-user/:id", authenticateToken(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const user = await req.collection.findOne({ _id: new ObjectId(req.params.id) }, { projection: userProjection });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.json({
      success: true,
      message: "User retrieved successfully.",
      data: user,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user.",
      error: err.message,
    });
  }
});

// ── Test endpoint to verify routes are working ─────────────────────────────
router.get("/test", (req, res) => {
  res.json({ success: true, message: "User routes are working!" });
});

// ── Link Company to User (for company creation) ──────────────────────────
router.patch("/link-company", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    console.log("🔗 [link-company] Endpoint hit!");
    console.log("🔗 [link-company] Request body:", req.body);
    console.log("🔗 [link-company] Full user object from token:", req.user);
    
    const { companyId } = req.body;
    // Try different possible user ID properties
    const userId = req.user.id || req.user.userId || req.user._id;

    console.log("🔗 [link-company] Extracted User ID:", userId);
    console.log("🔗 [link-company] Company ID:", companyId);

    // Validate userId
    if (!userId) {
      console.log("❌ [link-company] No user ID found in token");
      return res.status(400).json({ 
        success: false, 
        message: "User ID not found in authentication token." 
      });
    }

    // Validate companyId
    if (!companyId || !ObjectId.isValid(companyId)) {
      console.log("❌ [link-company] Invalid company ID");
      return res.status(400).json({ 
        success: false, 
        message: "Valid company ID is required." 
      });
    }

    // Check if company exists
    const company = await Client.findById(companyId);
    if (!company) {
      console.log("❌ [link-company] Company not found");
      return res.status(404).json({ 
        success: false, 
        message: "Company not found." 
      });
    }

    console.log("✅ [link-company] Company found:", company.name);

    // Update user's company field
    console.log("🔍 [link-company] Searching for user with ID:", userId);
    const updatedUser = await req.collection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          company: companyId,
          companyAdmin: true // Set as admin since they created the company
        }
      },
      { 
        returnDocument: "after",
        projection: userProjection
      }
    );

    if (!updatedUser) {
      console.log("❌ [link-company] User not found in database with ID:", userId);
      console.log("🔍 [link-company] Checking if user exists at all...");
      
      // Try to find user with any variation of the ID
      const userCheck = await req.collection.findOne({ _id: new ObjectId(userId) });
      console.log("🔍 [link-company] User exists check result:", !!userCheck);
      
      return res.status(404).json({ 
        success: false, 
        message: "User not found." 
      });
    }

    console.log("✅ [link-company] User linked to company successfully");

    res.json({
      success: true,
      message: "User successfully linked to company.",
      data: updatedUser,
      companyId: companyId,
      companyName: company.name
    });

  } catch (err) {
    console.error("❌ [link-company] Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to link user to company.",
      error: err.message,
    });
  }
});

router.get("/me", authenticateToken(), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error("Error in /users/me:", err);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// USER INVITATION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// USER INVITATION SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

//POST /users/invite - Invite a new user (Admin or Company Admin)
router.post("/invite", authenticateToken(), authenticateCompanyAdmin(), getUserCollection, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role = "User",
      company,
      password,
      sendEmail = true,
      invitedBy
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required."
      });
    }

    // Check if email already exists
    const existingUser = await req.collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists."
      });
    }

    // Hash the temporary password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUND));
    const fullName = `${firstName} ${lastName}`;

    // Create new user
    const newUser = {
      name: fullName,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      company: company || null,
      isBlock: false,
      isDeleted: false,
      isInvited: true,
      mustChangePassword: true,
      invitedBy: invitedBy || req.user.userId,
      invitedAt: new Date(),
      linkedClients: [],
      linkedProjects: [],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
      phoneVerified: false,
      resetCode: null,
      resetCodeExpiry: null
    };

    const result = await req.collection.insertOne(newUser);

    // TODO: Send invitation email if sendEmail is true
    if (sendEmail) {
      // Email functionality would go here
      console.log(`📧 Would send invitation email to: ${email}`);
      console.log(`🔑 Temporary password: ${password}`);
    }

    res.status(201).json({
      success: true,
      message: `User ${fullName} invited successfully.`,
      data: {
        userId: result.insertedId,
        email,
        temporaryPassword: sendEmail ? null : password, // Only return password if not sending email
      }
    });

  } catch (err) {
    console.error("❌ Error inviting user:", err);
    res.status(500).json({
      success: false,
      message: "Failed to invite user.",
      error: err.message
    });
  }
});

// POST /users/company-invite - Invite user to company with linking code
router.post("/company-invite", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const {
      email,
      companyAdmin = false,
      company,
      linkingCode,
      sendEmail = true,
      invitedBy
    } = req.body;

    console.log("� Backend: Company invite request received");
    console.log("📧 Backend: Request data:", { email, company, linkingCode, companyAdmin, sendEmail });
    console.log("👤 Backend: Request user:", { userId: req.user?.userId, email: req.user?.email });

    // Validation
    if (!email || !company || !linkingCode) {
      return res.status(400).json({
        success: false,
        message: "Email, company, and linking code are required."
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format."
      });
    }

    // Verify the linking code exists and matches the company
    const clientCollectionRef = await clientCollection();
    const client = await clientCollectionRef.findOne({ 
      _id: new ObjectId(company),
      $or: [
        { userLinkingCode: linkingCode },
        { adminLinkingCode: linkingCode },
        { linkingCode: linkingCode }
      ]
    });

    if (!client) {
      return res.status(400).json({
        success: false,
        message: "Invalid linking code for the specified company."
      });
    }

    // Create invitation record (not a full user yet - they'll register themselves)
    const invitationData = {
      email,
      company,
      linkingCode,
      companyAdmin,
      invitedBy: invitedBy || req.user.userId,
      invitedAt: new Date(),
      status: 'pending',
      registrationCompleted: false
    };

    // Store invitation in a separate collection or add to user collection with special flag
    // For now, we'll just log and return success (email handling would go here)
    
    if (sendEmail) {
      try {
        // Send email using the email service
        const emailService = require('../services/emailService');
        
        console.log('🔧 Backend: Email service ready?', emailService.isReady());
        
        // Ensure email service is ready
        const isReady = await emailService.ensureReady();
        console.log('🔧 Backend: Email service ready after ensure?', isReady);
        
        const invitationEmailData = {
          company: client.name || company, // Use client name if available
          linkingCode,
          companyAdmin,
          senderEmail: req.user.email,
          frontendUrl: process.env.FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au',
          companyLogoUrl: client.logoUrl || null, // Add company logo URL if available
          companyFooterUrl: client.footerImageUrl || null // Add company footer image URL if available
        };

        console.log('📧 Backend: Sending email with data:', {
          to: email,
          emailData: invitationEmailData
        });

        const result = await emailService.sendCompanyInvitation(email, invitationEmailData);
        
        console.log('✅ Backend: Email service result:', result);
        console.log('📧 Backend: Email sent to:', email);
        console.log('🏢 Backend: Company:', client.name || company);
        console.log('🔑 Backend: Linking Code:', linkingCode);
        console.log('👤 Backend: Role:', companyAdmin ? 'Company Admin' : 'Company User');

      } catch (emailError) {
        console.error('❌ Backend: Error sending invitation email:', emailError);
        console.error('❌ Backend: Email error stack:', emailError.stack);
        // Don't fail the whole request if email fails, but log it
      }
    } else {
      // Just log for manual processing
      console.log(`📧 Would send company invitation email to: ${email}`);
      console.log(`🏢 Company: ${company}`);
      console.log(`🔑 Linking Code: ${linkingCode}`);
      console.log(`👤 Role: ${companyAdmin ? 'Company Admin' : 'Company User'}`);
      console.log(`📋 Instructions: Register at /register and use linking code to join company`);
    }

    res.status(200).json({
      success: true,
      message: `Company invitation sent successfully to ${email}`,
      data: {
        email,
        company,
        linkingCode,
        role: companyAdmin ? 'Company Admin' : 'Company User',
        invitationData
      }
    });

  } catch (err) {
    console.error("❌ Error sending company invitation:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send company invitation.",
      error: err.message
    });
  }
});

// Fetch current user's profile
router.get("/profile", authenticateToken(), async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID." });
    }

    const collection = await userCollection(); // ✅ correctly calling the function
    if (!collection) throw new Error("userCollection() returned undefined");

    const user = await collection.findOne(
      { _id: new ObjectId(userId) },
      { projection: userProjection }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    console.log("✅ Successfully fetched user profile:", user.email);
    res.json({ success: true, data: user });

  } catch (err) {
    console.error("❌ Failed to retrieve profile:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve profile.", error: err.message });
  }
});

router.patch("/profile", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const updates = req.body;

    if (updates.phoneVerified === false) {
      delete updates.phoneVerified;
    }

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID." });
    }

    const allowedFields = ["firstName", "lastName", "phone", "address", "org", "company", "avatar", "phoneVerified"];
    const updatePayload = {};

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updatePayload[field] = updates[field];
      }
    });

    const result = await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updatePayload }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: "No changes detected." });
    }

    res.json({ success: true, message: "Profile updated successfully." });
  } catch (err) {
    console.error("❌ Failed to update profile:", err.message);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// Update user profile score only (lightweight endpoint for background updates)
router.patch("/profile-score", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileScore } = req.body;

    // Validate profileScore
    if (typeof profileScore !== 'number' || profileScore < 0 || profileScore > 100) {
      return res.status(400).json({ 
        success: false, 
        message: "Profile score must be a number between 0 and 100." 
      });
    }

    // Update only the profile score field
    const result = await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profileScore } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Only log if score actually changed
    if (result.modifiedCount > 0) {
      console.log(`✅ Profile score updated for user ${userId}: ${profileScore}%`);
    }

    res.json({ success: true, message: "Profile score updated successfully.", profileScore });
  } catch (err) {
    console.error("❌ Failed to update profile score:", err.message);
    res.status(500).json({ success: false, message: "Failed to update profile score." });
  }
});

// Update user profile by admin (admin can edit any user's profile)
router.patch("/profile-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const updates = req.body;

    // Allowed fields for admin to update
    const allowedFields = ["firstName", "lastName", "email", "phone", "address", "org", "avatar", "role", "profileScore"];
    const updatePayload = {};

    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updatePayload[field] = updates[field];
      }
    });

    // Handle company operation metadata
    const companyOperation = updates._companyOperation;
    let requiresRefresh = false;
    let forceRefreshTimestamp = null;

    if (companyOperation) {
      console.log('🏢 Processing company operation:', companyOperation);
      
      forceRefreshTimestamp = new Date();
      requiresRefresh = true;

      const Client = require('../config/Client');
      const clientCollectionRef = await clientCollection();

      switch (companyOperation.type) {
        case 'unlink':
          // Remove from current company
          console.log('🔓 Unlinking user from company:', companyOperation.oldCompanyId);
          updatePayload.company = null;
          updatePayload.companyAdmin = false;
          updatePayload.linkedClients = [];
          
          // Remove user from old company's linkedUsers
          if (companyOperation.oldCompanyId) {
            const oldCompany = await Client.findById(companyOperation.oldCompanyId);
            if (oldCompany) {
              await clientCollectionRef.updateOne(
                { _id: oldCompany._id },
                { $pull: { linkedUsers: new ObjectId(targetUserId) } }
              );
            }
          }
          break;

        case 'change':
          // Move from old company to new company
          console.log('🔄 Changing company from', companyOperation.oldCompanyId, 'to', companyOperation.newCompanyId);
          
          // Remove from old company
          if (companyOperation.oldCompanyId) {
            const oldCompany = await Client.findById(companyOperation.oldCompanyId);
            if (oldCompany) {
              await clientCollectionRef.updateOne(
                { _id: oldCompany._id },
                { $pull: { linkedUsers: new ObjectId(targetUserId) } }
              );
            }
          }
          
          // Add to new company
          const newCompany = await Client.findById(companyOperation.newCompanyId);
          if (!newCompany) {
            return res.status(404).json({ success: false, message: "New company not found." });
          }
          
          updatePayload.company = newCompany.name;
          updatePayload.companyAdmin = companyOperation.companyAdmin || false;
          updatePayload.linkedClients = [newCompany._id];
          
          await clientCollectionRef.updateOne(
            { _id: newCompany._id },
            { $addToSet: { linkedUsers: new ObjectId(targetUserId) } }
          );
          break;

        case 'link':
          // Link to new company
          console.log('🔗 Linking user to company:', companyOperation.newCompanyId);
          const linkCompany = await Client.findById(companyOperation.newCompanyId);
          if (!linkCompany) {
            return res.status(404).json({ success: false, message: "Company not found." });
          }
          
          updatePayload.company = linkCompany.name;
          updatePayload.companyAdmin = companyOperation.companyAdmin || false;
          updatePayload.linkedClients = [linkCompany._id];
          
          await clientCollectionRef.updateOne(
            { _id: linkCompany._id },
            { $addToSet: { linkedUsers: new ObjectId(targetUserId) } }
          );
          break;
      }

      // Add force refresh timestamp if company changed
      if (forceRefreshTimestamp) {
        updatePayload.forceRefreshAfter = forceRefreshTimestamp;
      }
    }

    // Ensure we have something to update
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ success: false, message: "No valid fields to update." });
    }

    console.log('💾 Final update payload:', updatePayload);

    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: updatePayload }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: "No changes detected." });
    }

    res.json({ 
      success: true, 
      message: "User profile updated successfully by admin.",
      requiresRefresh,
      targetUserId: requiresRefresh ? targetUserId : undefined
    });
  } catch (err) {
    console.error("❌ Error updating user profile by admin:", err);
    res.status(500).json({ success: false, message: "Failed to update user profile.", error: err.message });
  }
});

// Link user to company with admin override (admin can link any user to any company)
router.patch("/link-company-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { companyId, companyAdmin = false } = req.body;

    if (!companyId || !ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Valid company ID is required." });
    }

    // Check if company exists
    const Client = require('../config/Client');
    const company = await Client.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    // Update user
    const forceRefreshTimestamp = new Date();
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      {
        $set: {
          company: company.name, // Store company name
          companyAdmin: companyAdmin,
          linkedClients: [new ObjectId(companyId)],
          forceRefreshAfter: forceRefreshTimestamp // Force user to refresh
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Update client's linkedUsers array
    const clientCollectionRef = await clientCollection();
    await clientCollectionRef.updateOne(
      { _id: new ObjectId(companyId) },
      { $addToSet: { linkedUsers: new ObjectId(targetUserId) } }
    );

    res.json({
      success: true,
      message: "User successfully linked to company by admin.",
      data: { companyId, companyName: company.name, companyAdmin },
      requiresRefresh: true,
      targetUserId: targetUserId
    });

  } catch (err) {
    console.error("❌ Error linking user to company by admin:", err);
    res.status(500).json({ success: false, message: "Failed to link user to company.", error: err.message });
  }
});

// Unlink user from company with admin override (global admin can unlink any user)
router.patch("/unlink-company-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;

    console.log("🔓 [unlink-company-admin] Unlinking user from company");
    console.log("🔓 [unlink-company-admin] Target user ID:", targetUserId);

    // Get the user to check their current company
    const userToUnlink = await req.collection.findOne({ _id: new ObjectId(targetUserId) });
    if (!userToUnlink) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    console.log("🔓 [unlink-company-admin] User found:", userToUnlink.firstName, userToUnlink.lastName);
    console.log("🔓 [unlink-company-admin] Current company:", userToUnlink.company);
    console.log("🔓 [unlink-company-admin] Linked clients:", userToUnlink.linkedClients);

    // Remove user from company (unlink them)
    const forceRefreshTimestamp = new Date();
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $unset: { 
          company: "",
          companyAdmin: ""
        },
        $set: {
          linkedClients: [],
          forceRefreshAfter: forceRefreshTimestamp // Force user to refresh
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found for unlinking." });
    }

    // Also remove user from all client linkedUsers arrays
    const clientCollectionRef = await clientCollection();
    
    // Remove from all clients where this user might be linked
    if (userToUnlink.linkedClients && userToUnlink.linkedClients.length > 0) {
      console.log("🔓 [unlink-company-admin] Removing user from client linkedUsers arrays");
      
      for (const clientId of userToUnlink.linkedClients) {
        await clientCollectionRef.updateOne(
          { _id: new ObjectId(clientId) },
          { $pull: { linkedUsers: new ObjectId(targetUserId) } }
        );
        console.log(`🔓 [unlink-company-admin] Removed user from client ${clientId}`);
      }
    }

    // Also remove by company name (backup cleanup)
    if (userToUnlink.company) {
      await clientCollectionRef.updateMany(
        { name: userToUnlink.company },
        { $pull: { linkedUsers: new ObjectId(targetUserId) } }
      );
      console.log(`🔓 [unlink-company-admin] Backup cleanup for company ${userToUnlink.company}`);
    }

    console.log("✅ [unlink-company-admin] User successfully unlinked from company");

    res.json({
      success: true,
      message: `${userToUnlink.firstName} ${userToUnlink.lastName} successfully unlinked from company.`,
      data: result,
      requiresRefresh: true,
      targetUserId: targetUserId
    });

  } catch (err) {
    console.error("❌ Error unlinking user from company by admin:", err);
    res.status(500).json({ success: false, message: "Failed to unlink user from company.", error: err.message });
  }
});

// Phone verification routes
const smsService = require('../services/smsService');

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map();

// Test ClickSend credentials (development only)
router.get("/test-sms-credentials", authenticateToken(), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: "This endpoint is not available in production."
      });
    }

    console.log('🔍 Testing ClickSend credentials...');
    
    // Test basic service configuration
    const serviceInfo = {
      hasUsername: !!process.env.CLICKSEND_USERNAME,
      hasApiKey: !!process.env.CLICKSEND_API_KEY,
      username: process.env.CLICKSEND_USERNAME,
      apiKeyPrefix: process.env.CLICKSEND_API_KEY ? `${process.env.CLICKSEND_API_KEY.substring(0, 8)}...` : null,
      senderId: process.env.CLICKSEND_SENDER_ID || 'AllRoofTakeoffs'
    };

    console.log('🔍 Service configuration:', serviceInfo);

    res.json({
      success: true,
      message: "ClickSend credentials test completed. Check server logs for details.",
      data: serviceInfo
    });

  } catch (err) {
    console.error("❌ Error testing SMS credentials:", err);
    res.status(500).json({
      success: false,
      message: "Failed to test SMS credentials.",
      error: err.message
    });
  }
});

// Send SMS verification code
router.post("/send-verification-code", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    console.log("🔍 [send-verification-code] Request received");
    console.log("🔍 [send-verification-code] User:", req.user);
    console.log("🔍 [send-verification-code] Headers:", req.headers);
    console.log("🔍 [send-verification-code] Body:", req.body);

    const { phoneNumber, region = 'AU' } = req.body;
    const userId = req.user.userId;

    if (!phoneNumber) {
      console.log("❌ [send-verification-code] Missing phone number");
      return res.status(400).json({
        success: false,
        message: "Phone number is required."
      });
    }

    // Validate region
    const supportedRegions = ['AU', 'US', 'NO'];
    if (!supportedRegions.includes(region.toUpperCase())) {
      console.log("❌ [send-verification-code] Invalid region:", region);
      return res.status(400).json({
        success: false,
        message: `Unsupported region: ${region}. Supported regions: ${supportedRegions.join(', ')}`
      });
    }

    // Validate phone number format
    if (!smsService.isValidPhoneNumber(phoneNumber, region)) {
      const regionExamples = {
        'AU': 'e.g., 0412 345 678 or +61 412 345 678',
        'US': 'e.g., (555) 123-4567 or +1 555 123 4567',
        'NO': 'e.g., 12 34 56 78 or +47 12 34 56 78'
      };
      
      console.log("❌ [send-verification-code] Invalid phone format:", phoneNumber, "for region:", region);
      return res.status(400).json({
        success: false,
        message: `Invalid phone number format for ${region}. ${regionExamples[region.toUpperCase()] || 'Please use a valid format.'}`
      });
    }

    // Generate verification code
    const code = smsService.generateVerificationCode();
    
    // Store code with expiration (10 minutes)
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    verificationCodes.set(userId, {
      code,
      phoneNumber: smsService.cleanPhoneNumber(phoneNumber, region),
      region: region.toUpperCase(),
      expiresAt
    });

    console.log("✅ [send-verification-code] Code generated and stored for user:", userId);

    try {
      // Send SMS
      await smsService.sendVerificationCode(phoneNumber, code, region);
      
      console.log(`📱 Verification code sent to ${smsService.cleanPhoneNumber(phoneNumber, region)} (${region}) for user ${userId}`);
      
      res.json({
        success: true,
        message: "Verification code sent to your phone number.",
        expiresIn: 600, // 10 minutes in seconds
        region: region.toUpperCase()
      });
    } catch (smsError) {
      console.error('❌ SMS sending failed:', smsError.message);
      
      // Clean up stored code on failure
      verificationCodes.delete(userId);
      
      res.status(500).json({
        success: false,
        message: "Failed to send verification code. Please try again later.",
        error: process.env.NODE_ENV === 'development' ? smsError.message : undefined
      });
    }

  } catch (err) {
    console.error("❌ Error in send-verification-code:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send verification code.",
      error: err.message
    });
  }
});

// Verify SMS code
router.post("/verify-phone-code", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const { code, phoneNumber, region = 'AU' } = req.body;
    const userId = req.user.userId;

    if (!code || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Verification code and phone number are required."
      });
    }

    // Get stored verification data
    const storedData = verificationCodes.get(userId);
    
    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: "No verification code found. Please request a new code."
      });
    }

    // Check if code has expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(userId);
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code."
      });
    }

    // Verify code
    if (storedData.code !== code.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code."
      });
    }

    // Verify phone number matches (use stored region for consistency)
    const cleanedInputPhone = smsService.cleanPhoneNumber(phoneNumber, storedData.region || region);
    if (storedData.phoneNumber !== cleanedInputPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number mismatch."
      });
    }

    // Update user's phone verification status
    const result = await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          phoneVerified: true,
          phone: cleanedInputPhone,
          phoneRegion: storedData.region || region.toUpperCase()
        } 
      }
    );

    // Clean up verification code
    verificationCodes.delete(userId);

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    console.log(`✅ Phone verified for user ${userId}: ${cleanedInputPhone} (${storedData.region || region})`);

    res.json({
      success: true,
      message: "Phone number verified successfully.",
      data: {
        phoneVerified: true,
        phone: cleanedInputPhone,
        phoneRegion: storedData.region || region.toUpperCase()
      }
    });

  } catch (err) {
    console.error("❌ Error in verify-phone-code:", err);
    res.status(500).json({
      success: false,
      message: "Failed to verify phone number.",
      error: err.message
    });
  }
});

// Update current user's Avatar
router.post("/avatar", authenticateToken(), avatarUpload.single("avatar"), getUserCollection, async (req, res) => {
  try {
    const userId = req.user.userId;
    const avatarPath = `/uploads/avatars/users/${req.file.filename}`;
    const result = await req.collection.updateOne({ _id: new ObjectId(userId) }, { $set: { avatar: avatarPath } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      url: avatarPath,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Upload failed", error: err.message });
  }
});

// Column sizing preferences for tables
router.get("/column-sizing", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const tableKey = req.query.tableKey;

    if (!tableKey) return res.status(400).json({ success: false, message: "Missing tableKey" });

    const user = await req.collection.findOne({ _id: new ObjectId(userId) });
    const sizingPrefs = user?.columnSizingPrefs || {};

    res.status(200).json({
      success: true,
      columnSizing: sizingPrefs[tableKey] || {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load column sizing", error: err.message });
  }
});

router.post("/column-sizing", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { tableKey, columnSizing } = req.body;

    if (!tableKey || !columnSizing) {
      return res.status(400).json({ success: false, message: "Missing tableKey or columnSizing" });
    }

    const update = {
      [`columnSizingPrefs.${tableKey}`]: columnSizing,
    };

    const result = await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: update }
    );

    res.status(200).json({ success: true, message: "Column sizing saved." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to save column sizing", error: err.message });
  }
});

// ── Link User to Company as ClientAdmin:false ─────────────────────────────────────
router.post("/link-company-user", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Linking code required." });
    }

    // Get client collection
    const clientCollectionRef = await clientCollection();
    const client = await clientCollectionRef.findOne({ 
      userLinkingCode: code.trim().toUpperCase() 
    });
    
    if (!client) {
      return res.status(404).json({ success: false, message: "Invalid user linking code." });
    }

    // Check current user
    const user = await req.collection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.company) {
      return res.status(400).json({ success: false, message: "User is already linked to a company." });
    }

    // Update user
    await req.collection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          company: client.name,
          companyAdmin: false,
          linkedClients: [client._id]
        }
      }
    );

    // Update client
    await clientCollectionRef.updateOne(
      { _id: client._id },
      { $addToSet: { linkedUsers: new ObjectId(req.user.userId) } }
    );

    res.json({
      success: true,
      message: "User successfully linked to company.",
      clientId: client._id,
      clientName: client.name
    });

  } catch (error) {
    console.error("❌ Error linking user:", error);
    res.status(500).json({ success: false, message: "Failed to link user to company." });
  }
});

// ── Link User to Company as ClientAdmin:true ─────────────────────────────────────────────
router.post("/link-company-admin", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Linking code required." });
    }

    // Get client collection
    const clientCollectionRef = await clientCollection();
    const client = await clientCollectionRef.findOne({ 
      adminLinkingCode: code.trim().toUpperCase() 
    });
    
    if (!client) {
      return res.status(404).json({ success: false, message: "Invalid admin linking code." });
    }

    // Check current user
    const user = await req.collection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.company) {
      return res.status(400).json({ success: false, message: "User is already linked to a company." });
    }

    // Update user
    await req.collection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          company: client.name,
          companyAdmin: true,
          linkedClients: [client._id]
        }
      }
    );

    // Update client
    await clientCollectionRef.updateOne(
      { _id: client._id },
      { $addToSet: { linkedUsers: new ObjectId(req.user.userId) } }
    );

    res.json({
      success: true,
      message: "User successfully linked to company as admin.",
      clientId: client._id,
      clientName: client.name
    });

  } catch (error) {
    console.error("❌ Error linking admin:", error);
    res.status(500).json({ success: false, message: "Failed to link user to company." });
  }
});

// ── Check Type of Linking Code ───────────────────────────────────────────
router.post("/check-link-code", async (req, res) => {
  const { code } = req.body;
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return res.status(400).json({ success: false, message: "Code is required." });

  const adminMatch = await Client.findOne({ adminLinkingCode: trimmed });
  if (adminMatch) return res.json({ success: true, type: "admin" });

  const userMatch = await Client.findOne({ userLinkingCode: trimmed });
  if (userMatch) return res.json({ success: true, type: "user" });

  return res.status(404).json({ success: false, message: "Code not found." });
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPANY USER MANAGEMENT (Admin only)
// ══════════════════════════════════════════════════════════════════════════════

// Get company users - for company admins only
router.get("/company-users", authenticateToken(), authenticateCompanyAdmin(), getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // Get current user to check admin status and company
    const currentUser = await req.collection.findOne({ _id: new ObjectId(userId) });
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

    // Get all users from the same company
    const companyUsers = await req.collection.find(
      { 
        company: currentUser.company,
        isDeleted: { $ne: true },
        isBlock: { $ne: true }
      },
      { 
        projection: {
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          avatar: 1,
          companyAdmin: 1,
          company: 1,
          createdAt: 1,
          lastLogin: 1
        }
      }
    ).toArray();

    // Separate admins and regular users
    const admins = companyUsers.filter(user => user.companyAdmin);
    const users = companyUsers.filter(user => !user.companyAdmin);

    res.json({
      success: true,
      data: {
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch company users.",
      error: err.message
    });
  }
});

// Promote user to company admin
router.patch("/promote-admin/:id", authenticateToken(), authenticateCompanyAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const targetUserId = req.params.id;
    
    // Get current user to check admin status and company
    const currentUser = await req.collection.findOne({ _id: new ObjectId(userId) });
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get target user
    const targetUser = await req.collection.findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
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
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          companyAdmin: true,
          forceRefreshAfter: new Date() // Force target user to refresh on next API call
        } 
      }
    );

    // Get the updated user data and generate fresh token
    const updatedUser = await req.collection.findOne(
      { _id: new ObjectId(targetUserId) },
      { projection: { password: 0 } }
    );
    
    // Generate fresh token with updated permissions
    const { generateFreshToken } = require('../utils/tokenUtils');
    const freshToken = generateFreshToken(updatedUser);

    res.json({
      success: true,
      message: `${targetUser.firstName} ${targetUser.lastName} promoted to company admin.`,
      data: result,
      requiresRefresh: true, // Signal frontend that target user needs to refresh
      targetUserId: targetUserId,
      freshToken: freshToken,  // New token with updated permissions
      updatedUser: updatedUser // Fresh user data
    });

  } catch (err) {
    console.error("❌ Error promoting user:", err);
    res.status(500).json({
      success: false,
      message: "Failed to promote user.",
      error: err.message
    });
  }
});

// Demote admin to regular user
router.patch("/demote-admin/:id", authenticateToken(), authenticateCompanyAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const targetUserId = req.params.id;
    
    // Get current user to check admin status and company
    const currentUser = await req.collection.findOne({ _id: new ObjectId(userId) });
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get target user
    const targetUser = await req.collection.findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
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
    const adminCount = await req.collection.countDocuments({
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
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          companyAdmin: false,
          forceRefreshAfter: new Date() // Force target user to refresh on next API call
        } 
      }
    );

    // Get the updated user data and generate fresh token
    const updatedUser = await req.collection.findOne(
      { _id: new ObjectId(targetUserId) },
      { projection: { password: 0 } }
    );
    
    // Generate fresh token with updated permissions
    const { generateFreshToken } = require('../utils/tokenUtils');
    const freshToken = generateFreshToken(updatedUser);

    res.json({
      success: true,
      message: `${targetUser.firstName} ${targetUser.lastName} demoted to regular user.`,
      data: result,
      requiresRefresh: true, // Signal frontend that target user needs to refresh
      targetUserId: targetUserId,
      freshToken: freshToken,  // New token with updated permissions
      updatedUser: updatedUser // Fresh user data
    });

  } catch (err) {
    console.error("❌ Error demoting admin:", err);
    res.status(500).json({
      success: false,
      message: "Failed to demote admin.",
      error: err.message
    });
  }
});

// Force refresh user session (for when roles change)
router.post("/force-refresh/:id", authenticateToken(), authenticateCompanyAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const targetUserId = req.params.id;
    
    // Get current user to check admin status and company
    const currentUser = await req.collection.findOne({ _id: new ObjectId(userId) });
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get target user
    const targetUser = await req.collection.findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if target user is in the same company
    if (targetUser.company !== currentUser.company) {
      return res.status(403).json({ 
        success: false, 
        message: "Can only manage users within your company." 
      });
    }

    // Add a timestamp to force token refresh
    const refreshTimestamp = new Date();
    await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { $set: { forceRefreshAfter: refreshTimestamp } }
    );

    res.json({
      success: true,
      message: `${targetUser.firstName} ${targetUser.lastName} will be forced to refresh on next request.`,
      data: { 
        targetUserId: targetUserId,
        forceRefreshAfter: refreshTimestamp 
      }
    });

  } catch (err) {
    console.error("❌ Error forcing user refresh:", err);
    res.status(500).json({
      success: false,
      message: "Failed to force user refresh.",
      error: err.message
    });
  }
});

// Remove user from company
router.delete("/remove-user/:id", authenticateToken(), authenticateCompanyAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const targetUserId = req.params.id;
    
    // Get current user to check admin status and company
    const currentUser = await req.collection.findOne({ _id: new ObjectId(userId) });
    if (!currentUser?.companyAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Company admin privileges required." 
      });
    }

    // Get target user
    const targetUser = await req.collection.findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
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
      const adminCount = await req.collection.countDocuments({
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
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $unset: { 
          company: "",
          companyAdmin: ""
        },
        $set: {
          linkedClients: []
        }
      }
    );

    // Also remove user from client's linkedUsers array
    const clientCollectionRef = await clientCollection();
    await clientCollectionRef.updateMany(
      { name: currentUser.company },
      { $pull: { linkedUsers: new ObjectId(targetUserId) } }
    );

    res.json({
      success: true,
      message: `${targetUser.firstName} ${targetUser.lastName} removed from company.`,
      data: result
    });

  } catch (err) {
    console.error("❌ Error removing user:", err);
    res.status(500).json({
      success: false,
      message: "Failed to remove user.",
      error: err.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ► GLOBAL ADMIN ROLE MANAGEMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Promote a user to global admin
router.patch("/make-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const forceRefreshTimestamp = new Date();
    
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          role: "Admin",
          forceRefreshAfter: forceRefreshTimestamp
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    // Get the updated user data and generate fresh token
    const updatedUser = await req.collection.findOne(
      { _id: new ObjectId(targetUserId) },
      { projection: { password: 0 } }
    );
    
    // Generate fresh token with updated permissions
    const { generateFreshToken } = require('../utils/tokenUtils');
    const freshToken = generateFreshToken(updatedUser);
    
    res.json({
      success: true,
      message: "User promoted to admin successfully.",
      data: result,
      requiresRefresh: true,
      targetUserId: targetUserId,
      freshToken: freshToken,  // New token with updated permissions
      updatedUser: updatedUser // Fresh user data
    });
  } catch (err) {
    console.error("❌ Error promoting user to admin:", err);
    res.status(500).json({ success: false, message: "Failed to promote user to admin.", error: err.message });
  }
});

// Demote an admin to regular user
router.patch("/remove-admin/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const forceRefreshTimestamp = new Date();
    
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          role: "User",
          forceRefreshAfter: forceRefreshTimestamp
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    res.json({
      success: true,
      message: "Admin demoted to user successfully.",
      data: result,
      requiresRefresh: true,
      targetUserId: targetUserId
    });
  } catch (err) {
    console.error("❌ Error demoting admin:", err);
    res.status(500).json({ success: false, message: "Failed to demote admin.", error: err.message });
  }
});

// Promote a user to estimator
router.patch("/make-estimator/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const forceRefreshTimestamp = new Date();
    
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          role: "Estimator",
          forceRefreshAfter: forceRefreshTimestamp
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    res.json({
      success: true,
      message: "User promoted to estimator successfully.",
      data: result,
      requiresRefresh: true,
      targetUserId: targetUserId
    });
  } catch (err) {
    console.error("❌ Error promoting user to estimator:", err);
    res.status(500).json({ success: false, message: "Failed to promote user to estimator.", error: err.message });
  }
});

// Demote an estimator to regular user
router.patch("/remove-estimator/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const forceRefreshTimestamp = new Date();
    
    const result = await req.collection.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          role: "User",
          forceRefreshAfter: forceRefreshTimestamp
        } 
      }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    res.json({
      success: true,
      message: "Estimator demoted to user successfully.",
      data: result,
      requiresRefresh: true,
      targetUserId: targetUserId
    });
  } catch (err) {
    console.error("❌ Error demoting estimator:", err);
    res.status(500).json({ success: false, message: "Failed to demote estimator.", error: err.message });
  }
});

// Block a user
router.patch("/block-user/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isBlock: true } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    res.json({
      success: true,
      message: "User blocked successfully.",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error blocking user:", err);
    res.status(500).json({ success: false, message: "Failed to block user.", error: err.message });
  }
});

// Unblock a user
router.patch("/unblock-user/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isBlock: false } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    res.json({
      success: true,
      message: "User unblocked successfully.",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error unblocking user:", err);
    res.status(500).json({ success: false, message: "Failed to unblock user.", error: err.message });
  }
});

// Mark a user as deleted (soft delete)
router.patch("/delete-user/:id", authenticateToken(), authenticateAdmin(), validateObjectId, getUserCollection, async (req, res) => {
  try {
    const result = await req.collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isDeleted: true } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    
    res.json({
      success: true,
      message: "User marked as deleted successfully.",
      data: result,
    });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ success: false, message: "Failed to delete user.", error: err.message });
  }
});

// ─── SYNC USER-COMPANY RELATIONSHIPS (Admin only - maintenance endpoint) ────
router.post("/sync-company-relationships", authenticateToken(), authenticateAdmin(), getUserCollection, async (req, res) => {
  try {
    console.log("🔄 Starting user-company relationship sync...");
    
    const users = await req.collection.find({}).toArray();
    const Client = require('../config/Client');
    const clientCollectionRef = await clientCollection();
    
    let syncedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        // If user has linkedClients but no company field, sync it
        if (user.linkedClients && user.linkedClients.length > 0 && !user.company) {
          const clientId = user.linkedClients[0]; // Take first linked client
          const client = await Client.findById(clientId);
          
          if (client) {
            // Update user with company name
            await req.collection.updateOne(
              { _id: user._id },
              { $set: { company: client.name } }
            );
            
            // Ensure client has user in linkedUsers
            await clientCollectionRef.updateOne(
              { _id: client._id },
              { $addToSet: { linkedUsers: user._id } }
            );
            
            syncedCount++;
            console.log(`✅ Synced ${user.email} to ${client.name}`);
          }
        }
        
        // If user has company field but client doesn't have user in linkedUsers, sync it
        if (user.company && user.linkedClients && user.linkedClients.length > 0) {
          const clientId = user.linkedClients[0];
          const client = await Client.findById(clientId);
          
          if (client && !client.linkedUsers?.includes(user._id.toString())) {
            await clientCollectionRef.updateOne(
              { _id: client._id },
              { $addToSet: { linkedUsers: user._id } }
            );
            console.log(`✅ Added ${user.email} to ${client.name} linkedUsers`);
          }
        }
      } catch (err) {
        errorCount++;
        errors.push({ userId: user._id, email: user.email, error: err.message });
        console.error(`❌ Error syncing user ${user.email}:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `Sync completed. ${syncedCount} relationships synced.`,
      syncedCount,
      errorCount,
      errors: errorCount > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("❌ Error syncing relationships:", err);
    res.status(500).json({ success: false, message: "Failed to sync relationships.", error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// TABLE PREFERENCES - Persist UI preferences (column widths, zoom, etc.)
// ═══════════════════════════════════════════════════════════════════════

// Get table preferences for a specific table
router.get("/table-preferences", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const { tableKey } = req.query;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!tableKey) {
      return res.status(400).json({
        success: false,
        message: "tableKey parameter is required"
      });
    }

    const user = await req.collection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { tablePreferences: 1 } }
    );

    const preferences = user?.tablePreferences?.[tableKey] || {
      columnSizing: {},
      sorting: [],
      columnFilters: [],
      zoomLevel: 100
    };

    res.json({
      success: true,
      preferences
    });
  } catch (err) {
    console.error("❌ Error loading table preferences:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load table preferences",
      error: err.message
    });
  }
});

// Save table preferences for a specific table
router.post("/table-preferences", authenticateToken(), getUserCollection, async (req, res) => {
  try {
    const { tableKey, preferences } = req.body;
    const userId = req.user.userId || req.user.id || req.user._id;

    if (!tableKey || !preferences) {
      return res.status(400).json({
        success: false,
        message: "tableKey and preferences are required"
      });
    }

    // Update user's tablePreferences object with the new preferences for this table
    await req.collection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          [`tablePreferences.${tableKey}`]: preferences,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Saved table preferences for user ${userId}, table: ${tableKey}`);

    res.json({
      success: true,
      message: "Table preferences saved successfully"
    });
  } catch (err) {
    console.error("❌ Error saving table preferences:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save table preferences",
      error: err.message
    });
  }
});

// ─── API ENDPOINT: Find User by Email (for Rusty AI auto-assignment) ───────────
router.post("/find-by-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    console.log(`🔍 [Rusty] Looking up user by email: ${email}`);

    // Find user by email (case-insensitive)
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    }).select('_id name email linkedClients');

    if (!user) {
      console.log(`ℹ️ [Rusty] No user found with email: ${email}`);
      return res.status(404).json({
        success: false,
        message: "No user found with this email"
      });
    }

    console.log(`✅ [Rusty] User found: ${user.name} (${user._id})`);
    console.log(`📋 [Rusty] Linked clients: ${user.linkedClients?.length || 0}`);

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        linkedClients: user.linkedClients || []
      }
    });

  } catch (err) {
    console.error("❌ Error finding user by email:", err);
    res.status(500).json({
      success: false,
      message: "Failed to find user",
      error: err.message
    });
  }
});

module.exports = router;
