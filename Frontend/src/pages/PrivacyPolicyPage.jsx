// src/pages/PrivacyPolicyPage.jsx
import React from 'react';
import { Typography, Divider, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const PrivacyPolicyPage = () => {
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
            <Title level={2} className="text-center">Privacy Policy</Title>
            <div className="text-center text-gray-500 mb-6">
              <em>Last Updated: 2025-07-30</em>
            </div>
          </div>

          <div className="text-sm leading-6 text-gray-700 space-y-4">
            <Paragraph>
              All Roof Take-Offs (<Text italic>"we", "our", "us"</Text>) is committed to protecting your privacy. This policy outlines how we collect, use, and protect your data.
            </Paragraph>
            <Divider />

            <Title level={4}>1. What We Collect</Title>
            <Paragraph>
              When you use our platform, we may collect:
              <ul className="list-disc list-inside">
                <li>Name, email, phone, and company name</li>
                <li>Project details and uploaded files</li>
                <li>IP address and browser/device data</li>
                <li>Login timestamps and usage analytics</li>
                <li>Financial data from QuickBooks (only with your explicit consent)</li>
              </ul>
            </Paragraph>

            <Title level={4}>2. How We Use Your Data</Title>
            <Paragraph>
              We use your data to:
              <ul className="list-disc list-inside">
                <li>Provide estimation services and project tracking</li>
                <li>Contact you regarding project updates or account changes</li>
                <li>Comply with legal obligations</li>
                <li>Improve our platform via analytics</li>
                <li>Integrate with third-party services like QuickBooks (with your permission)</li>
              </ul>
            </Paragraph>

            <Title level={4}>3. QuickBooks Data Integration</Title>
            <Paragraph>
              When you connect your QuickBooks account to our platform:
              <ul className="list-disc list-inside">
                <li>We only access data you explicitly authorize during the connection process</li>
                <li>We use this data solely to provide project management and financial integration features</li>
                <li>We do not share your QuickBooks data with unauthorized third parties</li>
                <li>You can disconnect the integration at any time through your account settings</li>
                <li>We comply with Intuit's security and privacy requirements</li>
                <li>QuickBooks data is encrypted in transit and at rest</li>
              </ul>
            </Paragraph>

            <Title level={4}>4. Storage and Security</Title>
            <Paragraph>
              Data is stored on secure servers with access control. Uploaded files are only accessible to authorised staff, and we retain data as long as needed to support your account. We implement industry-standard security measures including encryption, secure authentication, and regular security assessments.
            </Paragraph>

            <Title level={4}>5. Sharing of Data</Title>
            <Paragraph>
              We do <Text strong>not sell or rent</Text> your personal data. We may share data only:
              <ul className="list-disc list-inside">
                <li>With trusted contractors strictly to complete your service</li>
                <li>With authorized third-party integrations (like QuickBooks) that you have explicitly connected</li>
                <li>If required by law or government request</li>
                <li>To enforce our Terms and prevent abuse</li>
              </ul>
            </Paragraph>

            <Title level={4}>6. Cookies and Analytics</Title>
            <Paragraph>
              We use basic cookies and analytics tools (e.g. Google Analytics) to improve the user experience. You can disable cookies in your browser if desired. We also use session cookies to maintain your login state and preferences.
            </Paragraph>

            <Title level={4}>7. Your Rights</Title>
            <Paragraph>
              You have the right to:
              <ul className="list-disc list-inside">
                <li>Request access to your personal data</li>
                <li>Ask for correction or deletion</li>
                <li>Withdraw consent at any time (this may affect service availability)</li>
                <li>Disconnect third-party integrations like QuickBooks</li>
                <li>Export your project data</li>
                <li>Request data portability</li>
              </ul>
            </Paragraph>

            <Title level={4}>8. Data Retention</Title>
            <Paragraph>
              We retain your information for as long as your account is active or as needed to provide services. We may retain certain information after account closure for legal compliance, dispute resolution, or legitimate business purposes. QuickBooks integration data is only retained while the connection is active.
            </Paragraph>

            <Title level={4}>9. Minors</Title>
            <Paragraph>
              Our services are not intended for individuals under 18. We do not knowingly collect data from minors.
            </Paragraph>

            <Title level={4}>10. International Data Transfers</Title>
            <Paragraph>
              Your data may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data in accordance with applicable privacy laws.
            </Paragraph>

            <Title level={4}>11. Changes</Title>
            <Paragraph>
              We may update this policy as needed. Changes will be posted on our website and you will be notified of material changes via email or through the platform.
            </Paragraph>

            <Title level={4}>12. Contact Us</Title>
            <Paragraph>
              If you have privacy-related questions or concerns:
              <br />
              📧 <a href="mailto:support@allrooftakeoffs.com.au">support@allrooftakeoffs.com.au</a>
              <br />
              📧 Privacy Officer: <a href="mailto:privacy@allrooftakeoffs.com.au">privacy@allrooftakeoffs.com.au</a>
              <br />
              📍 All Roof Take-Offs (Australia)
            </Paragraph>

            <Title level={4}>13. Compliance</Title>
            <Paragraph>
              We comply with applicable data protection laws, including the Australian Privacy Principles under the Privacy Act 1988, and work to meet international privacy standards for our third-party integrations.
            </Paragraph>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;