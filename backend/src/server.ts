import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { initSocketServer } from './socket.js';

const startServer = async () => {
  try {
    await connectDB();
    const httpServer = http.createServer(app);
    initSocketServer(httpServer);

    httpServer.listen(ENV.PORT, () => {
      console.log(`[Server] CampusFix API running on port ${ENV.PORT} (${ENV.NODE_ENV}) with Socket.io real-time engine`);
    });
  } catch (error) {
    console.error('[Server Error] Startup failure:', error);
    process.exit(1);
  }
};

startServer();
