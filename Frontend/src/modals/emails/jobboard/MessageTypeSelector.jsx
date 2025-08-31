// MessageTypeSelector.jsx - Simple button to trigger send message modal
import React from 'react';
import { IconSend } from '@/shared/IconSet';

const MessageTypeSelector = ({ project, onOpenSendModal }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[MessageTypeSelector] clicked - opening SendMessageModal');
    onOpenSendModal(project);
  };

  return (
    <button
      onClick={handleClick}
      className="bg-green-600 hover:bg-green-700 text-white p-1 rounded-md transition-colors shadow-sm"
      title="Send Message"
    >
      <IconSend size={20} className="text-white" />
    </button>
  );
};

export default MessageTypeSelector;
