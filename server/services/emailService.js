// server/services/emailService.js
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';
import dns from 'dns';
import dnsPromises from 'dns/promises';

// Force IPv4 resolution first across all Node sockets (crucial for Render/cloud deployment to prevent ENETUNREACH on IPv6)
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// Load .env variables
dotenv.config();

// Initialize Resend client with environment API key
export const resend = new Resend(process.env.RESEND_API_KEY || 're_not_set');

export const emailEvents = new EventEmitter();

// In-memory log of dispatched emails
const dispatchedEmails = [];

// Helper to get active email credentials
export function getEmailGatewayConfig() {
  dotenv.config();
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();

  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  if (gmailUser && gmailPass) {
    return {
      type: 'GMAIL',
      user: gmailUser,
      pass: gmailPass,
      host: 'smtp.gmail.com',
      port: 465,
      secure: true
    };
  }

  if (smtpUser && smtpPass) {
    return {
      type: 'SMTP',
      user: smtpUser,
      pass: smtpPass,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false'
    };
  }

  return null;
}

export function getEmailGatewayStatus() {
  const config = getEmailGatewayConfig();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const hasResend = Boolean(resendKey && resendKey !== 're_xxxxxxxxx' && !resendKey.includes('xxxx'));

  if (hasResend) {
    return {
      configured: true,
      gatewayType: 'RESEND_HTTPS',
      senderEmail: process.env.RESEND_FROM || 'AgriQueue <onboarding@resend.dev>'
    };
  }

  return {
    configured: Boolean(config),
    gatewayType: config ? config.type : 'SIMULATOR',
    senderEmail: config ? config.user : null
  };
}

// Resolve an explicit IPv4 address for smtp.gmail.com to guarantee zero IPv6 attempts on Render/Docker
async function resolveGmailIpv4() {
  try {
    const ips = await dnsPromises.resolve4('smtp.gmail.com');
    if (ips && ips.length > 0) {
      return ips[0];
    }
  } catch (e) {
    console.warn('[DNS WARNING] IPv4 resolution error, using fallback IPv4:', e.message);
  }
  return '142.250.102.108'; // Highly reliable Google SMTP IPv4 Anycast address
}

// Cached Dual Transporters (Port 465 SSL + Port 587 STARTTLS with forced IPv4)
let primaryTransporter = null;
let fallbackTransporter = null;
let lastConfigHash = '';

export async function getTransporters() {
  const config = getEmailGatewayConfig();
  if (!config) return { primary: null, fallback: null };

  const configHash = `${config.type}:${config.user}:${config.pass}:${config.host}:${config.port}`;
  if (primaryTransporter && lastConfigHash === configHash) {
    return { primary: primaryTransporter, fallback: fallbackTransporter };
  }

  try {
    if (config.type === 'GMAIL') {
      // Primary: Official Nodemailer Gmail service integration
      primaryTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.pass
        }
      });

      // Fallback: Port 587 STARTTLS direct
      fallbackTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    } else {
      primaryTransporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        auth: {
          user: config.user,
          pass: config.pass
        },
        connectionTimeout: 8000,
        greetingTimeout: 6000,
        socketTimeout: 12000,
        tls: {
          rejectUnauthorized: false
        }
      });
      fallbackTransporter = primaryTransporter;
    }

    lastConfigHash = configHash;
    return { primary: primaryTransporter, fallback: fallbackTransporter };
  } catch (err) {
    console.error('[EMAIL GATEWAY ERROR] Failed to initialize transporters:', err.message);
    return { primary: null, fallback: null };
  }
}

export async function getTransporter() {
  const { primary } = await getTransporters();
  return primary;
}

export const EMAIL_TEMPLATES = {
  OTP: ({ name, otp, expiresInMins = 10 }) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return {
      subject: `${otp} is your AgriQueue verification code [${timeStr}]`,
      text: `Namaste ${name || 'Farmer Friend'},\n\nYour AgriQueue login verification code is: ${otp}\n\nThis verification code is valid for ${expiresInMins} minutes. Please do not share this code with anyone.\n\nAgriQueue Smart APMC Portal`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <!-- Header Banner -->
          <div style="background:linear-gradient(135deg, #15803d 0%, #0f4324 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em">🌱 AgriQueue Platform</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9;font-weight:500">Smart Mandi & Procurement Platform</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 24px">
            <p style="font-size:16px;margin:0 0 14px;color:#0f2e1b">Namaste <b>${name || 'Farmer Friend'}</b>,</p>
            <p style="font-size:14px;color:#475563;margin:0 0 22px;line-height:1.6">
              You requested a login verification code for the AgriQueue portal. Use the official 6-digit OTP below to proceed:
            </p>

            <!-- OTP Card -->
            <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:14px;padding:22px 16px;text-align:center;margin-bottom:24px">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#166534;text-transform:uppercase;display:block;margin-bottom:8px">One-Time Verification Code (OTP)</span>
              <div style="font-size:38px;letter-spacing:0.3em;color:#15803d;font-weight:800;font-family:monospace;margin:4px 0">${otp}</div>
              <span style="font-size:12px;color:#16a34a;display:inline-block;margin-top:6px;font-weight:600">⏱️ Valid for ${expiresInMins} minutes</span>
            </div>

            <div style="background:#f8fafc;border-left:4px solid #15803d;padding:12px 14px;border-radius:6px;margin-bottom:20px;font-size:12.5px;color:#334155;line-height:1.5">
              🔒 <b>Security Note:</b> Never share this code with anyone. AgriQueue support will never ask for your OTP.
            </div>

            <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">
              If you did not request this login code, you can safely ignore this email. No access was granted.
            </p>

            <!-- Footer -->
            <div style="border-top:1px solid #f1f5f9;margin-top:24px;padding-top:18px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6">
              Agricultural Produce Market Committee (APMC) • AgriQueue Portal<br>
              Smart Mandi & Direct Benefit Transfer
            </div>
          </div>
        </div>
      </body>
      </html>
    `
    };
  },

  SIGNUP_OTP: ({ name, otp, expiresInMins = 5 }) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return {
      subject: `${otp} is your AgriQueue Registration Verification Code [${timeStr}]`,
      text: `Namaste ${name || 'Friend'},\n\nYour 6-digit registration code for AgriQueue is: ${otp}\n\nThis verification code is valid for ${expiresInMins} minutes. Please do not share this code with anyone.\n\nAgriQueue APMC Portal`,
      html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #064e3b 0%, #15803d 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <h1 style="margin:0;font-size:24px;font-weight:800">🌱 AgriQueue Account Registration</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Verify Your Email Address</p>
          </div>
          <div style="padding:28px 24px">
            <p style="font-size:16px;margin:0 0 14px;color:#0f2e1b">Namaste,</p>
            <p style="font-size:14px;color:#475563;margin:0 0 22px;line-height:1.6">
              Thank you for signing up with AgriQueue. Please enter the 6-digit verification code below to verify your email address and create your account:
            </p>
            <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:14px;padding:22px 16px;text-align:center;margin-bottom:24px">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#166534;text-transform:uppercase;display:block;margin-bottom:8px">Registration Verification Code</span>
              <div style="font-size:40px;letter-spacing:0.3em;color:#15803d;font-weight:900;font-family:monospace;margin:4px 0">${otp}</div>
              <span style="font-size:12px;color:#16a34a;display:inline-block;margin-top:6px;font-weight:700">⏱️ Valid for ${expiresInMins} minutes</span>
            </div>
            <div style="background:#f8fafc;border-left:4px solid #16a34a;padding:12px 14px;border-radius:6px;margin-bottom:20px;font-size:13px;color:#334155;line-height:1.5">
              🔒 <b>Security Note:</b> Never share this code with anyone. AgriQueue officials will never ask for your verification code.
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">
              If you did not initiate this registration, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
      </html>
      `
    };
  },

  PASSWORD_RESET_OTP: ({ name, otp, expiresInMins = 5 }) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return {
      subject: `${otp} is your AgriQueue Password Reset Code [${timeStr}]`,
      text: `Namaste ${name || 'User'},\n\nWe received a request to reset your AgriQueue account password.\n\nYour 6-digit reset code is: ${otp}\n\nThis code is valid for ${expiresInMins} minutes. If you did not request this, please secure your account immediately.\n\nAgriQueue APMC Portal`,
      html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #991b1b 0%, #dc2626 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <h1 style="margin:0;font-size:24px;font-weight:800">🔑 Password Reset Request</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">AgriQueue Account Security</p>
          </div>
          <div style="padding:28px 24px">
            <p style="font-size:16px;margin:0 0 14px;color:#0f2e1b">Namaste ${name ? `<b>${name}</b>` : ''},</p>
            <p style="font-size:14px;color:#475563;margin:0 0 22px;line-height:1.6">
              We received a request to reset your password. Use the 6-digit code below to verify your identity and set a new password:
            </p>
            <div style="background:#fef2f2;border:2px dashed #f87171;border-radius:14px;padding:22px 16px;text-align:center;margin-bottom:24px">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#991b1b;text-transform:uppercase;display:block;margin-bottom:8px">Password Reset OTP</span>
              <div style="font-size:40px;letter-spacing:0.3em;color:#dc2626;font-weight:900;font-family:monospace;margin:4px 0">${otp}</div>
              <span style="font-size:12px;color:#b91c1c;display:inline-block;margin-top:6px;font-weight:700">⏱️ Valid for ${expiresInMins} minutes</span>
            </div>
            <div style="background:#fffbeb;border-left:4px solid #d97706;padding:12px 14px;border-radius:6px;margin-bottom:20px;font-size:13px;color:#92400e;line-height:1.5">
              ⚠️ <b>Security Alert:</b> If you did not request a password reset, someone may be attempting to access your account. Do not share this code.
            </div>
          </div>
        </div>
      </body>
      </html>
      `
    };
  },

  SLOT_CONFIRMED: ({ name, token, crop, centre, date, time, vehicle, quantity, bookingId }) => ({
    subject: `🌾 Slot Confirmed: Gate Token #${token} — AgriQueue APMC`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour APMC procurement slot is confirmed!\n\nGate Token: #${token}\nDate: ${date}\nTime Slot: ${time}\nProcurement Mandi: ${centre}\nCrop Harvest: ${crop}\nQuantity: ${quantity} quintals\nVehicle: ${vehicle || 'Tractor Trolley'}\n\nPlease arrive 15 minutes prior to your time window. Keep your Aadhaar and Bank Passbook ready.\n\nAgriQueue APMC Portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #15803d 0%, #0f4324 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <div style="font-size:38px;margin-bottom:6px">🌾</div>
            <h1 style="margin:0;font-size:22px;font-weight:800">Procurement Slot Confirmed!</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Official Gate Entry Pass • AgriQueue APMC Network</p>
          </div>

          <div style="padding:26px 24px">
            <p style="font-size:15px;margin:0 0 14px;color:#0f2e1b">Namaste <b>${name || 'Farmer Friend'}</b>,</p>
            <p style="font-size:13.5px;color:#475563;margin:0 0 20px;line-height:1.5">
              Your crop delivery slot at <b>${centre}</b> has been officially scheduled. Please present this gate pass upon vehicle arrival.
            </p>

            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:18px 20px;margin-bottom:20px;text-align:center">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#166534;text-transform:uppercase;display:block">Mandi Gate Entry Token</span>
              <div style="font-size:36px;color:#15803d;font-weight:900;letter-spacing:0.05em;margin:4px 0">#${token}</div>
              <span style="font-size:12.5px;color:#16a34a;font-weight:600">📅 ${date} • ⏱️ ${time}</span>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Procurement Mandi:</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f2e1b">${centre}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Crop Harvest:</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f2e1b">${crop}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Expected Volume:</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f2e1b">${quantity} quintals</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:8px 0;color:#64748b">Vehicle Type:</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#0f2e1b">${vehicle || 'Tractor Trolley'}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b">Booking Ref:</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#64748b;font-family:monospace">${bookingId || 'BK-2026-AUTOPASS'}</td></tr>
            </table>

            <div style="background:#f8fafc;border-left:4px solid #15803d;padding:12px 14px;border-radius:6px;font-size:12px;color:#334155;line-height:1.5;margin-bottom:18px">
              📌 <b>Mandi Arrival Checklist:</b><br>
              • Arrive 15 minutes before your scheduled window at Counter 1.<br>
              • Keep your Aadhaar and Bank Passbook ready for MSP DBT verification.<br>
              • Ensure moisture is below FAQ limits (Paddy &le; 17%, Wheat &le; 12%).
            </div>

            <div style="border-top:1px solid #f1f5f9;padding-top:16px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5">
              Agricultural Produce Market Committee (APMC) • Government of India<br>
              AgriQueue Smart Mandi & DBT Clearing System
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  JFORM_ISSUED: ({ name, receiptId, crop, grossWeight, tareWeight, netWeight, mspRate, amount, centre, date, bankName, bankAccMasked }) => ({
    subject: `🏛️ J-Form Issued: #${receiptId} (₹${Number(amount).toLocaleString('en-IN')}) — AgriQueue APMC`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour official APMC Procurement J-Form #${receiptId} has been generated.\n\nCrop: ${crop}\nNet Weight: ${netWeight} quintals\nMSP Rate: ₹${mspRate}/qtl\nTotal Payable: ₹${Number(amount).toLocaleString('en-IN')}\nMandi Centre: ${centre}\nDate: ${date}\n\nDBT payment has been dispatched via PFMS to ${bankName} (${bankAccMasked}).\n\nAgriQueue APMC Portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #15803d 0%, #064e3b 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <h1 style="margin:0;font-size:22px;font-weight:800">Official J-Form Receipt</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Govt. Procurement Certificate • #${receiptId}</p>
          </div>

          <div style="padding:26px 24px">
            <p style="font-size:15px;margin:0 0 14px;color:#0f2e1b">Namaste <b>${name || 'Farmer Friend'}</b>,</p>
            <p style="font-size:13.5px;color:#475563;margin:0 0 20px;line-height:1.5">
              Digital weighment for your harvest at <b>${centre}</b> has concluded. Your J-Form has been submitted to the Treasury for DBT settlement.
            </p>

            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:20px;text-align:center;margin-bottom:20px">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#166534;text-transform:uppercase;display:block">Net Payable MSP Amount</span>
              <div style="font-size:36px;color:#15803d;font-weight:900;margin:4px 0">₹${Number(amount).toLocaleString('en-IN')}</div>
              <span style="font-size:12.5px;color:#16a34a;font-weight:600">Net Weight: ${netWeight} qtl • MSP: ₹${mspRate}/qtl</span>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:7px 0;color:#64748b">Crop Commodity:</td><td style="padding:7px 0;text-align:right;font-weight:700">${crop}</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:7px 0;color:#64748b">Gross Weight:</td><td style="padding:7px 0;text-align:right;font-weight:600">${grossWeight} qtl</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:7px 0;color:#64748b">Tare (Vehicle):</td><td style="padding:7px 0;text-align:right;font-weight:600">${tareWeight} qtl</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:7px 0;color:#64748b">Net Assayed:</td><td style="padding:7px 0;text-align:right;font-weight:800;color:#15803d">${netWeight} quintals</td></tr>
              <tr style="border-bottom:1px solid #f1f5f9"><td style="padding:7px 0;color:#64748b">Target Bank Account:</td><td style="padding:7px 0;text-align:right;font-weight:700">${bankName} (${bankAccMasked})</td></tr>
              <tr><td style="padding:7px 0;color:#64748b">Procurement Date:</td><td style="padding:7px 0;text-align:right;font-weight:700">${date}</td></tr>
            </table>

            <div style="border-top:1px solid #f1f5f9;padding-top:16px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5">
              Agricultural Produce Market Committee (APMC) • Government of India<br>
              AgriQueue Smart Mandi & Direct Benefit Transfer
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  PAYMENT_CREDITED: ({ name, amount, bank, utr, receiptId }) => ({
    subject: `💰 ₹${Number(amount).toLocaleString('en-IN')} DBT Payment Credited — AgriQueue APMC`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour MSP payment of ₹${Number(amount).toLocaleString('en-IN')} for J-Form #${receiptId} has been credited to your bank account at ${bank}.\n\nBank UTR: ${utr}\n\nAgriQueue APMC Portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #15803d 0%, #064e3b 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <div style="font-size:38px;margin-bottom:6px">💰</div>
            <h1 style="margin:0;font-size:22px;font-weight:800">DBT Payment Credited!</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Direct Benefit Transfer • PFMS Clearing Cleared</p>
          </div>

          <div style="padding:26px 24px">
            <p style="font-size:15px;margin:0 0 14px;color:#0f2e1b">Namaste <b>${name || 'Farmer Friend'}</b>,</p>
            <p style="font-size:13.5px;color:#475563;margin:0 0 20px;line-height:1.5">
              The MSP procurement payment for your J-Form receipt <b>#${receiptId}</b> has been successfully credited directly to your bank account via PFMS DBT.
            </p>

            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:14px;padding:20px;text-align:center;margin-bottom:20px">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#166534;text-transform:uppercase;display:block">Amount Credited</span>
              <div style="font-size:36px;color:#15803d;font-weight:900;margin:4px 0">₹${Number(amount).toLocaleString('en-IN')}</div>
              <span style="font-size:12.5px;color:#16a34a;font-weight:600">Bank: ${bank} • UTR: ${utr}</span>
            </div>

            <div style="border-top:1px solid #f1f5f9;padding-top:16px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5">
              Agricultural Produce Market Committee (APMC) • Government of India<br>
              AgriQueue Direct Benefit Transfer (DBT) Mission
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

export async function sendEmail({ to, recipientName = 'User', type = 'OTP', data = {}, customSubject, customHtml }) {
  const cleanEmail = String(to || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }

  let templateContent = { subject: customSubject || 'AgriQueue Notification', text: '', html: customHtml || '' };
  if (EMAIL_TEMPLATES[type]) {
    templateContent = EMAIL_TEMPLATES[type]({ name: recipientName, ...data });
  }

  const emailRecord = {
    id: `EML-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    to: cleanEmail,
    recipientName,
    type,
    subject: templateContent.subject,
    bodyText: templateContent.text,
    bodyHtml: templateContent.html,
    timestamp: new Date().toISOString(),
    status: 'DELIVERED',
    provider: 'VIRTUAL_SIMULATOR',
    isReal: false
  };

  // 1. Priority: HTTP-based REST Email Gateway (Resend SDK)
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const resendFrom = process.env.RESEND_FROM || 'AgriQueue <onboarding@resend.dev>';
  const isOnboardingDomain = resendFrom.includes('onboarding@resend.dev');

  // Resend on free onboarding@resend.dev strictly limits recipients to account owner (vanshmavi018@gmail.com).
  // If sending to ANY other recipient, route immediately to Gmail SMTP to deliver in 1-2 seconds with zero 403 error.
  const canSendViaResend = Boolean(
    resendKey && 
    resendKey !== 're_xxxxxxxxx' && 
    !resendKey.includes('xxxx') && 
    (!isOnboardingDomain || cleanEmail === 'vanshmavi018@gmail.com')
  );

  if (canSendViaResend) {
    try {
      console.log(`[EMAIL GATEWAY] Dispatching via Resend SDK (HTTPS Port 443) to ${cleanEmail}...`);
      const resendClient = new Resend(process.env.RESEND_API_KEY || resendKey);
      const resendResponse = await resendClient.emails.send({
        from: resendFrom,
        to: cleanEmail,
        subject: templateContent.subject,
        html: templateContent.html,
        text: templateContent.text
      });

      if (resendResponse.error) {
        throw new Error(resendResponse.error.message || 'Resend SDK dispatch error');
      }

      const messageId = resendResponse.data?.id || resendResponse.id || `resend-${Date.now()}`;
      emailRecord.status = 'SENT';
      emailRecord.provider = 'RESEND_HTTPS';
      emailRecord.messageId = messageId;
      emailRecord.isReal = true;
      console.log(`\n[REAL RESEND DISPATCH SUCCESS] -> Sent to: ${cleanEmail} (MessageId: ${messageId})\n`);

      if (data?.otp) {
        console.log(`🔑 [OTP DISPATCH] Destination: ${cleanEmail} | Verification Code: ${data.otp} | Real Email Sent: true\n`);
      }
      dispatchedEmails.unshift(emailRecord);
      if (dispatchedEmails.length > 50) dispatchedEmails.pop();
      emailEvents.emit('email_sent', emailRecord);
      return emailRecord;
    } catch (resendErr) {
      console.warn('[RESEND WARNING] Failed via Resend SDK:', resendErr.message);
    }
  }

  // 2. High-speed Direct Google SMTP Gateway (Port 465 SSL / Port 587 STARTTLS)
  const { primary, fallback } = await getTransporters();
  const config = getEmailGatewayConfig();

  if (primary && config) {
    const fromAddress = `"AgriQueue" <${config.user}>`;
    const mailOptions = {
      from: fromAddress,
      to: cleanEmail,
      replyTo: config.user,
      subject: templateContent.subject,
      text: templateContent.text,
      html: templateContent.html,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MSMail-Priority': 'High'
      }
    };

    let info = null;
    let usedPort = 465;

    try {
      console.log(`[EMAIL GATEWAY] Sending live email via Google SMTP (Port 465) to ${cleanEmail}...`);
      info = await primary.sendMail(mailOptions);
    } catch (err465) {
      console.warn(`[EMAIL GATEWAY] Port 465 attempt: ${err465.message}. Retrying via Port 587 STARTTLS...`);
      try {
        if (fallback) {
          usedPort = 587;
          info = await fallback.sendMail(mailOptions);
        } else {
          throw err465;
        }
      } catch (err587) {
        console.error(`\n[GMAIL SMTP ERROR] Both Port 465 and Port 587 failed for ${cleanEmail}:`, err587.message);
        emailRecord.status = 'FAILED';
        emailRecord.providerError = err587.message;
        emailRecord.isReal = false;
      }
    }

    if (info) {
      emailRecord.status = 'SENT';
      emailRecord.provider = 'GMAIL_REAL';
      emailRecord.messageId = info.messageId;
      emailRecord.isReal = true;
      console.log(`\n[REAL GMAIL DISPATCH SUCCESS] -> Sent to: ${cleanEmail} via Port ${usedPort} (MessageId: ${info.messageId}) (Server: ${info.response})\n`);
    }
  } else {
    console.log(`\n[VIRTUAL EMAIL DISPATCH] -> To: ${cleanEmail}`);
    console.log(`Subject: ${templateContent.subject}`);
  }

  if (data?.otp) {
    console.log(`🔑 [OTP DISPATCH] Destination: ${cleanEmail} | Verification Code: ${data.otp} | Real Email Sent: ${emailRecord.isReal}\n`);
  }

  dispatchedEmails.unshift(emailRecord);
  if (dispatchedEmails.length > 50) dispatchedEmails.pop();

  emailEvents.emit('email_sent', emailRecord);

  return emailRecord;
}

export function getDispatchedEmails(email = null) {
  if (email) {
    const clean = String(email).trim().toLowerCase();
    return dispatchedEmails.filter(e => e.to === clean);
  }
  return dispatchedEmails;
}
