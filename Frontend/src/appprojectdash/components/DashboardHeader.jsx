/**
 * DASHBOARD HEADER
 * Top bar with project info, status, and quick actions
 */
import React, { useState } from 'react';
import {
  IconSearch,
  IconMenuDots,
  IconBell,
} from '@/shared/IconSet.jsx';
import StatusBadge from '@/appprojectdash/components/shared/StatusBadge.jsx';
import QuickActionButton from '@/appprojectdash/components/shared/QuickActionButton.jsx';
import { QUICK_ACTIONS, Z_INDEX_LAYERS } from '@/appprojectdash/config/ProjectDashConfig.jsx';

const DashboardHeader = ({
  projectNumber,
  projectName,
  clientName,
  siteAddress,
  status,
  onQuickAction,
  onSearch,
  onNotifications,
  showUtilityPanel = false,
  onToggleUtilityPanel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <header
      className="fixed top-0 right-0 bg-white border-b-2 border-gray-200 shadow-sm"
      style={{
        left: '80px',
        zIndex: Z_INDEX_LAYERS.HEADER,
      }}
    >
      <div className="px-6 py-4">
        {/* Top Row: Title + Actions */}
        <div className="flex items-center justify-between mb-3">
          {/* Project Title */}
          <div className="flex items-center gap-4">
            {/* Project Icon */}
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-textBlack">
                  {projectNumber} {projectName}
                </h1>
                <StatusBadge status={status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-textGray mt-1">
                <span className="font-medium">{clientName}</span>
                <span>•</span>
                <span>{siteAddress}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            {QUICK_ACTIONS.map((action) => (
              <QuickActionButton
                key={action.id}
                label={action.label}
                icon={action.icon}
                color={action.color}
                onClick={() => onQuickAction?.(action.id)}
                size="sm"
              />
            ))}

            {/* Notifications */}
            <button
              onClick={onNotifications}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-all duration-200 relative"
              title="Notifications"
            >
              <IconBell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-Orange rounded-full animate-pulse" />
            </button>

            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-all duration-200"
              title="Search"
            >
              <IconSearch className="w-6 h-6" />
            </button>

            {/* Utility Panel Toggle */}
            <button
              onClick={onToggleUtilityPanel}
              className={`p-2 rounded-lg transition-all duration-200 ${
                showUtilityPanel
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
              }`}
              title="Activity Panel"
            >
              <IconMenuDots className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        {showSearch && (
          <div className="mt-3 animate-slideDown">
            <form onSubmit={handleSearch} className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files, quotes, orders..."
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
                autoFocus
              />
            </form>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
