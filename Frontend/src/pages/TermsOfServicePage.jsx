// src/pages/TermsOfServicePage.jsx
import React from 'react';
import { Typography, Divider, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              Back
            </Button>
            <Title level={2} className="text-center">Terms and Conditions</Title>
            <div className="text-center text-gray-500 mb-6">
              <em>Last Updated: 2025-07-30</em>
            </div>
          </div>

          <div className="text-gray-700 leading-6 space-y-4">
            <Paragraph>
              These Terms and Conditions ("Terms") govern your use of All Roof Take-Offs ("we", "us", "our", or the "Service"). By accessing or using our platform at <a href="https://projects.allrooftakeoffs.com.au">projects.allrooftakeoffs.com.au</a>, you agree to these Terms in full.
            </Paragraph>
            <Divider />

            <Title level={4}>1. Service Use</Title>
            <ul className="list-disc list-inside">
              <li>You must be at least 18 years old and legally able to enter contracts to use our platform.</li>
              <li>You agree not to misuse, resell, or redistribute our reports, take-off data, or platform services without written permission.</li>
              <li>We reserve the right to suspend or terminate your access at any time if we believe you're violating these terms.</li>
            </ul>
            <Divider />

            <Title level={4}>2. Take-Off Accuracy</Title>
            <ul className="list-disc list-inside">
              <li>Our take-offs are based on drawings and materials provided to us.</li>
              <li>These are <strong>estimates only</strong> and must be <strong>verified on-site</strong> by a qualified installer before construction.</li>
              <li>We do not accept liability for misinterpretations, missing documents, or incorrect installation based on our take-offs.</li>
            </ul>
            <Divider />

            <Title level={4}>3. File Uploads and Content</Title>
            <ul className="list-disc list-inside">
              <li>By uploading files, you confirm that you have the right to share those documents.</li>
              <li>You agree not to upload any malicious or illegal content.</li>
              <li>Uploaded content is stored securely and may be used solely to complete take-off requests.</li>
            </ul>
            <Divider />

            <Title level={4}>4. Payment and Invoicing</Title>
            <ul className="list-disc list-inside">
              <li>All invoices must be paid within 7 days unless a prior agreement is made.</li>
              <li>Failure to pay may result in late fees, withheld services, or referral to a collection agency.</li>
              <li>GST (Goods and Services Tax) will be applied where applicable.</li>
            </ul>
            <Divider />

            <Title level={4}>5. QuickBooks Integration</Title>
            <ul className="list-disc list-inside">
              <li>Our platform integrates with QuickBooks to provide financial management capabilities.</li>
              <li>By connecting your QuickBooks account, you authorize us to access your QuickBooks data as necessary to provide the service.</li>
              <li>We will only access the data you explicitly authorize during the connection process.</li>
              <li>You can disconnect the QuickBooks integration at any time through your account settings.</li>
            </ul>
            <Divider />

            <Title level={4}>6. Cancellation & Refund Policy</Title>
            <ul className="list-disc list-inside">
              <li>No refunds will be issued once a take-off has begun unless agreed otherwise.</li>
              <li>If work is cancelled before commencement, a 10% admin fee may apply.</li>
            </ul>
            <Divider />

            <Title level={4}>7. Intellectual Property</Title>
            <ul className="list-disc list-inside">
              <li>All deliverables, including reports and estimates, remain the intellectual property of All Roof Take-Offs until full payment is received.</li>
              <li>Copying, reproducing, or distributing our documents is prohibited without permission.</li>
            </ul>
            <Divider />

            <Title level={4}>8. Liability Disclaimer</Title>
            <ul className="list-disc list-inside">
              <li>We do not guarantee any construction outcome based on our data.</li>
              <li>We are not liable for indirect or consequential losses, including project delays or material overruns.</li>
            </ul>
            <Divider />

            <Title level={4}>9. Account and Data Security</Title>
            <ul className="list-disc list-inside">
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must notify us immediately if you suspect unauthorised access.</li>
            </ul>
            <Divider />

            <Title level={4}>10. Amendments</Title>
            <Paragraph>
              We may update these Terms at any time. Continued use of the service after changes constitutes your acceptance of the new terms.
            </Paragraph>
            <Divider />

            <Title level={4}>11. Contact</Title>
            <Paragraph>
              For any questions, please contact:<br/>
              📧 <a href="mailto:support@allrooftakeoffs.com.au">support@allrooftakeoffs.com.au</a><br/>
              📍 Australia (QLD/National)
            </Paragraph>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;