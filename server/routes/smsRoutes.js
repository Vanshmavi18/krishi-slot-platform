// server/routes/smsRoutes.js
import { Router } from 'express';
import { getSmsLogs, sendSms } from '../services/smsService.js';

const router = Router();

router.get('/logs', (req, res) => {
  const { phone } = req.query;
  const logs = getSmsLogs(phone);
  res.json({ success: true, logs });
});

router.post('/send-custom', async (req, res) => {
  try {
    const { phone, recipientName, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'Phone and message are required' });
    }

    const record = await sendSms({
      phone,
      recipientName: recipientName || 'Farmer',
      type: 'CUSTOM',
      customText: message
    });

    res.json({ success: true, sms: record });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
