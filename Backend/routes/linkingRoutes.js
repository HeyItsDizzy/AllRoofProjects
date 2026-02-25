// routes/linkingRoutes.js
const express = require('express');
const router = express.Router();
const Client = require('../config/Client');

console.log('🟢 [LINKING ROUTES] Module loaded successfully!');

// Use the same email service that works for estimate emails
const emailService = require('../services/emailService');

/**
 * Request linking code by email
 * POST /api/linking/request-linking-code
 */
router.post('/request-linking-code', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('🔍 [LINKING] Request received for email:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('🔍 [LINKING] Searching for company with email:', email.toLowerCase());

    // Search for company by email in contact information
    const company = await Client.findOne({
      $or: [
        { 'mainContact.email': email.toLowerCase() },
        { 'mainContact.accountsEmail': email.toLowerCase() },
        { 'accountManager.email': email.toLowerCase() }
      ]
    });

    console.log('🔍 [LINKING] Company search result:', company ? 'Found' : 'Not found');
    if (company) {
      console.log('🔍 [LINKING] Company name:', company.name);
      console.log('🔍 [LINKING] User linking code:', company.userLinkingCode);
      console.log('🔍 [LINKING] Admin linking code:', company.adminLinkingCode);
      console.log('🔍 [LINKING] Linked users count:', company.linkedUsers ? company.linkedUsers.length : 0);
    }

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'No company found with that email address'
      });
    }

    // Smart linking code selection based on company's user count
    let linkingCode;
    let accessLevel;
    
    // Check if company has linked users
    const hasLinkedUsers = company.linkedUsers && company.linkedUsers.length > 0;
    
    if (!hasLinkedUsers) {
      // No linked users - send admin code (someone needs to be the company admin)
      linkingCode = company.adminLinkingCode;
      accessLevel = 'admin';
      console.log('🔍 [LINKING] No linked users found - sending ADMIN code for company setup');
    } else {
      // Company already has users - send user code
      linkingCode = company.userLinkingCode;
      accessLevel = 'user';
      console.log('🔍 [LINKING] Company has linked users - sending USER code for additional access');
    }
    
    if (!linkingCode) {
      return res.status(404).json({
        success: false,
        message: 'No linking code available for this company'
      });
    }

    // Try to send email using the same service that works for estimate emails
    try {
      console.log('🔧 [LINKING] Attempting to send email to:', email);
      
      const emailData = {
        subject: 'Your All Roof Take-offs Linking Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Your Linking Code</h2>
            <p>Hello,</p>
            <p>Here is your linking code for <strong>${company.name}</strong>:</p>
            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h3 style="font-size: 24px; letter-spacing: 3px; margin: 0; color: #1f2937;">${linkingCode}</h3>
            </div>
            ${accessLevel === 'admin' ? 
              `<div style="background-color: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>🔑 Admin Access:</strong> You're receiving administrative access because this company needs its first admin user. You'll have full management privileges for your company account.</p>
              </div>` :
              `<div style="background-color: #ecfdf5; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #10b981;">
                <p style="margin: 0; color: #047857;"><strong>👤 User Access:</strong> You're receiving standard user access. Your company already has administrators managing the account.</p>
              </div>`
            }
            <p>Use this code to link your account to your company profile in the All Roof Take-offs project management system.</p>
            <p>If you have any questions, please contact our support team at <a href="mailto:support@allrooftakeoffs.com.au">support@allrooftakeoffs.com.au</a></p>
            <p>Best regards,<br/>All Roof Take-offs Team</p>
          </div>
        `
      };

      // Use the same email service that works for estimate emails
      const result = await emailService.sendUniversalEmail(email, emailData);

      console.log('🔧 [LINKING] Email sent successfully to:', email);
      res.json({
        success: true,
        message: `Linking code sent successfully (${accessLevel} access)`,
        companyName: company.name,
        accessLevel: accessLevel
      });
    } catch (emailError) {
      console.log('🔧 [LINKING] Email failed:', emailError.message);
      
      // Email failed, return the linking code directly
      res.json({
        success: true,
        message: `Company found! Your linking code is provided below (${accessLevel} access - email service unavailable)`,
        companyName: company.name,
        linkingCode: linkingCode,
        accessLevel: accessLevel
      });
    }

  } catch (error) {
    console.error('🔴 [LINKING] Request linking code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process linking code request',
      error: error.message
    });
  }
});

/**
 * Send support request for linking code
 * POST /api/linking/send-support-request
 */
router.post('/send-support-request', async (req, res) => {
  try {
    const { companyName, companyEmail, userEmail } = req.body;

    if (!companyName || !companyEmail) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    // Check if email configuration is available
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email configuration not available, logging support request instead');
      
      // Log the support request to console for manual handling
      console.log('=== SUPPORT REQUEST ===');
      console.log('Company Name:', companyName);
      console.log('Company Email:', companyEmail);
      console.log('User Email (original attempt):', userEmail);
      console.log('Request: User needs linking code to connect to their company account.');
      console.log('Timestamp:', new Date().toISOString());
      console.log('=======================');
      
      // Return success even without sending email
      return res.json({
        success: true,
        message: 'Support request logged successfully. Our team will contact you within 24 hours.'
      });
    }

    // Try to send email using the same service that works for estimate emails
    try {
      const supportEmailData = {
        subject: `Linking Code Request - ${companyName}`,
        html: `
          <h2>Linking Code Support Request</h2>
          <p><strong>Company Name:</strong> ${companyName}</p>
          <p><strong>Company Email:</strong> ${companyEmail}</p>
          ${userEmail ? `<p><strong>User Email (original attempt):</strong> ${userEmail}</p>` : ''}
          <p><strong>Request:</strong> User needs linking code to connect to their company account.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `
      };

      const confirmationEmailData = {
        subject: 'Linking Code Request Received',
        html: `
          <h2>Request Received</h2>
          <p>Thank you for your linking code request for <strong>${companyName}</strong>.</p>
          <p>Our support team will get back to you within 24 hours with your linking code.</p>
          <p>If you have any questions, please reply to this email or contact support@allrooftakeoffs.com.au</p>
        `
      };

      // Send to support team
      await emailService.sendUniversalEmail('support@allrooftakeoffs.com.au', supportEmailData);
      
      // Send confirmation to user
      await emailService.sendUniversalEmail(companyEmail, confirmationEmailData);

      res.json({
        success: true,
        message: 'Support request sent successfully'
      });
    } catch (emailError) {
      console.error('Support request email error:', emailError);
      
      // Log the request even if email fails
      console.log('=== SUPPORT REQUEST (EMAIL FAILED) ===');
      console.log('Company Name:', companyName);
      console.log('Company Email:', companyEmail);
      console.log('User Email (original attempt):', userEmail);
      console.log('Error:', emailError.message);
      console.log('Timestamp:', new Date().toISOString());
      console.log('====================================');
      
      res.json({
        success: true,
        message: 'Support request logged successfully. Our team will contact you within 24 hours.'
      });
    }

  } catch (error) {
    console.error('Support request error:', error);
    
    // Log the request even if email fails
    console.log('=== SUPPORT REQUEST (EMAIL FAILED) ===');
    console.log('Company Name:', req.body.companyName);
    console.log('Company Email:', req.body.companyEmail);
    console.log('User Email (original attempt):', req.body.userEmail);
    console.log('Error:', error.message);
    console.log('Timestamp:', new Date().toISOString());
    console.log('====================================');
    
    res.status(500).json({
      success: false,
      message: 'Failed to send support request, but your request has been logged. Our team will contact you within 24 hours.'
    });
  }
});

/**
 * Health check endpoint
 * GET /api/linking/health
 */
router.get('/health', (req, res) => {
  console.log('🟢 [LINKING] Health check endpoint hit!');
  res.json({
    success: true,
    message: 'Linking service is healthy',
    timestamp: new Date().toISOString()
  });
});

console.log('🟢 [LINKING ROUTES] Routes defined successfully!');

module.exports = router;