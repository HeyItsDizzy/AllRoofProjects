# 🐛 Bugs & Improvements Tracker

## Status Legend
- ✅ **FIXED** - Issue resolved and tested
- 🔧 **NEEDS FIX** - Active bug requiring attention
- 🔧 **TODO** - Planned improvement/feature
- 🆕 **NEW FEATURE** - Recently added ## 🏢 Client Management


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

## Ax. 📋 Active Issues & Improvements
### A1. I thought we implemented a Recycle bin funtion for when we delte files and this is suppossed to be incase of incorrect deleeting whether that be from Disk or from UI, please find the recycle bin and ensure it is working
### A2. WHen Editing project, only global addmin should be able to change the project numbers, User account cannot edit that field!
---

---

## Dx.📁 File Management & Directory Issues

### D1. ✅ PARTIALLY FIXED - EML File Handling
.eml files should open with default mail reader (like mailto:)
- May require quick download then launch
- Needs testing for seamless user experience
- maybe make it as a Modal Preview (non funtional, but with a button to say actions, drop down to Reply,Forard which should then do that acction in the users default mail app)

### D2. 🔧 TODO - Folder Scroll Bar Position
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

### 32. 🔧 TODO - Clear eror log for updating projec number
- cannot update projec tto have the same number as another in existence, works but the errod 'cannot uppdate' is to generic, specify the error is  WARN SIGN 'Project number already in use!"

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
