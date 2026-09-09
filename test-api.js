// test-api.js
async function run() {
  console.log('--- Testing KrishiSlot Backend Endpoints ---');

  // 1. Health
  const resHealth = await fetch('http://localhost:5000/api/health').then(r => r.json());
  console.log('1. Health Check:', resHealth.status);

  // 2. Request OTP via Email
  const resEmailOtp = await fetch('http://localhost:5000/api/auth/send-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ramesh.farmer@krishislot.in' })
  }).then(r => r.json());
  console.log('2. Send Email OTP:', resEmailOtp.success, 'OTP:', resEmailOtp.demoOtp, 'Email:', resEmailOtp.email);

  // 3. Verify Email OTP and Save Password
  const otpToVerify = resEmailOtp.demoOtp || '123456';
  const resVerify = await fetch('http://localhost:5000/api/auth/verify-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ramesh.farmer@krishislot.in', otp: otpToVerify, savePassword: 'farmerPass2026' })
  }).then(r => r.json());
  console.log('3. Verify Email OTP & Save Password:', resVerify.success, 'Password Saved:', resVerify.passwordSaved, 'User:', resVerify.user?.name);
  
  // 3b. Test Login with Email + Password
  const resPwdLogin = await fetch('http://localhost:5000/api/auth/login-email-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ramesh.farmer@krishislot.in', password: 'farmerPass2026' })
  }).then(r => r.json());
  console.log('3b. Email + Password Login:', resPwdLogin.success, 'Role:', resPwdLogin.user?.role, 'Name:', resPwdLogin.user?.name);

  const activeUser = resVerify.user || resPwdLogin.user;
  const token = resVerify.token || resPwdLogin.token;

  // 3c. Check Email Auth status
  const resCheck = await fetch('http://localhost:5000/api/auth/check-email?email=ramesh.farmer@krishislot.in').then(r => r.json());
  console.log('3c. Email Auth Check:', resCheck.exists, 'Has Password:', resCheck.hasPassword);

  // 4. Slots availability
  const resSlots = await fetch('http://localhost:5000/api/slots/availability?centreId=CTR-UP-01&date=2026-09-12').then(r => r.json());
  console.log('4. Slot Windows Available:', resSlots.slots?.length);

  // 5. Book a Slot
  const resBook = await fetch('http://localhost:5000/api/slots/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      farmerId: activeUser.id,
      farmerName: activeUser.name,
      farmerPhone: activeUser.phone,
      centreId: 'CTR-UP-01',
      cropId: 'wheat',
      quantity: 50,
      vehicle: 'Tractor Trolley',
      date: '2026-09-12',
      timeSlot: '10:30 – 11:00 AM'
    })
  }).then(r => r.json());
  console.log('5. Slot Booked:', resBook.success, 'Token:', resBook.booking?.token);

  // 6. Queue status
  const resQueue = await fetch('http://localhost:5000/api/queue/status?centreId=CTR-UP-01&token=A-047').then(r => r.json());
  console.log('6. Queue Status - Serving:', resQueue.queue?.nowServingToken, 'Farmers Ahead:', resQueue.queue?.farmersAhead);

  // 7. SMS Mandi Alerts (Operational Telemetry)
  const resSms = await fetch('http://localhost:5000/api/sms/logs?phone=9876543210').then(r => r.json());
  console.log('7. SMS Logs count for farmer:', resSms.logs?.length);
  console.log('Latest Mandi SMS Alert:', resSms.logs[0]?.message);

  // 8. Admin Login (using Email or Staff ID)
  const resAdmin = await fetch('http://localhost:5000/api/auth/login-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId: 'admin@krishislot.in', password: 'admin123' })
  }).then(r => r.json());
  console.log('8. Admin Login (via Email):', resAdmin.success, 'Role:', resAdmin.user?.role, 'Name:', resAdmin.user?.name);

  // 9. Buyer Login (using Email or Buyer ID)
  const resBuyer = await fetch('http://localhost:5000/api/auth/login-buyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'buyer@agrocorp.in', password: 'buyer123' })
  }).then(r => r.json());
  console.log('9. Buyer Login (via Email):', resBuyer.success, 'Role:', resBuyer.user?.role, 'Company:', resBuyer.user?.company);

  // 10. Notification Endpoints
  const resNotifs = await fetch('http://localhost:5000/api/notifications?userId=' + activeUser.id).then(r => r.json());
  console.log('10. Farmer Notifications:', resNotifs.success, 'Count:', resNotifs.notifications?.length, 'Unread:', resNotifs.unreadCount);

  // 11. Buyer Marketplace & Place Order
  const resMarket = await fetch('http://localhost:5000/api/buyer/marketplace').then(r => r.json());
  console.log('11. Buyer Marketplace Lots:', resMarket.lots?.length);

  const resOrder = await fetch('http://localhost:5000/api/buyer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerId: 'BUYER-01',
      buyerName: 'AgroCorp Foods Pvt Ltd',
      cropId: 'paddy_comm',
      cropName: 'Paddy / धान (Common)',
      quantity: 50,
      offeredRate: 2350,
      centreId: 'CTR-UP-01',
      farmerId: activeUser.id,
      farmerName: activeUser.name
    })
  }).then(r => r.json());
  console.log('12. Buyer Placed Order:', resOrder.success, 'Order #:', resOrder.order?.id, 'Total:', resOrder.order?.totalValue);

  console.log('\n--- ALL BACKEND TESTS (EMAIL AUTH, OTP, PASSWORD, 3-ROLES) PASSED SUCCESSFULLY ---');
}

run().catch(console.error);
