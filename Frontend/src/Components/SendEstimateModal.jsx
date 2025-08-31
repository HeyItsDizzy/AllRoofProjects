// SendEstimateModal.jsx - Modal for sending estimate complete emails
import { useState, useEffect } from "react";
import { Modal, Form, Input, Button, message, Select, Checkbox } from "antd";
import { MailOutlined, UserOutlined, HomeOutlined, FileTextOutlined, MessageOutlined } from "@ant-design/icons";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Avatar from "@/shared/Avatar";
import { basePlanTypes } from "@/shared/planTypes";

const { Option } = Select;
const { TextArea } = Input;

/**
 * SendEstimateModal Component - Modal for sending estimate complete emails with read-only links
 * @param {boolean} isVisible - Modal visibility state
 * @param {function} onClose - Function to close modal
 * @param {object} project - Project data
 */
const SendEstimateModal = ({ isVisible, onClose, project }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [sendToLinkedClient, setSendToLinkedClient] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const axiosSecure = useAxiosSecure();

  // Load linked clients when modal opens
  useEffect(() => {
    if (isVisible && project) {
      loadLinkedClients();
      // Pre-fill form with project data
      form.setFieldsValue({
        projectAddress: project.location?.address || project.location || project.name,
        estimateQty: project.EstQty || "",
        planType: project.PlanType || "Standard" // Default to Standard if no plan type set
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
        
        // Auto-select first client if only one, enable linked client mode
        if (clientData.length === 1) {
          setSelectedClient(clientData[0]);
          setSendToLinkedClient(true);
        } else if (clientData.length > 1) {
          // Multiple clients - enable linked client mode but no auto-selection
          setSendToLinkedClient(true);
          setSelectedClient(null);
        }
      } else {
        // No linked clients - disable linked client mode
        setSendToLinkedClient(false);
        setClients([]);
        setSelectedClient(null);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      message.error("Failed to load client information");
    }
  };

  const handleSendEmail = async (values) => {
    try {
      setLoading(true);

      let emailData;
      if (sendToLinkedClient) {
        // Use linked client data
        let clientToUse = selectedClient;
        if (!clientToUse && clients.length === 1) {
          clientToUse = clients[0];
        }
        
        if (!clientToUse) {
          message.error("Please select a client to send to");
          return;
        }

        emailData = {
          clientEmail: clientToUse.email,
          clientName: clientToUse.company || clientToUse.name,
          projectAddress: project?.location?.address || project?.name,
          estimateDescription: `${values.estimateQty} - ${values.planType}`,
          optionalBody: values.optionalBody,
          companyLogoUrl: null // TODO: Add company logo support
        };
      } else {
        // Use manual entry data but keep client name from linked client if available
        let clientName = "Client";
        if (clients.length > 0) {
          const clientToUse = selectedClient || clients[0];
          clientName = clientToUse.company || clientToUse.name;
        }

        emailData = {
          clientEmail: values.clientEmail,
          clientName: clientName,
          projectAddress: project?.location?.address || project?.name,
          estimateDescription: `${values.estimateQty} - ${values.planType}`,
          optionalBody: values.optionalBody,
          companyLogoUrl: null // TODO: Add company logo support
        };
      }

      const response = await axiosSecure.post(`/projects/send-estimate/${project._id}`, emailData);

      if (response.data.success) {
        message.success("Estimate complete email sent successfully!");
        form.resetFields();
        setSendToLinkedClient(clients.length > 0); // Reset to true if clients exist
        setSelectedClient(clients.length === 1 ? clients[0] : null); // Auto-select if single client
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
    const client = clients.find(c => c._id === clientId);
    if (client) {
      setSelectedClient(client);
      setSendToLinkedClient(true); // Auto-enable sending to linked client when selected
    }
  };

  const handleSendToLinkedClientChange = (e) => {
    setSendToLinkedClient(e.target.checked);
    if (!e.target.checked) {
      // Manual entry mode - clear only email field, keep client name
      form.setFieldsValue({
        clientEmail: ""
      });
    } else {
      // Linked client mode - populate with selected client data
      if (clients.length === 1) {
        setSelectedClient(clients[0]);
      } else if (selectedClient) {
        // Keep currently selected client
        form.setFieldsValue({
          clientName: selectedClient._id
        });
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSendToLinkedClient(clients.length > 0);
    setSelectedClient(clients.length === 1 ? clients[0] : null);
    onClose();
  };

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
          <strong>Project:</strong> {project?.location?.address || project?.name} (#{project?.projectNumber})
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
        <Form.Item label="Client Name">
          {clients.length > 0 && (
            <div>
              {/* Display linked clients with avatars */}
              <div className="mb-3">
                {clients.map((client) => (
                  <div key={client._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-2">
                    <Avatar
                      name={client.company || client.name}
                      avatarUrl={client.avatar}
                      size="md"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {client.company || client.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {client.email}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Send to checkbox - moved below avatar */}
                <div className="mt-2 mb-3">
                  {clients.length === 1 ? (
                    <Checkbox 
                      checked={sendToLinkedClient}
                      onChange={handleSendToLinkedClientChange}
                    >
                      Send to {clients[0].email}
                    </Checkbox>
                  ) : (
                    <>
                      {/* Multiple clients selection */}
                      <Form.Item
                        name="clientName"
                        rules={sendToLinkedClient ? [{ required: true, message: "Please select a client" }] : []}
                        style={{ marginBottom: '8px' }}
                      >
                        <Select
                          placeholder="Choose which client to send to..."
                          onChange={handleClientSelect}
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
                                {client.company || client.name} - {client.email}
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      
                      {selectedClient && (
                        <Checkbox 
                          checked={sendToLinkedClient}
                          onChange={handleSendToLinkedClientChange}
                        >
                          Send to {selectedClient.email}
                        </Checkbox>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Manual email entry when checkbox unchecked or no clients */}
          {(!sendToLinkedClient || clients.length === 0) && (
            <div className="mt-3">
              {clients.length === 0 && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    No linked clients found. Enter recipient details manually:
                  </div>
                </div>
              )}
              
              {/* Show client name but allow email override */}
              {sendToLinkedClient === false && clients.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Sending to: <strong>{selectedClient?.company || selectedClient?.name || clients[0]?.company || clients[0]?.name}</strong> (different email)
                  </div>
                </div>
              )}
              
              <Form.Item
                name="clientEmail"
                rules={[
                  { required: true, message: "Client email is required" },
                  { type: "email", message: "Please enter a valid email address" }
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="client@example.com"
                  size="large"
                />
              </Form.Item>
            </div>
          )}
        </Form.Item>

        {/* Estimate Details */}
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="QTY"
            name="estimateQty"
            rules={[{ required: true, message: "Quantity is required" }]}
          >
            <Input
              prefix={<FileTextOutlined />}
              placeholder="e.g. 150m²"
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            label="Plan Type"
            name="planType"
            rules={[{ required: true, message: "Plan type is required" }]}
          >
            <Select
              placeholder="Select plan type"
              size="large"
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {basePlanTypes.map(plan => (
                <Option key={plan.label} value={plan.label}>
                  {plan.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </div>

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

export default SendEstimateModal;
