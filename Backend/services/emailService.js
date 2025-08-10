/**
 * Email Service
 * Centralized email sending service with template support
 */

const nodemailer = require('nodemailer');
const { getEmailTemplate } = require('../templates/emails');

/**
 * Email Service Class
 * Handles email configuration and sending
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializationPromise = null;
    
    // Start initialization but don't wait for it
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
        secure: true, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('✅ Email service: SMTP connection verified');
    } catch (error) {
      console.error('❌ Email service: Failed to initialize SMTP connection:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Ensure transporter is ready before sending
   */
  async ensureReady() {
    console.log('🔍 ensureReady: Current state - isConfigured:', this.isConfigured, 'transporter exists:', !!this.transporter);
    
    // Wait for initial initialization if it's still running
    if (this.initializationPromise) {
      console.log('⏳ Waiting for initial initialization to complete...');
      await this.initializationPromise;
      this.initializationPromise = null;
    }
    
    if (!this.isConfigured) {
      console.log('🔄 Email service: Re-initializing transporter...');
      console.log('🔍 Environment check:');
      console.log('  SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
      console.log('  SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
      console.log('  SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
      console.log('  SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
      
      await this.initializeTransporter();
    }
    
    console.log('🔍 ensureReady: Final state - isConfigured:', this.isConfigured, 'transporter exists:', !!this.transporter);
    return this.isConfigured;
  }

  /**
   * Send email using a template
   * @param {string} templateName - Name of the email template
   * @param {object} templateData - Data to pass to the template
   * @param {string} recipient - Email recipient
   * @param {object} options - Additional email options
   * @returns {Promise<object>} - Email sending result
   */
  async sendTemplateEmail(templateName, templateData, recipient, options = {}) {
    try {
      // Get email template
      const { subject, html } = getEmailTemplate(templateName, templateData);

      // Send email
      return await this.sendEmail({
        to: recipient,
        subject,
        html,
        ...options
      });
    } catch (error) {
      console.error(`❌ Failed to send ${templateName} email to ${recipient}:`, error.message);
      throw error;
    }
  }

  /**
   * Send raw email
   * @param {object} emailOptions - Email options
   * @param {string} emailOptions.to - Recipient email
   * @param {string} emailOptions.subject - Email subject
   * @param {string} emailOptions.html - Email HTML content
   * @param {string} emailOptions.text - Email text content (optional)
   * @param {string} emailOptions.from - Sender email (optional)
   * @returns {Promise<object>} - Email sending result
   */
  async sendEmail(emailOptions) {
    const { to, subject, html, text, from } = emailOptions;

    // Default sender
    const defaultFrom = `"All Roof Takeoffs" <${process.env.SMTP_USER}>`;

    // Ensure email service is ready
    const isReady = await this.ensureReady();

    if (!isReady || !this.transporter) {
      // Log email instead of sending if not configured
      console.log('📧 Email would be sent:');
      console.log('📧 To:', to);
      console.log('📧 Subject:', subject);
      console.log('📧 From:', from || defaultFrom);
      console.log('📧 Content preview:', html.substring(0, 200) + '...');
      
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        message: 'Email logged (SMTP not configured)'
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: from || defaultFrom,
        to,
        subject,
        html,
        text: text || null, // Optional text version
      });

      console.log('✅ Email sent successfully:', info.messageId);
      console.log('📧 To:', to);
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

  /**
   * Send company invitation email
   * @param {string} email - Recipient email
   * @param {object} data - Invitation data
   * @returns {Promise<object>} - Email sending result
   */
  async sendCompanyInvitation(email, data) {
    return await this.sendTemplateEmail('companyInvitation', data, email);
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email
   * @param {object} data - Welcome data
   * @returns {Promise<object>} - Email sending result
   */
  async sendWelcomeEmail(email, data) {
    return await this.sendTemplateEmail('welcomeEmail', data, email);
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {object} data - Reset data
   * @returns {Promise<object>} - Email sending result
   */
  async sendPasswordReset(email, data) {
    return await this.sendTemplateEmail('passwordReset', data, email);
  }

  /**
   * Check if email service is ready
   * @returns {boolean} - Service configuration status
   */
  isReady() {
    return this.isConfigured;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
