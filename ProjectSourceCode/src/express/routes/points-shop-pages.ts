import express from 'express';
import { InsufficientPointsError, ResourceNotFoundError } from '../../lib/errors/app.errors.js';
import { redeemItemSchema } from '../../lib/schemas/shop.js';
import { PointsService } from '../../lib/services/points.service.js';
import { ShopService } from '../../lib/services/shop.service.js';
import { getSupabaseClient } from '../../lib/supabase.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = express.Router();

router.get('/points-shop', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error('User not authenticated');

    const client = getSupabaseClient();
    const shopService = new ShopService(client);
    const pointsService = new PointsService(client, req.user.id);

    const [shopItems, totalPoints, redemptions] = await Promise.all([
      shopService.getAvailableItems(),
      pointsService.getUserPoints(req.user.id),
      shopService.getUserRedemptions(req.user.id),
    ]);

    // Enhance items with affordability info
    const itemsWithAffordability = shopItems.map((item) => ({
      ...item,
      canAfford: totalPoints >= item.point_cost,
      pointsNeeded: Math.max(0, item.point_cost - totalPoints),
    }));

    res.render('pages/points-shop/index', {
      title: 'Points Shop',
      layout: 'dashboard',
      user: req.user,
      shopItems: itemsWithAffordability,
      totalPoints,
      redemptions,
      successMessage: req.query.success,
      errorMessage: req.query.error,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/points-shop/redeem', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new Error('User not authenticated');

    const parsed = redeemItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.redirect(`/points-shop?error=${encodeURIComponent('Invalid item selected')}`);
    }

    const client = getSupabaseClient();
    const shopService = new ShopService(client);

    await shopService.redeemItem(req.user.id, parsed.data.item_id);

    return res.redirect(`/points-shop?success=${encodeURIComponent('Item redeemed successfully')}`);
  } catch (error) {
    if (error instanceof InsufficientPointsError) {
      return res.redirect(`/points-shop?error=${encodeURIComponent('Not enough points')}`);
    }
    if (error instanceof ResourceNotFoundError) {
      return res.redirect(`/points-shop?error=${encodeURIComponent('Item not found')}`);
    }
    next(error);
  }
});

export default router;
