import mongoose from 'mongoose';
import { initMemorySeed } from './inMemoryStore.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gocommet_rfq_auction';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, useMemory: false };
}

export function isMemoryMode() {
  return cached.useMemory;
}

/**
 * Connects to MongoDB if available; seamlessly activates pre-seeded in-memory store if unreachable.
 */
export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (cached.useMemory) {
    initMemorySeed();
    return null;
  }

  try {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 1500, // Quick 1.5s check for responsive startup
    };

    cached.conn = await mongoose.connect(MONGODB_URI, opts);
    console.log('[Database] Connected successfully to MongoDB at', MONGODB_URI);
    return cached.conn;
  } catch (err) {
    console.warn(`[Database] MongoDB not running locally (${err.message}).`);
    console.log('[Database] Seamlessly activated In-Memory British Auction Procurement Store.');
    cached.useMemory = true;
    initMemorySeed();
    return null;
  }
}

export default connectDB;
