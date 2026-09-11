// src/components/MyBookings.js

export function renderMyBookings({ user, bookings = [], error = null, t, onNavigate }) {
  const farmerName = user?.name || 'Farmer';
  const farmerId = user?.id || '';

  const total = bookings.length;
  const pending = bookings.filter(b => b.status === 'Pending').length;
  const approved = bookings.filter(b => b.status === 'Approved' || b.status === 'CONFIRMED').length;
  const completed = bookings.filter(b => b.status === 'Completed').length;
  const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return '<span class="status-pill waiting" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a">⏳ Pending</span>';
      case 'Approved':
      case 'CONFIRMED':
        return '<span class="status-pill confirmed" style="background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe">✓ Approved</span>';
      case 'Rejected':
        return '<span class="status-pill" style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca">✕ Rejected</span>';
      case 'Completed':
        return '<span class="status-pill paid" style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0">✓ Completed</span>';
      case 'Cancelled':
        return '<span class="status-pill" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1">⊘ Cancelled</span>';
      default:
        return `<span class="status-pill">${status}</span>`;
    }
  };

  return `
    <div class="page-container">
      <!-- Header with Action Button -->
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="role-badge" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0">
              🌱 Verified Farmer Portal
            </span>
            <span style="font-size:12px;color:#6b7280">Farmer ID: <b>${farmerId}</b></span>
          </div>
          <h1 class="page-title">My Procurement Bookings</h1>
          <p class="page-subtitle">Track your delivery windows, status reviews by APMC Mandi, and commercial buyer offers.</p>
        </div>

        <div style="display:flex;gap:10px">
          <button id="btn-refresh-my-bookings" class="btn-secondary" style="font-weight:700">
            🔄 Refresh
          </button>
          <button id="btn-nav-book-slot" class="cta">
            ＋ Book New Slot
          </button>
        </div>
      </div>

      ${error ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:14px 18px;border-radius:12px;font-size:14px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">⚠️</span>
          <div>
            <b>Database Connection Warning:</b> ${error}
            <div style="font-size:12px;color:#b91c1c;margin-top:2px">Please click "Refresh" or verify backend MongoDB status.</div>
          </div>
        </div>
      ` : ''}

      <!-- Bookings Metric Overview Cards -->
      <div class="stats-grid" style="grid-template-columns:repeat(5, 1fr);margin-bottom:28px">
        <div class="stat-card">
          <span class="label">Total Bookings</span>
          <strong class="value">${total}</strong>
          <span class="sub">Lifetime Harvest Slots</span>
        </div>
        <div class="stat-card">
          <span class="label">Pending Review</span>
          <strong class="value" style="color:#d97706">${pending}</strong>
          <span class="sub" style="color:#b45309">Awaiting APMC approval</span>
        </div>
        <div class="stat-card">
          <span class="label">Approved / Active</span>
          <strong class="value" style="color:#2563eb">${approved}</strong>
          <span class="sub" style="color:#1d4ed8">Ready for gate inward</span>
        </div>
        <div class="stat-card">
          <span class="label">Completed</span>
          <strong class="value" style="color:#15803d">${completed}</strong>
          <span class="sub">Delivered & J-Form issued</span>
        </div>
        <div class="stat-card">
          <span class="label">Cancelled</span>
          <strong class="value" style="color:#64748b">${cancelled}</strong>
          <span class="sub">Released slots</span>
        </div>
      </div>

      <!-- Main Bookings Card with Data Table -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
              📋 My Scheduled Delivery Slots
            </h2>
            <p style="font-size:13px;color:#6b7280">
              Live status directly synchronized with APMC Mandi MongoDB database
            </p>
          </div>
          <div style="display:flex;gap:8px">
            <select id="filter-my-bookings-status" class="btn-secondary" style="padding:6px 12px;font-size:13px">
              <option value="ALL">All Statuses (${total})</option>
              <option value="Pending">Pending (${pending})</option>
              <option value="Approved">Approved (${approved})</option>
              <option value="Completed">Completed (${completed})</option>
              <option value="Cancelled">Cancelled (${cancelled})</option>
            </select>
          </div>
        </div>

        ${bookings.length === 0 ? `
          <div style="padding:48px 20px;text-align:center">
            <div style="font-size:48px;margin-bottom:12px">🌾</div>
            <h3 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:6px">No bookings found.</h3>
            <p style="font-size:14px;color:#64748b;max-width:420px;margin:0 auto 20px">
              You have not booked any crop delivery slots yet. Schedule your delivery window to avoid mandi congestion.
            </p>
            <button id="empty-btn-book-slot" class="cta">
              📅 Book Your First Slot Now →
            </button>
          </div>
        ` : `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Mandi/Market</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="my-bookings-table-body">
                ${bookings.map(b => {
                  const bId = b.bookingId || b.id;
                  const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : b.date || b.slotDate || 'TBD');
                  const timeDisplay = b.timeSlot || `${b.startTime || ''} – ${b.endTime || ''}`.trim() || 'Scheduled';
                  const mandiDisplay = b.location || b.market || b.mandi || b.centreName || 'APMC Mandi';
                  const isCancelable = b.status === 'Pending' || b.status === 'Approved' || b.status === 'CONFIRMED';
                  const hasBuyerRequests = Array.isArray(b.buyerRequests) && b.buyerRequests.length > 0;
                  const buyerDisplay = b.buyerName ? `<b>${b.buyerName}</b>` : (hasBuyerRequests ? `<span class="status-pill" style="background:#eff6ff;color:#2563eb;font-size:11px;padding:2px 6px">🛒 ${b.buyerRequests.length} Offer(s)</span>` : '<span style="color:#94a3b8;font-size:12px">Open for offers</span>');
                  const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';

                  return `
                    <tr data-status="${b.status}">
                      <td>
                        <strong style="color:#15803d;font-size:13.5px">#${bId}</strong>
                        ${b.token ? `<div style="font-size:11px;color:#6b7280">Token: <b>#${b.token}</b></div>` : ''}
                      </td>
                      <td>
                        <b>${b.crop || b.cropName}</b>
                      </td>
                      <td>
                        <strong style="color:#0f766e;font-size:14px">${b.quantity}</strong>
                        <span style="font-size:12px;color:#6b7280">${b.quantityUnit || 'quintal'}</span>
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
                        ${buyerDisplay}
                      </td>
                      <td>
                        ${getStatusBadge(b.status)}
                      </td>
                      <td style="font-size:12px;color:#6b7280">
                        ${createdDate}
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;align-items:center">
                          <button 
                            class="btn-view-booking-details btn-outline btn-sm" 
                            data-booking='${JSON.stringify(b).replace(/'/g, "&apos;")}'
                            title="View complete booking details"
                          >
                            👁️ View
                          </button>
                          ${isCancelable ? `
                            <button 
                              class="btn-cancel-booking btn-secondary btn-sm" 
                              style="color:#b91c1c;border-color:#fca5a5"
                              data-id="${bId}"
                              data-crop="${b.crop || b.cropName}"
                              title="Cancel booking"
                            >
                              ✕ Cancel
                            </button>
                          ` : ''}
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- BOOKING DETAILS MODAL -->
      <div id="booking-details-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:560px">
          <button id="btn-close-booking-details" class="modal-close-btn">✕</button>
          
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:14px">
            <div style="font-size:32px">📋</div>
            <div>
              <h2 id="modal-booking-id" style="font-size:20px;font-weight:800;color:#0f2e1b">Booking Details</h2>
              <p style="font-size:12px;color:#6b7280">AgriQueue Verified Mandi Slot Record</p>
            </div>
          </div>

          <div id="modal-booking-content">
            <!-- Dynamic Content -->
          </div>

          <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px">
            <button id="btn-modal-close-action" class="btn-outline" style="padding:10px 18px">
              Close
            </button>
          </div>
        </div>
      </div>

      <!-- CANCEL CONFIRMATION MODAL -->
      <div id="cancel-confirm-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:440px">
          <div style="text-align:center;margin-bottom:16px">
            <div style="font-size:36px;margin-bottom:6px">⚠️</div>
            <h3 style="font-size:19px;font-weight:800;color:#991b1b">Confirm Cancellation</h3>
            <p id="cancel-confirm-text" style="font-size:13px;color:#6b7280;margin-top:4px">
              Are you sure you want to cancel this booking? This will release your reserved slot.
            </p>
          </div>

          <div class="form-field">
            <label>Reason for cancellation (optional)</label>
            <input id="cancel-reason-input" type="text" placeholder="e.g. Schedule change, delayed harvest" />
          </div>

          <div style="display:flex;gap:10px;margin-top:20px">
            <button id="btn-cancel-modal-dismiss" class="btn-secondary" style="flex:1;padding:12px">
              Keep Booking
            </button>
            <button id="btn-confirm-cancel-action" class="cta" style="flex:1;background:#dc2626;padding:12px">
              Yes, Cancel Slot
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
