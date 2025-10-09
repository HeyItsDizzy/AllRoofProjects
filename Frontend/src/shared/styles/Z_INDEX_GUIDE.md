# Z-Index Management System 🎯

## Overview
This centralized z-index management system prevents layering conflicts and makes it easy to track and adjust all overlay elements in your application.

## Quick Start

### 1. Import the System
```javascript
import { Z_INDEX, COMPONENT_Z_INDEX } from '@/shared/styles/zIndexManager';
```

### 2. Use Centralized Z-Indexes
Instead of hardcoding z-index values:
```javascript
// ❌ Old way - hardcoded and conflict-prone
className="fixed z-[99999] bg-white"

// ✅ New way - centralized and managed
className={`fixed ${Z_INDEX.HELP_TOOLTIP} bg-white`}
```

### 3. Component-Specific Constants
Use predefined component z-indexes for consistency:
```javascript
className={`fixed ${COMPONENT_Z_INDEX.JOB_TABLE.FILTER_DROPDOWN} bg-white`}
```

## Development Tools

### Visual Debugger
Add the debugger to any component during development:
```javascript
import ZIndexDebugger from '@/shared/styles/ZIndexDebugger';

// In your component JSX:
<ZIndexDebugger position="bottom-right" />
```

### Component-Specific Display
Show z-indexes for a specific component:
```javascript
import { ComponentZIndexDisplay } from '@/shared/styles/ZIndexDebugger';

<ComponentZIndexDisplay 
  componentName="JobTable" 
  zIndexConfig={COMPONENT_Z_INDEX.JOB_TABLE} 
/>
```

### Console Debugging
Log the complete z-index hierarchy:
```javascript
import { zIndexDev } from '@/shared/styles/zIndexManager';

// In development
zIndexDev.logHierarchy();
```

## Z-Index Hierarchy

| Range | Purpose | Examples |
|-------|---------|----------|
| **1-9** | Base content | Background elements |
| **10-99** | Sticky elements | Navigation, headers, frozen columns |
| **100-999** | Dropdowns & popovers | Filter dropdowns, context menus |
| **1000-9999** | Modals & overlays | Estimate modals, confirmation dialogs |
| **10000+** | Notifications & tooltips | Help tooltips, error messages |

## Adding New Z-Indexes

1. **Open zIndexManager.js**
2. **Add to appropriate category:**
```javascript
export const Z_INDEX = {
  // Add new values in the correct range
  NEW_DROPDOWN: 'z-[250]', // Dropdowns: 100-999
  NEW_MODAL: 'z-[1600]',   // Modals: 1000-9999
};
```

3. **Update component constants if needed:**
```javascript
export const COMPONENT_Z_INDEX = {
  YOUR_COMPONENT: {
    DROPDOWN: Z_INDEX.NEW_DROPDOWN,
    MODAL: Z_INDEX.NEW_MODAL
  }
};
```

## Utility Functions

### Get Numeric Value
```javascript
import { zIndexUtils } from '@/shared/styles/zIndexManager';

const value = zIndexUtils.getNumericValue('z-[240]'); // Returns 240
```

### Create Offset
```javascript
const higherZIndex = zIndexUtils.createOffset(Z_INDEX.MODAL_CONTENT, 10);
// Creates z-[1110] if MODAL_CONTENT is z-[1100]
```

### Find Highest in Category
```javascript
const highest = zIndexUtils.getHighestInCategory('DROPDOWN');
// Returns the highest z-index containing 'DROPDOWN'
```

## Troubleshooting Z-Index Conflicts

1. **Use the debugger** to visualize all z-indexes
2. **Check the hierarchy** - ensure your element is in the right range
3. **Use component constants** instead of creating new values
4. **Follow the naming convention** for easy identification

## Best Practices

✅ **Always use centralized constants**
✅ **Import at component level for better organization**
✅ **Use component-specific constants when available**
✅ **Test with the debugger during development**
✅ **Update this system when adding new overlay elements**

❌ **Don't hardcode z-index values**
❌ **Don't create arbitrary high values like z-[99999]**
❌ **Don't skip the hierarchy - respect the ranges**

## Example Implementation

```javascript
import React from 'react';
import { COMPONENT_Z_INDEX } from '@/shared/styles/zIndexManager';
import ZIndexDebugger from '@/shared/styles/ZIndexDebugger';

export default function MyComponent() {
  return (
    <div>
      {/* Development debugger */}
      <ZIndexDebugger position="bottom-right" />
      
      {/* Dropdown with proper z-index */}
      <div className={`fixed ${COMPONENT_Z_INDEX.JOB_TABLE.FILTER_DROPDOWN} bg-white`}>
        Dropdown content
      </div>
      
      {/* Tooltip with proper z-index */}
      <div className={`fixed ${COMPONENT_Z_INDEX.JOB_TABLE.HELP_TOOLTIP} bg-gray-900`}>
        Tooltip content
      </div>
    </div>
  );
}
```

This system eliminates z-index conflicts and makes your UI layering predictable and maintainable! 🎉