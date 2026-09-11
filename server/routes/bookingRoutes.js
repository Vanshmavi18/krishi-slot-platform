// server/routes/bookingRoutes.js
import { Router } from 'express';
import { db } from '../data/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';
import { sendSms } from '../services/smsService.js';

const router = Router();

// Standard APMC Time Slots with Max Capacity
const TIME_SLOTS = [
  { id: 'slot-0900', label: '09:00 – 09:30 AM', maxCapacity: 15 },
  { id: 'slot-1030', label: '10:30 – 11:00 AM', maxCapacity: 15 },
  { id: 'slot-1200', label: '12:00 – 12:30 PM', maxCapacity: 15 },
  { id: 'slot-1400', label: '02:00 – 02:30 PM', maxCapacity: 15 },
  { id: 'slot-1530', label: '03:30 – 04:00 PM', maxCapacity: 15 }
];

/**
 * POST /api/bookings (also accepts /book)
 * Role: Farmer
 * Description: Create a new farmer slot booking in MongoDB with capacity & duplicate checks
 */
const createBookingHandler = async (req, res) => {
  const farmerId = req.user?.id;
  const farmerName = req.user?.name || 'Registered Farmer';
  const farmerPhone = req.user?.phone || '';
  const farmerEmail = req.user?.email || null;

  console.log(`[BOOKING] Booking creation started for farmer: ${farmerId}`);

  try {
    const {
      cropName,
      quantity,
      quantityUnit = 'quintal',
      expectedPrice,
      preferredDate,
      timeSlot,
      location,
      vehicle = 'Tractor Trolley',
      notes = ''
    } = req.body;

    // 1. Server-side field validations
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
      return res.status(400).json({ success: false, error: 'Preferred delivery date is required' });
    }

    const parsedDate = new Date(preferredDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Preferred date is not a valid date format' });
    }

    if (!timeSlot || typeof timeSlot !== 'string' || !timeSlot.trim()) {
      return res.status(400).json({ success: false, error: 'Preferred time slot is required' });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ success: false, error: 'Location / Mandi is required' });
    }

    const dateIso = parsedDate.toISOString().split('T')[0];
    const cleanSlot = timeSlot.trim();

    // 2. Validate Slot existence & Capacity limits (Section 8: Slot Availability)
    const matchedSlotDef = TIME_SLOTS.find(
      s => s.label === cleanSlot || s.id === cleanSlot || cleanSlot.includes(s.label.split('–')[0].trim())
    );
    const maxCapacity = matchedSlotDef?.maxCapacity || 15;

    // Count existing active bookings for this date and time slot
    const activeBookingCount = await db.countBookings(
      {
        $or: [{ date: dateIso }, { slotDate: dateIso }],
        timeSlot: cleanSlot,
        status: { $nin: ['Cancelled', 'CANCELLED', 'Rejected', 'REJECTED'] }
      },
      b => {
        const st = (b.status || '').toUpperCase();
        return (b.date === dateIso || b.slotDate === dateIso) &&
          b.timeSlot === cleanSlot &&
          st !== 'CANCELLED' && st !== 'REJECTED';
      }
    );

    if (activeBookingCount >= maxCapacity) {
      return res.status(409).json({
        success: false,
        error: `Selected time slot '${cleanSlot}' on ${dateIso} is at maximum capacity (${activeBookingCount}/${maxCapacity}). Please choose another slot.`
      });
    }

    // 3. Prevent duplicate booking: Farmer already has an active booking for same slot
    const existingDuplicate = await db.findOneBooking(
      {
        farmerId,
        $or: [{ date: dateIso }, { slotDate: dateIso }],
        timeSlot: cleanSlot,
        status: { $nin: ['Cancelled', 'CANCELLED', 'Rejected', 'REJECTED'] }
      },
      b => {
        const st = (b.status || '').toUpperCase();
        return b.farmerId === farmerId &&
          (b.date === dateIso || b.slotDate === dateIso) &&
          b.timeSlot === cleanSlot &&
          st !== 'CANCELLED' && st !== 'REJECTED';
      }
    );

    if (existingDuplicate) {
      return res.status(409).json({
        success: false,
        error: `You already have an active booking (#${existingDuplicate.bookingId || existingDuplicate.id}) for this date and time slot.`
      });
    }

    // 4. Construct Unique Booking Document
    const bookingId = `BK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomTokenNum = 40 + Math.floor(Math.random() * 60);
    const token = `A-${String(randomTokenNum).padStart(3, '0')}`;

    const displayDate = parsedDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });

    const slotParts = cleanSlot.split('–');
    const startTime = slotParts[0]?.trim() || cleanSlot;
    const endTime = slotParts[1]?.trim() || cleanSlot;
    const slotId = matchedSlotDef?.id || cleanSlot.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const newBooking = {
      bookingId,
      id: bookingId, // Backward compatibility alias
      token,
      farmerId,
      farmerName,
      farmerPhone,
      farmerEmail,
      crop: cropName.trim(), // Prompt requirement
      cropName: cropName.trim(),
      cropId: cropName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      quantity: qty,
      quantityUnit: cleanUnit,
      expectedPrice: price,
      preferredDate: parsedDate,
      date: dateIso,
      displayDate,
      slotId,
      slotDate: dateIso,
      startTime,
      endTime,
      timeSlot: cleanSlot,
      location: location.trim(),
      market: location.trim(),
      mandi: location.trim(),
      centreId: 'CTR-UP-01',
      centreName: location.trim(),
      notes: String(notes || '').trim(),
      adminNotes: '',
      cancellationReason: '',
      buyerId: null,
      buyerName: null,
      buyerRequests: [],
      status: 'Pending',
      queueStatus: 'WAITING',
      vehicle: String(vehicle || 'Tractor Trolley').trim(),
      qrCodeData: `AGRIQUEUE|${bookingId}|${token}|${farmerId}|${qty}${cleanUnit}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 5. Persist to MongoDB Atlas (via db.createBooking)
    const savedBooking = await db.createBooking(newBooking);
    console.log(`[BOOKING] Booking created successfully: ${bookingId}`);

    // 6. Asynchronous Notification dispatch
    try {
      createNotification({
        userId: farmerId,
        role: 'farmer',
        type: 'SLOT_PENDING',
        title: `Booking Submitted: #${bookingId}`,
        message: `Your booking for ${qty} ${cleanUnit} of ${newBooking.cropName} at ${newBooking.location} is submitted and Pending APMC Mandi review.`,
        category: 'slots',
        link: 'booking',
        meta: { bookingId, token }
      });

      createNotification({
        userId: 'APMC-ADMIN',
        role: 'admin',
        type: 'ADMIN_ALERT',
        title: `New Slot Booking #${bookingId}`,
        message: `${farmerName} booked delivery of ${qty} ${cleanUnit} ${newBooking.cropName} at ${newBooking.location}.`,
        category: 'slots',
        link: 'centre',
        meta: { bookingId, token }
      });

      if (farmerPhone) {
        sendSms({
          phone: farmerPhone,
          recipientName: farmerName,
          type: 'CUSTOM',
          customText: `Namaste ${farmerName}, your slot booking #${bookingId} for ${qty} ${cleanUnit} ${newBooking.cropName} is received (Status: Pending). AgriQueue APMC.`
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.warn('[BOOKING] Notification dispatch warning:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      bookingId,
      booking: savedBooking,
      message: `Booking #${bookingId} created successfully. Initial status is Pending.`
    });
  } catch (err) {
    console.error('[BOOKING] Error creating booking:', err.message);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'A booking with this ID already exists. Please try again.'
      });
    }

    // Handle MongoDB Validation error
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Database error occurred while processing booking. Please try again.'
    });
  }
};

router.post('/', authenticate, requireRole('farmer'), createBookingHandler);
router.post('/book', authenticate, requireRole('farmer'), createBookingHandler);

/**
 * GET /api/bookings/farmer & GET /api/bookings/my
 * Role: Farmer
 * Description: View all bookings belonging to the currently authenticated farmer from MongoDB
 */
const getFarmerBookingsHandler = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const bookings = await db.getBookings(
      b => b.farmerId === farmerId,
      { farmerId }
    );

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    console.error('[BOOKING] Booking fetch failed for farmer:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve farmer bookings from database'
    });
  }
};

router.get('/farmer', authenticate, requireRole('farmer'), getFarmerBookingsHandler);
router.get('/my', authenticate, requireRole('farmer'), getFarmerBookingsHandler);

/**
 * GET /api/bookings/buyer & GET /api/bookings/available
 * Role: Authenticated (Buyer, Officer, Admin)
 * Description: View active farmer bookings available for buyers to view & request
 */
const getBuyerBookingsHandler = async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const isBuyer = req.user?.role === 'buyer';

    // Return active bookings (exclude Cancelled and Rejected)
    // If a booking is targeted to a specific buyer, show only to that buyer
    const mongoFilter = {
      status: { $nin: ['Cancelled', 'CANCELLED', 'Rejected', 'REJECTED'] },
      $or: [
        { buyerId: null },
        { buyerId: '' },
        { buyerId: currentUserId },
        { 'buyerRequests.buyerId': currentUserId }
      ]
    };

    const bookings = await db.getBookings(
      b => {
        const st = (b.status || '').toUpperCase();
        if (st === 'CANCELLED' || st === 'REJECTED') return false;
        if (!b.buyerId || b.buyerId === currentUserId) return true;
        if (Array.isArray(b.buyerRequests) && b.buyerRequests.some(r => r.buyerId === currentUserId)) return true;
        return false;
      },
      mongoFilter
    );

    // Sanitize contact info for privacy if requester is commercial buyer
    const sanitized = bookings.map(b => {
      if (!isBuyer) return b;
      return {
        ...b,
        farmerPhone: b.farmerPhone ? `XXXXXX${String(b.farmerPhone).slice(-4)}` : undefined,
        farmerEmail: undefined,
        hasMyRequest: Array.isArray(b.buyerRequests) && b.buyerRequests.some(r => r.buyerId === currentUserId)
      };
    });

    res.json({
      success: true,
      count: sanitized.length,
      bookings: sanitized
    });
  } catch (err) {
    console.error('[BOOKING] Booking fetch failed for buyer:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve buyer bookings from database'
    });
  }
};

router.get('/buyer', authenticate, getBuyerBookingsHandler);
router.get('/available', authenticate, getBuyerBookingsHandler);

/**
 * GET /api/bookings/admin
 * Role: Admin, Officer
 * Description: View all bookings across the entire system from MongoDB
 */
router.get('/admin', authenticate, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const bookings = await db.getBookings(
      () => true,
      {}
    );

    res.json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (err) {
    console.error('[BOOKING] Admin bookings fetch failed:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin bookings from database'
    });
  }
});

/**
 * GET /api/bookings/:id
 * Role: Authenticated
 * Description: View a specific booking's full details (with strict role authorization)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await db.findBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const { role, id: userId } = req.user;
    const isOwner = booking.farmerId === userId;
    const isAdmin = role === 'admin' || role === 'officer';
    const isAssignedBuyer = booking.buyerId === userId || (Array.isArray(booking.buyerRequests) && booking.buyerRequests.some(r => r.buyerId === userId));
    const isAvailable = booking.status !== 'Cancelled' && booking.status !== 'Rejected';

    if (!isAdmin && !isOwner && !(role === 'buyer' && (isAvailable || isAssignedBuyer))) {
      return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to view this booking' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('[BOOKING] Error retrieving booking details:', err.message);
    res.status(500).json({ success: false, error: 'Error retrieving booking details' });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Role: Admin, Officer
 * Description: Update booking status with state machine transitions in MongoDB
 */
router.patch('/:id/status', authenticate, requireRole('admin', 'officer'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const booking = await db.findBookingById(req.params.id);

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

    // Allowed State Machine Transitions
    const allowedTransitions = {
      'Pending': ['Approved', 'Rejected', 'Cancelled'],
      'CONFIRMED': ['Approved', 'Completed', 'Cancelled'],
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

    // Apply status update in MongoDB Atlas and local store
    const updatePayload = {
      status,
      adminNotes: notes ? String(notes).trim() : (booking.adminNotes || '')
    };

    const updated = await db.updateBooking(booking.bookingId || booking.id, updatePayload);

    // Notify Farmer of status change
    try {
      createNotification({
        userId: booking.farmerId,
        role: 'farmer',
        type: `SLOT_${status.toUpperCase()}`,
        title: `Booking ${status}: #${booking.bookingId || booking.id}`,
        message: `Your booking for ${booking.quantity} ${booking.quantityUnit || 'quintal'} ${booking.cropName} is now marked as ${status}.${notes ? ` Note: ${notes}` : ''}`,
        category: 'slots',
        link: 'booking',
        meta: { bookingId: booking.bookingId || booking.id, status }
      });

      if (booking.buyerId) {
        createNotification({
          userId: booking.buyerId,
          role: 'buyer',
          type: 'ORDER_UPDATE',
          title: `Slot #${booking.bookingId || booking.id} Update`,
          message: `Slot #${booking.bookingId || booking.id} (${booking.cropName}) status changed to ${status}.`,
          category: 'orders',
          link: 'buyer',
          meta: { bookingId: booking.bookingId || booking.id, status }
        });
      }
    } catch (e) {
      console.warn('[BOOKING] Notification warning:', e.message);
    }

    res.json({
      success: true,
      booking: updated,
      message: `Booking #${booking.bookingId || booking.id} status updated to ${status}`
    });
  } catch (err) {
    console.error('[BOOKING] Status update error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update booking status' });
  }
});

/**
 * POST /api/bookings/:id/buy-request
 * Role: Buyer
 * Description: Buyer submits a purchase request for a farmer booking
 */
router.post('/:id/buy-request', authenticate, requireRole('buyer'), async (req, res) => {
  try {
    const booking = await db.findBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const currentStatus = (booking.status || '').toUpperCase();
    if (currentStatus === 'CANCELLED' || currentStatus === 'REJECTED') {
      return res.status(400).json({
        success: false,
        error: `Cannot request slot. This slot is ${booking.status}.`
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

    const price = offeredPrice ? Number(offeredPrice) : (booking.expectedPrice || 2300);
    const newRequest = {
      buyerId,
      buyerName,
      offeredPrice: price,
      notes: String(notes).trim(),
      requestedAt: new Date().toISOString()
    };

    const updatedRequests = [...existingRequests, newRequest];

    const updatePayload = {
      buyerId: booking.buyerId || buyerId, // Set as primary buyer if none assigned
      buyerName: booking.buyerName || buyerName,
      buyerRequests: updatedRequests
    };

    const updated = await db.updateBooking(booking.bookingId || booking.id, updatePayload);

    // Notify Farmer of Buyer Interest
    try {
      createNotification({
        userId: booking.farmerId,
        role: 'farmer',
        type: 'BUYER_REQUEST',
        title: `Buyer Offer: #${booking.bookingId || booking.id}`,
        message: `${buyerName} submitted a purchase offer of ₹${price}/${booking.quantityUnit || 'qtl'} for your ${booking.quantity} ${booking.quantityUnit || 'qtl'} ${booking.cropName}.`,
        category: 'marketplace',
        link: 'booking',
        meta: { bookingId: booking.bookingId || booking.id, buyerId, offeredPrice: price }
      });

      createNotification({
        userId: 'APMC-ADMIN',
        role: 'admin',
        type: 'ADMIN_ALERT',
        title: `Buyer Request on Slot #${booking.bookingId || booking.id}`,
        message: `${buyerName} requested to purchase ${booking.farmerName}'s ${booking.cropName} (${booking.quantity} ${booking.quantityUnit || 'qtl'}).`,
        category: 'orders',
        link: 'centre',
        meta: { bookingId: booking.bookingId || booking.id, buyerId }
      });
    } catch (e) {
      console.warn('[BOOKING] Buyer request notification warning:', e.message);
    }

    res.json({
      success: true,
      booking: updated,
      message: `Purchase request submitted for Slot #${booking.bookingId || booking.id}`
    });
  } catch (err) {
    console.error('[BOOKING] Buy request error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to submit buyer request' });
  }
});

/**
 * PATCH /api/bookings/:id/cancel
 * Role: Farmer (own booking) or Admin
 * Description: Cancel a booking with authorization and status check
 */
router.patch('/:id/cancel', authenticate, async (req, res) => {
  try {
    const booking = await db.findBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    const { role, id: userId } = req.user;
    const isOwner = booking.farmerId === userId;
    const isAdmin = role === 'admin' || role === 'officer';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, error: 'Unauthorized to cancel this booking' });
    }

    if (booking.status === 'Completed') {
      return res.status(400).json({ success: false, error: 'Completed bookings cannot be cancelled' });
    }

    if (booking.status === 'Cancelled') {
      return res.json({ success: true, booking, message: 'Booking is already cancelled' });
    }

    const { reason = '' } = req.body;

    const updatePayload = {
      status: 'Cancelled',
      cancellationReason: reason ? String(reason).trim() : (isOwner ? 'Cancelled by Farmer' : 'Cancelled by Mandi Admin')
    };

    const updated = await db.updateBooking(booking.bookingId || booking.id, updatePayload);

    // Notify respective parties
    try {
      if (isAdmin && !isOwner) {
        createNotification({
          userId: booking.farmerId,
          role: 'farmer',
          type: 'SLOT_CANCELLED',
          title: `Booking Cancelled: #${booking.bookingId || booking.id}`,
          message: `Your booking for ${booking.cropName} has been cancelled by Mandi Administration.${reason ? ` Reason: ${reason}` : ''}`,
          category: 'slots',
          link: 'booking',
          meta: { bookingId: booking.bookingId || booking.id }
        });
      } else {
        createNotification({
          userId: 'APMC-ADMIN',
          role: 'admin',
          type: 'ADMIN_ALERT',
          title: `Farmer Cancelled Booking #${booking.bookingId || booking.id}`,
          message: `${booking.farmerName} cancelled their ${booking.cropName} delivery slot.${reason ? ` Reason: ${reason}` : ''}`,
          category: 'slots',
          link: 'centre',
          meta: { bookingId: booking.bookingId || booking.id }
        });
      }
    } catch (e) {
      console.warn('[BOOKING] Cancellation notification warning:', e.message);
    }

    res.json({
      success: true,
      booking: updated,
      message: `Booking #${booking.bookingId || booking.id} has been cancelled.`
    });
  } catch (err) {
    console.error('[BOOKING] Cancellation error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to cancel booking' });
  }
});

export default router;
