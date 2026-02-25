# Project Dashboard - Quick Start Guide

## 🚀 Quick Deployment (5 Steps)

### Step 1: Run Migration
```bash
cd /path/to/ProjectManagerApp/Backend
node migrations/migrate-add-dashboard-fields.js
```
**Expected**: All existing projects get `dashboard` field

### Step 2: Restart Backend
```bash
pm2 restart backend  # Production
# OR
npm run dev  # Development
```

### Step 3: Verify Routes
Check backend logs for:
```
✅ projectDashboardRoutes registered
```

### Step 4: Access Dashboard
1. Login to app
2. Profile Drawer → DEV → Project Dashboard
3. Navigate to: `/project-dashboard/25-08088` (or any project ID)

### Step 5: Test
- Dashboard should load with real project data
- Check browser console for any errors
- Verify all cards display (even if empty)

---

## 📡 API Quick Reference

### Get Dashboard Data
```bash
GET /api/projects/:projectId/dashboard
Authorization: Bearer <token>
```

### Create Task
```bash
POST /api/projects/:projectId/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Task title",
  "description": "Task description",
  "priority": "high",
  "dueDate": "2025-01-20T10:00:00Z"
}
```

### Get Activity Feed
```bash
GET /api/projects/:projectId/activity?limit=20
Authorization: Bearer <token>
```

---

## 🎯 Key Features Enabled

✅ **Real-time dashboard** - Live project data  
✅ **Task management** - Create/update/delete tasks  
✅ **Activity logging** - All changes tracked  
✅ **Progress tracking** - Stage & percentage  
✅ **File statistics** - Counts by category  
✅ **AI insights** - Automatic suggestions  

---

## 🔧 Configuration

### Enable/Disable Mock Data
**Frontend** (`hooks/useDashboardData.js`):
```javascript
const USE_MOCK_DATA = false; // Set to true for development
```

**Frontend** (`hooks/useActivityFeed.js`):
```javascript
const USE_MOCK_DATA = false; // Set to true for development
```

### Activity Polling Interval
```javascript
const POLL_INTERVAL = 30000; // 30 seconds (in ms)
```

---

## 🐛 Troubleshooting

### Dashboard Shows "Loading..."
- Check backend is running
- Verify project ID exists
- Check browser console for errors

### Dashboard Shows Mock Data
- Set `USE_MOCK_DATA = false` in hooks
- Restart frontend dev server
- Clear browser cache

### 401 Unauthorized
- JWT token expired - refresh login
- Check Authorization header present

### 404 Not Found
- Verify project ID is correct
- Check migration ran successfully
- Confirm project exists in database

---

## 📊 Database Collections

| Collection | Purpose | Status |
|------------|---------|--------|
| `Projects` | Project base data + dashboard field | ✅ Updated |
| `project_files` | File metadata | 🟡 Schema ready |
| `project_tasks` | Action items | ✅ Working |
| `project_activity` | Activity log | ✅ Working |
| `project_quotes` | Pricing quotes | 🟡 Schema ready |
| `project_orders` | Material orders | 🟡 Schema ready |
| `project_takeoffs` | Measurements | 🟡 Schema ready |
| `project_notes` | Communications | 🟡 Schema ready |

---

## 🎨 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Left Nav  │         Main Dashboard            │  Right      │
│            │                                    │  Panel      │
│   [Home]   │  ┌────────────────────────────┐  │             │
│   [Info]   │  │  Progress | Files | Tasks  │  │  Activity   │
│   [Files]  │  └────────────────────────────┘  │  Feed       │
│   [Quotes] │  ┌────────────────────────────┐  │             │
│   [Orders] │  │  Takeoffs | Quotes | Orders│  │  ───────    │
│   [Tasks]  │  └────────────────────────────┘  │  • Upload   │
│   [Notes]  │  ┌────────────────────────────┐  │  • Create   │
│   [...]    │  │  Supplier | Wind | Color   │  │  • Update   │
│            │  └────────────────────────────┘  │             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 Documentation Links

- **Full Summary**: `DATABASE_INTEGRATION_SUMMARY.md`
- **Schema Reference**: `Backend/config/ProjectDashboardSchemas.md`
- **API Routes**: `Backend/routes/projectDashboardRoutes.js`
- **Frontend Hooks**: `Frontend/src/appprojectdash/hooks/`

---

## ✅ Pre-Deployment Checklist

- [ ] Migration script tested on dev database
- [ ] Backend routes registered correctly
- [ ] Frontend hooks updated
- [ ] Authentication working
- [ ] Test project data loaded
- [ ] Browser console clear of errors
- [ ] Activity feed polling works
- [ ] Task creation working

---

## 🎉 You're Ready!

The dashboard is now connected to real database. All placeholder data has been replaced with live API calls. Activity logging is automatic. Stats update in real-time.

**Next**: Add real files, tasks, and project data to see the dashboard come alive!

---

*Last Updated: 2025-01-15*
