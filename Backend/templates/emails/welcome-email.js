/**
 * Welcome Email Template
 * Welcome email for new users who have successfully registered
 */

/**
 * Generate welcome email
 * @param {object} data - Template data
 * @param {string} data.firstName - User's first name
 * @param {string} data.company - Company name (if applicable)
 * @param {string} data.frontendUrl - Frontend URL
 * @returns {object} - Email subject and HTML content
 */
const welcomeEmail = (data) => {
  const { firstName, company, frontendUrl } = data;
  
  const subject = `🎉 Welcome to All Roof Takeoffs ${company ? `- ${company}` : ''}!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to All Roof Takeoffs</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
            🎉 Welcome, ${firstName}!
          </h1>
          <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">
            You're all set up and ready to go
          </p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
            Account Created Successfully! ✅
          </h2>
          
          <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
            Congratulations! Your account has been created successfully${company ? ` and you're now part of <strong style="color: #2d3748;">${company}</strong>` : ''}.
          </p>
          
          <!-- Quick Actions -->
          <div style="background-color: #f7fafc; padding: 30px; border-radius: 12px; margin: 30px 0;">
            <h3 style="margin: 0 0 20px 0; color: #2d3748; font-size: 20px; font-weight: 600;">
              🚀 Quick Actions
            </h3>
            
            <div style="margin-bottom: 15px;">
              <a href="${frontendUrl}/login" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); margin-right: 10px;">
                🏠 Access Dashboard
              </a>
              ${company ? `
              <a href="${frontendUrl}/company-profile" 
                 style="display: inline-block; background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                🏢 Company Profile
              </a>
              ` : ''}
            </div>
          </div>
          
          <!-- Tips Section -->
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1e40af; font-size: 16px; font-weight: 600;">
              💡 Pro Tips
            </h4>
            <ul style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
              <li>Complete your profile to help your team recognize you</li>
              <li>Explore the dashboard to familiarize yourself with available features</li>
              ${company ? '<li>Check with your team lead about current projects and responsibilities</li>' : ''}
            </ul>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 14px;">
            All Roof Takeoffs - Project Management Platform
          </p>
          <p style="margin: 0; color: #718096; font-size: 12px;">
            Questions? Contact our support team anytime.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;

  return {
    subject,
    html
  };
};

module.exports = welcomeEmail;
