/**
 * PROJECT DASHBOARD - MAIN CONTAINER
 * Complete 3-zone layout: Left Nav, Main Workspace, Right Utility Panel
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LeftNavigationRail from '@/appprojectdash/components/LeftNavigationRail.jsx';
import DashboardHeader from '@/appprojectdash/components/DashboardHeader.jsx';
import DashboardHome from '@/appprojectdash/components/DashboardHome.jsx';
import RightUtilityPanel from '@/appprojectdash/components/RightUtilityPanel.jsx';
import {
  ProjectInfoView,
  ProjectFilesView,
  TakeoffsView,
  QuotesView,
  OrdersView,
  TimelineView,
  NotesView,
  SettingsView,
} from '@/appprojectdash/components/modules/ModuleViews.jsx';
import { useNavigationState } from '@/appprojectdash/hooks/useNavigationState.js';
import { useDashboardData } from '@/appprojectdash/hooks/useDashboardData.js';
import { useActivityFeed } from '@/appprojectdash/hooks/useActivityFeed.js';
import '@/appprojectdash/ProjectDashboard.css';

const ProjectDashboard = ({ projectId: propProjectId, onClose }) => {
  const { projectId: paramProjectId } = useParams();
  const navigate = useNavigate();
  const projectId = propProjectId || paramProjectId;
  const [utilityPanelOpen, setUtilityPanelOpen] = useState(false);
  const { activeModule, navigateTo } = useNavigationState('dashboard');
  const { loading, error, data, refresh } = useDashboardData(projectId);
  const { unreadCount } = useActivityFeed(projectId);

  // Handle quick actions
  const handleQuickAction = (actionId) => {
    console.log('Quick action:', actionId);
    switch (actionId) {
      case 'upload':
        navigateTo('files');
        break;
      case 'takeoff':
        navigateTo('takeoffs');
        break;
      case 'quote':
        navigateTo('quotes');
        break;
      case 'order':
        navigateTo('orders');
        break;
      default:
        break;
    }
  };

  // Handle task completion
  const handleTaskComplete = (taskId) => {
    console.log('Task completed:', taskId);
    refresh();
  };

  // Handle Rusty AI insight view
  const handleInsightView = (insightId) => {
    console.log('View insight:', insightId);
    setUtilityPanelOpen(true);
  };

  // Render active module content
  const renderModuleContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-textGray">Loading project data...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-textBlack mb-2">Error Loading Project</h3>
            <p className="text-textGray mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    switch (activeModule) {
      case 'dashboard':
        return (
          <DashboardHome
            projectData={data}
            onNavigate={navigateTo}
            onTaskComplete={handleTaskComplete}
            onInsightView={handleInsightView}
            onSupplierCheck={() => console.log('Check supplier prices')}
            onWindVerify={() => console.log('Verify wind region')}
            onColorSelect={(color) => console.log('Color selected:', color)}
          />
        );
      case 'info':
        return <ProjectInfoView />;
      case 'files':
        return <ProjectFilesView />;
      case 'takeoffs':
        return <TakeoffsView />;
      case 'quotes':
        return <QuotesView />;
      case 'orders':
        return <OrdersView />;
      case 'timeline':
        return <TimelineView />;
      case 'notes':
        return <NotesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardHome projectData={data} onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="project-dashboard-container">
      {/* Left Navigation Rail */}
      <LeftNavigationRail
        activeModule={activeModule}
        onModuleChange={navigateTo}
      />

      {/* Main Content Area */}
      <div className="project-dashboard-main">
        {/* Header */}
        {data && (
          <DashboardHeader
            projectNumber={data.projectInfo.projectNumber}
            projectName={data.projectInfo.projectName}
            clientName={data.projectInfo.clientName}
            siteAddress={data.projectInfo.siteAddress}
            status={data.projectInfo.status}
            onQuickAction={handleQuickAction}
            onSearch={(query) => console.log('Search:', query)}
            onNotifications={() => setUtilityPanelOpen(true)}
            showUtilityPanel={utilityPanelOpen}
            onToggleUtilityPanel={() => setUtilityPanelOpen(!utilityPanelOpen)}
          />
        )}

        {/* Module Content */}
        <div className="project-dashboard-content">
          {renderModuleContent()}
        </div>
      </div>

      {/* Right Utility Panel */}
      <RightUtilityPanel
        isOpen={utilityPanelOpen}
        onClose={() => setUtilityPanelOpen(false)}
        projectId={projectId}
      />
    </div>
  );
};

export default ProjectDashboard;
