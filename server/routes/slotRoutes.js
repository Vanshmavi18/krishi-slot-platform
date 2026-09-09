// server/routes/slotRoutes.js
import { Router } from 'express';
import { getCentres, getCrops, getAvailableSlots, bookSlot, getMySlots, cancelSlot } from '../services/slotService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public meta routes
router.get('/centres', (req, res) => {
  res.json({ success: true, centres: getCentres() });
});

router.get('/crops', (req, res) => {
  res.json({ success: true, crops: getCrops() });
});

router.get('/availability', (req, res) => {
  const { centreId = 'CTR-UP-01', date = '2026-09-12' } = req.query;
  const slots = getAvailableSlots(centreId, date);
  res.json({ success: true, slots });
});

// Authenticated booking routes
router.post('/book', async (req, res) => {
  try {
    const {
      farmerId = 'FRM-UP-26032',
      farmerName = 'Ramesh Kumar',
      farmerPhone = '9876543210',
      centreId,
      cropId,
      quantity,
      vehicle,
      date,
      timeSlot
    } = req.body;

    const booking = await bookSlot({
      farmerId,
      farmerName,
      farmerPhone,
      centreId,
      cropId,
      quantity,
      vehicle,
      date,
      timeSlot
    });

    res.json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/my-bookings', (req, res) => {
  const farmerId = req.query.farmerId || 'FRM-UP-26032';
  const bookings = getMySlots(farmerId);
  res.json({ success: true, bookings });
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const { farmerId = 'FRM-UP-26032' } = req.body;
    const result = await cancelSlot(req.params.id, farmerId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
