# Project Dashboard Module (`appprojectdash`)

A comprehensive, industry-specific project dashboard for roofing estimators and project managers. Built as a standalone, plug-and-play module that integrates seamlessly with your existing ProjectManagerApp.

## 🎯 Overview

The Project Dashboard provides a clean, intuitive interface with:
- **3-Zone Layout**: Left navigation rail, main workspace, right utility panel
- **Industry-Specific Tools**: Supplier pricing, wind region detection, color selection
- **Real-time Insights**: Rusty AI integration for automated project analysis
- **Modular Architecture**: Easy to extend and customize

## 📁 Structure

```
appprojectdash/
├── ProjectDashboard.jsx          # Main container component
├── ProjectDashboard.css          # Theme-matching styles
├── index.js                      # Main export file
├── components/
│   ├── LeftNavigationRail.jsx   # Vertical icon navigation
│   ├── DashboardHeader.jsx      # Top bar with project info
│   ├── DashboardHome.jsx        # Main dashboard view
│   ├── RightUtilityPanel.jsx    # Activity/Notes/Rusty AI panel
│   ├── cards/                   # Summary cards (Row 1)
│   │   ├── ProgressCard.jsx
│   │   ├── LatestUploadsCard.jsx
│   │   ├── PendingTasksCard.jsx
│   │   └── RustyInsightsCard.jsx
│   ├── tiles/                   # Key area tiles (Row 2)
│   │   └── KeyAreaTiles.jsx
│   ├── widgets/                 # Industry tools (Row 3)
│   │   └── IndustryWidgets.jsx
│   ├── modules/                 # Module placeholder views
│   │   └── ModuleViews.jsx
│   └── shared/                  # Reusable components
│       ├── StatusBadge.jsx
│       ├── QuickActionButton.jsx
│       ├── ModuleTile.jsx
│       └── InfoCard.jsx
├── hooks/
│   ├── useNavigationState.js    # Navigation state management
│   ├── useDashboardData.js      # Data aggregation hook
│   └── useActivityFeed.js       # Activity updates hook
├── api/                         # API integration (placeholder)
└── config/
    └── ProjectDashConfig.jsx    # Central configuration
```

## 🚀 Usage

### Basic Integration

```jsx
import ProjectDashboard from '@/appprojectdash';

function App() {
  return (
    <ProjectDashboard 
      projectId="25-08088" 
      onClose={() => console.log('Close dashboard')}
    />
  );
}
```

### Individual Component Usage

```jsx
import { 
  DashboardHeader, 
  ProgressCard, 
  StatusBadge 
} from '@/appprojectdash';

// Use components individually
<StatusBadge status="estimating" />
<ProgressCard currentStage="quote" percentage={75} />
```

## 🎨 Theme Integration

The dashboard automatically uses your existing theme colors:
- **Primary Green**: `#009245` (buttons, active states, success)
- **Secondary Blue**: `#39A1F2` (info, links)
- **Orange**: `#FEAE29` (warnings, highlights)
- **Text Colors**: `#081F13` (black), `#696D7D` (gray)

## 📊 Dashboard Sections

### Row 1: Summary Cards
- **Progress Tracker**: Visual project stage progression
- **Latest Uploads**: Recent files with timestamps
- **Pending Tasks**: Action items with priorities
- **Rusty AI Insights**: Automated warnings and suggestions

### Row 2: Key Areas
- **Take-offs**: Roof/wall measurements (13 faces, 9 faces)
- **Quotes**: Draft count and latest pricing ($18,420)
- **Orders**: Open orders and status updates
- **Files**: Document count by category

### Row 3: Industry Tools
- **Supplier Price Checker**: Current Colorbond pricing ($21.50/m²)
- **Wind Region Detector**: Auto-detect and verify (Region C)
- **Colour Selector**: Colorbond color picker (Surfmist)

## 🔧 Configuration

All configuration is centralized in `config/ProjectDashConfig.jsx`:

```jsx
import { PROJECT_STATUSES, NAVIGATION_MODULES } from '@/appprojectdash/config';

// Customize statuses
PROJECT_STATUSES.CUSTOM = {
  key: 'custom',
  label: 'Custom Status',
  color: 'bg-blue-600 text-white',
  dotColor: 'bg-blue-600',
};

// Add navigation modules
NAVIGATION_MODULES.push({
  id: 'custom',
  label: 'Custom Module',
  icon: YourIcon,
  route: '/project/:id/custom',
});
```

## 🔌 API Integration

Replace mock data in `hooks/useDashboardData.js` with your API calls:

```jsx
// Example API integration
useEffect(() => {
  const fetchData = async () => {
    const response = await axiosSecure.get(`/api/projects/${projectId}/dashboard`);
    setRawData(response.data);
  };
  fetchData();
}, [projectId]);
```

## 🎯 Key Features

### Left Navigation Rail
- Icon-based vertical navigation
- Hover tooltips with descriptions
- Active module highlighting
- Green primary color theme

### Dashboard Header
- Project number and name display
- Client and site information
- Status badge with color coding
- Quick action buttons (Upload, Create Quote, etc.)
- Search functionality
- Notification bell with unread count

### Right Utility Panel
- **Activity Tab**: Recent project updates
- **Notes Tab**: Quick project notes
- **Rusty AI Tab**: Live chat with AI assistant
- Sliding animation from right
- Backdrop overlay

### Responsive Design
- Desktop: Full 3-zone layout
- Tablet: Collapsible panels
- Mobile: Stacked navigation

## 🔄 Navigation

The dashboard uses internal navigation with history:

```jsx
const { activeModule, navigateTo, goBack, goForward } = useNavigationState();

// Navigate to a module
navigateTo('takeoffs');

// Browser-like back/forward
goBack();
goForward();
```

## 🎨 Styling

Custom CSS classes in `ProjectDashboard.css`:
- `.project-dashboard-container` - Main wrapper
- `.project-dashboard-main` - Content area with nav offset
- `.project-dashboard-content` - Scrollable content with padding
- Animations: `slideInRight`, `slideDown`, `shimmer`, `fadeIn`

## 🧪 Development Status

### ✅ Complete
- Full UI/UX design implementation
- 3-zone responsive layout
- All summary cards and tiles
- Industry-specific widgets
- Navigation system
- Utility panel with 3 tabs
- Theme integration
- Animation system

### 🚧 Ready for Backend Integration
- API hooks (placeholder data ready)
- File upload handlers
- Quote creation workflow
- Order management
- Rusty AI WebSocket integration

### 📝 Module Placeholders
All module views are created as placeholders ready for implementation:
- Project Info
- Project Files
- Take-offs
- Quotes
- Orders
- Timeline
- Notes & Emails
- Settings

## 🔐 Security Considerations

- Uses existing `useAxiosSecure` hook for API calls
- Authentication context from `AuthProvider`
- Role-based access control ready
- Input sanitization on forms

## 📱 Mobile Optimization

- Touch-friendly targets (min 44x44px)
- Swipeable panels
- Collapsible navigation
- Optimized grid layouts
- Reduced motion support

## ♿ Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- High contrast mode support
- Reduced motion preferences

## 🚀 Future Enhancements

1. **WebSocket Integration**: Real-time updates
2. **Offline Support**: Service workers and caching
3. **Advanced Analytics**: Charts and reporting
4. **Custom Dashboards**: User-configurable layouts
5. **Dark Mode**: Full theme switching
6. **Export Features**: PDF/Excel generation
7. **Mobile App**: React Native version

## 📞 Integration Help

To integrate with your existing routes:

```jsx
// In your routes file
import ProjectDashboard from '@/appprojectdash';

{
  path: '/project/:id/dashboard',
  element: <ProjectDashboard projectId={params.id} />
}
```

## 🎓 Component Examples

### Status Badge
```jsx
<StatusBadge status="estimating" size="md" showDot={true} />
```

### Quick Action Button
```jsx
<QuickActionButton
  label="Upload Files"
  icon="upload"
  color="primary"
  onClick={handleUpload}
/>
```

### Info Card
```jsx
<InfoCard 
  title="Project Details" 
  icon={DocumentIcon}
  variant="primary"
>
  <p>Your content here</p>
</InfoCard>
```

## 🤝 Contributing

This module follows the existing app's patterns:
1. Use existing hooks (`useAxiosSecure`, `AuthContext`)
2. Follow Tailwind + custom CSS approach
3. Match existing color scheme
4. Maintain accessibility standards

## 📄 License

Part of the ProjectManagerApp ecosystem.

---

**Built with ❤️ for AUS Roofing Group**
