# 🎯 DUAL-STATUS SYSTEM DOCUMENTATION

## Overview
The Project Manager now uses a **dual-status system** to separate client workflow (Project Table) from estimator workflow (Job Board). This prevents conflicts and provides clear visibility into both workflows.

---

## 📊 Database Schema

### New Fields:
```javascript
{
  // Legacy field (kept for backwards compatibility)
  status: "Old Status",           // ⚠️ Deprecated - will auto-migrate on first update
  
  // NEW DUAL-STATUS SYSTEM
  projectStatus: "New Lead",      // Client-side workflow status
  estimateStatus: null            // Estimator-side workflow status (null = not requested)
}
```

### Migration:
- **Legacy projects** with only `status` field will auto-migrate on first status update
- The system detects if old status is an estimate status or project status and assigns accordingly
- Old `status` field is preserved for reference but no longer used

---

## 🔄 CLIENT WORKFLOW (Project Table)

### Unlocked States (Normal Workflow):
```
1. New Lead                    ← Default on creation
2. Estimate Requested          ← Triggers estimator involvement
   ↓ [LOCKED BY ESTIMATOR]
3. Estimate Completed          ← Auto-set when estimator marks "Sent"
4. Quote Sent
5. Approved / Cancelled / Job Lost
6. Project Active
7. Completed
```

### Locked State (During Estimation):
When `projectStatus = "Estimate Requested"` and `estimateStatus` is active:
- **Display**: `ART: [estimateStatus]` (e.g., "ART: In Progress")
- **Dropdown**: Only shows current status + "Cancel Request" option
- **Purpose**: Client can see estimator's progress but can only cancel, not change workflow
- **Unlock**: Client selects "Cancel Request" → `estimateStatus = "Cancelled"` → Workflow unlocks

---

## 🛠️ ESTIMATOR WORKFLOW (Job Board)

### Estimate Statuses:
```
Estimate Requested             ← Entry point (from client)
   ↓
Assigned                       ← Manually assigned by admin
   ↓
In Progress
   ↓
In Progress: Walls
   ↓
RFI / HOLD / Small Fix         ← Special states
   ↓
Awaiting Review
   ↓
Estimate Completed
   ↓
Sent                           ← Auto-updates client to "Estimate Completed"
```

### Special Behaviors:
- **Cancelled**: Set by client clicking "Cancel Request" - unlocks client workflow
- **Sent**: Auto-updates `projectStatus = "Estimate Completed"` on client side
- **Null**: Project not yet requested for estimation (only visible to admin)

---

## 👥 ROLE-BASED PERMISSIONS

### Admin (Development Mode):
✅ Can edit `projectStatus` in Project Table  
✅ Can edit `estimateStatus` in Job Board  
⚠️ In production, should only edit estimate statuses

### User (Client):
✅ Can edit `projectStatus` when UNLOCKED  
❌ Cannot edit `projectStatus` when LOCKED (except "Cancel Request")  
❌ Cannot see or edit `estimateStatus` (never see Job Board)

### Estimator:
✅ Can edit `estimateStatus` in Job Board  
❌ Cannot edit `projectStatus` (never changes client workflow)  
👁️ Can SEE `projectStatus` in Project Table (read-only)

---

## 🔒 LOCKING LOGIC

### When Project Table is LOCKED:
```javascript
isLocked = (estimateStatus !== null && 
            estimateStatus !== "Cancelled" && 
            estimateStatus !== "Sent")
```

### Locked Dropdown:
```
Current: ART: In Progress
Options:
  - ART: In Progress  (current, unselectable)
  - Cancel Request    (only option)
```

### Unlock Triggers:
1. **Client cancels**: Select "Cancel Request" → `estimateStatus = "Cancelled"`
2. **Estimator completes**: Mark "Sent" → `estimateStatus = "Sent"`, `projectStatus = "Estimate Completed"`

---

## 🔄 AUTO-UPDATE RULES

### When Estimator Marks "Sent":
```javascript
// Backend automatically executes:
estimateStatus = "Sent"
projectStatus = "Estimate Completed"  // AUTO-UPDATE
```

### When Client Cancels Request:
```javascript
// Backend automatically executes:
estimateStatus = "Cancelled"
projectStatus = [unchanged]  // Stays at current value
```

---

## 🎨 UI INDICATORS

### Project Table Status Cell:

**Unlocked (Normal):**
```
┌─────────────────────────┐
│ New Lead            ▼   │  ← Blue/Green colors
└─────────────────────────┘
```

**Locked (Estimating):**
```
┌─────────────────────────┐
│ ART: In Progress    ▼ 🔒│  ← Orange background
└─────────────────────────┘
```

---

## 🧪 TESTING CHECKLIST

### Test 1: Legacy Migration
- [ ] Open project with old `status = "New Lead"`
- [ ] Change status to "Estimate Requested"
- [ ] Verify backend migrates to `projectStatus = "New Lead"`, `estimateStatus = null`

### Test 2: Client Workflow
- [ ] User creates new project (should be "New Lead")
- [ ] User changes to "Estimate Requested"
- [ ] Verify dropdown locks with "ART: [status]" + "Cancel Request"

### Test 3: Estimator Workflow
- [ ] Admin/Estimator opens Job Board
- [ ] Assign estimator to project
- [ ] Change estimate status to "In Progress"
- [ ] Verify Project Table shows "ART: In Progress" (locked)

### Test 4: Cancel Request
- [ ] User selects "Cancel Request" from locked dropdown
- [ ] Verify `estimateStatus = "Cancelled"`
- [ ] Verify dropdown unlocks and shows normal workflow

### Test 5: Completion Flow
- [ ] Estimator marks estimate as "Sent"
- [ ] Verify `projectStatus` auto-updates to "Estimate Completed"
- [ ] Verify Project Table unlocks
- [ ] User can now select "Quote Sent", "Approved", etc.

### Test 6: Role Permissions
- [ ] User tries to update estimate status → Should fail with 403
- [ ] Estimator tries to update project status → Should fail with 403
- [ ] Admin can update both (in dev mode)

---

## 🚀 API ENDPOINTS

### PATCH `/projects/:projectId`
**Purpose**: Update project status and/or estimate status with role-based validation

**Request Body**:
```javascript
{
  projectStatus: "New Lead",      // Optional - client workflow
  estimateStatus: "In Progress",  // Optional - estimator workflow
  status: "Old Status"            // Optional - legacy support
}
```

**Role-Based Behavior**:
- **Admin**: Can update both `projectStatus` and `estimateStatus`
- **User**: Can only update `projectStatus` (or cancel via "Cancel Request")
- **Estimator**: Can only update `estimateStatus`

**Auto-Updates**:
- `estimateStatus = "Sent"` → Auto-sets `projectStatus = "Estimate Completed"`
- `projectStatus = "Cancel Request"` → Sets `estimateStatus = "Cancelled"`, keeps `projectStatus`

**Response**:
```javascript
{
  success: true,
  message: "Project status updated successfully",
  data: {
    _id: "...",
    projectStatus: "Estimate Completed",
    estimateStatus: "Sent",
    // ... other project fields
  }
}
```

---

## 📝 FRONTEND COMPONENTS

### Modified Files:
1. **`/Backend/routes/projectRoutes.js`**
   - Added `PATCH /:projectId` endpoint with dual-status logic
   - Role-based permissions
   - Auto-update rules
   - Legacy migration support

2. **`/Frontend/src/components/ProjectTable.jsx`**
   - New `getProjectDisplayInfo()` - Determines display status and locking
   - Updated `handleStatusChange()` - Dual-status update logic
   - Updated `renderStatusCell()` - Shows locked/unlocked states with visual indicators

### Unchanged Files:
- **`/shared/projectStatuses.js`** - Status definitions remain the same
- **Job Board components** - Will need updates for `estimateStatus` (separate task)

---

## ⚠️ IMPORTANT NOTES

1. **Job Board Integration**: Job Board components still need to be updated to use `estimateStatus` field
2. **Production Mode**: Admins should NOT edit client `projectStatus` in production (only for testing)
3. **Legacy Projects**: First status update will auto-migrate old `status` field to new dual-status
4. **Backwards Compatibility**: Old `status` field is preserved but ignored after migration

---

## 🔮 FUTURE ENHANCEMENTS

- [ ] Job Board integration with `estimateStatus`
- [ ] Disable estimator dropdown when `projectStatus !== "Estimate Requested"`
- [ ] Visual timeline showing status progression
- [ ] Email notifications on status changes
- [ ] Audit log for status changes (who changed what, when)
- [ ] Production mode toggle to disable admin project status editing

---

## 📞 SUPPORT

If you encounter issues:
1. Check browser console for error messages
2. Verify role permissions in user profile
3. Check backend logs for API errors
4. Confirm database migration completed successfully

---

**Implementation Date**: November 19, 2025  
**Version**: 1.0.0  
**Status**: ✅ Ready for Testing
