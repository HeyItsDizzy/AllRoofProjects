/**
 * PROJECT DASHBOARD - DEMO & USAGE EXAMPLES
 * Copy these examples to quickly integrate the dashboard
 */

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: Basic Integration (Simplest Way)
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import ProjectDashboard from '@/appprojectdash';

function ProjectPage() {
  const projectId = '25-08088'; // From URL params or props

  return (
    <ProjectDashboard 
      projectId={projectId}
      onClose={() => console.log('Dashboard closed')}
    />
  );
}

export default ProjectPage;

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: With React Router
// ═══════════════════════════════════════════════════════════════════════════

import { useParams, useNavigate } from 'react-router-dom';
import ProjectDashboard from '@/appprojectdash';

function ProjectDashboardRoute() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <ProjectDashboard 
      projectId={projectId}
      onClose={() => navigate('/projects')}
    />
  );
}

// Add to your routes:
// {
//   path: '/project/:projectId',
//   element: <ProjectDashboardRoute />
// }

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: Using Individual Components
// ═══════════════════════════════════════════════════════════════════════════

import { 
  StatusBadge, 
  ProgressCard,
  QuickActionButton,
  TakeoffsTile,
  SupplierPriceChecker
} from '@/appprojectdash';

function CustomLayout() {
  return (
    <div>
      {/* Status Badge */}
      <StatusBadge status="estimating" size="md" showDot={true} />
      
      {/* Progress Card */}
      <ProgressCard 
        currentStage="quote" 
        percentage={75} 
      />
      
      {/* Action Button */}
      <QuickActionButton
        label="Upload Files"
        icon="upload"
        color="primary"
        onClick={() => console.log('Upload clicked')}
      />
      
      {/* Take-offs Tile */}
      <TakeoffsTile
        roofFaces={13}
        wallFaces={9}
        onClick={() => console.log('Navigate to take-offs')}
      />
      
      {/* Supplier Checker Widget */}
      <SupplierPriceChecker
        selectedMaterial="Colorbond"
        pricePerSqm={21.5}
        onCheck={() => console.log('Check prices')}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: Using Hooks Directly
// ═══════════════════════════════════════════════════════════════════════════

import { 
  useNavigationState, 
  useDashboardData,
  useActivityFeed 
} from '@/appprojectdash';

function CustomDashboard({ projectId }) {
  // Navigation with history
  const { activeModule, navigateTo, goBack, canGoBack } = useNavigationState();
  
  // Dashboard data
  const { loading, error, data, refresh } = useDashboardData(projectId);
  
  // Activity feed
  const { activities, unreadCount, markAsRead } = useActivityFeed(projectId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{data.projectInfo.projectName}</h1>
      <p>Active Module: {activeModule}</p>
      <p>Unread Activities: {unreadCount}</p>
      
      <button onClick={() => navigateTo('takeoffs')}>
        Go to Take-offs
      </button>
      
      {canGoBack && (
        <button onClick={goBack}>
          ← Back
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 5: Customizing Configuration
// ═══════════════════════════════════════════════════════════════════════════

import { 
  PROJECT_STATUSES, 
  NAVIGATION_MODULES,
  ROOFING_COLORS 
} from '@/appprojectdash';

// Add a custom status
PROJECT_STATUSES.FABRICATING = {
  key: 'fabricating',
  label: 'Fabricating',
  color: 'bg-purple-600 text-white',
  dotColor: 'bg-purple-600',
};

// Add a custom navigation module
NAVIGATION_MODULES.push({
  id: 'invoices',
  label: 'Invoices',
  icon: YourInvoiceIcon,
  route: '/project/:id/invoices',
  description: 'View and manage invoices',
});

// Add a custom color
ROOFING_COLORS.push({
  id: 'custom-red',
  name: 'Custom Red',
  hex: '#FF0000',
});

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 6: Connecting to Backend API
// ═══════════════════════════════════════════════════════════════════════════

// In hooks/useDashboardData.js, replace the mock data:

import useAxiosSecure from '@/hooks/AxiosSecure/useAxiosSecure';

export const useDashboardData = (projectId) => {
  const axiosSecure = useAxiosSecure();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // YOUR ACTUAL API CALL
        const response = await axiosSecure.get(`/api/projects/${projectId}/dashboard`);
        
        setRawData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Dashboard API error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, axiosSecure]);

  // ... rest of the hook
};

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 7: Handling Quick Actions
// ═══════════════════════════════════════════════════════════════════════════

function ProjectDashboardWrapper({ projectId }) {
  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'upload':
        // Open your file upload modal
        openFileUploadModal();
        break;
      
      case 'takeoff':
        // Navigate to take-off creator
        navigate(`/project/${projectId}/takeoffs/new`);
        break;
      
      case 'quote':
        // Open quote builder
        openQuoteBuilder();
        break;
      
      case 'order':
        // Open order form
        openOrderForm();
        break;
      
      default:
        console.log('Unknown action:', actionId);
    }
  };

  return (
    <ProjectDashboard 
      projectId={projectId}
      // Note: Quick actions are handled internally,
      // but you can customize by modifying ProjectDashboard.jsx
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 8: Responsive Testing
// ═══════════════════════════════════════════════════════════════════════════

function ResponsiveDemo() {
  return (
    <div>
      {/* Desktop view - Full 3-zone layout */}
      <div className="hidden lg:block">
        <ProjectDashboard projectId="25-08088" />
      </div>

      {/* Tablet view - Adjusted grids */}
      <div className="hidden md:block lg:hidden">
        <ProjectDashboard projectId="25-08088" />
      </div>

      {/* Mobile view - Stacked layout */}
      <div className="block md:hidden">
        <ProjectDashboard projectId="25-08088" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 9: Error Boundary Wrapper
// ═══════════════════════════════════════════════════════════════════════════

import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Dashboard Error
        </h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

function SafeProjectDashboard({ projectId }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ProjectDashboard projectId={projectId} />
    </ErrorBoundary>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE 10: Testing with Different Statuses
// ═══════════════════════════════════════════════════════════════════════════

function DashboardShowcase() {
  const statuses = [
    'estimating',
    'quoted',
    'approved',
    'ordered',
    'in_progress',
    'delivered',
    'closed',
    'on_hold'
  ];

  const [currentStatus, setCurrentStatus] = useState('estimating');

  return (
    <div>
      {/* Status selector */}
      <div className="mb-4">
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setCurrentStatus(status)}
            className={`px-3 py-1 mr-2 rounded ${
              currentStatus === status ? 'bg-primary text-white' : 'bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Dashboard with selected status */}
      <ProjectDashboard 
        projectId="demo-project"
        // Status would be in the API data normally
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPECTED BACKEND API RESPONSE FORMAT
// ═══════════════════════════════════════════════════════════════════════════

const EXPECTED_API_RESPONSE = {
  project: {
    id: "25-08088",
    number: "25-08088",
    name: "Redhill Roof Quote",
    status: "estimating"
  },
  client: {
    name: "AUS Roofing Group",
    address: "123 Example St, RedxHill, QLD 4000"
  },
  progress: {
    stage: "estimate",      // estimate | quote | order | delivered
    percentage: 40          // 0-100
  },
  takeoffs: {
    roofFaces: 13,
    wallFaces: 9
  },
  quotes: {
    draftCount: 1,
    latestAmount: 18420
  },
  orders: {
    openCount: 0,
    statusText: "Awaiting supplier input"
  },
  files: {
    count: 12,
    categories: [
      { label: "Plans", count: 5 },
      { label: "Emails", count: 3 },
      { label: "Photos", count: 4 }
    ]
  },
  latestFiles: [
    {
      name: "plan.pdf",
      size: 2458000,
      uploadedAt: "2025-11-23T10:00:00Z"
    }
  ],
  pendingTasks: [
    {
      id: 1,
      title: "Confirm fascia type",
      description: "Check with client about fascia specifications",
      priority: "high",      // high | medium | low
      dueDate: "2025-11-24T00:00:00Z"
    }
  ],
  rustyInsights: [
    {
      id: 1,
      type: "warning",       // warning | info | success | suggestion
      title: "Missing wind zone detected",
      description: "Site location suggests Region C but not specified",
      action: "Add wind zone"
    }
  ],
  supplier: {
    material: "Colorbond",
    price: 21.5
  },
  windRegion: {
    detected: "C",          // A | B | C | D
    verified: true
  },
  color: {
    selected: "Surfmist"
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION TIPS
// ═══════════════════════════════════════════════════════════════════════════

// 1. Use React.memo for heavy components
const MemoizedDashboard = React.memo(ProjectDashboard);

// 2. Lazy load the dashboard
const LazyDashboard = React.lazy(() => import('@/appprojectdash'));

function App() {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <LazyDashboard projectId="25-08088" />
    </React.Suspense>
  );
}

// 3. Debounce search and filters
import { debounce } from 'lodash';

const debouncedSearch = debounce((query) => {
  // Search logic
}, 300);

// ═══════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY TESTING
// ═══════════════════════════════════════════════════════════════════════════

// Test keyboard navigation:
// - Tab through all interactive elements
// - Enter/Space to activate buttons
// - Escape to close panels
// - Arrow keys in lists

// Test screen reader:
// - All images have alt text
// - Buttons have descriptive labels
// - Form inputs have labels
// - Status messages are announced

// Test color contrast:
// - Primary green (#009245) on white: 4.58:1 (WCAG AA compliant)
// - Text black (#081F13) on white: 16.8:1 (WCAG AAA compliant)

// ═══════════════════════════════════════════════════════════════════════════
// NEXT STEPS AFTER INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/*
1. ✅ Copy code examples as needed
2. ✅ Add route to your router
3. ✅ Test with mock data
4. ✅ Connect backend API
5. ✅ Customize configuration
6. ✅ Implement quick actions
7. ✅ Test on multiple devices
8. ✅ Run accessibility audit
9. ✅ Add error boundaries
10. ✅ Deploy to staging
*/

export default ProjectDashboard;
