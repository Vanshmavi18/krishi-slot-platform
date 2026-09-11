// src/components/FarmerDashboard.js

export function renderFarmerDashboard({ user, stats, latestBooking, myBookings = [], procurements = [], queueStatus, t, onNavigate }) {
  const hasBooking = Boolean(latestBooking);

  const queue = queueStatus || {
    nowServingToken: 'A-038',
    nowServingNumber: 38,
    farmersAhead: 9,
    estimatedWaitMin: 27
  };

  const statData = stats || {
    totalProcured: 0,
    paid: 0,
    pending: 0
  };

  // Calculate live queue position based on actual token
  let tokenDiff = 0;
  if (hasBooking && latestBooking.token) {
    const userTokenNum = parseInt(String(latestBooking.token).replace(/[^0-9]/g, ''), 10) || 0;
    const nowNum = queue.nowServingNumber || 38;
    tokenDiff = Math.max(0, userTokenNum - nowNum);
  }

  const clearedDbtCount = (procurements || []).filter(p => p.paymentStatus === 'PAID').length;

  // Assemble dynamic recent activity items
  const activities = [];

  (procurements || []).forEach(p => {
    if (p.paymentStatus === 'PAID') {
      activities.push({
        type: 'paid',
        icon: '✓',
        title: `DBT Payment Cleared — ₹${Number(p.amount).toLocaleString('en-IN')}`,
        subtitle: `${p.crop || p.cropFullName || 'Produce'} • UTR ${p.utr || 'PFMS-DIRECT'}`,
        badge: 'Paid',
        badgeClass: 'paid'
      });
    } else {
      activities.push({
        type: 'weighed',
        icon: '🌾',
        title: `Procurement Weighed — ${p.netWeight || 40} qtl (₹${Number(p.amount).toLocaleString('en-IN')})`,
        subtitle: `J-Form #${p.id} • ${p.centre || 'Mandi Centre'}`,
        badge: 'Processing',
        badgeClass: 'processing'
      });
    }
  });

  (myBookings || []).forEach(b => {
    activities.push({
      type: 'booking',
      icon: '📅',
      title: `Slot Scheduled for ${b.displayDate || b.date}`,
      subtitle: `Token #${b.token} • ${b.cropName} (${b.quantity} qtl)`,
      badge: b.status || 'Confirmed',
      badgeClass: b.status === 'COMPLETED' ? 'completed' : 'waiting'
    });
  });

  return `
    <div class="page-container">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
        <div>
          <h1 class="page-title">${t.dashboard.greeting}, ${user?.name || 'Farmer Friend'}! 👋</h1>
          <p class="page-subtitle">${t.dashboard.subtitle}</p>
        </div>
        <div style="display:flex;gap:10px">
          <button id="dash-top-my-bookings-btn" class="btn-secondary" style="font-weight:700">
            📋 My Bookings
          </button>
          <button id="dash-top-book-btn" class="cta">
            ＋ Book Slot
          </button>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <div>
          <!-- Upcoming Procurement Slot Card -->
          ${hasBooking ? `
            <article class="slot-hero-card">
              <div class="slot-hero-eyebrow">${t.dashboard.upcomingSlot}</div>
              <h2 class="slot-hero-title">${latestBooking.displayDate || latestBooking.date} <span>• ${latestBooking.timeSlot}</span></h2>
              
              <div class="slot-hero-footer">
                <div class="slot-hero-info">
                  <p>${t.dashboard.mandi}: <b>${latestBooking.centreName}</b></p>
                  <p>${t.dashboard.crop}: <b>${latestBooking.cropName} • ${latestBooking.quantity} quintals</b></p>
                  ${latestBooking.vehicle ? `<p style="font-size:12px;opacity:0.85;margin-top:2px">Vehicle: ${latestBooking.vehicle}</p>` : ''}
                </div>
                <div class="token-box">
                  <span>${t.dashboard.token}</span>
                  <strong>#${latestBooking.token}</strong>
                </div>
              </div>
            </article>
          ` : `
            <article class="slot-hero-card" style="background:linear-gradient(135deg, #14532d 0%, #064e3b 100%)">
              <div class="slot-hero-eyebrow" style="color:#86efac">Active Harvest Season 2026</div>
              <h2 class="slot-hero-title" style="font-size:22px">No Active Mandi Slot Booked</h2>
              <p style="color:#dcfce7;font-size:13.5px;margin:8px 0 16px;max-width:520px;line-height:1.5">
                Avoid long Mandi queues and truck congestion. Reserve your official APMC delivery window in under 60 seconds with instant gate token pass and automated SMS updates.
              </p>
              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
                <button id="dash-hero-book-btn" class="cta" style="background:#ffffff;color:#15803d;border:none;padding:12px 22px;font-weight:800;font-size:14px">
                  📅 Book Procurement Slot Now →
                </button>
                <span style="font-size:12px;color:#bbf7d0">✓ Instant Gate Token & SMS Dispatch</span>
              </div>
            </article>
          `}

          <!-- Season Financial Stats -->
          <div class="stats-grid">
            <div class="stat-card">
              <span class="label">${t.dashboard.totalProcured}</span>
              <strong class="value">₹${Number(statData.totalProcured || 0).toLocaleString('en-IN')}</strong>
              <span class="sub">↑ Active Season 2026</span>
            </div>
            <div class="stat-card">
              <span class="label">${t.dashboard.paid}</span>
              <strong class="value" style="color:#15803d">₹${Number(statData.paid || 0).toLocaleString('en-IN')}</strong>
              <span class="sub">✓ ${clearedDbtCount} DBT Cleared</span>
            </div>
            <div class="stat-card">
              <span class="label">${t.dashboard.pending}</span>
              <strong class="value" style="color:#d97706">₹${Number(statData.pending || 0).toLocaleString('en-IN')}</strong>
              <span class="sub" style="color:#d97706">${statData.pending > 0 ? 'Processing via PFMS' : 'Nil Pending'}</span>
            </div>
          </div>
        </div>

        <!-- Live Queue Snapshot Card -->
        <article class="card">
          <div class="queue-card-head">
            <h3>${t.dashboard.liveQueueTitle}</h3>
            <span class="pulse-dot"></span>
          </div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:10px">${latestBooking?.centreName || 'Jaitpur Centre'} • Live Gate Feed</p>
          
          <div class="queue-number-display">
            #${queue.nowServingToken || 'A-038'}
            <small>${t.dashboard.nowServing}</small>
          </div>

          <div class="queue-progress-bar">
            <div class="queue-progress-bar-fill"></div>
          </div>

          <div style="font-size:13px;color:#4b5d50;margin-bottom:16px">
            <b>${queue.completedToday || 42}</b> ${t.dashboard.completedToday} • ${t.dashboard.avgWait}: <b>3 min</b>
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;font-size:12px;color:#166534;margin-bottom:16px">
            ${hasBooking ? `
              📍 Your token <b>#${latestBooking.token}</b> is <b>${tokenDiff}</b> positions away.
            ` : `
              📍 <b>Notice:</b> Book a slot to get your active token position & proximity SMS alerts.
            `}
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
          <b>Book Slot</b>
          <small>Schedule crop delivery</small>
        </button>
        <button id="dash-quick-my-bookings" class="shortcut-card">
          <span class="shortcut-icon">📋</span>
          <b>My Bookings</b>
          <small>Track status & buyer offers</small>
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
      </div>

      <!-- Recent Timeline & Mandi Advisory -->
      <div class="bottom-info-grid">
        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:17px;font-weight:800">${t.dashboard.recentActivity}</h3>
            <button id="dash-view-all-history" class="btn-outline btn-sm">View all →</button>
          </div>
          
          ${activities.length === 0 ? `
            <div style="padding:28px 16px;text-align:center;color:#94a3b8;font-size:13.5px">
              No recent activity recorded yet. Click <b>Book Slot</b> above to schedule your crop arrival!
            </div>
          ` : activities.slice(0, 4).map(act => `
            <div class="activity-row">
              <div class="activity-icon-box">${act.icon}</div>
              <div style="flex:1">
                <b style="font-size:14px">${act.title}</b>
                <p style="font-size:12px;color:#6b7280">${act.subtitle}</p>
              </div>
              <span class="status-pill ${act.badgeClass}">${act.badge}</span>
            </div>
          `).join('')}
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
