// EstimateCompleteModal.jsx - Modal for sending estimate complete emails
import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Select } from "antd";
import { MailOutlined, UserOutlined, HomeOutlined, FileTextOutlined, MessageOutlined } from "@ant-design/icons";
import useAxiosSecure from "../../../hooks/AxiosSecure/useAxiosSecure";
import { basePlanTypes } from "../../../shared/planTypes";

const { Option } = Select;
const { TextArea } = Input;

/**
 * EstimateCompleteModal Component - Modal for sending estimate complete emails with read-only links
 * @param {boolean} isVisible - Modal visibility state
 * @param {function} onClose - Function to close modal
 * @param {object} project - Project data
 */
const EstimateCompleteModal = ({ isVisible, onClose, project }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const axiosSecure = useAxiosSecure();

  // Debug log when modal opens
  useEffect(() => {
    if (isVisible) {
      console.log('[EstimateCompleteModal] is open');
    }
  }, [isVisible]);

  // Load linked clients when modal opens
  useEffect(() => {
    if (isVisible && project) {
      loadLinkedClients();
      
      // Get the plan type UOM and transform it for UI display
      const planType = basePlanTypes.find(type => type.label === project.PlanType);
      const planTypeUOM = planType ? planType.uom : '';
      
      // Check if this is a manual price entry
      const isManualPrice = project.PlanType === 'Manual Price' || planTypeUOM === '';
      
      let estimateDescription;
      if (isManualPrice) {
        // For manual price, use a more flexible format
        estimateDescription = "roof estimate with material quantities and measurements";
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
        
        const displayUOM = getDisplayUOM(planTypeUOM, project.EstQty);
        estimateDescription = `${project.EstQty || ''} ${displayUOM} - roof estimate with material quantities and measurements`.trim();
      }
      
      // Pre-fill form with project data
      form.setFieldsValue({
        projectAddress: project.location || project.name,
        estimateDescription: estimateDescription
      });
    }
  }, [isVisible, project, form]);

  const loadLinkedClients = async () => {
    try {
      if (project.linkedClients && project.linkedClients.length > 0) {
        // Load client details for linked clients
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

  const handleSendEmail = async (values) => {
    try {
      setLoading(true);

      const emailData = {
        clientEmail: values.clientEmail,
        clientName: values.clientName,
        projectAddress: values.projectAddress,
        estimateDescription: values.estimateDescription,
        optionalBody: values.optionalBody,
        companyLogoUrl: null // TODO: Add company logo support
      };

      const response = await axiosSecure.post(`/projects/send-estimate/${project._id}`, emailData);

      if (response.data.success) {
        message.success("Estimate complete email sent successfully!");
        form.resetFields();
        onClose();
      } else {
        message.error(response.data.message || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending estimate email:", error);
      message.error(error.response?.data?.message || "Failed to send estimate email");
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId) => {
    const selectedClient = clients.find(client => client._id === clientId);
    if (selectedClient) {
      form.setFieldsValue({
        clientEmail: selectedClient.email,
        clientName: selectedClient.name
      });
    }
  };

  const handleCancel = () => {
    form.resetFields();
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
    
    const displayUOM = getDisplayUOM(planTypeUOM, project?.EstQty);
    placeholderText = `${project?.EstQty || ''} ${displayUOM} - roof takeoff estimate with material quantities`.trim();
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
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f1f9f4', borderRadius: '6px', border: '1px solid #009245' }}>
        <p style={{ margin: 0, color: '#081F13', fontSize: '14px' }}>
          <strong>Project:</strong> {project?.name} (#{project?.projectNumber})
        </p>
        <p style={{ margin: 0, color: '#696D7D', fontSize: '12px' }}>
          This will send a professional email with a secure link for the client to view estimate details.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSendEmail}
        autoComplete="off"
      >
        {/* Client Selection */}
        {clients.length > 0 && (
          <Form.Item label="Select Linked Client (Optional)">
            <Select
              placeholder="Choose from linked clients..."
              allowClear
              onChange={handleClientSelect}
              style={{ width: '100%' }}
            >
              {clients.map(client => (
                <Option key={client._id} value={client._id}>
                  {client.name} - {client.email}
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
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Client Name (optional)"
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

        {/* Estimate Description */}
        <Form.Item
          label="Estimate Description"
          name="estimateDescription"
          rules={[{ required: true, message: "Estimate description is required" }]}
          help={isManualPrice ? "For manual pricing, enter a custom description (e.g. 'Roof and colorblocking for $100')" : "Standard estimate description with quantity and unit"}
        >
          <Input
            prefix={<FileTextOutlined />}
            placeholder={placeholderText}
            size="large"
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
                backgroundColor: '#009245', 
                borderColor: '#009245',
                minWidth: '120px'
              }}
            >
              {loading ? 'Sending...' : 'Send Estimate'}
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EstimateCompleteModal;
