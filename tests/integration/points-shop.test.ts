import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createTestUser, cleanupTestUser, getAuthCookie } from '../setup/helpers/auth.js';
import { generateTestEmail } from '../setup/helpers/db.js';
import { getServiceClient } from '../setup/helpers/db.js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Points Shop', () => {
  let userEmail: string;
  let userId: string;
  let cookieHeader: string;

  beforeAll(async () => {
    userEmail = generateTestEmail('pointshop');
    const user = await createTestUser(userEmail);
    userId = user.id;
    cookieHeader = await getAuthCookie(userEmail);

    // Give user some points for testing
    const client = getServiceClient();
    await client.from('users').update({ total_points: 200 }).eq('id', userId);
  });

  afterAll(async () => {
    await cleanupTestUser(userEmail);
  });

  describe('GET /points-shop', () => {
    it('should render points shop page for authenticated user', async () => {
      const response = await request(BASE_URL).get('/points-shop').set('Cookie', cookieHeader);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('Points Shop');
      expect(response.text).toContain('200 pts'); // User balance
    });

    it('should display shop items', async () => {
      const response = await request(BASE_URL).get('/points-shop').set('Cookie', cookieHeader);

      expect(response.status).toBe(200);
      // Check for seeded shop items
      expect(response.text).toContain('Top Performer Badge');
      expect(response.text).toContain('Coffee Voucher');
    });

    it('should show redeem buttons for affordable items', async () => {
      const response = await request(BASE_URL).get('/points-shop').set('Cookie', cookieHeader);

      expect(response.status).toBe(200);
      // User has 200 points, should see Redeem button for items <= 200
      expect(response.text).toContain('Redeem');
    });

    it('should show insufficient points indicator for expensive items', async () => {
      const response = await request(BASE_URL).get('/points-shop').set('Cookie', cookieHeader);

      expect(response.status).toBe(200);
      // Items over 200 should show "Need X more"
      expect(response.text).toContain('Need');
    });

    it('should redirect unauthenticated users', async () => {
      const response = await request(BASE_URL).get('/points-shop');

      expect(response.status).toBe(302);
    });
  });

  describe('POST /points-shop/redeem', () => {
    it('should successfully redeem an affordable item', async () => {
      // Get a shop item
      const client = getServiceClient();
      const { data: items } = await client
        .from('shop_items')
        .select('id, point_cost')
        .eq('is_active', true)
        .lte('point_cost', 100)
        .limit(1)
        .single();

      expect(items).not.toBeNull();

      const response = await request(BASE_URL)
        .post('/points-shop/redeem')
        .set('Cookie', cookieHeader)
        .send({ item_id: items!.id });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/points-shop');
      expect(response.headers.location).toContain('success');

      // Verify redemption was created
      const { data: redemptions } = await client
        .from('redemptions')
        .select('*')
        .eq('user_id', userId)
        .eq('shop_item_id', items!.id);

      expect(redemptions).toHaveLength(1);
    });

    it('should reject redemption without valid item_id', async () => {
      const response = await request(BASE_URL)
        .post('/points-shop/redeem')
        .set('Cookie', cookieHeader)
        .send({ item_id: 'invalid-uuid' });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('error');
    });

    it('should redirect unauthenticated users', async () => {
      const response = await request(BASE_URL).post('/points-shop/redeem').send({ item_id: '123' });

      expect(response.status).toBe(302);
    });
  });
});
