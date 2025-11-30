/**
 * PROJECT DASHBOARD CONFIGURATION
 * Central configuration for navigation, modules, status badges, and UI constants
 */

import {
  IconFolder,
  IconFile,
  IconScale,
  IconDuplicate,
  IconCart,
  IconChart,
  IconChat,
  IconSettings,
  IconHome,
} from '@/shared/IconSet.jsx';

/**
 * PROJECT STATUS CONFIGURATIONS
 * Defines all possible project statuses with their display properties
 */
export const PROJECT_STATUSES = {
  ESTIMATING: {
    key: 'estimating',
    label: 'Estimating',
    color: 'bg-secondary text-white', // Blue
    dotColor: 'bg-secondary',
  },
  QUOTED: {
    key: 'quoted',
    label: 'Quoted',
    color: 'bg-Orange text-white', // Orange
    dotColor: 'bg-Orange',
  },
  APPROVED: {
    key: 'approved',
    label: 'Approved',
    color: 'bg-primary text-white', // Green
    dotColor: 'bg-primary',
  },
  ORDERED: {
    key: 'ordered',
    label: 'Ordered',
    color: 'bg-purple-600 text-white',
    dotColor: 'bg-purple-600',
  },
  IN_PROGRESS: {
    key: 'in_progress',
    label: 'In Progress',
    color: 'bg-blue-600 text-white',
    dotColor: 'bg-blue-600',
  },
  DELIVERED: {
    key: 'delivered',
    label: 'Delivered',
    color: 'bg-green-700 text-white',
    dotColor: 'bg-green-700',
  },
  CLOSED: {
    key: 'closed',
    label: 'Closed',
    color: 'bg-gray-600 text-white',
    dotColor: 'bg-gray-600',
  },
  ON_HOLD: {
    key: 'on_hold',
    label: 'On Hold',
    color: 'bg-red-600 text-white',
    dotColor: 'bg-red-600',
  },
};

/**
 * NAVIGATION MODULES
 * Defines the left navigation rail items with icons and routes
 */
export const NAVIGATION_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: IconHome,
    route: '/project/:id/dashboard',
    description: 'Project overview and summary',
  },
  {
    id: 'info',
    label: 'Project Info',
    icon: IconFile,
    route: '/project/:id/info',
    description: 'Client, site, and project details',
  },
  {
    id: 'files',
    label: 'Files',
    icon: IconFolder,
    route: '/project/:id/files',
    description: 'Plans, specs, and attachments',
  },
  {
    id: 'takeoffs',
    label: 'Take-offs',
    icon: IconScale,
    route: '/project/:id/takeoffs',
    description: 'Measurements and quantities',
  },
  {
    id: 'quotes',
    label: 'Quotes',
    icon: IconDuplicate,
    route: '/project/:id/quotes',
    description: 'Pricing and quotations',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: IconCart,
    route: '/project/:id/orders',
    description: 'Material orders and suppliers',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: IconChart,
    route: '/project/:id/timeline',
    description: 'Project history and status',
  },
  {
    id: 'notes',
    label: 'Notes & Emails',
    icon: IconChat,
    route: '/project/:id/notes',
    description: 'Communications and notes',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: IconSettings,
    route: '/project/:id/settings',
    description: 'Project configuration',
  },
];

/**
 * PROGRESS STAGES
 * Defines the progression steps shown in the progress tracker
 */
export const PROGRESS_STAGES = [
  { key: 'estimate', label: 'Estimate', order: 1 },
  { key: 'quote', label: 'Quote', order: 2 },
  { key: 'order', label: 'Order', order: 3 },
  { key: 'delivered', label: 'Delivered', order: 4 },
];

/**
 * SUPPLIER CONFIGURATIONS
 * Common roofing material suppliers
 */
export const SUPPLIERS = {
  COLORBOND: {
    id: 'colorbond',
    name: 'Colorbond',
    logo: '/images/suppliers/colorbond.png',
  },
  STRAMIT: {
    id: 'stramit',
    name: 'Stramit',
    logo: '/images/suppliers/stramit.png',
  },
  LYSAGHT: {
    id: 'lysaght',
    name: 'Lysaght',
    logo: '/images/suppliers/lysaght.png',
  },
  SURFMIST: {
    id: 'surfmist',
    name: 'Surfmist',
    logo: '/images/suppliers/surfmist.png',
  },
};

/**
 * WIND REGIONS
 * Australian wind zone classifications
 */
export const WIND_REGIONS = [
  { code: 'A', label: 'Region A', description: 'Non-cyclonic, low wind' },
  { code: 'B', label: 'Region B', description: 'Non-cyclonic, medium wind' },
  { code: 'C', label: 'Region C', description: 'Non-cyclonic, high wind' },
  { code: 'D', label: 'Region D', description: 'Cyclonic, very high wind' },
];

/**
 * FILE CATEGORIES
 * Organized file folder structure for the file manager
 */
export const FILE_CATEGORIES = [
  { id: 'scope', label: 'Scope', icon: '📋', color: 'text-blue-600' },
  { id: 'plans', label: 'Plans', icon: '📐', color: 'text-primary' },
  { id: 'emails', label: 'Emails', icon: '📧', color: 'text-secondary' },
  { id: 'takeoffs', label: 'Take-off Exports', icon: '📊', color: 'text-Orange' },
  { id: 'quotes', label: 'Quotes', icon: '💰', color: 'text-green-600' },
  { id: 'orders', label: 'Orders', icon: '📦', color: 'text-purple-600' },
  { id: 'photos', label: 'Photos', icon: '📷', color: 'text-pink-600' },
  { id: 'other', label: 'Other', icon: '📄', color: 'text-gray-600' },
];

/**
 * ROOFING COLORS
 * Common Colorbond color selections
 */
export const ROOFING_COLORS = [
  { id: 'surfmist', name: 'Surfmist', hex: '#F5F5F0' },
  { id: 'shale-grey', name: 'Shale Grey', hex: '#9CA3A3' },
  { id: 'monument', name: 'Monument', hex: '#3E3E3E' },
  { id: 'basalt', name: 'Basalt', hex: '#404040' },
  { id: 'night-sky', name: 'Night Sky', hex: '#1A1A1A' },
  { id: 'woodland-grey', name: 'Woodland Grey', hex: '#A19B8F' },
  { id: 'pale-eucalypt', name: 'Pale Eucalypt', hex: '#C1B9A8' },
  { id: 'classic-cream', name: 'Classic Cream', hex: '#E8DCC4' },
  { id: 'paperbark', name: 'Paperbark', hex: '#C7BFB3' },
  { id: 'terrain', name: 'Terrain', hex: '#B5A690' },
];

/**
 * QUICK ACTION BUTTONS
 * Top-right header actions
 */
export const QUICK_ACTIONS = [
  {
    id: 'upload',
    label: 'Upload Files',
    icon: 'upload',
    color: 'primary',
  },
  {
    id: 'takeoff',
    label: 'Create Take-off',
    icon: 'scale',
    color: 'secondary',
  },
  {
    id: 'quote',
    label: 'Create Quote',
    icon: 'document',
    color: 'primary',
  },
  {
    id: 'order',
    label: 'Create Order',
    icon: 'cart',
    color: 'Orange',
  },
];

/**
 * DASHBOARD CARD TYPES
 * Types of summary cards displayed on dashboard home
 */
export const CARD_TYPES = {
  PROGRESS: 'progress',
  LATEST_UPLOADS: 'latest_uploads',
  PENDING_TASKS: 'pending_tasks',
  RUSTY_INSIGHTS: 'rusty_insights',
  TAKEOFFS: 'takeoffs',
  QUOTES: 'quotes',
  ORDERS: 'orders',
  FILES: 'files',
  SUPPLIER_CHECKER: 'supplier_checker',
  WIND_DETECTOR: 'wind_detector',
  COLOR_SELECTOR: 'color_selector',
};

/**
 * UTILITY PANEL TABS
 * Right sidebar tabs
 */
export const UTILITY_TABS = [
  { id: 'activity', label: 'Activity', icon: '🔔' },
  { id: 'notes', label: 'Notes', icon: '📝' },
  { id: 'rusty', label: 'Rusty AI', icon: '🤖' },
];

/**
 * Z-INDEX LAYERS
 * Consistent z-index management
 */
export const Z_INDEX_LAYERS = {
  BASE: 1,
  NAV_RAIL: 10,
  HEADER: 20,
  DROPDOWN: 30,
  MODAL: 40,
  UTILITY_PANEL: 50,
  TOOLTIP: 60,
  NOTIFICATION: 70,
};

export default {
  PROJECT_STATUSES,
  NAVIGATION_MODULES,
  PROGRESS_STAGES,
  SUPPLIERS,
  WIND_REGIONS,
  FILE_CATEGORIES,
  ROOFING_COLORS,
  QUICK_ACTIONS,
  CARD_TYPES,
  UTILITY_TABS,
  Z_INDEX_LAYERS,
};
