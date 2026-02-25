// jobs/monthlyLoyaltyUpdate.js
/**
 * MONTHLY CRON JOB - Run on 1st of each month at 1:00 AM
 * 
 * This job:
 * 1. Recalculates last month's project counts for all clients
 * 2. Updates loyalty tier cache
 * 3. Runs automatically - no manual intervention needed
 * 
 * Schedule: 0 1 1 * * (1:00 AM on the 1st of every month)
 */

const mongoose = require('mongoose');
const Client = require('../config/Client');
const { MongoClient } = require('mongodb');

async function monthlyLoyaltyUpdate() {
  let mongoClient;
  
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🗓️  MONTHLY LOYALTY TIER UPDATE - Starting...');
    console.log('   Timestamp:', new Date().toISOString());
    console.log('═'.repeat(80) + '\n');

    // Connect using mongoose for Client model
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB (Mongoose)');
    
    // Get MongoDB native client for projects collection
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const dbName = process.env.DB_NAME || 'projectmanager';
    const db = mongoClient.db(dbName);
    const projectsCollection = db.collection('Projects');
    console.log('✅ Connected to Projects collection');

    // Calculate previous month
    const now = new Date();
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    console.log(`\n📅 Calculating for previous month: ${previousMonth}\n`);

    // Get all clients
    const clients = await Client.find({}).select('_id name monthlyUsageHistory');
    console.log(`👥 Processing ${clients.length} clients...\n`);

    let updated = 0;
    let errors = 0;
    let withProjects = 0;

    for (const client of clients) {
      try {
        // Count projects from last month
        const clientIdString = client._id.toString();
        const startDate = `${previousMonth}-01`;
        const nextMonth = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 1);
        const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
        
        const lastMonthProjects = await projectsCollection.countDocuments({
          linkedClients: clientIdString,
          posting_date: {
            $gte: startDate,
            $lt: endDate
          }
        });

        // Get estimate units from history
        const lastMonthHistory = client.monthlyUsageHistory?.find(h => h.month === previousMonth);
        const lastMonthUnits = lastMonthHistory?.estimateUnits || 0;

        // Update client
        await Client.findByIdAndUpdate(client._id, {
          lastMonthProjectCount: lastMonthProjects,
          lastMonthEstimateUnits: lastMonthUnits,
          lastMonthCalculatedDate: new Date()
        });

        if (lastMonthProjects > 0) {
          withProjects++;
          console.log(`✓ ${client.name.padEnd(40)} | Projects: ${String(lastMonthProjects).padStart(3)} | Units: ${String(lastMonthUnits).padStart(5)}`);
        }
        
        updated++;

      } catch (error) {
        console.error(`✗ Error processing ${client.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log('✅ Monthly update complete!');
    console.log(`   Total clients: ${clients.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   With projects: ${withProjects}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Month: ${previousMonth}`);
    console.log('═'.repeat(80) + '\n');

    return { success: true, updated, errors, withProjects };

  } catch (error) {
    console.error('❌ Fatal error in monthly update:', error);
    return { success: false, error: error.message };
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    console.log('🔌 Database connections closed\n');
  }
}

// If running directly (not as a cron job)
if (require.main === module) {
  monthlyLoyaltyUpdate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = monthlyLoyaltyUpdate;
