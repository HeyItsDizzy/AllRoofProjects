// JobDelayedModal.jsx - Modal for sending job delayed notifications
import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Select } from "antd";
import { ClockCircleOutlined, UserOutlined, HomeOutlined, CalendarOutlined, MessageOutlined, MailOutlined } from "@ant-design/icons";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Avatar from "@/shared/Avatar";

const { Option } = Select;

const { TextArea } = Input;

/**
 * JobDelayedModal Component - Modal for sending job delayed notifications with new timeline
 * @param {boolean} isVisible - Modal visibility state
 * @param {function} onClose - Function to close modal
 * @param {object} project - Project data
 * @param {array} clients - Array of client data for populating client information
 */
const JobDelayedModal = ({ isVisible, onClose, project, clients = [] }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [linkedClient, setLinkedClient] = useState(null);
  const axiosSecure = useAxiosSecure();

  // Debug log when modal opens
  useEffect(() => {
    if (isVisible) {
      console.log('[JobDelayedModal] is open');
    }
  }, [isVisible]);

  // Delay reason options
  const delayReasons = [
    { value: 'high-volume', label: 'High volume of incoming projects' },
    { value: 'awaiting-info', label: 'Awaiting additional information from client' },
    { value: 'staff-shortage', label: 'Staff shortages or leave' },
    { value: 'technical-issues', label: 'Technical issues or software updates' },
    { value: 'complexity', label: 'Unforeseen complexity in project scope' },
    { value: 'supplier-delay', label: 'Supplier or data delays' },
    { value: 'weather', label: 'Weather-related delays' },
    { value: 'equipment', label: 'Equipment maintenance or replacement' },
    { value: 'priority-change', label: 'Priority adjustments due to urgent projects' },
    { value: 'other', label: 'Other (specify in message)' }
  ];

  // Load linked clients when modal opens
  useEffect(() => {
    if (isVisible && project) {
      // Get the first linked client from the project
      let primaryClient = null;
      if (project.linkedClients && project.linkedClients.length > 0) {
        const clientId = project.linkedClients[0]; // Get first linked client
        primaryClient = clients.find(client => client._id === clientId);
      }
      
      setLinkedClient(primaryClient);
      
      // Pre-fill form with project data and default values
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7); // Default to 1 week from now
      const tomorrowString = tomorrow.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
      
      form.setFieldsValue({
        projectName: project.name || project.projectNumber,
        delayReason: 'high-volume', // Default to most common reason
        newCompletionDate: tomorrowString, // Use string format for HTML date input
        clientEmail: primaryClient?.email || '',
        clientName: primaryClient?.name || '',
      });
    }
  }, [isVisible, project, form, clients]);

  const handleSendEmail = async (values) => {
    try {
      setLoading(true);

      // Format the completion date
      const completionDate = new Date(values.newCompletionDate);
      const formattedDate = completionDate.toLocaleDateString('en-AU', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      const dayOfWeek = completionDate.toLocaleDateString('en-AU', { weekday: 'long' });
      
      // Get the reason text
      const reasonOption = delayReasons.find(r => r.value === values.delayReason);
      const reasonText = reasonOption ? reasonOption.label : values.delayReason;

      const emailData = {
        clientEmail: values.clientEmail,
        clientName: values.clientName,
        projectName: values.projectName,
        delayReason: reasonText,
        newCompletionDate: formattedDate,
        dayOfWeek: dayOfWeek,
        optionalMessage: values.optionalMessage,
        companyLogoUrl: null // TODO: Add company logo support
      };

      const response = await axiosSecure.post(`/projects/send-job-delayed/${project._id}`, emailData);

      if (response.data.success) {
        message.success("Job delayed notification sent successfully!");
        form.resetFields();
        onClose();
      } else {
        message.error(response.data.message || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending job delayed notification:", error);
      message.error(error.response?.data?.message || "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

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
        onFinish={handleSendEmail}
        autoComplete="off"
      >
        {/* Linked Client Display */}
        {linkedClient && (
          <Form.Item label="Sending to Client">
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <Avatar
                name={linkedClient.company || linkedClient.name}
                avatarUrl={linkedClient.avatar}
                size="md"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {linkedClient.company || linkedClient.name}
                </div>
                <div className="text-sm text-gray-600">
                  {linkedClient.email}
                </div>
              </div>
            </div>
          </Form.Item>
        )}

        {/* Client Selection - Only show if no linked client */}
        {!linkedClient && clients.length > 0 && (
          <Form.Item label="Select Client">
            <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
              <p className="text-sm text-orange-700 mb-2">
                No client is assigned to this project. Please select a client manually:
              </p>
              <Select
                placeholder="Choose a client..."
                allowClear
                onChange={(clientId) => {
                  const selectedClient = clients.find(c => c._id === clientId);
                  if (selectedClient) {
                    form.setFieldsValue({
                      clientEmail: selectedClient.email,
                      clientName: selectedClient.name
                    });
                  }
                }}
                style={{ width: '100%' }}
              >
                {clients.map(client => (
                  <Option key={client._id} value={client._id}>
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={client.company || client.name}
                        avatarUrl={client.avatar}
                        size="sm"
                      />
                      <span>{client.company || client.name} - {client.email}</span>
                    </div>
                  </Option>
                ))}
              </Select>
            </div>
          </Form.Item>
        )}

        {/* Client Email - Hidden field for auto-filled value or manual override */}
        <Form.Item
          label={linkedClient ? "Client Email (Auto-filled)" : "Client Email"}
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
            disabled={!!linkedClient} // Disable if client is auto-filled
          />
        </Form.Item>

        {/* Client Name - Hidden field for auto-filled value or manual override */}
        <Form.Item
          label={linkedClient ? "Client Name (Auto-filled)" : "Client Name"}
          name="clientName"
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Client Name (optional)"
            size="large"
            disabled={!!linkedClient} // Disable if client is auto-filled
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
          >
            {delayReasons.map(reason => (
              <Option key={reason.value} value={reason.value}>
                {reason.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* New Completion Date */}
        <Form.Item
          label="New Expected Completion Date"
          name="newCompletionDate"
          rules={[{ required: true, message: "Please select the new completion date" }]}
          help="Select the new expected completion date"
        >
          <Input
            type="date"
            size="large"
            min={new Date().toISOString().split('T')[0]} // Disable past dates
            prefix={<CalendarOutlined />}
            style={{ width: '100%' }}
          />
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

        {/* Form Actions */}
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
      </Form>
    </Modal>
  );
};

export default JobDelayedModal;
