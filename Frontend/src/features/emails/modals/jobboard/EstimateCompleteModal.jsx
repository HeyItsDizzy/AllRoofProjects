// EstimateCompleteModal.jsx - Modal for sending estimate complete emails
import { useState, useEffect, useRef } from "react";
import { Modal, Form, Input, Button, message, Select, InputNumber } from "antd";
import { MailOutlined, UserOutlined, HomeOutlined, FileTextOutlined, MessageOutlined } from "@ant-design/icons";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import { basePlanTypes } from "@/shared/planTypes";
import Avatar from "@/shared/Avatar";
import EstimateCompleteTemplate from "../../templates/jobboard/EstimateComplete.js";

const { Option } = Select;
const { TextArea } = Input;

/**
 * EstimateCompleteModal Component - Modal for sending estimate complete emails with read-only links
 * @param {boolean} isVisible - Modal visibility state
 * @param {function} onClose - Function to close modal
 * @param {object} project - Project data
 * @param {boolean} previewMode - If true, renders without Modal wrapper for preview
 * @param {function} onFormChange - Callback for form changes in preview mode
 * @param {array} mockClients - Mock client data for preview mode
 * @param {array} mockUsers - Mock user data for preview mode
 */
const EstimateCompleteModal = ({ 
  isVisible, 
  onClose, 
  project, 
  previewMode = false, 
  onFormChange,
  mockClients = [],
  mockUsers = []
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const axiosSecure = useAxiosSecure();
  const initialValuesSet = useRef(false); // Track if initial values have been set

  // Debug log when modal opens
  useEffect(() => {
    if (isVisible) {
      console.log('[EstimateCompleteModal] is open');
    }
  }, [isVisible]);

  // Load linked clients when modal opens
  useEffect(() => {
    if (isVisible && project) {
      console.log('[DEBUG] Project data for modal initialization:', project);
      console.log('[DEBUG] project.Qty:', project.Qty);
      console.log('[DEBUG] project.qty:', project.qty);
      console.log('[DEBUG] project.PlanType:', project.PlanType);
      console.log('[DEBUG] All project keys:', Object.keys(project));
      
      loadLinkedClients();
      
      // Only set initial form values once to prevent resetting user input
      if (!initialValuesSet.current) {
        // Get the plan type UOM and transform it for UI display
        const planType = basePlanTypes.find(type => type.label === project.PlanType);
        const planTypeUOM = planType ? planType.uom : '';
        
        // Check if this is a manual price entry
        const isManualPrice = project.PlanType === 'Manual Price' || planTypeUOM === '';
        
        let estimateDescription;
        if (isManualPrice) {
          // For manual price, use a more flexible format
          estimateDescription = "roof estimate with material quantities and measurements";
        } else if (project.Qty) { // Check chargeable qty instead of estimator qty
          // Transform UOM for UI display
          const getDisplayUOM = (uom, quantity) => {
            if (uom === 'ea') return 'x';
            if (uom === 'hr') {
              const qty = parseFloat(quantity) || 0;
              return qty === 1 ? 'Hr' : 'Hrs';
            }
            return uom; // Return as-is for other UOMs
          };
          
          const displayUOM = getDisplayUOM(planTypeUOM, project.Qty);
          estimateDescription = `${project.Qty || ''} ${displayUOM} - roof estimate with material quantities and measurements`.trim();
        }
        
        // Pre-fill form with project data
        const formData = {
          projectAddress: project.location?.address || project.name || '', // Convert object to string
          estimateDescription: estimateDescription,
          qty: project.Qty || 1, // Use chargeable Qty (capital Q), not estimator qty
          planType: project.PlanType || 'Standard'
        };
        
        console.log('[DEBUG] Setting initial form values:', formData);
        form.setFieldsValue(formData);
        initialValuesSet.current = true;
      }
    }
  }, [isVisible, project, form]);

  const loadLinkedClients = async () => {
    try {
      if (previewMode && mockClients.length > 0) {
        // Use mock clients in preview mode
        setClients(mockClients);
        return;
      }

      if (project.linkedClients && project.linkedClients.length > 0) {
        // Load client details for linked clients in live mode
        const clientPromises = project.linkedClients.map(clientId =>
          axiosSecure.get(`/clients/${clientId}`)
        );
        const clientResponses = await Promise.all(clientPromises);
        const clientData = clientResponses.map(response => response.data.client);
        setClients(clientData);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      message.error("Failed to load client information");
    }
  };

  const handleClientSelect = async (clientId) => {
    try {
      console.log('[DEBUG] handleClientSelect called with clientId:', clientId);
      
      if (!clientId) {
        setSelectedClient(null);
        setLinkedUsers([]);
        setSelectedUser(null);
        // Clear form fields
        form.setFieldsValue({
          selectedClientId: null,
          selectedUserId: null,
          clientEmail: ''
        });
        return;
      }

      const client = clients.find(c => c._id === clientId);
      const previousClient = selectedClient;
      setSelectedClient(client);

      // Update form with selected client ID
      form.setFieldsValue({
        selectedClientId: clientId,
        selectedUserId: null  // Clear user selection when changing client
      });

      // Always clear selected user when switching clients
      console.log('Clearing selected user - previous:', selectedUser);
      setSelectedUser(null);
      console.log('Selected client changed to:', client?.company || client?.name);

      // Only auto-populate CLIENT EMAIL and NAME if this is a NEW client selection
      const isNewClientSelection = !previousClient || previousClient._id !== client._id;
      if (isNewClientSelection && client.mainContact && client.mainContact.email) {
        form.setFieldsValue({
          clientEmail: client.mainContact.email,
          clientName: client.mainContact.name || client.company || client.name  // Use contact name or company name
        });
        
        // Manually trigger form change for preview mode
        if (previewMode && onFormChange) {
          const allValues = form.getFieldsValue();
          console.log('[DEBUG] Manual trigger after client select:', allValues);
          onFormChange(allValues);
        }
      }

      // Load linked users for this client
      let availableUsers = [];
      
      // Always add main contact as first option if available
      if (client.mainContact && client.mainContact.email) {
        availableUsers.push({
          _id: 'main-contact',
          name: client.mainContact.name || client.company || client.name,
          email: client.mainContact.email,
          isMainContact: true
        });
      }

      if (client.linkedUsers && client.linkedUsers.length > 0) {
        if (previewMode && mockUsers.length > 0) {
          // Use mock users in preview mode
          const userData = mockUsers.filter(user => client.linkedUsers.includes(user._id));
          availableUsers = [...availableUsers, ...userData];
        } else {
          // Load users from API in live mode with error handling for individual users
          const userPromises = client.linkedUsers.map(async (userId) => {
            try {
              const response = await axiosSecure.get(`/users/get-user/${userId}`);
              if (response.data?.success && response.data?.data) {
                return response.data.data;
              }
              return null;
            } catch (error) {
              console.warn(`Failed to load user ${userId}:`, error.message);
              return null; // Return null for failed requests
            }
          });
          
          const userResponses = await Promise.all(userPromises);
          // Filter out null responses (failed requests)
          const validUsers = userResponses.filter(user => user !== null);
          availableUsers = [...availableUsers, ...validUsers];
        }
      }
      
      setLinkedUsers(availableUsers);
      
      if (availableUsers.length === 0) {
        console.warn('No valid users found for this client');
      } else {
        console.log(`Found ${availableUsers.length} available contacts for client:`, availableUsers.map(u => u.name || u.email));
      }
    } catch (error) {
      console.error("Error loading client contacts:", error);
      // Don't show error message for 404s as they're common when users are deleted
      if (error.response?.status !== 404) {
        message.error("Failed to load client information");
      }
    }
  };

  const handleUserSelect = (userId, userList = linkedUsers) => {
    console.log('handleUserSelect called with userId:', userId);
    console.log('userList:', userList);
    console.log('linkedUsers:', linkedUsers);
    
    if (!userId) {
      setSelectedUser(null);
      // Update form field
      form.setFieldsValue({
        selectedUserId: null
      });
      return;
    }

    // Ensure we have a valid array to work with
    const usersArray = Array.isArray(userList) ? userList : linkedUsers;
    if (!Array.isArray(usersArray)) {
      console.error('No valid user array found');
      return;
    }

    const user = usersArray.find(u => u._id === userId);
    console.log('Selected user:', user);
    setSelectedUser(user);

    // Update form field
    form.setFieldsValue({
      selectedUserId: userId
    });

    // Update CLIENT EMAIL and CLIENT NAME fields when selecting a user contact
    if (user) {
      const displayName = user.isMainContact 
        ? user.name 
        : (user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.name);
          
      console.log('Updating form with user data:', displayName, user.email);
      form.setFieldsValue({
        clientEmail: user.email,
        clientName: displayName
      });
      
      // Manually trigger form change for preview mode
      if (previewMode && onFormChange) {
        const allValues = form.getFieldsValue();
        console.log('[DEBUG] Manual trigger after user select:', allValues);
        onFormChange(allValues);
      }
    }
  };

  const handleSendEmail = async (values) => {
    try {
      setLoading(true);

      // Generate dynamic estimate text based on UOM
      const selectedPlanType = basePlanTypes.find(type => type.label === values.planType);
      let estimateDescription = 'estimate';
      
      if (values.qty && selectedPlanType) {
        const { label, uom } = selectedPlanType;
        
        if (uom === 'ea') {
          // For "ea" UOM: "[QTY]x [label]"
          estimateDescription = `${values.qty}x ${label}`;
        } else if (uom === 'hr') {
          // For "hr" UOM: "[QTY] hr [label]"
          const hourText = values.qty === 1 ? 'hr' : 'hrs';
          estimateDescription = `${values.qty} ${hourText} ${label}`;
        } else {
          // Fallback for other UOMs or empty UOM
          estimateDescription = `${values.qty}x ${label}`;
        }
      }

      const emailData = {
        clientEmail: values.clientEmail,
        clientName: values.clientName,
        projectAddress: values.projectAddress,
        estimateDescription: estimateDescription,
        qty: values.qty,
        planType: values.planType,
        optionalBody: values.optionalBody,
        memo: values.memo,
        companyLogoUrl: null // TODO: Add company logo support
      };

      // Generate the complete email template HTML and subject
      const templateData = {
        contactName: values.clientName, // Backend template expects contactName, form provides clientName
        projectAddress: values.projectAddress,
        projectNumber: project.projectNumber,
        estimateDescription: estimateDescription,
        optionalBody: values.optionalBody,
        memo: values.memo,
        companyLogoUrl: null,
        projectViewUrl: `${import.meta.env.VITE_FRONTEND_URL || 'https://projects.allrooftakeoffs.com.au'}/project/${project.alias}` // Use alias for direct project URL
      };

      const emailTemplate = EstimateCompleteTemplate(templateData);
      
      // Send complete template to backend
      const emailPayload = {
        ...emailData,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        projectId: project._id
      };

      console.log('[DEBUG] Sending email data:', emailPayload);
      console.log('[DEBUG] All form values:', values);

      const response = await axiosSecure.post(`/projects/send-estimate/${project._id}`, emailPayload);

      if (response.data.success) {
        message.success("Estimate complete email sent successfully!");
        form.resetFields();
        initialValuesSet.current = false; // Reset flag so values can be set again next time
        onClose();
      } else {
        message.error(response.data.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending estimate email:", error);
      console.error("Error response data:", error.response?.data);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Failed to send estimate email (${error.response?.status})`;
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedClient(null);
    setLinkedUsers([]);
    setSelectedUser(null);
    initialValuesSet.current = false; // Reset flag so values can be set again next time
    onClose();
  };

  // Get plan type UOM for placeholder and transform for UI display
  const planType = basePlanTypes.find(type => type.label === project?.PlanType);
  const planTypeUOM = planType ? planType.uom : '';
  
  // Check if this is a manual price entry
  const isManualPrice = project?.PlanType === 'Manual Price' || planTypeUOM === '';
  
  let placeholderText;
  if (isManualPrice) {
    // For manual price, show example custom description
    placeholderText = "e.g. Roof and colorblocking for $100 - custom estimate description";
  } else {
    // Transform UOM for UI display
    const getDisplayUOM = (uom, quantity) => {
      if (uom === 'ea') return 'x';
      if (uom === 'hr') {
        const qty = parseFloat(quantity) || 0;
        return qty === 1 ? 'Hr' : 'Hrs';
      }
      return uom; // Return as-is for other UOMs
    };
    
    const displayUOM = getDisplayUOM(planTypeUOM, project?.Qty);
    placeholderText = `${project?.Qty || ''} ${displayUOM} - roof takeoff estimate with material quantities`.trim();
  }

  // Add form change handler for preview mode with debouncing for text inputs
  const handleFormValuesChange = (changedValues, allValues) => {
    // Only log for dropdown changes or in preview mode
    const immediateUpdateFields = ['selectedClientId', 'selectedUserId', 'planType'];
    const hasImmediateUpdate = Object.keys(changedValues).some(field => 
      immediateUpdateFields.includes(field)
    );
    
    if (hasImmediateUpdate || previewMode) {
      console.log('[DEBUG] Form values changed:', { changedValues, allValues });
    }
    
    if (previewMode && onFormChange) {
      
      if (hasImmediateUpdate) {
        // Immediate update for dropdown selections
        console.log('[DEBUG] Immediate update for selection field');
        onFormChange(allValues);
      } else {
        // Debounced update for text inputs to prevent racing
        clearTimeout(window.templateFormDebounce);
        window.templateFormDebounce = setTimeout(() => {
          onFormChange(allValues);
        }, 500); // 500ms delay for text inputs
      }
    }
  };

  // The modal content (form)
  const modalContent = (
    <>
      {/* Project Info Banner */}
      <div className="mb-5 p-3 bg-green-50 rounded-md border border-green-200">
        <p className="mb-0 text-green-900 text-sm">
          <strong>Project:</strong> {project?.name || 'Project Name'} (#{project?.ProjectNumber || 'N/A'})
        </p>
        <p className="mb-0 text-gray-600 text-xs mt-1">
          This will send a professional email with a secure link for the client to view estimate details.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        size="large"
        onFinish={handleSendEmail}
        onValuesChange={handleFormValuesChange}
        autoComplete="off"
      >
        {/* Client Selection with Avatars */}
        <Form.Item 
          label="Select Linked Client (Optional)"
          name="selectedClientId"
        >
          <Select
            placeholder="Choose from linked clients..."
            allowClear
            onChange={handleClientSelect}
            className="w-full"
            showSearch={false}
            optionLabelProp="label"
            filterOption={false}
            mode={undefined}
          >
            {clients.map(client => (
              <Option 
                key={client._id} 
                value={client._id}
                label={client.company || client.name}
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    name={client.company || client.name}
                    avatarUrl={client.avatar}
                    size="sm"
                  />
                  <span>{client.company || client.name}</span>
                </div>
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* User Selection within Client */}
        {selectedClient && linkedUsers.length > 0 && (
          <Form.Item 
            label="Select Contact Person"
            name="selectedUserId"
          >
            <Select
              placeholder="Choose contact person..."
              allowClear
              onChange={handleUserSelect}
              className="w-full"
              value={selectedUser?._id}
              showSearch={false}
              optionLabelProp="label"
              filterOption={false}
              mode={undefined}
            >
              {linkedUsers.map(user => (
                <Option 
                  key={user._id} 
                  value={user._id}
                  label={user.isMainContact 
                    ? `${user.name} (Main Contact)`
                    : (user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.name || user.email)
                  }
                >
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={user.isMainContact 
                        ? user.name
                        : (user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.name || user.email)
                      }
                      avatarUrl={user.avatar}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {user.isMainContact 
                            ? user.name
                            : (user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.name || user.email)
                          }
                        </span>
                        {user.isMainContact && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Main Contact
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Client Email */}
        <Form.Item
          label="Client Email"
          name="clientEmail"
          rules={[
            { required: true, message: "Client email is required" },
            { type: "email", message: "Please enter a valid email address" }
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="client@example.com"
            size="large"
          />
        </Form.Item>

        {/* Client Name */}
        <Form.Item
          label="Client Name"
          name="clientName"
          rules={[{ required: true, message: "Client name is required" }]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Contact person name"
            size="large"
          />
        </Form.Item>

        {/* Project Address */}
        <Form.Item
          label="Project Address/Description"
          name="projectAddress"
          rules={[{ required: true, message: "Project address is required" }]}
        >
          <Input
            prefix={<HomeOutlined />}
            placeholder="123 Main Street, Suburb, State"
            size="large"
          />
        </Form.Item>

        {/* QTY and Plan Type - Same Row */}
        <div className="flex gap-4 items-start">
          {/* QTY - 1/6 width */}
          <Form.Item
            label="QTY"
            name="qty"
            rules={[{ required: true, message: "Quantity is required" }]}
            help="Supports decimals (1.5)"
            className="flex-none w-1/6 min-w-[70px]"
          >
            <InputNumber
              min={0.5}
              max={100}
              step={0.5}
              placeholder="1"
              size="large"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {/* Plan Type - Remaining width */}
          <Form.Item
            label="Plan Type"
            name="planType"
            rules={[{ required: true, message: "Plan type is required" }]}
            help="Select the type of plan/service"
            className="flex-1"
          >
            <Select
              placeholder="Select plan type"
              size="large"
            >
            {basePlanTypes.map((planType) => (
              <Option key={planType.label} value={planType.label}>
                {planType.label} - ${planType.AUD} {planType.uom}
              </Option>
            ))}
          </Select>
        </Form.Item>
        </div>

        {/* Memo Field for Optional Add-ins */}
        <Form.Item
          label="Optional Add-ins / Memo"
          name="memo"
          help="Add special notes, add-ins, or additional details (HTML compatible)"
        >
          <TextArea
            placeholder="Additional items, special requests, or notes..."
            rows={3}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        {/* Optional Personal Message */}
        <Form.Item
          label="Optional Message"
          name="optionalBody"
          help="Add a personal message, special notes, or reply to client conversation (optional)"
        >
          <TextArea
            placeholder="Hi John, as discussed, here's your roof estimate. Please note the premium materials as requested..."
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Form Actions */}
        <Form.Item className="mb-0 mt-6">
          <div className="flex justify-end gap-3">
            <Button onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="bg-green-600 border-green-600 min-w-[120px]"
            >
              Send Estimate
            </Button>
          </div>
        </Form.Item>
      </Form>
    </>
  );

  // Conditional rendering based on preview mode
  if (previewMode) {
    return modalContent;
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MailOutlined style={{ color: '#009245' }} />
          <span>Send Estimate Complete</span>
        </div>
      }
      open={isVisible}
      onCancel={handleCancel}
      width={600}
      footer={null}
      destroyOnClose
    >
      {modalContent}
    </Modal>
  );
};

export default EstimateCompleteModal;
