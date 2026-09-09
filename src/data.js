export const farmer = {
  name: 'Ramesh Kumar', id: 'FRM-UP-26032', phone: '+91 98765 43210',
  village: 'Jaitpur, Gorakhpur, Uttar Pradesh', bank: 'State Bank of India •••• 4862'
};

export const nextSlot = {
  date: '12 September, Friday', time: '10:30 – 11:00 AM', token: 'A-047',
  centre: 'Jaitpur Procurement Centre', crop: 'Paddy (धान)', quantity: 42
};

export const procurements = [
  ['KR-2026-8831', '29 Aug 2026', 'Paddy • 58 qtl', '₹31,780', 'Paid'],
  ['KR-2026-8712', '14 Aug 2026', 'Paddy • 62 qtl', '₹31,780', 'Paid'],
  ['KR-2026-8645', '04 Sep 2026', 'Wheat • 42 qtl', '₹22,680', 'Expected 08 Sep']
];

export const notifications = [
  ['📅', 'Slot confirmed — 12 September, 10:30 AM', 'Your token is #A-047 at Jaitpur Procurement Centre.', 'Today, 9:20 AM', true],
  ['₹', 'Payment is being processed', '₹22,680 for KR-2026-8645 will reach your bank account by 08 September.', 'Yesterday, 4:45 PM', true],
  ['✓', 'Procurement completed successfully', '58 quintals of paddy recorded. Receipt KR-2026-8831 is available.', '29 Aug, 12:20 PM', false],
  ['⚠️', 'Arrival guidance', 'Come to the centre only 10 minutes before your assigned slot.', '27 Aug, 10:00 AM', false]
];

export const adminTokens = [
  ['A-047', 'Ramesh Kumar', '10:30 AM', 'Paddy • 42 qtl'],
  ['A-048', 'Sunita Devi', '11:00 AM', 'Paddy • 35 qtl'],
  ['A-049', 'Mohd. Aslam', '11:00 AM', 'Wheat • 28 qtl'],
  ['A-050', 'Kiran Yadav', '11:30 AM', 'Paddy • 50 qtl']
];
