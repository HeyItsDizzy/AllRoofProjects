# 🐛 Bugs & Improvements Tracker

## Status Legend
- ✅ **FIXED** - Issue resolved and tested
- 🔧 **NEEDS FIX** - Active bug requiring attention
- 🔧 **TODO** - Planned improvement/feature
- 🆕 **NEW FEATURE** - Recently added ## 🏢 Client Management

### 26. ✅ FIXED - Client Main Contact Name
Added main contact name field in All Clients Table edit mode:
- ✅ Positioned above phone number in contact column
- ✅ DB structure: `mainContact.name`
- ✅ Included in both edit and display modes with proper validation

### 27. ✅ FIXED - Client Management Enhancements  
/Clients page improvements:
- ✅ Delete option in edit mode with confirmation dialog
- ✅ Reconfigured "New Clients" (now "Recent Clients") and "All Clients" buttons with improved styling
- ✅ "Add New Client" button for first-time client registration with full modal form
- ✅ Added loading states, better error handling, and improved visual feedback
- ✅ Enhanced search with result counts and better placeholder text
- ✅ Empty state messages for better UX
- ✅ Improved form validation and user experience

### 27.1. ✅ FIXED - Comprehensive Client Deletion Backend
**MAJOR ENHANCEMENT**: Implemented complete client deletion with orphan cleanup:
- ✅ **Admin-Only Access**: Secure deletion restricted to admin users only
- ✅ **Comprehensive Cleanup**: Removes ALL references across database collections
- ✅ **Project Cleanup**: Removes client from all project `linkedClients` arrays
- ✅ **User Cleanup**: Removes client from all user `linkedClients` arrays
- ✅ **Company Field Cleanup**: Clears `company` field for affected users
- ✅ **Admin Demotion**: Removes `companyAdmin` status from affected users
- ✅ **Safety Sweep**: Final pass to catch any remaining orphaned references
- ✅ **Detailed Logging**: Comprehensive cleanup reporting and logging
- ✅ **Enhanced Frontend**: Detailed confirmation dialog with cleanup preview
- ✅ **Success Feedback**: Shows cleanup summary with affected records count
- ✅ **Test Scripts**: Validation and orphan detection utilities included

**Backend Endpoint**: `DELETE /api/clients/:clientId`
**Cleanup Operations**: Projects, Users, Company assignments, Admin privileges
**Safety Features**: Double-checking with ObjectId variants, comprehensive logging

---
- 🔮 **FUTURE ### 35. 🔧 TODO - QuickBooks Online Integration (HIGH PRIORITY - TIME SAVER)
**IMMEDIATE BUSINESS NEED**: Semi-automated invoicing system to solve time-poor workflow issues:
- **OAuth Authentication**: Secure QuickBooks account linking with sandbox testing
- **Project Data Mapping**: Convert project estimates to QuickBooks invoice line items automatically
- **Client Sync**: Map project clients to QuickBooks customers with automatic creation
- **Invoice Templates**: Professional, standardized invoice generation from project completion
- **Approval Workflow**: 
  - Phase 1: Visual confirmation → one-click send (immediate time savings)
  - Phase 2: Eventual full automation (skip confirmation for trusted projects)
- **Payment Tracking**: Sync payment status back to project management system
- **Benefits**: Major time savings, automated billing process, professional invoicing, accountant-friendly
- **ROI**: Immediate relief from manual invoicing burden, faster payment cycles
- **Estimated Time**: 1-2 weeks total with immediate time-saving benefitsong-term planning item

---

## 📋 Active Issues & Improvements
Critical UX;
UX1. ✅ FIXED - Direct Link Authentication Flow
**MAJOR UX IMPROVEMENT**: Fixed authentication flow for direct project links such as "https://projects.allrooftakeoffs.com.au/project/25-09080ART&4a9c87187397497848c705f864ea0939":

**Problem**: Direct links were redirecting to 'Forbidden' page instead of login, bypassing proper authentication flow.

**Solution Implemented**:
- ✅ **Fixed PrivateRoutes Logic**: Direct project links now redirect to login instead of '/project/noaccess'
- ✅ **URL State Management**: Original direct link is stored in localStorage during redirect
- ✅ **Post-Login Redirect**: After successful login/registration, users are automatically redirected to their intended URL
- ✅ **Enhanced Token Validation**: AuthProvider validates tokens on startup but preserves existing popup flow for expired tokens
- ✅ **Comprehensive 401 Handling**: Axios interceptor now handles both `requiresRefresh` 401s and general token expiration
- ✅ **Preserved Existing UX**: Maintains your existing popup-based re-authentication flow for app updates
- ✅ **Improved UX Messages**: Better user feedback explaining the authentication flow

**Technical Details**:
- **Frontend**: Modified `PrivateRoutes.jsx`, `Login.jsx`, `Register.jsx`, `AuthProvider.jsx`, `CompanyChoice.jsx`, `ProjectsView.jsx`, and `useAxiosSecure.js`
- **Token Flow**: Startup validation doesn't interfere with existing popup flow - lets axios interceptor handle expired tokens
- **URL Preservation**: Both direct link access AND mid-session token expiration preserve intended URLs
- **App Update Flow**: Your existing "update need to relog" popup flow is preserved and enhanced with URL storage
- **Company Linking Flow**: Preserved URL survives entire registration → company choice → company linking sequence
- **Smart Clearing**: URL automatically cleared after successful use, preventing stale redirects
- **Storage**: Uses `localStorage.setItem('redirectAfterLogin', url)` for URL persistence across auth flows

**Handles Your Specific Scenario**:
- ✅ User accesses direct link with yesterday's token
- ✅ App detects token is invalid during API call
- ✅ Shows popup: "Session Expired, please sign in again" 
- ✅ Stores the direct link URL before redirecting to login
- ✅ After re-authentication, redirects back to original direct link
- ✅ Fresh token is obtained and user accesses content seamlessly

**Complete Registration → Company Linking Flow**:
- ✅ New client receives direct project link via email
- ✅ Clicks link → redirected to login (URL preserved)
- ✅ Clicks "Register" → completes registration (URL still preserved)
- ✅ Auto-redirected to company choice page (URL still preserved)
- ✅ Links to existing company via linking code (URL still preserved)
- ✅ After successful linking → smart redirect logic:
  - **Has Preserved URL?** → Redirect to original project link ✅
  - **No Preserved URL?** → Redirect to projects table ✅
- ✅ Original project URL loads successfully, preserved URL cleared

**Smart URL Preservation**:
- ✅ Only preserves URLs that require authentication (project links, admin pages)
- ✅ Doesn't preserve general navigation (projects table, profile) to avoid UX confusion
- ✅ Automatically clears preserved URL after successful use
- ✅ Handles edge cases where user navigates away and returns

**Benefits**: Users with valid access can now seamlessly access direct project links after authentication, eliminating the frustrating 'Forbidden' dead-end experience.

## 🎯 JobBoard & Estimate Management

### 1. ✅ IMPLEMENTED - Dual Status System (Feature #31)
**FEATURE #31 COMPLETED**: Sending estimate complete now marks estimates as 'Sent' on JobBoard while keeping 'Estimate Complete' on Projects page for client perspective. Manual 'Sent' status option also available on JobBoard.

**Implementation Details:**
- ✅ Added "Sent" status to estimateStatuses with teal color
- ✅ Backend automatically sets jobBoardStatus to "Sent" when estimate complete email is sent
- ✅ JobBoard now uses jobBoardStatus field (falls back to regular status)
- ✅ Projects page continues to use regular status field
- ✅ Manual "Sent" status selection available in JobBoard dropdown
- ✅ Dual status system maintains separation between estimator and client views

### 2. ✅ FIXED - JobBoard Keyboard Shortcuts
- ✅ CTRL+S for save functionality added
- ✅ Tooltip lightbulb now visible with instant hover (no delay)
- ✅ Changed from ℹ️ to 💡 icon with portal-based tooltip
- Features (all working): Click and drag to select cells, CTRL+C to copy selection

### 3. ✅ FIXED - JobBoard Search Filter Preservation
**COMPLETED**: Search filter preservation now working correctly.
- ✅ "Clear all filters" only clears header filters, preserves search text
- ✅ Search state maintained when using mechanical filters
- ✅ User context preserved during filter operations

### 4. ✅ FIXED - JobBoard Filter "Select All" Option
**COMPLETED**: Added "Select All" option in header filter selections.
- ✅ "Select All" button positioned after "Clear All" in filter dropdowns
- ✅ Works with all column types including date columns and __BLANK__ options
- ✅ Excel-like filter behavior for easier bulk selection
- ✅ Handles special cases (avatar columns, optional columns, date fields)

### 5. ✅ FIXED - JobBoard Project Row Highlighting
**COMPLETED**: Dual highlighting system implemented with both manual and automatic highlighting.
- ✅ **Manual Highlighting**: Single click Project Number to highlight entire row in yellow
- ✅ **Auto Highlighting**: Rows with unsaved changes automatically highlighted in yellow
- ✅ Manual highlights persist until save state is hit or manually cleared
- ✅ Project Number editing moved to double-click (preserving single-click for highlighting)
- ✅ Combined system: manual selection + automatic unsaved change indication
- ✅ Highlights clear automatically when "Save All" is triggered

### 6. ✅ FIXED - Email Modal Field Linking
- ✅ Fixed backend field mapping: changed clientEmail to contactEmail
- ✅ Email sending now properly includes all required fields (contactEmail, subject, html)
- ✅ EstimateCompleteModal can now successfully send estimate emails

### 7. ✅ FIXED - EstimateCompleteModal Client Data
- ✅ Fixed project number display (ProjectNumber → projectNumber)
- ✅ Added fallback client loading when no linkedClients exist
- ✅ Modal now shows full client list for projects without linked clients
- ✅ Improved client selection experience for all project types

### 7.1 ✅ FIXED - Pin Functions for Additional Columns
**COMPLETED**: Added pin/freeze functionality to Estimator and Status columns.
- ✅ **Estimator Column**: Pin button added - click to freeze/unfreeze column to left side
- ✅ **Status Column**: Pin button added - click to freeze/unfreeze column to left side  
- ✅ **Consistent UI**: Same pin/unpin icons and behavior as Project Name and Client columns
- ✅ **LocalStorage Persistence**: Pin states saved and restored between sessions
- ✅ **Excel-like Behavior**: Frozen columns stay visible during horizontal scrolling

### 7.2 ✅ FIXED - Job Board UI Updates
- ✅ **State Column**: 'Australian Capital Territory' now displays as 'ACT' for thinner column width
- ✅ **Confirmed Badge**: '✅ Confirmed' badge in Est Pay column no longer wraps text (`whitespace-nowrap` added)

### 7.3 ✅ FIXED - Job Board UX Updates
- ✅ **Qty/Est Qty Input**: Fixed input behavior to allow typing decimals like 1.5 without knockout after 1 digit
- ✅ **Input Persistence**: Implemented focus-based saving (save on blur/Enter) instead of onChange to prevent re-renders
- ✅ **Zero EstQty Approval**: Can now approve/lock Est Qty when it's 0 but Qty has input (for free estimator work but paid customers)
- ✅ **Comments Input**: Fixed one-letter-at-a-time issue using same focus-based saving approach
- ✅ **Column Filter Search**: Fixed search functionality and added alphabetical sorting of filterable options
- ✅ **Filter Improvements**: Enhanced avatar column sorting by display names, maintained __BLANK__ option at bottom

### 7.4 ✅ FIXED - Status Synchronization Between JobBoard and Projects Page
**COMPLETED**: Fixed issue where JobBoard status changes weren't reflecting on Projects page cross-user.
- ✅ **Root Cause**: ProjectTable was only checking `status` field instead of `jobBoardStatus` field
- ✅ **Solution**: Modified ProjectTable `getProjectDisplayInfo` to prioritize `jobBoardStatus` over `status`
- ✅ **Result**: When JobBoard status = "In Progress", Projects page now shows "ART: In Progress"
- ✅ **Backend Verification**: Confirmed `/projects/update/:id` route working and saving `jobBoardStatus` to database
- ✅ **Auto-Save System**: Verified JobBoard auto-save system successfully persists status changes
- ✅ **Data Refresh Issue**: Fixed Projects page not fetching updated data from database
- ✅ **Polling System**: Added 30-second polling to AdminProjectTable and UnifiedProjectsView
- ✅ **Manual Refresh**: Added "🔄 Refresh" button for immediate data sync
- ✅ **Enhanced Status Sync**: Fixed estimator "Awaiting Review" auto-status to sync to client view
- ✅ **Comprehensive Status Mapping**: All key statuses now sync properly (In Progress, Awaiting Review, Estimate Completed, Cancelled)
- ✅ **Cross-User Sync**: Status changes now visible to other users on different devices/browsers
- ✅ **Debug Logging**: Added comprehensive logging for troubleshooting status update flow

---

## 🎨 General UI/UX Improvements

### 8. ✅ FIXED - Indian Verified Phone Numbers
Status: Resolved and tested

### 9. 🔧 TODO - Enhanced Date Picker
Add the new date picker to create new / project view/edit pages

### 10. 🔧 NEEDS FIX - Unified Project Table Filters
In "/profile" page, differentiate "All Projects" and "Open Projects" filters from monthly filters

### 11. 🔧 NEEDS FIX - Client Assignment Modal
In Unified Projects Table, when assigning client modal opens:
- Auto-focus search box for immediate typing

### 11.1 🔧 User Managment, Currently on a showing results x of 15 users
a. change this to have a picker for 25,50,100,Max (max=200) (default to 50)
    a1. ensure search will search entire DB not just the current page view eg not only Page 2
b. sort A-Z by First name as default
c. add sorting forward and reverse option to each column 
    c1. User = A-Z
    c2. Contact = A-Z (base don email, this colum hold Phone Numbers as well as email but the sorting should use email as the Sorting lead)
    c3. Company = A-Z
    c4. Role = A-Z
    c5. Status = A-Z
    c6. Actions = (no Sort)

### 11.2 🔧 User Managment Modal, all the APi calls fight, make this simple, Read current, update fields, send updated state via patch, Note check assigning and unassign to Client to see if it uses the same api as the correct assignclient modal as used in Projects table and Jobtable



---

## 📁 File Management & Directory Issues

### 12. ✅ PARTIALLY FIXED - EML File Handling
.eml files should open with default mail reader (like mailto:)
- May require quick download then launch
- Needs testing for seamless user experience

### 13. ✅ PARTIALLY FIXED - Projects View File Directory
Projects view > file directory > double click action and 'view' action no longer work

### 14. 🔧 NEEDS FIX - File Directory View Button
View button in file directory not working, affecting double-click default function
- Download button and function work via direct interaction

### 15. 🔧 TODO - Loading States
Add proper loading spinners for file directory panel

### 16. 🔧 TODO - Folder Scroll Bar Position
In folder contents side of file directory, position scroll bar on left when folder quantity forces scrolling

### 16.1 🔧 TODO - Create merge projects option in the case of accidently creating 2 project instead of one due to multple emails etc,
a. the merge will work by selecting the 2 project numbers you wish to merge (or maybe more, as rarely it will create 5 at a time and merging one by one might be combursome. you may only choose for projects you have access to ie, validat with 'Role' and  'linkedclient')
b. after selectiong the 2 project numbers you must choos which project number to keep (this will be the parent essentially),
c. which ever the parent number is chosen will become the destination path for moving all the project documents into
d. at the point iof finalising your seciton a hard warning with you cannot reverse these changes and a type the merged project number input box, where your typed input must match the number exactly including the '-' eg 25-10052 (this is to make it harder for accidental merges, a simple are you sure might not be strong enough), and the input method wont be use extreemely often so there should be no UX issues arising form it

---

## 🔗 Socket & Live Sync Issues

### 17. 🔧 NEEDS FIX - File Removal Sync
Almost all add, rename, and delete works for files and folders, except file removals aren't live syncing

### 18. 🔧 NEEDS FIX - Project Rename Refresh
When changing project name on project view page, refresh file directory panel component only

### 19. 🔧 NEEDS FIX - Post-Rename Directory Fetch
In project view after project rename, refetch file directory panel (project name relates to file name)

---

## 🤖 Rusty AI Features & Issues

### 20. ✅ FIXED - Enhanced Rusty AI Spam Detection
#### 20a. ✅ FIXED - Puppeteer Integration
Rusty now reviews email + attachments + download links for intelligent decisions

#### 20b. 🔧 NEEDS FIX - EML File Preservation
When Rusty splits MSG into EML files:
- Preserve original file name (subject name)
- Maintain original HTML formatting

#### 20c. 🔧 NEEDS FIX - Drag & Drop Project Scope
Drag to upload project scope via drag and drop needs improvement

#### 20d. 🔧 NEEDS FIX - Rusty Polling Issues
Rusty doesn't seem to action anything except on startup (logs show polling is working)

#### 🆕 NEW FEATURES ADDED:
- ✅ Smart attachment analysis (filenames, file types, content)
- ✅ Whitelisted download source detection (SharePoint, Dropbox, Google Drive, etc.)
- ✅ Puppeteer integration for automatic document downloads
- ✅ Backup email notifications when downloads fail
- ✅ Enhanced confidence scoring for spam detection
- ✅ Property address recognition in email subjects
- ✅ Project creation even when downloads fail (for whitelisted sources)

### 21. 🔧 TODO - Call to Action Button
Need prominent CTA: "Send your estimate request here" / "Drag and drop your email here"
- Consider mobile and online mailbox integration (Gmail, etc.)

### 22. 🆕 NEW FEATURE - Email Project Creation
Drag and drop or forward to Rusty AI email:
- Endless aliases for Rusty AI (or up to certain limit)
- Mobile/webmail alternative: `rusty_ai[Random]@allrooftakeoffs.com`
- Paid position aliases: `rusty_ai.clientname@allrooftakeoffs.com`
- Automatic project creation from email forwarding

### 23. 🆕 NEW FEATURE - Email Project Creation via Rusty Agent 
(automation currently works but need this new agent feature for better UX)

### 24. � TODO - RustyAI Address Formatting
RustyAI email address additions must follow Mapbox address object rules:
- save adrres as an object not a string
- All Mapbox fields must be properly filled
- Consistent with existing address handling

### 25. 🔮 FUTURE DEV - Rusty AI Sent Box
Enable viewing Rusty AI sent messages through Outlook app

---

## � Client Management

### 26. 🔧 TODO - Client Main Contact Name
Add main contact name field in All Clients Table edit mode:
- Position above phone number in contact column
- DB structure: `mainContact.name`

### 27. 🔧 TODO - Client Management Enhancements
/Clients page needs:
- Delete option in edit mode
- Reconfigure "New Clients" and "All Clients" buttons
- "Add New" client button for first-time client registration

---

## 🔧 System & Technical Issues

### 28. 🔧 TODO - Direct Link State Management
ProjectsView.jsx: When direct link hits friendly no-access page:
- Save link in state during login/signup
- Redirect to saved project URL after successful authentication

### 29. 🔧 TODO - Phone Number Validation
Confirm phone number format validation in Company Profile save:
- Check previously entered incorrect formats
- Apply same validation to Personal Profile page

### 30. 🔧 TODO - Server Down Fallback
Add fallback page for server downtime scenarios

### 31. 🔧 TODO - Create Project Modal Redesign
Transition to modal model with:
- Main fields at top for fast creation
- Expandable "all fields" option at bottom
- Quick create vs. comprehensive options

---

## 🔮 Future Development

### 32. 🔮 FUTURE DEV - Notification System
Prepare basic estimate send notification setup for future full notification system:
- Client navigation assistance
- Attention-required alerts
- Last 100 notifications + "keep" marked items
- Light email preview with read/unread/remind functionality

### 33. 🔮 FUTURE DEV - a lot of people have pop up blockers and modals are sometimes considered as such, can i offer a accept all coookies / funtionall cookes option to get around their pop up blocker, as my App is basically unusable without pop ups and new tab opens as an allowance

### 34. 🔧 TODO - Recent Files Roulette Feature
Add a horizontal roulette/carousel above the file manager showing the 5 most recently accessed files:
- **Quick Access**: One-click navigation to recently used PDFs and documents
- **Visual Options**: Choose between PDF preview thumbnails or file type icons
- **Position**: Above existing file directory panel for easy access
- **Persistence**: Track file access patterns per user/project
- **Benefits**: Reduces navigation time, improves workflow efficiency
- **Estimated Time**: 2-3 days (builds on existing file infrastructure)

### 35. � FUTURE DEV - QuickBooks Online Integration
Semi-automated invoicing system with QuickBooks Online API integration:
- **OAuth Authentication**: Secure QuickBooks account linking
- **Project Data Mapping**: Convert project estimates to QuickBooks invoice line items
- **Client Sync**: Map project clients to QuickBooks customers
- **Invoice Templates**: Professional, standardized invoice generation
- **Payment Tracking**: Sync payment status back to project management system
- **Benefits**: Streamlined billing process, professional invoicing, accountant-friendly
- **Estimated Time**: 1-2 weeks (complex OAuth setup and API integration)



---

## �📊 Summary Statistics
- **Total Issues**: 35
- **Fixed**: 10
- **Needs Fix**: 12
- **TODO/Planned**: 10
- **Future Development**: 3

---

## 🔄 Last Updated
September 15, 2025

*This document consolidates all bug reports and improvement requests from the development process.*
