import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from './config/env.js';
import { AuthUserPayload } from './middleware/auth.middleware.js';
import { ROLES } from './constants/enums.js';

let io: SocketIOServer | null = null;

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, pair) => {
    const [key, ...values] = pair.trim().split('=');
    if (key) acc[key] = decodeURIComponent(values.join('='));
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Initialize Socket.io Server attached to Node HTTP server
 */
export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [ENV.FRONTEND_URL, 'http://localhost:5173'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Socket Authentication Handshake Middleware
  io.use((socket: Socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.token || socket.handshake.auth?.token;

      if (token) {
        try {
          const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUserPayload;
          socket.data.user = decoded;
        } catch {
          // Token invalid: allow socket for public rooms, but mark unauthenticated
          socket.data.user = null;
        }
      } else {
        socket.data.user = null;
      }

      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on('connection', (socket: Socket) => {
    const user: AuthUserPayload | null = socket.data.user;

    // All connected users join the public community feed room
    socket.join('feed');

    // Authenticated users join their dedicated private room for instant alerts
    if (user) {
      socket.join(`user:${user.id}`);

      // Administrators join the admin room for live triage feeds
      if (user.role === ROLES.ADMIN) {
        socket.join('admin');
      }
    }

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
};

/**
 * Returns singleton Socket.io instance safely.
 * Returns null if sockets are not initialized (e.g., during headless unit tests).
 */
export const getIO = (): SocketIOServer | null => {
  return io;
};

/**
 * Non-blocking real-time event dispatchers:
 */
export const RealtimeEvents = {
  /**
   * Broadcast upvote count change to everyone looking at the campus feed
   */
  emitUpvote: (complaintId: string, upvoteCount: number): void => {
    if (!io) return;
    io.to('feed').emit('complaint:upvoted', { complaintId, upvoteCount });
  },

  /**
   * Send private notification to a specific student when ticket status or department changes
   */
  emitNotification: (
    userId: string,
    notification: {
      id: string;
      message: string;
      complaintId: string;
      status?: string;
      createdAt?: string | Date;
    }
  ): void => {
    if (!io) return;
    io.to(`user:${userId}`).emit('notification:new', notification);
  },

  /**
   * Alert administrators in real-time when a student files a new complaint
   */
  emitComplaintCreated: (complaint: any): void => {
    if (!io) return;
    io.to('admin').emit('complaint:created', complaint);
  },

  /**
   * Broadcast ticket status updates to admin and campus feed
   */
  emitComplaintStatusUpdated: (complaint: any): void => {
    if (!io) return;
    io.to('feed').to('admin').emit('complaint:status_updated', complaint);
  },
};
