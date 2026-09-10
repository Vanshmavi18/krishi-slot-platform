// server/routes/authRoutes.js
import { Router } from 'express';
import { 
  requestEmailOtp,
  verifyEmailOtp,
  loginWithEmailPassword,
  checkEmailAuth,
  saveEmailPassword,
  getEmailGatewayStatus,
  requestOtp, 
  verifyOtp, 
  loginStaff, 
  loginBuyer, 
  quickSwitch,
  loginWithMobilePassword,
  checkPhoneAuth,
  saveUserPassword,
  updateUserProfile
} from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// --- EMAIL AUTHENTICATION ENDPOINTS (PRIMARY) ---

// Check Real Gmail / SMTP Gateway Configuration Status
router.get('/email-status', (req, res) => {
  try {
    const status = getEmailGatewayStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Send OTP to Email
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await requestEmailOtp(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Verify Email OTP (with optional password creation)
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, otp, savePassword } = req.body;
    const result = await verifyEmailOtp(email, otp, savePassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Login with Email + Password
router.post('/login-email-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginWithEmailPassword(email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Check Email registration status
router.get('/check-email', (req, res) => {
  try {
    const { email } = req.query;
    const result = checkEmailAuth(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Save/Reset password by Email
router.post('/save-email-password', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = saveEmailPassword(email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- ROLE-SPECIFIC LOGIN ENDPOINTS ---

// Staff/Admin Login (by Staff ID or Email + Password)
router.post('/login-staff', async (req, res) => {
  try {
    const { staffId, password, identifier } = req.body;
    const result = await loginStaff(staffId || identifier, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Buyer Login (by Buyer ID or Email + Password)
router.post('/login-buyer', async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const result = await loginBuyer(identifier || email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Instant 1-Click Role Switch
router.post('/quick-switch', (req, res) => {
  try {
    const { role, id } = req.body;
    const result = quickSwitch(role, id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Current User Profile
router.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// --- LEGACY ADAPTER ENDPOINTS ---

router.post('/send-otp', async (req, res) => {
  try {
    const target = req.body.email || req.body.phone;
    const result = await requestOtp(target);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const target = req.body.email || req.body.phone;
    const { otp, savePassword } = req.body;
    const result = await verifyOtp(target, otp, savePassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login-mobile-password', async (req, res) => {
  try {
    const target = req.body.email || req.body.phone;
    const { password } = req.body;
    const result = await loginWithMobilePassword(target, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/check-phone', (req, res) => {
  try {
    const { phone } = req.query;
    const result = checkPhoneAuth(phone);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/save-password', (req, res) => {
  try {
    const target = req.body.email || req.body.phone;
    const { password } = req.body;
    const result = saveUserPassword(target, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Update profile details
router.put('/profile', (req, res) => {
  try {
    const { userId, ...updates } = req.body;
    if (!userId) throw new Error('User ID is required.');
    const result = updateUserProfile(userId, updates);
    res.json({ success: true, user: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
