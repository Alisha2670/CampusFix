import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => {
      console.log(`[Server] CampusFix API running on port ${ENV.PORT} (${ENV.NODE_ENV})`);
    });
  } catch (error) {
    console.error('[Server Error] Startup failure:', error);
    process.exit(1);
  }
};

startServer();
