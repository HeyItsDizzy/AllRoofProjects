# Z-Index Debugger - Interactive Development Tool 🎯

## Overview
The Z-Index Debugger is a powerful, unified development tool that provides visual debugging and interactive management of z-index values throughout your application. It combines hierarchy visualization with live editing capabilities in a single, draggable interface.

## 🎯 New Unified Z-Index Debugger Features:

### 1. Single Draggable Container
- **Combines both tools** into one floating panel
- **Drag anywhere** on the header to move the entire container
- **Smooth animations** with visual feedback when dragging
- **Smart boundary detection** keeps it within the viewport

### 2. Tabbed Interface
- **"All Z-Indexes" tab**: Shows complete hierarchy with editing capabilities
- **"JobTable" tab**: Shows component-specific z-indexes
- **Easy switching** between global and component views

### 3. Enhanced Editing Capabilities
- **✏️ Edit button** next to each z-index value
- **Inline editing** with number input
- **Save/Cancel** functionality
- **Copy to clipboard** for manual updates (since runtime Tailwind modification isn't straightforward)

### 4. Visual Improvements
- **Gradient styling** with blue-to-purple theme
- **Color-coded categories** (Base, Sticky, Dropdown, Modal, Tooltip, Critical)
- **Smooth transitions** and hover effects
- **Enhanced iconography** for better UX

## 🔧 How to Use:

### Opening the Tool:
- Look for the **🎯 Z-Index Tools** button (replaces the two separate buttons)
- Click to open the unified interface

### Dragging:
- **Click and drag** anywhere on the header bar to move the container
- Visual feedback shows when you're dragging
- Container stays within screen boundaries

### Editing Z-Indexes:
1. **Find the z-index** you want to change
2. **Click the ✏️ edit button**
3. **Enter new value** in the input field
4. **Click ✓ to save** or **✕ to cancel**
5. **New Tailwind class** gets copied to clipboard
6. **Manually update** the `zIndexManager.js` file with the new value

### Component View:
- Switch to the **"JobTable" tab** to see only JobTable-specific z-indexes
- Organized by purpose (FILTER_DROPDOWN, HELP_TOOLTIP, etc.)

## 🎨 Visual Features:

- **Dragging cursor** changes to show interaction state
- **Header gradients** and hover effects
- **Color-coded hierarchy** for easy identification
- **Smooth animations** throughout the interface
- **Professional styling** that matches your app's design

## 📝 Note on Editing:

Since Tailwind CSS classes are compiled at build time, **runtime editing** of z-indexes requires manual updates to the `zIndexManager.js` file. The tool:

1. **Validates your input**
2. **Generates the new Tailwind class**
3. **Copies it to clipboard**
4. **Shows an alert** with instructions

You can then paste the new value into the appropriate place in `zIndexManager.js` and refresh your dev server.

## 🚀 Integration

### Basic Usage
```javascript
import ZIndexDebugger from '@/shared/styles/ZIndexDebugger';

// In your component:
<ZIndexDebugger 
  componentName="YourComponent"
  componentZIndexConfig={COMPONENT_Z_INDEX.YOUR_COMPONENT}
/>
```

### Component-Specific Integration
```javascript
// For components with their own z-index constants
<ZIndexDebugger 
  componentName="JobTable"
  componentZIndexConfig={COMPONENT_Z_INDEX.JOB_TABLE}
/>
```

### Global Integration
```javascript
// For global z-index debugging without component specifics
<ZIndexDebugger />
```

## 🎯 Categories & Hierarchy

| Category | Range | Color Code | Purpose |
|----------|-------|------------|---------|
| **BASE** | 1-9 | Gray | Basic content positioning |
| **STICKY** | 10-99 | Yellow | Navigation, headers, frozen columns |
| **DROPDOWN** | 100-999 | Green | Filter dropdowns, context menus |
| **MODAL** | 1000-9999 | Blue | Modals, overlays, dialogs |
| **TOOLTIP** | 10000-99999 | Purple | Help tooltips, notifications |
| **CRITICAL** | 50000+ | Red | Error overlays, debug tools |

## 🛠️ Development Workflow

1. **Open the debugger** during development
2. **Identify conflicts** using the visual hierarchy
3. **Edit values** directly in the interface
4. **Copy new classes** to clipboard
5. **Update zIndexManager.js** with new values
6. **Refresh** to see changes

## 🎪 Advanced Features

### Console Logging
- Click **"Console"** button to log complete hierarchy to browser console
- Useful for debugging and documentation

### Search & Filter
- **Search by name** or z-index value
- **Filter by category** (Base, Sticky, Dropdown, Modal, Tooltip)
- **Real-time filtering** as you type

### Drag & Drop Positioning
- **Persistent positioning** during development session
- **Boundary detection** prevents off-screen positioning
- **Smooth animations** for professional feel

## 🔧 Troubleshooting

### Common Issues:
1. **Z-index conflicts**: Use the visual debugger to identify overlapping ranges
2. **Not visible**: Check that `process.env.NODE_ENV === 'development'`
3. **Can't edit**: Remember that changes require manual file updates
4. **Performance**: Tool only loads in development mode

### Recently Fixed Issues:
5. **Selected cells appearing above sticky columns** ✅ FIXED
   - **Problem**: Selected cells used `z-[60]` while sticky columns used `z-[40]`
   - **Solution**: Added `SELECTED_CELL: 'z-[3]'` to base layer hierarchy
   - **Result**: Selected cells now properly appear below sticky columns
   - **Location**: `zIndexManager.js` and `JobTable.jsx`

### Best Practices:
- **Use component tabs** for focused debugging
- **Follow the hierarchy** when adding new z-indexes
- **Test boundaries** when editing values
- **Document changes** in your component files
- **Never let content elements exceed sticky element z-indexes**

This gives you **complete control** over your z-index hierarchy with **visual debugging** and **drag-and-drop convenience**! 🚀

---

*Note: This tool is only available in development mode for performance and security reasons.*