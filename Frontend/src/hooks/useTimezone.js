/**
 * Timezone Management Hook
 * Handles timezone conversions based on user regions (AU, US, NO)
 * Best practice for global 24/7 companies
 */
import { useContext, useMemo } from 'react';
import { AuthContext } from '@/auth/AuthProvider';

// Timezone configuration for different regions
const TIMEZONE_CONFIG = {
  AU: {
    name: 'Australia',
    zones: {
      // Major Australian timezones
      'Australia/Sydney': { offset: '+10', cities: ['Sydney', 'Melbourne', 'Canberra'] },
      'Australia/Brisbane': { offset: '+10', cities: ['Brisbane'] },
      'Australia/Adelaide': { offset: '+09:30', cities: ['Adelaide'] },
      'Australia/Perth': { offset: '+08', cities: ['Perth'] },
      'Australia/Darwin': { offset: '+09:30', cities: ['Darwin'] },
      'Australia/Hobart': { offset: '+10', cities: ['Hobart'] }
    },
    default: 'Australia/Sydney',
    businessHours: { start: 9, end: 17 }
  },
  US: {
    name: 'United States',
    zones: {
      'America/New_York': { offset: '-05', cities: ['New York', 'Boston', 'Atlanta'] },
      'America/Chicago': { offset: '-06', cities: ['Chicago', 'Dallas', 'Houston'] },
      'America/Denver': { offset: '-07', cities: ['Denver', 'Phoenix', 'Salt Lake City'] },
      'America/Los_Angeles': { offset: '-08', cities: ['Los Angeles', 'San Francisco', 'Seattle'] },
      'America/Anchorage': { offset: '-09', cities: ['Anchorage'] },
      'Pacific/Honolulu': { offset: '-10', cities: ['Honolulu'] }
    },
    default: 'America/New_York',
    businessHours: { start: 9, end: 17 }
  },
  NO: {
    name: 'Norway',
    zones: {
      'Europe/Oslo': { offset: '+02', cities: ['Oslo', 'Bergen', 'Stavanger'] }
    },
    default: 'Europe/Oslo',
    businessHours: { start: 8, end: 16 }
  }
};

/**
 * Main timezone hook
 * @returns {Object} Timezone utilities and functions
 */
export const useTimezone = () => {
  const { user } = useContext(AuthContext);
  
  // Get user's region and timezone from user profile or detect from browser
  const userRegion = useMemo(() => {
    // Priority: User profile > Client profile > Browser detection > Default AU
    if (user?.region) return user.region;
    if (user?.client?.region) return user.client.region;
    
    // Browser detection fallback
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimezone.includes('Australia')) return 'AU';
    if (browserTimezone.includes('America') || browserTimezone.includes('Pacific')) return 'US';
    if (browserTimezone.includes('Europe/Oslo')) return 'NO';
    
    return 'AU'; // Default to Australia
  }, [user]);

  const userTimezone = useMemo(() => {
    // Priority: User's specific timezone > Client's timezone > Browser > Regional default
    if (user?.timezone) return user.timezone;
    if (user?.client?.timezone) return user.client.timezone;
    
    // Browser detection
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const regionConfig = TIMEZONE_CONFIG[userRegion];
    
    if (regionConfig.zones[browserTimezone]) {
      return browserTimezone;
    }
    
    return regionConfig.default;
  }, [user, userRegion]);

  /**
   * Convert UTC date to user's timezone
   * @param {Date|string} utcDate - UTC date to convert
   * @param {Object} options - Formatting options
   * @returns {string} Formatted date in user's timezone
   */
  const toUserTime = (utcDate, options = {}) => {
    if (!utcDate) return '';
    
    const date = new Date(utcDate);
    const defaultOptions = {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('en-AU', defaultOptions);
  };

  /**
   * Convert UTC datetime to user's timezone with time
   * @param {Date|string} utcDate - UTC date to convert
   * @param {Object} options - Formatting options
   * @returns {string} Formatted datetime in user's timezone
   */
  const toUserDateTime = (utcDate, options = {}) => {
    if (!utcDate) return '';
    
    const date = new Date(utcDate);
    const defaultOptions = {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return date.toLocaleString('en-AU', defaultOptions);
  };

  /**
   * Get current date in user's timezone
   * @param {Object} options - Formatting options
   * @returns {string} Current date in user's timezone
   */
  const getUserCurrentDate = (options = {}) => {
    const now = new Date();
    return toUserTime(now, options);
  };

  /**
   * Get current datetime in user's timezone
   * @param {Object} options - Formatting options
   * @returns {string} Current datetime in user's timezone
   */
  const getUserCurrentDateTime = (options = {}) => {
    const now = new Date();
    return toUserDateTime(now, options);
  };

  /**
   * Convert user's local date to UTC for server
   * @param {Date|string} localDate - Local date in user's timezone
   * @returns {Date} UTC date for server storage
   */
  const toServerTime = (localDate) => {
    if (!localDate) return null;
    
    // If it's already a Date object, return as UTC
    if (localDate instanceof Date) {
      return new Date(localDate.getTime());
    }
    
    // If it's a string, parse it considering user's timezone
    const date = new Date(localDate);
    return new Date(date.getTime());
  };

  /**
   * Detect recipient's timezone from client/project data
   * @param {Object} clientData - Client information
   * @param {Object} projectData - Project information
   * @returns {string} Detected timezone for recipient
   */
  const detectRecipientTimezone = (clientData = {}, projectData = {}) => {
    // Priority 1: Client's explicitly set timezone
    if (clientData?.timezone) {
      return clientData.timezone;
    }
    
    // Priority 2: Project location-based detection
    if (projectData?.location?.address) {
      const address = projectData.location.address.toLowerCase();
      
      // Australian locations
      if (address.includes('australia') || address.includes('sydney') || address.includes('melbourne') || 
          address.includes('brisbane') || address.includes('perth') || address.includes('adelaide') ||
          address.includes('nsw') || address.includes('vic') || address.includes('qld') || 
          address.includes('wa') || address.includes('sa') || address.includes('tas') || 
          address.includes('nt') || address.includes('act')) {
        
        // More specific Australian city mapping
        if (address.includes('perth') || address.includes('wa')) return 'Australia/Perth';
        if (address.includes('adelaide') || address.includes('sa')) return 'Australia/Adelaide';
        if (address.includes('darwin') || address.includes('nt')) return 'Australia/Darwin';
        if (address.includes('brisbane') || address.includes('qld')) return 'Australia/Brisbane';
        return 'Australia/Sydney'; // Default for NSW, VIC, ACT, TAS
      }
      
      // US locations
      if (address.includes('usa') || address.includes('united states') || 
          address.includes('california') || address.includes('new york') || address.includes('texas') ||
          address.includes('florida') || address.includes('nevada') || address.includes('arizona')) {
        
        // US state mapping
        if (address.includes('california') || address.includes('nevada') || address.includes('oregon') || address.includes('washington')) return 'America/Los_Angeles';
        if (address.includes('arizona') || address.includes('utah') || address.includes('colorado') || address.includes('montana')) return 'America/Denver';
        if (address.includes('texas') || address.includes('illinois') || address.includes('minnesota') || address.includes('wisconsin')) return 'America/Chicago';
        if (address.includes('new york') || address.includes('florida') || address.includes('georgia') || address.includes('virginia')) return 'America/New_York';
        return 'America/New_York'; // Default US
      }
      
      // Norwegian locations
      if (address.includes('norway') || address.includes('oslo') || address.includes('bergen') || address.includes('stavanger')) {
        return 'Europe/Oslo';
      }
    }
    
    // Priority 3: Client email domain detection
    if (clientData?.email) {
      const domain = clientData.email.toLowerCase();
      if (domain.includes('.au') || domain.includes('.com.au')) return 'Australia/Sydney';
      if (domain.includes('.no')) return 'Europe/Oslo';
      if (domain.includes('.us') || domain.includes('.com')) return 'America/New_York';
    }
    
    // Priority 4: Fallback to user's timezone
    return userTimezone;
  };

  /**
   * Schedule email delivery at recipient's local time
   * @param {string} localTime - Desired time in format "HH:MM" (e.g., "06:00")
   * @param {Object} clientData - Client information for timezone detection
   * @param {Object} projectData - Project information for timezone detection
   * @param {Date|string} targetDate - Target date (default: tomorrow)
   * @returns {Object} Scheduling information for backend
   */
  const scheduleAtRecipientTime = (localTime, clientData = {}, projectData = {}, targetDate = null) => {
    try {
      const recipientTimezone = detectRecipientTimezone(clientData, projectData);
      
      // Set up target date (default to tomorrow)
      const baseDate = targetDate ? new Date(targetDate) : new Date();
      if (!targetDate) {
        baseDate.setDate(baseDate.getDate() + 1); // Tomorrow by default
      }
      
      // Parse the desired local time (e.g., "06:00")
      const [hours, minutes] = localTime.split(':').map(Number);
      
      // Create a date object in the recipient's timezone
      // We need to create the date as if it's in their local timezone
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const day = baseDate.getDate();
      
      // Create date string in recipient's timezone
      const localDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      
      // Create a temporary date to get the timezone offset
      const tempDate = new Date(localDateString);
      const utcTime = new Date(tempDate.toLocaleString('sv-SE', { timeZone: 'UTC' }));
      const recipientTime = new Date(tempDate.toLocaleString('sv-SE', { timeZone: recipientTimezone }));
      
      // Calculate the offset and adjust
      const offset = utcTime.getTime() - recipientTime.getTime();
      const scheduledUTC = new Date(tempDate.getTime() + offset);
      
      return {
        scheduledTime: scheduledUTC.toISOString(),
        recipientTimezone: recipientTimezone,
        recipientLocalTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        recipientLocalDate: baseDate.toLocaleDateString('en-AU', { 
          timeZone: recipientTimezone,
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        }),
        userTimezone: userTimezone,
        serverTime: scheduledUTC.toISOString()
      };
    } catch (error) {
      console.error('Email scheduling error:', error);
      return null;
    }
  };

  /**
   * Format date for email templates (always show in recipient's expected format)
   * @param {Date|string} date - Date to format
   * @param {Object} clientData - Client data for timezone detection
   * @param {Object} projectData - Project data for timezone detection
   * @param {string} fallbackRegion - Fallback region if detection fails
   * @returns {Object} Formatted date info for email
   */
  const formatForEmail = (date, clientData = {}, projectData = {}, fallbackRegion = userRegion) => {
    if (!date) return { formatted: '', dayOfWeek: '', timezone: '' };
    
    const recipientTimezone = detectRecipientTimezone(clientData, projectData);
    
    // Determine region from timezone for formatting preferences
    let recipientRegion = fallbackRegion;
    if (recipientTimezone.includes('Australia')) recipientRegion = 'AU';
    else if (recipientTimezone.includes('America') || recipientTimezone.includes('Pacific')) recipientRegion = 'US';
    else if (recipientTimezone.includes('Europe/Oslo')) recipientRegion = 'NO';
    
    const dateObj = new Date(date);
    
    // Format based on recipient's region preferences
    const formatOptions = recipientRegion === 'US' 
      ? { timeZone: recipientTimezone, month: 'long', day: 'numeric', year: 'numeric' }
      : { timeZone: recipientTimezone, day: '2-digit', month: 'long', year: 'numeric' };
    
    const formatted = dateObj.toLocaleDateString('en-AU', formatOptions);
    const dayOfWeek = dateObj.toLocaleDateString('en-AU', { 
      timeZone: recipientTimezone, 
      weekday: 'long' 
    });
    
    return { 
      formatted, 
      dayOfWeek, 
      timezone: recipientTimezone,
      region: recipientRegion
    };
  };

  /**
   * Check if current time is within business hours
   * @returns {boolean} True if within business hours
   */
  const isBusinessHours = () => {
    const now = new Date();
    const regionConfig = TIMEZONE_CONFIG[userRegion];
    
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const hour = userTime.getHours();
    
    return hour >= regionConfig.businessHours.start && hour < regionConfig.businessHours.end;
  };

  /**
   * Get timezone info for display
   * @returns {Object} Timezone display information
   */
  const getTimezoneInfo = () => {
    const regionConfig = TIMEZONE_CONFIG[userRegion];
    const zoneInfo = regionConfig.zones[userTimezone];
    
    return {
      region: userRegion,
      regionName: regionConfig.name,
      timezone: userTimezone,
      offset: zoneInfo?.offset || '+00',
      cities: zoneInfo?.cities || [],
      businessHours: regionConfig.businessHours
    };
  };

  return {
    // Core functions
    toUserTime,
    toUserDateTime,
    getUserCurrentDate,
    getUserCurrentDateTime,
    toServerTime,
    formatForEmail,
    
    // Recipient timezone functions
    scheduleAtRecipientTime,
    detectRecipientTimezone,
    
    // Utility functions
    isBusinessHours,
    getTimezoneInfo,
    
    // Current settings
    userRegion,
    userTimezone,
    timezoneConfig: TIMEZONE_CONFIG
  };
};

export default useTimezone;