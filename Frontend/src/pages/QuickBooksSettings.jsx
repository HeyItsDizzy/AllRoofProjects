/**
 * QuickBooks Settings Page
 * Manage QuickBooks integration for the company
 */

import React from 'react';
import { Typography } from 'antd';
import CompanyQBManager from '../components/admin/CompanyQBManager';

const { Title } = Typography;

const QuickBooksSettings = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Title level={2} className="text-gray-900 mb-2">
            QuickBooks Integration
          </Title>
          <p className="text-gray-600">
            Manage your QuickBooks connection, sync customers, and create invoices.
          </p>
        </div>
        
        <CompanyQBManager />
      </div>
    </div>
  );
};

export default QuickBooksSettings;
