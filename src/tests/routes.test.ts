import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../app';

describe('Express API Routes & Envelopes', () => {
  it('GET /health returns 200 OK with expected health envelope', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('legacy');
    expect(res.body).toHaveProperty('version');
  }, 15000);

  it('GET /api/v1/meters?page=-5 returns 400 Bad Request with Zod error envelope', async () => {
    const res = await request(app).get('/api/v1/meters?page=-5');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_PARAMETERS');
  });

  it('GET /api/v1/meters/invalid-meter-id executes and returns structured response or error', async () => {
    const res = await request(app).get('/api/v1/meters/J100000');
    expect([200, 404, 502, 504]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('meterId', 'J100000');
    } else {
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('error');
    }
  }, 15000);

  it('GET /unknown-route returns 404 Not Found error envelope', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
