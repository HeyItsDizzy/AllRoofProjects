/**
 * Z-INDEX MANAGEMENT HUB - Centralized Control ✅
 * 
 * PURPOSE: 
 * - Prevent z-index conflicts by centralizing all layering values
 * - Easy to track, adjust, and maintain all overlay elements
 * - Clear hierarchy and naming for better development experience
 * 
 * USAGE:
 * import { Z_INDEX } from '@/shared/styles/zIndexManager';
 * className={`fixed ${Z_INDEX.MODAL} bg-white`}
 * 
 * HIERARCHY (Lowest to Highest):
 * 1. Base content: 1-9
 * 2. Sticky elements: 10-99
 * 3. Dropdowns/popovers: 100-999
 * 4. Modals/overlays: 1000-9999
 * 5. Notifications/tooltips: 10000+
 */

export const Z_INDEX = {
  // ═══════════════════════════════════════════════════════════════════
  // 🏗️ BASE LAYERS (1-9) - Basic content positioning
  // ═══════════════════════════════════════════════════════════════════
  BASE: 'z-0',
  CONTENT: 'z-[1]',
  BACKGROUND: 'z-[2]',
  SELECTED_CELL: 'z-[3]', // Selected cells - must stay below sticky elements
  
  // ═══════════════════════════════════════════════════════════════════
  // 📌 STICKY/FIXED ELEMENTS (10-99) - Navigation, headers, sidebars
  // ═══════════════════════════════════════════════════════════════════
  NAVBAR: 'z-[10]',
  SIDEBAR: 'z-[20]',
  STICKY_HEADER: 'z-[30]',
  FROZEN_COLUMNS: 'z-[40]',
  TABLE_HEADER: 'z-[50]',
  
  // ═══════════════════════════════════════════════════════════════════
  // 🔽 DROPDOWNS & POPOVERS (100-999) - Contextual overlays
  // ═══════════════════════════════════════════════════════════════════
  DROPDOWN_BASE: 'z-[100]',
  MONTH_FILTER_DROPDOWN: 'z-[150]',
  OLDER_MONTH_DROPDOWN: 'z-[600]',
  FILTER_DROPDOWN: 'z-[240]',
  CONTEXT_MENU: 'z-[300]',
  AUTOCOMPLETE: 'z-[400]',
  AVATAR_TOOLTIP: 'z-[500]',
  
  // ═══════════════════════════════════════════════════════════════════
  // 🗃️ MODALS & OVERLAYS (1000-9999) - Full-screen or major overlays
  // ═══════════════════════════════════════════════════════════════════
  MODAL_BACKDROP: 'z-[1000]',
  MODAL_CONTENT: 'z-[1100]',
  DRAWER: 'z-[1200]',
  ESTIMATE_MODAL: 'z-[1300]',
  SEND_MESSAGE_MODAL: 'z-[1400]',
  CONFIRMATION_MODAL: 'z-[1500]',
  
  // ═══════════════════════════════════════════════════════════════════
  // 🔔 NOTIFICATIONS & TOOLTIPS (10000+) - Always on top
  // ═══════════════════════════════════════════════════════════════════
  TOOLTIP_BASE: 'z-[10000]',
  HELP_TOOLTIP: 'z-[99999]',
  COMMENTS_TOOLTIP: 'z-[99999]',
  NOTIFICATION_TOAST: 'z-[50000]',
  ERROR_OVERLAY: 'z-[90000]',
  LOADING_OVERLAY: 'z-[95000]',
  DEBUG_OVERLAY: 'z-[99999]'
};

/**
 * UTILITY FUNCTIONS FOR DYNAMIC Z-INDEX MANAGEMENT
 */
export const zIndexUtils = {
  /**
   * Get numeric z-index value for calculations
   * @param {string} zIndexClass - Tailwind z-index class like 'z-[240]'
   * @returns {number} - Numeric value
   */
  getNumericValue(zIndexClass) {
    const match = zIndexClass.match(/z-\[?(\d+)\]?/);
    return match ? parseInt(match[1], 10) : 0;
  },

  /**
   * Create a custom z-index class with specified offset
   * @param {string} baseZIndex - Base z-index class from Z_INDEX object
   * @param {number} offset - Positive or negative offset
   * @returns {string} - New z-index class
   */
  createOffset(baseZIndex, offset) {
    const baseValue = this.getNumericValue(baseZIndex);
    const newValue = baseValue + offset;
    return `z-[${newValue}]`;
  },

  /**
   * Get the highest z-index class available in a category
   * @param {string} category - Category like 'DROPDOWN', 'MODAL', etc.
   * @returns {string} - Highest z-index in that category
   */
  getHighestInCategory(category) {
    const categoryKeys = Object.keys(Z_INDEX).filter(key => 
      key.includes(category.toUpperCase())
    );
    
    let highest = 0;
    let highestClass = Z_INDEX.BASE;
    
    categoryKeys.forEach(key => {
      const value = this.getNumericValue(Z_INDEX[key]);
      if (value > highest) {
        highest = value;
        highestClass = Z_INDEX[key];
      }
    });
    
    return highestClass;
  },

  /**
   * Debug function to list all z-indexes in order
   * @returns {Array} - Sorted array of z-index objects
   */
  debugList() {
    return Object.entries(Z_INDEX)
      .map(([name, className]) => ({
        name,
        className,
        value: this.getNumericValue(className)
      }))
      .sort((a, b) => a.value - b.value);
  }
};

/**
 * COMPONENT-SPECIFIC Z-INDEX CONSTANTS
 * Use these for consistent layering within specific components
 */
export const COMPONENT_Z_INDEX = {
  JOB_TABLE: {
    FILTER_DROPDOWN: Z_INDEX.FILTER_DROPDOWN,
    OLDER_DROPDOWN: Z_INDEX.OLDER_MONTH_DROPDOWN,
    HELP_TOOLTIP: Z_INDEX.HELP_TOOLTIP,
    COMMENTS_TOOLTIP: Z_INDEX.COMMENTS_TOOLTIP,
    STICKY_COLUMNS: Z_INDEX.FROZEN_COLUMNS,
    SELECTED_CELL: Z_INDEX.SELECTED_CELL,
    TABLE_HEADER: Z_INDEX.TABLE_HEADER
  },
  
  PROJECT_TABLE: {
    MONTH_FILTER: Z_INDEX.MONTH_FILTER_DROPDOWN,
    FILTER_DROPDOWN: Z_INDEX.FILTER_DROPDOWN,
    TOOLTIP: Z_INDEX.TOOLTIP_BASE
  },
  
  MODALS: {
    ESTIMATE: Z_INDEX.ESTIMATE_MODAL,
    SEND_MESSAGE: Z_INDEX.SEND_MESSAGE_MODAL,
    CONFIRMATION: Z_INDEX.CONFIRMATION_MODAL,
    BACKDROP: Z_INDEX.MODAL_BACKDROP
  }
};

/**
 * DEVELOPMENT TOOLS
 */
export const zIndexDev = {
  /**
   * Add this to any component to visually debug z-index conflicts
   * @param {string} componentName - Name for debugging
   */
  addDebugOverlay(componentName) {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return {
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(255, 0, 0, 0.8)',
      color: 'white',
      padding: '5px 10px',
      fontSize: '12px',
      borderRadius: '4px',
      zIndex: '99999',
      pointerEvents: 'none'
    };
  },

  /**
   * Log current z-index hierarchy to console
   */
  logHierarchy() {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group('🎯 Z-Index Hierarchy');
    zIndexUtils.debugList().forEach(item => {
      console.log(`${item.value.toString().padStart(5, ' ')} | ${item.name} | ${item.className}`);
    });
    console.groupEnd();
  }
};

export default Z_INDEX;