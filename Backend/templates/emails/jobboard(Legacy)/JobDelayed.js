/**
 * Job Delayed Email Template
 * Professional email template for notifying clients about project delays
 */

/**
 * Generate job delayed notification email
 * @param {object} data - Template data
 * @param {string} data.clientName - Name of the client receiving the email
 * @param {string} data.projectName - Project name/description
 * @param {string} data.projectNumber - Project number (used as reference)
 * @param {string} data.delayReason - Reason for the delay
 * @param {string} data.newCompletionDate - New expected completion date (formatted)
 * @param {string} data.dayOfWeek - Day of the week for the new completion date
 * @param {string} data.companyLogoUrl - Company's uploaded logo URL (optional)
 * @param {string} data.optionalMessage - Optional personalized message or additional details (optional)
 * @returns {object} - Email subject and HTML content
 */
const jobDelayed = (data) => {
  const { 
    clientName = '', 
    projectName = '', 
    projectNumber = '', 
    delayReason = '', 
    newCompletionDate = '', 
    dayOfWeek = '', 
    companyLogoUrl = null, 
    optionalMessage = '' 
  } = data;
  
  const subject = `Project Update: Delayed Completion - ${projectName} - Ref: ${projectNumber}`;
  
  // Header logo - company logo or fallback to All Roof Takeoffs
  const headerLogoUrl = companyLogoUrl 
    ? `https://projects.allrooftakeoffs.com.au${companyLogoUrl}` 
    : `https://ui-avatars.com/api/?name=All+Roof+Takeoffs&background=009245&color=fff&size=200`;
  
const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Project Update: Delayed Completion - ${projectNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .mobile-padding { padding: 20px 10px !important; }
      .mobile-button { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  
  <!-- Main Container Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px;">
        
        <!-- Email Content Table -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px;">
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 20px;">
                    Dear <strong style="color: #009245;">${contactName || 'Valued Client'}</strong>,
                  </td>
                </tr>
              </table>
              
              <!-- Project Info -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 16px;">
                    We want to update you on the status of your project: <strong style="color: #009245;">${projectAddress || projectName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 20px;">
                    ${delayReason.split('\n\n').map(paragraph => `<p style="margin: 0 0 16px 0;">${paragraph.replace(/\n/g, '<br>')}</p>`).join('')}
                  </td>
                </tr>
              </table>

              <!-- New Completion Date -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F0FDF4; border: 2px solid #009245; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; color: #15803d; padding-bottom: 8px;">
                          New Expected Completion Date:
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 20px; font-weight: bold; color: #15803d;">
                          ${dayOfWeek ? `${dayOfWeek}, ` : ''}${newCompletionDate}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${
                optionalMessage
                  ? `
              <!-- Additional Message -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 16px;">
                    ${optionalMessage.split('\n\n').map(paragraph => `<p style="margin: 0 0 16px 0;">${paragraph.replace(/\n/g, '<br>')}</p>`).join('')}
                  </td>
                </tr>
              </table>`
                  : ''
              }

              <!-- Reference Info -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 25px 0 8px 0;">
                    If you have any <strong style="color: #333333;">Questions or Queries</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 25px;">
                    Please refer to reference number <strong style="color: #009245;"># ${projectNumber}</strong>
                  </td>
                </tr>
              </table>
              
              <!-- Signature -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 30px 0 8px 0;">
                    Thanks and Kind regards
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #009245; padding-bottom: 30px;">
                    Rodney Pedersen
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              
              <!-- Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="https://projects.allrooftakeoffs.com.au/uploads/client/footers/6897d72ebf97092f9f72de77_footer.png" 
                         alt="All Roof Take-offs" 
                         width="300" 
                         style="display: block; width: 300px; max-width: 100%; height: auto; border: 0;">
                  </td>
                </tr>
              </table>
              
              <!-- Contact Info Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; color: #4a5568; padding: 4px 0;">
                          <strong style="color: #2d3748;">ABN:</strong> 28 212 267 152
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; color: #4a5568; padding: 4px 0;">
                          <strong style="color: #2d3748;">Email:</strong> <a href="mailto:requests@allrooftakeoffs.com.au" style="color: #009245; text-decoration: none;">requests@allrooftakeoffs.com.au</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; color: #4a5568; padding: 4px 0;">
                          <strong style="color: #2d3748;">Web:</strong> <a href="https://allrooftakeoffs.com.au/" style="color: #009245; text-decoration: none;">allrooftakeoffs.com.au</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; color: #4a5568; padding: 4px 0;">
                          <strong style="color: #2d3748;">Call:</strong> Between 4:00pm-9:00pm AEST
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; color: #4a5568; padding: 4px 0;">
                          <strong style="color: #2d3748;">WhatsApp:</strong> <a href="https://wa.me/61438399983" style="color: #009245; text-decoration: none; font-weight: bold;">+61 438 399 983</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 13px; color: #718096; font-style: italic; padding: 8px 0 0 0;">
                          (I travel internationally whatsapp will always reach me)
                        </td>
                      </tr>
                    </table>
                    
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

module.exports = jobDelayed;
