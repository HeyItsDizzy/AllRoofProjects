// Demo script to add example tags to existing clients
const mongoose = require('./config/mongoose');
const Client = require('./config/Client');

async function addDemoTags() {
  try {
    console.log('🏷️  Adding demo tags to existing clients...');
    
    // Example tag mapping for common client patterns
    const tagExamples = [
      { pattern: /henry.*james/i, tags: ['hjs', 'henry', 'james'] },
      { pattern: /m\.?a\.?g/i, tags: ['mag', 'roofing'] },
      { pattern: /all.*roof/i, tags: ['art', 'allroof'] },
      { pattern: /construction/i, tags: ['const', 'builder'] },
      { pattern: /building/i, tags: ['build', 'builder'] },
      { pattern: /roofing/i, tags: ['roof', 'roofing'] },
      { pattern: /solutions/i, tags: ['sol', 'solutions'] },
      { pattern: /services/i, tags: ['svc', 'services'] },
      { pattern: /group/i, tags: ['grp', 'group'] },
      { pattern: /company/i, tags: ['co', 'company'] },
      { pattern: /contractors?/i, tags: ['contractor', 'cont'] },
      { pattern: /developments?/i, tags: ['dev', 'development'] },
    ];

    // Get all clients
    const clients = await Client.find({});
    console.log(`📊 Found ${clients.length} clients to process`);

    for (const client of clients) {
      const existingTags = client.tags || [];
      let newTags = [...existingTags];
      
      // Add tags based on client name patterns
      for (const example of tagExamples) {
        if (example.pattern.test(client.name)) {
          for (const tag of example.tags) {
            if (!newTags.includes(tag.toLowerCase())) {
              newTags.push(tag.toLowerCase());
            }
          }
        }
      }

      // Add first initials as a tag
      const words = client.name.split(/\s+/);
      if (words.length > 1) {
        const initials = words.map(word => word.charAt(0).toLowerCase()).join('');
        if (initials.length <= 4 && !newTags.includes(initials)) {
          newTags.push(initials);
        }
      }

      // Only update if we have new tags
      if (newTags.length > existingTags.length) {
        await Client.findByIdAndUpdate(client._id, { tags: newTags });
        console.log(`✅ Updated ${client.name}: ${newTags.join(', ')}`);
      } else {
        console.log(`⏭️  Skipped ${client.name}: no new tags to add`);
      }
    }

    console.log('🎉 Demo tags added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding demo tags:', error);
    process.exit(1);
  }
}

// Connect to MongoDB and run the script
mongoose().then(() => {
  addDemoTags();
}).catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});