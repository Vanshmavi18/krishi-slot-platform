// server/services/queueService.js
import { db } from '../data/db.js';
import { sendSms, smsEvents } from './smsService.js';
import { EventEmitter } from 'events';
import { createNotification } from './notificationService.js';

export const queueEvents = new EventEmitter();

export function getQueueStatus(centreId = 'CTR-UP-01', farmerToken = 'A-047') {
  const activeQueue = db.getSingle('activeQueue') || {
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
  };

  const centre = db.find('centres', c => c.id === centreId) || db.get('centres')[0];
  const allWaiting = db.filter('bookings', b => b.centreId === centreId && b.status === 'CONFIRMED' && b.queueStatus === 'WAITING');

  // Parse token number e.g. A-047 -> 47
  let farmersAhead = 9;
  if (farmerToken) {
    const numPart = parseInt(farmerToken.replace(/\D/g, ''), 10);
    const servingNum = activeQueue.nowServingNumber || 38;
    farmersAhead = Math.max(0, numPart - servingNum);
  }

  const estimatedWaitMin = Math.max(2, farmersAhead * (activeQueue.avgWaitPerFarmerMin || 3));

  return {
    ...activeQueue,
    centreName: centre?.name || 'Jaitpur Procurement Centre',
    farmersAhead,
    estimatedWaitMin,
    totalWaiting: allWaiting.length || 19,
    completedToday: centre?.todayCompleted || 42,
    totalBooked: centre?.todayBooked || 64,
    dailyCapacity: centre?.dailyCapacity || 90,
    serverTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  };
}

export async function advanceQueue({ centreId = 'CTR-UP-01', counterId = 2, customToken = null }) {
  const activeQueue = db.getSingle('activeQueue');
  const nextServingNum = (activeQueue.nowServingNumber || 38) + 1;
  const nextToken = customToken || `A-0${nextServingNum}`;

  // Find farmer for this token if registered
  const bookedFarmer = db.find('bookings', b => b.token === nextToken);
  const farmerName = bookedFarmer ? bookedFarmer.farmerName : `Farmer ${nextToken}`;

  // Update target counter
  const targetCounter = activeQueue.counters.find(c => c.id === Number(counterId)) || activeQueue.counters[1];
  targetCounter.servingToken = nextToken;
  targetCounter.servingFarmer = farmerName;

  activeQueue.nowServingNumber = nextServingNum;
  activeQueue.nowServingToken = nextToken;
  activeQueue.currentFarmer = farmerName;
  activeQueue.counter = counterId;

  db.setSingle('activeQueue', activeQueue);

  // Update centre completed count
  db.update('centres', c => c.id === centreId, c => ({ ...c, todayCompleted: (c.todayCompleted || 40) + 1 }));

  // Proximity Alert Check: Check if any token is now exactly 5 positions away!
  const alertNum = nextServingNum + 5;
  const alertToken = `A-0${alertNum}`;
  const upcomingFarmer = db.find('bookings', b => b.token === alertToken);

  if (upcomingFarmer) {
    await sendSms({
      phone: upcomingFarmer.farmerPhone,
      recipientName: upcomingFarmer.farmerName,
      type: 'QUEUE_PROXIMITY',
      data: {
        name: upcomingFarmer.farmerName,
        token: upcomingFarmer.token,
        centre: upcomingFarmer.centreName,
        counter: targetCounter.name.split(' ')[0] + ' ' + targetCounter.name.split(' ')[1],
        ahead: 5
      }
    });

    try {
      createNotification({
        userId: upcomingFarmer.farmerId,
        role: 'farmer',
        type: 'QUEUE_ALERT',
        title: `Proximity Alert: Token #${upcomingFarmer.token}`,
        message: `Token #${nextToken} is now serving at Counter ${counterId}. Only ~5 tokens ahead of you! Please proceed to Mandi gate.`,
        category: 'alerts',
        link: 'queue',
        meta: { token: upcomingFarmer.token, nowServingToken: nextToken }
      });
    } catch (e) {
      console.warn('Proximity notification error:', e);
    }
  }

  // Emit SSE event
  queueEvents.emit('queue_updated', getQueueStatus(centreId));

  const updatedQueue = getQueueStatus(centreId);

  return {
    success: true,
    token: nextToken,
    nowServingToken: nextToken,
    queue: updatedQueue,
    farmerName,
    counterId,
    proximityAlertSentTo: upcomingFarmer ? upcomingFarmer.farmerName : null
  };
}

export async function broadcastDelay({ centreId = 'CTR-UP-01', reason, delayMins = 45 }) {
  const centre = db.find('centres', c => c.id === centreId) || db.get('centres')[0];
  const waitingBookings = db.filter('bookings', b => b.centreId === centreId && b.status === 'CONFIRMED');

  let sentCount = 0;
  for (const booking of waitingBookings) {
    await sendSms({
      phone: booking.farmerPhone,
      recipientName: booking.farmerName,
      type: 'BROADCAST_DELAY',
      data: {
        centre: centre.name,
        reason,
        delayMins
      }
    });
    sentCount++;
  }

  try {
    createNotification({
      userId: null,
      role: 'all',
      type: 'ADMIN_ALERT',
      title: `Mandi Delay Broadcast: ${centre.name}`,
      message: `${reason}. Operations are estimated to be delayed by approximately ${delayMins} minutes.`,
      category: 'alerts',
      link: 'queue',
      meta: { delayMins, centreId }
    });
  } catch (e) {
    console.warn('Broadcast notification error:', e);
  }

  return {
    success: true,
    message: `Delay alert broadcasted to ${sentCount} scheduled farmers.`,
    sentCount
  };
}
