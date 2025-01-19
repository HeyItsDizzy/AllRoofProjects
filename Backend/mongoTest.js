const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGODB_URI;

async function testMongoConnection() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const db = client.db("ART"); // Ensure this matches your database name
    const collection = db.collection("Users"); // Ensure this matches your collection name

    console.log("Checking Users collection...");
    const users = await collection.find({}).toArray(); // Fetch all documents
    if (users.length === 0) {
      console.log("No documents found in the Users collection");
    } else {
      console.log("Documents in Users collection:", users);
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await client.close();
  }
}

testMongoConnection();
