/**
 * Timezone Settings Route
 * Handles user timezone preference updates
 * Supports multi-region operations (AU, US, NO)
 */
const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Validate timezone data
const VALID_REGIONS = ['AU', 'US', 'NO'];
const VALID_TIMEZONES = {
  AU: [
    'Australia/Sydney',
    'Australia/Brisbane', 
    'Australia/Adelaide',
    'Australia/Perth',
    'Australia/Darwin',
    'Australia/Hobart'
  ],
  US: [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu'
  ],
  NO: [
    'Europe/Oslo'
  ]
};

/**
 * PATCH /api/users/timezone-settings
 * Update user's timezone preferences
 */
router.patch('/timezone-settings', auth, async (req, res) => {
  try {
    const { region, timezone } = req.body;
    const userId = req.user.id;

    // Validate region
    if (!region || !VALID_REGIONS.includes(region)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid region. Must be AU, US, or NO.'
      });
    }

    // Validate timezone for the selected region
    if (!timezone || !VALID_TIMEZONES[region].includes(timezone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid timezone for region ${region}.`,
        validTimezones: VALID_TIMEZONES[region]
      });
    }

    // Update user's timezone settings
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        region: region,
        timezone: timezone,
        timezoneUpdatedAt: new Date()
      },
      { 
        new: true, 
        select: 'username email region timezone timezoneUpdatedAt' 
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`[TIMEZONE] User ${updatedUser.username} updated timezone to ${timezone} (${region})`);

    res.json({
      success: true,
      message: 'Timezone settings updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        region: updatedUser.region,
        timezone: updatedUser.timezone,
        timezoneUpdatedAt: updatedUser.timezoneUpdatedAt
      }
    });

  } catch (error) {
    console.error('[TIMEZONE] Error updating timezone settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating timezone settings'
    });
  }
});

/**
 * GET /api/users/timezone-settings
 * Get user's current timezone settings
 */
router.get('/timezone-settings', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('username region timezone timezoneUpdatedAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Provide defaults if no timezone is set
    const response = {
      success: true,
      settings: {
        region: user.region || 'AU', // Default to Australia
        timezone: user.timezone || 'Australia/Sydney', // Default timezone
        timezoneUpdatedAt: user.timezoneUpdatedAt || null,
        hasCustomTimezone: !!(user.region && user.timezone)
      }
    };

    res.json(response);

  } catch (error) {
    console.error('[TIMEZONE] Error fetching timezone settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching timezone settings'
    });
  }
});

/**
 * GET /api/users/timezone-info
 * Get timezone configuration and validation data
 */
router.get('/timezone-info', (req, res) => {
  res.json({
    success: true,
    timezoneConfig: {
      validRegions: VALID_REGIONS,
      validTimezones: VALID_TIMEZONES,
      defaults: {
        AU: 'Australia/Sydney',
        US: 'America/New_York', 
        NO: 'Europe/Oslo'
      }
    }
  });
});

module.exports = router;