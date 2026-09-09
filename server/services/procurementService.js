// server/services/procurementService.js
import { db } from '../data/db.js';
import { sendSms } from './smsService.js';
import { sendEmail } from './emailService.js';
import { createNotification } from './notificationService.js';

export function getProcurements(farmerId = null) {
  const all = db.get('procurements') || [];
  if (farmerId) {
    return all.filter(p => p.farmerId === farmerId);
  }
  return all;
}

export function getProcurementById(id) {
  const p = db.find('procurements', x => x.id === id);
  if (!p) throw new Error('Procurement record not found');
  return p;
}

export async function createProcurement({
  token,
  farmerId,
  bookingId,
  cropId = 'paddy_comm',
  grossWeight,
  tareWeight,
  moisturePercent = 14.0,
  centreId = 'CTR-UP-01',
  officerName = 'V. K. Verma'
}) {
  // If token is provided, look up associated booking
  let matchedBooking = null;
  if (token) {
    const cleanToken = String(token).trim().toUpperCase();
    matchedBooking = db.find('bookings', b => (b.token && b.token.toUpperCase() === cleanToken));
  } else if (bookingId) {
    matchedBooking = db.find('bookings', b => b.id === bookingId);
  }

  const effectiveFarmerId = matchedBooking?.farmerId || farmerId || 'FRM-UP-26032';
  const effectiveBookingId = matchedBooking?.id || bookingId || null;
  const effectiveCropId = matchedBooking?.cropId || cropId;
  const effectiveCentreId = matchedBooking?.centreId || centreId;

  const farmer = db.find('users', u => u.id === effectiveFarmerId) || {
    id: effectiveFarmerId,
    name: matchedBooking?.farmerName || 'Ramesh Kumar',
    email: matchedBooking?.farmerEmail || null,
    phone: matchedBooking?.farmerPhone || '9876543210',
    village: 'Jaitpur, Gorakhpur',
    bankName: 'State Bank of India',
    bankAccMasked: '•••• •••• 4862'
  };

  const crop = db.find('crops', c => c.id === effectiveCropId) || db.get('crops')[0];
  const centre = db.find('centres', c => c.id === effectiveCentreId) || db.get('centres')[0];

  const gross = parseFloat(grossWeight);
  const tare = parseFloat(tareWeight);
  if (isNaN(gross) || isNaN(tare) || gross <= tare) {
    throw new Error('Invalid weights: Gross weight must be greater than tare weight.');
  }

  const net = parseFloat((gross - tare).toFixed(2));
  const moisture = parseFloat(moisturePercent);
  
  // Moisture check: if moisture is within FAQ limit, full MSP; if slight moisture excess, standard deduction
  let deductionPerQtl = 0;
  if (moisture > (crop.maxMoisture || 17)) {
    deductionPerQtl = (moisture - (crop.maxMoisture || 17)) * 20; // ₹20 deduction per % excess
  }
  const effectiveRate = Math.max(1000, crop.mspRate - deductionPerQtl);
  const totalAmount = Math.round(net * effectiveRate);

  const receiptId = `KR-2026-${Math.floor(9000 + Math.random() * 999)}`;
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const record = {
    id: receiptId,
    bookingId: effectiveBookingId,
    token: matchedBooking?.token || token || 'A-047',
    farmerId: farmer.id,
    farmerName: farmer.name,
    farmerPhone: farmer.phone,
    farmerEmail: farmer.email || matchedBooking?.farmerEmail || null,
    date: dateFormatted,
    crop: `${crop.name.split('/')[0].trim()} • ${net} qtl`,
    cropId: crop.id,
    cropFullName: crop.name,
    centre: centre.name,
    centreDistrict: centre.district,
    grossWeight: gross,
    tareWeight: tare,
    netWeight: net,
    moisturePercent: moisture,
    mspRate: crop.mspRate,
    effectiveRate,
    amount: totalAmount,
    status: 'COMPLETED',
    paymentStatus: 'PROCESSING',
    expectedDate: new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    utr: null,
    officer: officerName,
    bankName: farmer.bankName || 'State Bank of India',
    bankAccMasked: farmer.bankAccMasked || '•••• 4862',
    milestones: [
      { stage: 'Gate Inward & Token Verified', time: `${dateFormatted}, ${timeFormatted}`, done: true },
      { stage: `Moisture & Quality Assay (${moisture}% FAQ)`, time: `${dateFormatted}, ${timeFormatted}`, done: true },
      { stage: `Weighbridge Weighed (${net} qtl Net)`, time: `${dateFormatted}, ${timeFormatted}`, done: true },
      { stage: `Procurement J-Form Generated (#${receiptId})`, time: `${dateFormatted}, ${timeFormatted}`, done: true },
      { stage: 'DBT Payment Dispatched via PFMS', time: 'In Processing (Expected in 48-72 hrs)', done: false }
    ]
  };

  db.insert('procurements', record);

  // If matched booking exists, update status
  if (effectiveBookingId) {
    db.update('bookings', b => b.id === effectiveBookingId, b => ({
      ...b,
      status: 'COMPLETED',
      queueStatus: 'COMPLETED',
      procurementId: receiptId
    }));
  }

  // Increment centre today completed count
  db.update('centres', c => c.id === centre.id, c => ({
    ...c,
    todayCompleted: (c.todayCompleted || 0) + 1
  }));

  // Send SMS weighment slip notification
  await sendSms({
    phone: farmer.phone,
    recipientName: farmer.name,
    type: 'WEIGHMENT_SLIP',
    data: {
      name: farmer.name,
      crop: crop.name.split('/')[0].trim(),
      netWeight: net,
      amount: totalAmount,
      receiptId
    }
  });

  // Send real J-Form receipt email if email is available
  const farmerEmail = farmer.email || matchedBooking?.farmerEmail;
  if (farmerEmail && farmerEmail.includes('@')) {
    try {
      await sendEmail({
        to: farmerEmail,
        recipientName: farmer.name,
        type: 'JFORM_ISSUED',
        data: {
          name: farmer.name,
          receiptId,
          crop: crop.name,
          grossWeight: gross,
          tareWeight: tare,
          netWeight: net,
          mspRate: crop.mspRate,
          amount: totalAmount,
          centre: centre.name,
          date: dateFormatted,
          bankName: farmer.bankName || 'State Bank of India',
          bankAccMasked: farmer.bankAccMasked || '•••• 4862'
        }
      });
      console.log(`[JFORM DISPATCH] Real J-Form email dispatched to: ${farmerEmail}`);
    } catch (e) {
      console.warn('[JFORM DISPATCH] Failed to dispatch email:', e.message);
    }
  }

  try {
    createNotification({
      userId: farmer.id,
      role: 'farmer',
      type: 'WEIGHMENT_RECORDED',
      title: `J-Form Issued: #${receiptId}`,
      message: `Weighed ${net} qtl ${crop.name}. Total payable: ₹${totalAmount.toLocaleString('en-IN')}. DBT payment initiated.`,
      category: 'payments',
      link: 'procurements',
      meta: { receiptId, netWeight: net, amount: totalAmount }
    });
  } catch (e) {
    console.warn('Notification error on weighment:', e);
  }

  return record;
}

export async function approvePayment(receiptId) {
  const p = db.find('procurements', x => x.id === receiptId);
  if (!p) throw new Error('Receipt not found');

  const utr = `SBI${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
  const paidDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const updated = db.update('procurements', x => x.id === receiptId, rec => ({
    ...rec,
    paymentStatus: 'PAID',
    paidDate,
    utr,
    milestones: rec.milestones.map((m, idx) => 
      idx === 4 ? { stage: `DBT Payment Cleared via PFMS (UTR: ${utr})`, time: `${paidDate}`, done: true } : m
    )
  }));

  // Send SMS confirmation of payment DBT
  await sendSms({
    phone: p.farmerPhone || '9876543210',
    recipientName: p.farmerName,
    type: 'PAYMENT_CREDITED',
    data: {
      name: p.farmerName,
      amount: p.amount,
      bank: p.bankName || 'SBI',
      utr,
      receiptId: p.id
    }
  });

  // Send real email confirmation if email is available
  const user = db.find('users', u => u.id === p.farmerId);
  const farmerEmail = user?.email || p.farmerEmail;
  if (farmerEmail && farmerEmail.includes('@')) {
    try {
      await sendEmail({
        to: farmerEmail,
        recipientName: p.farmerName,
        type: 'PAYMENT_CREDITED',
        data: {
          name: p.farmerName,
          amount: p.amount,
          bank: p.bankName || 'State Bank of India',
          utr,
          receiptId: p.id
        }
      });
      console.log(`[PAYMENT DISPATCH] Real DBT payment email dispatched to: ${farmerEmail}`);
    } catch (e) {
      console.warn('[PAYMENT DISPATCH] Failed to dispatch email:', e.message);
    }
  }

  try {
    createNotification({
      userId: p.farmerId,
      role: 'farmer',
      type: 'PAYMENT_CREDITED',
      title: `DBT Payment Dispatched: ₹${(p.amount || 0).toLocaleString('en-IN')}`,
      message: `Direct Benefit Transfer of ₹${(p.amount || 0).toLocaleString('en-IN')} for Receipt #${p.id} was credited via PFMS. UTR: ${utr}.`,
      category: 'payments',
      link: 'procurements',
      meta: { receiptId: p.id, utr, amount: p.amount }
    });
  } catch (e) {
    console.warn('Notification error on payment approval:', e);
  }

  return updated;
}

export function getStats(farmerId = 'FRM-UP-26032') {
  const list = getProcurements(farmerId);
  const totalProcured = list.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paid = list.filter(p => p.paymentStatus === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0);
  const pending = list.filter(p => p.paymentStatus !== 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalQuintals = list.reduce((sum, p) => sum + (p.netWeight || 0), 0);

  return {
    totalProcured,
    paid,
    pending,
    totalQuintals: parseFloat(totalQuintals.toFixed(1)),
    completedTransactions: list.length
  };
}
