// src/components/PrivacyModal.jsx

import React from "react";
import { Modal, Typography, Divider } from "antd";

const { Title, Paragraph, Text } = Typography;

const PrivacyModal = ({ visible, onClose }) => (
  <Modal
    title="Privacy Policy"
    open={visible}
    onCancel={onClose}
    footer={null}
    width={800}
    bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
  >
    <div className="text-sm leading-6 text-gray-700 space-y-4">
      <Title level={4}>Privacy Policy</Title>
      <Paragraph><em>Last Updated: 2025-07-30</em></Paragraph>
      <Paragraph>
        All Roof Take-Offs (<Text italic>"we", "our", "us"</Text>) is committed to protecting your privacy. This policy outlines how we collect, use, and protect your data.
      </Paragraph>
      <Divider />

      <Title level={5}>1. What We Collect</Title>
      <Paragraph>
        When you use our platform, we may collect:
        <ul className="list-disc list-inside">
          <li>Name, email, phone, and company name</li>
          <li>Project details and uploaded files</li>
          <li>IP address and browser/device data</li>
          <li>Login timestamps and usage analytics</li>
        </ul>
      </Paragraph>

      <Title level={5}>2. How We Use Your Data</Title>
      <Paragraph>
        We use your data to:
        <ul className="list-disc list-inside">
          <li>Provide estimation services and project tracking</li>
          <li>Contact you regarding project updates or account changes</li>
          <li>Comply with legal obligations</li>
          <li>Improve our platform via analytics</li>
        </ul>
      </Paragraph>

      <Title level={5}>3. Storage and Security</Title>
      <Paragraph>
        Data is stored on secure servers with access control. Uploaded files are only accessible to authorised staff, and we retain data as long as needed to support your account.
      </Paragraph>

      <Title level={5}>4. Sharing of Data</Title>
      <Paragraph>
        We do <Text strong>not sell or rent</Text> your personal data. We may share data only:
        <ul className="list-disc list-inside">
          <li>With trusted contractors strictly to complete your service</li>
          <li>If required by law or government request</li>
          <li>To enforce our Terms and prevent abuse</li>
        </ul>
      </Paragraph>

      <Title level={5}>5. Cookies and Analytics</Title>
      <Paragraph>
        We use basic cookies and analytics tools (e.g. Google Analytics) to improve the user experience. You can disable cookies in your browser if desired.
      </Paragraph>

      <Title level={5}>6. Your Rights</Title>
      <Paragraph>
        You have the right to:
        <ul className="list-disc list-inside">
          <li>Request access to your personal data</li>
          <li>Ask for correction or deletion</li>
          <li>Withdraw consent at any time (this may affect service availability)</li>
        </ul>
      </Paragraph>

      <Title level={5}>7. Minors</Title>
      <Paragraph>
        Our services are not intended for individuals under 18. We do not knowingly collect data from minors.
      </Paragraph>

      <Title level={5}>8. Changes</Title>
      <Paragraph>
        We may update this policy as needed. Changes will be posted on our website.
      </Paragraph>

      <Title level={5}>9. Contact Us</Title>
      <Paragraph>
        If you have privacy-related questions or concerns:
        <br />
        📧 <a href="mailto:support@allrooftakeoffs.com.au">support@allrooftakeoffs.com.au</a>
        <br />
        📍 All Roof Take-Offs (Australia)
      </Paragraph>
    </div>
  </Modal>
);

export default PrivacyModal;
