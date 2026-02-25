// cronJobs/loyaltyTierCron.js
/**
 * LOYALTY TIER SYSTEM - CRON JOB SCHEDULER
 * 
 * Schedules automatic monthly tier evaluation and counter resets
 * 
 * Schedule:
 * 1. Last day of month at 11:50 PM → Run monthly evaluation for all clients
 * 2. First day of month at 12:01 AM → Reset monthly counters
 */

const cron = require('node-cron');
const loyaltyTierService = require('../services/loyaltyTierService');

/**
 * Initialize loyalty tier cron jobs
 */
function initializeLoyaltyTierCronJobs() {
  console.log('🕐 Initializing Loyalty Tier System cron jobs...');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JOB 1: Monthly Evaluation (Last day of month at 11:50 PM)
  // ═══════════════════════════════════════════════════════════════════════════
  // Cron: '50 23 28-31 * *' - Runs at 11:50 PM on days 28-31 of every month
  // Additional check inside to ensure it only runs on the actual last day
  
  const monthlyEvaluationJob = cron.schedule('50 23 28-31 * *', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Only run if tomorrow is the 1st (meaning today is the last day of month)
    if (tomorrow.getDate() === 1) {
      console.log('\n🗓️  CRON: Running monthly loyalty tier evaluation...');
      try {
        await loyaltyTierService.runMonthlyEvaluationForAllClients();
        console.log('✅ CRON: Monthly evaluation completed successfully\n');
      } catch (error) {
        console.error('❌ CRON: Monthly evaluation failed:', error);
      }
    }
  }, {
    scheduled: true,
    timezone: "Australia/Sydney" // Adjust to your timezone
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JOB 2: Reset Monthly Counters (1st day of month at 12:01 AM)
  // ═══════════════════════════════════════════════════════════════════════════
  // Cron: '1 0 1 * *' - Runs at 12:01 AM on the 1st of every month
  
  const resetCountersJob = cron.schedule('1 0 1 * *', async () => {
    console.log('\n🔄 CRON: Resetting monthly counters...');
    try {
      await loyaltyTierService.resetMonthlyCounters();
      console.log('✅ CRON: Monthly counters reset successfully\n');
    } catch (error) {
      console.error('❌ CRON: Counter reset failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Australia/Sydney" // Adjust to your timezone
  });
  
  console.log('✅ Loyalty Tier System cron jobs initialized:');
  console.log('   📊 Monthly Evaluation: Last day of month at 11:50 PM');
  console.log('   🔄 Counter Reset: 1st day of month at 12:01 AM');
  console.log('   🌏 Timezone: Australia/Sydney\n');
  
  return {
    monthlyEvaluationJob,
    resetCountersJob
  };
}

/**
 * Stop all loyalty tier cron jobs
 */
function stopLoyaltyTierCronJobs(jobs) {
  if (jobs?.monthlyEvaluationJob) {
    jobs.monthlyEvaluationJob.stop();
    console.log('🛑 Stopped monthly evaluation cron job');
  }
  if (jobs?.resetCountersJob) {
    jobs.resetCountersJob.stop();
    console.log('🛑 Stopped counter reset cron job');
  }
}

/**
 * Manually trigger monthly evaluation (for testing or emergency runs)
 */
async function manuallyTriggerEvaluation() {
  console.log('\n🔧 MANUAL TRIGGER: Running monthly evaluation...\n');
  try {
    await loyaltyTierService.runMonthlyEvaluationForAllClients();
    console.log('\n✅ MANUAL TRIGGER: Evaluation complete\n');
  } catch (error) {
    console.error('\n❌ MANUAL TRIGGER: Evaluation failed:', error);
    throw error;
  }
}

/**
 * Manually trigger counter reset (for testing or emergency runs)
 */
async function manuallyTriggerReset() {
  console.log('\n🔧 MANUAL TRIGGER: Resetting counters...\n');
  try {
    await loyaltyTierService.resetMonthlyCounters();
    console.log('\n✅ MANUAL TRIGGER: Reset complete\n');
  } catch (error) {
    console.error('\n❌ MANUAL TRIGGER: Reset failed:', error);
    throw error;
  }
}

module.exports = {
  initializeLoyaltyTierCronJobs,
  stopLoyaltyTierCronJobs,
  manuallyTriggerEvaluation,
  manuallyTriggerReset
};
