// server/routes/authRoutes.js
import { Router } from 'express';
import {
  sendSignupOtp,
  verifySignupOtp,
  checkUsernameAvailability,
  registerUser,
  loginUser,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
  checkEmailAuth,
  saveEmailPassword,
  getEmailGatewayStatus,
  loginStaff,
  loginBuyer,
  quickSwitch,
  updateUserProfile
} from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// 1. SIGNUP & EMAIL OTP ENDPOINTS
// ============================================================================

// Step 2: Send 6-Digit OTP to Gmail for Signup
router.post('/send-signup-otp', async (req, res) => {
  try {
    const email = req.body.email || req.body.identifier;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    const result = await sendSignupOtp(email);
    res.json(result);
  } catch (err) {
    const isDuplicate = err.message && err.message.includes('already exists');
    const isRateLimit = err.message && err.message.includes('wait');
    const status = isDuplicate ? 409 : (isRateLimit ? 429 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
});

// Step 3: Verify Gmail OTP
router.post('/verify-signup-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
    }
    const result = await verifySignupOtp(email, otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Step 4: Check if username is available and valid format
router.all('/check-username', async (req, res) => {
  try {
    const username = req.query.username || req.body.username;
    if (!username) {
      return res.status(400).json({ available: false, error: 'Username is required.' });
    }
    const result = await checkUsernameAvailability(username);
    res.json(result);
  } catch (err) {
    res.status(400).json({ available: false, error: err.message });
  }
});

// Step 5: Complete Account Creation (Stores in MongoDB)
router.post('/signup', async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    const isDuplicate = err.message && (err.message.includes('already exists') || err.message.includes('already taken'));
    res.status(isDuplicate ? 409 : 400).json({ success: false, error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    const isDuplicate = err.message && (err.message.includes('already exists') || err.message.includes('already taken'));
    res.status(isDuplicate ? 409 : 400).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 2. LOGIN & SESSION ENDPOINTS
// ============================================================================

// Unified Login accepting Username OR Gmail + Password
const loginHandler = async (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.username || req.body.email || req.body.phone;
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Invalid username/email or password' });
    }

    const result = await loginUser(identifier, password);
    res.json(result);
  } catch (err) {
    // 401 Unauthorized with generic message
    res.status(401).json({ success: false, error: err.message || 'Invalid username/email or password' });
  }
};

router.post('/login', loginHandler);
router.post('/login-email-password', loginHandler);
router.post('/login-mobile-password', loginHandler);

// Logout (Session Invalidation)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================================
// 3. FORGOT PASSWORD ENDPOINTS
// ============================================================================

// Step 1 & 2: Send Reset OTP
router.post('/send-reset-otp', async (req, res) => {
  try {
    const email = req.body.email || req.body.identifier;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    const result = await sendResetOtp(email);
    res.json(result);
  } catch (err) {
    const isNotFound = err.message && err.message.includes('No account found');
    const isRateLimit = err.message && err.message.includes('wait');
    const status = isNotFound ? 404 : (isRateLimit ? 429 : 400);
    res.status(status).json({ success: false, error: err.message });
  }
});

// Step 3: Verify Reset OTP
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
    }
    const result = await verifyResetOtp(email, otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Step 4: Reset Password (Updates MongoDB & invalidates old password)
router.post('/reset-password', async (req, res) => {
  try {
    const result = await resetPassword(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/save-email-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await saveEmailPassword(email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 4. SYSTEM STATUS, ROLE SWITCHER & COMPATIBILITY ENDPOINTS
// ============================================================================

// Email gateway configuration status check
router.get('/email-status', (req, res) => {
  try {
    const status = getEmailGatewayStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check email registration
router.get('/check-email', async (req, res) => {
  try {
    const { email } = req.query;
    const result = await checkEmailAuth(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Staff/Admin Login
router.post('/login-staff', async (req, res) => {
  try {
    const { staffId, password, identifier } = req.body;
    const result = await loginStaff(staffId || identifier, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Buyer Login
router.post('/login-buyer', async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const result = await loginBuyer(identifier || email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// 1-Click Role Switch for Demonstration
router.post('/quick-switch', (req, res) => {
  try {
    const { role, id } = req.body;
    const result = quickSwitch(role, id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Current Authenticated User Profile
router.get('/me', authenticate, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// Legacy OTP endpoints
router.post('/send-email-otp', async (req, res) => {
  try {
    const result = await sendSignupOtp(req.body.email || req.body.identifier);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/send-otp', async (req, res) => {
  try {
    const result = await sendSignupOtp(req.body.email || req.body.phone || req.body.identifier);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/verify-email-otp', async (req, res) => {
  try {
    const result = await verifySignupOtp(req.body.email || req.body.identifier, req.body.otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const result = await verifySignupOtp(req.body.email || req.body.phone || req.body.identifier, req.body.otp);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Profile update
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
