# 🚀 Quick Integration Guide - Project Dashboard

## Installation Complete! ✅

Your new Project Dashboard module is ready to use at:
```
Frontend/src/appprojectdash/
```

## 🎯 Quick Start (3 Steps)

### Step 1: Add Route to Your Router

Add this to your routes configuration (likely in `src/routes/` or `src/App.jsx`):

```jsx
import ProjectDashboard from '@/appprojectdash';

// In your route definitions:
{
  path: '/project/:id',
  element: <ProjectDashboard projectId={/* from URL param */} />
}

// OR as a nested route under an existing project route:
{
  path: '/projects/:id/dashboard',
  element: <ProjectDashboard projectId={params.id} />
}
```

### Step 2: Test with Mock Data

The dashboard comes with built-in mock data. Just navigate to:
```
http://localhost:3000/project/25-08088
```

You should see the full dashboard with:
- ✅ Left navigation rail
- ✅ Project header with status
- ✅ Dashboard home with all cards and tiles
- ✅ Right utility panel (click the ⋮ icon)

### Step 3: Connect to Your Backend

Replace mock data in `hooks/useDashboardData.js`:

```jsx
// Find this in useDashboardData.js (around line 15):
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // REPLACE THIS MOCK API CALL with your actual endpoint:
      const response = await axiosSecure.get(`/api/projects/${projectId}/dashboard`);
      
      setRawData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (projectId) {
    fetchData();
  }
}, [projectId]);
```

## 📡 Expected API Response Format

Your backend should return data in this structure:

```json
{
  "project": {
    "id": "25-08088",
    "number": "25-08088",
    "name": "Redhill Roof Quote",
    "status": "estimating"
  },
  "client": {
    "name": "AUS Roofing Group",
    "address": "123 Example St, RedxHill, QLD 4000"
  },
  "progress": {
    "stage": "estimate",
    "percentage": 40
  },
  "takeoffs": {
    "roofFaces": 13,
    "wallFaces": 9
  },
  "quotes": {
    "draftCount": 1,
    "latestAmount": 18420
  },
  "orders": {
    "openCount": 0,
    "statusText": "Awaiting supplier input"
  },
  "files": {
    "count": 12,
    "categories": [
      { "label": "Plans", "count": 5 },
      { "label": "Emails", "count": 3 }
    ]
  },
  "latestFiles": [
    {
      "name": "plan.pdf",
      "size": 2458000,
      "uploadedAt": "2025-11-23T10:00:00Z"
    }
  ],
  "pendingTasks": [
    {
      "id": 1,
      "title": "Confirm fascia type",
      "description": "Check with client",
      "priority": "high",
      "dueDate": "2025-11-24T00:00:00Z"
    }
  ],
  "rustyInsights": [
    {
      "id": 1,
      "type": "warning",
      "title": "Missing wind zone",
      "description": "No wind zone specified",
      "action": "Add wind zone"
    }
  ],
  "supplier": {
    "material": "Colorbond",
    "price": 21.5
  },
  "windRegion": {
    "detected": "C",
    "verified": true
  },
  "color": {
    "selected": "Surfmist"
  }
}
```

## 🎨 Styling Already Matches Your Theme!

The dashboard uses your existing Tailwind config:
- ✅ Primary green: `#009245`
- ✅ Secondary blue: `#39A1F2`
- ✅ Orange: `#FEAE29`
- ✅ Inter font family
- ✅ Custom scrollbars

## 🔧 Customization

### Change Navigation Items

Edit `config/ProjectDashConfig.jsx`:

```jsx
export const NAVIGATION_MODULES = [
  // Add your custom modules here
  {
    id: 'custom',
    label: 'Custom Module',
    icon: YourIcon,
    route: '/project/:id/custom',
    description: 'Your custom module',
  },
];
```

### Add Status Types

```jsx
export const PROJECT_STATUSES = {
  YOUR_STATUS: {
    key: 'your_status',
    label: 'Your Status',
    color: 'bg-purple-600 text-white',
    dotColor: 'bg-purple-600',
  },
};
```

## 🎯 Quick Actions Setup

Hook up the quick action buttons in your parent component:

```jsx
<ProjectDashboard 
  projectId={projectId}
  onClose={() => navigate('/projects')}
/>
```

Then handle actions in `ProjectDashboard.jsx` (already set up):

```jsx
const handleQuickAction = (actionId) => {
  switch (actionId) {
    case 'upload':
      // Open file upload modal
      break;
    case 'takeoff':
      // Navigate to takeoff creator
      break;
    case 'quote':
      // Open quote generator
      break;
    case 'order':
      // Create new order
      break;
  }
};
```

## 📱 Mobile Testing

Test on different screen sizes:
- Desktop: Full 3-zone layout
- Tablet: Side-by-side cards
- Mobile: Stacked single column

## 🐛 Troubleshooting

### Dashboard not loading?
1. Check console for errors
2. Verify projectId is being passed correctly
3. Check if heroicons are installed: `npm install @heroicons/react`

### Styles look wrong?
1. Ensure Tailwind is processing the new files
2. Add to `tailwind.config.js` content array if needed:
   ```js
   content: [
     "./src/appprojectdash/**/*.{js,jsx,ts,tsx}",
   ]
   ```

### Icons not showing?
Install Heroicons:
```bash
npm install @heroicons/react
```

## 🎉 You're All Set!

The dashboard is:
- ✅ Fully responsive
- ✅ Theme-matched
- ✅ Accessible
- ✅ Performance optimized
- ✅ Ready for backend integration

## 📚 Next Steps

1. **Test the UI**: Navigate through all modules
2. **Connect Backend**: Replace mock data with real API calls
3. **Customize**: Add your specific business logic
4. **Implement Modules**: Build out the placeholder views
5. **Deploy**: Ship to production!

## 💡 Pro Tips

- Use the Rusty AI panel for real-time insights
- The utility panel remembers your last tab
- Click any tile to navigate to that module
- Search works across files, quotes, and orders
- All animations respect `prefers-reduced-motion`

---

**Need help?** Check the full README in `src/appprojectdash/README.md`

**Happy Building! 🚀**
