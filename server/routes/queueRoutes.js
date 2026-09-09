// server/routes/queueRoutes.js
import { Router } from 'express';
import { getQueueStatus, advanceQueue, broadcastDelay, queueEvents } from '../services/queueService.js';
import { smsEvents } from '../services/smsService.js';
import { notificationEvents } from '../services/notificationService.js';

const router = Router();

// Get queue status
router.get('/status', (req, res) => {
  const { centreId = 'CTR-UP-01', token = 'A-047' } = req.query;
  const status = getQueueStatus(centreId, token);
  res.json({ success: true, queue: status });
});

// Advance queue (Mandi Officer)
router.post('/advance', async (req, res) => {
  try {
    const { centreId = 'CTR-UP-01', counterId = 2, customToken } = req.body;
    const result = await advanceQueue({ centreId, counterId, customToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Broadcast delay alert to booked farmers
router.post('/broadcast-delay', async (req, res) => {
  try {
    const { centreId = 'CTR-UP-01', reason, delayMins } = req.body;
    const result = await broadcastDelay({ centreId, reason, delayMins });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// SSE Live Stream for Real-time queue, SMS, and in-app Notification pushes!
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() })}\n\n`);

  const onQueueUpdate = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'QUEUE_UPDATE', payload: data })}\n\n`);
  };

  const onSmsSent = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'SMS_NOTIFICATION', payload: data })}\n\n`);
  };

  const onNotificationCreated = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'NOTIFICATION_NEW', payload: data })}\n\n`);
  };

  queueEvents.on('queue_updated', onQueueUpdate);
  smsEvents.on('sms_sent', onSmsSent);
  notificationEvents.on('notification_created', onNotificationCreated);

  // Heartbeat ping every 25 seconds
  const interval = setInterval(() => {
    res.write(':ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(interval);
    queueEvents.off('queue_updated', onQueueUpdate);
    smsEvents.off('sms_sent', onSmsSent);
    notificationEvents.off('notification_created', onNotificationCreated);
  });
});

export default router;
