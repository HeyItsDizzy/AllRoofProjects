/**
 * Job Delayed Email Template
 * Professional email template for notifying clients about project delays
 */

/**
 * Generate job delayed notification email
 * @param {object} data - Template data
 * @param {string} data.contactName - Name of the client receiving the email (updated from clientName)
 * @param {string} data.projectAddress - Project address/description (updated for consistency)
 * @param {string} data.projectName - Project name/description (fallback)
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
    contactName, 
    projectAddress, 
    projectName, 
    projectNumber, 
    delayReason, 
    newCompletionDate, 
    dayOfWeek, 
    companyLogoUrl, 
    optionalMessage 
  } = data;
  
  const subject = `Project Update: Delayed Completion - ${projectAddress || projectName} - Ref: ${projectNumber}`;
  
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
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family:Arial, sans-serif; line-height:1.6; color:#081F13;">
  <!-- Preheader (hidden) -->
  <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
    Update on ${projectName} - new completion date: ${newCompletionDate}. Ref #${projectNumber}.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F3F4F6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!-- Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px;">
          
          <!-- Header: logo only, subtle spacing -->
          <tr>
            <td align="center" style="padding: 30px 20px 20px 20px;">
              <img src="${headerLogoUrl}"
                   alt="All Roof Takeoffs"
                   width="150"
                   style="display: block; width: 150px; height: auto; border: 0; outline: none; text-decoration: none;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;">
              
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
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 16px 0;">
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

              
              <!-- Contact Information -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #666666; padding-bottom: 12px;">
                          <strong style="color: #333333;">Contact Information:</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #666666; padding: 2px 0;">
                          <strong>ABN:</strong> 28 212 267 152
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #666666; padding: 2px 0;">
                          <strong>Email:</strong> <a href="mailto:requests@allrooftakeoffs.com.au" style="color: #009245; text-decoration: none;">requests@allrooftakeoffs.com.au</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #666666; padding: 2px 0;">
                          <strong>Website:</strong> <a href="https://allrooftakeoffs.com.au/" style="color: #009245; text-decoration: none;">allrooftakeoffs.com.au</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #666666; padding: 2px 0;">
                          <strong>Call:</strong> Between 4:00pm–9:00pm AEST
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #666666; padding: 2px 0;">
                          <strong>WhatsApp:</strong> +61 438 399 983
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #999999; padding: 8px 0 0 0; font-style: italic;">
                          (I travel internationally — WhatsApp will always reach me)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #f8f9fa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #999999; text-align: center;">
                    All Roof Takeoffs — Professional Roof Takeoff Services
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!-- /Container -->
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, html };
};

export default jobDelayed;
