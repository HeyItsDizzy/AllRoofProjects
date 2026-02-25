// scripts/calculate-last-month-counts.js
/**
 * Calculate and store last month's project counts for all clients
 * This populates the new lastMonthProjectCount and lastMonthEstimateUnits fields
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../config/Client');
const { MongoClient, ObjectId } = require('mongodb');

async function calculateLastMonthCounts() {
  try {
    // Connect using mongoose for Client model
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get MongoDB native client for projects collection
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const dbName = process.env.DB_NAME || 'projectmanager';
    const db = mongoClient.db(dbName);
    const projectsCollection = db.collection('Projects');

    // Calculate previous month
    const now = new Date();
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthStart = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1);
    const previousMonthEnd = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 1);

    console.log(`\n📅 Calculating for previous month: ${previousMonth}`);
    console.log(`   Date range: ${previousMonthStart.toISOString()} to ${previousMonthEnd.toISOString()}`);

    // Get all clients (not just enrolled ones)
    const clients = await Client.find({}).select('_id name linkedProjects monthlyUsageHistory');

    console.log(`\n👥 Found ${clients.length} total clients\n`);

    let updated = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        // Count projects from last month
        // posting_date is stored as a string in format "YYYY-MM-DD"
        // linkedClients is an array of string IDs
        const clientIdString = client._id.toString();
        
        const lastMonthProjects = await projectsCollection.countDocuments({
          linkedClients: clientIdString,
          posting_date: {
            $gte: "2025-12-01",
            $lt: "2026-01-01"
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

        console.log(`✓ ${client.name.padEnd(40)} | Projects: ${String(lastMonthProjects).padStart(3)} | Units: ${String(lastMonthUnits).padStart(5)}`);
        updated++;

      } catch (error) {
        console.error(`✗ Error processing ${client.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ Calculation complete!`);
    console.log(`   Updated: ${updated} clients`);
    console.log(`   Errors: ${errors}`);
    console.log(`${'═'.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
calculateLastMonthCounts();
