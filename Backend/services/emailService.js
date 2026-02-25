/**
 * Universal Email Service
 * DRY approach - One simple service that handles all email types
 */

const nodemailer = require('nodemailer');

/**
 * Universal Email Service Class
 * Handles all email sending with one unified method
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializationPromise = null;
    
    // Start initialization
    this.initializationPromise = this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  async initializeTransporter() {
    try {
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('📧 Email service: SMTP credentials not configured, emails will be logged only');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await this.transporter.verify();
      this.isConfigured = true;
      console.log('✅ Email service: SMTP connection verified');
    } catch (error) {
      console.error('❌ Email service: Failed to initialize SMTP connection:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Ensure transporter is ready
   */
  async ensureReady() {
    console.log('🔍 ensureReady: Current state - isConfigured:', this.isConfigured, 'transporter exists:', !!this.transporter);
    
    if (this.initializationPromise) {
      console.log('⏳ Waiting for initial initialization to complete...');
      await this.initializationPromise;
      this.initializationPromise = null;
    }
    
    if (!this.isConfigured) {
      console.log('🔄 Email service: Re-initializing transporter...');
      await this.initializeTransporter();
    }
    
    console.log('🔍 ensureReady: Final state - isConfigured:', this.isConfigured, 'transporter exists:', !!this.transporter);
    return this.isConfigured;
  }

  /**
   * Check if client exists and needs linking notification
   * @param {string} recipientEmail - Email to check
   * @returns {Promise<object|null>} - Client data if needs linking, null otherwise
   */
  async checkClientLinkingStatus(recipientEmail) {
    try {
      const { clientCollection } = require('../db');
      const collection = await clientCollection();
      
      // Find client by main contact email or accounts email
      const client = await collection.findOne({
        $or: [
          { 'mainContact.email': recipientEmail },
          { 'mainContact.accountsEmail': recipientEmail }
        ]
      });
      
      if (!client) {
        console.log(`🔍 No client found for email: ${recipientEmail}`);
        return null;
      }
      
      // Check if client has linked users
      const hasLinkedUsers = client.linkedUsers && client.linkedUsers.length > 0;
      
      if (!hasLinkedUsers && client.adminLinkingCode) {
        console.log(`🔗 Client "${client.name}" exists but has no linked users. Admin code: ${client.adminLinkingCode}`);
        return {
          clientName: client.name,
          adminLinkingCode: client.adminLinkingCode
        };
      }
      
      console.log(`✅ Client "${client.name}" already has linked users or no admin code`);
      return null;
      
    } catch (error) {
      console.error('❌ Error checking client linking status:', error);
      return null; // Don't fail email sending if this check fails
    }
  }

  /**
   * Append linking notification to email HTML
   * @param {string} html - Original HTML content
   * @param {object} linkingData - Client linking information
   * @returns {string} - Modified HTML with linking notification
   */
  appendLinkingNotification(html, linkingData) {
    const linkingNotification = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
        <tr>
          <td align="center">
            <table cellpadding="5" cellspacing="0" border="0" width="600" style="background-color: #e0f2fe; border-radius: 10px; font-family: Arial, sans-serif;">
              <tr>
                <td align="center">
                  <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 12px; font-weight: normal;">🔗 Account Setup Required</h3>
                  <p style="margin: 0 0 5px 0; font-size: 12px; color: #374151; line-height: 1.5; text-align: center;">
                    Don't have a login account yet? Please create one and link it to your existing company 
                    (<strong style="color: #0c4a6e;">${linkingData.clientName}</strong>) using the linking code below:
                  </p>
                  <table cellpadding="15" cellspacing="0" border="0" style="background-color: #ffffff; margin: 0 auto;">
                    <tr>
                      <td align="center">
                        <div style="font-size: 10px; color: #64748b; margin-bottom: 5px; text-transform: uppercase;">ADMIN LINKING CODE</div>
                        <div style="font-family: Courier New, monospace; font-size: 18px; font-weight: bold; color: #0c4a6e;">
                          ${linkingData.adminLinkingCode}
                        </div>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.4; text-align: center;">
                    Use this code when creating your account to automatically link to your company profile.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
    
    // Try to insert after opening body tag, otherwise prepend to beginning
    if (html.includes('<body>')) {
      return html.replace('<body>', '<body>' + linkingNotification);
    } else if (html.includes('<body')) {
      // Handle body tag with attributes
      const bodyTagMatch = html.match(/(<body[^>]*>)/);
      if (bodyTagMatch) {
        return html.replace(bodyTagMatch[1], bodyTagMatch[1] + linkingNotification);
      }
    }
    
    // If no body tag found, prepend to the beginning
    return linkingNotification + html;
  }

  /**
   * UNIVERSAL EMAIL SENDER - Handles ALL email types with data
   * @param {string} recipient - Email recipient
   * @param {object} emailData - All email data and content
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - Email HTML content
   * @param {string} emailData.projectId - Project ID (for token generation if needed)
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Email sending result
   */
  async sendUniversalEmail(recipient, emailData, options = {}) {
    try {
      let { subject, html, projectId } = emailData;

      // Check if client needs linking notification
      const linkingData = await this.checkClientLinkingStatus(recipient);
      if (linkingData) {
        console.log(`🔗 Adding linking notification for client: ${linkingData.clientName}`);
        html = this.appendLinkingNotification(html, linkingData);
      }

      // Generate read-only token if projectId is provided
      if (projectId) {
        const { projectsCollection } = require('../db');
        const { ObjectId } = require('mongodb');
        const crypto = require('crypto');

        try {
          const collection = await projectsCollection();
          const project = await collection.findOne({ _id: new ObjectId(projectId) });

          if (project) {
            const readOnlyToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

            await collection.updateOne(
              { _id: new ObjectId(projectId) },
              { 
                $set: { 
                  readOnlyToken: readOnlyToken,
                  readOnlyTokenExpiresAt: expiresAt,
                  readOnlyTokenCreatedAt: new Date()
                } 
              }
            );

            const frontendUrl = process.env.FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au';
            const projectViewUrl = `${frontendUrl}/project/view/${readOnlyToken}`;

            // Replace project view URL in HTML if placeholder exists
            html = html.replace(/\$\{projectViewUrl\}/g, projectViewUrl);

            console.log(`🔐 Generated read-only token for project ${projectId}: ${projectViewUrl}`);
          }
        } catch (error) {
          console.error('❌ Error generating project token:', error);
          // Continue without token if generation fails
        }
      }

      // Default sender
      const defaultFrom = `"All Roof Take-offs" <${process.env.SMTP_USER}>`;

      // Ensure email service is ready
      const isReady = await this.ensureReady();

      if (!isReady || !this.transporter) {
        console.log('📧 Email would be sent:');
        console.log('📧 To:', recipient);
        console.log('📧 Subject:', subject);
        console.log('📧 From:', options.from || defaultFrom);
        console.log('📧 Content preview:', html.substring(0, 200) + '...');
        
        return {
          success: true,
          messageId: `mock-${Date.now()}`,
          message: 'Email logged (SMTP not configured)'
        };
      }

      const info = await this.transporter.sendMail({
        from: options.from || defaultFrom,
        to: recipient,
        subject,
        html,
        text: options.text || null,
        bcc: 'allrooftakeoffs@gmail.com', // BCC backup email for monitoring
        attachments: options.attachments || []
      });

      console.log('✅ Email sent successfully:', info.messageId);
      console.log('📧 To:', recipient);
      console.log('📧 Subject:', subject);

      return {
        success: true,
        messageId: info.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      throw error;
    }
  }

  // Backward compatibility methods - all use the universal sender
  async sendEstimateComplete(email, data) {
    try {
      // Frontend now sends complete HTML and subject - no backend template needed
      return await this.sendUniversalEmail(email, {
        subject: data.subject,
        html: data.html,
        projectId: data.projectId
      }, {
        attachments: data.attachments || []
      });
    } catch (error) {
      console.error('❌ Error in sendEstimateComplete:', error);
      throw error;
    }
  }

  async sendJobDelayed(email, data) {
    console.log(`📧 Sending job delayed notification to ${email} for project ${data.projectNumber}`);
    // Use template or create simple HTML for job delayed
    const subject = `Job Delayed - ${data.projectAddress || 'Project'} - Ref: ${data.projectNumber || 'N/A'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Job Delayed Notification</h2>
        <p>Dear ${data.contactName || 'Client'},</p>
        <p>We need to inform you that your project <strong>${data.projectAddress || 'Project'}</strong> has been delayed.</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        ${data.newDate ? `<p><strong>New Expected Date:</strong> ${data.newDate}</p>` : ''}
        <p>We apologize for any inconvenience and will keep you updated.</p>
        <p>Best regards,<br>All Roof Take-Offs</p>
      </div>
    `;
    
    return await this.sendUniversalEmail(email, { subject, html, projectId: data.projectId });
  }

  async sendCompanyInvitation(email, data) {
    // Use the professional company invitation template
    const companyInvitationTemplate = require('../templates/emails/company-invitation');
    
    const templateData = {
      company: data.companyName || data.company || 'Your Company',
      linkingCode: data.linkingCode || data.adminLinkingCode || 'CODE',
      companyAdmin: data.companyAdmin || false,
      senderEmail: data.senderEmail || 'system@allrooftakeoffs.com.au',
      frontendUrl: data.frontendUrl || process.env.FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au',
      companyLogoUrl: data.companyLogoUrl || null
    };
    
    const { subject, html } = companyInvitationTemplate(templateData);
    
    return await this.sendUniversalEmail(email, { subject, html });
  }

  async sendWelcomeEmail(email, data) {
    const subject = `Welcome to All Roof Take-Offs`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome!</h2>
        <p>Dear ${data.name || 'User'},</p>
        <p>Welcome to All Roof Take-Offs. We're excited to have you on board!</p>
        <p>Best regards,<br>All Roof Take-Offs</p>
      </div>
    `;
    
    return await this.sendUniversalEmail(email, { subject, html });
  }

  async sendPasswordReset(email, data) {
    const subject = `Password Reset - All Roof Take-Offs`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Dear User,</p>
        <p>You requested a password reset for your account.</p>
        ${data.resetLink ? `<p><a href="${data.resetLink}">Reset Password</a></p>` : ''}
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>All Roof Take-Offs</p>
      </div>
    `;
    
    return await this.sendUniversalEmail(email, { subject, html });
  }

  isReady() {
    return this.isConfigured;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
