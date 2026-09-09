// server/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

// Load .env variables
dotenv.config();

export const emailEvents = new EventEmitter();

// In-memory log of dispatched emails
const dispatchedEmails = [];

// Helper to get active email credentials
export function getEmailGatewayConfig() {
  dotenv.config();
  // Cloud deployment fallbacks (Render/Heroku/Vercel)
  const defaultUser = 'vanshmavi018@gmail.com';
  const defaultPass = 'vqvtnvteehvucjud';

  const gmailUser = (process.env.GMAIL_USER || defaultUser).trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || defaultPass).replace(/\s+/g, '').trim();

  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim();

  if (gmailUser && gmailPass) {
    return {
      type: 'GMAIL',
      user: gmailUser,
      pass: gmailPass,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false
    };
  }

  if (smtpUser && smtpPass) {
    return {
      type: 'SMTP',
      user: smtpUser,
      pass: smtpPass,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true'
    };
  }

  return null;
}

export function getEmailGatewayStatus() {
  const config = getEmailGatewayConfig();
  return {
    configured: Boolean(config),
    gatewayType: config ? config.type : 'SIMULATOR',
    senderEmail: config ? config.user : null
  };
}

// Create cached transporter
let transporterInstance = null;
let lastConfigHash = '';

function getTransporter() {
  const config = getEmailGatewayConfig();
  if (!config) return null;

  const configHash = `${config.type}:${config.user}:${config.pass}:${config.host}:${config.port}`;
  if (transporterInstance && lastConfigHash === configHash) {
    return transporterInstance;
  }

  try {
    if (config.type === 'GMAIL') {
      transporterInstance = nodemailer.createTransport({
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
      transporterInstance = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    lastConfigHash = configHash;
    console.log(`[EMAIL GATEWAY] Connected to ${config.type} SMTP transport (${config.user}) via Port 587 STARTTLS`);
    return transporterInstance;
  } catch (err) {
    console.error('[EMAIL GATEWAY ERROR] Failed to initialize transporter:', err.message);
    return null;
  }
}

export const EMAIL_TEMPLATES = {
  OTP: ({ name, otp, expiresInMins = 10 }) => ({
    subject: `Your KrishiSlot Verification Code: ${otp}`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour KrishiSlot login verification OTP is: ${otp}\n\nThis verification code is valid for ${expiresInMins} minutes. Please do not share this code with anyone.\n\nKrishiSlot Smart Mandi & APMC Procurement Platform`,
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
            <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em">KrishiSlot Platform</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9;font-weight:500">Smart APMC Mandi Procurement Portal</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 24px">
            <p style="font-size:16px;margin:0 0 14px;color:#0f2e1b">Namaste <b>${name || 'Farmer Friend'}</b>,</p>
            <p style="font-size:14px;color:#475563;margin:0 0 22px;line-height:1.6">
              You requested a login verification code for the KrishiSlot portal. Use the official 6-digit OTP below to proceed:
            </p>

            <!-- OTP Card -->
            <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:14px;padding:22px 16px;text-align:center;margin-bottom:24px">
              <span style="font-size:11px;font-weight:800;letter-spacing:0.12em;color:#166534;text-transform:uppercase;display:block;margin-bottom:8px">One-Time Verification Code (OTP)</span>
              <div style="font-size:38px;letter-spacing:0.3em;color:#15803d;font-weight:800;font-family:monospace;margin:4px 0">${otp}</div>
              <span style="font-size:12px;color:#16a34a;display:inline-block;margin-top:6px;font-weight:600">⏱️ Valid for ${expiresInMins} minutes</span>
            </div>

            <div style="background:#f8fafc;border-left:4px solid #15803d;padding:12px 14px;border-radius:6px;margin-bottom:20px;font-size:12.5px;color:#334155;line-height:1.5">
              🔒 <b>Security Note:</b> Never share this code with anyone. KrishiSlot support will never ask for your OTP.
            </div>

            <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">
              If you did not request this login code, you can safely ignore this email. No access was granted.
            </p>

            <!-- Footer -->
            <div style="border-top:1px solid #f1f5f9;margin-top:24px;padding-top:18px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6">
              Agricultural Produce Market Committee (APMC) • KrishiSlot Portal<br>
              Smart Mandi & Direct Benefit Transfer
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  SLOT_CONFIRMED: ({ name, token, crop, centre, date, time, vehicle, quantity, bookingId }) => ({
    subject: `🌾 Slot Confirmed: Gate Token #${token} — KrishiSlot APMC`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour APMC procurement slot is confirmed!\n\nGate Token: #${token}\nDate: ${date}\nTime Slot: ${time}\nProcurement Mandi: ${centre}\nCrop Harvest: ${crop}\nQuantity: ${quantity} quintals\nVehicle: ${vehicle || 'Tractor Trolley'}\n\nPlease arrive 15 minutes prior to your time window. Keep your Aadhaar and Bank Passbook ready.\n\nKrishiSlot APMC Portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #15803d 0%, #0f4324 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <div style="font-size:38px;margin-bottom:6px">🌾</div>
            <h1 style="margin:0;font-size:22px;font-weight:800">Procurement Slot Confirmed!</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Official Gate Entry Pass • Agricultural Produce Market Committee</p>
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
              KrishiSlot Smart Mandi & DBT Clearing System
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  JFORM_ISSUED: ({ name, receiptId, crop, grossWeight, tareWeight, netWeight, mspRate, amount, centre, date, bankName, bankAccMasked }) => ({
    subject: `🏛️ J-Form Issued: #${receiptId} (₹${Number(amount).toLocaleString('en-IN')}) — KrishiSlot APMC`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour official APMC Procurement J-Form #${receiptId} has been generated.\n\nCrop: ${crop}\nNet Weight: ${netWeight} quintals\nMSP Rate: ₹${mspRate}/qtl\nTotal Payable: ₹${Number(amount).toLocaleString('en-IN')}\nMandi Centre: ${centre}\nDate: ${date}\n\nDBT payment has been dispatched via PFMS to ${bankName} (${bankAccMasked}).\n\nKrishiSlot APMC Portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px 10px;background:#f8fafc;color:#1e293b">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.06)">
          <div style="background:linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);padding:28px 24px;text-align:center;color:#ffffff">
            <div style="font-size:38px;margin-bottom:6px">🏛️</div>
            <h1 style="margin:0;font-size:22px;font-weight:800">Official APMC J-Form Issued</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.9">Government Procurement Receipt & DBT Claim</p>
          </div>

          <div style="padding:26px 24px">
            <div style="display:flex;justify-content:space-between;margin-bottom:16px;background:#f1f5f9;padding:10px 14px;border-radius:10px;font-size:12.5px">
              <span>Receipt No: <b style="color:#0f172a">#${receiptId}</b></span>
              <span>Date: <b>${date}</b></span>
            </div>

            <p style="font-size:14px;margin:0 0 16px;color:#0f2e1b">Seller: <b>${name || 'Farmer Friend'}</b> • Mandi: <b>${centre}</b></p>

            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:8px">
              <tr style="background:#f8fafc;font-weight:700;border-bottom:1px solid #e2e8f0">
                <th style="padding:8px 10px;text-align:left">Commodity</th>
                <th style="padding:8px 10px;text-align:right">Gross</th>
                <th style="padding:8px 10px;text-align:right">Tare</th>
                <th style="padding:8px 10px;text-align:right">Net Wt</th>
              </tr>
              <tr>
                <td style="padding:8px 10px;font-weight:700">${crop}</td>
                <td style="padding:8px 10px;text-align:right">${grossWeight} qtl</td>
                <td style="padding:8px 10px;text-align:right">${tareWeight} qtl</td>
                <td style="padding:8px 10px;text-align:right;color:#15803d;font-weight:800">${netWeight} qtl</td>
              </tr>
            </table>

            <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:12px;padding:16px;margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
                <span style="color:#475563">Government MSP Rate:</span>
                <b>₹${Number(mspRate).toLocaleString('en-IN')} / quintal</b>
              </div>
              <div style="display:flex;justify-content:space-between;border-top:1px solid #bbf7d0;padding-top:8px;font-size:16px">
                <span style="font-weight:800;color:#166534">Total DBT Amount Payable:</span>
                <b style="font-size:22px;color:#15803d;font-weight:900">₹${Number(amount).toLocaleString('en-IN')}</b>
              </div>
            </div>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:12px;color:#334155;margin-bottom:18px">
              💳 <b>Direct Benefit Transfer (DBT) Status:</b><br>
              Payment initiated to <b>${bankName}</b> (${bankAccMasked}) via Public Financial Management System (PFMS). Expected credit within 48-72 hours.
            </div>

            <div style="border-top:1px solid #f1f5f9;padding-top:16px;font-size:11px;color:#94a3b8;text-align:center;line-height:1.5">
              Agricultural Produce Market Committee (APMC) • Government of India<br>
              National Agriculture Market (e-NAM) & DBT Directorate
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  PAYMENT_CREDITED: ({ name, amount, bank, utr, receiptId }) => ({
    subject: `💰 ₹${Number(amount).toLocaleString('en-IN')} DBT Payment Credited — KrishiSlot APMC`,
    text: `Namaste ${name || 'Farmer Friend'},\n\nYour MSP payment of ₹${Number(amount).toLocaleString('en-IN')} for J-Form #${receiptId} has been credited to your bank account at ${bank}.\n\nBank UTR: ${utr}\n\nKrishiSlot APMC Portal`,
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
              Direct Benefit Transfer (DBT) Mission
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

  let templateContent = { subject: customSubject || 'KrishiSlot Notification', text: '', html: customHtml || '' };
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

  const transporter = getTransporter();
  const config = getEmailGatewayConfig();

  if (transporter && config) {
    try {
      const fromAddress = `"KrishiSlot Verification" <${config.user}>`;
      const info = await transporter.sendMail({
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
          'X-Mailer': 'KrishiSlot Auth Service'
        }
      });

      emailRecord.status = 'SENT';
      emailRecord.provider = config.type === 'GMAIL' ? 'GMAIL_REAL' : 'SMTP_RELAY';
      emailRecord.messageId = info.messageId;
      emailRecord.isReal = true;

      console.log(`\n[REAL GMAIL DISPATCH SUCCESS] -> Sent to: ${cleanEmail} (MessageId: ${info.messageId})`);
    } catch (err) {
      console.error(`\n[GMAIL SMTP ERROR] Failed to send email to ${cleanEmail}:`, err.message);
      emailRecord.status = 'FAILED';
      emailRecord.providerError = err.message;
    }
  } else {
    console.log(`\n[VIRTUAL EMAIL DISPATCH] -> To: ${cleanEmail}`);
    console.log(`Subject: ${templateContent.subject}`);
    if (data?.otp) {
      console.log(`🔑 Verification OTP: ${data.otp} (Valid for 10 minutes)`);
      console.log(`💡 To receive this on your real Gmail inbox, set GMAIL_USER and GMAIL_APP_PASSWORD in .env!`);
    }
    console.log(`\n`);
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
