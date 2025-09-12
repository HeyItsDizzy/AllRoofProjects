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
import EstimateCompleteTemplate, { html as EstimateCompleteHTML } from '../features/emails/templates/jobboard/EstimateComplete.js';
import JobDelayedTemplate from '../features/emails/templates/jobboard/JobDelayed.js';
import SendEstimateTemplate from '../features/emails/templates/jobboard/SendEstimate.js';

// Import all jobboard modals dynamically
import EstimateCompleteModal from '../features/emails/modals/jobboard/EstimateCompleteModal';
import JobDelayedModal from '../features/emails/modals/jobboard/JobDelayedModal'; 
import SendEstimateModal from '../features/emails/modals/jobboard/SendEstimateModal';

/*//Info
- Link ../template/email: EstimateCompleteTemplate  to Modal: EstimateCompleteModal
- Link ../template/email: JobDelayedTemplate        to Modal: JobDelayedModal
- Link ../template/email: SendEstimateTemplate      to Modal: SendEstimateModal
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
      isActive: false
    },
    'SendEstimate': {
      name: 'Send Estimate',
      component: SendEstimateModal,
      template: SendEstimateTemplate,
      description: 'Initial estimate delivery email to clients',
      templatePath: 'SendEstimate.js',
      isActive: false
    }
  };

  // Sample project data for modal testing
  const [sampleProject, setSampleProject] = useState({
    _id: "sample-project-123",
    projectNumber: "ART-2024-001",
    name: "Sample Roof Project",
    PlanType: "Complex",
    projectStatus: "Estimate Completed",
    estimate_status: "Completed",
    posting_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: {
      address: "123 Main Street, Anytown VIC 3000",
      city: "Anytown",
      state: "VIC",
      zip: "3000"
    },
    clientName: "John Smith",
    clientEmail: "john.smith@example.com",
    clientAddress: "123 Main Street, Anytown VIC 3000",
    estimatorName: "Rodney Pedersen",
    estimator: "sample-estimator-id",
    client: "sample-client-id",
    Comments: "Sample project for testing email templates",
    notes: "This is a test project with all required fields populated",
    ARTInvNumber: "INV-2024-001",
    InvoiceLine: "Standard takeoff services",
    FlashingSet: "Complete",
    leadSource: "Website Inquiry"
  });

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
    projectNumber: "ART-2024-001", // Static project number for preview
    contactName: "${contactName}", // Will be populated when client/user selected (backend expects contactName)
    projectViewUrl: "https://projects.allrooftakeoffs.com.au/project/view/sample-token", // Static preview URL
    companyLogoUrl: null, // Always null in current system
    optionalBody: "${optionalBody}", // Will be populated by modal form
    memo: "${memo}", // Will be populated by modal form
    qty: "${qty}" // Will be populated by modal form
  });

  // Additional data for mock header (not used by backend template)
  const [mockHeaderData, setMockHeaderData] = useState({
    contactEmail: "${contactEmail}" // For mock header display only - shows descriptive placeholder
  });

  // NEW: Use actual backend templates with proper undefined handling
  const generateEmailFromTemplate = (modalKey, data) => {
    const modalConfig = modalRegistry[modalKey];
    if (!modalConfig) {
      return null;
    }

    try {
      // For EstimateComplete, use the exported HTML template with string replacement
      if (modalKey === 'EstimateComplete') {
        // Use the exported HTML template and replace variables
        let html = EstimateCompleteHTML;
        const subject = `Estimate Complete - ${data.projectAddress || '${projectAddress}'} - Ref: ${data.projectNumber || '${projectNumber}'}`;
        
        // Replace each variable, showing variable name if undefined
        html = html.replace(/\$\{projectNumber\}/g, data.projectNumber || '${projectNumber}');
        html = html.replace(/\$\{contactName\}/g, data.contactName || '${contactName}');
        html = html.replace(/\$\{projectAddress\}/g, data.projectAddress || '${projectAddress}');
        html = html.replace(/\$\{estimateDescription\}/g, data.estimateDescription || '${estimateDescription}');
        html = html.replace(/\$\{projectViewUrl\}/g, data.projectViewUrl || '${projectViewUrl}');
        html = html.replace(/\$\{optionalBody\}/g, data.optionalBody || '');
        html = html.replace(/\$\{memo\}/g, data.memo || '');
        
        return { subject, html };
      }
      
      // For other templates, use the original function method
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
  const emailData = generateEmailFromTemplate(selectedModal, sampleData);

  // Mock modal close handler
  const mockOnClose = () => {
    console.log('Modal close triggered (preview mode)');
  };

  // Handle form changes from modal - EXACT SAME PROP NAMES AS REAL SYSTEM
  const handleModalFormChange = (formValues) => {
    console.log('[DEBUG] Form values changed in Templates.jsx:', formValues);
    console.log('[DEBUG] Templates.jsx received keys:', Object.keys(formValues));
    console.log('[DEBUG] Templates.jsx contactName:', formValues.contactName);
    console.log('[DEBUG] Templates.jsx contactEmail:', formValues.contactEmail);
    
    // Update sample data when modal form changes - USE EXACT BACKEND PROP NAMES
    const updates = {};
    const mockHeaderUpdates = {};
    
    // Backend template props (EstimateComplete.js expects these exact names)
    if (formValues.contactName) {
      updates.contactName = formValues.contactName; // Backend template expects contactName
    }
    if (formValues.projectAddress) {
      updates.projectAddress = formValues.projectAddress; // Exact prop name from backend template
    }
    if (formValues.estimateDescription) {
      updates.estimateDescription = formValues.estimateDescription; // Exact prop name from backend template  
    }
    if (formValues.optionalBody !== undefined) {
      updates.optionalBody = formValues.optionalBody; // Exact prop name from backend template
    }
    if (formValues.memo !== undefined) {
      updates.memo = formValues.memo; // Exact prop name from backend template
    }
    
    // Handle QTY field
    if (formValues.qty !== undefined) {
      updates.qty = formValues.qty; // Store QTY value
    }
    
    // Mock header data (not used by backend template) - SYNC WITH BACKEND DATA
    if (formValues.contactEmail) {
      mockHeaderUpdates.contactEmail = formValues.contactEmail;
    }
    
    // IMPORTANT: Ensure name and email are synchronized
    // If either contactName or contactEmail changes, they should match
    if (formValues.contactName && formValues.contactEmail) {
      // Both name and email provided - use them together
      updates.contactName = formValues.contactName; // Backend template expects contactName
      mockHeaderUpdates.contactEmail = formValues.contactEmail;
      console.log('[DEBUG] Syncing name and email:', formValues.contactName, formValues.contactEmail);
    }
    
    // Handle planType and qty for dynamic estimateDescription generation (like real modal does)
    if (formValues.planType || formValues.qty !== undefined) {
      const planType = formValues.planType || sampleProject.PlanType;
      const qty = formValues.qty !== undefined ? formValues.qty : 1;
      
      handleSampleProjectUpdate('PlanType', planType);
      
      // Generate estimateDescription based on qty and planType (EXACT SAME LOGIC AS REAL MODAL)
      const selectedPlanType = basePlanTypes.find(type => type.label === planType);
      
      if (qty && selectedPlanType) {
        const { label, uom } = selectedPlanType;
        
        if (uom === 'ea') {
          updates.estimateDescription = `${qty}x ${label}`;
        } else if (uom === 'hr') {
          const hourText = qty === 1 ? 'hr' : 'hrs';
          updates.estimateDescription = `${qty} ${hourText} ${label}`;
        } else {
          updates.estimateDescription = `${qty}x ${label}`;
        }
      }
    }
    
    // Update both data structures
    if (Object.keys(updates).length > 0) {
      setSampleData(prev => ({
        ...prev,
        ...updates
      }));
    }
    
    if (Object.keys(mockHeaderUpdates).length > 0) {
      setMockHeaderData(prev => ({
        ...prev,
        ...mockHeaderUpdates
      }));
    }
  };

  // Render the selected modal using the wrapper
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
    <div className="p-6 h-screen flex flex-col">
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

      {/* Main Layout - Left/Right Split */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Side - Modal Selection and Preview */}
        <div className="flex-shrink-0 w-[650px] flex flex-col space-y-6 h-full">
          {/* Modal Selector */}
          <Card className="flex-shrink-0">
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

          {/* Modal Preview with Real Modal Styling */}
          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg p-8">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-2xl max-h-full overflow-auto">
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
                className="border-0 shadow-none"
                bodyStyle={{ maxHeight: '800px', overflow: 'auto' }}
              >
                <div className="h-full">
                  {renderModalPreview()}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Side - HTML Email Preview */}
        <div className="flex-1 h-full">
          <Card 
            title={
              <div className="flex items-center gap-2">
                <EyeOutlined className="text-green-600" />
                HTML Email Preview
              </div>
            }
            className="h-full flex flex-col"
            bodyStyle={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {emailData ? (
              <div className="flex-1 flex flex-col">
                {/* Mock Email Header - Preview Only */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 text-sm">
                  <div className="mb-2">
                    <strong className="text-gray-700">From:</strong> All Roof Take-Offs AU &lt;requests@allrooftakeoffs.com.au&gt;
                  </div>
                  <div className="mb-2">
                    <strong className="text-gray-700">To:</strong> {sampleData.contactName || '${contactName}'} &lt;{mockHeaderData.contactEmail || '${contactEmail}'}&gt;
                  </div>
                  <div className="mb-2">
                    <strong className="text-gray-700">Subject:</strong> Estimate Complete - {sampleData.projectAddress || '${projectAddress}'} - Ref: {sampleData.projectNumber}
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
                  <p className="text-lg">Email preview not available</p>
                  <p className="text-sm">This template is under development</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Live Modal for Testing */}
      {selectedModal === 'EstimateComplete' && (
        <EstimateCompleteModal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          project={sampleProject}
        />
      )}
    </div>
  );
};

export default Templates;
