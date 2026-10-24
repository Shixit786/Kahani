import mongoose from 'mongoose';
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.DEMO_MODE === 'true') {
      console.warn('[DB] MONGODB_URI not set — running in DEMO_MODE (no persistence).');
      return;
    }
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[DB] Connected to MongoDB ✓');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    throw err;
  }
}
