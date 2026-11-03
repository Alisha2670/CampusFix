import { createServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { initSocketServer, RealtimeEvents } from '../src/socket.js';
import { ENV } from '../src/config/env.js';
import { ROLES } from '../src/constants/enums.js';

describe('Real-Time WebSockets Engine Tests (Day 8 Phase 1)', () => {
  let httpServer: HttpServer;
  let serverPort: number;
  let student1Socket: ClientSocketType;
  let student2Socket: ClientSocketType;

  const student1Id = '654321000000000000000001';
  const student2Id = '654321000000000000000002';

  const student1Token = jwt.sign(
    { id: student1Id, email: 'alice.ws@campus.edu', role: ROLES.STUDENT },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const student2Token = jwt.sign(
    { id: student2Id, email: 'bob.ws@campus.edu', role: ROLES.STUDENT },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeAll((done) => {
    httpServer = createServer(app);
    initSocketServer(httpServer);
    httpServer.listen(0, () => {
      serverPort = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    if (student1Socket?.connected) student1Socket.disconnect();
    if (student2Socket?.connected) student2Socket.disconnect();
    httpServer.close(done);
  });

  it('should authenticate client and connect via handshake auth token', (done) => {
    student1Socket = ClientSocket(`http://localhost:${serverPort}`, {
      auth: { token: student1Token },
      transports: ['websocket'],
    });

    student1Socket.on('connect', () => {
      expect(student1Socket.connected).toBe(true);
      done();
    });
  });

  it('should broadcast complaint:upvoted to all clients in the feed room', (done) => {
    // Listen for upvote broadcast
    student1Socket.on('complaint:upvoted', (payload) => {
      expect(payload).toBeDefined();
      expect(payload.complaintId).toBe('FC-5555');
      expect(payload.upvoteCount).toBe(7);
      student1Socket.off('complaint:upvoted');
      done();
    });

    // Emit event on server
    RealtimeEvents.emitUpvote('FC-5555', 7);
  });

  it('should deliver private notification:new exclusively to the targeted user room', (done) => {
    // Connect student 2 as well
    student2Socket = ClientSocket(`http://localhost:${serverPort}`, {
      auth: { token: student2Token },
      transports: ['websocket'],
    });

    student2Socket.on('connect', () => {
      let student2Received = false;

      student2Socket.on('notification:new', () => {
        student2Received = true;
      });

      student1Socket.on('notification:new', (payload) => {
        expect(payload).toBeDefined();
        expect(payload.message).toContain('Technician dispatched');
        expect(payload.complaintId).toBe('FC-1010');

        // Verify Student 2 did NOT receive Student 1's private alert
        setTimeout(() => {
          expect(student2Received).toBe(false);
          student1Socket.off('notification:new');
          student2Socket.off('notification:new');
          done();
        }, 100);
      });

      // Emit targeted notification to student 1 only
      RealtimeEvents.emitNotification(student1Id, {
        id: 'notif_123',
        message: 'Technician dispatched to Room 204',
        complaintId: 'FC-1010',
        status: 'In Progress',
      });
    });
  });

  it('should broadcast complaint:status_updated to feed listeners', (done) => {
    student1Socket.on('complaint:status_updated', (payload) => {
      expect(payload).toBeDefined();
      expect(payload.complaintId).toBe('FC-2020');
      expect(payload.status).toBe('Resolved');
      student1Socket.off('complaint:status_updated');
      done();
    });

    RealtimeEvents.emitComplaintStatusUpdated({
      complaintId: 'FC-2020',
      status: 'Resolved',
    });
  });
});

