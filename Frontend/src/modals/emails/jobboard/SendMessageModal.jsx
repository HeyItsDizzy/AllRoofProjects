// SendMessageModal.jsx - Clean modal for selecting message types
import React, { useEffect } from 'react';
import { IconSend } from '@/shared/IconSet';

const SendMessageModal = ({ isOpen, onClose, project, onSelectMessageType }) => {
  // Debug log when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[SendMessageModal] is open');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Message type options based on project workflow
  const messageTypes = [
    {
      id: 'job-logged',
      title: 'Job Logged',
      description: 'Initial project acknowledgment',
      color: 'bg-blue-500',
      icon: '📋',
      status: 'planned' // Future implementation
    },
    {
      id: 'job-complete',
      title: 'Job Complete',
      description: 'Completion notification to client',
      color: 'bg-orange-500',
      icon: '✅',
      status: 'planned' // Future implementation
    },
    {
      id: 'job-delayed',
      title: 'Job Delayed',
      description: 'Delay notification with new timeline',
      color: 'bg-red-500',
      icon: '⏰',
      status: 'active' // Now implemented
    },
    {
      id: 'longer-lead-time',
      title: 'Longer Lead Time',
      description: 'Extended timeline notification',
      color: 'bg-yellow-500',
      icon: '📅',
      status: 'planned' // Future implementation
    },
    {
      id: 'estimate-complete',
      title: 'Estimate Complete',
      description: 'Send completed estimate to client',
      color: 'bg-green-600',
      icon: '💰',
      status: 'active' // Currently implemented
    }
  ];

  const handleSelectType = (messageType) => {
    onClose();
    onSelectMessageType(messageType, project);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <IconSend size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Send Message</h2>
                <p className="text-sm text-gray-600">
                  {project?.name || project?.projectNumber || 'Project'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-colors"
            >
              <span className="text-xl">×</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Choose the type of message to send to the client:
          </p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {messageTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type)}
                disabled={type.status === 'planned'}
                className={`w-full p-3 text-left rounded-lg border transition-all duration-200 ${
                  type.status === 'planned' 
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon and Color indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.icon}</span>
                    <div className={`w-2 h-2 rounded-full ${type.color}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">{type.title}</h3>
                      {type.status === 'planned' && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      )}
                      {type.status === 'active' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Available
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                  
                  {type.status === 'active' && (
                    <IconSend size={16} className="text-green-600 mt-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              More message types will be added soon
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendMessageModal;
