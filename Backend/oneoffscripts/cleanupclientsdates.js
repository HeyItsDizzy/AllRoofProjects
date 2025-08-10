// cleanupclientsdates.js
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

async function parseToDateOnly(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    // DD/MM/YYYY
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    }
    // ISO or other
    const d = new Date(raw);
    if (!isNaN(d)) return d;
  }
  return null;
}

async function main() {
  const uri    = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || "<YOUR_DB_NAME>";
  if (!uri) throw new Error("Missing MONGODB_URI in .env");

  console.log("🔗 Connecting to MongoDB…");
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  console.log("✅ Connected");

  const db = client.db(dbName);
  const col = db.collection("clients");
  console.log(`📋 Using ${dbName}.clients collection`);

  const docs = await col.find({}).toArray();
  console.log(`🔄 Found ${docs.length} documents`);

  for (const doc of docs) {
    const updates = {};
    const { posting_date, due_date } = doc;

    const p = await parseToDateOnly(posting_date);
    if (p) updates.posting_date = p.toISOString().slice(0,10);

    const d = await parseToDateOnly(due_date);
    if (d) updates.due_date = d.toISOString().slice(0,10);

    if (Object.keys(updates).length) {
      await col.updateOne(
        { _id: new ObjectId(doc._id) },
        { $set: updates }
      );
      console.log(`✏️  Updated ${doc._id}:`, updates);
    }
  }

  console.log("🎉 All done!");
  await client.close();
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
