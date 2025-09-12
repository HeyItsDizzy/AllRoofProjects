// oneoffscripts/cleanupprojectsdates.js
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

function parseToDateOnly(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    // DD/MM/YYYY
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    }
    // Try generic ISO parse
    const d = new Date(raw);
    if (!isNaN(d)) return d;
  }
  return null;
}

async function main() {
  const uri    = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME
    || uri.split("/").pop().split("?")[0];
  console.log("🔗 Connecting to MongoDB…");
  const client = new MongoClient(uri);
  await client.connect();
  console.log(`✅ Connected to ${dbName}`);

  const col = client.db(dbName).collection("Projects");
  console.log(`📋 Normalizing dates in ${dbName}.Projects…`);

  const docs = await col.find().toArray();
  console.log(`🔄 Found ${docs.length} documents`);

  for (const doc of docs) {
    const updates = {};
    ["posting_date","due_date"].forEach(field => {
      const dt = parseToDateOnly(doc[field]);
      if (dt) updates[field] = dt.toISOString().slice(0,10);
    });
    if (Object.keys(updates).length) {
      await col.updateOne(
        { _id: new ObjectId(doc._id) },
        { $set: updates }
      );
      console.log(`✏️  ${doc._id}:`, updates);
    }
  }

  console.log("🎉 Done normalizing project dates!");
  await client.close();
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
