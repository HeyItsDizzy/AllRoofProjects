/**
 * QUICK ACTION BUTTON COMPONENT
 * Reusable button for header actions
 */
import React from 'react';
import {
  IconUploadFile,
  IconScale,
  IconFile,
  IconCart,
} from '@/shared/IconSet.jsx';

const ICON_MAP = {
  upload: IconUploadFile,
  scale: IconScale,
  document: IconFile,
  cart: IconCart,
};

const COLOR_CLASSES = {
  primary: 'bg-primary hover:bg-green-700 text-white',
  secondary: 'bg-secondary hover:bg-blue-600 text-white',
  Orange: 'bg-Orange hover:bg-orange-500 text-white',
  gray: 'bg-gray-600 hover:bg-gray-700 text-white',
};

const QuickActionButton = ({
  label,
  icon,
  onClick,
  color = 'primary',
  disabled = false,
  loading = false,
  size = 'md',
}) => {
  const IconComponent = ICON_MAP[icon];

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium
        ${COLOR_CLASSES[color]}
        ${sizeClasses[size]}
        transition-all duration-200 
        hover:shadow-lg hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
      `}
    >
      {loading ? (
        <div className={`animate-spin rounded-full border-2 border-white border-t-transparent ${iconSizeClasses[size]}`} />
      ) : (
        IconComponent && <IconComponent className={iconSizeClasses[size]} />
      )}
      <span>{label}</span>
    </button>
  );
};

export default QuickActionButton;
