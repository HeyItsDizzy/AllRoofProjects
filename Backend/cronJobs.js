// cronJobs.js
/**
 * CRON JOB SCHEDULER
 * 
 * Sets up automated tasks that run on a schedule:
 * - Monthly loyalty tier updates (1st of each month at 1:00 AM)
 * 
 * Add this to your server.js to enable automatic scheduling
 */

const cron = require('node-cron');
const monthlyLoyaltyUpdate = require('./jobs/monthlyLoyaltyUpdate');

function setupCronJobs() {
  console.log('⏰ Setting up cron jobs...\n');

  // Monthly loyalty tier update - Run on 1st of each month at 1:00 AM
  // Cron pattern: minute hour day month weekday
  // 0 1 1 * * = At 1:00 AM on the 1st of every month
  cron.schedule('0 1 1 * *', async () => {
    console.log('\n🔔 CRON: Monthly loyalty update triggered');
    try {
      await monthlyLoyaltyUpdate();
      console.log('✅ CRON: Monthly loyalty update completed successfully\n');
    } catch (error) {
      console.error('❌ CRON: Monthly loyalty update failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Australia/Sydney" // Adjust to your timezone
  });

  console.log('✅ Cron job scheduled: Monthly loyalty update (1st of each month at 1:00 AM)\n');

  // Optional: Daily cache refresh at 2:00 AM
  // Uncomment if you want daily updates instead of relying on API caching
  /*
  cron.schedule('0 2 * * *', async () => {
    console.log('\n🔔 CRON: Daily loyalty cache refresh triggered');
    try {
      await monthlyLoyaltyUpdate();
      console.log('✅ CRON: Daily cache refresh completed\n');
    } catch (error) {
      console.error('❌ CRON: Daily cache refresh failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Australia/Sydney"
  });
  */
}

module.exports = setupCronJobs;
