// server/services/slotService.js
import { db } from '../data/db.js';
import { sendSms } from './smsService.js';
import { sendEmail } from './emailService.js';
import { createNotification } from './notificationService.js';

const TIME_SLOTS = [
  { id: 'slot-0900', label: '09:00 – 09:30 AM', maxCapacity: 15 },
  { id: 'slot-1030', label: '10:30 – 11:00 AM', maxCapacity: 15 },
  { id: 'slot-1200', label: '12:00 – 12:30 PM', maxCapacity: 15 },
  { id: 'slot-1400', label: '02:00 – 02:30 PM', maxCapacity: 15 },
  { id: 'slot-1530', label: '03:30 – 04:00 PM', maxCapacity: 15 }
];

export function getCentres() {
  return db.get('centres');
}

export function getCrops() {
  return db.get('crops');
}

export function getAvailableSlots(centreId, date) {
  const bookings = db.filter('bookings', b => {
    const st = (b.status || '').toUpperCase();
    const matchesCentre = !centreId || b.centreId === centreId || (b.location && b.location.includes(centreId));
    const matchesDate = !date || b.date === date || b.slotDate === date;
    return matchesCentre && matchesDate && st !== 'CANCELLED' && st !== 'REJECTED';
  });
  
  return TIME_SLOTS.map(slot => {
    const bookedForSlot = bookings.filter(b => b.timeSlot === slot.label || b.slotId === slot.id).length;
    const remaining = Math.max(0, slot.maxCapacity - bookedForSlot);
    return {
      ...slot,
      bookedCount: bookedForSlot,
      remaining,
      isAvailable: remaining > 0
    };
  });
}

export async function bookSlot({ farmerId, farmerName, farmerPhone, farmerEmail, centreId, cropId, quantity, vehicle, date, timeSlot }) {
  const centre = db.find('centres', c => c.id === centreId);
  if (!centre) throw new Error('Selected procurement centre not found');

  const crop = db.find('crops', c => c.id === cropId);
  if (!crop) throw new Error('Selected crop not found');

  if (!quantity || Number(quantity) <= 0) {
    throw new Error('Please enter a valid harvest quantity in quintals');
  }

  // Lookup farmer email from database if not explicitly passed
  let resolvedEmail = (farmerEmail || '').trim().toLowerCase();
  if (!resolvedEmail && farmerId) {
    const user = db.find('users', u => u.id === farmerId);
    if (user?.email) resolvedEmail = user.email.toLowerCase();
  }

  // Calculate next token for this centre
  const existingToday = db.filter('bookings', b => b.centreId === centreId);
  const tokenNum = 47 + existingToday.length;
  const tokenPrefix = centreId.includes('02') ? 'B' : centreId.includes('03') ? 'S' : 'A';
  const token = `${tokenPrefix}-${String(tokenNum).padStart(3, '0')}`;

  const bookingId = `BK-2026-${Math.floor(9100 + Math.random() * 899)}`;
  const displayDateObj = new Date(date);
  const displayDate = isNaN(displayDateObj.getTime()) 
    ? date 
    : displayDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', weekday: 'long' });

  const newBooking = {
    id: bookingId,
    token,
    farmerId,
    farmerName: farmerName || 'Farmer',
    farmerPhone: String(farmerPhone).slice(-10),
    farmerEmail: resolvedEmail || null,
    centreId,
    centreName: centre.name,
    cropId,
    cropName: crop.name,
    quantity: Number(quantity),
    vehicle: vehicle || 'Tractor Trolley',
    date,
    displayDate,
    timeSlot,
    status: 'CONFIRMED',
    queueStatus: 'WAITING',
    createdAt: new Date().toISOString(),
    qrCodeData: `AGRIQUEUE|${bookingId}|${token}|${farmerId}|${quantity}QTL`
  };

  db.insert('bookings', newBooking);

  // Increment centre today booked
  db.update('centres', c => c.id === centreId, c => ({ ...c, todayBooked: (c.todayBooked || 0) + 1 }));

  // Send slot confirmation SMS
  await sendSms({
    phone: farmerPhone,
    recipientName: farmerName,
    type: 'SLOT_CONFIRMED',
    data: {
      name: farmerName,
      crop: crop.name.split('/')[0].trim(),
      centre: centre.name,
      date: displayDate,
      time: timeSlot,
      token
    }
  });

  // Send real email confirmation if email exists
  if (resolvedEmail && resolvedEmail.includes('@')) {
    try {
      await sendEmail({
        to: resolvedEmail,
        recipientName: farmerName,
        type: 'SLOT_CONFIRMED',
        data: {
          token,
          crop: crop.name,
          centre: centre.name,
          date: displayDate,
          time: timeSlot,
          vehicle: vehicle || 'Tractor Trolley',
          quantity: Number(quantity),
          bookingId
        }
      });
      console.log(`[SLOT BOOKING] Real confirmation email dispatched to: ${resolvedEmail}`);
    } catch (emailErr) {
      console.warn('[SLOT BOOKING] Failed to dispatch email:', emailErr.message);
    }
  }

  // Create in-app notifications for Farmer and Mandi Admin
  try {
    createNotification({
      userId: farmerId,
      role: 'farmer',
      type: 'SLOT_CONFIRMED',
      title: `Slot Confirmed: Token #${token}`,
      message: `Your ${crop.name} delivery slot at ${centre.name} is confirmed for ${displayDate} (${timeSlot}).`,
      category: 'slots',
      link: 'booking',
      meta: { bookingId, token }
    });

    createNotification({
      userId: 'APMC-ADMIN',
      role: 'admin',
      type: 'ADMIN_ALERT',
      title: `New Slot Booked: Token #${token}`,
      message: `${farmerName} scheduled ${quantity} qtl ${crop.name} arrival for ${displayDate}.`,
      category: 'slots',
      link: 'centre',
      meta: { bookingId, token }
    });
  } catch (e) {
    console.warn('Failed to create in-app notification:', e);
  }

  return newBooking;
}

export function getMySlots(farmerId) {
  return db.filter('bookings', b => b.farmerId === farmerId && b.status !== 'CANCELLED');
}

export async function cancelSlot(bookingId, farmerId) {
  const booking = db.find('bookings', b => b.id === bookingId && b.farmerId === farmerId);
  if (!booking) throw new Error('Booking not found');

  db.update('bookings', b => b.id === bookingId, b => ({ ...b, status: 'CANCELLED' }));

  await sendSms({
    phone: booking.farmerPhone,
    recipientName: booking.farmerName,
    type: 'CUSTOM',
    customText: `प्रिय ${booking.farmerName}, आपका टोकन #${booking.token} का स्लॉट सफलतापूर्वक रद्द कर दिया गया है। - एग्रीक्यू (AgriQueue)`
  });

  return { success: true, message: 'Booking cancelled successfully' };
}
