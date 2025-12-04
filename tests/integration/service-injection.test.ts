/**
 * Integration tests for service injection middleware
 * Verifies that res.locals.services is available in actual route handlers
 */

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../ProjectSourceCode/src/express/app.js';
import {
  createTestUser,
  generateTestEmail,
  loginAsUser,
  prepareTestDb,
} from '../setup/helpers/index.js';

describe('Service Injection Integration', () => {
  let userCookies: string = '';

  beforeAll(async () => {
    await prepareTestDb();

    // Create a test user
    const email = generateTestEmail('service-injection');
    await createTestUser(email, 'password123', 'member', 'Test User');

    const { cookieHeader } = await loginAsUser(email, 'password123');
    userCookies = cookieHeader;
  });

  it('should have services available in authenticated routes', async () => {
    // Make a request to an authenticated endpoint that uses services
    // Using GET /api/boards as it should use BoardService via res.locals.services
    const response = await request(app).get('/api/boards').set('Cookie', userCookies);

    // If services are not injected, routes would fail with errors
    // A successful response indicates services are available
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should have all required services injected', async () => {
    // Test multiple endpoints that rely on different services
    const endpoints = [
      { path: '/api/boards', service: 'board' },
      { path: '/api/points/history', service: 'points' },
      { path: '/api/leaderboard', service: 'leaderboard' },
    ];

    for (const endpoint of endpoints) {
      const response = await request(app).get(endpoint.path).set('Cookie', userCookies);

      // Each endpoint should work if its corresponding service is injected
      expect(response.status).not.toBe(500);
      expect(response.status).not.toBe(501);
    }
  });
});
