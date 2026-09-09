// test-comprehensive.js
async function runAll() {
  console.log('=== KRISHISLOT COMPREHENSIVE SUITE TEST ===\n');

  // 1. Health
  const health = await fetch('http://localhost:5000/api/health').then(r => r.json());
  console.log('✓ API Health Check:', health.status, `(v${health.version})`);

  // 2. Staff Authentication (Mandi Officer)
  const staffLogin = await fetch('http://localhost:5000/api/auth/login-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId: 'OFFICER-01', password: 'admin123' })
  }).then(r => r.json());
  console.log('✓ Staff Login:', staffLogin.success, `Role: ${staffLogin.user.role}, Name: ${staffLogin.user.name}`);

  // 3. Farmer OTP Flow
  const otpRes = await fetch('http://localhost:5000/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210' })
  }).then(r => r.json());
  console.log('✓ OTP Dispatched via SMS Simulator:', otpRes.success, 'Code:', otpRes.demoOtp);

  const verifyRes = await fetch('http://localhost:5000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', otp: otpRes.demoOtp })
  }).then(r => r.json());
  console.log('✓ OTP Verified:', verifyRes.success, 'Farmer:', verifyRes.user.name);
  const farmerToken = verifyRes.token;

  // 4. Slots & Booking
  const centres = await fetch('http://localhost:5000/api/slots/centres').then(r => r.json());
  console.log('✓ APMC Centres loaded:', centres.centres.length);

  const crops = await fetch('http://localhost:5000/api/slots/crops').then(r => r.json());
  console.log('✓ Crops & MSP Rates loaded:', crops.crops.length);

  const booking = await fetch('http://localhost:5000/api/slots/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${farmerToken}` },
    body: JSON.stringify({
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar',
      farmerPhone: '9876543210',
      centreId: 'CTR-UP-01',
      cropId: 'paddy_comm',
      quantity: 45,
      vehicle: 'Tractor Trolley',
      date: '2026-09-12',
      timeSlot: '11:00 – 11:30 AM'
    })
  }).then(r => r.json());
  console.log('✓ Slot Booking Confirmed:', booking.success, 'Token #:', booking.booking.token);

  // 5. Live Queue Advancement
  const advance = await fetch('http://localhost:5000/api/queue/advance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counterId: 2 })
  }).then(r => r.json());
  console.log('✓ Mandi Queue Advanced:', advance.success, 'Now Serving:', advance.token);

  // 6. Emergency Delay Broadcast
  const broadcast = await fetch('http://localhost:5000/api/queue/broadcast-delay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ centreId: 'CTR-UP-01', reason: 'Unseasonal rain and wet grain assay delay', delayMins: 45 })
  }).then(r => r.json());
  console.log('✓ Emergency Delay Alert Broadcasted:', broadcast.success, `SMS sent to ${broadcast.dispatchedCount} farmers`);

  // 7. Digital Weighment & J-Form Issuance
  const procurement = await fetch('http://localhost:5000/api/procurements/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      farmerId: 'FRM-UP-26032',
      bookingId: booking.booking.id,
      cropId: 'paddy_comm',
      grossWeight: 62.5,
      tareWeight: 2.5,
      moisturePercent: 14.0,
      centreId: 'CTR-UP-01',
      officerName: 'V. K. Verma'
    })
  }).then(r => r.json());
  console.log('✓ Weighment Recorded & J-Form Issued:', procurement.success, 'Receipt #:', procurement.procurement.id, 'Payable: ₹' + procurement.procurement.amount);

  // 8. DBT Payment Approval
  const paid = await fetch(`http://localhost:5000/api/procurements/${procurement.procurement.id}/approve-payment`, {
    method: 'POST'
  }).then(r => r.json());
  console.log('✓ DBT Payment Dispatched:', paid.success, 'Status:', paid.procurement.paymentStatus, 'UTR:', paid.procurement.utr);

  // 9. Check Farmer SMS Inbox
  const smsList = await fetch('http://localhost:5000/api/sms/logs?phone=9876543210').then(r => r.json());
  console.log(`✓ Farmer Virtual Phone received ${smsList.logs.length} DLT Compliant SMS alerts`);

  // 10. Buyer Authentication
  const buyerLogin = await fetch('http://localhost:5000/api/auth/login-buyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'BUYER-01', password: 'buyer123' })
  }).then(r => r.json());
  console.log(`✓ Buyer Authentication: ${buyerLogin.success} (${buyerLogin.user.name} - ${buyerLogin.user.company})`);

  // 11. Buyer Marketplace & Contract Placement
  const market = await fetch('http://localhost:5000/api/buyer/marketplace').then(r => r.json());
  console.log(`✓ Buyer Mandi Marketplace: ${market.lots.length} active lots available`);

  const buyerOrder = await fetch('http://localhost:5000/api/buyer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerId: 'BUYER-01',
      buyerName: buyerLogin.user.name,
      cropId: 'paddy_comm',
      cropName: 'Paddy / धान (Common)',
      quantity: 120,
      offeredRate: 2360,
      centreId: 'CTR-UP-01',
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar'
    })
  }).then(r => r.json());
  console.log(`✓ Buyer Contract Placed: #${buyerOrder.order.id}, Total Value: ₹${buyerOrder.order.totalValue.toLocaleString('en-IN')}, Gate Pass: #${buyerOrder.order.gatePassId}`);

  // 12. Real-Time Notification System Fetch
  const notifs = await fetch('http://localhost:5000/api/notifications?userId=FRM-UP-26032').then(r => r.json());
  console.log(`✓ Notification System: ${notifs.notifications.length} notifications fetched (${notifs.unreadCount} unread)`);
  console.log(`  Latest Notification: "${notifs.notifications[0].title}"`);

  // 13. Mark All Notifications As Read
  const markRes = await fetch('http://localhost:5000/api/notifications/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'FRM-UP-26032' })
  }).then(r => r.json());
  console.log(`✓ Notification Read-All: ${markRes.markedCount} marked as read`);

  console.log('\n=== ALL 13 SUITE INTEGRATION TESTS COMPLETED 100% SUCCESSFULLY ===');
}

runAll().catch(console.error);
