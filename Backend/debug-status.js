// Debug status fields
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debug() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db();
  const col = db.collection('Projects');
  
  const total = await col.countDocuments();
  const estimateStatusNull = await col.countDocuments({ estimateStatus: null });
  const jobBoardStatusNull = await col.countDocuments({ jobBoardStatus: null });
  const bothNull = await col.countDocuments({ estimateStatus: null, jobBoardStatus: null });
  const canMigrate = await col.countDocuments({ estimateStatus: null, jobBoardStatus: { $ne: null } });
  
  console.log('Total projects:', total);
  console.log('estimateStatus null:', estimateStatusNull, `(${(estimateStatusNull/total*100).toFixed(1)}%)`);
  console.log('jobBoardStatus null:', jobBoardStatusNull, `(${(jobBoardStatusNull/total*100).toFixed(1)}%)`);
  console.log('BOTH null:', bothNull, `(${(bothNull/total*100).toFixed(1)}%)`);
  console.log('Can migrate (estimateStatus null, jobBoardStatus has value):', canMigrate);
  
  // Show sample project with both null
  const sample = await col.findOne({ estimateStatus: null, jobBoardStatus: null });
  console.log('\nSample project with both null:');
  console.log('  projectNumber:', sample.projectNumber);
  console.log('  status:', sample.status);
  console.log('  projectStatus:', sample.projectStatus);
  console.log('  estimateStatus:', sample.estimateStatus);
  console.log('  jobBoardStatus:', sample.jobBoardStatus);
  
  await client.close();
}

debug();
