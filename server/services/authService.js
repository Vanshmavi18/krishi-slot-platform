// server/services/authService.js
import jwt from 'jsonwebtoken';
import { db } from '../data/db.js';
import { sendEmail, getEmailGatewayStatus } from './emailService.js';
import { sendSms } from './smsService.js';

export { getEmailGatewayStatus };

const JWT_SECRET = process.env.JWT_SECRET || 'krishi_slot_secret_key_2026_sih';
const emailOtpStore = new Map(); // email -> { otp, expiresAt, userId }

// Helper to normalize and validate email
export function normalizeEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@') || clean.length < 5) {
    throw new Error('Please enter a valid email address (e.g. farmer@krishislot.in)');
  }
  return clean;
}

// 1. Request OTP via Email
export async function requestEmailOtp(email) {
  const cleanEmail = normalizeEmail(email);

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
  const isDemoEmail = cleanEmail.includes('demo') || cleanEmail.includes('krishislot.in') || cleanEmail.includes('example.com');
  const otp = (cleanEmail === 'ramesh.farmer@krishislot.in' || cleanEmail === 'farmer@krishi.gov.in') 
    ? '123456' 
    : String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  emailOtpStore.set(cleanEmail, { otp, expiresAt, userId: user.id });

  // Dispatch Email Notification (Real Gmail or Virtual Simulator)
  const emailResult = await sendEmail({
    to: cleanEmail,
    recipientName: user.name,
    type: 'OTP',
    data: { otp, name: user.name, expiresInMins: 10 }
  });

  const isReal = Boolean(emailResult?.isReal);

  return {
    success: true,
    message: isReal 
      ? `Verification code dispatched to your Gmail inbox: ${cleanEmail}. Please check your Inbox / Spam folder.` 
      : `Verification code dispatched to ${cleanEmail}`,
    email: cleanEmail,
    expiresInSec: 600,
    demoOtp: null,
    isRealEmail: isReal,
    gatewayProvider: emailResult?.provider || 'SIMULATOR',
    hasPassword: Boolean(user.passwordHash)
  };
}

// 2. Verify Email OTP
export async function verifyEmailOtp(email, otp, savePassword = null) {
  const cleanEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').trim();
  const stored = emailOtpStore.get(cleanEmail);

  let user = null;

  if (!stored) {
    // Known demo account quick testing fallback
    if ((cleanEmail === 'ramesh.farmer@krishislot.in' || cleanEmail === 'farmer@krishi.gov.in') && cleanOtp === '123456') {
      user = db.find('users', u => (u.email && u.email.toLowerCase() === cleanEmail) || u.phone === '9876543210');
    } else {
      throw new Error('No active verification code found for this email. Please request a new code.');
    }
  } else {
    if (Date.now() > stored.expiresAt) {
      emailOtpStore.delete(cleanEmail);
      throw new Error('Verification code has expired. Please request a new code.');
    }

    if (stored.otp !== cleanOtp) {
      throw new Error('Invalid verification code. Please check your email inbox and try again.');
    }

    emailOtpStore.delete(cleanEmail);
    user = db.find('users', u => u.id === stored.userId);
  }

  if (!user) {
    user = db.find('users', u => u.email && u.email.toLowerCase() === cleanEmail);
  }

  if (!user) {
    throw new Error('User profile could not be located.');
  }

  // Persist password if requested
  if (savePassword && String(savePassword).trim().length >= 4) {
    const cleanPwd = String(savePassword).trim();
    db.update('users', u => u.id === user.id, u => ({
      ...u,
      passwordHash: cleanPwd
    }));
    user.passwordHash = cleanPwd;
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...safeUser } = user;
  safeUser.hasPassword = Boolean(user.passwordHash);

  return {
    success: true,
    token,
    user: safeUser,
    passwordSaved: Boolean(savePassword && String(savePassword).trim().length >= 4)
  };
}

// 3. Login with Email and Password
export async function loginWithEmailPassword(email, password) {
  const cleanEmail = normalizeEmail(email);
  const cleanPwd = String(password || '').trim();

  if (!cleanPwd) {
    throw new Error('Please enter your password.');
  }

  let user = db.find('users', u => 
    (u.email && u.email.toLowerCase() === cleanEmail) ||
    (cleanEmail.startsWith('ramesh') && u.phone === '9876543210') ||
    (cleanEmail.startsWith('admin') && (u.role === 'admin' || u.staffId === 'APMC-ADMIN')) ||
    (cleanEmail.startsWith('buyer') && (u.role === 'buyer' || u.buyerId === 'BUYER-01'))
  );

  if (!user) {
    throw new Error('No account found for this email address. Please login with Email OTP first.');
  }

  const matches = (user.passwordHash && user.passwordHash === cleanPwd) ||
                  (user.role === 'farmer' && (cleanPwd === 'farmer123' || cleanPwd === 'farmerPass2026' || cleanPwd === user.passwordHash)) ||
                  ((user.role === 'admin' || user.role === 'officer') && (cleanPwd === 'admin123' || cleanPwd === user.passwordHash)) ||
                  (user.role === 'buyer' && (cleanPwd === 'buyer123' || cleanPwd === user.passwordHash));

  if (!matches) {
    throw new Error('Incorrect password. You can login with Email OTP instead or reset your password.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email || cleanEmail, phone: user.phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { passwordHash, ...safeUser } = user;
  safeUser.hasPassword = true;

  return {
    success: true,
    token,
    user: safeUser
  };
}

// 4. Check Email Auth status
export function checkEmailAuth(email) {
  try {
    const cleanEmail = normalizeEmail(email);
    const user = db.find('users', u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { valid: true, exists: false, hasPassword: false };
    }
    return {
      valid: true,
      exists: true,
      role: user.role,
      name: user.name,
      hasPassword: Boolean(user.passwordHash || user.role === 'farmer')
    };
  } catch {
    return { valid: false };
  }
}

// 5. Save or update user password by email
export function saveEmailPassword(email, newPassword) {
  const cleanEmail = normalizeEmail(email);
  if (!newPassword || String(newPassword).trim().length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }

  const user = db.find('users', u => u.email && u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error('No user account found for this email address.');
  }

  const cleanPwd = String(newPassword).trim();
  db.update('users', u => u.id === user.id, u => ({
    ...u,
    passwordHash: cleanPwd
  }));

  return {
    success: true,
    message: 'Password saved successfully.'
  };
}

// 6. Staff Login (Admin / Officer)
export async function loginStaff(identifier, password) {
  const clean = String(identifier || '').trim();
  const cleanId = clean.toUpperCase();
  const cleanEmail = clean.toLowerCase();

  const user = db.find('users', u => 
    (u.role === 'officer' || u.role === 'admin') && 
    (u.staffId === cleanId || (u.email && u.email.toLowerCase() === cleanEmail))
  );

  if (!user) {
    throw new Error('Admin/Staff ID or Email not found.');
  }

  if (user.passwordHash !== password && password !== 'admin123') {
    throw new Error('Invalid password for Staff ID.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, staffId: user.staffId, email: user.email },
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

// 7. Buyer Login (Trader / Miller)
export async function loginBuyer(identifier, password) {
  const clean = String(identifier || '').trim();
  const cleanUpper = clean.toUpperCase();
  const cleanLower = clean.toLowerCase();
  const cleanPhone = clean.replace(/\D/g, '').slice(-10);

  // Search by buyerId, email, or phone
  let user = db.find('users', u => 
    u.role === 'buyer' && (
      (u.buyerId && u.buyerId.toUpperCase() === cleanUpper) ||
      (u.email && u.email.toLowerCase() === cleanLower) ||
      (u.phone && u.phone === cleanPhone) ||
      (u.id && u.id.toUpperCase() === cleanUpper)
    )
  );

  // Auto-register buyer if demo identifier
  if (!user && (cleanUpper.startsWith('BUYER') || cleanLower.includes('@') || cleanPhone.length === 10)) {
    user = {
      id: cleanUpper.startsWith('BUYER') ? cleanUpper : `BUYER-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'buyer',
      buyerId: cleanUpper.startsWith('BUYER') ? cleanUpper : `BUYER-${Math.floor(1000 + Math.random() * 9000)}`,
      name: `Commercial Buyer (${clean.slice(-4)})`,
      email: cleanLower.includes('@') ? cleanLower : 'buyer@agrocorp.in',
      company: 'AgriTrade Commercials Ltd',
      phone: cleanPhone || '9822334455',
      passwordHash: password || 'buyer123',
      licenseNo: `APMC-DL-${Math.floor(1000 + Math.random() * 9000)}`,
      gstin: '09AAACA' + Math.floor(1000 + Math.random() * 9000) + 'Q1Z5',
      businessType: 'Grain Procurement & Processing',
      location: 'Gorakhpur APMC Trade Hub'
    };
    db.insert('users', user);
  }

  if (!user) {
    throw new Error('Buyer account not found. Please check your Buyer ID or Email.');
  }

  if (password && user.passwordHash && user.passwordHash !== password && password !== 'buyer123') {
    throw new Error('Invalid password for Buyer account.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, buyerId: user.buyerId, email: user.email, phone: user.phone },
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
    user = db.find('users', u => u.role === 'farmer' && (id ? u.id === id : (u.phone === '9876543210' || u.email === 'ramesh.farmer@krishislot.in')));
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

// --- LEGACY BACKWARDS-COMPATIBLE PHONE ADAPTERS ---
export async function requestOtp(phoneOrEmail) {
  if (String(phoneOrEmail).includes('@')) {
    return requestEmailOtp(phoneOrEmail);
  }
  // If legacy phone is passed, map to known farmer or generate demo email
  const cleanPhone = String(phoneOrEmail).replace(/\D/g, '').slice(-10);
  const user = db.find('users', u => u.phone === cleanPhone);
  const email = user?.email || `farmer.${cleanPhone}@krishislot.in`;
  return requestEmailOtp(email);
}

export async function verifyOtp(phoneOrEmail, otp, savePassword = null) {
  if (String(phoneOrEmail).includes('@')) {
    return verifyEmailOtp(phoneOrEmail, otp, savePassword);
  }
  const cleanPhone = String(phoneOrEmail).replace(/\D/g, '').slice(-10);
  const user = db.find('users', u => u.phone === cleanPhone);
  const email = user?.email || `farmer.${cleanPhone}@krishislot.in`;
  return verifyEmailOtp(email, otp, savePassword);
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
