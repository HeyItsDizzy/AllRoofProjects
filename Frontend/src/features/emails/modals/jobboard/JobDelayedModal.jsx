// JobDelayedModal.jsx - Modal for sending job delayed notifications
import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Select } from "antd";
import { ClockCircleOutlined, UserOutlined, HomeOutlined, CalendarOutlined, MessageOutlined, MailOutlined } from "@ant-design/icons";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import useTimezone from "@/hooks/useTimezone";
import Avatar from "@/shared/Avatar";
import { showLoadingSpinner } from "@/shared/components/LoadingSpinner";
import JobDelayedTemplate from "../../templates/jobboard/JobDelayed.js";

const { Option, OptGroup } = Select;

const { TextArea } = Input;

/**
 * JobDelayedModal Component - Modal for sending job delayed notifications with new timeline
 * @param {boolean} isVisible - Modal visibility state
 * @param {function} onClose - Function to close modal
 * @param {object} project - Project data
 * @param {array} clients - Array of client data for populating client information
 * @param {boolean} previewMode - If true, renders without Modal wrapper for preview
 * @param {function} onFormChange - Callback for form changes in preview mode
 * @param {array} mockClients - Mock client data for preview mode
 * @param {array} mockUsers - Mock user data for preview mode
 */
const JobDelayedModal = ({ 
  isVisible, 
  onClose, 
  project, 
  clients = [],
  previewMode = false, 
  onFormChange,
  mockClients = [],
  mockUsers = []
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const axiosSecure = useAxiosSecure();
  const { 
    formatForEmail, 
    getUserCurrentDate, 
    getTimezoneInfo, 
    scheduleAtRecipientTime, 
    detectRecipientTimezone 
  } = useTimezone();

  // Debug log when modal opens
  useEffect(() => {
    if (isVisible) {
      console.log('[JobDelayedModal] is open');
    }
  }, [isVisible]);

  // Delay reason options with hierarchical structure
  const delayReasons = [
    {
      category: '⚙️ General / Workload',
      options: [
        { 
          value: 'high-volume', 
          label: 'Large influx of projects',
          description: "We've received a large influx of projects recently, resulting in longer than usual turnaround times."
        },
        { 
          value: 'scheduling-overlaps', 
          label: 'Scheduling overlaps',
          description: "We're currently managing some scheduling overlaps and expect a short delay before your job is processed."
        },
        { 
          value: 'staff-leave', 
          label: 'Reduced capacity due to leave',
          description: "Some of our team members are on leave, so our processing capacity is temporarily reduced."
        },
        { 
          value: 'workload-backlog', 
          label: 'Processing backlog',
          description: "We're working through a backlog of projects and your job is next in the queue."
        }
      ]
    },
    {
      category: '🤕 Staff Health',
      options: [
        { 
          value: 'staff-health-issue', 
          label: 'Staff health issue',
          description: "We're currently managing a staff health situation and working with reduced capacity while we get back on track."
        },
        { 
          value: 'team-recovery', 
          label: 'Team recovery period',
          description: "Our team is in a recovery period and catching up gradually — thank you for your patience."
        }
      ]
    },
    {
      category: '🧰 Technical / Resources',
      options: [
        { 
          value: 'technical-issues', 
          label: 'Technical issue',
          description: "We're resolving a temporary technical issue that's caused a short delay in processing current projects."
        },
        { 
          value: 'awaiting-files', 
          label: 'Waiting for project files',
          description: "We're awaiting access to some project files or resources needed to complete your take-off."
        },
        { 
          value: 'supplier-data', 
          label: 'Awaiting updated supplier data',
          description: "We're waiting on updated supplier rates or data required to finalise your pricing."
        },
        { 
          value: 'equipment-maintenance', 
          label: 'Equipment maintenance',
          description: "We're performing necessary equipment maintenance to ensure quality service delivery."
        }
      ]
    },
    {
      category: '🌦️ External Circumstances',
      options: [
        { 
          value: 'weather-disruption', 
          label: 'Weather / Power disruptions',
          description: "Recent severe weather has caused some disruptions to our workflow — we expect to resume normal timing shortly."
        },
        { 
          value: 'awaiting-client-info', 
          label: 'Awaiting client information',
          description: "We're waiting on some additional project details before we can proceed further."
        },
        { 
          value: 'priority-urgent', 
          label: 'Priority adjustments',
          description: "Priority adjustments due to urgent projects have temporarily affected our standard timeline."
        }
      ]
    },
    {
      category: '✉️ General Delay Notice',
      options: [
        { 
          value: 'general-delay', 
          label: 'General production delay',
          description: "There's been a short delay in our production queue, but your project remains in progress and will be completed as soon as possible."
        },
        { 
          value: 'quality-assurance', 
          label: 'Quality assurance process',
          description: "We're taking extra time to ensure the highest quality output for your project."
        }
      ]
    }
  ];

  // Load linked clients when modal opens
  useEffect(() => {
    if (isVisible && project) {
      console.log('[DEBUG] JobDelayedModal project data:', project);
      loadLinkedClients();
      
      // Pre-fill form with project data and default values
      const defaultDate = project.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Use project due date or 1 week from now
      const dateString = defaultDate instanceof Date 
        ? defaultDate.toISOString().split('T')[0] 
        : new Date(defaultDate).toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      
      // Default delay message that's always filled
      const defaultDelayMessage = "We've received a large influx of projects recently, resulting in longer than usual turnaround times.";
      
      form.setFieldsValue({
        projectName: project.name || project.projectNumber,
        delayReason: 'high-volume', // Default dropdown selection
        delayMessage: defaultDelayMessage, // Always auto-fill the actual message text
        newCompletionDate: dateString, // Use project due date as default
        selectedClientId: null, // Will be set when client is selected
        selectedUserId: null, // Will be set when user is selected
        clientEmail: '',
        clientName: '',
      });
    }
  }, [isVisible, project, form]);

  const loadLinkedClients = async () => {
    try {
      if (previewMode && mockClients.length > 0) {
        // Use mock clients in preview mode
        setAvailableClients(mockClients);
        return;
      }

      if (project.linkedClients && project.linkedClients.length > 0) {
        // Load client details for linked clients in live mode
        const clientPromises = project.linkedClients.map(clientId =>
          axiosSecure.get(`/clients/${clientId}`)
        );
        const clientResponses = await Promise.all(clientPromises);
        const clientData = clientResponses.map(response => response.data.client);
        setAvailableClients(clientData);
      } else {
        // Fallback: Load all clients when no linkedClients exist
        console.log('[DEBUG] No linked clients found, loading all clients as fallback');
        const response = await axiosSecure.get('/clients');
        
        // Handle different response formats
        let clientsData = [];
        if (Array.isArray(response.data)) {
          // Direct array response
          clientsData = response.data;
        } else if (response.data && response.data.clients && Array.isArray(response.data.clients)) {
          // Nested object response
          clientsData = response.data.clients;
        }
        
        if (clientsData.length > 0) {
          setAvailableClients(clientsData);
          console.log(`[DEBUG] Loaded ${clientsData.length} clients as fallback`);
        } else {
          console.log('[DEBUG] No clients found in response');
        }
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
          clientEmail: '',
          clientName: ''
        });
        return;
      }

      const client = availableClients.find(c => c._id === clientId);
      const previousClient = selectedClient;
      setSelectedClient(client);

      // Update form with selected client ID
      form.setFieldsValue({
        selectedClientId: clientId,
        selectedUserId: null  // Clear user selection when changing client
      });

      // Always clear selected user when switching clients
      setSelectedUser(null);
      console.log('Selected client changed to:', client?.company || client?.name);

      // Only auto-populate CLIENT EMAIL and NAME if this is a NEW client selection
      const isNewClientSelection = !previousClient || previousClient._id !== client._id;
      if (isNewClientSelection && client.mainContact && client.mainContact.email) {
        form.setFieldsValue({
          clientEmail: client.mainContact.email,
          clientName: client.mainContact.name || client.company || client.name
        });
        
        // Manually trigger form change for preview mode
        if (previewMode && onFormChange) {
          const allValues = form.getFieldsValue();
          console.log('[DEBUG] Manual trigger after client select:', allValues);
          onFormChange(allValues);
        }
      }

      // Load linked users for the selected client
      if (previewMode && mockUsers.length > 0) {
        // Use mock users in preview mode
        const clientUsers = mockUsers.filter(user => 
          client.linkedUsers && client.linkedUsers.includes(user._id)
        );
        setLinkedUsers(clientUsers);
      } else if (client.linkedUsers && client.linkedUsers.length > 0) {
        // Load user details for linked users in live mode
        const userPromises = client.linkedUsers.map(userId =>
          axiosSecure.get(`/users/${userId}`)
        );
        const userResponses = await Promise.all(userPromises);
        const userData = userResponses.map(response => response.data);
        setLinkedUsers(userData);
      } else {
        setLinkedUsers([]);
      }
    } catch (error) {
      console.error("Error loading client users:", error);
      message.error("Failed to load client contacts");
    }
  };

  const handleUserSelect = (userId) => {
    if (!userId) {
      setSelectedUser(null);
      form.setFieldsValue({
        selectedUserId: null
      });
      return;
    }

    const user = linkedUsers.find(u => u._id === userId);
    setSelectedUser(user);
    
    if (user) {
      const displayName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.name || user.email;
      
      console.log('Updating form with user data:', displayName, user.email);
      form.setFieldsValue({
        selectedUserId: userId,
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

  const handleDelayReasonChange = (value) => {
    // Find the full description and auto-fill the delay message text area
    let reasonText = "We've received a large influx of projects recently, resulting in longer than usual turnaround times."; // Default fallback
    
    for (const category of delayReasons) {
      const foundReason = category.options.find(r => r.value === value);
      if (foundReason) {
        reasonText = foundReason.description;
        break;
      }
    }
    
    // Update form with the editable delay message (this updates the existing text)
    form.setFieldsValue({
      delayReason: value,
      delayMessage: reasonText
    });
    
    // Manually trigger form change for preview mode
    if (previewMode && onFormChange) {
      const allValues = form.getFieldsValue();
      onFormChange(allValues);
    }
  };

  // Handle form changes for preview mode
  const handleFormValuesChange = (changedValues, allValues) => {
    if (previewMode && onFormChange) {
      console.log('[DEBUG] Form values changed in JobDelayedModal:', allValues);
      onFormChange(allValues);
    }
  };

  const handleSendEmail = async (values) => {
    // Create loading spinner for email sending
    const emailSpinner = showLoadingSpinner('Sending delay notification...', {
      subtitle: `To: ${values.clientEmail}`,
      progressText: 'Preparing email',
      showProgress: true,
      backgroundColor: 'rgba(0, 0, 0, 0.85)'
    });

    try {
      setLoading(true);

      // Format the completion date using recipient timezone detection
      const completionDate = new Date(values.newCompletionDate);
      
      // Detect recipient timezone from client and project data
      const recipientTimezone = detectRecipientTimezone(selectedClient, project);
      console.log(`[JobDelayed] Detected recipient timezone: ${recipientTimezone} for client: ${selectedClient?.name}`);
      
      // Format date for recipient's timezone
      const dateInfo = formatForEmail(completionDate, selectedClient, project);
      const formattedDate = dateInfo.formatted;
      const dayOfWeek = dateInfo.dayOfWeek;
      
      // If user wants to schedule for specific time (default 6:00 AM recipient time)
      const deliveryTime = values.deliveryTime || "06:00";
      let schedulingInfo = null;
      
      if (values.scheduleDelivery) {
        schedulingInfo = scheduleAtRecipientTime(
          deliveryTime,
          selectedClient,
          project,
          completionDate
        );
        
        console.log(`[JobDelayed] Email scheduled for ${deliveryTime} recipient time:`, schedulingInfo);
      }
      
      // Use the editable delay message from the form
      const reasonText = values.delayMessage || "There has been a delay in processing your project.";

      // Update spinner progress
      emailSpinner.setProgress(25);
      emailSpinner.setTitle('Generating email template...');

      // Prepare template data for frontend JobDelayedTemplate
      const templateData = {
        contactName: values.clientName,      // Template expects contactName
        projectAddress: values.projectName, // Template expects projectAddress
        projectName: values.projectName,    // Template fallback
        projectNumber: project.projectNumber,
        delayReason: reasonText,             // Send the actual message text
        newCompletionDate: formattedDate,    // Template expects newCompletionDate
        dayOfWeek: dayOfWeek,
        optionalMessage: values.optionalMessage,
        companyLogoUrl: null, // TODO: Add company logo support
      };

      // Generate beautiful email template using frontend template
      const emailTemplate = JobDelayedTemplate(templateData);

      // Update spinner progress
      emailSpinner.setProgress(50);
      emailSpinner.setTitle('Sending email...');
      emailSpinner.setSubtitle('Delivering to client');

      // Prepare final email data with pre-rendered template
      const emailData = {
        clientEmail: values.clientEmail,     // Backend expects clientEmail
        clientName: values.clientName,       // Backend expects clientName  
        projectName: values.projectName,     // Backend expects projectName
        projectNumber: project.projectNumber,
        delayReason: reasonText,             // Send the actual message text, not the dropdown value
        newCompletionDate: formattedDate,    // Backend expects newCompletionDate
        dayOfWeek: dayOfWeek,
        optionalMessage: values.optionalMessage,
        companyLogoUrl: null,
        
        // Pre-rendered template (like EstimateCompleteModal)
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        projectId: project._id,
        
        // Timezone and scheduling info
        recipientTimezone: recipientTimezone,
        schedulingInfo: schedulingInfo,
        
        // Client and project context for backend timezone handling
        clientData: selectedClient,
        projectData: project
      };

      console.log('[DEBUG] Sending job delayed email data:', emailData);
      console.log('[DEBUG] All form values:', values);
      console.log('[DEBUG] Template data:', templateData);
      console.log('[DEBUG] Generated subject:', emailTemplate.subject);
      console.log('[DEBUG] Required fields check:');
      console.log('  - clientEmail:', emailData.clientEmail);
      console.log('  - projectName:', emailData.projectName); 
      console.log('  - delayReason:', emailData.delayReason);
      console.log('  - newCompletionDate:', emailData.newCompletionDate);

      // Choose endpoint based on scheduling preference - now sends pre-rendered template
      const endpoint = values.scheduleDelivery && schedulingInfo
        ? '/api/emails/schedule-recipient-time'
        : `/projects/send-job-delayed/${project._id}`;
      
      const response = await axiosSecure.post(endpoint, emailData);

      if (response.data.success) {
        // Update spinner progress
        emailSpinner.setProgress(80);
        emailSpinner.setTitle('Email sent! Updating status...');
        
        // Complete the loading
        emailSpinner.complete();
        
        if (values.scheduleDelivery && schedulingInfo) {
          const localTime = schedulingInfo.recipientLocalTime;
          const localDate = schedulingInfo.recipientLocalDate;
          emailSpinner.setTitle('Delay notification scheduled!');
          emailSpinner.setSubtitle(`Will be sent at ${localTime} on ${localDate} (recipient's local time)`);
        } else {
          emailSpinner.setTitle('Delay notification sent successfully!');
          emailSpinner.setSubtitle(`Delivered to ${values.clientEmail}`);
        }
        
        // Small delay before destroying
        await new Promise(resolve => setTimeout(resolve, 1200));
        emailSpinner.destroy();

        message.success("Job delayed notification sent successfully!");
        form.resetFields();
        setSelectedClient(null);
        setLinkedUsers([]);
        setSelectedUser(null);
        onClose();
      } else {
        // Show error
        emailSpinner.error('Failed to send notification');
        await new Promise(resolve => setTimeout(resolve, 1000));
        emailSpinner.destroy();
        
        message.error(response.data.message || "Failed to send notification");
      }
    } catch (error) {
      // Show error state
      emailSpinner.error('Email sending failed');
      await new Promise(resolve => setTimeout(resolve, 1000));
      emailSpinner.destroy();
      
      console.error("Error sending job delayed notification:", error);
      console.error("Error response data:", error.response?.data);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Failed to send notification (${error.response?.status})`;
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Content to render (form and UI)
  const modalContent = (
    <>
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', border: '1px solid #dc2626' }}>
        <p style={{ margin: 0, color: '#7f1d1d', fontSize: '14px' }}>
          <strong>Project:</strong> {project?.name} (#{project?.projectNumber})
        </p>
        <p style={{ margin: 0, color: '#991b1b', fontSize: '12px' }}>
          This will send a professional delay notification with the new expected completion timeline.
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
            {availableClients.map(client => (
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
          label="Client Email(s)"
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
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Client Name (optional)"
            size="large"
          />
        </Form.Item>

        {/* Project Name */}
        <Form.Item
          label="Project Name/Description"
          name="projectName"
          rules={[{ required: true, message: "Project name is required" }]}
        >
          <Input
            prefix={<HomeOutlined />}
            placeholder="Project name or description"
            size="large"
          />
        </Form.Item>

        {/* Delay Reason */}
        <Form.Item
          label="Reason for Delay"
          name="delayReason"
          rules={[{ required: true, message: "Please select a reason for the delay" }]}
        >
          <Select
            placeholder="Select the reason for delay..."
            size="large"
            optionLabelProp="label"
            onChange={handleDelayReasonChange}
          >
            {delayReasons.map(category => (
              <OptGroup key={category.category} label={category.category}>
                {category.options.map(reason => (
                  <Option 
                    key={reason.value} 
                    value={reason.value}
                    label={reason.label}
                    title={reason.description} // Show full text on hover
                  >
                    <div className="py-1">
                      <div className="font-medium text-gray-900">{reason.label}</div>
                      <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {reason.description.length > 80 
                          ? `${reason.description.substring(0, 80)}...` 
                          : reason.description
                        }
                      </div>
                    </div>
                  </Option>
                ))}
              </OptGroup>
            ))}
          </Select>
        </Form.Item>

        {/* Editable Delay Message */}
        <Form.Item
          label="Delay Message (Editable)"
          name="delayMessage"
          rules={[{ required: true, message: "Please provide a delay message" }]}
          help="Pre-filled with default message. You can edit this text or select a different reason above to auto-fill."
        >
          <TextArea
            placeholder="Default delay message will be auto-filled here..."
            rows={4}
            maxLength={800}
            showCount
          />
        </Form.Item>

        {/* New Completion Date with Timezone Info */}
        <Form.Item
          label={
            <div className="flex items-center gap-2">
              <span>New Expected Completion Date</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {(() => {
                  const tzInfo = getTimezoneInfo();
                  return `${tzInfo.regionName} (${tzInfo.offset})`;
                })()}
              </span>
            </div>
          }
          name="newCompletionDate"
          rules={[{ required: true, message: "Please select the new completion date" }]}
          help={`Defaults to project due date (${project?.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}). Date will be formatted appropriately for client's region.`}
        >
          <Input
            type="date"
            size="large"
            min={new Date().toISOString().split('T')[0]} // Disable past dates
            prefix={<CalendarOutlined />}
            style={{ width: '100%' }}
          />
        </Form.Item>

        {/* Email Delivery Scheduling */}
        <Form.Item>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <ClockCircleOutlined className="text-blue-600" />
              Email Delivery Scheduling
            </h4>
            
            {selectedClient && (
              <div className="text-xs text-blue-700 mb-3 bg-blue-100 p-2 rounded">
                <strong>Recipient Timezone:</strong> {detectRecipientTimezone(selectedClient, project)}
                <br />
                <strong>Client:</strong> {selectedClient?.name} ({selectedClient?.email})
              </div>
            )}

            <div className="space-y-3">
              <Form.Item
                name="scheduleDelivery"
                valuePropName="checked"
                style={{ marginBottom: 8 }}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Schedule for specific time (recipient's local time)
                  </span>
                </label>
              </Form.Item>

              <Form.Item
                label="Delivery Time (Recipient's Local Time)"
                name="deliveryTime"
                help="Email will be delivered at this time in the recipient's timezone"
              >
                <Input
                  type="time"
                  defaultValue="06:00"
                  prefix={<ClockCircleOutlined />}
                  placeholder="06:00"
                />
              </Form.Item>
            </div>
          </div>
        </Form.Item>

        {/* Optional Personal Message */}
        <Form.Item
          label="Additional Message (Optional)"
          name="optionalMessage"
          help="Add any additional details, apologies, or specific information about the delay"
        >
          <TextArea
            placeholder="We apologize for any inconvenience this may cause. We appreciate your patience and understanding..."
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Form Actions - Only show in live mode */}
        {!previewMode && (
          <Form.Item style={{ marginBottom: 0, marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button onClick={handleCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{ 
                  backgroundColor: '#dc2626', 
                  borderColor: '#dc2626',
                  minWidth: '140px'
                }}
              >
                {loading ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </Form.Item>
        )}
      </Form>
    </>
  );

  // Return content directly in preview mode, wrapped in Modal in live mode
  if (previewMode) {
    return modalContent;
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClockCircleOutlined style={{ color: '#dc2626' }} />
          <span>Send Job Delayed Notification</span>
        </div>
      }
      open={isVisible}
      onCancel={handleCancel}
      width={650}
      footer={null}
      destroyOnClose
    >
      {modalContent}
    </Modal>
  );
};

export default JobDelayedModal;
