// src/components/LiveQueue.js

export function renderLiveQueue({ queueStatus, userToken, t }) {
  const q = queueStatus || {
    centreName: 'Jaitpur Procurement Centre',
    nowServingToken: 'A-038',
    nowServingNumber: 38,
    currentFarmer: 'Vijay Singh',
    farmersAhead: 9,
    estimatedWaitMin: 27,
    counters: [
      { id: 1, name: 'Counter 1 (Gate & Token Verification)', servingToken: 'A-035', servingFarmer: 'Ram Swaroop' },
      { id: 2, name: 'Counter 2 (Moisture & Quality Assay)', servingToken: 'A-038', servingFarmer: 'Vijay Singh' },
      { id: 3, name: 'Counter 3 (Weighbridge & J-Form Slip)', servingToken: 'A-032', servingFarmer: 'Ghanshyam' }
    ],
    totalBooked: 64,
    completedToday: 42,
    dailyCapacity: 90
  };

  const token = userToken || 'A-047';

  return `
    <div class="page-container">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <h1 class="page-title">${t.queue.title}</h1>
          <p class="page-subtitle">${q.centreName} • <span class="pulse-dot"></span> Sate-of-the-art Live Stream</p>
        </div>
        <div>
          <button id="btn-simulate-queue" class="btn-secondary">
            ⚡ ${t.queue.simulateBtn}
          </button>
        </div>
      </div>

      <div class="queue-board-layout">
        <div>
          <!-- Giant Now Serving Board -->
          <article class="giant-serving-card">
            <span class="badge">${t.queue.nowServing}</span>
            <div class="giant-serving-num">#${q.nowServingToken}</div>
            <div class="giant-serving-farmer">${q.currentFarmer || 'Farmer'} • Counter ${q.counter || 2}</div>
            <p style="font-size:13px;color:#6b7280;margin-top:6px">Live Gate Sensors Active • Updated in real-time</p>
          </article>

          <!-- Expected Farmer Position -->
          <div class="expected-position-box">
            <div class="position-icon">📍</div>
            <div style="flex:1">
              <span style="font-size:12px;color:#4b5d50;font-weight:700;letter-spacing:0.04em">${t.queue.expectedPosition}</span>
              <div style="display:flex;align-items:baseline;gap:10px">
                <strong>#${token}</strong>
                <span style="font-size:14px;color:#15803d;font-weight:700">• ${q.farmersAhead} ${t.queue.ahead}</span>
              </div>
            </div>
          </div>

          <!-- Multi-Counter Breakdown -->
          <article class="card" style="margin-top:20px">
            <h3 style="font-size:17px;font-weight:800;margin-bottom:14px">${t.queue.countersTitle}</h3>
            
            ${(q.counters || []).map(ctr => `
              <div class="counter-row">
                <div class="counter-name">
                  <b>${ctr.name.split('(')[0]}</b>
                  <div style="font-size:11px;color:#6b7280">${ctr.name.split('(')[1]?.replace(')', '') || ''}</div>
                </div>
                <div class="counter-meter">
                  <i style="width:${ctr.id === 1 ? '75%' : ctr.id === 2 ? '85%' : '60%'}"></i>
                </div>
                <div class="counter-serving-token">#${ctr.servingToken}</div>
              </div>
            `).join('')}
          </article>
        </div>

        <!-- Right Side Advisory & Capacity -->
        <aside class="card" style="height:fit-content">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:12px">${t.queue.planArrival}</h3>
          
          <div class="queue-number-display" style="font-size:44px;color:#15803d">
            ~${q.estimatedWaitMin} min
          </div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:20px">${t.queue.estWait}</p>

          <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:16px;font-size:13px;color:#1e40af;line-height:1.5">
            🔔 <b>Smart SMS Advisory:</b><br>
            ${t.queue.reminderNotice}
          </div>

          <button id="btn-set-arrival-reminder" class="btn-outline" style="width:100%;margin-top:16px;padding:12px;font-weight:700">
            📲 ${t.queue.setReminderBtn}
          </button>

          <div style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:20px">
            <h4 style="font-size:15px;font-weight:700;margin-bottom:14px">${t.queue.centreCapacity}</h4>
            
            <div class="summary-line">
              <span>Booked Slots Today</span>
              <b>${q.totalBooked} / ${q.dailyCapacity}</b>
            </div>
            <div class="summary-line">
              <span>Weighed & Completed</span>
              <b style="color:#15803d">${q.completedToday} farmers</b>
            </div>
            <div class="summary-line">
              <span>Remaining Capacity</span>
              <b>${Math.max(0, q.dailyCapacity - q.totalBooked)} vehicles</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `;
}
