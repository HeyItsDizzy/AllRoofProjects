/**
 * Invoice Creator Component
 * Create invoices that sync to both MongoDB and QuickBooks
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InvoiceCreator = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: 1, rate: 0, amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [qbConnected, setQbConnected] = useState(false);

  const BASE_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchClients();
    checkQBConnection();
    
    // Auto-generate invoice number
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`);
    
    // Set default due date (7 days from now)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    setDueDate(defaultDueDate.toISOString().split('T')[0]);
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/clients`);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const checkQBConnection = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/qb-company/status`);
      setQbConnected(response.data.connection?.connected || false);
    } catch (error) {
      console.error('Failed to check QB connection:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    
    // Auto-calculate amount when quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const rate = parseFloat(updatedItems[index].rate) || 0;
      updatedItems[index].amount = quantity * rate;
    }
    
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const createInvoice = async (createInQB = true) => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    if (!items.some(item => item.description && item.amount > 0)) {
      alert('Please add at least one valid line item');
      return;
    }

    try {
      setLoading(true);

      const invoiceData = {
        clientId: selectedClient,
        invoiceNumber,
        dueDate,
        notes,
        items: items.filter(item => item.description && item.amount > 0)
      };

      let response;
      if (createInQB && qbConnected) {
        response = await axios.post(`${BASE_URL}/api/invoices/create-qb-invoice`, invoiceData);
      } else {
        response = await axios.post(`${BASE_URL}/api/invoices/create-draft`, invoiceData);
      }

      if (response.data.success) {
        alert(createInQB && qbConnected 
          ? 'Invoice created successfully in QuickBooks and saved to database!' 
          : 'Draft invoice saved to database!'
        );
        
        // Reset form
        resetForm();
      }
    } catch (error) {
      console.error('Invoice creation failed:', error);
      alert('Failed to create invoice: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedClient('');
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`);
    setNotes('');
    setItems([{ description: '', quantity: 1, rate: 0, amount: 0 }]);
    
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    setDueDate(defaultDueDate.toISOString().split('T')[0]);
  };

  const { subtotal, tax, total } = calculateTotals();
  const selectedClientData = clients.find(c => c._id === selectedClient);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create Invoice</h1>
        
        <div className="flex items-center space-x-4">
          {qbConnected ? (
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm">QB Connected</span>
            </div>
          ) : (
            <div className="flex items-center text-orange-600">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-sm">QB Disconnected (Draft only)</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client *
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
          
          {selectedClientData && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
              <div>{selectedClientData.email}</div>
              <div>{selectedClientData.phone}</div>
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Auto-generated"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800">Line Items</h3>
          <button
            onClick={addItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left text-sm font-medium text-gray-700">Description</th>
                <th className="p-3 text-left text-sm font-medium text-gray-700 w-24">Qty</th>
                <th className="p-3 text-left text-sm font-medium text-gray-700 w-32">Rate</th>
                <th className="p-3 text-left text-sm font-medium text-gray-700 w-32">Amount</th>
                <th className="p-3 text-left text-sm font-medium text-gray-700 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="p-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Service description"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="p-3">
                    <div className="p-2 bg-gray-50 rounded text-right font-medium">
                      ${parseFloat(item.amount || 0).toFixed(2)}
                    </div>
                  </td>
                  <td className="p-3">
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove item"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (10%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="Additional notes for this invoice..."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => createInvoice(false)}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : 'Save as Draft'}
        </button>

        {qbConnected ? (
          <button
            onClick={() => createInvoice(true)}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create in QuickBooks'}
          </button>
        ) : (
          <div className="text-sm text-orange-600 flex items-center">
            <span>Connect QuickBooks to create invoices directly</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceCreator;