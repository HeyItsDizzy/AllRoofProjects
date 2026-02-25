// Backend/utils/timezoneUtils.js
// Timezone-aware date utilities for recipient-timezone DateCompleted tracking
// CommonJS module (mirrors frontend src/utils/timezoneUtils.js)

/**
 * Detect IANA timezone from project location or client data.
 * Priority: client.timezone → project.location state/city → client email domain → default AU/Sydney
 *
 * @param {Object} project - Project with location data
 * @param {Object} client  - Client data (optional)
 * @returns {string} IANA timezone identifier (e.g. 'Australia/Sydney')
 */
function detectTimezone(project = {}, client = {}) {
  try {
    // Priority 1: Client's explicit timezone field
    if (client && client.timezone) {
      return client.timezone;
    }

    // Priority 2: Project location-based detection
    const loc = project.location || {};
    const addressParts = [
      loc.full_address,
      loc.address_line_1,
      loc.city,
      loc.state,
      loc.region,
      project.name  // project name often contains the suburb/city
    ].filter(Boolean).join(' ').toLowerCase();

    if (addressParts) {
      if (addressParts.includes('perth') || addressParts.includes('western australia') || /\bwa\b/.test(addressParts)) {
        return 'Australia/Perth';        // UTC+8
      }
      if (addressParts.includes('adelaide') || addressParts.includes('south australia') || /\bsa\b/.test(addressParts)) {
        return 'Australia/Adelaide';     // UTC+9:30
      }
      if (addressParts.includes('darwin') || addressParts.includes('northern territory') || /\bnt\b/.test(addressParts)) {
        return 'Australia/Darwin';       // UTC+9:30 (no DST)
      }
      if (addressParts.includes('brisbane') || addressParts.includes('queensland') || /\bqld\b/.test(addressParts)) {
        return 'Australia/Brisbane';     // UTC+10 (no DST)
      }
      if (
        addressParts.includes('sydney') || addressParts.includes('melbourne') ||
        addressParts.includes('canberra') || addressParts.includes('hobart') ||
        addressParts.includes('nsw') || /\bvic\b/.test(addressParts) ||
        /\bact\b/.test(addressParts) || /\btas\b/.test(addressParts) ||
        addressParts.includes('new south wales') || addressParts.includes('victoria') ||
        addressParts.includes('tasmania')
      ) {
        return 'Australia/Sydney';       // UTC+10/+11 (with DST)
      }
      if (
        addressParts.includes('norway') || addressParts.includes('oslo') ||
        addressParts.includes('bergen') || addressParts.includes('stavanger') ||
        addressParts.includes('trondheim')
      ) {
        return 'Europe/Oslo';            // UTC+1/+2
      }
      if (addressParts.includes('usa') || addressParts.includes('united states')) {
        if (addressParts.includes('california') || addressParts.includes('los angeles') || addressParts.includes('seattle')) {
          return 'America/Los_Angeles';
        }
        if (addressParts.includes('new york') || addressParts.includes('boston') || addressParts.includes('florida')) {
          return 'America/New_York';
        }
        if (addressParts.includes('chicago') || addressParts.includes('texas') || addressParts.includes('houston')) {
          return 'America/Chicago';
        }
        if (addressParts.includes('denver') || addressParts.includes('arizona') || addressParts.includes('phoenix')) {
          return 'America/Denver';
        }
        return 'America/New_York';
      }
    }

    // Priority 3: Client email domain
    if (client && client.email) {
      const email = client.email.toLowerCase();
      if (email.endsWith('.com.au') || email.endsWith('.au')) {
        return 'Australia/Sydney';
      }
      if (email.endsWith('.no')) {
        return 'Europe/Oslo';
      }
    }

    // Default: Australia/Sydney (primary market)
    return 'Australia/Sydney';
  } catch (error) {
    console.error('[timezoneUtils] Error detecting timezone:', error);
    return 'Australia/Sydney';
  }
}

/**
 * Get the current date string (YYYY-MM-DD) in a given IANA timezone.
 *
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Date in 'YYYY-MM-DD' format
 */
function getDateInTimezone(timezone = 'Australia/Sydney') {
  try {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: timezone }); // 'en-CA' gives YYYY-MM-DD
  } catch (error) {
    console.error('[timezoneUtils] Error getting date in timezone:', error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Get the client's local date (YYYY-MM-DD) based on their project location.
 * Third parameter (timezoneOnly) is kept for backward-compat but ignored — always returns a date string.
 *
 * @param {Object} project       - Project with location data
 * @param {Object} client        - Client data (optional)
 * @param {boolean} timezoneOnly - (ignored, kept for API compatibility)
 * @returns {string} Date in 'YYYY-MM-DD' format in client's timezone
 */
function getClientLocalDate(project = {}, client = null, timezoneOnly = false) {
  const timezone = detectTimezone(project, client || {});
  if (timezoneOnly) {
    // Legacy callers pass true to get the timezone string — return that instead
    return timezone;
  }
  return getDateInTimezone(timezone);
}

module.exports = { detectTimezone, getDateInTimezone, getClientLocalDate };
