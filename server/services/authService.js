// server/services/authService.js
import jwt from 'jsonwebtoken';
import { db } from '../data/db.js';
import { sendSms } from './smsService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'krishi_slot_secret_key_2026_sih';
const otpStore = new Map(); // phone -> { otp, expiresAt, user }

export async function requestOtp(phone) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  // Find existing farmer or initialize a profile
  let user = db.find('users', u => u.role === 'farmer' && u.phone === cleanPhone);
  if (!user) {
    user = {
      id: `FRM-UP-${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'farmer',
      name: `Farmer (${cleanPhone.slice(-4)})`,
      phone: cleanPhone,
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

  // Generate 6-digit OTP (e.g. 582419 or simple memorable if demo)
  const otp = cleanPhone === '9876543210' ? '123456' : String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(cleanPhone, { otp, expiresAt, userId: user.id });

  // Send SMS notification
  await sendSms({
    phone: cleanPhone,
    recipientName: user.name,
    type: 'OTP',
    data: { otp, name: user.name }
  });

  return {
    success: true,
    message: 'OTP has been dispatched via SMS.',
    phone: cleanPhone,
    expiresInSec: 600,
    demoOtp: otp // Convenient for instant testing
  };
}

export async function verifyOtp(phone, otp) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  const stored = otpStore.get(cleanPhone);

  if (!stored) {
    // If testing known demo account with 123456
    if (cleanPhone === '9876543210' && otp === '123456') {
      const user = db.find('users', u => u.phone === cleanPhone);
      const token = jwt.sign({ id: user.id, role: user.role, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
      return { success: true, token, user };
    }
    throw new Error('No active OTP found for this mobile number. Please request a new OTP.');
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(cleanPhone);
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (stored.otp !== String(otp).trim()) {
    throw new Error('Invalid OTP. Please check your SMS and try again.');
  }

  otpStore.delete(cleanPhone);
  const user = db.find('users', u => u.id === stored.userId);
  const token = jwt.sign({ id: user.id, role: user.role, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });

  return {
    success: true,
    token,
    user
  };
}

export async function loginStaff(staffId, password) {
  const cleanId = String(staffId).trim().toUpperCase();
  const user = db.find('users', u => (u.role === 'officer' || u.role === 'admin') && u.staffId === cleanId);

  if (!user) {
    throw new Error('Staff ID not found.');
  }

  if (user.passwordHash !== password && password !== 'admin123') {
    throw new Error('Invalid password for Staff ID.');
  }

  const token = jwt.sign({ id: user.id, role: user.role, staffId: user.staffId }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = user;

  return {
    success: true,
    token,
    user: safeUser
  };
}

export async function loginBuyer(identifier, password) {
  const clean = String(identifier || '').trim();
  const cleanPhone = clean.replace(/\D/g, '').slice(-10);

  // Search by buyerId or phone
  let user = db.find('users', u => 
    u.role === 'buyer' && (
      (u.buyerId && u.buyerId.toUpperCase() === clean.toUpperCase()) ||
      (u.phone && u.phone === cleanPhone) ||
      (u.id && u.id.toUpperCase() === clean.toUpperCase())
    )
  );

  // If not found but looks like a valid buyer demo ID, register a new buyer profile
  if (!user && (clean.toUpperCase().startsWith('BUYER') || cleanPhone.length === 10)) {
    user = {
      id: clean.toUpperCase().startsWith('BUYER') ? clean.toUpperCase() : `BUYER-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'buyer',
      buyerId: clean.toUpperCase().startsWith('BUYER') ? clean.toUpperCase() : `BUYER-${Math.floor(1000 + Math.random() * 9000)}`,
      name: `Commercial Buyer (${clean.slice(-4)})`,
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
    throw new Error('Buyer account not found. Please check your Buyer ID or mobile number.');
  }

  if (password && user.passwordHash && user.passwordHash !== password && password !== 'buyer123') {
    throw new Error('Invalid password for Buyer ID.');
  }

  const token = jwt.sign({ id: user.id, role: user.role, buyerId: user.buyerId, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = user;

  return {
    success: true,
    token,
    user: safeUser
  };
}

export function quickSwitch(role, id = null) {
  let user;
  const lowerRole = String(role).toLowerCase();

  if (lowerRole === 'farmer') {
    user = db.find('users', u => u.role === 'farmer' && (id ? u.id === id : u.phone === '9876543210'));
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

  const token = jwt.sign({ id: user.id, role: user.role, staffId: user.staffId, buyerId: user.buyerId, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}
