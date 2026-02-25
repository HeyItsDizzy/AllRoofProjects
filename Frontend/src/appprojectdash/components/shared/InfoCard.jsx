/**
 * INFO CARD COMPONENT
 * Reusable card for displaying information with optional actions
 */
import React from 'react';

const InfoCard = ({
  title,
  icon: Icon,
  children,
  actions = null,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-white border-gray-200',
    primary: 'bg-primary-10 border-primary',
    secondary: 'bg-blue-50 border-secondary',
    warning: 'bg-orange-50 border-Orange',
    success: 'bg-green-50 border-primary',
    info: 'bg-blue-50 border-blue-400',
  };

  return (
    <div
      className={`
        rounded-xl border-2 p-5
        ${variantClasses[variant]}
        transition-all duration-200 hover:shadow-md
        ${className}
      `}
    >
      {/* Header */}
      {(title || Icon || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            {title && (
              <h3 className="text-base font-semibold text-textBlack">{title}</h3>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* Content */}
      <div className="text-textGray">{children}</div>
    </div>
  );
};

export default InfoCard;
