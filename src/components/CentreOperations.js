// src/components/CentreOperations.js

export function renderCentreOperations({ stats, tokens, crops, t }) {
  const m = stats?.metrics || {
    todayBookings: 64,
    dailyCapacity: 90,
    waitingNow: 19,
    completedToday: 42,
    nowServing: 'A-038'
  };

  const tokenList = tokens || [];
  const cropList = crops || [];

  return `
    <div class="page-container">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <h1 class="page-title">${t.centre.title}</h1>
          <p class="page-subtitle">${t.centre.subtitle}</p>
        </div>
        <div style="display:flex;gap:10px">
          <button id="btn-centre-advance" class="cta">
            📢 ${t.centre.advanceBtn}
          </button>
          <button id="btn-open-delay-modal" class="btn-secondary">
            ⚠️ ${t.centre.delayAlertBtn}
          </button>
        </div>
      </div>

      <!-- Mandi Key Operational Metrics -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat-card">
          <span class="label">${t.centre.todayBooked}</span>
          <strong class="value">${m.todayBookings} <small style="font-size:14px;color:#6b7280">/ ${m.dailyCapacity}</small></strong>
          <span class="sub">71% Capacity Utilized</span>
        </div>
        <div class="stat-card">
          <span class="label">${t.centre.waitingTokens}</span>
          <strong class="value" style="color:#d97706">${m.waitingNow}</strong>
          <span class="sub" style="color:#d97706">Avg. wait 18 min</span>
        </div>
        <div class="stat-card">
          <span class="label">${t.centre.completedCount}</span>
          <strong class="value" style="color:#15803d">${m.completedToday}</strong>
          <span class="sub">↑ 14% vs yesterday</span>
        </div>
        <div class="stat-card">
          <span class="label">Now Serving</span>
          <strong class="value" style="color:#15803d">#${m.nowServing}</strong>
          <span class="sub">Counter 2 (Assay)</span>
        </div>
      </div>

      <!-- Live Counter Control & Weighment Entry -->
      <div class="booking-layout">
        <!-- New Weighment & Quality Entry Form -->
        <article class="card">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px">${t.centre.weighmentTitle}</h3>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-field">
              <label>${t.centre.tokenInput}</label>
              <input id="weigh-token-input" type="text" value="A-047" placeholder="e.g. A-047" />
            </div>

            <div class="form-field">
              <label>Crop Selection</label>
              <select id="weigh-crop-select">
                ${cropList.map(c => `
                  <option value="${c.id}">${c.name} (MSP ₹${c.mspRate})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
            <div class="form-field">
              <label>${t.centre.grossInput}</label>
              <input id="weigh-gross-input" type="number" step="0.1" value="62.5" />
            </div>

            <div class="form-field">
              <label>${t.centre.tareInput}</label>
              <input id="weigh-tare-input" type="number" step="0.1" value="2.5" />
            </div>

            <div class="form-field">
              <label>${t.centre.moistureInput}</label>
              <input id="weigh-moisture-input" type="number" step="0.1" value="14.0" />
            </div>
          </div>

          <div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:16px;margin:16px 0">
            <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px">
              <span>Calculated Net Weight:</span>
              <b id="calc-net-wt" style="color:#15803d;font-size:16px">60.0 quintals</b>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:14px">
              <span>Total Payable to Farmer (at Official MSP):</span>
              <b id="calc-net-amount" style="color:#0f2e1b;font-size:18px">₹1,38,000</b>
            </div>
          </div>

          <button id="btn-submit-weighment" class="cta" style="width:100%;padding:14px">
            ⚖️ ${t.centre.saveWeighmentBtn}
          </button>
        </article>

        <!-- Scheduled Farmer Tokens List for Today -->
        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="font-size:17px;font-weight:800">Today’s Mandi Arrivals</h3>
            <span class="status-pill waiting">${tokenList.length} scheduled</span>
          </div>

          <div class="table-container" style="max-height:380px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Farmer</th>
                  <th>Time Slot</th>
                  <th>Crop</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${tokenList.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align:center;padding:24px;color:#9ca3af">
                      No booked arrivals scheduled for this centre yet.
                    </td>
                  </tr>
                ` : tokenList.map(item => `
                  <tr class="arrival-row" style="cursor:pointer" data-token="${item.token}" data-crop="${item.cropId || 'paddy_comm'}" data-qty="${item.quantity || 42}">
                    <td><b style="color:#15803d">#${item.token}</b></td>
                    <td><b>${item.farmerName}</b></td>
                    <td>${item.timeSlot}</td>
                    <td>${item.cropName || 'Paddy'} (${item.quantity || 40} qtl)</td>
                    <td>
                      <button class="btn-outline btn-sm btn-select-arrival" data-token="${item.token}" data-crop="${item.cropId || 'paddy_comm'}" data-qty="${item.quantity || 42}">
                        Weigh ⚖️
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <!-- Delay Broadcast Modal (Hidden by default) -->
      <div id="delay-broadcast-modal" class="modal-backdrop hidden">
        <div class="modal-window">
          <button id="btn-close-delay-modal" class="modal-close-btn">✕</button>

          <h2 style="font-size:20px;font-weight:800;color:#991b1b;margin-bottom:8px">
            📢 Broadcast Mandi Delay / Emergency Alert
          </h2>
          <p style="font-size:13px;color:#6b7280;margin-bottom:18px">
            This will immediately trigger an urgent bilingual SMS advisory to all scheduled farmers booked for today at Jaitpur Mandi.
          </p>

          <div class="form-field">
            <label>Reason for Delay</label>
            <input id="broadcast-reason" type="text" value="Unseasonal rain and wet grain assay delay" />
          </div>

          <div class="form-field">
            <label>Estimated Delay (Minutes)</label>
            <input id="broadcast-delay-mins" type="number" value="45" />
          </div>

          <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:10px;font-size:12px;color:#991b1b;margin-bottom:20px">
            ⚠️ <b>Telecom Broadcast Notice:</b> Message will be delivered with sender ID <code>AQ-MANDI</code> to all pending vehicle drivers.
          </div>

          <button id="btn-send-broadcast" class="cta" style="width:100%;background:#dc2626">
            Send Broadcast SMS Now →
          </button>
        </div>
      </div>
    </div>
  `;
}
