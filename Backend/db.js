// db.js
const { MongoClient } = require("mongodb");

let client;
let db;

// Connect to MongoDB with error handling
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  //console.log("▶️ MONGODB_URI:", uri);

  // Check if the MongoDB URI is set
  if (!uri) {
    throw new Error("MONGODB_URI is not set in the environment variables.");
  }

  try {
    if (!client) {
      client = new MongoClient(uri);


      // Attempt connection
      await client.connect();
      console.log("Connected to MongoDB!");
      const dbName = process.env.DB_NAME || "ART";
db = client.db(dbName);

    }

    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw new Error("Failed to connect to MongoDB. Please check the URI and network connectivity.");
  }
};

// Access the users collection with error handling
const userCollection = async () => {
  try {
    const database = await connectDB();
    console.log("Accessing Users collection");
    return database.collection("Users"); // Ensure correct case sensitivity
  } catch (error) {
    console.error("Error accessing Users collection:", error.message);
    throw new Error("Failed to access Users collection.");
  }
};

// Access the projects collection with error handling
const projectsCollection = async () => {
  try {
    const database = await connectDB();
    console.log("Accessing Projects collection");
    const collection = database.collection("Projects");
    console.log("✅ Projects collection accessed successfully!");
    return collection;
  } catch (error) {
    console.error("Error accessing Projects collection:", error.message);
    throw new Error("Failed to access Projects collection.");
  }
};


module.exports = { userCollection, projectsCollection };
