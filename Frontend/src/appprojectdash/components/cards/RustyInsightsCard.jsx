/**
 * RUSTY AI INSIGHTS CARD
 * Shows AI-detected issues and recommendations
 */
import React from 'react';
import InfoCard from '@/appprojectdash/components/shared/InfoCard.jsx';
import {
  IconWarning,
  IconInfo,
  IconComplete,
  IconSparkles,
} from '@/shared/IconSet.jsx';

const RustyInsightsCard = ({ insights = [], onViewDetails }) => {
  const insightIcons = {
    warning: { Icon: IconWarning, color: 'text-Orange' },
    info: { Icon: IconInfo, color: 'text-secondary' },
    success: { Icon: IconComplete, color: 'text-primary' },
    suggestion: { Icon: IconSparkles, color: 'text-purple-600' },
  };

  const insightBgColors = {
    warning: 'bg-orange-50 border-Orange',
    info: 'bg-blue-50 border-secondary',
    success: 'bg-green-50 border-primary',
    suggestion: 'bg-purple-50 border-purple-600',
  };

  return (
    <InfoCard
      title="Rusty AI Insights"
      icon={IconSparkles}
      variant="info"
      actions={
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-xs text-textGray">Active</span>
        </div>
      }
    >
      {insights.length === 0 ? (
        <div className="text-center py-6 text-textGray">
          <IconSparkles className="w-12 h-12 mx-auto mb-2 text-secondary opacity-30" />
          <p className="text-sm">No insights yet</p>
          <p className="text-xs mt-1">Rusty AI is analyzing your project...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.slice(0, 3).map((insight, index) => {
            const { Icon, color } = insightIcons[insight.type] || insightIcons.info;
            const bgColor = insightBgColors[insight.type] || insightBgColors.info;

            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${bgColor} transition-all hover:shadow-md cursor-pointer group`}
                onClick={() => onViewDetails?.(insight.id)}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${color} mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-textBlack group-hover:text-primary transition-colors">
                    {insight.title}
                  </p>
                  {insight.description && (
                    <p className="text-xs text-textGray mt-1 line-clamp-2">
                      {insight.description}
                    </p>
                  )}
                  {insight.action && (
                    <button className="text-xs text-primary hover:text-green-700 font-medium mt-2 flex items-center gap-1">
                      {insight.action}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {insights.length > 3 && (
        <div className="mt-3 pt-3 border-t border-blue-200 text-center">
          <button className="text-sm text-secondary hover:text-blue-700 font-medium">
            View {insights.length - 3} more insights
          </button>
        </div>
      )}
    </InfoCard>
  );
};

export default RustyInsightsCard;
