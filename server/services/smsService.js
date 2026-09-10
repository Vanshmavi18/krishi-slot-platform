// server/services/smsService.js
import { db } from '../data/db.js';
import { EventEmitter } from 'events';

export const smsEvents = new EventEmitter();

export const TEMPLATES = {
  OTP: ({ otp, name }) => 
    `एग्रीक्यू (AgriQueue) सत्यापन कोड: ${otp} है। यह OTP 10 मिनट के लिए मान्य है। कृपया इसे किसी के साथ साझा न करें। - APMC AGRIQUEUE`,

  SLOT_CONFIRMED: ({ name, crop, centre, date, time, token }) =>
    `प्रिय ${name}, आपका ${crop} खरीद स्लॉट ${centre} पर ${date} (${time}) के लिए कन्फर्म हो गया है। आपका टोकन #${token} है। कृपया समय से 15 मिनट पहले पहुंचें। - AgriQueue`,

  QUEUE_PROXIMITY: ({ name, token, centre, counter, ahead }) =>
    `⚠️ जरूरी सूचना: प्रिय ${name}, आपके टोकन #${token} के आगे केवल ${ahead} किसान बाकी हैं। कृपया तुरंत ${centre} के काउंटर ${counter} पर रिपोर्ट करें। - AgriQueue`,

  WEIGHMENT_SLIP: ({ name, crop, netWeight, amount, receiptId }) =>
    `प्रिय ${name}, आपकी ${crop} की कुल ${netWeight} क्विंटल तुलाई पूरी हुई। कुल देय राशि: ₹${amount.toLocaleString('en-IN')}। डिजिटल रसीद #${receiptId} जारी की गई है। - AgriQueue`,

  PAYMENT_CREDITED: ({ name, amount, bank, utr, receiptId }) =>
    `प्रिय ${name}, रसीद #${receiptId} के लिए ₹${amount.toLocaleString('en-IN')} की DBT राशि आपके ${bank} खाते में जमा कर दी गई है। UTR संख्या: ${utr}। - AgriQueue DBT`,

  BROADCAST_DELAY: ({ centre, reason, delayMins }) =>
    `सूचना: ${centre} पर ${reason || 'तकनीकी कारण'} के चलते स्लॉट लगभग ${delayMins || 45} मिनट विलंबित हैं। कृपया अपनी सुविधानुसार समय समायोजित करें। - AgriQueue APMC`
};

export async function sendSms({ phone, recipientName = 'किसान मित्र', type, data, customText }) {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  
  let messageText = customText;
  if (!messageText && TEMPLATES[type]) {
    messageText = TEMPLATES[type]({ name: recipientName, ...data });
  } else if (!messageText) {
    messageText = `AgriQueue Alert: Update for token #${data?.token || ''}`;
  }

  const smsRecord = {
    id: `SMS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    phone: cleanPhone,
    recipientName,
    senderId: 'AQ-MANDI',
    type: type || 'ALERT',
    message: messageText,
    timestamp: new Date().toISOString(),
    status: 'DELIVERED',
    gateway: process.env.SMS_GATEWAY_TYPE || 'VIRTUAL_SIMULATOR'
  };

  // 1. External Gateway Fast2SMS (Real SMS to Indian Mobile Numbers)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey) {
    try {
      if (type === 'OTP' && data?.otp) {
        // High priority OTP Route via Fast2SMS
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2SmsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: String(data.otp),
            numbers: cleanPhone
          })
        });

        const result = await response.json();
        console.log(`[FAST2SMS OTP GATEWAY] -> Phone: +91 ${cleanPhone} | Response:`, result);

        if (result && result.return) {
          smsRecord.gateway = 'FAST2SMS_REAL';
          smsRecord.status = 'SENT';
          smsRecord.gatewayRequestId = result.request_id;
        } else {
          console.warn(`[FAST2SMS ERROR]`, result?.message);
          smsRecord.gatewayError = Array.isArray(result?.message) ? result.message.join(', ') : result?.message;
        }
      } else {
        // Quick SMS Route for alerts and confirmations
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2SmsKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'q',
            message: messageText,
            language: 'english',
            flash: 0,
            numbers: cleanPhone
          })
        });

        const result = await response.json();
        console.log(`[FAST2SMS QUICK ALERT] -> Phone: +91 ${cleanPhone} | Response:`, result);
        if (result && result.return) {
          smsRecord.gateway = 'FAST2SMS_REAL';
          smsRecord.status = 'SENT';
        }
      }
    } catch (err) {
      console.warn('Fast2SMS gateway network error:', err.message);
      smsRecord.gatewayError = err.message;
    }
  }

  // 2. Persist in database
  db.insert('smsLogs', smsRecord);

  // 3. Emit real-time event for SSE
  smsEvents.emit('sms_sent', smsRecord);

  console.log(`\n[SMS DISPATCHED] -> To: +91 ${cleanPhone} | Type: ${type}`);
  console.log(`"${messageText}"\n`);

  return smsRecord;
}

export function getSmsLogs(phone = null) {
  const logs = db.get('smsLogs') || [];
  if (phone) {
    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    return logs.filter(l => l.phone === cleanPhone);
  }
  return logs;
}
