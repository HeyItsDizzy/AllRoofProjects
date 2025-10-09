//mongoose.js
const mongoose = require("mongoose");

const connectMongoose = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Mongoose connected");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectMongoose;
