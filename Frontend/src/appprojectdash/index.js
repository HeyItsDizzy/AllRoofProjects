/**
 * PROJECT DASHBOARD - MAIN EXPORT
 * Easy import for integration into existing app
 */

export { default as ProjectDashboard } from '@/appprojectdash/ProjectDashboard.jsx';
export { default as LeftNavigationRail } from '@/appprojectdash/components/LeftNavigationRail.jsx';
export { default as DashboardHeader } from '@/appprojectdash/components/DashboardHeader.jsx';
export { default as DashboardHome } from '@/appprojectdash/components/DashboardHome.jsx';
export { default as RightUtilityPanel } from '@/appprojectdash/components/RightUtilityPanel.jsx';

// Shared components
export { default as StatusBadge } from '@/appprojectdash/components/shared/StatusBadge.jsx';
export { default as QuickActionButton } from '@/appprojectdash/components/shared/QuickActionButton.jsx';
export { default as ModuleTile } from '@/appprojectdash/components/shared/ModuleTile.jsx';
export { default as InfoCard } from '@/appprojectdash/components/shared/InfoCard.jsx';

// Cards
export { default as ProgressCard } from '@/appprojectdash/components/cards/ProgressCard.jsx';
export { default as LatestUploadsCard } from '@/appprojectdash/components/cards/LatestUploadsCard.jsx';
export { default as PendingTasksCard } from '@/appprojectdash/components/cards/PendingTasksCard.jsx';
export { default as RustyInsightsCard } from '@/appprojectdash/components/cards/RustyInsightsCard.jsx';

// Tiles
export { 
  TakeoffsTile, 
  QuotesTile, 
  OrdersTile, 
  FilesTile 
} from '@/appprojectdash/components/tiles/KeyAreaTiles.jsx';

// Widgets
export {
  SupplierPriceChecker,
  WindRegionDetector,
  ColorSelector,
} from '@/appprojectdash/components/widgets/IndustryWidgets.jsx';

// Module Views
export {
  ProjectInfoView,
  ProjectFilesView,
  TakeoffsView,
  QuotesView,
  OrdersView,
  TimelineView,
  NotesView,
  SettingsView,
} from '@/appprojectdash/components/modules/ModuleViews.jsx';

// Hooks
export { useNavigationState } from '@/appprojectdash/hooks/useNavigationState.js';
export { useDashboardData } from '@/appprojectdash/hooks/useDashboardData.js';
export { useActivityFeed } from '@/appprojectdash/hooks/useActivityFeed.js';

// Config
export * from '@/appprojectdash/config/ProjectDashConfig.jsx';

// Default export
export { default } from '@/appprojectdash/ProjectDashboard.jsx';
