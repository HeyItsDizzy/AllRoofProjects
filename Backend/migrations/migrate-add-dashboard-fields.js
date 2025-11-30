/**
 * Migration Script: Add Dashboard Fields to Projects Collection
 * 
 * This script adds the new dashboard-specific fields to all existing projects
 * in the Projects collection. Run this once to prepare the database for the
 * new Project Dashboard feature.
 * 
 * Usage: node migrate-add-dashboard-fields.js
 */

const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = "ART";

async function migrateDashboardFields() {
  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const projectsCollection = db.collection("Projects");

    console.log("📊 Fetching all projects...");
    const projects = await projectsCollection.find({}).toArray();
    console.log(`Found ${projects.length} projects`);

    let updated = 0;
    let skipped = 0;

    for (const project of projects) {
      // Check if project already has dashboard field
      if (project.dashboard) {
        console.log(`⏭️  Skipping project ${project._id} - already has dashboard field`);
        skipped++;
        continue;
      }

      // Determine initial progress stage based on existing status
      let progressStage = "design";
      let progressPercentage = 0;

      // Map existing status to progress stage (if project has status field)
      if (project.status) {
        const statusMap = {
          "new": { stage: "design", percentage: 10 },
          "pending": { stage: "design", percentage: 20 },
          "in_progress": { stage: "quoting", percentage: 40 },
          "quoting": { stage: "quoting", percentage: 50 },
          "ordered": { stage: "ordered", percentage: 70 },
          "installation": { stage: "installation", percentage: 85 },
          "completed": { stage: "completed", percentage: 100 },
          "running": { stage: "quoting", percentage: 30 }
        };

        const statusLower = project.status.toLowerCase();
        if (statusMap[statusLower]) {
          progressStage = statusMap[statusLower].stage;
          progressPercentage = statusMap[statusLower].percentage;
        }
      }

      // Create default dashboard object
      const dashboardData = {
        // Progress Tracking
        progressStage: progressStage,
        progressPercentage: progressPercentage,
        lastProgressUpdate: new Date(),

        // Supplier Information (empty initially)
        supplierInfo: {
          selectedSupplier: null,
          materialType: null,
          pricePerSqm: null,
          lastPriceUpdate: null
        },

        // Wind Region (will be detected/set later)
        windRegion: {
          detectedRegion: null,
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
          manualOverride: false,
          notes: null
        },

        // Roofing Color (empty initially)
        selectedColor: null,
        colorCode: null,

        // Quick Stats (initialize to 0)
        stats: {
          totalFiles: 0,
          totalTasks: 0,
          pendingTasks: 0,
          totalQuotes: 0,
          totalOrders: 0,
          openOrders: 0,
          lastFileUpload: null,
          lastActivity: project.createdAt || new Date()
        }
      };

      // Update project
      const result = await projectsCollection.updateOne(
        { _id: project._id },
        {
          $set: {
            dashboard: dashboardData,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`✅ Updated project ${project._id} - ${project.name || "Unnamed"}`);
        updated++;
      } else {
        console.log(`❌ Failed to update project ${project._id}`);
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`   Total projects: ${projects.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped (already migrated): ${skipped}`);
    console.log(`   Failed: ${projects.length - updated - skipped}`);

    // Create indexes for new dashboard fields
    console.log("\n🔍 Creating indexes for dashboard fields...");
    
    await projectsCollection.createIndex({ "dashboard.progressStage": 1 });
    console.log("   ✅ Index created: dashboard.progressStage");
    
    await projectsCollection.createIndex({ "dashboard.stats.lastActivity": -1 });
    console.log("   ✅ Index created: dashboard.stats.lastActivity");
    
    await projectsCollection.createIndex({ "dashboard.windRegion.detectedRegion": 1 });
    console.log("   ✅ Index created: dashboard.windRegion.detectedRegion");

    console.log("\n✨ Migration completed successfully!");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.close();
    console.log("🔌 Database connection closed");
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateDashboardFields()
    .then(() => {
      console.log("\n🎉 All done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration error:", error);
      process.exit(1);
    });
}

module.exports = { migrateDashboardFields };
