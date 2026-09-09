// server/routes/authRoutes.js
import { Router } from 'express';
import { requestOtp, verifyOtp, loginStaff, loginBuyer, quickSwitch } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await requestOtp(phone);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const result = await verifyOtp(phone, otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login-staff', async (req, res) => {
  try {
    const { staffId, password } = req.body;
    const result = await loginStaff(staffId, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login-buyer', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const result = await loginBuyer(identifier, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/quick-switch', (req, res) => {
  try {
    const { role, id } = req.body;
    const result = quickSwitch(role, id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

export default router;
