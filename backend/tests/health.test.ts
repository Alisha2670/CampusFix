import request from 'supertest';
import app from '../src/app.js';

describe('Module 1: Server Scaffold & Health Check Tests', () => {
  it('GET /api/health should return 200 OK with healthy status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('CampusFix backend service is operational');
    expect(response.body.data.status).toBe('healthy');
  });

  it('GET /api/non-existent-route should return 404 with NOT_FOUND code', async () => {
    const response = await request(app).get('/api/non-existent-route');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

