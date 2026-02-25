/**
 * MODULE TILE COMPONENT
 * Clickable tile for key dashboard areas
 */
import React from 'react';
import { IconRight } from '@/shared/IconSet.jsx';

const ModuleTile = ({
  icon: Icon,
  title,
  subtitle,
  value,
  onClick,
  color = 'primary',
  badge = null,
  disabled = false,
}) => {
  const colorClasses = {
    primary: 'border-primary hover:border-primary hover:bg-primary-10',
    secondary: 'border-secondary hover:border-secondary hover:bg-blue-50',
    Orange: 'border-Orange hover:border-Orange hover:bg-orange-50',
    purple: 'border-purple-600 hover:border-purple-600 hover:bg-purple-50',
    gray: 'border-gray-400 hover:border-gray-500 hover:bg-gray-50',
  };

  const iconColorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    Orange: 'text-Orange',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full p-6 rounded-xl border-2 bg-white
        ${colorClasses[color]}
        transition-all duration-200 
        hover:shadow-lg hover:scale-102
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        text-left group
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-2 rounded-lg bg-gray-50 ${iconColorClasses[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-textBlack">{title}</h3>
            {subtitle && (
              <p className="text-sm text-textGray mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <IconRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>

      {/* Value/Content */}
      {value && (
        <div className="mt-3">
          <div className="text-2xl font-bold text-textBlack">{value}</div>
        </div>
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute top-4 right-12">
          {badge}
        </div>
      )}
    </button>
  );
};

export default ModuleTile;
