/**
 * RIGHT UTILITY PANEL
 * Sliding panel for Activity, Notes, and Rusty AI chat
 */
import React, { useState } from 'react';
import {
  IconClose,
  IconBell,
  IconFile,
  IconSparkles,
} from '@/shared/IconSet.jsx';
import { UTILITY_TABS, Z_INDEX_LAYERS } from '@/appprojectdash/config/ProjectDashConfig.jsx';

const RightUtilityPanel = ({ isOpen, onClose, projectId }) => {
  const [activeTab, setActiveTab] = useState('activity');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-20 transition-opacity"
        style={{ zIndex: Z_INDEX_LAYERS.UTILITY_PANEL - 1 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-screen w-96 bg-white shadow-2xl border-l-2 border-gray-200 flex flex-col animate-slideInRight"
        style={{ zIndex: Z_INDEX_LAYERS.UTILITY_PANEL }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-200">
          <h2 className="text-lg font-semibold text-textBlack">Activity Panel</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <IconClose className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {UTILITY_TABS.map((tab) => {
            const Icon = tab.id === 'activity' ? IconBell : tab.id === 'notes' ? IconFile : IconSparkles;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium
                  transition-all duration-200
                  ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary bg-primary-10'
                      : 'text-textGray hover:text-textBlack hover:bg-gray-50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'activity' && <ActivityTab projectId={projectId} />}
          {activeTab === 'notes' && <NotesTab projectId={projectId} />}
          {activeTab === 'rusty' && <RustyAITab projectId={projectId} />}
        </div>
      </div>
    </>
  );
};

const ActivityTab = ({ projectId }) => {
  const mockActivities = [
    {
      id: 1,
      type: 'file_upload',
      user: 'John Smith',
      action: 'uploaded',
      target: 'roof_plan_v2.pdf',
      time: '15 minutes ago',
      icon: '📄',
    },
    {
      id: 2,
      type: 'quote_created',
      user: 'Sarah Johnson',
      action: 'created quote',
      target: 'Q-2024-001',
      time: '1 hour ago',
      icon: '💰',
    },
    {
      id: 3,
      type: 'rusty_insight',
      user: 'Rusty AI',
      action: 'detected',
      target: 'Missing wind zone',
      time: '2 hours ago',
      icon: '🤖',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-textGray uppercase tracking-wide">
        Recent Activity
      </h3>
      <div className="space-y-2">
        {mockActivities.map((activity) => (
          <div
            key={activity.id}
            className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-textBlack">
                  <span className="font-medium">{activity.user}</span>{' '}
                  {activity.action}{' '}
                  <span className="font-medium">{activity.target}</span>
                </p>
                <p className="text-xs text-textGray mt-1">{activity.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotesTab = ({ projectId }) => {
  const [notes, setNotes] = useState([
    { id: 1, text: 'Check fascia specifications with client', time: '2 hours ago' },
    { id: 2, text: 'Confirm delivery date for materials', time: 'Yesterday' },
  ]);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      setNotes([
        { id: Date.now(), text: newNote, time: 'Just now' },
        ...notes,
      ]);
      setNewNote('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-textGray uppercase tracking-wide mb-3">
          Quick Notes
        </h3>
        <div className="space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a quick note..."
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
            rows={3}
          />
          <button
            onClick={handleAddNote}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Add Note
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-3 rounded-lg bg-yellow-50 border border-yellow-200"
          >
            <p className="text-sm text-textBlack">{note.text}</p>
            <p className="text-xs text-textGray mt-1">{note.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RustyAITab = ({ projectId }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'rusty',
      text: "I found 3 possible discrepancies in the elevations PDF. Would you like me to explain?",
      time: '10:34 AM',
    },
    {
      id: 2,
      sender: 'user',
      text: 'Yes, please explain',
      time: '10:35 AM',
    },
    {
      id: 3,
      sender: 'rusty',
      text: "The roof pitch appears to be 25° in the plans but the specifications mention 22°. I've also detected that the wind zone for this location should be Region C, but I don't see it mentioned in the scope document.",
      time: '10:36 AM',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          id: Date.now(),
          sender: 'user',
          text: input,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 mb-4">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <IconSparkles className="w-5 h-5 text-secondary" />
          <div>
            <p className="text-sm font-medium text-textBlack">Rusty AI Assistant</p>
            <p className="text-xs text-textGray">AI-powered project insights</p>
          </div>
        </div>

        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-textBlack'
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.sender === 'user' ? 'text-green-100' : 'text-textGray'
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Rusty anything..."
            className="flex-1 p-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default RightUtilityPanel;
