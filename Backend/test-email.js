// test-email.js - Professional email template test
require('dotenv').config();
const emailService = require('./services/emailService');

async function testProfessionalEmail() {
  console.log('🧪 Testing new professional email template...');
  
  try {
    // Ensure email service is ready
    const isReady = await emailService.ensureReady();
    console.log('📧 Email service ready:', isReady);
    
    if (!isReady) {
      console.log('❌ Email service not ready');
      return;
    }
    
    // Test the new professional company invitation template
    const invitationData = {
      company: 'Acme Roof Plumbing',
      linkingCode: 'TEST123',
      companyAdmin: false,
      senderEmail: 'admin@allrooftakeoffs.com.au',
      frontendUrl: 'https://projects.allrooftakeoffs.com.au',
      companyLogoUrl: '/uploads/avatars/client/66dc6ad08dc1d2f05bd5ad6c_logo.png' // Test with a real company logo path
    };
    
    console.log('� Sending professional invitation email...');
    const result = await emailService.sendCompanyInvitation('allrooftakeoffs@gmail.com', invitationData);
    
    console.log('✅ Professional email result:', result);
    
    if (result.success) {
      console.log('� Professional email sent successfully!');
      console.log('📮 Message ID:', result.messageId);
      console.log('📬 Subject: "Acme Roof Plumbing - Account Access Invitation"');
      console.log('🎯 This should NOT go to spam - check your inbox!');
      console.log('');
      console.log('🔍 Key improvements:');
      console.log('  • No emojis in subject line');
      console.log('  • Professional corporate styling');
      console.log('  • Clear business purpose');
      console.log('  • Formal language and structure');
      console.log('  • Proper sender identification');
    } else {
      console.log('❌ Email failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Email test error:', error.message);
  }
}

// Run the test
testProfessionalEmail();
