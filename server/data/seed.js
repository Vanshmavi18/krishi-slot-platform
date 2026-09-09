// server/data/seed.js
export const initialData = {
  centres: [
    {
      id: 'CTR-UP-01',
      name: 'Jaitpur Procurement Centre',
      nameHi: 'जैतपुर खरीद केंद्र',
      district: 'Gorakhpur',
      state: 'Uttar Pradesh',
      distanceKm: 3.2,
      operatingHours: '09:00 AM - 05:00 PM',
      counters: [
        { id: 1, name: 'Counter 1 (Gate & Token Verification)', currentToken: 'A-035', officer: 'Anil Verma' },
        { id: 2, name: 'Counter 2 (Moisture & Quality Assay)', currentToken: 'A-038', officer: 'Priya Sharma' },
        { id: 3, name: 'Counter 3 (Weighbridge & J-Form Slip)', currentToken: 'A-032', officer: 'Mohan Lal' }
      ],
      dailyCapacity: 90,
      todayBooked: 64,
      todayCompleted: 42
    },
    {
      id: 'CTR-UP-02',
      name: 'Gorakhpur Main APMC Mandi',
      nameHi: 'गोरखपुर मुख्य कृषि उपज मंडी',
      district: 'Gorakhpur',
      state: 'Uttar Pradesh',
      distanceKm: 8.4,
      operatingHours: '08:30 AM - 06:00 PM',
      counters: [
        { id: 1, name: 'Counter 1 (Gate & Verification)', currentToken: 'B-021', officer: 'S. K. Gupta' },
        { id: 2, name: 'Counter 2 (Quality Testing)', currentToken: 'B-025', officer: 'Rekha Roy' },
        { id: 3, name: 'Counter 3 (Weighment & Accounts)', currentToken: 'B-019', officer: 'R. K. Singh' }
      ],
      dailyCapacity: 150,
      todayBooked: 112,
      todayCompleted: 78
    },
    {
      id: 'CTR-UP-03',
      name: 'Sahjanwa Krishik Seva Kendra',
      nameHi: 'सहजनवा कृषक सेवा केंद्र',
      district: 'Gorakhpur',
      state: 'Uttar Pradesh',
      distanceKm: 14.1,
      operatingHours: '09:00 AM - 05:00 PM',
      counters: [
        { id: 1, name: 'Counter 1 (All Operations)', currentToken: 'S-014', officer: 'D. N. Dubey' }
      ],
      dailyCapacity: 60,
      todayBooked: 45,
      todayCompleted: 31
    }
  ],

  crops: [
    { id: 'paddy_comm', name: 'Paddy / धान (Common)', mspRate: 2300, unit: 'quintal', maxMoisture: 17 },
    { id: 'paddy_grade_a', name: 'Paddy / धान (Grade A)', mspRate: 2320, unit: 'quintal', maxMoisture: 17 },
    { id: 'wheat', name: 'Wheat / गेहूं', mspRate: 2425, unit: 'quintal', maxMoisture: 12 },
    { id: 'mustard', name: 'Mustard / सरसों', mspRate: 5650, unit: 'quintal', maxMoisture: 8 },
    { id: 'maize', name: 'Maize / मक्का', mspRate: 2090, unit: 'quintal', maxMoisture: 14 },
    { id: 'gram', name: 'Gram / चना', mspRate: 5440, unit: 'quintal', maxMoisture: 10 }
  ],

  users: [
    {
      id: 'FRM-UP-26032',
      role: 'farmer',
      name: 'Ramesh Kumar',
      email: 'ramesh.farmer@krishislot.in',
      phone: '9876543210',
      passwordHash: 'farmer123',
      village: 'Jaitpur, Gorakhpur, Uttar Pradesh',
      aadhaarMasked: '•••• •••• 5812',
      bankName: 'State Bank of India',
      bankAccMasked: '•••• •••• 4862',
      ifsc: 'SBIN0001248',
      landAcres: 4.5,
      khasraNumber: '142/2'
    },
    {
      id: 'FRM-UP-26033',
      role: 'farmer',
      name: 'Sunita Devi',
      email: 'sunita.farmer@krishislot.in',
      phone: '9812345678',
      passwordHash: 'farmer123',
      village: 'Bhiti, Gorakhpur, Uttar Pradesh',
      aadhaarMasked: '•••• •••• 9104',
      bankName: 'Punjab National Bank',
      bankAccMasked: '•••• •••• 8219',
      ifsc: 'PUNB0123400',
      landAcres: 3.2,
      khasraNumber: '89/1'
    },
    {
      id: 'OFFICER-01',
      role: 'officer',
      name: 'V. K. Verma',
      staffId: 'OFFICER-01',
      email: 'officer@krishislot.in',
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      passwordHash: 'admin123',
      designation: 'Mandi Procurement Inspector'
    },
    {
      id: 'APMC-ADMIN',
      role: 'admin',
      name: 'Dr. Alok Nath (Admin)',
      staffId: 'APMC-ADMIN',
      email: 'admin@krishislot.in',
      passwordHash: 'admin123',
      designation: 'Director, Agricultural Marketing Board'
    },
    {
      id: 'BUYER-01',
      role: 'buyer',
      name: 'Vikram Singhania',
      buyerId: 'BUYER-01',
      email: 'buyer@agrocorp.in',
      company: 'AgroCorp Foods Pvt Ltd',
      phone: '9822334455',
      passwordHash: 'buyer123',
      licenseNo: 'APMC-DL-8821',
      gstin: '09AAACA1234Q1Z5',
      businessType: 'Grain Processor & Exporter',
      location: 'Gorakhpur Industrial Corridor'
    },
    {
      id: 'BUYER-02',
      role: 'buyer',
      name: 'Rajesh Agarwal',
      buyerId: 'BUYER-02',
      email: 'rajesh.buyer@krishislot.in',
      company: 'Pawan Agrotech Flour Mill',
      phone: '9833445566',
      passwordHash: 'buyer123',
      licenseNo: 'APMC-DL-5542',
      gstin: '09AABCA9988P1Z3',
      businessType: 'Flour & Pulse Miller',
      location: 'Sahjanwa Mandi Hub'
    }
  ],

  bookings: [
    {
      id: 'BK-2026-9041',
      token: 'A-047',
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar',
      farmerPhone: '9876543210',
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      cropId: 'paddy_comm',
      cropName: 'Paddy (धान)',
      quantity: 42,
      vehicle: 'Tractor Trolley (UP-53-AT-4211)',
      date: '2026-09-12',
      displayDate: '12 September, Friday',
      timeSlot: '10:30 – 11:00 AM',
      status: 'CONFIRMED',
      queueStatus: 'WAITING',
      createdAt: '2026-09-04T09:20:00Z',
      qrCodeData: 'KRISHISLOT|BK-2026-9041|A-047|FRM-UP-26032|42QTL'
    },
    {
      id: 'BK-2026-9042',
      token: 'A-048',
      farmerId: 'FRM-UP-26033',
      farmerName: 'Sunita Devi',
      farmerPhone: '9812345678',
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      cropId: 'paddy_comm',
      cropName: 'Paddy (धान)',
      quantity: 35,
      vehicle: 'Small Commercial Vehicle',
      date: '2026-09-12',
      displayDate: '12 September, Friday',
      timeSlot: '11:00 – 11:30 AM',
      status: 'CONFIRMED',
      queueStatus: 'WAITING',
      createdAt: '2026-09-04T09:45:00Z',
      qrCodeData: 'KRISHISLOT|BK-2026-9042|A-048|FRM-UP-26033|35QTL'
    },
    {
      id: 'BK-2026-9043',
      token: 'A-049',
      farmerId: 'FRM-UP-26034',
      farmerName: 'Mohd. Aslam',
      farmerPhone: '9899887766',
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      cropId: 'wheat',
      cropName: 'Wheat (गेहूं)',
      quantity: 28,
      vehicle: 'Tractor Trolley',
      date: '2026-09-12',
      displayDate: '12 September, Friday',
      timeSlot: '11:00 – 11:30 AM',
      status: 'CONFIRMED',
      queueStatus: 'WAITING',
      createdAt: '2026-09-04T10:10:00Z',
      qrCodeData: 'KRISHISLOT|BK-2026-9043|A-049|FRM-UP-26034|28QTL'
    },
    {
      id: 'BK-2026-9044',
      token: 'A-050',
      farmerId: 'FRM-UP-26035',
      farmerName: 'Kiran Yadav',
      farmerPhone: '9788112233',
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      cropId: 'paddy_comm',
      cropName: 'Paddy (धान)',
      quantity: 50,
      vehicle: 'Pickup 407',
      date: '2026-09-12',
      displayDate: '12 September, Friday',
      timeSlot: '11:30 – 12:00 PM',
      status: 'CONFIRMED',
      queueStatus: 'WAITING',
      createdAt: '2026-09-04T10:30:00Z',
      qrCodeData: 'KRISHISLOT|BK-2026-9044|A-050|FRM-UP-26035|50QTL'
    }
  ],

  procurements: [
    {
      id: 'KR-2026-8831',
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar',
      date: '29 Aug 2026',
      crop: 'Paddy (Common) • 58 qtl',
      cropId: 'paddy_comm',
      centre: 'Jaitpur Procurement Centre',
      grossWeight: 60.5,
      tareWeight: 2.5,
      netWeight: 58.0,
      moisturePercent: 14.2,
      mspRate: 2300,
      amount: 133400,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      utr: 'SBI982341908234',
      paidDate: '31 Aug 2026',
      receiptUrl: '#',
      milestones: [
        { stage: 'Gate Inward & Token Verified', time: '29 Aug, 09:15 AM', done: true },
        { stage: 'Moisture & Quality Assay (14.2% FAQ)', time: '29 Aug, 09:40 AM', done: true },
        { stage: 'Weighbridge Weighed (58.0 qtl Net)', time: '29 Aug, 10:15 AM', done: true },
        { stage: 'Procurement J-Form Generated', time: '29 Aug, 10:30 AM', done: true },
        { stage: 'DBT Payment Dispatched via PFMS', time: '31 Aug, 02:40 PM', done: true }
      ]
    },
    {
      id: 'KR-2026-8712',
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar',
      date: '14 Aug 2026',
      crop: 'Paddy (Common) • 62 qtl',
      cropId: 'paddy_comm',
      centre: 'Jaitpur Procurement Centre',
      grossWeight: 65.0,
      tareWeight: 3.0,
      netWeight: 62.0,
      moisturePercent: 13.8,
      mspRate: 2300,
      amount: 142600,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      utr: 'SBI981123490123',
      paidDate: '17 Aug 2026',
      receiptUrl: '#',
      milestones: [
        { stage: 'Gate Inward & Token Verified', time: '14 Aug, 10:10 AM', done: true },
        { stage: 'Moisture & Quality Assay (13.8% FAQ)', time: '14 Aug, 10:35 AM', done: true },
        { stage: 'Weighbridge Weighed (62.0 qtl Net)', time: '14 Aug, 11:00 AM', done: true },
        { stage: 'Procurement J-Form Generated', time: '14 Aug, 11:20 AM', done: true },
        { stage: 'DBT Payment Dispatched via PFMS', time: '17 Aug, 11:15 AM', done: true }
      ]
    },
    {
      id: 'KR-2026-8645',
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar',
      date: '04 Sep 2026',
      crop: 'Wheat • 42 qtl',
      cropId: 'wheat',
      centre: 'Jaitpur Procurement Centre',
      grossWeight: 44.2,
      tareWeight: 2.2,
      netWeight: 42.0,
      moisturePercent: 11.5,
      mspRate: 2425,
      amount: 101850,
      status: 'COMPLETED',
      paymentStatus: 'PROCESSING',
      expectedDate: '08 Sep 2026',
      milestones: [
        { stage: 'Gate Inward & Token Verified', time: '04 Sep, 08:50 AM', done: true },
        { stage: 'Moisture & Quality Assay (11.5% FAQ)', time: '04 Sep, 09:20 AM', done: true },
        { stage: 'Weighbridge Weighed (42.0 qtl Net)', time: '04 Sep, 09:55 AM', done: true },
        { stage: 'Procurement J-Form Generated', time: '04 Sep, 10:15 AM', done: true },
        { stage: 'DBT Payment Dispatched via PFMS', time: 'Expected 08 Sep 2026', done: false }
      ]
    }
  ],

  smsLogs: [
    {
      id: 'SMS-1001',
      phone: '9876543210',
      recipientName: 'Ramesh Kumar',
      senderId: 'VK-KRISHI',
      type: 'SLOT_CONFIRMED',
      message: 'प्रिय Ramesh Kumar, आपका धान खरीद स्लॉट जैतपुर खरीद केंद्र पर 12 Sep, 10:30 AM के लिए टोकन #A-047 कन्फर्म हो गया है। कृपया समय से 15 मिनट पहले पहुंचे। - कृषि स्लॉट (KrishiSlot)',
      timestamp: '2026-09-04T09:20:00Z',
      status: 'DELIVERED'
    },
    {
      id: 'SMS-1002',
      phone: '9876543210',
      recipientName: 'Ramesh Kumar',
      senderId: 'VK-KRISHI',
      type: 'PAYMENT_INITIATED',
      message: 'प्रिय Ramesh Kumar, रसीद संख्या KR-2026-8645 की ₹1,01,850 की DBT भुगतान प्रक्रिया शुरू हो चुकी है। राशि 08 Sep तक आपके SBI खाते में जमा होगी। - KrishiSlot',
      timestamp: '2026-09-04T10:16:00Z',
      status: 'DELIVERED'
    },
    {
      id: 'SMS-1003',
      phone: '9876543210',
      recipientName: 'Ramesh Kumar',
      senderId: 'VK-KRISHI',
      type: 'PAYMENT_CREDITED',
      message: 'प्रिय Ramesh Kumar, आपके SBI खाते •••• 4862 में KR-2026-8831 के लिए ₹1,33,400 DBT द्वारा जमा कर दिए गए हैं। UTR: SBI982341908234। - KrishiSlot',
      timestamp: '2026-08-31T14:41:00Z',
      status: 'DELIVERED'
    }
  ],

  activeQueue: {
    centreId: 'CTR-UP-01',
    nowServingNumber: 38,
    nowServingToken: 'A-038',
    currentFarmer: 'Vijay Singh',
    counter: 2,
    avgWaitPerFarmerMin: 3,
    counters: [
      { id: 1, name: 'Counter 1 (Verification)', servingToken: 'A-035', servingFarmer: 'Ram Swaroop' },
      { id: 2, name: 'Counter 2 (Quality & Assay)', servingToken: 'A-038', servingFarmer: 'Vijay Singh' },
      { id: 3, name: 'Counter 3 (Weighment & Slip)', servingToken: 'A-032', servingFarmer: 'Ghanshyam' }
    ]
  },

  buyerOrders: [
    {
      id: 'BO-2026-101',
      buyerId: 'BUYER-01',
      buyerName: 'Vikram Singhania (AgroCorp Foods)',
      cropId: 'paddy_comm',
      cropName: 'Paddy / धान (Common)',
      quantity: 100,
      offeredRate: 2340,
      totalValue: 234000,
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      farmerId: 'FRM-UP-26032',
      farmerName: 'Ramesh Kumar',
      status: 'CONFIRMED',
      deliveryDate: '2026-09-14',
      pickupSlot: '11:00 AM – 01:00 PM',
      gatePassId: 'GP-2026-881',
      createdAt: '2026-09-08T10:30:00Z'
    },
    {
      id: 'BO-2026-102',
      buyerId: 'BUYER-01',
      buyerName: 'Vikram Singhania (AgroCorp Foods)',
      cropId: 'wheat',
      cropName: 'Wheat / गेहूं',
      quantity: 80,
      offeredRate: 2460,
      totalValue: 196800,
      centreId: 'CTR-UP-01',
      centreName: 'Jaitpur Procurement Centre',
      farmerId: 'FRM-UP-26033',
      farmerName: 'Sunita Devi',
      status: 'PLACED',
      deliveryDate: '2026-09-15',
      pickupSlot: '02:00 PM – 04:00 PM',
      gatePassId: null,
      createdAt: '2026-09-08T14:15:00Z'
    }
  ],

  notifications: [
    {
      id: 'NOTIF-101',
      userId: 'FRM-UP-26032',
      role: 'farmer',
      type: 'SLOT_CONFIRMED',
      title: 'Slot Confirmed: Token #A-047',
      message: 'Your Paddy delivery slot at Jaitpur Centre is confirmed for 12 Sep, 10:30 AM.',
      category: 'slots',
      read: false,
      timestamp: '2026-09-08T11:00:00Z',
      link: 'booking'
    },
    {
      id: 'NOTIF-102',
      userId: 'FRM-UP-26032',
      role: 'farmer',
      type: 'PAYMENT_CREDITED',
      title: 'DBT Payment Dispatched: ₹1,33,400',
      message: 'Payment for Receipt #KR-2026-8831 has been credited to your SBI account via PFMS.',
      category: 'payments',
      read: false,
      timestamp: '2026-09-07T14:20:00Z',
      link: 'procurements'
    },
    {
      id: 'NOTIF-103',
      userId: 'FRM-UP-26032',
      role: 'farmer',
      type: 'QUEUE_ALERT',
      title: 'Proximity Alert: 5 Tokens Remaining',
      message: 'Token #A-042 is now serving at Counter 2. Please start moving towards Jaitpur Gate 1.',
      category: 'alerts',
      read: true,
      timestamp: '2026-09-06T09:40:00Z',
      link: 'queue'
    },
    {
      id: 'NOTIF-201',
      userId: 'APMC-ADMIN',
      role: 'admin',
      type: 'ADMIN_ALERT',
      title: 'Centre Capacity Advisory: Jaitpur Mandi',
      message: 'Slot bookings reached 71% (64/90 slots) for 12 September.',
      category: 'alerts',
      read: false,
      timestamp: '2026-09-08T15:00:00Z',
      link: 'centre'
    },
    {
      id: 'NOTIF-202',
      userId: 'APMC-ADMIN',
      role: 'admin',
      type: 'BUYER_ORDER',
      title: 'New Commercial Buyer Bid',
      message: 'AgroCorp Foods placed a verified bid of ₹2,34,000 for 100 qtl Paddy.',
      category: 'orders',
      read: false,
      timestamp: '2026-09-08T10:31:00Z',
      link: 'centre'
    },
    {
      id: 'NOTIF-301',
      userId: 'BUYER-01',
      role: 'buyer',
      type: 'MARKET_ARRIVAL',
      title: 'Fresh Mandi Arrival: 45 qtl Paddy (FAQ Grade)',
      message: 'Farmer Ramesh Kumar scheduled 45 qtl Paddy at Jaitpur Mandi. Base MSP ₹2,300/qtl.',
      category: 'marketplace',
      read: false,
      timestamp: '2026-09-08T14:50:00Z',
      link: 'buyer'
    },
    {
      id: 'NOTIF-302',
      userId: 'BUYER-01',
      role: 'buyer',
      type: 'GATE_PASS_ISSUED',
      title: 'Gate Pass Ready #GP-2026-881',
      message: 'Pickup authorization confirmed for Order #BO-2026-101. Weighbridge Counter 3.',
      category: 'orders',
      read: false,
      timestamp: '2026-09-08T12:15:00Z',
      link: 'buyer'
    }
  ]
};
