import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URL!;
if (!uri || !uri.startsWith("mongodb")) {
  throw new Error("❌ Invalid or missing MONGO_URL environment variable");
}

const client = new MongoClient(uri);

// This variable will persist across hot reloads in dev and Cloud Run/Vercel functions
let _db: Db;

export async function initMongo(): Promise<Db> {
  if (!_db) {
    await client.connect();
    _db = client.db("lynk_db");
  }
  return _db;
}
