// utils/timezoneUtils.js
// Reusable timezone-aware date/time utilities for client-centric applications

/**
 * Detect timezone from project location or client data
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @returns {string} IANA timezone identifier (e.g., 'Australia/Sydney')
 */
export function detectTimezone(project = {}, client = {}) {
  try {
    // Priority 1: Client's explicit timezone
    if (client?.timezone) {
      return client.timezone;
    }
    
    // Priority 2: Project location-based detection
    if (project?.location?.full_address || project?.location?.address_line_1 || project?.location?.state) {
      const addressParts = [
        project.location.full_address,
        project.location.address_line_1,
        project.location.city,
        project.location.state,
        project.location.region
      ].filter(Boolean).join(' ').toLowerCase();
      
      // Australian state/city detection
      if (addressParts.includes('perth') || addressParts.includes('western australia') || addressParts.includes(' wa')) {
        return 'Australia/Perth'; // UTC+8
      } else if (addressParts.includes('adelaide') || addressParts.includes('south australia') || addressParts.includes(' sa')) {
        return 'Australia/Adelaide'; // UTC+9:30
      } else if (addressParts.includes('darwin') || addressParts.includes('northern territory') || addressParts.includes(' nt')) {
        return 'Australia/Darwin'; // UTC+9:30
      } else if (addressParts.includes('brisbane') || addressParts.includes('queensland') || addressParts.includes(' qld')) {
        return 'Australia/Brisbane'; // UTC+10 (no DST)
      } else if (addressParts.includes('sydney') || addressParts.includes('melbourne') || addressParts.includes('canberra') || 
                 addressParts.includes('hobart') || addressParts.includes('nsw') || addressParts.includes('vic') || 
                 addressParts.includes('act') || addressParts.includes('tas') || addressParts.includes('new south wales') ||
                 addressParts.includes('victoria') || addressParts.includes('tasmania')) {
        return 'Australia/Sydney'; // UTC+10/+11 (with DST)
      } else if (addressParts.includes('norway') || addressParts.includes('oslo') || addressParts.includes('bergen') || 
                 addressParts.includes('stavanger') || addressParts.includes('trondheim')) {
        return 'Europe/Oslo'; // UTC+1/+2
      } else if (addressParts.includes('usa') || addressParts.includes('united states')) {
        // Basic US timezone detection
        if (addressParts.includes('california') || addressParts.includes('los angeles') || addressParts.includes('seattle')) {
          return 'America/Los_Angeles';
        } else if (addressParts.includes('new york') || addressParts.includes('boston') || addressParts.includes('florida')) {
          return 'America/New_York';
        } else if (addressParts.includes('chicago') || addressParts.includes('texas') || addressParts.includes('houston')) {
          return 'America/Chicago';
        } else if (addressParts.includes('denver') || addressParts.includes('arizona') || addressParts.includes('phoenix')) {
          return 'America/Denver';
        }
        return 'America/New_York'; // Default US
      }
    }
    
    // Priority 3: Client email domain
    if (client?.email) {
      const email = client.email.toLowerCase();
      if (email.includes('.au') || email.includes('.com.au')) {
        return 'Australia/Sydney';
      } else if (email.includes('.no')) {
        return 'Europe/Oslo';
      }
    }
    
    // Default: Australia/Sydney (primary market)
    return 'Australia/Sydney';
  } catch (error) {
    console.error('Error detecting timezone:', error);
    return 'Australia/Sydney';
  }
}

/**
 * Get current date in a specific timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Date in YYYY-MM-DD format
 */
export function getDateInTimezone(timezone = 'Australia/Sydney') {
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const year = tzDate.getFullYear();
    const month = String(tzDate.getMonth() + 1).padStart(2, '0');
    const day = String(tzDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error getting date in timezone:', error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get current date and time in a specific timezone
 * @param {string} timezone - IANA timezone identifier
 * @returns {Object} { date: 'YYYY-MM-DD', time: 'HH:MM:SS', datetime: 'YYYY-MM-DD HH:MM:SS', timezone }
 */
export function getDateTimeInTimezone(timezone = 'Australia/Sydney') {
  try {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    const year = tzDate.getFullYear();
    const month = String(tzDate.getMonth() + 1).padStart(2, '0');
    const day = String(tzDate.getDate()).padStart(2, '0');
    const hours = String(tzDate.getHours()).padStart(2, '0');
    const minutes = String(tzDate.getMinutes()).padStart(2, '0');
    const seconds = String(tzDate.getSeconds()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}:${seconds}`,
      datetime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
      timezone
    };
  } catch (error) {
    console.error('Error getting datetime in timezone:', error);
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toISOString().split('T')[1].split('.')[0],
      datetime: now.toISOString().replace('T', ' ').split('.')[0],
      timezone: 'UTC'
    };
  }
}

/**
 * Get client's local date based on their project location
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @returns {string} Date in YYYY-MM-DD format in client's timezone
 */
export function getClientLocalDate(project = {}, client = {}) {
  const timezone = detectTimezone(project, client);
  return getDateInTimezone(timezone);
}

/**
 * Get client's local date and time
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @returns {Object} { date, time, datetime, timezone }
 */
export function getClientLocalDateTime(project = {}, client = {}) {
  const timezone = detectTimezone(project, client);
  return getDateTimeInTimezone(timezone);
}

/**
 * Format a date for display in client's timezone
 * @param {string|Date} dateInput - Date to format
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date in client's timezone
 */
export function formatClientDate(dateInput, project = {}, client = {}, options = {}) {
  try {
    const timezone = detectTimezone(project, client);
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    if (isNaN(date.getTime())) return String(dateInput);
    
    const defaultOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('en-AU', defaultOptions);
  } catch (error) {
    console.error('Error formatting client date:', error);
    return String(dateInput);
  }
}

/**
 * Format a datetime for display in client's timezone (includes time)
 * @param {string|Date} dateInput - Date to format
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted datetime in client's timezone
 */
export function formatClientDateTime(dateInput, project = {}, client = {}, options = {}) {
  try {
    const timezone = detectTimezone(project, client);
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    if (isNaN(date.getTime())) return String(dateInput);
    
    const defaultOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true, // Use 12-hour format with AM/PM
      ...options
    };
    
    return date.toLocaleString('en-AU', defaultOptions);
  } catch (error) {
    console.error('Error formatting client datetime:', error);
    return String(dateInput);
  }
}

/**
 * Get a relative time string (e.g., "2 hours ago", "just now")
 * Timezone-aware for accurate "today", "yesterday" labels
 * @param {string|Date} dateInput - Date to compare
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @returns {string} Relative time string
 */
export function getRelativeTime(dateInput, project = {}, client = {}) {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();
    
    if (isNaN(date.getTime())) return String(dateInput);
    
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error getting relative time:', error);
    return String(dateInput);
  }
}

/**
 * Format notification timestamp (combines date/time with relative time)
 * Perfect for Facebook-style notification threads
 * @param {string|Date} dateInput - Date to format
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @returns {string} e.g., "2 hours ago" or "25/11/2025 at 2:30 PM"
 */
export function formatNotificationTime(dateInput, project = {}, client = {}) {
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();
    
    if (isNaN(date.getTime())) return String(dateInput);
    
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    // If less than 24 hours, show relative time
    if (diffHours < 24) {
      return getRelativeTime(dateInput, project, client);
    }
    
    // Otherwise show full date with time
    const timezone = detectTimezone(project, client);
    return date.toLocaleString('en-AU', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting notification time:', error);
    return String(dateInput);
  }
}

/**
 * Convert UTC timestamp to client's local timezone
 * Useful for displaying stored UTC dates in client's time
 * @param {string|Date} utcDate - UTC date/time
 * @param {Object} project - Project with location data
 * @param {Object} client - Client data (optional)
 * @returns {Object} { date, time, datetime, timezone }
 */
export function convertUTCToClientTime(utcDate, project = {}, client = {}) {
  try {
    const timezone = detectTimezone(project, client);
    const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
    
    if (isNaN(date.getTime())) {
      return {
        date: String(utcDate),
        time: '',
        datetime: String(utcDate),
        timezone: 'UTC'
      };
    }
    
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    const year = tzDate.getFullYear();
    const month = String(tzDate.getMonth() + 1).padStart(2, '0');
    const day = String(tzDate.getDate()).padStart(2, '0');
    const hours = String(tzDate.getHours()).padStart(2, '0');
    const minutes = String(tzDate.getMinutes()).padStart(2, '0');
    const seconds = String(tzDate.getSeconds()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}:${seconds}`,
      datetime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
      timezone
    };
  } catch (error) {
    console.error('Error converting UTC to client time:', error);
    return {
      date: String(utcDate),
      time: '',
      datetime: String(utcDate),
      timezone: 'UTC'
    };
  }
}
