import { MongoClient } from "mongodb";
import "dotenv/config";

const rawUri = process.env.MONGO_URL!;
console.log("🧪 Raw URI:", JSON.stringify(rawUri));

const uri = rawUri.trim();
console.log("🧪 Trimmed URI:", JSON.stringify(uri));

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("✅ Connected to Mongo!");
    const db = client.db();
    const collections = await db.collections();
    console.log("📦 Collections:", collections.map((c) => c.collectionName));
  } catch (err) {
    console.error("❌ Mongo connection failed:", err);
  } finally {
    await client.close();
  }
}

main();
