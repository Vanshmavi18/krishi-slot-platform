// src/components/BuyerDashboard.js

export function renderBuyerDashboard({ user, lots = [], orders = [], availableBookings = [], t }) {
  const buyerName = user?.name || 'Vikram Singhania';
  const company = user?.company || 'AgroCorp Foods Pvt Ltd';
  const licenseNo = user?.licenseNo || 'APMC-DL-8821';
  const gstin = user?.gstin || '09AAACA1234Q1Z5';

  const totalOrders = orders.length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
  const totalSpend = orders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);
  const activeGatePasses = orders.filter(o => o.gatePassId).length;

  const currentBuyerId = user?.id || 'BUYER-01';

  return `
    <div class="page-container buyer-view">
      <!-- Buyer Header -->
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="role-badge" style="background:#dbeafe;color:#1e40af;border-color:#bfdbfe">
              🏢 APMC Licensed Buyer & Processor
            </span>
            <span style="font-size:12px;color:#6b7280">License: <b>${licenseNo}</b> • GSTIN: <b>${gstin}</b></span>
          </div>
          <h1 class="page-title" style="font-size:26px">Welcome, ${buyerName}</h1>
          <p class="page-subtitle">${company} • Direct Mandi Procurement Hub</p>
        </div>

        <div style="display:flex;gap:10px">
          <button id="btn-refresh-market" class="btn-secondary" style="font-weight:700">
            🔄 Refresh Slots
          </button>
          <a href="#available-farmer-slots-section" class="cta">
            🌾 Available Farmer Slots (${availableBookings.length}) →
          </a>
        </div>
      </div>

      <!-- Commercial Procurement Metrics Grid -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        <div class="stat-card">
          <span class="label">Approved Farmer Slots</span>
          <strong class="value" style="color:#1e40af">${availableBookings.length}</strong>
          <span class="sub" style="color:#2563eb">Ready for Commercial Purchase</span>
        </div>

        <div class="stat-card">
          <span class="label">Procurement Contracts</span>
          <strong class="value" style="color:#0f766e">${totalOrders}</strong>
          <span class="sub" style="color:#0d9488">Active Mandi Orders</span>
        </div>

        <div class="stat-card">
          <span class="label">Total Mandi Outlay</span>
          <strong class="value" style="color:#15803d">₹${totalSpend.toLocaleString('en-IN')}</strong>
          <span class="sub">Guaranteed MSP & Contracts</span>
        </div>

        <div class="stat-card">
          <span class="label">Active Gate Passes</span>
          <strong class="value" style="color:#d97706">${activeGatePasses}</strong>
          <span class="sub" style="color:#b45309">Authorized for weighbridge</span>
        </div>
      </div>

      <!-- SECTION 1: AVAILABLE FARMER SLOTS / BOOKINGS -->
      <section id="available-farmer-slots-section" style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
                🌾 Available Farmer Slots / Bookings
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Direct approved farmer delivery slots available for purchase requests. Fair transparent pricing backed by APMC.
              </p>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="pill-live" style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">
                <span class="pulse-dot" style="display:inline-block;margin-right:4px"></span>
                ${availableBookings.length} Approved Slots Available
              </span>
            </div>
          </div>

          <div class="table-container" style="max-height:450px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Farmer Name</th>
                  <th>Farmer ID</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Booking Date</th>
                  <th>Slot Time</th>
                  <th>Mandi/Market</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${availableBookings.length === 0 ? `
                  <tr>
                    <td colspan="11" style="text-align:center;padding:36px;color:#9ca3af">
                      No farmer bookings available right now. Newly booked farmer slots will appear here automatically.
                    </td>
                  </tr>
                ` : availableBookings.map(b => {
                  const bId = b.bookingId || b.id;
                  const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : b.date || b.slotDate || 'TBD');
                  const timeDisplay = b.timeSlot || `${b.startTime || ''} – ${b.endTime || ''}`.trim() || 'Scheduled';
                  const mandiDisplay = b.location || b.market || b.mandi || b.centreName || 'APMC Mandi';
                  const requests = Array.isArray(b.buyerRequests) ? b.buyerRequests : [];
                  const alreadyRequested = requests.some(r => r.buyerId === currentBuyerId) || b.hasMyRequest;
                  const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';

                  const farmerNameDisplay = b.farmerName || 'Registered Farmer';
                  const farmerIdDisplay = b.farmerId || 'FRM-VERIFIED';

                  const getBuyerStatusBadge = (st) => {
                    switch (st) {
                      case 'Pending':
                        return '<span class="status-pill waiting" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a">⏳ Pending Review</span>';
                      case 'Approved':
                      case 'CONFIRMED':
                        return '<span class="status-pill confirmed" style="background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe">✓ Approved</span>';
                      case 'Completed':
                        return '<span class="status-pill paid" style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0">✓ Completed</span>';
                      default:
                        return `<span class="status-pill">${st || 'Active'}</span>`;
                    }
                  };

                  return `
                    <tr>
                      <td>
                        <strong style="color:#15803d">#${bId}</strong>
                        ${b.token ? `<div style="font-size:11px;color:#6b7280">Token: #${b.token}</div>` : ''}
                      </td>
                      <td>
                        <b>${farmerNameDisplay}</b>
                      </td>
                      <td>
                        <span style="font-size:12px;color:#4b5563;font-family:monospace">${farmerIdDisplay}</span>
                      </td>
                      <td>
                        <b>${b.crop || b.cropName}</b>
                      </td>
                      <td>
                        <strong style="color:#0f766e;font-size:14px">${b.quantity}</strong>
                        <span style="font-size:12px;color:#6b7280">${b.quantityUnit || 'quintal'}</span>
                        <div style="font-size:11px;color:#15803d">@ ₹${Number(b.expectedPrice || 2300).toLocaleString('en-IN')}/${b.quantityUnit || 'qtl'}</div>
                      </td>
                      <td>
                        <b>${dateDisplay}</b>
                      </td>
                      <td>
                        <div style="font-size:12px;color:#4b5563">${timeDisplay}</div>
                      </td>
                      <td>
                        <div>${mandiDisplay}</div>
                      </td>
                      <td>
                        ${getBuyerStatusBadge(b.status)}
                      </td>
                      <td style="font-size:12px;color:#6b7280">
                        ${createdDate}
                      </td>
                      <td>
                        ${alreadyRequested ? `
                          <button class="btn-secondary btn-sm" disabled style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-weight:700;cursor:default">
                            ✓ Requested
                          </button>
                        ` : `
                          <button 
                            class="btn-request-slot cta" 
                            style="padding:7px 14px;font-size:12px;box-shadow:none"
                            data-booking='${JSON.stringify(b).replace(/'/g, "&apos;")}'
                          >
                            🤝 Request to Buy
                          </button>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 2: BUYER ORDERS & GATE PASSES -->
      <section style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
                📑 My Mandi Procurement Contracts & Logistics
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Track confirmed orders, download weighbridge gate passes, and review procurement invoices.
              </p>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order Contract #</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Offered Rate</th>
                  <th>Total Payable</th>
                  <th>Mandi Centre</th>
                  <th>Status</th>
                  <th>Pickup Gate Pass</th>
                </tr>
              </thead>
              <tbody>
                ${orders.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align:center;padding:30px;color:#9ca3af">
                      No contracts placed yet. Select an available farmer slot above to submit your first purchase request!
                    </td>
                  </tr>
                ` : orders.map(ord => `
                  <tr>
                    <td>
                      <b>#${ord.id}</b>
                      <div style="font-size:11px;color:#9ca3af">${new Date(ord.createdAt || Date.now()).toLocaleDateString()}</div>
                    </td>
                    <td><b>${ord.cropName}</b></td>
                    <td>${ord.quantity} qtl</td>
                    <td>₹${(ord.offeredRate || 0).toLocaleString('en-IN')}/qtl</td>
                    <td>
                      <strong style="color:#15803d;font-size:15px">₹${(ord.totalValue || 0).toLocaleString('en-IN')}</strong>
                    </td>
                    <td>${ord.centreName || 'Jaitpur Procurement Centre'}</td>
                    <td>
                      <span class="status-pill ${ord.status === 'CONFIRMED' ? 'confirmed' : 'waiting'}">
                        ${ord.status}
                      </span>
                    </td>
                    <td>
                      ${ord.gatePassId ? `
                        <button class="btn-view-gatepass btn-outline btn-sm" data-order='${JSON.stringify(ord).replace(/'/g, "&apos;")}'>
                          🎫 Pass #${ord.gatePassId}
                        </button>
                      ` : `
                        <span style="font-size:12px;color:#9ca3af">Processing pass...</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- REQUEST TO BUY MODAL -->
      <div id="buyer-request-slot-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:480px">
          <button id="btn-close-request-slot-modal" class="modal-close-btn">✕</button>

          <div style="text-align:center;margin-bottom:18px">
            <div style="font-size:32px;margin-bottom:6px">🤝</div>
            <h2 style="font-size:20px;font-weight:800;color:#0f2e1b">Request to Buy Farmer Slot</h2>
            <p style="font-size:13px;color:#6b7280">Direct Mandi APMC Commercial Purchase Offer</p>
          </div>

          <div id="request-modal-slot-summary" style="background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px;border-radius:12px;margin-bottom:16px;font-size:13px">
            <!-- Populated dynamically -->
          </div>

          <div class="form-field">
            <label>Offered Price (₹ per unit) <span style="color:#dc2626">*</span></label>
            <input id="req-offered-price-input" type="number" min="1" step="10" value="2300" required />
            <small style="color:#059669;font-size:11px;margin-top:4px;display:block">
              ℹ️ You can offer the farmer's expected price or enter a higher competitive bid.
            </small>
          </div>

          <div class="form-field">
            <label>Buyer Commercial Notes / Terms (Optional)</label>
            <textarea id="req-buyer-notes-input" rows="2" placeholder="e.g. Immediate payment upon weighment, standard gunny bags required..."></textarea>
          </div>

          <div style="background:#ecfdf5;border:1.5px dashed #10b981;border-radius:12px;padding:14px;margin:18px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>Estimated Purchase Value:</span>
              <b id="req-calc-total" style="color:#065f46;font-size:17px">₹0</b>
            </div>
            <div style="font-size:11px;color:#047857">
              Request will be recorded in MongoDB and sent directly to the farmer & APMC administrator.
            </div>
          </div>

          <button id="btn-submit-buy-request" class="cta" style="width:100%;padding:14px">
            Confirm & Send Purchase Request →
          </button>
        </div>
      </div>

      <!-- GATE PASS MODAL -->
      <div id="buyer-pass-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:440px;text-align:center">
          <button id="btn-close-pass-modal" class="modal-close-btn">✕</button>

          <div style="border-bottom:2px dashed #e2e8f0;padding-bottom:16px;margin-bottom:16px">
            <div style="font-size:28px;margin-bottom:4px">🏛️</div>
            <h3 style="font-size:18px;color:#0f2e1b">APMC Mandi Weighbridge Pass</h3>
            <span id="pass-modal-id" style="font-size:12px;font-weight:700;color:#1e40af;letter-spacing:0.05em">GATE PASS #GP-2026-881</span>
          </div>

          <div id="pass-modal-content" style="text-align:left;font-size:13px;line-height:1.6;margin-bottom:20px">
            <!-- Populated dynamically -->
          </div>

          <div style="background:#f1f5f9;padding:12px;border-radius:10px;font-family:monospace;letter-spacing:0.15em;font-weight:700;margin-bottom:16px">
            ||||| | |||| |||||| || | |||| |||||
          </div>

          <button id="btn-print-gate-pass" class="btn-outline" style="width:100%">
            🖨️ Print / Download Gate Pass (PDF)
          </button>
        </div>
      </div>
    </div>
  `;
}
