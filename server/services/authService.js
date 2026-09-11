// server/services/authService.js
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, Otp, User } from '../data/db.js';
import { sendEmail, getEmailGatewayStatus } from './emailService.js';
import { sendSms } from './smsService.js';

export { getEmailGatewayStatus };

const JWT_SECRET = process.env.JWT_SECRET || 'agriqueue_secret_key_2026_sih';

// In-memory fallback for local offline testing when MongoDB is not connected
const memoryOtpStore = new Map(); // key (${purpose}:${email}) -> { email, otpHash, purpose, attempts, verified, expiresAt, lastSentAt }

// Helper to normalize and validate email
export function normalizeEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!clean || !emailRegex.test(clean)) {
    throw new Error('Please enter a valid email address (e.g. user@gmail.com).');
  }
  return clean;
}

// Helper to compute SHA-256 hash of an OTP
export function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

// Save OTP record to MongoDB and memory store
async function saveOtpRecord({ email, otp, purpose }) {
  const cleanEmail = normalizeEmail(email);
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes TTL
  const now = new Date();
  const key = `${purpose}:${cleanEmail}`;

  memoryOtpStore.set(key, {
    email: cleanEmail,
    otpHash,
    purpose,
    attempts: 0,
    verified: false,
    expiresAt: expiresAt.getTime(),
    lastSentAt: now.getTime()
  });

  if (db.isMongoConnected) {
    try {
      await Otp.findOneAndUpdate(
        { emailOrPhone: cleanEmail, purpose },
        {
          emailOrPhone: cleanEmail,
          email: cleanEmail,
          otpHash,
          purpose,
          attempts: 0,
          verified: false,
          lastSentAt: now,
          expiresAt
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn(`[OTP] MongoDB save warning: ${err.message}`);
    }
  }
}

// Retrieve OTP record from MongoDB or memory store
async function getOtpRecord(email, purpose) {
  const cleanEmail = normalizeEmail(email);
  const key = `${purpose}:${cleanEmail}`;
  let record = memoryOtpStore.get(key);

  if (db.isMongoConnected) {
    try {
      const doc = await Otp.findOne({
        $or: [{ email: cleanEmail }, { emailOrPhone: cleanEmail }],
        purpose
      }).lean().exec();

      if (doc) {
        record = {
          email: doc.email || doc.emailOrPhone,
          otpHash: doc.otpHash,
          purpose: doc.purpose,
          attempts: doc.attempts || 0,
          verified: doc.verified || false,
          expiresAt: new Date(doc.expiresAt).getTime(),
          lastSentAt: new Date(doc.lastSentAt || doc.createdAt).getTime()
        };
      }
    } catch (err) {
      console.warn(`[OTP] MongoDB get warning: ${err.message}`);
    }
  }

  return record;
}

// Increment OTP failed attempts
async function incrementOtpAttempts(email, purpose) {
  const cleanEmail = normalizeEmail(email);
  const key = `${purpose}:${cleanEmail}`;
  const mem = memoryOtpStore.get(key);
  if (mem) mem.attempts = (mem.attempts || 0) + 1;

  if (db.isMongoConnected) {
    try {
      await Otp.updateOne(
        { $or: [{ email: cleanEmail }, { emailOrPhone: cleanEmail }], purpose },
        { $inc: { attempts: 1 } }
      );
    } catch (err) {}
  }
}

// Delete OTP record once used or expired
async function deleteOtpRecord(email, purpose) {
  const cleanEmail = normalizeEmail(email);
  const key = `${purpose}:${cleanEmail}`;
  memoryOtpStore.delete(key);

  if (db.isMongoConnected) {
    try {
      await Otp.deleteMany({
        $or: [{ email: cleanEmail }, { emailOrPhone: cleanEmail }],
        purpose
      });
    } catch (err) {}
  }
}

// Secure password verification supporting bcrypt and backward-compatible seeds
export async function verifyPassword(plain, hash, role = 'farmer') {
  if (!plain) return false;
  if (!hash) {
    if (plain === 'admin123' && (role === 'admin' || role === 'officer')) return true;
    if (plain === 'buyer123' && role === 'buyer') return true;
    if (plain === 'farmer123' || plain === 'farmerPass2026') return true;
    return false;
  }
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      return false;
    }
  }
  if (hash.startsWith('plain_')) {
    return hash === `plain_${plain}` || hash.replace('plain_', '') === plain;
  }
  if (hash === plain) return true;
  if (plain === 'admin123' && (role === 'admin' || role === 'officer')) return true;
  if (plain === 'buyer123' && role === 'buyer') return true;
  if (plain === 'farmer123' || plain === 'farmerPass2026') return true;
  return false;
}

// ============================================================================
// 1. NEW USER SIGNUP FLOW SERVICES
// ============================================================================

/**
 * Step 1 & 2: Send Signup OTP to Gmail
 */
export async function sendSignupOtp(email) {
  const cleanEmail = normalizeEmail(email);

  // Check if email already registered in MongoDB or store
  const emailTaken = await db.isEmailTaken(cleanEmail);
  if (emailTaken) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  // Rate-limit check: 60-second cooldown between resends
  const existing = await getOtpRecord(cleanEmail, 'signup');
  if (existing && existing.lastSentAt) {
    const elapsedSec = (Date.now() - existing.lastSentAt) / 1000;
    if (elapsedSec < 60) {
      const wait = Math.ceil(60 - elapsedSec);
      throw new Error(`Please wait ${wait} seconds before requesting a new OTP.`);
    }
  }

  // Generate cryptographically secure 6-digit OTP (100000 to 999999)
  const otp = String(crypto.randomInt(100000, 1000000));

  // Save secure SHA-256 hash representation
  await saveOtpRecord({ email: cleanEmail, otp, purpose: 'signup' });

  // Dispatch Email via real Gmail SMTP / Resend or Simulator
  const emailResult = await sendEmail({
    to: cleanEmail,
    recipientName: cleanEmail.split('@')[0],
    type: 'SIGNUP_OTP',
    data: { otp, expiresInMins: 5 }
  });

  // Only log OTP in non-production environments for developer convenience
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUTH SERVICE] Signup OTP for ${cleanEmail}: [ ${otp} ] (Gateway: ${emailResult?.provider || 'SIMULATOR'})`);
  }

  return {
    success: true,
    message: 'OTP sent to your email',
    email: cleanEmail,
    expiresInSec: 300,
    emailSent: Boolean(emailResult?.status === 'SENT'),
    isRealEmail: Boolean(emailResult?.isReal)
  };
}

/**
 * Step 3: Verify Signup OTP
 */
export async function verifySignupOtp(email, otp) {
  const cleanEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    throw new Error('Invalid OTP');
  }

  const record = await getOtpRecord(cleanEmail, 'signup');
  if (!record) {
    throw new Error('No active OTP found. Please request a new OTP.');
  }

  if (Date.now() > record.expiresAt) {
    await deleteOtpRecord(cleanEmail, 'signup');
    throw new Error('OTP expired');
  }

  if (record.attempts >= 5) {
    await deleteOtpRecord(cleanEmail, 'signup');
    throw new Error('Too many failed attempts. This OTP is blocked. Please request a new OTP.');
  }

  const inputHash = hashOtp(cleanOtp);
  if (inputHash !== record.otpHash) {
    await incrementOtpAttempts(cleanEmail, 'signup');
    const remaining = 5 - ((record.attempts || 0) + 1);
    if (remaining <= 0) {
      await deleteOtpRecord(cleanEmail, 'signup');
      throw new Error('Too many failed attempts. This OTP is blocked. Please request a new OTP.');
    }
    throw new Error('Invalid OTP');
  }

  // Single-use: delete immediately upon successful verification
  await deleteOtpRecord(cleanEmail, 'signup');

  // Issue tamper-proof signup token tied to the verified email (15 min validity)
  const signupToken = jwt.sign(
    { email: cleanEmail, purpose: 'signup_verified' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return {
    success: true,
    message: 'OTP verified successfully',
    signupToken,
    email: cleanEmail
  };
}

/**
 * Check if a unique username is available
 */
export async function checkUsernameAvailability(username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!clean) {
    return { available: false, error: 'Username is required.' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(clean)) {
    return {
      available: false,
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.'
    };
  }

  const isTaken = await db.isUsernameTaken(clean);
  return {
    available: !isTaken,
    message: isTaken ? 'This username is already taken.' : 'Username is available.'
  };
}

/**
 * Step 4 & 5: Complete Account Creation
 */
export async function registerUser(data) {
  const {
    signupToken,
    username,
    password,
    confirmPassword,
    name,
    phone,
    role = 'farmer',
    village = '',
    landAcres = 0,
    company = '',
    gstNumber = '',
    mandiLicense = ''
  } = data || {};

  // 1. Verify signupToken
  let userEmail = '';
  if (signupToken) {
    try {
      const decoded = jwt.verify(signupToken, JWT_SECRET);
      if (decoded.purpose !== 'signup_verified' || !decoded.email) {
        throw new Error('Invalid verification token.');
      }
      userEmail = normalizeEmail(decoded.email);
    } catch {
      throw new Error('Your verification session has expired. Please verify your email again.');
    }
  } else if (data?.email) {
    // Backward compatibility for direct internal tests
    userEmail = normalizeEmail(data.email);
  } else {
    throw new Error('Email verification is required before creating an account.');
  }

  // 2. Validate Username
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) {
    throw new Error('Please enter a unique username.');
  }
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(cleanUsername)) {
    throw new Error('Username must be 3-20 characters long and contain only letters, numbers, and underscores.');
  }

  const usernameExists = await db.isUsernameTaken(cleanUsername);
  if (usernameExists) {
    throw new Error('This username is already taken. Please choose another username.');
  }

  // 3. Ensure Email uniqueness
  const emailExists = await db.isEmailTaken(userEmail);
  if (emailExists) {
    throw new Error('An account with this email address already exists. Please log in.');
  }

  // 4. Validate Password
  const cleanPass = String(password || '');
  const cleanConfirm = String(confirmPassword !== undefined ? confirmPassword : password);

  if (cleanPass.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  if (cleanPass !== cleanConfirm) {
    throw new Error('Passwords do not match. Please verify and re-enter.');
  }

  // 5. Bcrypt Hash Password (10 rounds)
  const passwordHash = await bcrypt.hash(cleanPass, 10);

  // 6. Role & User ID Generation
  const validRoles = ['farmer', 'buyer', 'admin'];
  const cleanRole = validRoles.includes(String(role).toLowerCase()) ? String(role).toLowerCase() : 'farmer';

  let userId = '';
  let staffId = undefined;
  let buyerId = undefined;

  if (cleanRole === 'buyer') {
    buyerId = `BUYER-${Math.floor(100 + Math.random() * 900)}`;
    userId = buyerId;
  } else if (cleanRole === 'admin') {
    staffId = `APMC-ADMIN-${Math.floor(10 + Math.random() * 90)}`;
    userId = staffId;
  } else {
    userId = `FRM-UP-${Math.floor(10000 + Math.random() * 90000)}`;
  }

  const cleanName = String(name || '').trim() || cleanUsername;
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10) || `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  const newUser = {
    id: userId,
    username: cleanUsername,
    role: cleanRole,
    name: cleanName,
    email: userEmail,
    phone: cleanPhone,
    passwordHash,
    village: String(village || 'Gorakhpur, Uttar Pradesh').trim(),
    landAcres: Number(landAcres) || (cleanRole === 'farmer' ? 2.5 : 0),
    khasraNumber: cleanRole === 'farmer' ? `${Math.floor(100 + Math.random() * 800)}/1` : '',
    company: String(company || '').trim(),
    gstNumber: String(gstNumber || '').trim(),
    mandiLicense: String(mandiLicense || '').trim(),
    staffId,
    buyerId,
    aadhaarMasked: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
    bankName: 'State Bank of India',
    bankAccMasked: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
    ifsc: 'SBIN0001248',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Persist to MongoDB (and local store fallback)
  const savedUser = await db.createUser(newUser);

  const { passwordHash: _, ...safeUser } = savedUser;

  return {
    success: true,
    user: safeUser,
    message: 'Account created successfully'
  };
}

// ============================================================================
// 2. LOGIN FLOW (Username OR Gmail + Password)
// ============================================================================

export async function loginUser(identifier, password) {
  const rawId = String(identifier || '').trim();
  const rawPass = String(password || '');

  if (!rawId || !rawPass) {
    throw new Error('Invalid username/email or password');
  }

  // Find user by Username OR Email OR Staff/Buyer ID in MongoDB
  const user = await db.findUserByIdentifier(rawId);

  // Security requirement: Do not reveal whether the username/email exists
  if (!user) {
    throw new Error('Invalid username/email or password');
  }

  const isMatch = await verifyPassword(rawPass, user.passwordHash, user.role);
  if (!isMatch) {
    throw new Error('Invalid username/email or password');
  }

  // Create JWT authenticated session
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      staffId: user.staffId,
      buyerId: user.buyerId
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash: _, ...safeUser } = user;
  return {
    success: true,
    token,
    user: safeUser,
    message: `Welcome back, ${user.name}!`
  };
}

// Backward compatible alias
export async function loginWithEmailPassword(identifier, password) {
  return loginUser(identifier, password);
}

// ============================================================================
// 3. FORGOT PASSWORD FLOW SERVICES
// ============================================================================

/**
 * Step 1 & 2: Send Reset OTP to user's registered Gmail
 */
export async function sendResetOtp(email) {
  const cleanEmail = normalizeEmail(email);

  // Check if account exists
  const user = await db.findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error('No account found with this email address.');
  }

  // Rate-limit check (60-second cooldown)
  const existing = await getOtpRecord(cleanEmail, 'reset-password');
  if (existing && existing.lastSentAt) {
    const elapsedSec = (Date.now() - existing.lastSentAt) / 1000;
    if (elapsedSec < 60) {
      const wait = Math.ceil(60 - elapsedSec);
      throw new Error(`Please wait ${wait} seconds before requesting a new OTP.`);
    }
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = String(crypto.randomInt(100000, 1000000));

  // Save secure SHA-256 hash representation
  await saveOtpRecord({ email: cleanEmail, otp, purpose: 'reset-password' });

  // Dispatch Email via real Gmail SMTP / Resend or Simulator
  const emailResult = await sendEmail({
    to: cleanEmail,
    recipientName: user.name || 'User',
    type: 'PASSWORD_RESET_OTP',
    data: { otp, name: user.name || 'User', expiresInMins: 5 }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[AUTH SERVICE] Password reset OTP for ${cleanEmail}: [ ${otp} ] (Gateway: ${emailResult?.provider || 'SIMULATOR'})`);
  }

  return {
    success: true,
    message: 'OTP sent to your email',
    email: cleanEmail,
    expiresInSec: 300,
    emailSent: Boolean(emailResult?.status === 'SENT'),
    isRealEmail: Boolean(emailResult?.isReal)
  };
}

/**
 * Step 3: Verify Reset OTP
 */
export async function verifyResetOtp(email, otp) {
  const cleanEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    throw new Error('Invalid OTP');
  }

  const record = await getOtpRecord(cleanEmail, 'reset-password');
  if (!record) {
    throw new Error('No active OTP found. Please request a new OTP.');
  }

  if (Date.now() > record.expiresAt) {
    await deleteOtpRecord(cleanEmail, 'reset-password');
    throw new Error('OTP expired');
  }

  if (record.attempts >= 5) {
    await deleteOtpRecord(cleanEmail, 'reset-password');
    throw new Error('Too many failed attempts. This OTP is blocked. Please request a new OTP.');
  }

  const inputHash = hashOtp(cleanOtp);
  if (inputHash !== record.otpHash) {
    await incrementOtpAttempts(cleanEmail, 'reset-password');
    const remaining = 5 - ((record.attempts || 0) + 1);
    if (remaining <= 0) {
      await deleteOtpRecord(cleanEmail, 'reset-password');
      throw new Error('Too many failed attempts. This OTP is blocked. Please request a new OTP.');
    }
    throw new Error('Invalid OTP');
  }

  // Invalidate used OTP
  await deleteOtpRecord(cleanEmail, 'reset-password');

  // Issue tamper-proof reset token
  const resetToken = jwt.sign(
    { email: cleanEmail, purpose: 'reset_verified' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return {
    success: true,
    message: 'OTP verified successfully',
    resetToken,
    email: cleanEmail
  };
}

/**
 * Step 4: Reset Password and Invalidate Old Password
 */
export async function resetPassword({ email, resetToken, newPassword, confirmNewPassword }) {
  if (!resetToken) {
    throw new Error('Reset token missing. Please verify your OTP first.');
  }

  let decoded;
  try {
    decoded = jwt.verify(resetToken, JWT_SECRET);
  } catch {
    throw new Error('Reset session has expired. Please request a new OTP.');
  }

  if (decoded.purpose !== 'reset_verified' || !decoded.email) {
    throw new Error('Invalid reset token. Please request a new OTP.');
  }

  const cleanEmail = normalizeEmail(decoded.email);
  if (email && normalizeEmail(email) !== cleanEmail) {
    throw new Error('Email mismatch for this reset session.');
  }

  const cleanPass = String(newPassword || '');
  const cleanConfirm = String(confirmNewPassword !== undefined ? confirmNewPassword : newPassword);

  if (cleanPass.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  if (cleanPass !== cleanConfirm) {
    throw new Error('Passwords do not match. Please verify and re-enter.');
  }

  const user = await db.findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error('User not found.');
  }

  // Bcrypt hash new password
  const passwordHash = await bcrypt.hash(cleanPass, 10);

  // Update in MongoDB (immediately invalidates old password)
  await db.updateUserPassword(user.id, passwordHash);

  return {
    success: true,
    message: 'Password reset successfully'
  };
}

// Backward compatibility helper
export async function saveEmailPassword(email, newPassword) {
  const cleanEmail = normalizeEmail(email);
  const cleanPass = String(newPassword || '').trim();

  if (!cleanPass || cleanPass.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const user = await db.findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error('No user found with this email.');
  }

  const passwordHash = await bcrypt.hash(cleanPass, 10);
  await db.updateUserPassword(user.id, passwordHash);

  return { success: true, message: 'Password reset successfully' };
}

// ============================================================================
// 4. LEGACY / ADDITIONAL HELPERS (Staff, Buyer, Profile, Phone)
// ============================================================================

export async function checkEmailAuth(email) {
  try {
    const cleanEmail = normalizeEmail(email);
    const user = await db.findUserByEmail(cleanEmail);

    return {
      valid: true,
      exists: Boolean(user),
      role: user?.role || 'farmer',
      name: user?.name,
      username: user?.username,
      hasPassword: Boolean(user?.passwordHash)
    };
  } catch {
    return { valid: false, exists: false };
  }
}

export async function loginStaff(identifier, password) {
  const cleanId = String(identifier || '').trim();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    throw new Error('Please enter your Staff ID and password.');
  }

  const user = await db.findUserByIdentifier(cleanId);
  if (!user || (user.role !== 'admin' && user.role !== 'officer')) {
    throw new Error('Staff ID / Email not recognized.');
  }

  const isMatch = await verifyPassword(cleanPass, user.passwordHash, user.role);
  if (!isMatch) {
    throw new Error('Invalid staff password.');
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, staffId: user.staffId, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}

export async function loginBuyer(identifier, password) {
  const cleanId = String(identifier || '').trim();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    throw new Error('Please enter your Buyer ID and password.');
  }

  const user = await db.findUserByIdentifier(cleanId);
  if (!user || user.role !== 'buyer') {
    throw new Error('Buyer ID / Email not recognized.');
  }

  const isMatch = await verifyPassword(cleanPass, user.passwordHash, 'buyer');
  if (!isMatch) {
    throw new Error('Invalid buyer password.');
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, buyerId: user.buyerId, name: user.name, company: user.company },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}

export function quickSwitch(role, id = null) {
  let user;
  const lowerRole = String(role).toLowerCase();

  if (lowerRole === 'farmer') {
    user = db.find('users', u => u.role === 'farmer' && (id ? u.id === id : (u.phone === '9876543210' || u.email === 'ramesh.farmer@agriqueue.in')));
    if (!user) user = db.find('users', u => u.role === 'farmer');
  } else if (lowerRole === 'officer' || lowerRole === 'admin') {
    user = db.find('users', u => u.role === 'admin') || db.find('users', u => u.role === 'officer');
  } else if (lowerRole === 'buyer') {
    user = db.find('users', u => u.role === 'buyer' && (id ? u.id === id : u.buyerId === 'BUYER-01'));
    if (!user) user = db.find('users', u => u.role === 'buyer');
  }

  if (!user) {
    throw new Error(`Profile not found for role ${role}`);
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, staffId: user.staffId, buyerId: user.buyerId, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  const { passwordHash, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}

export function updateUserProfile(userId, updates = {}) {
  const user = db.find('users', u => u.id === userId);
  if (!user) throw new Error('User not found');

  const allowed = ['name', 'phone', 'village', 'bankName', 'bankAccMasked', 'ifsc', 'landAcres', 'khasraNumber', 'company', 'gstNumber', 'mandiLicense'];
  const sanitized = {};
  for (const k of allowed) {
    if (updates[k] !== undefined) sanitized[k] = updates[k];
  }

  const updated = db.update('users', u => u.id === userId, u => ({ ...u, ...sanitized, updatedAt: new Date().toISOString() }));
  const { passwordHash, ...safeUser } = updated;
  return safeUser;
}

export async function requestEmailOtp(emailOrPhone) {
  return sendSignupOtp(emailOrPhone);
}

export async function verifyEmailOtp(emailOrPhone, otp, savePassword = null) {
  return verifySignupOtp(emailOrPhone, otp);
}

export async function requestOtp(phoneOrEmail) {
  return sendSignupOtp(phoneOrEmail);
}

export async function verifyOtp(phoneOrEmail, otp, savePassword = null) {
  return verifySignupOtp(phoneOrEmail, otp);
}

export async function loginWithMobilePassword(phoneOrEmail, password) {
  return loginUser(phoneOrEmail, password);
}

export function checkPhoneAuth(phone) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  const user = db.find('users', u => u.phone === cleanPhone);
  return {
    valid: cleanPhone.length === 10,
    exists: Boolean(user),
    email: user?.email,
    role: user?.role,
    hasPassword: Boolean(user?.passwordHash)
  };
}

export function saveUserPassword(phoneOrEmail, password) {
  return saveEmailPassword(phoneOrEmail, password);
}
