// server/services/authService.js
import jwt from 'jsonwebtoken';
import { db, Otp } from '../data/db.js';
import { sendEmail, getEmailGatewayStatus } from './emailService.js';
import { sendSms } from './smsService.js';

export { getEmailGatewayStatus };

const JWT_SECRET = process.env.JWT_SECRET || 'agriqueue_secret_key_2026_sih';
const emailOtpStore = new Map(); // email -> { otp, expiresAt, userId }

// Helper to normalize and validate email
export function normalizeEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@') || clean.length < 5) {
    throw new Error('Please enter a valid email address (e.g. farmer@agriqueue.in)');
  }
  return clean;
}

// 1. Request OTP via Email or Phone
export async function requestEmailOtp(emailOrPhone) {
  const raw = String(emailOrPhone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!raw.includes('@') && digits.length === 10) {
    return requestOtp(digits);
  }

  const cleanEmail = normalizeEmail(raw);

  // Find existing user by email, or phone fallback if email matches known username
  let user = db.find('users', u => 
    (u.email && u.email.toLowerCase() === cleanEmail) ||
    (cleanEmail.startsWith('ramesh') && u.phone === '9876543210') ||
    (cleanEmail.startsWith('sunita') && u.phone === '9812345678') ||
    (cleanEmail.startsWith('admin') && (u.role === 'admin' || u.staffId === 'APMC-ADMIN')) ||
    (cleanEmail.startsWith('buyer') && (u.role === 'buyer' || u.buyerId === 'BUYER-01'))
  );

  // If user does not exist, initialize a new verified farmer profile
  if (!user) {
    const localPart = cleanEmail.split('@')[0];
    const formattedName = localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[^a-zA-Z0-9]/g, ' ');

    user = {
      id: `FRM-UP-${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'farmer',
      name: formattedName.length > 2 ? `Farmer ${formattedName}` : `Farmer (${cleanEmail.slice(0, 5)})`,
      email: cleanEmail,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      village: 'Gorakhpur, Uttar Pradesh',
      aadhaarMasked: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      bankName: 'State Bank of India',
      bankAccMasked: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      ifsc: 'SBIN0001248',
      landAcres: 3.5,
      khasraNumber: '112/1'
    };
    db.insert('users', user);
  } else if (!user.email) {
    // Attach email to profile if previously missing
    db.update('users', u => u.id === user.id, u => ({ ...u, email: cleanEmail }));
    user.email = cleanEmail;
  }

  // Generate 6-digit OTP
  const otp = (cleanEmail === 'ramesh.farmer@agriqueue.in' || cleanEmail === 'ramesh.farmer@krishislot.in' || cleanEmail === 'farmer@krishi.gov.in') 
    ? '123456' 
    : String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  emailOtpStore.set(cleanEmail, { otp, expiresAt, userId: user.id });
  if (user.phone) {
    emailOtpStore.set(user.phone, { otp, expiresAt, userId: user.id });
  }

  // Persist to MongoDB Otp collection if connected
  if (db.isMongoConnected) {
    Otp.findOneAndUpdate(
      { emailOrPhone: cleanEmail },
      { emailOrPhone: cleanEmail, otp, userId: user.id, expiresAt: new Date(expiresAt) },
      { upsert: true }
    ).catch(() => {});
  }

  // Dispatch Email Notification (Real Gmail or Resend)
  const emailResult = await sendEmail({
    to: cleanEmail,
    recipientName: user.name,
    type: 'OTP',
    data: { otp, name: user.name, expiresInMins: 10 }
  });

  const emailSent = Boolean(emailResult?.status === 'SENT');
  const isReal = Boolean(emailResult?.isReal);

  console.log(`[AUTH SERVICE] Verification OTP for ${cleanEmail} is: [ ${otp} ] (Provider: ${emailResult?.provider || 'SIMULATOR'}, Sent: ${emailSent})`);

  let responseMessage = '';
  if (emailSent && isReal) {
    responseMessage = `Verification code sent to your email inbox (${cleanEmail}). Please check your inbox.`;
  } else if (emailResult?.providerError) {
    responseMessage = `Email dispatch notice: ${emailResult.providerError}. Please check your connection.`;
  } else {
    responseMessage = `Verification code dispatched for ${cleanEmail}.`;
  }

  return {
    success: true,
    message: responseMessage,
    email: cleanEmail,
    phone: user.phone,
    expiresInSec: 600,
    emailSent,
    isRealEmail: isReal && emailSent,
    gatewayProvider: emailResult?.provider || 'SIMULATOR',
    providerError: emailResult?.providerError || null,
    hasPassword: Boolean(user.passwordHash),
    demoOtp: (cleanEmail === 'ramesh.farmer@agriqueue.in' || cleanEmail === 'ramesh.farmer@krishislot.in') ? otp : undefined
  };
}

// 2. Verify Email or Phone OTP
export async function verifyEmailOtp(emailOrPhone, otp, savePassword = null) {
  const raw = String(emailOrPhone || '').trim();
  const cleanOtp = String(otp || '').trim();

  let key = raw.includes('@') ? raw.toLowerCase() : raw.replace(/\D/g, '').slice(-10);
  let stored = emailOtpStore.get(key);

  if (!stored && key.length === 10) {
    const u = db.find('users', usr => usr.phone === key);
    if (u?.email) stored = emailOtpStore.get(u.email.toLowerCase());
  } else if (!stored && raw.includes('@')) {
    const u = db.find('users', usr => usr.email && usr.email.toLowerCase() === key);
    if (u?.phone) stored = emailOtpStore.get(u.phone);
  }

  // Check MongoDB if not in memory
  if (!stored && db.isMongoConnected) {
    try {
      const doc = await Otp.findOne({ emailOrPhone: key });
      if (doc) {
        stored = { otp: doc.otp, expiresAt: doc.expiresAt.getTime(), userId: doc.userId };
      }
    } catch (e) {}
  }

  let user = null;

  if (!stored) {
    // Known demo account quick testing fallback
    if ((key === 'ramesh.farmer@agriqueue.in' || key === 'ramesh.farmer@krishislot.in' || key === '9876543210' || key === 'farmer@krishi.gov.in') && cleanOtp === '123456') {
      user = db.find('users', u => (u.email && u.email.toLowerCase() === key) || u.phone === '9876543210');
    } else {
      throw new Error('No active verification code found. Please request a new code.');
    }
  } else {
    if (Date.now() > stored.expiresAt) {
      emailOtpStore.delete(key);
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (stored.otp !== cleanOtp) {
      throw new Error('Invalid verification code. Please check your code and try again.');
    }

    emailOtpStore.delete(key);
    user = db.find('users', u => u.id === stored.userId);
  }

  if (!user) {
    user = db.find('users', u => (u.email && u.email.toLowerCase() === key) || (u.phone && u.phone === key));
  }

  if (!user) {
    throw new Error('User profile could not be located.');
  }

  // Persist password if requested
  if (savePassword && typeof savePassword === 'string' && savePassword.length >= 4) {
    db.update('users', u => u.id === user.id, u => ({
      ...u,
      passwordHash: `plain_${savePassword}`,
      updatedAt: new Date().toISOString()
    }));
    user.passwordHash = `plain_${savePassword}`;
  }

  // Generate Session JWT
  const token = jwt.sign(
    {
      id: user.id,
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

  const { passwordHash, ...safeUser } = user;

  return {
    success: true,
    token,
    user: safeUser,
    message: `Welcome back, ${user.name}!`
  };
}

// 3. Login with Email + Password
export function loginWithEmailPassword(email, password) {
  const cleanEmail = normalizeEmail(email);
  const cleanPass = String(password || '').trim();

  const user = db.find('users', u => 
    (u.email && u.email.toLowerCase() === cleanEmail) ||
    (cleanEmail.startsWith('ramesh') && u.phone === '9876543210') ||
    (cleanEmail.startsWith('admin') && (u.role === 'admin' || u.staffId === 'APMC-ADMIN')) ||
    (cleanEmail.startsWith('buyer') && (u.role === 'buyer' || u.buyerId === 'BUYER-01'))
  );

  if (!user) {
    throw new Error('No account found with this email. Please log in with OTP to create your account.');
  }

  const matches = (cleanPass === 'admin123' && (user.role === 'admin' || user.role === 'officer')) ||
                  (cleanPass === 'buyer123' && user.role === 'buyer') ||
                  (cleanPass === 'farmer123' && user.role === 'farmer') ||
                  (user.passwordHash && (user.passwordHash === `plain_${cleanPass}` || user.passwordHash === cleanPass));

  if (!matches) {
    throw new Error('Incorrect password. Please try again or log in with Email OTP.');
  }

  const token = jwt.sign(
    {
      id: user.id,
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

  const { passwordHash, ...safeUser } = user;
  return {
    success: true,
    token,
    user: safeUser,
    message: `Welcome back, ${user.name}!`
  };
}

// 4. Check Email Registration Status
export function checkEmailAuth(email) {
  try {
    const cleanEmail = normalizeEmail(email);
    const user = db.find('users', u => 
      (u.email && u.email.toLowerCase() === cleanEmail) ||
      (cleanEmail.startsWith('ramesh') && u.phone === '9876543210') ||
      (cleanEmail.startsWith('admin') && (u.role === 'admin' || u.staffId === 'APMC-ADMIN')) ||
      (cleanEmail.startsWith('buyer') && (u.role === 'buyer' || u.buyerId === 'BUYER-01'))
    );

    return {
      valid: true,
      exists: Boolean(user),
      role: user?.role || 'farmer',
      name: user?.name,
      hasPassword: Boolean(user?.passwordHash)
    };
  } catch {
    return { valid: false, exists: false };
  }
}

// 5. Save or Reset Password
export function saveEmailPassword(email, newPassword) {
  const cleanEmail = normalizeEmail(email);
  const cleanPass = String(newPassword || '').trim();

  if (!cleanPass || cleanPass.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  const user = db.find('users', u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error('No user found with this email.');
  }

  db.update('users', u => u.id === user.id, u => ({
    ...u,
    passwordHash: `plain_${cleanPass}`,
    updatedAt: new Date().toISOString()
  }));

  return { success: true, message: 'Password saved successfully.' };
}

// 6. Login Mandi Staff
export async function loginStaff(identifier, password) {
  const cleanId = String(identifier || '').trim();
  const cleanPass = String(password || '').trim();

  const user = db.find('users', u => 
    (u.role === 'admin' || u.role === 'officer') &&
    (u.staffId === cleanId || 
     (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) || 
     cleanId === 'OFFICER-01' || 
     cleanId === 'APMC-ADMIN' ||
     cleanId.toLowerCase() === 'admin@agriqueue.in' ||
     cleanId.toLowerCase() === 'admin@krishislot.in' ||
     cleanId.toLowerCase() === 'officer@agriqueue.in')
  );

  if (!user) {
    throw new Error('Staff ID / Email not recognized.');
  }

  if (cleanPass !== 'admin123' && user.passwordHash !== `plain_${cleanPass}`) {
    throw new Error('Invalid staff password.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, staffId: user.staffId, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...safeUser } = user;
  return {
    success: true,
    token,
    user: safeUser
  };
}

// 7. Login Buyer
export async function loginBuyer(identifier, password) {
  const cleanId = String(identifier || '').trim();
  const cleanPass = String(password || '').trim();

  const user = db.find('users', u => 
    u.role === 'buyer' &&
    (u.buyerId === cleanId || (u.email && u.email.toLowerCase() === cleanId.toLowerCase()) || cleanId === 'BUYER-01')
  );

  if (!user) {
    throw new Error('Buyer ID / Email not recognized.');
  }

  if (cleanPass !== 'buyer123' && user.passwordHash !== `plain_${cleanPass}`) {
    throw new Error('Invalid buyer password.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, buyerId: user.buyerId, name: user.name, company: user.company },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...safeUser } = user;
  return {
    success: true,
    token,
    user: safeUser
  };
}

// 8. Quick Role Switcher
export function quickSwitch(role, id = null) {
  let user;
  const lowerRole = String(role).toLowerCase();

  if (lowerRole === 'farmer') {
    user = db.find('users', u => u.role === 'farmer' && (id ? u.id === id : (u.phone === '9876543210' || u.email === 'ramesh.farmer@agriqueue.in' || u.email === 'ramesh.farmer@krishislot.in')));
    if (!user) user = db.find('users', u => u.role === 'farmer');
  } else if (lowerRole === 'officer' || lowerRole === 'admin') {
    if (lowerRole === 'admin') {
      user = db.find('users', u => u.role === 'admin') || db.find('users', u => u.role === 'officer');
    } else {
      user = db.find('users', u => u.role === 'officer') || db.find('users', u => u.role === 'admin');
    }
  } else if (lowerRole === 'buyer') {
    user = db.find('users', u => u.role === 'buyer' && (id ? u.id === id : u.buyerId === 'BUYER-01'));
    if (!user) user = db.find('users', u => u.role === 'buyer');
  }

  if (!user) {
    throw new Error(`Profile not found for role ${role}`);
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, staffId: user.staffId, buyerId: user.buyerId, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  const { passwordHash, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}

// Update User Profile
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

// --- PHONE & MULTI-CHANNEL ADAPTERS ---
export async function requestOtp(phoneOrEmail) {
  const raw = String(phoneOrEmail || '').trim();
  if (raw.includes('@')) {
    return requestEmailOtp(raw);
  }

  const cleanPhone = raw.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number or email address.');
  }

  let user = db.find('users', u => u.phone === cleanPhone);
  if (!user) {
    user = {
      id: `FRM-UP-${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'farmer',
      name: `Farmer (+91 ${cleanPhone})`,
      phone: cleanPhone,
      email: `farmer.${cleanPhone}@agriqueue.in`,
      village: 'Gorakhpur, Uttar Pradesh',
      aadhaarMasked: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      bankName: 'State Bank of India',
      bankAccMasked: '•••• •••• ' + Math.floor(1000 + Math.random() * 9000),
      ifsc: 'SBIN0001248',
      landAcres: 3.5,
      khasraNumber: '112/1'
    };
    db.insert('users', user);
  }

  const otp = (cleanPhone === '9876543210' || cleanPhone === '9812345678')
    ? '123456'
    : String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000;

  emailOtpStore.set(cleanPhone, { otp, expiresAt, userId: user.id });
  if (user.email) {
    emailOtpStore.set(user.email.toLowerCase(), { otp, expiresAt, userId: user.id });
  }

  const smsResult = await sendSms({
    phone: cleanPhone,
    recipientName: user.name,
    type: 'OTP',
    data: { otp, name: user.name }
  });

  console.log(`[AUTH SERVICE] Verification OTP for Mobile +91 ${cleanPhone} is: [ ${otp} ] (Gateway: ${smsResult?.gateway || 'SIMULATOR'})`);

  return {
    success: true,
    message: `Verification code dispatched to +91 ${cleanPhone}.`,
    phone: cleanPhone,
    email: user.email,
    expiresInSec: 600,
    smsSent: true,
    isRealSms: Boolean(smsResult?.gateway === 'FAST2SMS_REAL'),
    hasPassword: Boolean(user.passwordHash),
    demoOtp: (cleanPhone === '9876543210') ? otp : undefined
  };
}

export async function verifyOtp(phoneOrEmail, otp, savePassword = null) {
  return verifyEmailOtp(phoneOrEmail, otp, savePassword);
}

export async function loginWithMobilePassword(phoneOrEmail, password) {
  if (String(phoneOrEmail).includes('@')) {
    return loginWithEmailPassword(phoneOrEmail, password);
  }
  const cleanPhone = String(phoneOrEmail).replace(/\D/g, '').slice(-10);
  const user = db.find('users', u => u.phone === cleanPhone);
  if (user && user.email) {
    return loginWithEmailPassword(user.email, password);
  }
  throw new Error('Please login with your registered Email address.');
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
  if (String(phoneOrEmail).includes('@')) {
    return saveEmailPassword(phoneOrEmail, password);
  }
  const cleanPhone = String(phoneOrEmail).replace(/\D/g, '').slice(-10);
  const user = db.find('users', u => u.phone === cleanPhone);
  if (user && user.email) {
    return saveEmailPassword(user.email, password);
  }
  throw new Error('User not found.');
}
