/**
 * Create a test project for invoice testing
 * Run with: node test-create-project.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function createTestProject() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const projectsCol = db.collection('projects');
    
    // Get a real client ID from your database
    const clientsCol = db.collection('clients');
    const existingClient = await clientsCol.findOne({});
    
    if (!existingClient) {
      console.log('❌ No clients found in database. Create a client first.');
      return;
    }
    
    console.log('✅ Using client:', existingClient.name, '(', existingClient._id, ')');
    
    // Create a test project that meets invoice criteria
    const testProject = {
      projectNumber: 'TEST-' + Date.now(),
      name: 'Test Project for Invoice Creation',
      linkedClients: [existingClient._id],
      estimateSent: [new Date().toISOString()], // Has estimate sent ✅
      estimateStatus: "Sent", // Status is "Sent" ✅
      // No ARTInvNumber field ✅ (ready for invoicing)
      PlanType: "Standard",
      Qty: 1,
      pricingSnapshot: {
        priceEach: 1500.00,
        totalPrice: 1500.00,
        createdAt: new Date().toISOString()
      },
      posting_date: new Date(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await projectsCol.insertOne(testProject);
    console.log('✅ Created test project:', result.insertedId);
    console.log('📋 Project details:', {
      projectNumber: testProject.projectNumber,
      estimateSent: testProject.estimateSent,
      estimateStatus: testProject.estimateStatus,
      hasARTInvNumber: 'ARTInvNumber' in testProject,
      pricingSnapshot: testProject.pricingSnapshot
    });
    
  } catch (error) {
    console.error('❌ Error creating test project:', error);
  } finally {
    await client.close();
  }
}

createTestProject();