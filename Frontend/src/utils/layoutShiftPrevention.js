/**
 * Layout Shift Prevention Utilities
 * Fixes the specific layout shifts shown in DevTools
 */

import { useEffect, useState } from 'react';

/**
 * Hook to prevent layout shifts by reserving space during loading
 */
export const useLayoutShiftPrevention = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // Mark as hydrated after React takes over
    setIsHydrated(true);
  }, []);
  
  return isHydrated;
};

/**
 * Stable dimensions for layout containers
 * Prevents the px-4.md:px-16.lg:px-24 container shifts
 */
export const getStableContainerClass = () => {
  return "min-h-[60px] transition-all duration-200"; // Reserve minimum height
};

/**
 * Stable search container dimensions
 * Prevents the relative.flex-1.max-w-[450px].w-full shifts
 */
export const getStableSearchClass = () => {
  return "relative flex-1 max-w-[450px] w-full min-h-[36px] transition-all duration-200";
};

/**
 * CSS-in-JS stable layouts to inject
 */
export const injectStableLayoutCSS = () => {
  const css = `
    /* Prevent layout shifts in main containers */
    .stable-layout-container {
      min-height: 60px;
      contain: layout style;
      will-change: auto;
    }
    
    /* Prevent search bar layout shifts */
    .stable-search-container {
      min-height: 36px;
      contain: layout;
      transform: translateZ(0); /* Force GPU acceleration */
    }
    
    /* Prevent table layout shifts */
    .stable-table {
      table-layout: fixed;
      width: 100%;
    }
    
    .stable-table th,
    .stable-table td {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    /* Prevent Ant Design component shifts */
    .ant-input,
    .ant-select,
    .ant-button {
      transition: none !important;
    }
    
    /* Fix specific Ant Design layout shifts */
    .ant-select-selector {
      min-height: 32px;
    }
    
    .ant-input {
      min-height: 32px;
    }
  `;
  
  if (!document.getElementById('layout-shift-prevention')) {
    const style = document.createElement('style');
    style.id = 'layout-shift-prevention';
    style.textContent = css;
    document.head.appendChild(style);
  }
};