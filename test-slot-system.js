// test-slot-system.js
import http from 'http';
import { app } from './server/index.js';

const PORT = 5099;
let server;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, `http://127.0.0.1:${PORT}`);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🌱 Starting Farmer Slot Booking System Verification Suite...\n');

  server = app.listen(PORT, () => {
    console.log(`[TEST SERVER] Running on port ${PORT}`);
  });

  try {
    // Step 1: Health & DB Status
    console.log('1️⃣ Checking Health Check & DB Status...');
    const health = await request('/api/health');
    console.log('   ✓ Health Check Status:', health.status, health.data.status);
    if (health.status !== 200) throw new Error('Health check failed');

    // Step 2: Authenticate Users
    console.log('\n2️⃣ Authenticating Farmer, Buyer, and Admin...');
    
    // Farmer Login
    const farmerAuth = await request('/api/auth/quick-switch', {
      method: 'POST',
      body: { role: 'farmer', id: 'FRM-UP-26032' }
    });
    const farmerToken = farmerAuth.data.token;
    console.log('   ✓ Farmer Authenticated:', farmerAuth.data.user.name, `(${farmerAuth.data.user.id})`);

    // Buyer Login
    const buyerAuth = await request('/api/auth/quick-switch', {
      method: 'POST',
      body: { role: 'buyer', id: 'BUYER-01' }
    });
    const buyerToken = buyerAuth.data.token;
    console.log('   ✓ Buyer Authenticated:', buyerAuth.data.user.name, `(${buyerAuth.data.user.id})`);

    // Admin Login
    const adminAuth = await request('/api/auth/quick-switch', {
      method: 'POST',
      body: { role: 'admin' }
    });
    const adminToken = adminAuth.data.token;
    console.log('   ✓ Admin Authenticated:', adminAuth.data.user.name, `(${adminAuth.data.user.id})`);

    // Step 3: Test Farmer Booking Validation
    console.log('\n3️⃣ Testing Server-Side Input Validation...');
    const invalidBooking = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        cropName: '',
        quantity: -10,
        expectedPrice: 0
      }
    });
    console.log('   ✓ Rejection on invalid inputs:', invalidBooking.status === 400, 'Error:', invalidBooking.data.error);
    if (invalidBooking.status !== 400) throw new Error('Validation failed to reject invalid inputs');

    // Step 4: Farmer Books a Real Slot
    console.log('\n4️⃣ Testing Farmer Slot Booking Creation (POST /api/bookings)...');
    const createRes = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        cropName: 'Basmati Paddy 1121',
        quantity: 65,
        quantityUnit: 'quintal',
        expectedPrice: 3850,
        preferredDate: '2026-09-18',
        timeSlot: '11:00 – 11:30 AM',
        location: 'Jaitpur Procurement Centre',
        vehicle: 'Tractor Trolley',
        notes: 'Grain moisture tested at 12.2%, 50kg export bags'
      }
    });

    console.log('   ✓ Booking Created:', createRes.status === 201, 'Booking ID:', createRes.data.bookingId);
    console.log('   ✓ Initial Status:', createRes.data.booking.status);
    console.log('   ✓ Gate Token Assigned:', createRes.data.booking.token);
    if (createRes.status !== 201 || createRes.data.booking.status !== 'Pending') {
      throw new Error('Booking creation failed or initial status was not Pending');
    }

    const testBookingId = createRes.data.bookingId;

    // Step 5: Farmer Checks My Bookings
    console.log('\n5️⃣ Testing Farmer My Bookings (GET /api/bookings/my)...');
    const myBookings = await request('/api/bookings/my', {
      headers: { Authorization: `Bearer ${farmerToken}` }
    });
    const foundMyBooking = myBookings.data.bookings.find(b => b.bookingId === testBookingId || b.id === testBookingId);
    console.log('   ✓ Booking found in farmer list:', Boolean(foundMyBooking));
    console.log('   ✓ Status in farmer dashboard:', foundMyBooking?.status);
    if (!foundMyBooking) throw new Error('Booking not present in My Bookings');

    // Step 6: Admin Views All Bookings
    console.log('\n6️⃣ Testing Admin Booking Management (GET /api/bookings/admin)...');
    const adminBookings = await request('/api/bookings/admin', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const foundInAdmin = adminBookings.data.bookings.find(b => b.bookingId === testBookingId || b.id === testBookingId);
    console.log('   ✓ Booking visible to Admin:', Boolean(foundInAdmin));
    console.log('   ✓ Farmer ID & Name verified:', foundInAdmin?.farmerName, foundInAdmin?.farmerId);
    if (!foundInAdmin) throw new Error('Booking not found in admin view');

    // Step 7: Admin Approves the Booking
    console.log('\n7️⃣ Testing Admin Status Approval (PATCH /api/bookings/:id/status)...');
    const approveRes = await request(`/api/bookings/${testBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Approved', notes: 'Mandi documents verified. Approved for Counter 2 entry.' }
    });
    console.log('   ✓ Status update response:', approveRes.status === 200, 'New Status:', approveRes.data.booking?.status);
    if (approveRes.data.booking?.status !== 'Approved') throw new Error('Failed to approve booking');

    // Step 8: Buyer Views Available Slots
    console.log('\n8️⃣ Testing Buyer Available Slots (GET /api/bookings/available)...');
    const availRes = await request('/api/bookings/available', {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    const foundInAvail = availRes.data.bookings.find(b => b.bookingId === testBookingId || b.id === testBookingId);
    console.log('   ✓ Approved slot visible to Buyer:', Boolean(foundInAvail));
    console.log('   ✓ Crop & Price visible:', foundInAvail?.cropName, `₹${foundInAvail?.expectedPrice}`);
    if (!foundInAvail) throw new Error('Approved slot not visible in available slots for buyers');

    // Step 9: Buyer Submits Purchase Request
    console.log('\n9️⃣ Testing Buyer Purchase Request (POST /api/bookings/:id/buy-request)...');
    const buyReqRes = await request(`/api/bookings/${testBookingId}/buy-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        offeredPrice: 3900,
        notes: 'AgroCorp willing to purchase entire 65 quintal lot at premium rate.'
      }
    });
    console.log('   ✓ Purchase request submitted:', buyReqRes.status === 200);
    console.log('   ✓ Primary Buyer Assigned:', buyReqRes.data.booking?.buyerName);
    console.log('   ✓ Buyer Requests Count:', buyReqRes.data.booking?.buyerRequests?.length);
    if (buyReqRes.status !== 200 || buyReqRes.data.booking?.buyerRequests?.length === 0) {
      throw new Error('Buyer request failed to record');
    }

    // Step 10: Duplicate Request Prevention
    console.log('\n🔟 Testing Duplicate Buyer Request Prevention...');
    const duplicateRes = await request(`/api/bookings/${testBookingId}/buy-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: { offeredPrice: 3950 }
    });
    console.log('   ✓ Duplicate rejected with 400:', duplicateRes.status === 400, 'Error:', duplicateRes.data.error);
    if (duplicateRes.status !== 400) throw new Error('Duplicate request was not prevented');

    // Step 11: Admin Marks Booking as Completed
    console.log('\n1️⃣1️⃣ Testing Completion Transition (Approved -> Completed)...');
    const completeRes = await request(`/api/bookings/${testBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Completed', notes: 'Produce weighed, payment cleared.' }
    });
    console.log('   ✓ Marked Completed:', completeRes.status === 200, 'Status:', completeRes.data.booking?.status);
    if (completeRes.data.booking?.status !== 'Completed') throw new Error('Failed to mark Completed');

    // Step 12: Invalid Status Transition Prevention
    console.log('\n1️⃣2️⃣ Testing Invalid Transition Prevention (Completed -> Approved)...');
    const invalidTrans = await request(`/api/bookings/${testBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Approved' }
    });
    console.log('   ✓ Invalid transition rejected with 400:', invalidTrans.status === 400);
    if (invalidTrans.status !== 400) throw new Error('Invalid transition was not prevented');

    // Step 13: Cancellation Flow
    console.log('\n1️⃣3️⃣ Testing Cancellation Flow...');
    const cancelTest = await request('/api/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        cropName: 'Mustard Seeds',
        quantity: 20,
        expectedPrice: 5600,
        preferredDate: '2026-09-20',
        timeSlot: '09:00 – 09:30 AM',
        location: 'Gorakhpur Mandi'
      }
    });
    const cancelBookingId = cancelTest.data.bookingId;

    const cancelRes = await request(`/api/bookings/${cancelBookingId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: { reason: 'Crop harvest postponed' }
    });
    console.log('   ✓ Booking Cancelled by Farmer:', cancelRes.status === 200, 'Status:', cancelRes.data.booking?.status);
    if (cancelRes.data.booking?.status !== 'Cancelled') throw new Error('Cancellation failed');

    // Step 14: Security Authorization Test (Unauthorized Farmer access)
    console.log('\n1️⃣4️⃣ Testing Role-Based Security & Unauthorized Access...');
    const farmer2Auth = await request('/api/auth/quick-switch', {
      method: 'POST',
      body: { role: 'farmer', id: 'FRM-UP-26033' } // Sunita Devi
    });
    const farmer2Token = farmer2Auth.data.token;

    // Sunita tries to access Ramesh's private booking details
    const unauthorizedAccess = await request(`/api/bookings/${cancelBookingId}`, {
      headers: { Authorization: `Bearer ${farmer2Token}` }
    });
    console.log('   ✓ Cross-farmer access blocked with 403:', unauthorizedAccess.status === 403);
    if (unauthorizedAccess.status !== 403) throw new Error('Cross-farmer access security failed');

    console.log('\n======================================================');
    console.log('🎉 ALL 14 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
  } finally {
    if (server) {
      server.close();
      console.log('[TEST SERVER] Stopped.');
    }
  }
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
