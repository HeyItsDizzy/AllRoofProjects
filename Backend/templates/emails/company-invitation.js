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
 * @param {string} data.companyLogoUrl - Company's uploaded logo URL (optional)
 * @param {string} data.companyFooterUrl - Company's uploaded footer image URL (optional)
 * @returns {object} - Email subject and HTML content
 */
const companyInvitation = (data) => {
  const { company, linkingCode, companyAdmin, senderEmail, frontendUrl, companyLogoUrl } = data;
  
  const subject = `${company} - Account Access Invitation`;
  
  // Determine which logo to use in header - company logo from backend uploads (dynamic per company)
  const headerLogoUrl = companyLogoUrl 
    ? `https://projects.allrooftakeoffs.com.au${companyLogoUrl}` 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(company)}&background=009245&color=fff&size=200`;
  
  // Footer logo - use All Roof Takeoffs logo from backend artrepo directory
  const footerLogoUrl = `https://projects.allrooftakeoffs.com.au/uploads/artrepo/SocialMedia_LI2.png`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${company} - Account Access</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #E1E5E5; font-family: Arial, sans-serif; line-height: 1.6; color: #081F13;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #E1E5E5;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border: 1px solid #ddd;">
              
              <!-- Header with Logo -->
              <tr>
                <td style="background-color: #009245; padding: 40px 30px; text-align: center;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <img src="${headerLogoUrl}" 
                             alt="${company} Logo" 
                             height="120"
                             style="max-width: 300px; max-height: 120px; width: auto; height: 120px; display: block; border-radius: 8px;">
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; font-family: Arial, sans-serif;">
                          ${company}
                        </h1>
                        <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 16px; font-family: Arial, sans-serif;">
                          Project Management System
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 20px 0; color: #081F13; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">
                    Account Access Invitation
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; color: #696D7D; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
                    You have been granted access to <strong style="color: #009245;">${company}</strong>'s project management system${companyAdmin ? ' with <strong style="color: #39A1F2;">administrative privileges</strong>' : ''}.
                  </p>
                  
                  <p style="margin: 0 0 30px 0; color: #696D7D; font-size: 16px; line-height: 1.6; font-family: Arial, sans-serif;">
                    To activate your account, please complete the registration process using the access code provided below.
                  </p>
                  
                  <!-- Access Instructions -->
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ebf6f0; border-left: 4px solid #009245; margin: 30px 0;">
                    <tr>
                      <td style="padding: 25px;">
                        <h3 style="margin: 0 0 20px 0; color: #081F13; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif;">
                          Account Setup Instructions
                        </h3>
                        
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td style="padding-bottom: 25px;">
                              <p style="margin: 0 0 10px 0; color: #081F13; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">
                                Step 1: Visit the registration page
                              </p>
                              <p style="margin: 0 0 0 20px; color: #696D7D; font-size: 15px; font-family: Arial, sans-serif;">
                                <a href="${frontendUrl}/register" 
                                   style="color: #39A1F2; text-decoration: underline; font-weight: bold;">
                                  ${frontendUrl}/register
                                </a>
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <p style="margin: 0 0 15px 0; color: #081F13; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">
                                Step 2: Enter your access code during registration
                              </p>
                              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #009245; margin: 15px 0;">
                                <tr>
                                  <td style="padding: 20px;" align="center">
                                    <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2px solid #39A1F2;">
                                      <tr>
                                        <td style="padding: 20px;" align="center">
                                          <span style="font-size: 32px; font-weight: bold; color: #081F13; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                                            ${linkingCode}
                                          </span>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                              <p style="margin: 10px 0 0 0; color: #696D7D; font-size: 14px; font-style: italic; text-align: center; font-family: Arial, sans-serif;">
                                Please copy this code exactly as shown
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Account Details -->
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #E1E5E5; margin: 30px 0;">
                    <tr>
                      <td style="padding: 25px;">
                        <h4 style="margin: 0 0 15px 0; color: #081F13; font-size: 18px; font-weight: bold; font-family: Arial, sans-serif;">
                          Account Details
                        </h4>
                        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 15px; color: #696D7D;">
                          <tr>
                            <td style="padding: 8px 0; width: 140px; font-weight: bold; color: #081F13; font-family: Arial, sans-serif;">Company:</td>
                            <td style="padding: 8px 0; color: #009245; font-weight: bold; font-family: Arial, sans-serif;">${company}</td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #081F13; font-family: Arial, sans-serif;">Access Level:</td>
                            <td style="padding: 8px 0; color: ${companyAdmin ? '#39A1F2' : '#696D7D'}; font-weight: bold; font-family: Arial, sans-serif;">
                              ${companyAdmin ? 'Administrator' : 'Standard User'}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #081F13; font-family: Arial, sans-serif;">Invited by:</td>
                            <td style="padding: 8px 0; font-family: Arial, sans-serif;">${senderEmail}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Call to Action Button -->
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 40px 0;">
                        <table cellpadding="0" cellspacing="0" border="0" style="background-color: #009245;">
                          <tr>
                            <td style="padding: 16px 32px;">
                              <a href="${frontendUrl}/register" 
                                 style="color: white; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                Create Account Now
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ebf6f0; border: 1px solid #009245; margin: 30px 0;">
                    <tr>
                      <td style="padding: 20px;">
                        <p style="margin: 0; color: #081F13; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">
                          <strong style="color: #009245;">Need Help?</strong><br>
                          If you have any questions about this invitation or need assistance with account setup, please contact your system administrator or reply to this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #081F13; padding: 30px; text-align: center;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 15px;">
                        <img src="${footerLogoUrl}" 
                             alt="All Roof Takeoffs" 
                             height="80"
                             style="max-height: 80px; width: auto; opacity: 0.8; display: block;">
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: bold; font-family: Arial, sans-serif;">
                          All Roof Takeoffs - Project Management Platform
                        </p>
                        <p style="margin: 0 0 15px 0; color: #cccccc; font-size: 12px; font-family: Arial, sans-serif;">
                          This invitation was sent by ${senderEmail}
                        </p>
                        <p style="margin: 0; color: #999999; font-size: 11px; font-family: Arial, sans-serif;">
                          This is an automated message from ${company}'s project management system.<br>
                          Please do not reply to this email address.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return { subject, html };
};

module.exports = companyInvitation;
