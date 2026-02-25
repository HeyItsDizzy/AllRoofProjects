/**
 * PROGRESS CARD
 * Shows project progression through stages
 */
import React from 'react';
import { PROGRESS_STAGES } from '@/appprojectdash/config/ProjectDashConfig.jsx';
import InfoCard from '@/appprojectdash/components/shared/InfoCard.jsx';
import { IconChart } from '@/shared/IconSet.jsx';

const ProgressCard = ({ currentStage = 'estimate', percentage = 0 }) => {
  const getCurrentStageIndex = () => {
    const stage = PROGRESS_STAGES.find((s) => s.key === currentStage);
    return stage ? stage.order : 1;
  };

  const currentIndex = getCurrentStageIndex();

  return (
    <InfoCard title="Progress" icon={IconChart} variant="default">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-textGray mb-2">
          <span>Project Status</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 relative"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white opacity-30 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Stages */}
      <div className="flex items-center justify-between">
        {PROGRESS_STAGES.map((stage, index) => {
          const isCompleted = stage.order < currentIndex;
          const isCurrent = stage.order === currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center flex-1">
              {/* Stage Circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1
                  transition-all duration-300
                  ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : isCurrent
                      ? 'bg-secondary text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  stage.order
                )}
              </div>

              {/* Stage Label */}
              <span
                className={`text-xs font-medium ${
                  isCurrent ? 'text-textBlack' : 'text-textGray'
                }`}
              >
                {stage.label}
              </span>

              {/* Connector Line */}
              {index < PROGRESS_STAGES.length - 1 && (
                <div
                  className={`absolute w-full h-0.5 top-4 -z-10 ${
                    isCompleted ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  style={{
                    left: '50%',
                    width: 'calc(100% / 4)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </InfoCard>
  );
};

export default ProgressCard;
