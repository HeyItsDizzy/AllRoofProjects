const { MongoClient } = require("mongodb");

let client;
let db;

const connectDB = async () => {
  try {
    if (!client) {
      client = new MongoClient(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      await client.connect();
      console.log("Connected to MongoDB!");
      db = client.db(); // Connect to the default database specified in the URI
    }
    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw error;
  }
};

const userCollection = async () => {
  const database = await connectDB();
  return database.collection("users"); // Adjust collection name as needed
};

const projectsCollection = async () => {
  const database = await connectDB();
  return database.collection("projects"); // Adjust collection name as needed
};

module.exports = { userCollection, projectsCollection };
