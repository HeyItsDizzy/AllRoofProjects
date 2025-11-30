/**
 * PENDING TASKS CARD
 * Shows actionable items requiring attention
 */
import React from 'react';
import InfoCard from '@/appprojectdash/components/shared/InfoCard.jsx';
import { IconComplete, IconClock } from '@/shared/IconSet.jsx';

const PendingTasksCard = ({ tasks = [], onTaskComplete }) => {
  const priorityColors = {
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-Orange bg-orange-50 border-orange-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  return (
    <InfoCard title="Pending Tasks" icon={IconClock} variant="default">
      {tasks.length === 0 ? (
        <div className="text-center py-6 text-textGray">
          <IconComplete className="w-12 h-12 mx-auto mb-2 text-primary opacity-30" />
          <p className="text-sm">All caught up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 4).map((task, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <button
                onClick={() => onTaskComplete?.(task.id)}
                className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 hover:border-primary hover:bg-primary-10 transition-all flex-shrink-0 flex items-center justify-center group-hover:scale-110"
              >
                <IconComplete className="w-4 h-4 text-transparent group-hover:text-primary transition-colors" />
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-textBlack">
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-textGray mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {task.priority && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs text-textGray">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 4 && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-center">
          <button className="text-sm text-primary hover:text-green-700 font-medium">
            View {tasks.length - 4} more tasks
          </button>
        </div>
      )}
    </InfoCard>
  );
};

export default PendingTasksCard;
