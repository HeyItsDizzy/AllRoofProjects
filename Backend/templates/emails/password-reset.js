/**
 * Password Reset Email Template
 * Security-focused email template for password reset requests
 */

/**
 * Generate password reset email
 * @param {object} data - Template data
 * @param {string} data.firstName - User's first name
 * @param {string} data.resetToken - Password reset token
 * @param {string} data.frontendUrl - Frontend URL
 * @param {number} data.expiresInMinutes - Token expiry time in minutes (default: 15)
 * @returns {object} - Email subject and HTML content
 */
const passwordReset = (data) => {
  const { firstName, resetToken, frontendUrl, expiresInMinutes = 15 } = data;
  
  const subject = `🔐 Password Reset Request - All Roof Takeoffs`;
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Request</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
            🔐 Password Reset
          </h1>
          <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 16px;">
            Secure your account access
          </p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px;">
          <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">
            Hello ${firstName},
          </h2>
          
          <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password for your All Roof Takeoffs account. If you made this request, click the button below to reset your password.
          </p>
          
          <!-- Security Warning -->
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #b91c1c; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> This link will expire in ${expiresInMinutes} minutes for your security.
            </p>
          </div>
          
          <!-- Reset Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);">
              🔑 Reset My Password
            </a>
          </div>
          
          <!-- Alternative Instructions -->
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <h4 style="margin: 0 0 10px 0; color: #2d3748; font-size: 16px; font-weight: 600;">
              Can't click the button?
            </h4>
            <p style="margin: 0 0 10px 0; color: #4a5568; font-size: 14px;">
              Copy and paste this link into your browser:
            </p>
            <div style="background-color: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all;">
              <code style="font-size: 12px; color: #374151;">${resetUrl}</code>
            </div>
          </div>
          
          <!-- Security Information -->
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 16px; font-weight: 600;">
              🛡️ Didn't request this?
            </h4>
            <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.5;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged, and no further action is needed.
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #2d3748; padding: 30px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #a0aec0; font-size: 14px;">
            All Roof Takeoffs - Project Management Platform
          </p>
          <p style="margin: 0; color: #718096; font-size: 12px;">
            For security reasons, this link expires in ${expiresInMinutes} minutes.
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

module.exports = passwordReset;
