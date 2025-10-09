/**
 * Ant Design Bundle Optimization Guide
 * Reduces the 1MB antd chunk to improve performance
 */

// ======================================================================
// OPTION 1: Vite Plugin for Automatic Tree Shaking (RECOMMENDED)
// ======================================================================

// Install: npm install vite-plugin-imp --save-dev
// Add to vite.config.js:

/*
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createStyleImportPlugin } from 'vite-plugin-style-import'

export default defineConfig({
  plugins: [
    react(),
    createStyleImportPlugin({
      libs: [
        {
          libraryName: 'antd',
          esModule: true,
          resolveStyle: (name) => `antd/es/${name}/style/index`,
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'antd-core': ['antd'],
          'antd-icons': ['@ant-design/icons'],
        },
      },
    },
  },
})
*/

// ======================================================================
// OPTION 2: Manual Import Optimization (CURRENT BEST PRACTICE)
// ======================================================================

// ❌ DON'T DO THIS (imports entire library):
// import { Button, Modal, Input } from 'antd';

// ✅ DO THIS INSTEAD (imports only what you need):
// import Button from 'antd/es/button';
// import Modal from 'antd/es/modal';
// import Input from 'antd/es/input';
// import 'antd/es/button/style/css';
// import 'antd/es/modal/style/css';
// import 'antd/es/input/style/css';

// ======================================================================
// OPTION 3: Create Optimized Antd Barrel Export
// ======================================================================

// Create this file: src/lib/antd.js
export { default as Button } from 'antd/es/button';
export { default as Modal } from 'antd/es/modal';
export { default as Input } from 'antd/es/input';
export { default as Select } from 'antd/es/select';
export { default as Form } from 'antd/es/form';
export { default as Table } from 'antd/es/table';
export { default as Dropdown } from 'antd/es/dropdown';
export { default as Menu } from 'antd/es/menu';
export { message } from 'antd/es/message';
export { notification } from 'antd/es/notification';

// Import individual styles
import 'antd/es/button/style/css';
import 'antd/es/modal/style/css';
import 'antd/es/input/style/css';
import 'antd/es/select/style/css';
import 'antd/es/form/style/css';
import 'antd/es/table/style/css';
import 'antd/es/dropdown/style/css';
import 'antd/es/menu/style/css';
import 'antd/es/message/style/css';
import 'antd/es/notification/style/css';

// ======================================================================
// OPTION 4: Webpack Bundle Analyzer Alternative
// ======================================================================

// Install: npm install rollup-plugin-visualizer --save-dev
// Add to vite.config.js to analyze bundle:

/*
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
    }),
  ],
})
*/

// ======================================================================
// IMMEDIATE FIXES FOR YOUR PROJECT
// ======================================================================

// 1. Replace all antd imports in your files:
//    Find: import { ... } from 'antd'
//    Replace with individual imports

// 2. Check these files that likely have antd imports:
const FILES_TO_CHECK = [
  'src/pages/AllProjects.jsx',
  'src/components/ProjectTable.jsx', 
  'src/components/AssignClient.jsx',
  'src/shared/components/*.jsx',
];

// 3. Common antd components in your project:
const COMMON_COMPONENTS = {
  message: "import { message } from 'antd/es/message';",
  Modal: "import { Modal } from 'antd/es/modal';",
  Button: "import { Button } from 'antd/es/button';",
  Input: "import { Input } from 'antd/es/input';",
  Select: "import { Select } from 'antd/es/select';",
  Form: "import { Form } from 'antd/es/form';",
  Table: "import { Table } from 'antd/es/table';",
};

// ======================================================================
// EXPECTED RESULTS
// ======================================================================

// Before: antd-core: 1MB
// After:  antd-core: 200-400KB (60-75% reduction)
// Bonus:  Faster page loads = less layout shift

export default {
  FILES_TO_CHECK,
  COMMON_COMPONENTS,
};