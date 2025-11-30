/**
 * MODULE VIEW PLACEHOLDERS
 * Placeholder components for each module until full implementation
 */
import React from 'react';
import {
  IconFile,
  IconFolder,
  IconScale,
  IconDuplicate,
  IconCart,
  IconChart,
  IconChat,
  IconSettings,
} from '@/shared/IconSet.jsx';

const ModulePlaceholder = ({ icon: Icon, title, description, comingSoon = false }) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary-10 flex items-center justify-center">
          <Icon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-textBlack mb-3">{title}</h2>
        <p className="text-textGray mb-6">{description}</p>
        {comingSoon && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-white">
            <span className="text-sm font-medium">Coming Soon</span>
          </div>
        )}
        {!comingSoon && (
          <div className="text-sm text-textGray">
            This module is ready for implementation
          </div>
        )}
      </div>
    </div>
  );
};

export const ProjectInfoView = () => (
  <ModulePlaceholder
    icon={IconFile}
    title="Project Information"
    description="View and edit client details, site information, roofing specifications, and project notes."
  />
);

export const ProjectFilesView = () => (
  <ModulePlaceholder
    icon={IconFolder}
    title="Project Files"
    description="Manage plans, specifications, emails, photos, and all project documents with drag-and-drop organization."
  />
);

export const TakeoffsView = () => (
  <ModulePlaceholder
    icon={IconScale}
    title="Take-offs & Measurements"
    description="Create and manage roof measurements, calculate quantities, and generate detailed material lists."
  />
);

export const QuotesView = () => (
  <ModulePlaceholder
    icon={IconDuplicate}
    title="Quotes & Pricing"
    description="Create multi-option quotes, manage pricing, track margins, and send proposals to clients."
  />
);

export const OrdersView = () => (
  <ModulePlaceholder
    icon={IconCart}
    title="Orders & Materials"
    description="Manage supplier orders, track deliveries, and coordinate material procurement."
  />
);

export const TimelineView = () => (
  <ModulePlaceholder
    icon={IconChart}
    title="Project Timeline"
    description="View chronological history of all project activities, status changes, and milestones."
  />
);

export const NotesView = () => (
  <ModulePlaceholder
    icon={IconChat}
    title="Notes & Emails"
    description="Manage project communications, sync with Rusty AI inbox, and maintain project notes."
  />
);

export const SettingsView = () => (
  <ModulePlaceholder
    icon={IconSettings}
    title="Project Settings"
    description="Configure project preferences, permissions, and advanced options."
  />
);
