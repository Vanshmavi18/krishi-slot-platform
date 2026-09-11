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
        { id: 1, name: 'Counter 1 (Gate & Token Verification)', currentToken: '-', officer: 'Anil Verma' },
        { id: 2, name: 'Counter 2 (Moisture & Quality Assay)', currentToken: '-', officer: 'Priya Sharma' },
        { id: 3, name: 'Counter 3 (Weighbridge & J-Form Slip)', currentToken: '-', officer: 'Mohan Lal' }
      ],
      dailyCapacity: 90,
      todayBooked: 0,
      todayCompleted: 0
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
        { id: 1, name: 'Counter 1 (Gate & Verification)', currentToken: '-', officer: 'S. K. Gupta' },
        { id: 2, name: 'Counter 2 (Quality Testing)', currentToken: '-', officer: 'Rekha Roy' },
        { id: 3, name: 'Counter 3 (Weighment & Accounts)', currentToken: '-', officer: 'R. K. Singh' }
      ],
      dailyCapacity: 150,
      todayBooked: 0,
      todayCompleted: 0
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
        { id: 1, name: 'Counter 1 (All Operations)', currentToken: '-', officer: 'D. N. Dubey' }
      ],
      dailyCapacity: 60,
      todayBooked: 0,
      todayCompleted: 0
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

  users: [],
  bookings: [],
  procurements: [],
  smsLogs: [],
  buyerOrders: [],
  activeQueue: {
    centreId: 'CTR-UP-01',
    nowServingNumber: 0,
    nowServingToken: 'Waiting',
    currentFarmer: 'Queue Idle',
    counter: 1,
    avgWaitPerFarmerMin: 0,
    counters: [
      { id: 1, name: 'Counter 1 (Gate & Token Verification)', servingToken: '-', servingFarmer: '-' },
      { id: 2, name: 'Counter 2 (Moisture & Quality Assay)', servingToken: '-', servingFarmer: '-' },
      { id: 3, name: 'Counter 3 (Weighbridge & Accounts)', servingToken: '-', servingFarmer: '-' }
    ]
  },
  notifications: []
};
