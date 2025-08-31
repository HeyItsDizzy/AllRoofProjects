// ReadOnlyProjectView.jsx - Public read-only project view
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, Typography, Descriptions, Tag, Alert, Spin, Button } from "antd";
import { EyeOutlined, HomeOutlined, CalendarOutlined, FileTextOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title, Text, Paragraph } = Typography;

/**
 * ReadOnlyProjectView Component - Public view for project details using read-only token
 * No authentication required - accessed via email links
 */
const ReadOnlyProjectView = () => {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://projects.allrooftakeoffs.com.au/api";

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`${API_BASE_URL}/projects/view-readonly/${token}`);
        
        if (response.data.success) {
          setProject(response.data.data);
        } else {
          setError(response.data.message || "Failed to load project");
        }
      } catch (err) {
        console.error("Error fetching read-only project:", err);
        if (err.response?.status === 404) {
          setError("Project not found or access link has expired");
        } else if (err.response?.status === 400) {
          setError("Invalid access link");
        } else {
          setError("Failed to load project. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProject();
    } else {
      setError("No access token provided");
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  const getStatusColor = (status) => {
    const statusColors = {
      "New Lead": "blue",
      "In Progress": "orange",
      "Complete": "green",
      "On Hold": "red",
      "Cancelled": "default"
    };
    return statusColors[status] || "default";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <Card style={{ textAlign: 'center', minWidth: 300 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>Loading project details...</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f5f5',
        padding: '20px'
      }}>
        <Card style={{ maxWidth: 500, width: '100%' }}>
          <Alert
            message="Access Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 20 }}
          />
          <div style={{ textAlign: 'center' }}>
            <Button type="primary" href="https://allrooftakeoffs.com.au">
              Visit All Roof Takeoffs
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f5f5', 
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ 
          background: '#009245', 
          color: 'white', 
          padding: '30px 40px', 
          borderRadius: '8px 8px 0 0',
          textAlign: 'center'
        }}>
          <Title level={1} style={{ color: 'white', margin: 0 }}>
            All Roof Takeoffs
          </Title>
          <Text style={{ color: 'white', fontSize: '16px' }}>
            Professional Roof Takeoff Services
          </Text>
        </div>

        {/* Read-only notice */}
        <Alert
          message={
            <span>
              <EyeOutlined /> You are viewing this project in read-only mode
            </span>
          }
          description="This is a secure link provided to you for viewing project details. No editing capabilities are available."
          type="info"
          showIcon={false}
          style={{ 
            borderRadius: 0,
            borderLeft: 'none',
            borderRight: 'none'
          }}
        />

        {/* Project Details Card */}
        <Card 
          style={{ 
            borderRadius: '0 0 8px 8px',
            border: '1px solid #d9d9d9',
            borderTop: 'none'
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0, color: '#081F13' }}>
              {project.name}
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Project #{project.projectNumber}
            </Text>
          </div>

          <Descriptions 
            column={{ xs: 1, sm: 1, md: 2 }}
            labelStyle={{ fontWeight: 'bold', color: '#081F13' }}
            contentStyle={{ color: '#696D7D' }}
          >
            <Descriptions.Item 
              label={<span><HomeOutlined /> Location</span>}
              span={2}
            >
              {project.location || "Not specified"}
            </Descriptions.Item>

            <Descriptions.Item 
              label={<span><Tag color={getStatusColor(project.status)}>Status</Tag></span>}
            >
              {project.status}
            </Descriptions.Item>

            <Descriptions.Item 
              label={<span><CalendarOutlined /> Due Date</span>}
            >
              {formatDate(project.due_date)}
            </Descriptions.Item>

            <Descriptions.Item 
              label={<span><CalendarOutlined /> Posted Date</span>}
            >
              {formatDate(project.posting_date)}
            </Descriptions.Item>

            {project.description && (
              <Descriptions.Item 
                label={<span><FileTextOutlined /> Description</span>}
                span={2}
              >
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {project.description}
                </Paragraph>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Contact Information Card */}
        <Card 
          title="Contact Information" 
          style={{ 
            marginTop: 24,
            border: '1px solid #009245'
          }}
          headStyle={{ 
            backgroundColor: '#f1f9f4', 
            color: '#009245',
            fontWeight: 'bold'
          }}
        >
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div>
              <Text strong style={{ color: '#081F13' }}>ABN:</Text><br />
              <Text>28 212 267 152</Text>
            </div>
            <div>
              <Text strong style={{ color: '#081F13' }}>Email:</Text><br />
              <a href="mailto:requests@allrooftakeoffs.com.au" style={{ color: '#009245' }}>
                requests@allrooftakeoffs.com.au
              </a>
            </div>
            <div>
              <Text strong style={{ color: '#081F13' }}>Website:</Text><br />
              <a href="https://allrooftakeoffs.com.au/" target="_blank" rel="noopener noreferrer" style={{ color: '#009245' }}>
                https://allrooftakeoffs.com.au/
              </a>
            </div>
            <div>
              <Text strong style={{ color: '#081F13' }}>Call Hours:</Text><br />
              <Text>Between 4:00pm-9:00pm AEST</Text>
            </div>
            <div>
              <Text strong style={{ color: '#081F13' }}>WhatsApp:</Text><br />
              <a href="https://wa.me/61438399983" target="_blank" rel="noopener noreferrer" style={{ color: '#009245' }}>
                +61 438 399 983
              </a>
              <br />
              <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                (I travel internationally - WhatsApp will always reach me)
              </Text>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: 40, 
          padding: '20px',
          color: '#999999',
          fontSize: '12px'
        }}>
          <Text type="secondary">
            © {new Date().getFullYear()} All Roof Takeoffs - Professional Roof Takeoff Services
          </Text>
          <br />
          <Text type="secondary">
            This is a secure project view. Please do not share this link with unauthorized parties.
          </Text>
        </div>

      </div>
    </div>
  );
};

export default ReadOnlyProjectView;
