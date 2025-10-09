// routes/linkingCodeRoutes.js
const express = require('express');
const router = express.Router();
const Client = require('../config/Client');

// Check if email exists in the system (for linking code requests)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email exists in client contacts
    const clientWithEmail = await Client.findOne({
      $or: [
        { 'contact.email': email.toLowerCase() },
        { 'contact.accountsEmail': email.toLowerCase() }
      ]
    });

    if (clientWithEmail) {
      // Email found - you could send the linking code here
      return res.status(200).json({
        success: true,
        message: 'Email found in system',
        clientName: clientWithEmail.name
      });
    } else {
      // Email not found
      return res.status(404).json({
        success: false,
        message: 'Email not found in our system'
      });
    }

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking email'
    });
  }
});

// Request linking code (sends email if found)
router.post('/request-linking-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if email exists in client contacts
    const clientWithEmail = await Client.findOne({
      $or: [
        { 'contact.email': email.toLowerCase() },
        { 'contact.accountsEmail': email.toLowerCase() }
      ]
    });

    if (clientWithEmail) {
      // TODO: Send actual linking code email here
      // For now, just return success
      return res.status(200).json({
        success: true,
        message: 'Linking code sent to email',
        clientName: clientWithEmail.name
      });
    } else {
      // Email not found
      return res.status(404).json({
        success: false,
        message: 'Email not found in our system'
      });
    }

  } catch (error) {
    console.error('Error requesting linking code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while requesting linking code'
    });
  }
});

// Send support request email
router.post('/send-support-request', async (req, res) => {
  try {
    const { companyName, companyEmail, userEmail } = req.body;
    
    if (!companyName || !companyEmail) {
      return res.status(400).json({
        success: false,
        message: 'Company name and email are required'
      });
    }

    // TODO: Integrate with your email system (Rusty SMTP or existing email service)
    // For now, log the request so you can see it in your server logs
    console.log('📧 SUPPORT REQUEST RECEIVED:');
    console.log('Company Name:', companyName);
    console.log('Company Email:', companyEmail);
    console.log('User Email:', userEmail);
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request: User needs linking code for company access');
    console.log('Action Required: Manual verification and linking code generation');
    console.log('---');

    // You can also save this to database for tracking
    // await SupportRequest.create({ companyName, companyEmail, userEmail, type: 'linking_code', createdAt: new Date() });

    return res.status(200).json({
      success: true,
      message: 'Support request logged successfully'
    });

  } catch (error) {
    console.error('Error processing support request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing support request'
    });
  }
});

module.exports = router;