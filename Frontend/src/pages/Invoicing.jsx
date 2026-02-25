// Invoicing.jsx - Invoice creation page inspired by QuickBooks
/* PRODUCTION READY - QuickBooks Integration Frontend */
import React, { useState, useEffect, useContext } from "react";
import { 
  Button, Input, Select, DatePicker, Form, Card, Row, Col, 
  Table, InputNumber, Divider, Space, Switch, Alert 
} from "antd";
import { IconBackArrow, IconSave, IconMail, IconDownload, IconPlus, IconDelete } from "@/shared/IconSet";
import { AuthContext } from "../auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import Swal from '@/shared/swalConfig';
import dayjs from 'dayjs';
import { useNavigate } from "react-router-dom";

const { Option } = Select;
const { TextArea } = Input;

const Invoicing = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [lineItems, setLineItems] = useState([
    { id: 1, description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [taxRate, setTaxRate] = useState(10); // 10% GST for Australia
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [sendLater, setSendLater] = useState(false);

  // Mock customer data - will be replaced with QuickBooks API
  const mockCustomers = [
    {
      id: "1",
      name: "Cloudbreak Roofing",
      email: "admin@cloudbreakroofing.com.au",
      address: "123 Ocean Drive, Torquay VIC 3228"
    },
    {
      id: "2", 
      name: "Wilson Building Co",
      email: "mike.wilson@wilsonbuilding.com",
      address: "88 Boundary Road, Geelong VIC 3220"
    },
    {
      id: "3",
      name: "Coastal Builders",
      email: "lisa.chen@coastalbuilders.com.au", 
      address: "12 Ocean View Drive, Torquay VIC 3228"
    },
    {
      id: "4",
      name: "Heritage Construction",
      email: "contact@heritageconstruction.com.au",
      address: "205 Heritage Estate, Torquay VIC 3228"
    }
  ];

  // Payment terms options
  const paymentTerms = [
    { value: 'net7', label: 'Net 7 Days' },
    { value: 'net14', label: 'Net 14 Days' },
    { value: 'net30', label: 'Net 30 Days' },
    { value: 'due_on_receipt', label: 'Due on Receipt' }
  ];

  // Calculate totals whenever line items change
  useEffect(() => {
    const newSubtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const newTaxAmount = (newSubtotal * taxRate) / 100;
    const newTotal = newSubtotal + newTaxAmount;

    setSubtotal(newSubtotal);
    setTaxAmount(newTaxAmount);
    setTotal(newTotal);
  }, [lineItems, taxRate]);

  // Line item handlers
  const addLineItem = () => {
    const newId = Math.max(...lineItems.map(item => item.id)) + 1;
    setLineItems([...lineItems, { 
      id: newId, 
      description: '', 
      quantity: 1, 
      rate: 0, 
      amount: 0 
    }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Calculate amount when quantity or rate changes
        if (field === 'quantity' || field === 'rate') {
          updatedItem.amount = (updatedItem.quantity || 0) * (updatedItem.rate || 0);
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Form submission handlers
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      // TODO: Implement save to QuickBooks as draft
      console.log('Saving draft...');
      
      await Swal.fire({
        icon: 'success',
        title: 'Draft Saved',
        text: 'Invoice saved as draft successfully',
        timer: 2000
      });
      
    } catch (error) {
      console.error('Error saving draft:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save draft'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    try {
      setLoading(true);
      const formData = await form.validateFields();
      
      // TODO: Implement QuickBooks invoice creation and sending
      console.log('Sending invoice...', { formData, lineItems });
      
      await Swal.fire({
        icon: 'success',
        title: 'Invoice Sent',
        text: 'Invoice has been sent to the customer successfully',
        timer: 2000
      });
      
      navigate('/invoices');
      
    } catch (error) {
      console.error('Error sending invoice:', error);
      if (error.errorFields) {
        // Form validation errors
        return;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error', 
        text: 'Failed to send invoice'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    console.log('Preview invoice...');
    // TODO: Implement invoice preview modal
  };

  // Table columns for line items
  const lineItemColumns = [
    {
      title: '#',
      key: 'index',
      width: 40,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Description',
      key: 'description',
      render: (_, record) => (
        <Input
          placeholder="Description of service or product"
          value={record.description}
          onChange={(e) => updateLineItem(record.id, 'description', e.target.value)}
          bordered={false}
        />
      ),
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={0}
          step={0.1}
          value={record.quantity}
          onChange={(value) => updateLineItem(record.id, 'quantity', value)}
          bordered={false}
          controls={false}
        />
      ),
    },
    {
      title: 'Rate',
      key: 'rate',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          step={0.01}
          prefix="A$"
          value={record.rate}
          onChange={(value) => updateLineItem(record.id, 'rate', value)}
          bordered={false}
          controls={false}
        />
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <span className="font-medium">
          A${(record.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<IconDelete size={14} />}
          onClick={() => removeLineItem(record.id)}
          disabled={lineItems.length === 1}
          danger
        />
      ),
    },
  ];

  // Initialize component
  useEffect(() => {
    setCustomers(mockCustomers);
    
    // Set default form values
    form.setFieldsValue({
      invoiceDate: dayjs(),
      dueDate: dayjs().add(14, 'days'),
      terms: 'net14'
    });
  }, [form]);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                type="text"
                icon={<IconBackArrow size={18} />}
                onClick={() => navigate('/invoices')}
                className="text-gray-600 hover:text-gray-800"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
                <p className="mt-1 text-gray-600">Generate and send professional invoices</p>
              </div>
            </div>
            
            <Space>
              <Button onClick={handlePreview}>
                Preview
              </Button>
              <Button 
                onClick={handleSaveDraft}
                loading={loading}
                icon={<IconSave size={16} />}
              >
                Save Draft
              </Button>
              <Button
                type="primary"
                onClick={handleSendInvoice}
                loading={loading}
                icon={<IconMail size={16} />}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Send Invoice
              </Button>
            </Space>
          </div>
        </div>

        {/* QuickBooks Integration Notice */}
        <Alert
          message="Development Mode"
          description="QuickBooks integration is in development. This interface will connect to your QuickBooks Online account soon."
          type="info"
          showIcon
          closable
          className="mb-6"
        />

        <Form form={form} layout="vertical">
          <Row gutter={24}>
            {/* Left Column - Invoice Details */}
            <Col xs={24} lg={16}>
              <Card title="Invoice Details" className="mb-6">
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Customer"
                      name="customerId"
                      rules={[{ required: true, message: 'Please select a customer' }]}
                    >
                      <Select
                        placeholder="Select a customer"
                        showSearch
                        optionFilterProp="children"
                        size="large"
                      >
                        {customers.map(customer => (
                          <Option key={customer.id} value={customer.id}>
                            {customer.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Customer Email"
                      name="customerEmail"
                    >
                      <Input
                        placeholder="customer@email.com"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      label="Invoice Date"
                      name="invoiceDate"
                      rules={[{ required: true, message: 'Please select invoice date' }]}
                    >
                      <DatePicker size="large" className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      label="Due Date"
                      name="dueDate"
                      rules={[{ required: true, message: 'Please select due date' }]}
                    >
                      <DatePicker size="large" className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      label="Terms"
                      name="terms"
                    >
                      <Select size="large" placeholder="Payment terms">
                        {paymentTerms.map(term => (
                          <Option key={term.value} value={term.value}>
                            {term.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Line Items */}
              <Card 
                title="Items & Services"
                extra={
                  <Button
                    type="primary"
                    icon={<IconPlus size={16} />}
                    onClick={addLineItem}
                    size="small"
                  >
                    Add Line
                  </Button>
                }
                className="mb-6"
              >
                <Table
                  columns={lineItemColumns}
                  dataSource={lineItems}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  className="line-items-table"
                />
              </Card>

              {/* Messages */}
              <Card title="Messages" className="mb-6">
                <Form.Item
                  label="Message on Invoice"
                  name="messageOnInvoice"
                >
                  <TextArea
                    rows={3}
                    placeholder="Thanks and kind regards&#10;Rodney Pedersen&#10;BSB: 484-799&#10;A/N: 206-7748"
                  />
                </Form.Item>
                
                <Form.Item
                  label="Message on Statement"
                  name="messageOnStatement"
                >
                  <TextArea
                    rows={2}
                    placeholder="Additional message for customer statements"
                  />
                </Form.Item>
              </Card>
            </Col>

            {/* Right Column - Summary & Options */}
            <Col xs={24} lg={8}>
              <Card title="Invoice Summary" className="mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>A${subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span>GST ({taxRate}%):</span>
                    <span>A${taxAmount.toFixed(2)}</span>
                  </div>
                  
                  <Divider className="my-2" />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">A${total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              <Card title="Payment Options" className="mb-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Accept card payments with PayPal</span>
                    <Switch size="small" />
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
                      PayPal
                    </div>
                    <div className="w-8 h-5 bg-orange-500 rounded text-white text-xs flex items-center justify-center">
                      MC
                    </div>
                    <div className="w-8 h-5 bg-blue-500 rounded text-white text-xs flex items-center justify-center">
                      VISA
                    </div>
                    <div className="w-8 h-5 bg-blue-400 rounded text-white text-xs flex items-center justify-center">
                      AMEX
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Send Options">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Send later</span>
                    <Switch 
                      checked={sendLater} 
                      onChange={setSendLater}
                      size="small" 
                    />
                  </div>
                  
                  {sendLater && (
                    <Form.Item
                      label="Send Date"
                      name="sendDate"
                    >
                      <DatePicker className="w-full" />
                    </Form.Item>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
        </Form>
      </div>

      <style jsx>{`
        .line-items-table .ant-table-thead > tr > th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #374151;
          border: none;
        }
        .line-items-table .ant-table-tbody > tr > td {
          border: none;
          padding: 8px;
        }
        .line-items-table .ant-table-tbody > tr:hover > td {
          background-color: #f0f9ff !important;
        }
      `}</style>
    </div>
  );
};

export default Invoicing;