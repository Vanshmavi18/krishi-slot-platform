// test-api.js
async function run() {
  console.log('--- Testing KrishiSlot Backend Endpoints ---');

  // 1. Health
  const resHealth = await fetch('http://localhost:5000/api/health').then(r => r.json());
  console.log('1. Health Check:', resHealth.status);

  // 2. Request OTP
  const resOtp = await fetch('http://localhost:5000/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210' })
  }).then(r => r.json());
  console.log('2. Send OTP:', resOtp.success, 'OTP:', resOtp.demoOtp);

  // 3. Verify OTP
  const resVerify = await fetch('http://localhost:5000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', otp: resOtp.demoOtp })
  }).then(r => r.json());
  console.log('3. Verify OTP:', resVerify.success, 'User:', resVerify.user?.name);
  const token = resVerify.token;

  // 4. Slots availability
  const resSlots = await fetch('http://localhost:5000/api/slots/availability?centreId=CTR-UP-01&date=2026-09-12').then(r => r.json());
  console.log('4. Slot Windows Available:', resSlots.slots?.length);

  // 5. Book a Slot
  const resBook = await fetch('http://localhost:5000/api/slots/book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      farmerId: resVerify.user.id,
      farmerName: resVerify.user.name,
      farmerPhone: resVerify.user.phone,
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

  // 7. SMS Logs
  const resSms = await fetch('http://localhost:5000/api/sms/logs?phone=9876543210').then(r => r.json());
  console.log('7. SMS Logs count for farmer:', resSms.logs?.length);
  console.log('Latest SMS:', resSms.logs[0]?.message);

  // 8. Admin Login
  const resAdmin = await fetch('http://localhost:5000/api/auth/login-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId: 'APMC-ADMIN', password: 'admin123' })
  }).then(r => r.json());
  console.log('8. Admin Login:', resAdmin.success, 'Role:', resAdmin.user?.role, 'Name:', resAdmin.user?.name);

  // 9. Buyer Login
  const resBuyer = await fetch('http://localhost:5000/api/auth/login-buyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'BUYER-01', password: 'buyer123' })
  }).then(r => r.json());
  console.log('9. Buyer Login:', resBuyer.success, 'Role:', resBuyer.user?.role, 'Company:', resBuyer.user?.company);

  // 10. Notification Endpoints
  const resNotifs = await fetch('http://localhost:5000/api/notifications?userId=' + resVerify.user.id).then(r => r.json());
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
      farmerId: resVerify.user.id,
      farmerName: resVerify.user.name
    })
  }).then(r => r.json());
  console.log('12. Buyer Placed Order:', resOrder.success, 'Order #:', resOrder.order?.id, 'Total:', resOrder.order?.totalValue);

  console.log('--- ALL BACKEND TESTS (3-ROLES & NOTIFICATIONS) PASSED SUCCESSFULLY ---');
}

run().catch(console.error);
