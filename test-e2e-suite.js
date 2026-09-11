// test-e2e-suite.js
// Comprehensive End-to-End Automated Test Suite for AgriQueue Slot Booking & MongoDB System

import { app, server } from './server/index.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'agriqueue_secret_key_2026_sih';
const PORT = 5001;

// Helper to make HTTP requests
async function request(url, options = {}) {
  const res = await fetch(`http://127.0.0.1:${PORT}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}

// Generate JWT tokens for test roles
const farmerToken = jwt.sign(
  { id: 'FRM-TEST-001', role: 'farmer', name: 'Kisan Balwan Singh', phone: '9876543210', email: 'balwan@agriqueue.in' },
  JWT_SECRET,
  { expiresIn: '1d' }
);

const otherFarmerToken = jwt.sign(
  { id: 'FRM-TEST-999', role: 'farmer', name: 'Other Farmer', phone: '9876543299', email: 'other@agriqueue.in' },
  JWT_SECRET,
  { expiresIn: '1d' }
);

const buyerToken = jwt.sign(
  { id: 'BUYER-TEST-01', role: 'buyer', name: 'ITC Agrotech Buyer', company: 'ITC Agrotech Ltd', email: 'buyer@itc.in' },
  JWT_SECRET,
  { expiresIn: '1d' }
);

const adminToken = jwt.sign(
  { id: 'ADM-TEST-01', role: 'admin', name: 'APMC Mandi Secretary', email: 'admin@apmc.gov.in' },
  JWT_SECRET,
  { expiresIn: '1d' }
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Starting AgriQueue Slot Booking & DB End-to-End Test Suite');
  console.log('===============================================================\n');

  // Temporary listener on PORT 5001
  const testServer = app.listen(PORT);

  try {
    // 1. Health & Database Status Check
    console.log('--- TEST 1: Database Status & Server Health ---');
    const health = await request('/api/health');
    assert(health.status === 200, 'Health check returns 200 OK');
    assert(health.data.status === 'ok', 'Service status is ok');

    const dbStatus = await request('/api/db/status');
    assert(dbStatus.status === 200, 'DB status returns 200 OK');
    assert(dbStatus.data.success === true, 'DB provider is active and reporting status');
    console.log(`  ℹ️ Active DB Provider: ${dbStatus.data.provider}`);

    // 2. CORS & Preflight Check
    console.log('\n--- TEST 2: CORS & Options Preflight ---');
    const preflight = await fetch(`http://127.0.0.1:${PORT}/api/bookings`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://agriqueue-1-d4x0.onrender.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert(preflight.status === 200 || preflight.status === 204, 'CORS Preflight returns 200/204');
    assert(
      preflight.headers.get('access-control-allow-origin') === 'https://agriqueue-1-d4x0.onrender.com' ||
      preflight.headers.get('access-control-allow-origin') === '*',
      'CORS allows Render production origin'
    );

    // 3. Validation & Capacity Checks
    console.log('\n--- TEST 3: Validation & Error Handling ---');
    const missingFields = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({})
    });
    assert(missingFields.status === 400, 'Rejects empty booking body with 400');
    assert(missingFields.data.success === false, 'Error message provided for missing crop');

    const invalidUnit = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        cropName: 'Basmati Paddy',
        quantity: 50,
        quantityUnit: 'bushels', // invalid
        expectedPrice: 2800,
        preferredDate: '2026-09-18',
        timeSlot: '09:00 – 09:30 AM',
        location: 'Jaitpur Mandi'
      })
    });
    assert(invalidUnit.status === 400, 'Rejects invalid quantity unit with 400');

    // 4. Create Successful Booking (Farmer)
    console.log('\n--- TEST 4: Farmer Books Slot Successfully ---');
    const validBookingPayload = {
      cropName: 'Basmati Paddy 1121',
      quantity: 65,
      quantityUnit: 'quintal',
      expectedPrice: 3250,
      preferredDate: '2026-09-18',
      timeSlot: '10:30 – 11:00 AM',
      location: 'Jaitpur Procurement Centre',
      vehicle: 'Tractor Trolley (UP-53-T-4412)',
      notes: 'Cleaned, moisture ~11.8%'
    };

    const bookRes = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify(validBookingPayload)
    });

    assert(bookRes.status === 201, 'Booking created successfully with 201 Created');
    assert(bookRes.data.success === true, 'Response contains success flag');
    assert(Boolean(bookRes.data.bookingId), `Generated unique Booking ID: ${bookRes.data.bookingId}`);
    assert(bookRes.data.booking.status === 'Pending', 'Initial booking status is Pending APMC approval');
    assert(bookRes.data.booking.crop === 'Basmati Paddy 1121', 'Booking includes crop field');
    assert(Boolean(bookRes.data.booking.slotId), 'Booking includes slotId');
    assert(Boolean(bookRes.data.booking.token), `Assigned gate token: ${bookRes.data.booking.token}`);

    const testBookingId = bookRes.data.bookingId;

    // 5. Duplicate Booking Prevention
    console.log('\n--- TEST 5: Prevent Duplicate Booking for Same Slot ---');
    const duplicateRes = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify(validBookingPayload)
    });
    assert(duplicateRes.status === 409, 'Rejects duplicate booking attempt on same slot with 409 Conflict');
    assert(duplicateRes.data.error.includes('already have an active booking'), 'Explains duplicate booking error to farmer');

    // 6. Farmer My Bookings Retrieval
    console.log('\n--- TEST 6: Farmer "My Bookings" Retrieval ---');
    const farmerBookings = await request('/api/bookings/farmer', {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(farmerBookings.status === 200, 'GET /api/bookings/farmer returns 200');
    assert(farmerBookings.data.success === true, 'Farmer bookings retrieved successfully');
    const foundFarmerBooking = farmerBookings.data.bookings.find(b => b.bookingId === testBookingId || b.id === testBookingId);
    assert(Boolean(foundFarmerBooking), 'Newly booked slot appears in Farmer "My Bookings"');
    assert(foundFarmerBooking.farmerId === 'FRM-TEST-001', 'Booking belongs to authenticated farmer');

    // Test alias GET /api/bookings/my
    const myBookingsAlias = await request('/api/bookings/my', {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    assert(myBookingsAlias.status === 200, 'GET /api/bookings/my alias returns 200');

    // 7. Buyer Booking Visibility
    console.log('\n--- TEST 7: Buyer Booking Visibility (Most Important Fix) ---');
    const buyerBookings = await request('/api/bookings/buyer', {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    assert(buyerBookings.status === 200, 'GET /api/bookings/buyer returns 200');
    assert(buyerBookings.data.success === true, 'Buyer bookings retrieved successfully');
    const foundBuyerBooking = buyerBookings.data.bookings.find(b => b.bookingId === testBookingId || b.id === testBookingId);
    assert(Boolean(foundBuyerBooking), 'Newly created farmer booking appears on Buyer dashboard immediately');
    assert(foundBuyerBooking.cropName === 'Basmati Paddy 1121', 'Buyer sees accurate crop details');
    assert(foundBuyerBooking.quantity === 65, 'Buyer sees correct quantity');
    assert(foundBuyerBooking.expectedPrice === 3250, 'Buyer sees expected selling price');

    // Test alias GET /api/bookings/available
    const availAlias = await request('/api/bookings/available', {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    assert(availAlias.status === 200, 'GET /api/bookings/available alias returns 200');

    // 8. Buyer Purchase Request Submission
    console.log('\n--- TEST 8: Buyer Submits Purchase Request ---');
    const buyReqRes = await request(`/api/bookings/${testBookingId}/buy-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({
        offeredPrice: 3300,
        notes: 'Ready for prompt procurement with direct weighbridge clearance'
      })
    });
    assert(buyReqRes.status === 200, 'Purchase request submitted successfully with 200 OK');
    assert(buyReqRes.data.booking.buyerRequests.length >= 1, 'Buyer request appended to booking document');
    assert(buyReqRes.data.booking.buyerRequests[0].buyerId === 'BUYER-TEST-01', 'Buyer ID recorded');

    // Prevent duplicate request by same buyer
    const duplicateBuyReq = await request(`/api/bookings/${testBookingId}/buy-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({ offeredPrice: 3350 })
    });
    assert(duplicateBuyReq.status === 400, 'Rejects duplicate purchase request by same buyer with 400');

    // 9. Admin Dashboard Visibility
    console.log('\n--- TEST 9: Admin Dashboard Slot Visibility ---');
    const adminBookings = await request('/api/bookings/admin', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminBookings.status === 200, 'GET /api/bookings/admin returns 200');
    const foundAdminBooking = adminBookings.data.bookings.find(b => b.bookingId === testBookingId || b.id === testBookingId);
    assert(Boolean(foundAdminBooking), 'Admin sees newly booked slot in slot management table');
    assert(foundAdminBooking.buyerRequests.length >= 1, 'Admin sees buyer purchase request');

    // 10. Admin Status State Machine Transitions
    console.log('\n--- TEST 10: Admin Status Transitions & State Machine ---');
    // Pending -> Approved
    const approveRes = await request(`/api/bookings/${testBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Approved', notes: 'APMC Gate verification passed' })
    });
    assert(approveRes.status === 200, 'Admin approves booking (Pending -> Approved) successfully');
    assert(approveRes.data.booking.status === 'Approved', 'Status updated to Approved');

    // Approved -> Completed
    const completeRes = await request(`/api/bookings/${testBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Completed', notes: 'Produce received and weighed' })
    });
    assert(completeRes.status === 200, 'Admin marks booking Completed (Approved -> Completed)');
    assert(completeRes.data.booking.status === 'Completed', 'Status updated to Completed');

    // Invalid transition: Completed -> Pending should be rejected
    const invalidTrans = await request(`/api/bookings/${testBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Pending' })
    });
    assert(invalidTrans.status === 400, 'Terminal state transition rejected with 400');

    // 11. Cancellation Authorization
    console.log('\n--- TEST 11: Cancellation Authorization & Protection ---');
    // Cannot cancel completed booking
    const cancelCompleted = await request(`/api/bookings/${testBookingId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({ reason: 'Try cancel completed' })
    });
    assert(cancelCompleted.status === 400, 'Completed booking cannot be cancelled (returns 400)');

    // Create a new Pending booking to test cancellation
    const cancelableBooking = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({
        ...validBookingPayload,
        timeSlot: '02:00 – 02:30 PM'
      })
    });
    const cancelableId = cancelableBooking.data.bookingId;

    // Unauthorized farmer cannot cancel
    const unauthorizedCancel = await request(`/api/bookings/${cancelableId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherFarmerToken}` },
      body: JSON.stringify({ reason: 'Hacking attempt' })
    });
    assert(unauthorizedCancel.status === 403, 'Unauthorized farmer cannot cancel another farmer booking (403)');

    // Owner farmer cancels successfully
    const authorizedCancel = await request(`/api/bookings/${cancelableId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: JSON.stringify({ reason: 'Harvest postponed by rain' })
    });
    assert(authorizedCancel.status === 200, 'Owner farmer cancels booking successfully');
    assert(authorizedCancel.data.booking.status === 'Cancelled', 'Booking marked as Cancelled');

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    testServer.close();
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
