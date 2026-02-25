/**
 * LATEST UPLOADS CARD
 * Shows most recent files uploaded to project
 */
import React from 'react';
import InfoCard from '@/appprojectdash/components/shared/InfoCard.jsx';
import { IconFile, IconUploadFile, getFileIcon } from '@/shared/IconSet.jsx';

const LatestUploadsCard = ({ files = [], onViewAll }) => {

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <InfoCard
      title="Latest Uploads"
      icon={IconUploadFile}
      variant="default"
      actions={
        onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:text-green-700 font-medium"
          >
            View All
          </button>
        )
      }
    >
      {files.length === 0 ? (
        <div className="text-center py-6 text-textGray">
          <IconFile className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.slice(0, 3).map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              {getFileIcon(file.name, 20)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-textBlack truncate group-hover:text-primary transition-colors">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-textGray">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.uploadedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
};

export default LatestUploadsCard;
