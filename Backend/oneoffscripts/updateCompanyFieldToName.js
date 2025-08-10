// oneoffscripts/updateCompanyFieldToName.js
// Script to update all user company fields from ObjectId to client name

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../config/User');
const Client = require('../config/Client');

async function updateCompanyFields() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database');
    console.log('✅ Connected to MongoDB');

    // Find all users that have a company field set
    const usersWithCompany = await User.find({ company: { $exists: true, $ne: null } });
    console.log(`📋 Found ${usersWithCompany.length} users with company field set`);

    for (const user of usersWithCompany) {
      // Check if company is already a string (client name) or ObjectId
      if (mongoose.isValidObjectId(user.company)) {
        console.log(`🔍 Processing user ${user.name || user.email} - company ID: ${user.company}`);
        
        // Find the client by ID
        const client = await Client.findById(user.company);
        if (client) {
          console.log(`   ✅ Found client: ${client.name}`);
          
          // Update user's company field to client name
          await User.findByIdAndUpdate(user._id, { company: client.name });
          console.log(`   ✅ Updated user company field to: ${client.name}`);
        } else {
          console.log(`   ❌ Client not found for ID: ${user.company}`);
          // Clear the company field if client doesn't exist
          await User.findByIdAndUpdate(user._id, { $unset: { company: "" } });
          console.log(`   🧹 Cleared invalid company reference`);
        }
      } else {
        console.log(`✅ User ${user.name || user.email} already has company name: ${user.company}`);
      }
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
updateCompanyFields();
