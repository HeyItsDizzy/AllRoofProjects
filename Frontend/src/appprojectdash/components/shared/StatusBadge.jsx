/**
 * STATUS BADGE COMPONENT
 * Displays project status with color-coded styling
 */
import React from 'react';
import { PROJECT_STATUSES } from '@/appprojectdash/config/ProjectDashConfig.jsx';

const StatusBadge = ({ status, showDot = true, size = 'md' }) => {
  const statusConfig = Object.values(PROJECT_STATUSES).find(
    s => s.key === status?.toLowerCase()
  ) || PROJECT_STATUSES.ESTIMATING;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${statusConfig.color}
        ${sizeClasses[size]}
        transition-all duration-200 hover:shadow-md
      `}
    >
      {showDot && (
        <span className={`rounded-full ${statusConfig.dotColor} ${dotSizeClasses[size]} animate-pulse`} />
      )}
      <span>{statusConfig.label}</span>
    </div>
  );
};

export default StatusBadge;
