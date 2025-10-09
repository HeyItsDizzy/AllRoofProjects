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
  const { clientName, projectName, projectNumber, delayReason, newCompletionDate, dayOfWeek, companyLogoUrl, optionalMessage } = data;
  
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
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%; max-width:600px; background-color:#FFFFFF;">
          <!-- Header: logo only, subtle spacing -->
          <tr>
            <td align="center" style="padding:18px 20px;">
              <img src="${headerLogoUrl}"
                   alt="All Roof Takeoffs"
                   width="150"
                   style="display:block; width:150px; height:auto; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px 8px 24px;">
              <h2 style="margin:0 0 16px 0; color:#dc2626; font-size:22px; font-weight:bold; line-height:1.3; font-family:Arial, sans-serif;">
                Heads Up!<br>
                It's in the Queue!
              </h2>

              <p style="margin:0 0 16px 0; color:#4B5563; font-size:15px; line-height:1.6; font-family:Arial, sans-serif;">
                ${clientName ? `Dear ${clientName},` : 'Hello,'}
              </p>

              <p style="margin:0 0 16px 0; color:#4B5563; font-size:15px; line-height:1.6; font-family:Arial, sans-serif;">
                We have received a large influx of work recently, and as a result, we have a longer than normal lead time.
              </p>

              <!-- Delay Reason Box -->
              <div style="margin:20px 0; padding:16px 18px; background-color:#FEF2F2; border-left:4px solid #dc2626; border-radius:0;">
                <p style="margin:0 0 8px 0; color:#7f1d1d; font-size:15px; font-weight:bold;">Reason for delay:</p>
                <p style="margin:0; color:#991b1b; font-size:15px; line-height:1.6;">
                  ${delayReason}
                </p>
              </div>

              <!-- New Completion Date -->
              <div style="margin:24px 0; padding:18px; background-color:#F0FDF4; border:2px solid #16a34a; border-radius:8px; text-align:center;">
                <p style="margin:0 0 8px 0; color:#15803d; font-size:16px; font-weight:bold;">
                  You can expect this to be completed by:
                </p>
                <p style="margin:0; color:#15803d; font-size:20px; font-weight:bold; line-height:1.4;">
                  The morning of ${dayOfWeek}, ${newCompletionDate}
                </p>
              </div>

              ${
                optionalMessage
                  ? `
              <!-- Optional message -->
              <div style="margin:20px 0; padding:14px 16px; background-color:#F8FFFE; border-left:3px solid #009245; border-radius:0;">
                <p style="margin:0; color:#4B5563; font-size:15px; line-height:1.6; font-family:Arial, sans-serif; white-space:pre-wrap;">
                  ${optionalMessage}
                </p>
              </div>`
                  : ''
              }

              <div style="margin:20px 0; padding:14px 16px; background-color:#F8FAFB; border-left:4px solid #009245;">
                <p style="margin:0 0 6px 0; color:#081F13; font-size:15px; font-weight:bold;">Questions or Queries?</p>
                <p style="margin:0; color:#4B5563; font-size:15px; line-height:1.6;">
                  Please refer to reference number: <strong style="color:#009245;">#${projectNumber}</strong>
                </p>
              </div>

              <p style="margin:20px 0 8px 0; color:#4B5563; font-size:15px; line-height:1.6;">
                Thanks and Kind regards,<br>
                <strong style="color:#081F13;">Rodney Pedersen</strong>
              </p>

              <!-- Contact card, subtle -->
              <div style="margin:14px 0 6px 0; padding:12px 14px; border:1px solid #E5E7EB; border-radius:6px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:2px 0; color:#081F13; font-size:13px; font-family:Arial, sans-serif;">
                      <strong>ABN:</strong> 28 212 267 152
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0; color:#081F13; font-size:13px; font-family:Arial, sans-serif;">
                      <strong>Email:</strong> <a href="mailto:requests@allrooftakeoffs.com.au" style="color:#009245; text-decoration:none;">requests@allrooftakeoffs.com.au</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0; color:#081F13; font-size:13px; font-family:Arial, sans-serif;">
                      <strong>Website:</strong> <a href="https://allrooftakeoffs.com.au/" style="color:#009245; text-decoration:none;">https://allrooftakeoffs.com.au/</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0; color:#081F13; font-size:13px; font-family:Arial, sans-serif;">
                      <strong>Call:</strong> Between 4:00pm–9:00pm AEST
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0; color:#081F13; font-size:13px; font-family:Arial, sans-serif;">
                      <strong>WhatsApp:</strong> +61 438 399 983
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0; color:#6B7280; font-size:12px; font-style:italic; font-family:Arial, sans-serif;">
                      (I travel internationally — WhatsApp will always reach me)
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Footer: single subtle line -->
          <tr>
            <td align="center" style="padding:18px 20px; background-color:#FAFAFA; border-top:1px solid #E5E7EB;">
              <p style="margin:0; color:#9CA3AF; font-size:12px; font-family:Arial, sans-serif;">
                All Roof Takeoffs — Professional Roof Takeoff Services
              </p>
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

module.exports = jobDelayed;
