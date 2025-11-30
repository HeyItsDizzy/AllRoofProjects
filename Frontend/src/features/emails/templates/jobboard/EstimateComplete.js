/**
 * EstimateComplete Email Template
 * Professional email template for sending completed project estimates
 */

/**
 * Generate HTML template - DRY version that works for both live and preview
 * @param {object} data - Template data (can be actual values or variable names)
 * @param {string} data.projectAddress - Project address/description
 * @param {string} data.estimateDescription - Description of what the estimate contains
 * @param {string} data.projectNumber - Project number (used as reference)
 * @param {string} data.contactName - Name of the contact person receiving the email
 * @param {string} data.projectViewUrl - Direct URL to view the project with read-only token
 * @param {string} data.optionalBody - Optional personalized message or notes (optional)
 * @param {string} data.memo - Optional memo field (optional)
 * @param {string} data.textColor - Text color for memo content (optional, defaults to #333333)
 * @returns {string} - HTML content
 */
const generateHTML = (data) => {
  const { projectAddress, estimateDescription, projectNumber, contactName, projectViewUrl, optionalBody, memo, textColor = '#333333' } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estimate Complete - ${projectNumber}</title>
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
                    Dear <strong style="color: #009245;">${contactName}</strong>,
                  </td>
                </tr>
              </table>
              
              <!-- Project Info -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 16px;">
                    Please find estimate for - <strong style="color: #009245;">${projectAddress}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 16px;">
                    This estimate contains <strong>${estimateDescription}</strong>
                  </td>
                </tr>
                ${memo ? `
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: ${textColor}; padding-bottom: 16px;">
                    ${memo.split('\n\n').map(paragraph => `<p style="margin: 0 0 16px 0; color: ${textColor};">${paragraph.replace(/\n/g, '<br>')}</p>`).join('')}
                  </td>
                </tr>
                ` : ''}
                ${optionalBody ? `
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding-bottom: 16px;">
                    ${optionalBody}
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Call to Action -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 20px 0 10px 0;">
                    You can view your complete estimate here:
                  </td>
                </tr>
              </table>
              
              <!-- Button - Outlook Compatible -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 20px 0;">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${projectViewUrl}" arcsize="10%" strokecolor="#009245" fillcolor="#009245" style="height: 50px; v-text-anchor: middle; width: 250px;">
                      <w:anchorlock/>
                      <center style="color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold;">
                        View Project Estimate
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${projectViewUrl}" style="background-color: #009245; border: 2px solid #009245; border-radius: 5px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; line-height: 50px; text-align: center; text-decoration: none; width: 250px; -webkit-text-size-adjust: none; mso-hide: all;">
                      View Project Estimate
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              
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
};

// Export raw HTML template for Templates.jsx to use with variable placeholders
export const html = generateHTML({
  projectNumber: '${projectNumber}',
  contactName: '${contactName}',
  projectAddress: '${projectAddress}',
  estimateDescription: '${estimateDescription}',
  projectViewUrl: '${projectViewUrl}',
  optionalBody: '${optionalBody}',
  memo: '${memo}',
  textColor: '${textColor}'
});

/**
 * Generate estimate complete email
 * @param {object} data - Template data
 * @param {string} data.projectAddress - Project address/description
 * @param {string} data.estimateDescription - Description of what the estimate contains
 * @param {string} data.projectNumber - Project number (used as reference)
 * @param {string} data.contactName - Name of the contact person receiving the email
 * @param {string} data.projectViewUrl - Direct URL to view the project with read-only token
 * @param {string} data.companyLogoUrl - Company's uploaded logo URL (optional)
 * @param {string} data.optionalBody - Optional personalized message or notes (optional)
 * @returns {object} - Email subject and HTML content
 */
const EstimateComplete = (data) => {
  const { projectAddress, estimateDescription, projectNumber, contactName, projectViewUrl, companyLogoUrl, optionalBody } = data;
  
  const subject = `${projectNumber} - ${projectAddress} - Estimate Complete`;
  
  // Header logo - company logo or fallback to All Roof Takeoffs
  const headerLogoUrl = companyLogoUrl 
    ? `https://projects.allrooftakeoffs.com.au${companyLogoUrl}` 
    : `https://ui-avatars.com/api/?name=All+Roof+Takeoffs&background=009245&color=fff&size=200`;
  
  // Use the same DRY function but with real data
  const html = generateHTML(data);

  return { subject, html };
};

export default EstimateComplete;
