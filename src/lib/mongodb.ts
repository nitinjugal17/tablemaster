
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
let connectionStatus: { isConnected: boolean; message: string } | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  if (cachedClient && cachedDb) {
    try {
      // Ping the DB to ensure the cached connection is still active.
      await cachedClient.db("admin").command({ ping: 1 });
      console.log('[MongoDB] Using cached database connection.');
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      console.warn('[MongoDB] Cached client connection lost. Reconnecting...', (e as Error).message);
      await cachedClient.close().catch(err => console.error('[MongoDB] Error closing stale client:', err));
      cachedClient = null;
      cachedDb = null;
      connectionStatus = null; // Invalidate status on connection loss
    }
  }
  
  const uri = MONGODB_URI || "mongodb://127.0.0.1:27017";
  const dbName = MONGODB_DB_NAME || "tablemaster";

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    tls: false,
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 5000, 
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Ping the database to verify the new connection.
    await db.command({ ping: 1 });
    console.log("[MongoDB] Pinged your deployment. You successfully connected to MongoDB!");

    cachedClient = client;
    cachedDb = db;
    connectionStatus = { isConnected: true, message: 'Successfully connected to MongoDB.' };
    
    return { client, db };
  } catch (error) {
    const errorMessage = `Could not connect to the database: ${(error as Error).message}`;
    console.error(`[connectToDatabase] ${errorMessage}`);
    // Ensure client is closed on failure
    await client.close().catch(closeErr => console.error('[MongoDB] Error closing client after connection failure:', closeErr));
    // Set status to reflect failure
    connectionStatus = { isConnected: false, message: errorMessage };
    // Return null instead of throwing an error to prevent server crash
    return null;
  }
}

export async function getDbStatus(): Promise<{ isConnected: boolean; message: string }> {
    // If status has been checked before, return it to avoid reconnecting just for status.
    if (connectionStatus) {
        return connectionStatus;
    }

    if (process.env.DATA_SOURCE !== 'mongodb') {
        connectionStatus = { isConnected: false, message: 'Data source is not set to MongoDB in .env' };
        return connectionStatus;
    }
    
    // This block runs only on the very first status check per server instance/request lifecycle.
    const connectionResult = await connectToDatabase();
    
    // `connectToDatabase` now sets `connectionStatus` internally and returns null on failure.
    // So, we just need to return the status it set.
    return connectionStatus || { isConnected: false, message: 'Connection status check resulted in an undefined state.' };
}

export async function checkSystemReady(): Promise<{ isReady: boolean, message: string }> {
    const status = await getDbStatus();
    if (process.env.DATA_SOURCE === 'mongodb' && !status.isConnected) {
        return { isReady: false, message: status.message };
    }
    return { isReady: true, message: 'System is ready.' };
}


// Utility to get a collection
export async function getCollection<T extends Document>(name: string) {
    const connection = await connectToDatabase();
    if (!connection) {
        // This is a critical failure. If we can't connect, we can't get a collection.
        // Throwing an error here is appropriate as the calling function should handle it.
        throw new Error(`Failed to connect to database. Cannot get collection "${name}".`);
    }
    return connection.db.collection<T>(name);
}

// Utility to convert MongoDB's _id to a string 'id' field
export function fromMongo<T extends Document>(doc: WithId<T>): T & { id: string } {
    const { _id, ...rest } = doc;
    return { ...rest, id: _id.toHexString() } as unknown as T & { id: string };
}

// Utility to convert a string 'id' to an ObjectId for querying
export function toObjectId(id: string): ObjectId {
    try {
        if (ObjectId.isValid(id)) {
          return new ObjectId(id);
        }
        // If it's not a valid ObjectId, assume it's a new item from a CSV import
        // and create a new ObjectId. This prevents crashes on mixed data.
        console.warn(`[toObjectId] Provided ID "${id}" is not a valid ObjectId. A new ObjectId has been generated. This is normal for new items from CSV, but could indicate an issue if this ID was expected to exist.`);
        return new ObjectId();
    } catch(e) {
        console.error(`[toObjectId] Critical error converting ID "${id}". Returning a new ObjectId as a fallback. Error: ${(e as Error).message}`);
        return new ObjectId();
    }
}
