# Timezone Utilities - Usage Guide

## 📍 Location: `Frontend/src/utils/timezoneUtils.js`

Reusable timezone-aware utilities for displaying dates/times in **client's local timezone**, not yours!

---

## 🎯 Common Use Cases

### 1. **JobBoard / Project Tables - Record Client's Local Date**
```javascript
import { getClientLocalDate } from '@/utils/timezoneUtils';

// When marking estimate as "Sent"
const clientDate = getClientLocalDate(project, client);
// Returns: "2025-11-26" (client's date, not your UTC date)

updateRow(projectId, 'DateCompleted', clientDate);
```

### 2. **Notification System (Facebook-style)**
```javascript
import { formatNotificationTime, getClientLocalDateTime } from '@/utils/timezoneUtils';

// Show relative time for recent updates
const notificationTime = formatNotificationTime(notification.createdAt, project, client);
// Returns: "2 hours ago" (if recent) or "25/11/2025 at 2:30 PM" (if older)

// Example notification component
function NotificationItem({ notification, project, client }) {
  return (
    <div className="notification">
      <p>{notification.message}</p>
      <span className="time">{formatNotificationTime(notification.createdAt, project, client)}</span>
    </div>
  );
}
```

### 3. **Email Sending - Show Client's Expected Date/Time**
```javascript
import { formatClientDateTime, getClientLocalDateTime } from '@/utils/timezoneUtils';

// Get current datetime in client's timezone
const { datetime, timezone } = getClientLocalDateTime(project, client);
// Returns: { 
//   date: "2025-11-26",
//   time: "14:30:00",
//   datetime: "2025-11-26 14:30:00",
//   timezone: "Australia/Brisbane"
// }

// Format for email display
const emailDate = formatClientDateTime(new Date(), project, client);
// Returns: "26/11/2025, 2:30 PM" (in client's timezone)

// Email template example
const emailBody = `
Dear ${client.name},

Your estimate was completed on ${emailDate}.

Thank you!
`;
```

### 4. **Activity Log / History - Show When Things Actually Happened**
```javascript
import { convertUTCToClientTime, formatClientDateTime } from '@/utils/timezoneUtils';

// Convert stored UTC timestamp to client's local time
function ActivityLog({ activities, project, client }) {
  return (
    <div className="activity-log">
      {activities.map(activity => {
        const clientTime = convertUTCToClientTime(activity.timestamp, project, client);
        
        return (
          <div key={activity.id} className="activity">
            <p>{activity.description}</p>
            <span>{clientTime.datetime}</span>
            <small className="text-gray-500">({clientTime.timezone})</small>
          </div>
        );
      })}
    </div>
  );
}
```

### 5. **Relative Time (Social Media Style)**
```javascript
import { getRelativeTime } from '@/utils/timezoneUtils';

// Show "just now", "2 hours ago", etc.
const relativeTime = getRelativeTime(comment.createdAt, project, client);
// Returns: "2 hours ago" or "yesterday" or "3 days ago"

function Comment({ comment, project, client }) {
  return (
    <div className="comment">
      <p>{comment.text}</p>
      <span className="time">{getRelativeTime(comment.createdAt, project, client)}</span>
    </div>
  );
}
```

### 6. **Dashboard / Charts - Group by Client's Local Day**
```javascript
import { getClientLocalDate, formatClientDate } from '@/utils/timezoneUtils';

// Get today's date in client's timezone
const clientToday = getClientLocalDate(project, client);

// Filter today's projects
const todaysProjects = projects.filter(p => {
  const projectDate = formatClientDate(p.created_at, project, client, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return projectDate === clientToday;
});
```

---

## 🔧 Available Functions

### **detectTimezone(project, client)**
Auto-detects timezone from project location or client data.
```javascript
const tz = detectTimezone(project, client);
// Returns: "Australia/Brisbane" or "Australia/Sydney" etc.
```

### **getClientLocalDate(project, client)**
Get today's date in client's timezone (YYYY-MM-DD).
```javascript
const date = getClientLocalDate(project, client);
// Returns: "2025-11-26"
```

### **getClientLocalDateTime(project, client)**
Get current date AND time in client's timezone.
```javascript
const { date, time, datetime, timezone } = getClientLocalDateTime(project, client);
// Returns: {
//   date: "2025-11-26",
//   time: "14:30:00",
//   datetime: "2025-11-26 14:30:00",
//   timezone: "Australia/Brisbane"
// }
```

### **formatClientDate(dateInput, project, client, options)**
Format any date in client's timezone.
```javascript
const formatted = formatClientDate(project.due_date, project, client);
// Returns: "26/11/2025"
```

### **formatClientDateTime(dateInput, project, client, options)**
Format date WITH time in client's timezone.
```javascript
const formatted = formatClientDateTime(project.created_at, project, client);
// Returns: "26/11/2025, 2:30 PM"
```

### **formatNotificationTime(dateInput, project, client)**
Perfect for notification feeds - shows relative time if recent, full date if old.
```javascript
const time = formatNotificationTime(notification.createdAt, project, client);
// Returns: "2 hours ago" OR "25/11/2025 at 2:30 PM"
```

### **getRelativeTime(dateInput, project, client)**
Social media style relative timestamps.
```javascript
const relative = getRelativeTime(comment.timestamp, project, client);
// Returns: "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago"
```

### **convertUTCToClientTime(utcDate, project, client)**
Convert stored UTC dates to client's local time.
```javascript
const { date, time, datetime, timezone } = convertUTCToClientTime(utcTimestamp, project, client);
```

---

## 🌍 Supported Timezones

### **Australia**
- 🦘 **Queensland (QLD)**: `Australia/Brisbane` (UTC+10, no DST)
- 🏙️ **NSW/VIC/ACT/TAS**: `Australia/Sydney` (UTC+10/+11 with DST)
- 🌴 **South Australia (SA)**: `Australia/Adelaide` (UTC+9:30)
- 🏜️ **Northern Territory (NT)**: `Australia/Darwin` (UTC+9:30)
- 🌊 **Western Australia (WA)**: `Australia/Perth` (UTC+8)

### **Norway**
- 🇳🇴 **Oslo**: `Europe/Oslo` (UTC+1/+2 with DST)

### **United States**
- 🗽 **Eastern**: `America/New_York` (UTC-5/-4)
- 🌆 **Central**: `America/Chicago` (UTC-6/-5)
- 🏔️ **Mountain**: `America/Denver` (UTC-7/-6)
- 🌉 **Pacific**: `America/Los_Angeles` (UTC-8/-7)

---

## ✅ Why Use These?

**Problem**: You're in Norway (UTC+1), client is in Brisbane (UTC+10). When you mark something as "sent" at 11 PM Nov 25, it should show Nov 26 for the client because it's already tomorrow for them!

**Solution**: These utilities automatically detect the client's timezone and show dates/times in THEIR local time, not yours.

**Result**: Accurate date history, correct notification timestamps, and happy clients who see times that make sense to them! 🎉

---

## 💡 Pro Tips

1. **Always pass project and client objects** - The functions will auto-detect the timezone
2. **For notifications** - Use `formatNotificationTime()` for Facebook-style timestamps
3. **For emails** - Use `formatClientDateTime()` to show the date they'll receive it
4. **For logs** - Use `convertUTCToClientTime()` to display stored UTC dates correctly
5. **For relative time** - Use `getRelativeTime()` for "2 hours ago" style displays
