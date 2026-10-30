import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || ENV.MONGODB_URI;

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${(error as Error).message}`);
    // If not in test environment, exit on fatal DB failure
    if (ENV.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed');
  } catch (error) {
    console.error(`[Database Error] Disconnect failed: ${(error as Error).message}`);
  }
};
