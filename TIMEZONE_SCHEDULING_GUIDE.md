# Recipient Timezone Email Scheduling - Implementation Guide

## Overview
Your timezone management system now supports **recipient-local-time email delivery**. When you say "send at 6:00 AM", the email will be delivered at 6:00 AM in the recipient's timezone, not yours.

## How It Works

### 1. Timezone Detection
The system automatically detects recipient timezones using:
- **Priority 1**: Client's explicitly set timezone
- **Priority 2**: Project location analysis (addresses, cities, states)
- **Priority 3**: Email domain detection (.au, .no, .com, etc.)
- **Priority 4**: Fallback to your timezone

### 2. Supported Regions
- **Australia (AU)**: 6 timezones (Perth, Adelaide, Darwin, Brisbane, Sydney, etc.)
- **United States (US)**: 6 main timezones (Pacific, Mountain, Central, Eastern, etc.)
- **Norway (NO)**: Oslo timezone (GMT+2)

### 3. Email Scheduling Features

#### Immediate Send
- Formats dates in recipient's timezone
- Shows correct local business days
- Handles regional date preferences

#### Scheduled Send
- **Recipient Local Time**: "6:00 AM" = 6:00 AM in recipient's timezone
- **Automatic Conversion**: Backend converts to UTC for server scheduling
- **Smart Detection**: Uses client/project data to determine timezone

## Usage Examples

### Frontend (React Components)
```jsx
import useTimezone from '@/hooks/useTimezone';

function EmailModal({ clientData, projectData }) {
  const { 
    scheduleAtRecipientTime, 
    detectRecipientTimezone,
    formatForEmail 
  } = useTimezone();

  // Schedule email for 6:00 AM recipient time
  const scheduleInfo = scheduleAtRecipientTime(
    "06:00",           // 6:00 AM recipient time
    clientData,        // Client info for timezone detection
    projectData,       // Project info for location-based detection
    new Date()         // Target date (optional, defaults to tomorrow)
  );

  // Returns:
  // {
  //   scheduledTime: "2024-01-15T20:00:00.000Z",  // UTC for server
  //   recipientTimezone: "Australia/Sydney",
  //   recipientLocalTime: "06:00",
  //   recipientLocalDate: "16 January 2024",
  //   serverTime: "2024-01-15T20:00:00.000Z"
  // }

  // Format date for email template
  const emailFormat = formatForEmail(
    new Date(),
    clientData,
    projectData
  );
  
  // Returns: { formatted: "15 January 2024", dayOfWeek: "Monday", timezone: "Australia/Sydney" }
}
```

### Backend (Email Scheduling)
```javascript
// POST /api/emails/schedule-recipient-time
const emailJob = {
  scheduledTime: "2024-01-15T20:00:00.000Z",  // UTC from frontend
  recipientTimezone: "Australia/Sydney",
  recipientLocalTime: "06:00",
  recipientLocalDate: "16 January 2024",
  clientData: { /* client info */ },
  projectData: { /* project info */ },
  emailTemplate: "jobDelayed",
  emailData: { /* email content */ }
};
```

## Updated Components

### 1. JobDelayedModal
- ✅ **Recipient Detection**: Automatically detects client timezone
- ✅ **Scheduling Controls**: Option to schedule for specific recipient time
- ✅ **Smart Formatting**: Dates formatted for recipient's region
- ✅ **Timezone Display**: Shows detected timezone in UI

### 2. useTimezone Hook
- ✅ **scheduleAtRecipientTime()**: Schedule emails for recipient's local time
- ✅ **detectRecipientTimezone()**: Smart timezone detection
- ✅ **formatForEmail()**: Enhanced with recipient detection

### 3. Backend Routes
- ✅ **Schedule Endpoint**: `/api/emails/schedule-recipient-time`
- ✅ **Timezone-Aware Jobs**: Store recipient timezone context
- ✅ **Smart Processing**: Execute at correct UTC time

## Configuration Examples

### Client Data Structure
```javascript
const clientData = {
  _id: "client123",
  name: "John Smith",
  email: "john@example.com.au",  // .au domain = Australia
  timezone: "Australia/Sydney",   // Explicit timezone (highest priority)
  region: "AU"                   // Explicit region
};
```

### Project Data Structure
```javascript
const projectData = {
  _id: "project123",
  name: "Roof Installation",
  location: {
    address: "123 Main Street, Sydney NSW 2000, Australia"  // Location-based detection
  }
};
```

## Testing Your Implementation

### 1. Test Different Regions
```javascript
// Australian client
const auClient = { email: "test@example.com.au" };
const auProject = { location: { address: "Sydney, Australia" } };

// US client  
const usClient = { email: "test@example.com" };
const usProject = { location: { address: "New York, USA" } };

// Norwegian client
const noClient = { email: "test@example.no" };
const noProject = { location: { address: "Oslo, Norway" } };
```

### 2. Verify Scheduling
```javascript
// Should schedule for 6:00 AM Sydney time
const auSchedule = scheduleAtRecipientTime("06:00", auClient, auProject);
console.log("AU 6AM =", new Date(auSchedule.scheduledTime)); // Check UTC conversion

// Should schedule for 6:00 AM New York time  
const usSchedule = scheduleAtRecipientTime("06:00", usClient, usProject);
console.log("US 6AM =", new Date(usSchedule.scheduledTime)); // Different UTC time
```

## Current Server Configuration

### Server Timezone: GMT+0 (UTC)
- ✅ **Correct**: All scheduled times are stored in UTC
- ✅ **Conversion**: Frontend handles timezone conversions
- ✅ **Display**: Users see times in their local timezone
- ✅ **Recipients**: Get emails at their local time

## Next Steps

1. **Test the Implementation**:
   ```bash
   # Open JobDelayedModal
   # Select client with Australian email/location
   # Set delivery time to "06:00"  
   # Check console logs for timezone detection
   ```

2. **Verify Backend Integration**:
   - Ensure your email routes can handle the new scheduling endpoint
   - Test with different client regions
   - Verify UTC conversion is working

3. **Add to Other Email Templates**:
   - Apply same pattern to other email modals
   - Use `scheduleAtRecipientTime()` for any scheduled emails
   - Use `formatForEmail()` with client/project context

## Summary

You now have a complete timezone system where:
- **"Send at 6:00 AM"** = 6:00 AM recipient's local time
- **Automatic Detection**: Client timezone from email, location, or settings  
- **Smart Scheduling**: Backend receives UTC, executes at correct time
- **Regional Formatting**: Dates formatted for recipient's preferences

The system handles your 3 regions (AU +6-9, US all timezones, NO +2) and ensures emails are delivered when recipients expect them, not when you send them!