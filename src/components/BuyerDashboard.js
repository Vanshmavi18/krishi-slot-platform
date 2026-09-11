// src/components/BuyerDashboard.js

export function renderBuyerDashboard({ user, lots = [], orders = [], availableBookings = [], centres = [], crops = [], t }) {
  const buyerName = user?.name || 'Vikram Singhania';
  const company = user?.company || 'AgroCorp Foods Pvt Ltd';
  const licenseNo = user?.licenseNo || user?.mandiLicense || 'APMC-DL-8821';
  const gstin = user?.gstin || user?.gstNumber || '09AAACA1234Q1Z5';

  const currentBuyerId = user?.id || 'BUYER-01';

  // Separate bookings created by/assigned to this buyer vs open farmer slots
  const myBuyerBookings = availableBookings.filter(b => 
    b.isMyBooking || 
    b.buyerId === currentBuyerId || 
    b.farmerId === currentBuyerId ||
    (Array.isArray(b.buyerRequests) && b.buyerRequests.some(r => r.buyerId === currentBuyerId))
  );

  const openFarmerSlots = availableBookings.filter(b => 
    !b.isMyBooking && 
    b.buyerId !== currentBuyerId && 
    b.farmerId !== currentBuyerId
  );

  const totalOrders = orders.length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0) + myBuyerBookings.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
  const totalSpend = orders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0) + myBuyerBookings.reduce((s, b) => s + (Number(b.quantity || 0) * Number(b.expectedPrice || 2300)), 0);
  const activeGatePasses = orders.filter(o => o.gatePassId).length + myBuyerBookings.filter(b => b.token).length;

  const getStatusBadge = (st) => {
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
    <div class="page-container buyer-view">
      <!-- Buyer Header -->
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:24px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="role-badge" style="background:#dbeafe;color:#1e40af;border-color:#bfdbfe">
              🏢 APMC Licensed Commercial Buyer
            </span>
            <span style="font-size:12px;color:#6b7280">License: <b>${licenseNo}</b> • GSTIN: <b>${gstin}</b></span>
          </div>
          <h1 class="page-title" style="font-size:26px">Welcome, ${buyerName}</h1>
          <p class="page-subtitle">${company} • Mandi Commercial Procurement & Contract Management</p>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button id="btn-refresh-market" class="btn-secondary" style="font-weight:700">
            🔄 Refresh Data
          </button>
          <button id="btn-buyer-open-booking-modal" class="cta" style="font-weight:700;display:flex;align-items:center;gap:8px">
            <span>📅</span> Book Procurement Slot
          </button>
        </div>
      </div>

      <!-- Commercial Procurement Metrics Grid -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        <div class="stat-card">
          <span class="label">My Booked Slots</span>
          <strong class="value" style="color:#15803d">${myBuyerBookings.length}</strong>
          <span class="sub" style="color:#16a34a">Saved in Database</span>
        </div>

        <div class="stat-card">
          <span class="label">Procurement Contracts</span>
          <strong class="value" style="color:#0f766e">${totalOrders}</strong>
          <span class="sub" style="color:#0d9488">Active Orders</span>
        </div>

        <div class="stat-card">
          <span class="label">Total Outlay</span>
          <strong class="value" style="color:#1e40af">₹${totalSpend.toLocaleString('en-IN')}</strong>
          <span class="sub">Guaranteed Contracts</span>
        </div>

        <div class="stat-card">
          <span class="label">Gate Passes & Tokens</span>
          <strong class="value" style="color:#d97706">${activeGatePasses}</strong>
          <span class="sub" style="color:#b45309">Authorized for Inward</span>
        </div>
      </div>

      <!-- SECTION 1: MY BOOKED & CONTRACTED SLOTS (PERMANENT MONGODB DATA) -->
      <section id="buyer-my-bookings-section" style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b;display:flex;align-items:center;gap:8px">
                <span>📋</span> My Booked & Contracted Slots
              </h2>
              <p style="font-size:13px;color:#6b7280">
                All procurement bookings created by or assigned to you. Persisted permanently in database across refreshes.
              </p>
            </div>
            <span class="status-pill confirmed" style="font-weight:700">
              ${myBuyerBookings.length} Active Records
            </span>
          </div>

          <div class="table-container" style="max-height:400px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Token #</th>
                  <th>Crop / Produce</th>
                  <th>Quantity</th>
                  <th>Total Amount</th>
                  <th>Delivery Date</th>
                  <th>Time Slot</th>
                  <th>Procurement Centre</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="buyer-my-bookings-tbody">
                ${myBuyerBookings.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align:center;padding:36px;color:#9ca3af">
                      <div>No procurement bookings found. Click "Book Procurement Slot" above to schedule your arrival.</div>
                    </td>
                  </tr>
                ` : myBuyerBookings.map(b => {
                  const bId = b.bookingId || b.id;
                  const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : b.date || b.slotDate || 'Scheduled');
                  const timeDisplay = b.timeSlot || `${b.startTime || ''} – ${b.endTime || ''}`.trim() || '10:30 – 11:00 AM';
                  const centreDisplay = b.location || b.centreName || 'Jaitpur Procurement Centre';
                  const totalVal = Math.round(Number(b.quantity || 0) * Number(b.expectedPrice || 2300));

                  return `
                    <tr>
                      <td>
                        <strong style="color:#15803d;font-family:monospace">#${bId}</strong>
                      </td>
                      <td>
                        <span class="status-pill confirmed" style="font-weight:800">#${b.token || 'A-050'}</span>
                      </td>
                      <td>
                        <b>${b.crop || b.cropName || 'Wheat'}</b>
                      </td>
                      <td>
                        <strong style="color:#0f766e">${b.quantity}</strong> ${b.quantityUnit || 'quintal'}
                      </td>
                      <td>
                        <b style="color:#15803d">₹${totalVal.toLocaleString('en-IN')}</b>
                        <div style="font-size:11px;color:#6b7280">@ ₹${b.expectedPrice || 2300}/qtl</div>
                      </td>
                      <td>
                        <b>${dateDisplay}</b>
                      </td>
                      <td>
                        <span style="font-size:12px;color:#4b5563">${timeDisplay}</span>
                      </td>
                      <td>
                        <span>${centreDisplay}</span>
                      </td>
                      <td>
                        ${getStatusBadge(b.status)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 2: AVAILABLE FARMER HARVEST SLOTS -->
      <section id="available-farmer-slots-section" style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b;display:flex;align-items:center;gap:8px">
                <span>🌾</span> Available Farmer Delivery Lots
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Direct approved farmer lots arriving in Mandis. Submit purchase offers backed by APMC transparent bidding.
              </p>
            </div>
            <span class="pill-live" style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">
              <span class="pulse-dot" style="display:inline-block;margin-right:4px"></span>
              ${openFarmerSlots.length} Farmer Lots
            </span>
          </div>

          <div class="table-container" style="max-height:400px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Lot / Token</th>
                  <th>Farmer</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Expected Price</th>
                  <th>Arrival Window</th>
                  <th>Centre</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${openFarmerSlots.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align:center;padding:36px;color:#9ca3af">
                      All currently listed farmer lots have been contracted or requested.
                    </td>
                  </tr>
                ` : openFarmerSlots.map(b => {
                  const bId = b.bookingId || b.id;
                  const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : b.date || 'Soon');
                  const timeDisplay = b.timeSlot || 'Scheduled';
                  const mandiDisplay = b.location || b.centreName || 'Jaitpur Mandi';

                  return `
                    <tr>
                      <td>
                        <strong style="color:#15803d">#${b.token || bId}</strong>
                        <div style="font-size:11px;color:#6b7280">#${bId}</div>
                      </td>
                      <td>
                        <b>${b.farmerName || 'Registered Farmer'}</b>
                        <div style="font-size:11px;color:#6b7280">${b.farmerId || 'FRM-VERIFIED'}</div>
                      </td>
                      <td>
                        <b>${b.crop || b.cropName}</b>
                      </td>
                      <td>
                        <strong style="color:#0f766e">${b.quantity}</strong> ${b.quantityUnit || 'quintal'}
                      </td>
                      <td>
                        <strong style="color:#15803d">₹${Number(b.expectedPrice || 2300).toLocaleString('en-IN')}</strong>/qtl
                      </td>
                      <td>
                        <b>${dateDisplay}</b>
                        <div style="font-size:11px;color:#6b7280">${timeDisplay}</div>
                      </td>
                      <td>
                        <span>${mandiDisplay}</span>
                      </td>
                      <td>
                        <button 
                          class="btn-request-slot cta" 
                          style="padding:6px 12px;font-size:12px;box-shadow:none"
                          data-booking='${JSON.stringify(b).replace(/'/g, "&apos;")}'
                        >
                          🤝 Request to Buy
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 3: PROCUREMENT CONTRACTS & ORDERS -->
      <section style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
                📜 Confirmed Mandi Orders & Gate Passes
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Official APMC purchase contracts with authorized weighbridge gate passes.
              </p>
            </div>
            <span class="status-pill paid">${orders.length} Contracts</span>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Farmer / Lot</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Contract Rate</th>
                  <th>Total Payout</th>
                  <th>Mandi Centre</th>
                  <th>Status</th>
                  <th>Gate Pass</th>
                </tr>
              </thead>
              <tbody>
                ${orders.length === 0 ? `
                  <tr>
                    <td colspan="9" style="text-align:center;padding:36px;color:#9ca3af">
                      No procurement orders confirmed yet.
                    </td>
                  </tr>
                ` : orders.map(ord => `
                  <tr>
                    <td><b>#${ord.id}</b></td>
                    <td>${ord.farmerName || 'Farmer'}</td>
                    <td><b>${ord.cropName}</b></td>
                    <td><strong>${ord.quantity}</strong> qtl</td>
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

      <!-- BUYER DIRECT SLOT BOOKING MODAL -->
      <div id="buyer-book-slot-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:520px;text-align:left">
          <button id="btn-close-buyer-booking-modal" class="modal-close-btn">✕</button>

          <div style="margin-bottom:18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:24px">📅</span>
              <h2 style="font-size:20px;font-weight:800;color:#0f2e1b;margin:0">Create Procurement Booking</h2>
            </div>
            <p style="font-size:13px;color:#6b7280;margin:0">
              Schedule commercial crop procurement lot at an authorized APMC centre.
            </p>
          </div>

          <form id="buyer-direct-booking-form" onsubmit="return false;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12px;font-weight:700">Procurement Centre <span style="color:#dc2626">*</span></label>
                <select id="buyer-booking-centre" required style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px">
                  ${centres.length > 0 ? centres.map(c => `
                    <option value="${c.id}">${c.name}</option>
                  `).join('') : `
                    <option value="CTR-UP-01">Jaitpur Procurement Centre</option>
                    <option value="CTR-UP-02">Gautam Buddha Nagar Mandi</option>
                    <option value="CTR-UP-03">Hapur Grain Market</option>
                  `}
                </select>
              </div>

              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12px;font-weight:700">Crop / Product <span style="color:#dc2626">*</span></label>
                <select id="buyer-booking-crop" required style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px">
                  ${crops.length > 0 ? crops.map(c => `
                    <option value="${c.name}" data-rate="${c.mspRate}">${c.name} (MSP ₹${c.mspRate})</option>
                  `).join('') : `
                    <option value="Wheat (Sharbati)" data-rate="2425">Wheat (Sharbati) - MSP ₹2,425</option>
                    <option value="Basmati Paddy 1121" data-rate="3250">Basmati Paddy 1121 - MSP ₹3,250</option>
                    <option value="Mustard Seeds" data-rate="5650">Mustard Seeds - MSP ₹5,650</option>
                    <option value="Soybean (Yellow)" data-rate="4892">Soybean (Yellow) - MSP ₹4,892</option>
                  `}
                </select>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12px;font-weight:700">Quantity (Quintals) <span style="color:#dc2626">*</span></label>
                <input id="buyer-booking-qty" type="number" min="1" max="1000" value="50" required style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px" />
              </div>

              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12px;font-weight:700">Price (₹ per quintal) <span style="color:#dc2626">*</span></label>
                <input id="buyer-booking-price" type="number" min="100" value="2425" required style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12px;font-weight:700">Date <span style="color:#dc2626">*</span></label>
                <input id="buyer-booking-date" type="date" value="2026-09-18" required style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px" />
              </div>

              <div class="form-field" style="margin-bottom:0">
                <label style="font-size:12px;font-weight:700">Time Window <span style="color:#dc2626">*</span></label>
                <select id="buyer-booking-timeslot" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px">
                  <option value="09:00 – 09:30 AM">09:00 – 09:30 AM</option>
                  <option value="10:30 – 11:00 AM" selected>10:30 – 11:00 AM</option>
                  <option value="12:00 – 12:30 PM">12:00 – 12:30 PM</option>
                  <option value="02:00 – 02:30 PM">02:00 – 02:30 PM</option>
                  <option value="03:30 – 04:00 PM">03:30 – 04:00 PM</option>
                </select>
              </div>
            </div>

            <div class="form-field" style="margin-bottom:16px">
              <label style="font-size:12px;font-weight:700">Vehicle / Transport</label>
              <input id="buyer-booking-vehicle" type="text" value="Commercial 10-Wheeler Truck" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px" />
            </div>

            <div style="background:#f0fdf4;border:1px dashed #16a34a;padding:12px;border-radius:10px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#166534">
                <span>Estimated Contract Value:</span>
                <span id="buyer-booking-total-display" style="font-size:16px">₹1,21,250</span>
              </div>
              <small style="color:#15803d;font-size:11px;display:block;margin-top:4px">
                ℹ️ Booking will be saved directly in MongoDB and assigned an official gate pass token.
              </small>
            </div>

            <button id="btn-submit-buyer-direct-booking" class="cta" style="width:100%;padding:13px;font-weight:800;font-size:15px;border-radius:10px">
              Confirm & Save Procurement Slot →
            </button>
          </form>
        </div>
      </div>

      <!-- REQUEST TO BUY MODAL -->
      <div id="buyer-request-slot-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:480px;text-align:left">
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
          </div>

          <div class="form-field">
            <label>Buyer Commercial Notes (Optional)</label>
            <textarea id="req-buyer-notes-input" rows="2" placeholder="e.g. Immediate payment upon weighment..."></textarea>
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
