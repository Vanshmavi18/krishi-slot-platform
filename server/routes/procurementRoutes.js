// server/routes/procurementRoutes.js
import { Router } from 'express';
import { getProcurements, getProcurementById, createProcurement, approvePayment, getStats } from '../services/procurementService.js';

const router = Router();

router.get('/', (req, res) => {
  const { farmerId } = req.query;
  const list = getProcurements(farmerId);
  res.json({ success: true, procurements: list });
});

router.get('/stats', (req, res) => {
  const { farmerId } = req.query;
  const stats = getStats(farmerId || 'FRM-UP-26032');
  res.json({ success: true, stats });
});

router.get('/:id', (req, res) => {
  try {
    const item = getProcurementById(req.params.id);
    res.json({ success: true, procurement: item });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

router.post('/create', async (req, res) => {
  try {
    const item = await createProcurement(req.body);
    res.json({ success: true, procurement: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/approve-payment', async (req, res) => {
  try {
    const item = await approvePayment(req.params.id);
    res.json({ success: true, procurement: item });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
