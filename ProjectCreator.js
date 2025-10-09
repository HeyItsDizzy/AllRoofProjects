const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ProjectCreator {
  constructor() {
    this.name = 'Project Creator';
    this.backendUrl = process.env.BACKEND_URL;
    this.apiKey = process.env.BACKEND_API_KEY;
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.name}] [${type}] ${message}`);
  }

  /**
   * Create a project in the backend system
   */
  async createProject(projectData) {
    try {
      this.log(`🎯 Creating project: ${projectData.projectName}`);

      const apiPayload = {
        projectName: projectData.projectName,
        clientName: projectData.clientName,
        contactName: projectData.contactName,
        contactEmail: projectData.contactEmail,
        contactPhone: projectData.contactPhone || '',
        projectAddress: projectData.projectAddress,
        projectType: projectData.projectType || 'Residential',
        scope: projectData.scope || '',
        specialInstructions: projectData.specialInstructions || '',
        urgencyLevel: projectData.urgencyLevel || 'Standard',
        estimatedValue: projectData.estimatedValue || 0,
        source: 'Agent Rusty Email Processing',
        tags: ['email-generated', 'agent-rusty'],
        dueDate: projectData.dueDate,
        priority: projectData.priority || 5,
        estimationUnits: projectData.estimationUnits || 1,
        workloadData: projectData.workloadData || {},
        extractedData: projectData.extractedData || {}
      };

      const API_URL = `${this.backendUrl}/api/projects/addProject`;
      this.log(`🔗 API URL: ${API_URL}`);

      const response = await axios.post(API_URL, apiPayload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        timeout: 30000
      });

      if (response.data?.success) {
        const project = response.data.data;
        this.log(`✅ Project created successfully: ${project._id}`);
        this.log(`📊 Project number: ${project.projectNumber}`);

        return {
          success: true,
          projectId: project._id,
          projectNumber: project.projectNumber,
          projectData: project
        };
      } else {
        throw new Error(`API returned success=false: ${response.data?.message || 'Unknown error'}`);
      }

    } catch (error) {
      this.log(`❌ Project creation failed: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save email and attachments to project folder
   */
  async saveProjectFiles(projectId, emailData, attachments = []) {
    try {
      this.log(`💾 Saving files for project: ${projectId}`);

      // Get project folder path from backend
      const pathUrl = `${this.backendUrl}/api/projects/get-project-path/${projectId}`;
      const pathResponse = await axios.get(pathUrl, {
        headers: { 'x-api-key': this.apiKey },
        timeout: 10000
      });

      if (!pathResponse.data?.success) {
        throw new Error('Failed to get project path from backend');
      }

      const projectPath = pathResponse.data.projectPath;
      const scopeFolder = path.join(projectPath, 'Admin');

      // Ensure folder exists
      await fs.mkdir(scopeFolder, { recursive: true });

      // Save email as EML file
      const emlContent = this.buildEmlFile(emailData);
      const emlFilename = `${this.sanitizeFilename(emailData.subject)}_${Date.now()}.eml`;
      const emlPath = path.join(scopeFolder, emlFilename);

      await fs.writeFile(emlPath, emlContent, 'utf8');
      this.log(`📧 Email saved: ${emlFilename}`);

      // Save attachments
      let savedFiles = [emlFilename];
      for (const attachment of attachments) {
        try {
          const filename = this.sanitizeFilename(attachment.filename || 'attachment');
          const filePath = path.join(scopeFolder, filename);
          await fs.writeFile(filePath, attachment.content);
          savedFiles.push(filename);
          this.log(`📎 Attachment saved: ${filename}`);
        } catch (attachError) {
          this.log(`⚠️ Failed to save attachment: ${attachError.message}`, 'WARN');
        }
      }

      return {
        success: true,
        savedFiles: savedFiles,
        projectPath: projectPath
      };

    } catch (error) {
      this.log(`❌ Failed to save project files: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build EML file content from email data
   */
  buildEmlFile(emailData) {
    const headers = [
      `Message-ID: ${emailData.messageId || '<generated@agent-rusty>'}`,
      `Date: ${emailData.date || new Date().toISOString()}`,
      `From: ${this.formatEmailAddress(emailData.from)}`,
      `To: ${this.formatEmailAddress(emailData.to)}`,
      `Subject: ${emailData.subject || 'No Subject'}`,
      `Content-Type: text/plain; charset=utf-8`,
      ''
    ];

    return headers.join('\r\n') + (emailData.text || emailData.html || '');
  }

  /**
   * Format email address for EML
   */
  formatEmailAddress(addressData) {
    if (!addressData) return '';
    if (typeof addressData === 'string') return addressData;
    if (Array.isArray(addressData)) {
      return addressData.map(addr => 
        typeof addr === 'string' ? addr : `${addr.name || ''} <${addr.address || ''}>`
      ).join(', ');
    }
    return `${addressData.name || ''} <${addressData.address || ''}>`;
  }

  /**
   * Sanitize filename for file system
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * Extract project data from email using AI analysis
   */
  async extractProjectDataFromEmail(emailData, aiAgent) {
    try {
      this.log('🤖 Extracting project data from email...');

      const analysisPrompt = `
Analyze this construction project email and extract key information:

Subject: ${emailData.subject}
From: ${this.formatEmailAddress(emailData.from)}
Content: ${emailData.text || emailData.html || ''}

Extract the following information:
1. Project name/description
2. Client company name
3. Contact person name
4. Contact email
5. Contact phone (if mentioned)
6. Project address(es) - handle multiple locations
7. Project type (Residential/Commercial)
8. Project scope and requirements
9. Special instructions or deadlines
10. Urgency level (if mentioned)

Return as JSON format with these keys:
{
  "projectName": "",
  "clientName": "",
  "contactName": "",
  "contactEmail": "",
  "contactPhone": "",
  "projectAddress": "",
  "projectType": "",
  "scope": "",
  "specialInstructions": "",
  "urgencyLevel": "Standard",
  "isJobRequest": true/false
}
`;

      const analysis = await aiAgent.generateResponse(analysisPrompt);
      
      // Try to parse JSON from AI response
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const projectData = JSON.parse(jsonMatch[0]);
        this.log(`✅ Extracted project data: ${projectData.projectName}`);
        return projectData;
      } else {
        throw new Error('Could not extract valid JSON from AI analysis');
      }

    } catch (error) {
      this.log(`❌ Failed to extract project data: ${error.message}`, 'ERROR');
      return null;
    }
  }

  /**
   * Check if email is a job request
   */
  isJobRequest(emailData) {
    const subject = (emailData.subject || '').toLowerCase();
    const content = (emailData.text || emailData.html || '').toLowerCase();
    
    const jobKeywords = [
      'quote', 'quotation', 'estimate', 'pricing', 'project', 'job',
      'roof', 'roofing', 'construction', 'building', 'plans',
      'takeoff', 'tender', 'proposal', 'scope', 'requirements'
    ];

    const spamKeywords = [
      'unsubscribe', 'marketing', 'advertisement', 'promotion',
      'viagra', 'casino', 'lottery', 'winner', 'congratulations'
    ];

    // Check for job-related keywords
    const hasJobKeywords = jobKeywords.some(keyword => 
      subject.includes(keyword) || content.includes(keyword)
    );

    // Check for spam keywords
    const hasSpamKeywords = spamKeywords.some(keyword =>
      subject.includes(keyword) || content.includes(keyword)
    );

    return hasJobKeywords && !hasSpamKeywords;
  }
}

module.exports = ProjectCreator;