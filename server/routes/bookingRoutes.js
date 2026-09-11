// server/routes/bookingRoutes.js
import { Router } from 'express';
import { db } from '../data/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';
import { sendSms } from '../services/smsService.js';

const router = Router();

// Helper to look up a booking by bookingId or id
function findBooking(id) {
  return db.find('bookings', b => b.bookingId === id || b.id === id);
}

/**
 * POST /api/bookings
 * Role: Farmer
 * Description: Create a new farmer slot booking
 */
router.post('/', authenticate, requireRole('farmer'), async (req, res) => {
  try {
    const {
      cropName,
      quantity,
      quantityUnit = 'quintal',
      expectedPrice,
      preferredDate,
      timeSlot,
      location,
      notes = ''
    } = req.body;

    // Server-side field validations
    if (!cropName || typeof cropName !== 'string' || !cropName.trim()) {
      return res.status(400).json({ success: false, error: 'Crop/Product name is required' });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
    }

    const validUnits = ['kg', 'quintal', 'ton'];
    const cleanUnit = String(quantityUnit).toLowerCase().trim();
    if (!validUnits.includes(cleanUnit)) {
      return res.status(400).json({ success: false, error: `Invalid quantity unit. Must be one of: ${validUnits.join(', ')}` });
    }

    const price = Number(expectedPrice);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, error: 'Expected selling price must be a positive number' });
    }

    if (!preferredDate) {
      return res.status(400).json({ success: false, error: 'Preferred date is required' });
    }

    const parsedDate = new Date(preferredDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Preferred date is not a valid date' });
    }

    if (!timeSlot || typeof timeSlot !== 'string' || !timeSlot.trim()) {
      return res.status(400).json({ success: false, error: 'Preferred time slot is required' });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ success: false, error: 'Location / Mandi is required' });
    }

    // Authenticated Farmer identity from verified session token (never trust client)
    const farmerId = req.user.id;
    const farmerName = req.user.name || 'Registered Farmer';
    const farmerPhone = req.user.phone || '';
    const farmerEmail = req.user.email || null;

    // Unique Booking ID & Gate Token generation
    const bookingId = `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomTokenNum = 40 + Math.floor(Math.random() * 60);
    const token = `A-${String(randomTokenNum).padStart(3, '0')}`;

    const dateIso = parsedDate.toISOString().split('T')[0];
    const displayDate = parsedDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });

    const newBooking = {
      bookingId,
      id: bookingId, // Backward compatibility alias
      token,
      farmerId,
      farmerName,
      farmerPhone,
      farmerEmail,
      cropName: cropName.trim(),
      cropId: cropName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      quantity: qty,
      quantityUnit: cleanUnit,
      expectedPrice: price,
      preferredDate: parsedDate,
      date: dateIso,
      displayDate,
      timeSlot: timeSlot.trim(),
      location: location.trim(),
      centreId: 'CTR-UP-01',
      centreName: location.trim(),
      notes: String(notes || '').trim(),
      buyerId: null,
      buyerName: null,
      buyerRequests: [],
      status: 'Pending',
      queueStatus: 'WAITING',
      vehicle: 'Tractor Trolley',
      qrCodeData: `AGRIQUEUE|${bookingId}|${token}|${farmerId}|${qty}${cleanUnit}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Database (Dual persistence: MongoDB + Local store)
    db.insert('bookings', newBooking);

    // Notify Farmer of Pending Booking
    try {
      createNotification({
        userId: farmerId,
        role: 'farmer',
        type: 'SLOT_PENDING',
        title: `Booking Submitted: #${bookingId}`,
        message: `Your booking for ${qty} ${cleanUnit} of ${newBooking.cropName} at ${newBooking.location} is submitted and Pending APMC Admin approval.`,
        category: 'slots',
        link: 'booking',
        meta: { bookingId, token }
      });

      // Notify APMC Admin of New Booking
      createNotification({
        userId: 'APMC-ADMIN',
        role: 'admin',
        type: 'ADMIN_ALERT',
        title: `New Slot Booking #${bookingId}`,
        message: `${farmerName} submitted a booking for ${qty} ${cleanUnit} ${newBooking.cropName} at ${newBooking.location}. Review and approve.`,
        category: 'slots',
        link: 'centre',
        meta: { bookingId, token }
      });

      // Optional SMS alert to farmer
      if (farmerPhone) {
        sendSms({
          phone: farmerPhone,
          recipientName: farmerName,
          type: 'CUSTOM',
          customText: `Namaste ${farmerName}, your slot booking #${bookingId} for ${qty} ${cleanUnit} ${newBooking.cropName} is received (Status: Pending). AgriQueue APMC.`
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.warn('[BOOKING] Notification warning:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      bookingId,
      booking: newBooking,
      message: `Booking #${bookingId} created successfully. Initial status is Pending.`
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ success: false, error: 'Internal server error while processing booking' });
  }
});

/**
 * GET /api/bookings/my
 * Role: Farmer
 * Description: View all bookings for the authenticated farmer
 */
router.get('/my', authenticate, requireRole('farmer'), (req, res) => {
  try {
    const farmerId = req.user.id;
    const bookings = db.filter('bookings', b => b.farmerId === farmerId);

    // Sort descending by creation date
    bookings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve farmer bookings' });
  }
});

/**
 * GET /api/bookings/available
 * Role: Authenticated (Buyer, Officer, Admin)
 * Description: View approved farmer slots available for buyers to purchase/request
 */
router.get('/available', authenticate, (req, res) => {
  try {
    // Only return Approved bookings that are not completed or cancelled
    const available = db.filter('bookings', b => b.status === 'Approved');

    // Sort by arrival date
    available.sort((a, b) => new Date(a.preferredDate || a.date || 0) - new Date(b.preferredDate || b.date || 0));

    // For privacy, mask farmer contact details if requester is a Buyer
    const isBuyer = req.user.role === 'buyer';
    const sanitized = available.map(b => {
      if (!isBuyer) return b;
      return {
        ...b,
        farmerPhone: b.farmerPhone ? `XXXXXX${b.farmerPhone.slice(-4)}` : undefined,
        farmerEmail: undefined,
        hasMyRequest: Array.isArray(b.buyerRequests) && b.buyerRequests.some(r => r.buyerId === req.user.id)
      };
    });

    res.json({
      success: true,
      count: sanitized.length,
      bookings: sanitized
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve available bookings' });
  }
});

/**
 * GET /api/admin/bookings
 * Role: Admin, Officer
 * Description: View all bookings across the entire system
 */
router.get('/admin', authenticate, requireRole('admin', 'officer'), (req, res) => {
  try {
    const bookings = db.get('bookings') || [];
    
    // Sort descending by created date
    const sorted = [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      count: sorted.length,
      bookings: sorted
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve admin bookings' });
  }
});

/**
 * GET /api/bookings/:id
 * Role: Authenticated
 * Description: View a specific booking's full details (with strict role-based authorization)
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const booking = findBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const { role, id: userId } = req.user;

    // Authorization check:
    // - Admin / Officer can view any booking
    // - Farmer can only view their own booking
    // - Buyer can only view Approved bookings or bookings they have requested
    const isOwner = booking.farmerId === userId;
    const isAdmin = role === 'admin' || role === 'officer';
    const isAssignedBuyer = booking.buyerId === userId || (Array.isArray(booking.buyerRequests) && booking.buyerRequests.some(r => r.buyerId === userId));
    const isApproved = booking.status === 'Approved';

    if (!isAdmin && !isOwner && !(role === 'buyer' && (isApproved || isAssignedBuyer))) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to view this booking' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error retrieving booking details' });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Role: Admin, Officer
 * Description: Update booking status with strict state machine transition validation
 */
router.patch('/:id/status', authenticate, requireRole('admin', 'officer'), (req, res) => {
  try {
    const { status, notes } = req.body;
    const booking = findBooking(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const currentStatus = booking.status || 'Pending';

    // Allowed State Machine Transitions:
    // - Pending -> Approved, Rejected, Cancelled
    // - Approved -> Completed, Cancelled
    // - Completed -> (terminal state, no transition)
    // - Rejected -> (terminal state, no transition)
    // - Cancelled -> (terminal state, no transition)
    const allowedTransitions = {
      'Pending': ['Approved', 'Rejected', 'Cancelled'],
      'CONFIRMED': ['Approved', 'Completed', 'Cancelled'], // legacy alias
      'Approved': ['Completed', 'Cancelled'],
      'Rejected': [],
      'Completed': [],
      'Cancelled': []
    };

    if (currentStatus === status) {
      return res.json({ success: true, booking, message: `Booking is already ${status}` });
    }

    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot transition booking status from '${currentStatus}' to '${status}'.`
      });
    }

    // Apply status update
    const updated = db.update('bookings', b => b.bookingId === booking.bookingId || b.id === booking.id, b => ({
      ...b,
      status,
      adminNotes: notes ? String(notes).trim() : b.adminNotes,
      updatedAt: new Date().toISOString()
    }));

    // Notify Farmer of status update
    try {
      createNotification({
        userId: booking.farmerId,
        role: 'farmer',
        type: `SLOT_${status.toUpperCase()}`,
        title: `Booking ${status}: #${booking.bookingId}`,
        message: `Your booking for ${booking.quantity} ${booking.quantityUnit || 'quintal'} ${booking.cropName} is now marked as ${status}.${notes ? ` Note: ${notes}` : ''}`,
        category: 'slots',
        link: 'booking',
        meta: { bookingId: booking.bookingId, status }
      });

      // If buyer was involved, notify buyer
      if (booking.buyerId) {
        createNotification({
          userId: booking.buyerId,
          role: 'buyer',
          type: 'ORDER_UPDATE',
          title: `Slot #${booking.bookingId} Update`,
          message: `Slot #${booking.bookingId} (${booking.cropName}) status changed to ${status}.`,
          category: 'orders',
          link: 'buyer',
          meta: { bookingId: booking.bookingId, status }
        });
      }
    } catch (e) {
      console.warn('Failed to send status update notification:', e);
    }

    res.json({
      success: true,
      booking: updated,
      message: `Booking #${booking.bookingId} status updated to ${status}`
    });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update booking status' });
  }
});

/**
 * POST /api/bookings/:id/buy-request
 * Role: Buyer
 * Description: Buyer requests to purchase / procure an approved farmer slot
 */
router.post('/:id/buy-request', authenticate, requireRole('buyer'), (req, res) => {
  try {
    const booking = findBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    if (booking.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        error: `Cannot request slot. Only 'Approved' slots can be requested (current status: '${booking.status}').`
      });
    }

    const buyerId = req.user.id;
    const buyerName = req.user.company || req.user.name || 'Commercial Buyer';
    const { offeredPrice, notes = '' } = req.body;

    const existingRequests = Array.isArray(booking.buyerRequests) ? booking.buyerRequests : [];

    // Duplicate Prevention Check: Cannot request the same slot twice
    const alreadyRequested = existingRequests.some(r => r.buyerId === buyerId);
    if (alreadyRequested) {
      return res.status(400).json({
        success: false,
        error: 'You have already submitted a purchase request for this slot.'
      });
    }

    const price = offeredPrice ? Number(offeredPrice) : booking.expectedPrice;
    const newRequest = {
      buyerId,
      buyerName,
      offeredPrice: price,
      notes: String(notes).trim(),
      requestedAt: new Date().toISOString()
    };

    const updatedRequests = [...existingRequests, newRequest];

    const updated = db.update('bookings', b => b.bookingId === booking.bookingId || b.id === booking.id, b => ({
      ...b,
      buyerId: b.buyerId || buyerId, // Set as primary buyer if none assigned
      buyerName: b.buyerName || buyerName,
      buyerRequests: updatedRequests,
      updatedAt: new Date().toISOString()
    }));

    // Notify Farmer of Buyer interest
    try {
      createNotification({
        userId: booking.farmerId,
        role: 'farmer',
        type: 'BUYER_REQUEST',
        title: `Buyer Request: #${booking.bookingId}`,
        message: `${buyerName} submitted an offer of ₹${price}/${booking.quantityUnit || 'qtl'} for your ${booking.quantity} ${booking.quantityUnit || 'qtl'} ${booking.cropName}.`,
        category: 'marketplace',
        link: 'booking',
        meta: { bookingId: booking.bookingId, buyerId, offeredPrice: price }
      });

      // Notify Mandi Admin
      createNotification({
        userId: 'APMC-ADMIN',
        role: 'admin',
        type: 'ADMIN_ALERT',
        title: `Buyer Request on Slot #${booking.bookingId}`,
        message: `${buyerName} requested to purchase ${booking.farmerName}'s ${booking.cropName} (${booking.quantity} ${booking.quantityUnit || 'qtl'}).`,
        category: 'orders',
        link: 'centre',
        meta: { bookingId: booking.bookingId, buyerId }
      });
    } catch (e) {
      console.warn('Failed to send buyer request notification:', e);
    }

    res.json({
      success: true,
      booking: updated,
      message: `Purchase request submitted for Slot #${booking.bookingId}`
    });
  } catch (err) {
    console.error('Buy request error:', err);
    res.status(500).json({ success: false, error: 'Failed to submit buyer request' });
  }
});

/**
 * PATCH /api/bookings/:id/cancel
 * Role: Farmer (own booking) or Admin
 * Description: Cancel a booking with authorization and status check
 */
router.patch('/:id/cancel', authenticate, (req, res) => {
  try {
    const booking = findBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const { role, id: userId } = req.user;
    const isOwner = booking.farmerId === userId;
    const isAdmin = role === 'admin' || role === 'officer';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this booking' });
    }

    // Completed bookings cannot be cancelled
    if (booking.status === 'Completed') {
      return res.status(400).json({ success: false, error: 'Completed bookings cannot be cancelled' });
    }

    if (booking.status === 'Cancelled') {
      return res.json({ success: true, booking, message: 'Booking is already cancelled' });
    }

    const { reason = '' } = req.body;

    const updated = db.update('bookings', b => b.bookingId === booking.bookingId || b.id === booking.id, b => ({
      ...b,
      status: 'Cancelled',
      cancellationReason: reason ? String(reason).trim() : 'Cancelled by user',
      updatedAt: new Date().toISOString()
    }));

    // Notify Farmer if cancelled by Admin, or notify Admin if cancelled by Farmer
    try {
      if (isAdmin && !isOwner) {
        createNotification({
          userId: booking.farmerId,
          role: 'farmer',
          type: 'SLOT_CANCELLED',
          title: `Booking Cancelled: #${booking.bookingId}`,
          message: `Your booking for ${booking.cropName} has been cancelled by Mandi Administration.${reason ? ` Reason: ${reason}` : ''}`,
          category: 'slots',
          link: 'booking',
          meta: { bookingId: booking.bookingId }
        });
      } else {
        createNotification({
          userId: 'APMC-ADMIN',
          role: 'admin',
          type: 'ADMIN_ALERT',
          title: `Farmer Cancelled Booking #${booking.bookingId}`,
          message: `${booking.farmerName} cancelled their ${booking.cropName} delivery slot.${reason ? ` Reason: ${reason}` : ''}`,
          category: 'slots',
          link: 'centre',
          meta: { bookingId: booking.bookingId }
        });
      }
    } catch (e) {
      console.warn('Failed to send cancellation notification:', e);
    }

    res.json({
      success: true,
      booking: updated,
      message: `Booking #${booking.bookingId} has been cancelled.`
    });
  } catch (err) {
    console.error('Cancellation error:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel booking' });
  }
});

export default router;
