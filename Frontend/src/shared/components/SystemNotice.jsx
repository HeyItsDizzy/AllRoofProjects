// src/shared/components/SystemNotice.jsx
/**
 * SYSTEM NOTICE COMPONENT
 * 
 * Flexible notice banner for displaying system-wide or client-specific messages.
 * Use cases: Account holds, blocked users, maintenance notices, feature announcements, etc.
 * 
 * Props:
 * - show: Boolean to control visibility
 * - type: 'error' | 'warning' | 'info' | 'success'
 * - message: Main message text
 * - details: Optional secondary text
 * - actionLabel: Optional button text (e.g., "View Invoice", "Contact Support")
 * - onActionClick: Optional button click handler
 * - dismissible: Whether notice can be dismissed (default: false)
 * - onDismiss: Optional dismiss handler
 * - sticky: Whether to stick to top of viewport (default: true)
 */

import React, { useState } from 'react';
import { FiAlertTriangle, FiInfo, FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi';

const SystemNotice = ({
  show = false,
  type = 'warning',
  message,
  details,
  actionLabel,
  onActionClick,
  secondaryActionLabel,
  onSecondaryActionClick,
  dismissible = false,
  onDismiss,
  sticky = true,
  className = ''
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  // Type-based styling
  const typeStyles = {
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: FiXCircle,
      iconColor: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      secondaryButton: 'bg-white hover:bg-red-100 text-red-700 border border-red-300'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-900',
      icon: FiAlertTriangle,
      iconColor: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
      secondaryButton: 'bg-white hover:bg-yellow-100 text-yellow-700 border border-yellow-300'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      icon: FiInfo,
      iconColor: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondaryButton: 'bg-white hover:bg-blue-100 text-blue-700 border border-blue-300'
    },
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-900',
      icon: FiCheckCircle,
      iconColor: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700 text-white',
      secondaryButton: 'bg-white hover:bg-green-100 text-green-700 border border-green-300'
    }
  };

  const style = typeStyles[type] || typeStyles.warning;
  const IconComponent = style.icon;

  return (
    <div 
      className={`
        ${style.bg} 
        border-b-2 
        ${sticky ? 'sticky top-0 z-50' : ''} 
        ${className}
      `}
      role="alert"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Main Message */}
                <p className={`font-semibold ${style.text} text-sm md:text-base`}>
                  {message}
                </p>
                
                {/* Details */}
                {details && (
                  <p className={`mt-1 text-sm ${style.text} opacity-90`}>
                    {details}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Primary Action Button */}
                {actionLabel && onActionClick && (
                  <button
                    onClick={onActionClick}
                    className={`
                      px-4 py-2 rounded-lg font-semibold text-sm
                      transition-colors duration-200
                      ${style.button}
                      shadow-sm hover:shadow-md
                    `}
                  >
                    {actionLabel}
                  </button>
                )}

                {/* Secondary Action Button */}
                {secondaryActionLabel && onSecondaryActionClick && (
                  <button
                    onClick={onSecondaryActionClick}
                    className={`
                      px-4 py-2 rounded-lg font-semibold text-sm
                      transition-colors duration-200
                      ${style.secondaryButton}
                      shadow-sm hover:shadow-md
                    `}
                  >
                    {secondaryActionLabel}
                  </button>
                )}

                {/* Dismiss Button */}
                {dismissible && (
                  <button
                    onClick={handleDismiss}
                    className={`
                      p-2 rounded-lg 
                      hover:bg-black hover:bg-opacity-10
                      transition-colors duration-200
                      ${style.iconColor}
                    `}
                    aria-label="Dismiss notice"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemNotice;
