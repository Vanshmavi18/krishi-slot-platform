// server/services/buyerService.js
import { db } from '../data/db.js';
import { createNotification } from './notificationService.js';

/**
 * Get available crop lots arriving in Mandis for buyers to purchase/bid
 */
export function getMarketplaceLots() {
  const bookings = db.get('bookings') || [];
  const crops = db.get('crops') || [];
  const centres = db.get('centres') || [];

  // Map active farmer bookings as available mandi lots
  const lots = bookings.map(b => {
    const crop = crops.find(c => c.id === b.cropId) || {};
    const centre = centres.find(c => c.id === b.centreId) || {};
    const msp = crop.mspRate || 2300;

    return {
      id: `LOT-${b.id}`,
      bookingId: b.id,
      token: b.token,
      farmerId: b.farmerId,
      farmerName: b.farmerName,
      centreId: b.centreId,
      centreName: b.centreName || centre.name || 'Jaitpur Procurement Centre',
      cropId: b.cropId,
      cropName: b.cropName,
      quantity: b.quantity,
      unit: 'quintal',
      mspRate: msp,
      estimatedMoisture: crop.maxMoisture ? `${crop.maxMoisture - 2}% - ${crop.maxMoisture}% FAQ` : '13.5% FAQ',
      arrivalDate: b.date,
      displayDate: b.displayDate || b.date,
      timeSlot: b.timeSlot,
      status: 'AVAILABLE'
    };
  });

  return lots;
}

/**
 * Get orders placed by a specific buyer (or all orders for admin)
 */
export function getBuyerOrders(buyerId = null) {
  const orders = db.get('buyerOrders') || [];
  if (buyerId) {
    return orders.filter(o => o.buyerId === buyerId);
  }
  return orders;
}

/**
 * Place a new bid / procurement purchase order by a Buyer
 */
export function placeBuyerOrder({
  buyerId = 'BUYER-01',
  buyerName = 'AgroCorp Foods Pvt Ltd',
  cropId,
  cropName,
  quantity,
  offeredRate,
  centreId = 'CTR-UP-01',
  farmerId = null,
  farmerName = null,
  deliveryDate = '2026-09-15',
  pickupSlot = '11:00 AM – 01:00 PM'
}) {
  const qty = Number(quantity);
  const rate = Number(offeredRate);
  if (!qty || qty <= 0 || !rate || rate <= 0) {
    throw new Error('Please enter valid quantity and offered rate');
  }

  const totalValue = Math.round(qty * rate);
  const orderId = `BO-2026-${Math.floor(100 + Math.random() * 900)}`;
  const gatePassId = `GP-2026-${Math.floor(100 + Math.random() * 900)}`;

  const order = {
    id: orderId,
    buyerId,
    buyerName,
    cropId,
    cropName: cropName || 'Grain Crop',
    quantity: qty,
    offeredRate: rate,
    totalValue,
    centreId,
    centreName: 'Jaitpur Procurement Centre',
    farmerId: farmerId || 'FRM-UP-26032',
    farmerName: farmerName || 'Ramesh Kumar',
    status: 'CONFIRMED',
    deliveryDate,
    pickupSlot,
    gatePassId,
    createdAt: new Date().toISOString()
  };

  db.insert('buyerOrders', order);

  // 1. Notify Buyer
  createNotification({
    userId: buyerId,
    role: 'buyer',
    type: 'BUYER_ORDER',
    title: `Order Confirmed: #${orderId}`,
    message: `Contract for ${qty} qtl ${order.cropName} at ₹${rate}/qtl confirmed (Total ₹${totalValue.toLocaleString('en-IN')}). Gate pass #${gatePassId} issued.`,
    category: 'orders',
    link: 'buyer',
    meta: { orderId, gatePassId }
  });

  // 2. Notify Farmer
  if (farmerId) {
    createNotification({
      userId: farmerId,
      role: 'farmer',
      type: 'BUYER_BID_RECEIVED',
      title: `Buyer Offer Received: ₹${rate}/qtl`,
      message: `${buyerName} placed an order for ${qty} qtl ${order.cropName} for Mandi delivery on ${deliveryDate}.`,
      category: 'marketplace',
      link: 'dashboard',
      meta: { orderId }
    });
  }

  // 3. Notify Admin
  createNotification({
    userId: 'APMC-ADMIN',
    role: 'admin',
    type: 'ADMIN_ALERT',
    title: `New Mandi Procurement Order #${orderId}`,
    message: `${buyerName} booked ${qty} qtl ${order.cropName} at Jaitpur Mandi (₹${totalValue.toLocaleString('en-IN')}). Gate Pass: ${gatePassId}.`,
    category: 'orders',
    link: 'centre',
    meta: { orderId }
  });

  return order;
}
