import React, { useState, useEffect } from 'react';
import { Card, Button, Switch, Input, Form, message, Select, Divider, InputNumber } from 'antd';
import { 
  EyeOutlined, 
  MailOutlined, 
  CopyOutlined,
  FormOutlined,
  UserOutlined,
  HomeOutlined,
  FileTextOutlined,
  MessageOutlined,
  NumberOutlined
} from '@ant-design/icons';
import { basePlanTypes } from '@/shared/planTypes';
import Avatar from '@/shared/Avatar';
import ModalWrapper from '@/components/ModalWrapperSimple';

// Import backend email templates
import EstimateCompleteTemplate from '../features/emails/templates/jobboard/EstimateComplete.js';
import JobDelayedTemplate from '../features/emails/templates/jobboard/JobDelayed.js';
import SendEstimateTemplate from '../features/emails/templates/jobboard/SendEstimate.js';
import CompanyInvitationTemplate from '../features/emails/templates/CompanyInvitation.js';

// Import all jobboard modals dynamically
import EstimateCompleteModal from '../features/emails/modals/jobboard/EstimateCompleteModal';
import JobDelayedModal from '../features/emails/modals/jobboard/JobDelayedModal'; 
import SendEstimateModal from '../features/emails/modals/jobboard/SendEstimateModal';
import InviteUserModal from '../components/InviteUserModal';

/*//Info
- Link ../template/email: EstimateCompleteTemplate  to Modal: EstimateCompleteModal
- Link ../template/email: JobDelayedTemplate        to Modal: JobDelayedModal
- Link ../template/email: SendEstimateTemplate      to Modal: SendEstimateModal
- Link ../template/email: CompanyInvitationTemplate to Modal: InviteUserModal
//*/


const { TextArea } = Input;
const { Option } = Select;

const Templates = () => {
  const [selectedModal, setSelectedModal] = useState('EstimateComplete');
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Modal registry - auto-expandable as you add more modals
  const modalRegistry = {
    'EstimateComplete': {
      name: 'Estimate Complete',
      component: EstimateCompleteModal,
      template: EstimateCompleteTemplate,
      description: 'Professional email sent when project estimates are completed',
      templatePath: 'EstimateComplete.js',
      isActive: true
    },
    'JobDelayed': {
      name: 'Job Delayed',
      component: JobDelayedModal,
      template: JobDelayedTemplate,
      description: 'Notification email when job timelines are delayed',
      templatePath: 'JobDelayed.js',
      isActive: true  // ✅ Activated for Templates page
    },
    'SendEstimate': {
      name: 'Send Estimate',
      component: SendEstimateModal,
      template: SendEstimateTemplate,
      description: 'Initial estimate delivery email to clients',
      templatePath: 'SendEstimate.js',
      isActive: false
    },
    'CompanyInvitation': {
      name: 'Company Invitation',
      component: InviteUserModal,
      template: CompanyInvitationTemplate,
      description: 'Professional invitation email for joining company project management system',
      templatePath: 'CompanyInvitation.js',
      isActive: true
    }
  };

  // Sample project data for modal testing - Multiple realistic projects
  const [availableProjects] = useState([
    {
      _id: "project-25-09029",
      projectNumber: "25-09029",
      name: "16 Darebin St Norlane",
      PlanType: "Townhouses - $100 hr",
      Qty: 4.0,
      location: { address: "16 Darebin St, Norlane VIC 3220" },
      clientName: "Jake Randall",
      clientEmail: "jake@acmeroofplumbing.com"
    },
    {
      _id: "project-25-09030", 
      projectNumber: "25-09030",
      name: "142 Collins Street Melbourne",
      PlanType: "Complex",
      Qty: 6.5,
      location: { address: "142 Collins Street, Melbourne VIC 3000" },
      clientName: "Sarah Johnson", 
      clientEmail: "sarah@johnsonroofing.com"
    },
    {
      _id: "project-25-09031",
      projectNumber: "25-09031", 
      name: "88 Boundary Road Geelong",
      PlanType: "Standard",
      Qty: 3.0,
      location: { address: "88 Boundary Road, Geelong VIC 3220" },
      clientName: "Mike Wilson",
      clientEmail: "mike.wilson@wilsonbuilding.com"
    },
    {
      _id: "project-25-08045",
      projectNumber: "25-08045",
      name: "Lot 205 Heritage Estate Torquay", 
      PlanType: "Townhouses - $100 hr",
      Qty: 2.5,
      location: { address: "Lot 205 Heritage Estate, Torquay VIC 3228" },
      clientName: "Lisa Chen",
      clientEmail: "lisa.chen@coastalbuilders.com.au"
    },
    {
      _id: "project-25-07018",
      projectNumber: "25-07018",
      name: "34 Brighton Beach Road Brighton",
      PlanType: "Manual Price", 
      Qty: 1.0,
      location: { address: "34 Brighton Beach Road, Brighton VIC 3186" },
      clientName: "David Thompson",
      clientEmail: "david@brightonhomes.com.au"
    }
  ]);

  // Current selected project (default to first one)
  const [sampleProject, setSampleProject] = useState(availableProjects[0]);

  // Sample clients data for avatar selection
  const [sampleClients] = useState([
    {
      _id: "client-1",
      name: "John Smith",
      company: "Smith Construction",
      email: "john.smith@example.com",
      avatar: null,
      linkedUsers: ["user-1", "user-2"],
      mainContact: {
        name: "John Smith",
        email: "john.smith@smithconstruction.com",
        phone: "0412345678",
        accountsEmail: "john.smith@smithconstruction.com"
      }
    },
    {
      _id: "client-2", 
      name: "Sarah Johnson",
      company: "Johnson Roofing",
      email: "sarah@johnsonroofing.com",
      avatar: null,
      linkedUsers: ["user-3"],
      mainContact: {
        name: "Sarah Johnson",
        email: "sarah@johnsonroofing.com",
        phone: "0423456789",
        accountsEmail: "sarah@johnsonroofing.com"
      }
    },
    {
      _id: "client-3",
      name: "Mike Wilson", 
      company: "Wilson Building Co",
      email: "mike.wilson@wilsonbuilding.com",
      avatar: null,
      linkedUsers: ["user-4", "user-5"],
      mainContact: {
        name: "Mike Wilson",
        email: "mike.wilson@wilsonbuilding.com",
        phone: "0434567890",
        accountsEmail: "mike.wilson@wilsonbuilding.com"
      }
    }
  ]);

  // Sample linked users data
  const [sampleUsers] = useState([
    {
      _id: "user-1",
      firstName: "John",
      lastName: "Smith",
      name: "John Smith",
      email: "john.smith@smithconstruction.com",
      avatar: null
    },
    {
      _id: "user-2", 
      firstName: "Mary",
      lastName: "Smith",
      name: "Mary Smith",
      email: "mary.smith@smithconstruction.com",
      avatar: null
    },
    {
      _id: "user-3",
      firstName: "Sarah",
      lastName: "Johnson",
      name: "Sarah Johnson",
      email: "sarah@johnsonroofing.com",
      avatar: null
    },
    {
      _id: "user-4",
      firstName: "Mike",
      lastName: "Wilson",
      name: "Mike Wilson",
      email: "mike.wilson@wilsonbuilding.com",
      avatar: null
    },
    {
      _id: "user-5",
      firstName: "Lisa",
      lastName: "Wilson",
      name: "Lisa Wilson",
      email: "lisa.wilson@wilsonbuilding.com",
      avatar: null
    }
  ]);

  // State for preview client/user selection
  const [previewSelectedClient, setPreviewSelectedClient] = useState(null);
  const [previewLinkedUsers, setPreviewLinkedUsers] = useState([]);

  // Sample data for email preview - EXACT SAME PROPS AS REAL BACKEND TEMPLATE
  const [sampleData, setSampleData] = useState({
    // Props that backend template expects (EstimateComplete.js) - USE DESCRIPTIVE PLACEHOLDERS
    projectAddress: "${projectAddress}", // Will be populated by modal form
    estimateDescription: "${estimateDescription}", // Will be populated by modal form
    projectNumber: "25-09029", // Will be updated when project changes
    contactName: "${contactName}", // Will be populated when client/user selected (backend expects contactName)
    projectViewUrl: "https://projects.allrooftakeoffs.com.au/project/view/sample-token", // Static preview URL
    companyLogoUrl: null, // Always null in current system
    optionalBody: "${optionalBody}", // Will be populated by modal form
    memo: "${memo}", // Will be populated by modal form
    qty: "${qty}", // Will be populated by modal form
    
    // Company invitation template props
    company: {
      id: '507f1f77bcf86cd799439011',
      name: 'AllRoofs',
      logo: 'https://allroofs.com.au/wp-content/uploads/2024/03/AllRoofs-logo.png',
      plan: 'PREMIUM'
    },
    invitedUserName: 'Sarah Johnson',
    invitedUserEmail: 'sarah.johnson@email.com',
    linkingCode: 'AR-2025-7891',
    frontendUrl: 'https://projects.allrooftakeoffs.com.au',
    adminUser: {
      name: 'John Smith',
      email: 'admin@allroofs.com.au',
      role: 'admin'
    },
    isAdminInvite: false
  });

  // NEW: Use actual backend templates with proper undefined handling
  const generateEmailFromTemplate = (modalKey, data) => {
    const modalConfig = modalRegistry[modalKey];
    if (!modalConfig) {
      return null;
    }

    try {
      // Use the actual template function for all templates - this is now DRY!
      if (modalConfig.template) {
        return modalConfig.template(data);
      }
      
      return null;
    } catch (error) {
      console.error(`Error generating email from template ${modalKey}:`, error);
      return null;
    }
  };

  const handleCopyHTML = () => {
    const emailData = generateEmailFromTemplate(selectedModal, sampleData);
    if (emailData) {
      navigator.clipboard.writeText(emailData.html);
      message.success('HTML copied to clipboard!');
    } else {
      message.info('Email template not available for this modal');
    }
  };

  const handleSampleDataUpdate = (field, value) => {
    setSampleData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSampleProjectUpdate = (field, value) => {
    setSampleProject(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCurrentModal = () => modalRegistry[selectedModal];

  // Mock modal close handler
  const mockOnClose = () => {
    console.log('Modal close triggered (preview mode)');
  };

  // Handle form changes from modal - SINGLE SOURCE OF TRUTH
  const handleModalFormChange = (formValues) => {
    console.log('[DEBUG] Form values changed in Templates.jsx:', formValues);
    console.log('[DEBUG] Templates.jsx received keys:', Object.keys(formValues));
    console.log('[DEBUG] Templates.jsx contactName:', formValues.contactName);
    console.log('[DEBUG] Templates.jsx contactEmail:', formValues.contactEmail);
    
    // Calculate estimateDescription like the live modal does
    let estimateDescription = "${estimateDescription}"; // Default placeholder
    
    if (formValues.planType && formValues.qty) {
      // Find the selected plan type
      const selectedPlanType = basePlanTypes.find(plan => plan.label === formValues.planType);
      
      if (selectedPlanType) {
        const { label, uom } = selectedPlanType;
        
        // Check if this is Manual Price (no UOM or Manual Price label)
        if (label === 'Manual Price' || !uom) {
          // For Manual Price: "1x $[amount] Manual Price"
          const amount = formValues.qty || 0;
          estimateDescription = `1x $${amount} Manual Price`;
        } else if (formValues.qty) {
          if (uom === 'ea') {
            // For "ea" UOM: "[QTY]x [label]"
            estimateDescription = `${formValues.qty}x ${label}`;
          } else if (uom === 'hr') {
            // For "hr" UOM: "[QTY] hr [label]"
            const hourText = formValues.qty === 1 ? 'hr' : 'hrs';
            estimateDescription = `${formValues.qty} ${hourText} ${label}`;
          } else {
            // For other UOMs: "[QTY] [UOM] [label]"
            estimateDescription = `${formValues.qty} ${uom} ${label}`;
          }
        }
      }
    }
    
    // Use form values directly - no duplication, single source of truth
    setSampleData(prev => ({
      ...prev,
      ...formValues, // Use form values directly from modal wrapper
      estimateDescription: estimateDescription // Add calculated estimateDescription
    }));
  };

  // Generate email data from current sample data (which comes from modal wrapper)
  const emailData = generateEmailFromTemplate(selectedModal, sampleData);  // Render the selected modal using the wrapper
  const renderModalPreview = () => {
    const modalConfig = getCurrentModal();
    if (!modalConfig) return null;
    
    return (
      <div className="h-full">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FormOutlined className="text-green-600" />
            {modalConfig.name} - Modal Design
          </h3>
          <p className="text-sm text-gray-600 mt-1">{modalConfig.description}</p>
        </div>
        
        {/* Use Modal Wrapper - KISS approach */}
        <div className="h-full overflow-auto">
          {modalConfig.isActive ? (
            <ModalWrapper
              ModalComponent={modalConfig.component}
              project={sampleProject}
              testClients={sampleClients}
              testUsers={sampleUsers}
              onFormChange={handleModalFormChange}
            />
          ) : (
            <div className="text-center py-8 text-gray-400">
              <FormOutlined className="text-4xl mb-4" />
              <p className="text-lg">Modal not yet active</p>
              <p className="text-sm">This template is under development</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 min-h-screen flex flex-col bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates & Modals</h1>
          <p className="text-gray-600 mt-1">Preview email templates and their corresponding modals</p>
        </div>
        <div className="flex gap-3">
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopyHTML}
            className="border-green-300 text-green-700 hover:bg-green-50"
            disabled={!emailData}
          >
            Copy HTML
          </Button>
        </div>
      </div>

      {/* Main Layout - 2x2 Grid with auto-sizing rows */}
      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0 mb-12" style={{ gridTemplateRows: 'auto 1fr' }}>
        {/* Top Left - Modal Selector */}
        <Card className="flex flex-col">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Email Modal
              </label>
              <Select
                value={selectedModal}
                onChange={setSelectedModal}
                className="w-full"
                size="large"
              >
                {Object.entries(modalRegistry).map(([key, modal]) => (
                  <Option key={key} value={key}>
                    <div className="flex items-center justify-between">
                      <span>{modal.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${modal.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {modal.isActive ? 'Active' : 'In Dev'}
                      </span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>{getCurrentModal()?.name}</strong>
              <br />
              {getCurrentModal()?.description}
            </div>
          </div>
        </Card>

        {/* Top Right - Project Selector */}
        <Card className="flex flex-col">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Sample Project
                </label>
                <Button 
                  type="primary"
                  size="small"
                  onClick={() => {
                    // Reset to default values to see raw template placeholders
                    setSampleProject({
                      projectNumber: "${projectNumber}",
                      name: "${projectName}",
                      PlanType: "${planType}",
                      Qty: "${qty}",
                      location: { address: "${projectAddress}" }
                    });
                    setSampleData({
                      projectNumber: "${projectNumber}",
                      projectName: "${projectName}",
                      projectAddress: "${projectAddress}",
                      contactName: "${contactName}",
                      contactEmail: "${contactEmail}",
                      estimateDescription: "${estimateDescription}",
                      optionalBody: "${optionalBody}",
                      memo: "${memo}"
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Clear / Show Raw
                </Button>
              </div>
              <Select
                value={sampleProject.projectNumber}
                onChange={(projectNumber) => {
                  const selectedProject = availableProjects.find(p => p.projectNumber === projectNumber);
                  if (selectedProject) {
                    setSampleProject(selectedProject);
                    
                    // Generate estimateDescription based on project's Qty and PlanType (same logic as modal)
                    let estimateDescription = "roof estimate with material quantities and measurements";
                    
                    if (selectedProject.Qty && selectedProject.PlanType) {
                      const planType = basePlanTypes.find(type => type.label === selectedProject.PlanType);
                      const planTypeUOM = planType ? planType.uom : '';
                      
                      // Check if this is a manual price entry
                      const isManualPrice = selectedProject.PlanType === 'Manual Price' || planTypeUOM === '';
                      
                      if (!isManualPrice) {
                        // Transform UOM for UI display (same logic as EstimateCompleteModal)
                        const getDisplayUOM = (uom, quantity) => {
                          if (uom === 'ea') return 'x';
                          if (uom === 'hr') {
                            const qty = parseFloat(quantity) || 0;
                            return qty === 1 ? 'Hr' : 'Hrs';
                          }
                          return uom; // Return as-is for other UOMs
                        };
                        
                        const displayUOM = getDisplayUOM(planTypeUOM, selectedProject.Qty);
                        estimateDescription = `${selectedProject.Qty || ''} ${displayUOM} - roof estimate with material quantities and measurements`.trim();
                      }
                    }
                    
                    // Update sample data with project details for email template
                    setSampleData(prev => ({
                      ...prev,
                      projectNumber: selectedProject.projectNumber,
                      projectName: selectedProject.name,
                      projectAddress: selectedProject.location?.address || selectedProject.name || '',
                      estimateDescription: estimateDescription
                    }));
                  }
                }}
                className="w-full"
                size="large"
              >
                {availableProjects.map((project) => (
                  <Option key={project.projectNumber} value={project.projectNumber}>
                    <span className="font-medium">
                      {project.projectNumber} - {project.name}
                    </span>
                  </Option>
                ))}
              </Select>
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>Current Project:</strong> {sampleProject.projectNumber} - {sampleProject.name}
              <br />
              <span className="text-xs text-gray-500">
                {sampleProject.PlanType} • QTY: {sampleProject.Qty} • {sampleProject.location.address}
              </span>
            </div>
          </div>
        </Card>

        {/* Bottom Left - Modal Preview */}
        <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full h-full overflow-auto">
            <Card 
              title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FormOutlined className="text-green-600" />
                    Modal Input Design
                  </div>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => setModalVisible(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Open Live Modal
                  </Button>
                </div>
              }
              className="border-0 shadow-none h-full"
              bodyStyle={{ height: 'calc(100% - 60px)', overflow: 'auto' }}
            >
              <div className="h-full">
                {renderModalPreview()}
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Right - HTML Email Preview */}
        <Card 
          title={
            <div className="flex items-center gap-2">
              <EyeOutlined className="text-green-600" />
              HTML Email Preview
            </div>
          }
          className="flex flex-col"
          bodyStyle={{ height: 'calc(100% - 60px)', display: 'flex', flexDirection: 'column' }}
        >
          {emailData ? (
            <div className="flex-1 flex flex-col">
              {/* Mock Email Header - Preview Only */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 text-sm">
                <div className="mb-2">
                  <strong className="text-gray-700">From:</strong> All Roof Take-Offs AU &lt;requests@allrooftakeoffs.com.au&gt;
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">To:</strong> {sampleData.contactName || '${contactName}'} &lt;{sampleData.contactEmail || '${contactEmail}'}&gt;
                </div>
                <div className="mb-2">
                  <strong className="text-gray-700">Subject:</strong> {emailData.subject}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('en-AU', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              {/* Email Body Preview */}
              <div className="flex-1 border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={emailData.html}
                  className="w-full h-full border-0"
                  title="Email Preview"
                />
              </div>
              <div className="mt-3 text-xs text-gray-500 flex-shrink-0">
                Preview updates automatically as you interact with the modal on the left.
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MailOutlined className="text-4xl mb-4" />
                <p className="text-lg">No Email Preview Available</p>
                <p className="text-sm">Select an active modal to see email preview</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Live Modal for Testing */}
      {selectedModal === 'EstimateComplete' && (
        <EstimateCompleteModal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          project={sampleProject}
        />
      )}
      
      {selectedModal === 'JobDelayed' && (
        <JobDelayedModal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          project={sampleProject}
        />
      )}
    </div>
  );
};

export default Templates;
