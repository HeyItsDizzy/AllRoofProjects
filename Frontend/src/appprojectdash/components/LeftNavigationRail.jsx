/**
 * LEFT NAVIGATION RAIL
 * Vertical icon-based navigation with hover labels
 */
import React, { useState } from 'react';
import { NAVIGATION_MODULES, Z_INDEX_LAYERS } from '@/appprojectdash/config/ProjectDashConfig.jsx';

const LeftNavigationRail = ({ activeModule, onModuleChange, collapsed = false }) => {
  const [hoveredModule, setHoveredModule] = useState(null);

  return (
    <nav
      className="fixed left-0 top-0 h-screen bg-white border-r-2 border-gray-200 flex flex-col items-center py-6 shadow-lg transition-all duration-300"
      style={{
        width: collapsed ? '64px' : '80px',
        zIndex: Z_INDEX_LAYERS.NAV_RAIL,
      }}
    >
      {/* Logo/Brand Area */}
      <div className="mb-8 px-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-xl">AR</span>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 w-full flex flex-col items-center gap-2 px-2 overflow-y-auto">
        {NAVIGATION_MODULES.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;
          const isHovered = hoveredModule === module.id;

          return (
            <div
              key={module.id}
              className="relative w-full"
              onMouseEnter={() => setHoveredModule(module.id)}
              onMouseLeave={() => setHoveredModule(null)}
            >
              <button
                onClick={() => onModuleChange(module.id)}
                className={`
                  w-full p-3 rounded-lg
                  flex items-center justify-center
                  transition-all duration-200
                  group relative
                  ${
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
                  }
                `}
                title={module.label}
              >
                <Icon className="w-6 h-6" />

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
              </button>

              {/* Hover Label Tooltip */}
              {isHovered && !collapsed && (
                <div
                  className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg whitespace-nowrap shadow-xl pointer-events-none z-50"
                  style={{ zIndex: Z_INDEX_LAYERS.TOOLTIP }}
                >
                  {module.label}
                  {module.description && (
                    <div className="text-xs text-gray-300 mt-0.5">
                      {module.description}
                    </div>
                  )}
                  {/* Arrow */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto pt-4 border-t border-gray-200 w-full px-2">
        <button
          className="w-full p-3 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-primary transition-all duration-200"
          title="Help & Support"
        >
          <svg
            className="w-6 h-6 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default LeftNavigationRail;
