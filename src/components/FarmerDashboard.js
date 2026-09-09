// src/components/FarmerDashboard.js

export function renderFarmerDashboard({ user, stats, latestBooking, queueStatus, t, onNavigate }) {
  const nextSlot = latestBooking || {
    date: '12 September, Friday',
    timeSlot: '10:30 – 11:00 AM',
    token: 'A-047',
    centreName: 'Jaitpur Procurement Centre',
    cropName: 'Paddy (धान)',
    quantity: 42
  };

  const queue = queueStatus || {
    nowServingToken: 'A-038',
    nowServingNumber: 38,
    farmersAhead: 9,
    estimatedWaitMin: 27
  };

  const statData = stats || {
    totalProcured: 133400,
    paid: 133400,
    pending: 101850
  };

  return `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${t.dashboard.greeting}, ${user?.name || 'Ramesh Kumar'}! 👋</h1>
        <p class="page-subtitle">${t.dashboard.subtitle}</p>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <div>
          <!-- Upcoming Procurement Slot Card -->
          <article class="slot-hero-card">
            <div class="slot-hero-eyebrow">${t.dashboard.upcomingSlot}</div>
            <h2 class="slot-hero-title">${nextSlot.displayDate || nextSlot.date} <span>• ${nextSlot.timeSlot}</span></h2>
            
            <div class="slot-hero-footer">
              <div class="slot-hero-info">
                <p>${t.dashboard.mandi}: <b>${nextSlot.centreName}</b></p>
                <p>${t.dashboard.crop}: <b>${nextSlot.cropName} • ${nextSlot.quantity} quintals</b></p>
              </div>
              <div class="token-box">
                <span>${t.dashboard.token}</span>
                <strong>#${nextSlot.token}</strong>
              </div>
            </div>
          </article>

          <!-- Season Financial Stats -->
          <div class="stats-grid">
            <div class="stat-card">
              <span class="label">${t.dashboard.totalProcured}</span>
              <strong class="value">₹${(statData.totalProcured || 235250).toLocaleString('en-IN')}</strong>
              <span class="sub">↑ Active Season 2026</span>
            </div>
            <div class="stat-card">
              <span class="label">${t.dashboard.paid}</span>
              <strong class="value" style="color:#15803d">₹${(statData.paid || 133400).toLocaleString('en-IN')}</strong>
              <span class="sub">✓ 2 DBT Cleared</span>
            </div>
            <div class="stat-card">
              <span class="label">${t.dashboard.pending}</span>
              <strong class="value" style="color:#d97706">₹${(statData.pending || 101850).toLocaleString('en-IN')}</strong>
              <span class="sub" style="color:#d97706">Processing by PFMS</span>
            </div>
          </div>
        </div>

        <!-- Live Queue Snapshot Card -->
        <article class="card">
          <div class="queue-card-head">
            <h3>${t.dashboard.liveQueueTitle}</h3>
            <span class="pulse-dot"></span>
          </div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:10px">Jaitpur Centre • Real-time Gate Feed</p>
          
          <div class="queue-number-display">
            #${queue.nowServingToken || 'A-038'}
            <small>${t.dashboard.nowServing}</small>
          </div>

          <div class="queue-progress-bar">
            <div class="queue-progress-bar-fill"></div>
          </div>

          <div style="font-size:13px;color:#4b5d50;margin-bottom:16px">
            <b>42</b> ${t.dashboard.completedToday} • ${t.dashboard.avgWait}: <b>3 min</b>
          </div>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 14px;font-size:12px;color:#0369a1;margin-bottom:16px">
            📍 Your token <b>#${nextSlot.token}</b> is <b>${queue.farmersAhead}</b> positions away.
          </div>

          <button id="dash-open-queue" class="btn-outline" style="width:100%;font-weight:700">
            ${t.dashboard.viewQueue}
          </button>
        </article>
      </div>

      <!-- Quick Action Shortcuts -->
      <div class="quick-shortcuts">
        <button id="dash-quick-book" class="shortcut-card">
          <span class="shortcut-icon">＋</span>
          <b>${t.dashboard.bookSlotBtn}</b>
          <small>${t.dashboard.bookSlotSub}</small>
        </button>
        <button id="dash-quick-queue" class="shortcut-card">
          <span class="shortcut-icon">◷</span>
          <b>${t.dashboard.checkQueueBtn}</b>
          <small>${t.dashboard.checkQueueSub}</small>
        </button>
        <button id="dash-quick-pay" class="shortcut-card">
          <span class="shortcut-icon">₹</span>
          <b>${t.dashboard.trackPaymentBtn}</b>
          <small>${t.dashboard.trackPaymentSub}</small>
        </button>
        <button id="dash-quick-sms" class="shortcut-card">
          <span class="shortcut-icon">📱</span>
          <b>${t.dashboard.smsAlertsBtn}</b>
          <small>${t.dashboard.smsAlertsSub}</small>
        </button>
      </div>

      <!-- Recent Timeline & Mandi Advisory -->
      <div class="bottom-info-grid">
        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:17px;font-weight:800">${t.dashboard.recentActivity}</h3>
            <button id="dash-view-all-history" class="btn-outline btn-sm">View all →</button>
          </div>
          
          <div class="activity-row">
            <div class="activity-icon-box">✓</div>
            <div style="flex:1">
              <b style="font-size:14px">Payment Received — ₹1,33,400</b>
              <p style="font-size:12px;color:#6b7280">Paddy Procurement • UTR SBI982341908234</p>
            </div>
            <span class="status-pill paid">Paid</span>
          </div>

          <div class="activity-row">
            <div class="activity-icon-box">🌾</div>
            <div style="flex:1">
              <b style="font-size:14px">Wheat Procurement Weighed — 42 qtl</b>
              <p style="font-size:12px;color:#6b7280">Receipt #KR-2026-8645 • Jaitpur Mandi</p>
            </div>
            <span class="status-pill processing">Processing</span>
          </div>

          <div class="activity-row">
            <div class="activity-icon-box">📅</div>
            <div style="flex:1">
              <b style="font-size:14px">Slot Booked for 12 September</b>
              <p style="font-size:12px;color:#6b7280">Token #${nextSlot.token} • SMS Confirmed</p>
            </div>
            <span class="status-pill waiting">Confirmed</span>
          </div>
        </article>

        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:17px;font-weight:800">${t.dashboard.centreNotice}</h3>
            <span class="status-pill paid">Open Today</span>
          </div>
          <p style="font-size:14px;color:#4b5d50;line-height:1.6;margin-bottom:16px">
            ${t.dashboard.noticeContent}
          </p>
          <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:14px;font-size:13px;color:#92400e;line-height:1.5">
            🔔 <b>SMS Arrival Guidance:</b> You do not need to stand in long queues. The automated system will send an SMS when only 5 farmers remain before your turn.
          </div>
        </article>
      </div>
    </div>
  `;
}
