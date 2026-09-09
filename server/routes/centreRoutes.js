// server/routes/centreRoutes.js
import { Router } from 'express';
import { db } from '../data/db.js';

const router = Router();

router.get('/stats', (req, res) => {
  const centreId = req.query.centreId || 'CTR-UP-01';
  const centre = db.find('centres', c => c.id === centreId) || db.get('centres')[0];
  const bookings = db.filter('bookings', b => b.centreId === centreId);
  const activeQueue = db.getSingle('activeQueue');

  res.json({
    success: true,
    centre,
    metrics: {
      todayBookings: centre.todayBooked || 64,
      dailyCapacity: centre.dailyCapacity || 90,
      waitingNow: bookings.filter(b => b.queueStatus === 'WAITING').length || 19,
      completedToday: centre.todayCompleted || 42,
      expectedNextTwoHours: 22,
      nowServing: activeQueue.nowServingToken || 'A-038'
    }
  });
});

router.get('/tokens', (req, res) => {
  const centreId = req.query.centreId || 'CTR-UP-01';
  const bookings = db.filter('bookings', b => b.centreId === centreId);
  res.json({ success: true, tokens: bookings });
});

export default router;
