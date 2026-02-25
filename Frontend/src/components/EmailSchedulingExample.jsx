import React, { useState, useEffect } from 'react';
import useTimezone from '../hooks/useTimezone';

const EmailSchedulingExample = ({ clientData, projectData, onSchedule }) => {
  const { 
    scheduleAtRecipientTime, 
    formatForEmail, 
    detectRecipientTimezone 
  } = useTimezone();
  
  const [scheduledTime, setScheduledTime] = useState('06:00'); // Default 6:00 AM
  const [scheduledDate, setScheduledDate] = useState('');
  const [emailPreview, setEmailPreview] = useState(null);

  useEffect(() => {
    // Set default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduledDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (scheduledTime && scheduledDate) {
      // Generate scheduling info
      const scheduleInfo = scheduleAtRecipientTime(
        scheduledTime, 
        clientData, 
        projectData, 
        new Date(scheduledDate)
      );

      if (scheduleInfo) {
        setEmailPreview(scheduleInfo);
      }
    }
  }, [scheduledTime, scheduledDate, clientData, projectData, scheduleAtRecipientTime]);

  const handleScheduleEmail = () => {
    if (emailPreview && onSchedule) {
      onSchedule({
        ...emailPreview,
        clientData,
        projectData
      });
    }
  };

  const recipientTimezone = detectRecipientTimezone(clientData, projectData);
  const emailFormat = formatForEmail(scheduledDate, clientData, projectData);

  return (
    <div className="email-scheduling-container">
      <h3>Schedule Email Delivery</h3>
      
      <div className="recipient-info">
        <h4>Recipient Information</h4>
        <p><strong>Detected Timezone:</strong> {recipientTimezone}</p>
        <p><strong>Client:</strong> {clientData?.name || 'Unknown'}</p>
        <p><strong>Project:</strong> {projectData?.name || 'Unknown'}</p>
      </div>

      <div className="scheduling-controls">
        <div className="form-group">
          <label htmlFor="schedule-date">Delivery Date:</label>
          <input
            id="schedule-date"
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="schedule-time">Delivery Time (Recipient's Local Time):</label>
          <input
            id="schedule-time"
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
          />
          <small>This will be {scheduledTime} in the recipient's timezone ({recipientTimezone})</small>
        </div>
      </div>

      {emailPreview && (
        <div className="email-preview">
          <h4>Email Delivery Preview</h4>
          <div className="preview-details">
            <p><strong>Recipient will receive at:</strong></p>
            <ul>
              <li><strong>Local Date:</strong> {emailPreview.recipientLocalDate}</li>
              <li><strong>Local Time:</strong> {emailPreview.recipientLocalTime}</li>
              <li><strong>Timezone:</strong> {emailPreview.recipientTimezone}</li>
            </ul>
            
            <p><strong>Server scheduling:</strong></p>
            <ul>
              <li><strong>UTC Time:</strong> {new Date(emailPreview.scheduledTime).toUTCString()}</li>
              <li><strong>Your Time:</strong> {new Date(emailPreview.scheduledTime).toLocaleString()}</li>
            </ul>
          </div>
        </div>
      )}

      <div className="email-template-preview">
        <h4>Email Template Preview</h4>
        <div className="template-content">
          <p>Dear {clientData?.name || 'Client'},</p>
          <p>
            Your estimate will be delivered on {emailFormat.dayOfWeek}, {emailFormat.formatted} 
            at {scheduledTime} (your local time).
          </p>
          <p>Best regards,<br/>Your Team</p>
        </div>
      </div>

      <button 
        onClick={handleScheduleEmail}
        className="schedule-button"
        disabled={!emailPreview}
      >
        Schedule Email for {scheduledTime} Recipient Time
      </button>

      <style jsx>{`
        .email-scheduling-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
        }

        .recipient-info {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .form-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .form-group small {
          color: #666;
          font-size: 0.85em;
          margin-top: 5px;
          display: block;
        }

        .email-preview {
          background: #e8f4f8;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }

        .preview-details ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .email-template-preview {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }

        .template-content {
          background: white;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .schedule-button {
          background: #007cba;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
        }

        .schedule-button:hover:not(:disabled) {
          background: #005a87;
        }

        .schedule-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        h3, h4 {
          color: #333;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  );
};

export default EmailSchedulingExample;