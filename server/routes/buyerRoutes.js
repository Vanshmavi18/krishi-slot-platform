// server/routes/buyerRoutes.js
import { Router } from 'express';
import { getMarketplaceLots, getBuyerOrders, placeBuyerOrder } from '../services/buyerService.js';

const router = Router();

// GET /api/buyer/marketplace
router.get('/marketplace', (req, res) => {
  try {
    const lots = getMarketplaceLots();
    res.json({ success: true, lots });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/buyer/orders
router.get('/orders', (req, res) => {
  try {
    const { buyerId } = req.query;
    const orders = getBuyerOrders(buyerId);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/buyer/orders
router.post('/orders', (req, res) => {
  try {
    const order = placeBuyerOrder(req.body);
    res.json({ success: true, order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
