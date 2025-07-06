
// src/lib/mongodb.ts
import { MongoClient, Db, WithId, Document, ObjectId, ServerApiVersion } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (process.env.DATA_SOURCE === 'mongodb' && !MONGODB_URI) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  } else {
    console.warn('[MongoDB] MONGODB_URI environment variable is not set. Using default "mongodb://127.0.0.1:27017".');
  }
}

if (process.env.DATA_SOURCE === 'mongodb' && !MONGODB_DB_NAME) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env');
    } else {
        console.warn('[MongoDB] MONGODB_DB_NAME environment variable is not set. Using default "tablemaster".');
    }
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db("admin").command({ ping: 1 });
      console.log('[MongoDB] Using cached database connection.');
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      console.warn('[MongoDB] Cached client connection lost. Reconnecting...', (e as Error).message);
      cachedClient = null;
      cachedDb = null;
    }
  }
  
  const uri = MONGODB_URI || "mongodb://127.0.0.1:27017";
  const dbName = MONGODB_DB_NAME || "tablemaster";

  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 5000, // Fail fast after 5 seconds if server is not found
    socketTimeoutMS: 5000, // Timeout for individual socket operations
  });

  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db(dbName).command({ ping: 1 });
    console.log("[MongoDB] Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db(dbName);
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    console.error('[MongoDB] Failed to connect to MongoDB:', error);
    // Ensures that the client will close when you finish/error
    await client.close();
    throw new Error(`Could not connect to the database: ${(error as Error).message}`);
  }
}

export async function getDbStatus(): Promise<{ isConnected: boolean; message: string }> {
    if (process.env.DATA_SOURCE !== 'mongodb') {
        return { isConnected: false, message: 'Data source is not set to MongoDB in .env' };
    }
    try {
        const { client } = await connectToDatabase();
        // The ping is implicitly done in connectToDatabase now, but we can do it again for an explicit status check
        await client.db("admin").command({ ping: 1 });
        return { isConnected: true, message: 'Successfully connected to MongoDB.' };
    } catch (e) {
        // Clear cache if ping fails to force reconnect on next attempt
        cachedClient = null;
        cachedDb = null;
        return { isConnected: false, message: `Connection failed: ${(e as Error).message}` };
    }
}

// Utility to convert MongoDB's _id to a string 'id' field
export function fromMongo<T extends Document>(doc: WithId<T>): T & { id: string } {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toHexString() } as unknown as T & { id: string };
}

// Utility to convert a string 'id' to an ObjectId for querying
export function toObjectId(id: string): ObjectId {
    try {
        return new ObjectId(id);
    } catch(e) {
        // Handle cases where an invalid ID string (e.g., from a CSV upload) might be passed.
        // This creates a new, valid ObjectId. In a real app, you might want to throw an error instead.
        console.warn(`[toObjectId] Invalid ID format for "${id}". Generating a new ObjectId. This may lead to orphaned data if this ID was meant to be an update.`);
        return new ObjectId();
    }
}
