import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;

if (!uri) {
  throw new Error('MONGO_URL environment variable is not set');
}

// By not specifying a database here, it will use the one from the URI
const client = new MongoClient(uri);

export async function connectToMongo() {
  try {
    await client.connect();
    // This will now return a client instance connected to the DB from your URI
    return client.db();
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function closeMongoConnection() {
  await client.close();
}