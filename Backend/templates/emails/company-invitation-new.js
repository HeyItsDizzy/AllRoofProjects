/**
 * Company Invitation Email Template
 * Professional email template for inviting users to join companies
 */

/**
 * Generate company invitation email
 * @param {object} data - Template data
 * @param {string} data.company - Company name
 * @param {string} data.linkingCode - Company linking code
 * @param {boolean} data.companyAdmin - Whether user is being invited as admin
 * @param {string} data.senderEmail - Email of the person sending the invitation
 * @param {string} data.frontendUrl - Frontend URL for registration
 * @returns {object} - Email subject and HTML content
 */
const companyInvitation = (data) => {
  const { company, linkingCode, companyAdmin, senderEmail, frontendUrl } = data;
  
  const subject = `${company} - Account Access Invitation`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${company} - Account Access</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background-color: #2c3e50; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: normal;">
            ${company}
          </h1>
          <p style="margin: 8px 0 0 0; color: #bdc3c7; font-size: 14px;">
            Project Management System
          </p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 20px; font-weight: normal;">
            Account Access Invitation
          </h2>
          
          <p style="margin: 0 0 20px 0; color: #555; font-size: 16px;">
            You have been granted access to ${company}'s project management system${companyAdmin ? ' with administrative privileges' : ''}.
          </p>
          
          <p style="margin: 0 0 30px 0; color: #555; font-size: 16px;">
            To activate your account, please complete the registration process using the access code provided below.
          </p>
          
          <!-- Access Instructions -->
          <div style="background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 20px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px; font-weight: normal;">
              Account Setup Instructions
            </h3>
            
            <p style="margin: 0 0 15px 0; color: #555; font-size: 15px;">
              <strong>Step 1:</strong> Visit the registration page
            </p>
            <p style="margin: 0 0 20px 15px; color: #555; font-size: 15px;">
              <a href="${frontendUrl}/register" style="color: #3498db; text-decoration: none; border-bottom: 1px solid #3498db;">
                ${frontendUrl}/register
              </a>
            </p>
            
            <p style="margin: 0 0 10px 0; color: #555; font-size: 15px;">
              <strong>Step 2:</strong> Enter your access code during registration
            </p>
            <div style="background-color: #ffffff; border: 2px solid #e9ecef; padding: 15px; margin: 10px 0; text-align: center;">
              <code style="font-size: 24px; font-weight: bold; color: #2c3e50; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                ${linkingCode}
              </code>
            </div>
            <p style="margin: 10px 0 0 0; color: #777; font-size: 13px; font-style: italic;">
              Please copy this code exactly as shown
            </p>
          </div>
          
          <!-- Account Details -->
          <div style="background-color: #f8f9fa; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 16px; font-weight: normal;">
              Account Details
            </h4>
            <table style="width: 100%; font-size: 14px; color: #555;">
              <tr>
                <td style="padding: 5px 0; width: 120px; font-weight: bold;">Company:</td>
                <td style="padding: 5px 0;">${company}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Access Level:</td>
                <td style="padding: 5px 0;">${companyAdmin ? 'Administrator' : 'Standard User'}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; font-weight: bold;">Invited by:</td>
                <td style="padding: 5px 0;">${senderEmail}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin: 30px 0 0 0; color: #777; font-size: 14px;">
            If you have any questions about this invitation or need assistance with account setup, please contact your system administrator or reply to this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; color: #777; font-size: 12px; text-align: center;">
            This is an automated message from ${company}'s project management system.
          </p>
          <p style="margin: 5px 0 0 0; color: #777; font-size: 12px; text-align: center;">
            Please do not reply to this email address.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
};

module.exports = companyInvitation;
