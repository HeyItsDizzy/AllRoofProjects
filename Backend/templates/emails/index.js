/**
 * Email Templates Manager
 * Centralized email template system for dynamic email generation
 */

const companyInvitation = require('./company-invitation');
const welcomeEmail = require('./welcome-email');
const passwordReset = require('./password-reset');
const EstimateComplete = require('./jobboard/EstimateComplete');
const SendEstimate = require('./jobboard/SendEstimate');
const jobLogged = require('./jobboard/job-logged');
const JobDelayed = require('./jobboard/JobDelayed');
// Import other email templates here as they're created
// const projectNotification = require('./project-notification');

/**
 * Email template registry
 * Add new email templates here for easy access
 */
const emailTemplates = {
  companyInvitation,
  welcomeEmail,
  passwordReset,
  estimateComplete: EstimateComplete,
  sendEstimate: SendEstimate,
  jobLogged,
  jobDelayed: JobDelayed,
  // projectNotification,
};

/**
 * Get an email template by name
 * @param {string} templateName - Name of the email template
 * @param {object} data - Data to pass to the template
 * @returns {object} - Email template with subject and html
 */
const getEmailTemplate = (templateName, data) => {
  const template = emailTemplates[templateName];
  
  if (!template) {
    throw new Error(`Email template "${templateName}" not found`);
  }
  
  return template(data);
};

/**
 * List all available email templates
 * @returns {array} - Array of available template names
 */
const getAvailableTemplates = () => {
  return Object.keys(emailTemplates);
};

module.exports = {
  getEmailTemplate,
  getAvailableTemplates,
  // Export individual templates for direct access if needed
  ...emailTemplates
};
