// src/components/BuyerDashboard.js

export function renderBuyerDashboard({ user, lots = [], orders = [], t }) {
  const buyerName = user?.name || 'Vikram Singhania';
  const company = user?.company || 'AgroCorp Foods Pvt Ltd';
  const licenseNo = user?.licenseNo || 'APMC-DL-8821';
  const gstin = user?.gstin || '09AAACA1234Q1Z5';

  const totalOrders = orders.length;
  const totalVolume = orders.reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);
  const totalSpend = orders.reduce((sum, o) => sum + (Number(o.totalValue) || 0), 0);
  const activeGatePasses = orders.filter(o => o.gatePassId).length;

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
            🔄 Refresh Marketplace
          </button>
          <a href="#marketplace-section" class="cta">
            🌾 Browse Mandi Lots (${lots.length}) →
          </a>
        </div>
      </div>

      <!-- Commercial Procurement Metrics Grid -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        <div class="stat-card">
          <span class="label">Procurement Contracts</span>
          <strong class="value" style="color:#1e40af">${totalOrders}</strong>
          <span class="sub" style="color:#2563eb">Active APMC Trade Contracts</span>
        </div>

        <div class="stat-card">
          <span class="label">Grain Volume Booked</span>
          <strong class="value" style="color:#0f766e">${totalVolume} <small style="font-size:14px;color:#6b7280">quintals</small></strong>
          <span class="sub" style="color:#0d9488">Direct from Registered Farmers</span>
        </div>

        <div class="stat-card">
          <span class="label">Total Mandi Outlay</span>
          <strong class="value" style="color:#15803d">₹${totalSpend.toLocaleString('en-IN')}</strong>
          <span class="sub">Guaranteed MSP & Competitive Bids</span>
        </div>

        <div class="stat-card">
          <span class="label">Active Gate Passes</span>
          <strong class="value" style="color:#d97706">${activeGatePasses}</strong>
          <span class="sub" style="color:#b45309">Vehicles authorized for weighbridge</span>
        </div>
      </div>

      <!-- SECTION 1: MANDI ARRIVAL MARKETPLACE -->
      <section id="marketplace-section" style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
                🌾 Live Mandi Arrivals & Farmer Harvest Lots
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Scheduled farmer deliveries arriving across Gorakhpur Mandi network. Place verified commercial bids.
              </p>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="pill-live" style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">
                <span class="pulse-dot" style="display:inline-block;margin-right:4px"></span>
                ${lots.length} Lots Available Today
              </span>
            </div>
          </div>

          <div class="table-container" style="max-height:420px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Token & ID</th>
                  <th>Crop & Variety</th>
                  <th>Farmer (Seller)</th>
                  <th>Mandi Centre</th>
                  <th>Scheduled Arrival</th>
                  <th>Quantity</th>
                  <th>Official MSP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${lots.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align:center;padding:30px;color:#9ca3af">
                      No arriving lots listed at the moment.
                    </td>
                  </tr>
                ` : lots.map(lot => `
                  <tr>
                    <td>
                      <span class="status-pill waiting" style="font-weight:800">#${lot.token || 'A-001'}</span>
                    </td>
                    <td>
                      <b>${lot.cropName}</b>
                      <div style="font-size:11px;color:#6b7280">${lot.estimatedMoisture || 'FAQ Grade'}</div>
                    </td>
                    <td>
                      <div><b>${lot.farmerName}</b></div>
                      <small style="color:#9ca3af">ID: ${lot.farmerId}</small>
                    </td>
                    <td>
                      <div>${lot.centreName}</div>
                    </td>
                    <td>
                      <b>${lot.displayDate || lot.arrivalDate}</b>
                      <div style="font-size:12px;color:#4b5563">${lot.timeSlot}</div>
                    </td>
                    <td>
                      <strong style="color:#0f766e;font-size:15px">${lot.quantity} qtl</strong>
                    </td>
                    <td>
                      <div style="font-weight:700;color:#15803d">₹${(lot.mspRate || 2300).toLocaleString('en-IN')}</div>
                      <small style="font-size:10px;color:#6b7280">per quintal</small>
                    </td>
                    <td>
                      <button 
                        class="btn-bid-lot cta" 
                        style="padding:7px 14px;font-size:12px;box-shadow:none"
                        data-lot='${JSON.stringify(lot).replace(/'/g, "&apos;")}'
                      >
                        ⚡ Place Bid / Buy
                      </button>
                    </td>
                  </tr>
                `).join('')}
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
                      No contracts placed yet. Select a lot above to place your first commercial procurement order!
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

      <!-- BID MODAL (Rendered into body or hidden element) -->
      <div id="buyer-bid-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:480px">
          <button id="btn-close-bid-modal" class="modal-close-btn">✕</button>

          <div style="text-align:center;margin-bottom:18px">
            <div style="font-size:32px;margin-bottom:6px">🤝</div>
            <h2 style="font-size:20px;font-weight:800;color:#0f2e1b">Place Commercial Purchase Offer</h2>
            <p style="font-size:13px;color:#6b7280">Direct APMC Mandi Procurement Contract</p>
          </div>

          <div id="bid-modal-lot-summary" style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:13px">
            <!-- Populated dynamically -->
          </div>

          <div class="form-field">
            <label>Quantity to Procure (Quintals)</label>
            <input id="bid-qty-input" type="number" step="1" value="50" min="5" />
          </div>

          <div class="form-field">
            <label>Offered Rate per Quintal (₹)</label>
            <input id="bid-rate-input" type="number" step="10" value="2350" />
            <small style="color:#059669;font-size:11px;margin-top:4px;display:block">
              ℹ️ Offer should meet or exceed the official MSP rate for guaranteed acceptance.
            </small>
          </div>

          <div style="background:#ecfdf5;border:1.5px dashed #10b981;border-radius:12px;padding:14px;margin:18px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>Estimated Contract Value:</span>
              <b id="bid-calc-total" style="color:#065f46;font-size:17px">₹1,17,500</b>
            </div>
            <div style="font-size:11px;color:#047857">
              Includes APMC mandi cess, weighment supervision, and instant J-Form generation.
            </div>
          </div>

          <button id="btn-confirm-buyer-bid" class="cta" style="width:100%;padding:14px">
            Confirm & Issue Contract Order →
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
