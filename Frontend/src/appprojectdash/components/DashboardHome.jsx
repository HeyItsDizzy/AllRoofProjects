/**
 * DASHBOARD HOME
 * Main dashboard view with 3 rows: Summary Cards, Key Areas, Industry Widgets
 */
import React from 'react';
import ProgressCard from '@/appprojectdash/components/cards/ProgressCard.jsx';
import LatestUploadsCard from '@/appprojectdash/components/cards/LatestUploadsCard.jsx';
import PendingTasksCard from '@/appprojectdash/components/cards/PendingTasksCard.jsx';
import RustyInsightsCard from '@/appprojectdash/components/cards/RustyInsightsCard.jsx';
import { TakeoffsTile, QuotesTile, OrdersTile, FilesTile } from '@/appprojectdash/components/tiles/KeyAreaTiles.jsx';
import {
  SupplierPriceChecker,
  WindRegionDetector,
  ColorSelector,
} from '@/appprojectdash/components/widgets/IndustryWidgets.jsx';

const DashboardHome = ({
  projectData = {},
  onNavigate,
  onTaskComplete,
  onFileView,
  onInsightView,
  onSupplierCheck,
  onWindVerify,
  onColorSelect,
}) => {
  // Extract data with defaults
  const {
    progress = { stage: 'estimate', percentage: 40 },
    latestFiles = [],
    pendingTasks = [],
    rustyInsights = [],
    takeoffs = { roofFaces: 0, wallFaces: 0 },
    quotes = { draftCount: 0, latestAmount: 0 },
    orders = { openCount: 0, statusText: 'No active orders' },
    files = { count: 0, categories: [] },
    supplier = { material: 'Colorbond', price: 21.5 },
    windRegion = { detected: 'C', verified: false },
    color = { selected: 'Surfmist' },
  } = projectData;

  return (
    <div className="space-y-6">
      {/* ROW 1: SUMMARY CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <ProgressCard
          currentStage={progress.stage}
          percentage={progress.percentage}
        />
        <LatestUploadsCard
          files={latestFiles}
          onViewAll={() => onNavigate?.('files')}
        />
        <PendingTasksCard
          tasks={pendingTasks}
          onTaskComplete={onTaskComplete}
        />
        <RustyInsightsCard
          insights={rustyInsights}
          onViewDetails={onInsightView}
        />
      </section>

      {/* ROW 2: KEY AREAS */}
      <section>
        <h2 className="text-lg font-semibold text-textBlack mb-4">Key Areas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <TakeoffsTile
            roofFaces={takeoffs.roofFaces}
            wallFaces={takeoffs.wallFaces}
            onClick={() => onNavigate?.('takeoffs')}
          />
          <QuotesTile
            draftCount={quotes.draftCount}
            latestAmount={quotes.latestAmount}
            onClick={() => onNavigate?.('quotes')}
          />
          <OrdersTile
            openCount={orders.openCount}
            statusText={orders.statusText}
            onClick={() => onNavigate?.('orders')}
          />
          <FilesTile
            fileCount={files.count}
            categories={files.categories}
            onClick={() => onNavigate?.('files')}
          />
        </div>
      </section>

      {/* ROW 3: INDUSTRY TOOLS */}
      <section>
        <h2 className="text-lg font-semibold text-textBlack mb-4">Industry Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SupplierPriceChecker
            selectedMaterial={supplier.material}
            pricePerSqm={supplier.price}
            onCheck={onSupplierCheck}
          />
          <WindRegionDetector
            detectedRegion={windRegion.detected}
            verified={windRegion.verified}
            onVerify={onWindVerify}
          />
          <ColorSelector
            selectedColor={color.selected}
            onSelect={onColorSelect}
          />
        </div>
      </section>
    </div>
  );
};

export default DashboardHome;
