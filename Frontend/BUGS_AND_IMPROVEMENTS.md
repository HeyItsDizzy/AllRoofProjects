# 🐛 Bugs & Improvements Tracker

## Status Legend
- ✅ **FIXED** - Issue resolved and tested
- 🔧 **NEEDS FIX** - Active bug requiring attention
- 🔧 **TODO** - Planned improvement/feature
- 🆕 **NEW FEATURE** - Recently added functionality
- 🔮 **FUTURE DEV** - Long-term planning item

---

## 📋 Active Issues & Improvements

### 1. ✅ FIXED - Indian Verified Phone Numbers
Status: Resolved and tested

### 2. UI/UX Improvements

#### 2.1a. 🔧 TODO - Enhanced Date Picker
Add the new date picker to create new / project view/edit pages

#### 2.3. ✅ PARTIALLY FIXED - JobTable Keyboard Shortcuts
- ✅ CTRL+S for save functionality added
- 🔧 Small fixes required: Cannot see the tooltip lightbulb
- Features: Click and drag to select cells, CTRL+C to copy selection

#### 2.4. 🔧 TODO - Estimate Status Differentiation
Need to differentiate "Estimate Sent" from "Estimate Complete":
- **Estimate Sent**: First point when product is sent
- **Estimate Complete**: After all invoicing completed for the week
- JobBoard status changes should not affect client/user side view
- Admin/estimator reference for invoicing tracking

#### 2.5. 🔧 TODO - Project Row Highlighting
- Single click Project Number to highlight entire row in yellow
- Highlight persists until save state is hit
- Move Project Number edit to double-click (other columns remain single-click)

### 3. ✅ PARTIALLY FIXED - EML File Handling
.eml files should open with default mail reader (like mailto:)
- May require quick download then launch
- Needs testing for seamless user experience

### 4. 🔧 URGENT - Projects View File Directory
Projects view > file directory > double click action and 'view' action no longer work

### 5. 🔧 NEEDS FIX - Unified Project Table Filters
In "/profile" page, differentiate "All Projects" and "Open Projects" filters from monthly filters

### 6. 🔧 NEEDS FIX - File Directory View Button
View button in file directory not working, affecting double-click default function
- Download button and function work via direct interaction

### 7. ✅ FIXED - Enhanced Rusty AI Spam Detection
#### 7a. ✅ FIXED - Puppeteer Integration
Rusty now reviews email + attachments + download links for intelligent decisions

#### 7b. 🔧 NEEDS FIX - EML File Preservation
When Rusty splits MSG into EML files:
- Preserve original file name (subject name)
- Maintain original HTML formatting

#### 7c. 🔧 NEEDS FIX - Drag & Drop Project Scope
Drag to upload project scope via drag and drop needs improvement

#### 7d. 🔧 NEEDS FIX - Rusty Polling Issues
Rusty doesn't seem to action anything except on startup (logs show polling is working)

#### 🆕 NEW FEATURES ADDED:
- ✅ Smart attachment analysis (filenames, file types, content)
- ✅ Whitelisted download source detection (SharePoint, Dropbox, Google Drive, etc.)
- ✅ Puppeteer integration for automatic document downloads
- ✅ Backup email notifications when downloads fail
- ✅ Enhanced confidence scoring for spam detection
- ✅ Property address recognition in email subjects
- ✅ Project creation even when downloads fail (for whitelisted sources)

### 8. 🔧 TODO - Call to Action Button
Need prominent CTA: "Send your estimate request here" / "Drag and drop your email here"
- Consider mobile and online mailbox integration (Gmail, etc.)

### 9. 🔧 NEEDS FIX - Client Assignment Modal
In Unified Projects Table, when assigning client modal opens:
- Auto-focus search box for immediate typing

### 10. Socket & Live Sync Issues

#### 18. 🔧 NEEDS FIX - File Removal Sync
Almost all add, rename, and delete works for files and folders, except file removals aren't live syncing

#### 19. 🔧 NEEDS FIX - Project Rename Refresh
When changing project name on project view page, refresh file directory panel component only

#### 25. 🔧 NEEDS FIX - Post-Rename Directory Fetch
In project view after project rename, refetch file directory panel (project name relates to file name)

### 11. 🔧 TODO - Direct Link State Management
ProjectsView.jsx: When direct link hits friendly no-access page:
- Save link in state during login/signup
- Redirect to saved project URL after successful authentication

### 12. 🔮 FUTURE DEV - Notification System
Prepare basic estimate send notification setup for future full notification system:
- Client navigation assistance
- Attention-required alerts
- Last 100 notifications + "keep" marked items
- Light email preview with read/unread/remind functionality

### 13. 🔧 TODO - Client Main Contact Name
Add main contact name field in All Clients Table edit mode:
- Position above phone number in contact column
- DB structure: `mainContact.name`

### 14. 🔮 FUTURE DEV - Rusty AI Sent Box
Enable viewing Rusty AI sent messages through Outlook app

### 15. 🔧 TODO - Phone Number Validation
Confirm phone number format validation in Company Profile save:
- Check previously entered incorrect formats
- Apply same validation to Personal Profile page

### 16. 🔧 NEEDS FIX - EstimateCompleteModal Client Data
No data in select client if no client assigned to project:
- Show full client list as fallback

### 17. 🔧 TODO - Server Down Fallback
Add fallback page for server downtime scenarios

### 20. 🔧 TODO - Loading States
Add proper loading spinners for file directory panel

### 21. 🔧 TODO - Create Project Modal Redesign
Transition to modal model with:
- Main fields at top for fast creation
- Expandable "all fields" option at bottom
- Quick create vs. comprehensive options

### 22. 🔧 TODO - Folder Scroll Bar Position
In folder contents side of file directory, position scroll bar on left when folder quantity forces scrolling

### 23. 🔧 TODO - Client Management Enhancements
/Clients page needs:
- Delete option in edit mode
- Reconfigure "New Clients" and "All Clients" buttons
- "Add New" client button for first-time client registration

### 24. 🆕 NEW FEATURE - Email Project Creation
Drag and drop or forward to Rusty AI email:
- Endless aliases for Rusty AI (or up to certain limit)
- Mobile/webmail alternative: `rusty_ai[Random]@allrooftakeoffs.com`
- Paid position aliases: `rusty_ai.clientname@allrooftakeoffs.com`
- Automatic project creation from email forwarding

### 26. 🔧 QOL - Search Filter Preservation
In JobBoard search: preserve search state when using mechanical filters
- "Clear all filters" should only clear header filters, not search

### 27. 🔧 QOL - Filter "Select All" Option
Add "Select All" option in header filter selections:
- Easier to exclude only a few fields
- Similar to MS Excel filter behavior

### 28. 🔧 TODO - RustyAI Address Formatting
RustyAI email address additions must follow Mapbox address object rules:
- All Mapbox fields must be properly filled
- Consistent with existing address handling

### 29. 🔧 TODO - Link  Emailmodal fields correctly (currently cannot send as required fields are empty)

### 30. 🆕 NEW FEATURE - Email Project Creation
---

## 📊 Summary Statistics
- **Total Issues**: 28
- **Fixed**: 6
- **Needs Fix**: 12
- **TODO/Planned**: 8
- **Future Development**: 2

---

## 🔄 Last Updated
September 11, 2025

*This document consolidates all bug reports and improvement requests from the development process.*
