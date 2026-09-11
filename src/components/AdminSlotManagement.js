// src/components/AdminSlotManagement.js

export function renderAdminSlotManagement({ user, bookings = [], t }) {
  const adminName = user?.name || 'APMC Officer';
  const total = bookings.length;
  const pending = bookings.filter(b => b.status === 'Pending').length;
  const approved = bookings.filter(b => b.status === 'Approved' || b.status === 'CONFIRMED').length;
  const completed = bookings.filter(b => b.status === 'Completed').length;
  const rejected = bookings.filter(b => b.status === 'Rejected').length;
  const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return '<span class="status-pill waiting" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a">⏳ Pending Review</span>';
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
    <div class="page-container admin-slots-view">
      <!-- Admin Header -->
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="role-badge" style="background:#fef3c7;color:#92400e;border-color:#fde68a">
              🏛️ Mandi Regulatory Administration
            </span>
            <span style="font-size:12px;color:#6b7280">Officer: <b>${adminName}</b></span>
          </div>
          <h1 class="page-title">Slot Management System</h1>
          <p class="page-subtitle">Review incoming farmer delivery bookings, approve slots, track buyer commercial requests, and update lifecycle states in real-time MongoDB.</p>
        </div>

        <div style="display:flex;gap:10px">
          <button id="btn-refresh-admin-slots" class="btn-secondary" style="font-weight:700">
            🔄 Refresh Bookings
          </button>
        </div>
      </div>

      <!-- Metric Cards -->
      <div class="stats-grid" style="grid-template-columns:repeat(5, 1fr);margin-bottom:28px">
        <div class="stat-card">
          <span class="label">Total Farmer Slots</span>
          <strong class="value">${total}</strong>
          <span class="sub">Across all Mandi Centres</span>
        </div>
        <div class="stat-card">
          <span class="label">Pending Action</span>
          <strong class="value" style="color:#d97706">${pending}</strong>
          <span class="sub" style="color:#b45309">Requires immediate review</span>
        </div>
        <div class="stat-card">
          <span class="label">Approved & Active</span>
          <strong class="value" style="color:#2563eb">${approved}</strong>
          <span class="sub" style="color:#1d4ed8">Visible to buyers & gate</span>
        </div>
        <div class="stat-card">
          <span class="label">Completed</span>
          <strong class="value" style="color:#15803d">${completed}</strong>
          <span class="sub">Delivered & J-Form cleared</span>
        </div>
        <div class="stat-card">
          <span class="label">Rejected / Cancelled</span>
          <strong class="value" style="color:#64748b">${rejected + cancelled}</strong>
          <span class="sub">${rejected} rejected • ${cancelled} cancelled</span>
        </div>
      </div>

      <!-- Slot Management Table Card -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
          <div>
            <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
              📑 Mandi Slot Management & Approvals
            </h2>
            <p style="font-size:13px;color:#6b7280">
              Live records persisted to MongoDB. Status changes immediately update Farmer and Buyer portals.
            </p>
          </div>

          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <input 
              id="search-admin-slots" 
              type="text" 
              placeholder="Search farmer, crop, ID..." 
              style="padding:7px 12px;font-size:13px;border-radius:8px;border:1px solid #cbd5e1;max-width:220px"
            />
            <select id="filter-admin-slots-status" class="btn-secondary" style="padding:6px 12px;font-size:13px">
              <option value="ALL">All Statuses (${total})</option>
              <option value="Pending">Pending (${pending})</option>
              <option value="Approved">Approved (${approved})</option>
              <option value="Completed">Completed (${completed})</option>
              <option value="Rejected">Rejected (${rejected})</option>
              <option value="Cancelled">Cancelled (${cancelled})</option>
            </select>
          </div>
        </div>

        ${bookings.length === 0 ? `
          <div style="padding:48px 20px;text-align:center;color:#94a3b8">
            <div style="font-size:42px;margin-bottom:12px">📭</div>
            <h3>No Bookings Recorded</h3>
            <p style="font-size:13px;color:#6b7280">Bookings submitted by registered farmers will appear here automatically.</p>
          </div>
        ` : `
          <div class="table-container" style="max-height:560px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Farmer</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Date & Time Slot</th>
                  <th>Location</th>
                  <th>Buyer / Request Info</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th style="min-width:180px">Admin Actions</th>
                </tr>
              </thead>
              <tbody id="admin-slots-table-body">
                ${bookings.map(b => {
                  const bId = b.bookingId || b.id;
                  const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : b.date || 'TBD');
                  const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent';
                  
                  const isPending = b.status === 'Pending';
                  const isApproved = b.status === 'Approved' || b.status === 'CONFIRMED';
                  const isCompleted = b.status === 'Completed';
                  const isTerminal = b.status === 'Completed' || b.status === 'Rejected' || b.status === 'Cancelled';

                  const requests = Array.isArray(b.buyerRequests) ? b.buyerRequests : [];

                  return `
                    <tr data-status="${b.status}" data-search="${(bId + ' ' + (b.farmerName || '') + ' ' + (b.cropName || '')).toLowerCase()}">
                      <td>
                        <strong style="color:#15803d">#${bId}</strong>
                        ${b.token ? `<div style="font-size:11px;color:#6b7280">Token: <b>#${b.token}</b></div>` : ''}
                      </td>
                      <td>
                        <div><b>${b.farmerName || 'Farmer'}</b></div>
                        <small style="color:#64748b">ID: ${b.farmerId || 'N/A'}</small>
                        ${b.farmerPhone ? `<div style="font-size:11px;color:#059669">📞 ${b.farmerPhone}</div>` : ''}
                      </td>
                      <td>
                        <b>${b.cropName}</b>
                      </td>
                      <td>
                        <strong style="color:#0f766e;font-size:14px">${b.quantity}</strong>
                        <span style="font-size:12px;color:#6b7280">${b.quantityUnit || 'quintal'}</span>
                      </td>
                      <td>
                        <div style="font-weight:700;color:#15803d">₹${Number(b.expectedPrice || 0).toLocaleString('en-IN')}</div>
                        <small style="font-size:10px;color:#6b7280">per ${b.quantityUnit || 'qtl'}</small>
                      </td>
                      <td>
                        <b>${dateDisplay}</b>
                        <div style="font-size:11px;color:#4b5563">${b.timeSlot}</div>
                      </td>
                      <td>
                        <div style="font-size:13px">${b.location || b.centreName || 'Gorakhpur Mandi'}</div>
                      </td>
                      <td>
                        ${requests.length > 0 ? `
                          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:4px 8px;font-size:11px;color:#166534">
                            <b>${requests.length} Offer(s)</b>
                            <div style="font-weight:600;margin-top:2px">${requests[0].buyerName || 'Commercial Buyer'}</div>
                            <div style="color:#15803d">₹${requests[0].offeredPrice || b.expectedPrice}/qtl</div>
                          </div>
                        ` : b.buyerName ? `
                          <div style="font-size:12px">
                            <b>${b.buyerName}</b>
                            <small style="color:#64748b;display:block">ID: ${b.buyerId}</small>
                          </div>
                        ` : `
                          <span style="font-size:12px;color:#9ca3af">No Buyer Request</span>
                        `}
                      </td>
                      <td>
                        ${getStatusBadge(b.status)}
                      </td>
                      <td style="font-size:12px;color:#6b7280">
                        ${createdDate}
                      </td>
                      <td>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                          <button 
                            class="btn-admin-view-booking btn-outline btn-sm" 
                            data-booking='${JSON.stringify(b).replace(/'/g, "&apos;")}'
                            title="View Full Booking"
                          >
                            👁️
                          </button>

                          ${isPending ? `
                            <button 
                              class="btn-admin-status-trigger btn-sm" 
                              style="background:#15803d;color:#fff;border:none;border-radius:6px;padding:4px 9px;font-weight:700;font-size:11.5px;cursor:pointer"
                              data-id="${bId}" 
                              data-target="Approved"
                              data-crop="${b.cropName}"
                              data-farmer="${b.farmerName}"
                            >
                              ✓ Approve
                            </button>
                            <button 
                              class="btn-admin-status-trigger btn-sm" 
                              style="background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:6px;padding:4px 9px;font-weight:700;font-size:11.5px;cursor:pointer"
                              data-id="${bId}" 
                              data-target="Rejected"
                              data-crop="${b.cropName}"
                              data-farmer="${b.farmerName}"
                            >
                              ✕ Reject
                            </button>
                          ` : ''}

                          ${isApproved ? `
                            <button 
                              class="btn-admin-status-trigger btn-sm" 
                              style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:4px 9px;font-weight:700;font-size:11.5px;cursor:pointer"
                              data-id="${bId}" 
                              data-target="Completed"
                              data-crop="${b.cropName}"
                              data-farmer="${b.farmerName}"
                            >
                              ✓ Complete
                            </button>
                            <button 
                              class="btn-admin-status-trigger btn-sm" 
                              style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;border-radius:6px;padding:4px 9px;font-weight:700;font-size:11.5px;cursor:pointer"
                              data-id="${bId}" 
                              data-target="Cancelled"
                              data-crop="${b.cropName}"
                              data-farmer="${b.farmerName}"
                            >
                              ⊘ Cancel
                            </button>
                          ` : ''}

                          ${isTerminal ? `
                            <span style="font-size:11px;color:#94a3b8;font-style:italic">Finalized</span>
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

      <!-- ADMIN STATUS CHANGE CONFIRMATION MODAL -->
      <div id="admin-status-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:460px">
          <button id="btn-close-admin-status-modal" class="modal-close-btn">✕</button>

          <div style="text-align:center;margin-bottom:18px">
            <div id="admin-modal-icon" style="font-size:36px;margin-bottom:6px">⚡</div>
            <h2 id="admin-modal-title" style="font-size:20px;font-weight:800;color:#0f2e1b">Confirm Status Change</h2>
            <p id="admin-modal-desc" style="font-size:13px;color:#6b7280;margin-top:4px"></p>
          </div>

          <div id="admin-modal-details-box" style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 14px;border-radius:10px;font-size:13px;margin-bottom:14px"></div>

          <div class="form-field">
            <label>Administrative Notes / Feedback for Farmer & Buyer</label>
            <textarea id="admin-status-notes-input" rows="2" placeholder="e.g. Verified APMC documents. Slot approved for Weighbridge Counter 2."></textarea>
          </div>

          <div style="display:flex;gap:10px;margin-top:20px">
            <button id="btn-admin-modal-dismiss" class="btn-secondary" style="flex:1;padding:12px">
              Cancel
            </button>
            <button id="btn-admin-modal-confirm" class="cta" style="flex:1;padding:12px">
              Confirm Status →
            </button>
          </div>
        </div>
      </div>

      <!-- ADMIN BOOKING VIEW DETAILS MODAL -->
      <div id="admin-view-booking-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:540px">
          <button id="btn-close-admin-view-modal" class="modal-close-btn">✕</button>
          
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px">
            <div style="font-size:28px">📋</div>
            <div>
              <h3 id="admin-view-modal-id" style="font-size:18px;font-weight:800;color:#0f2e1b">Booking Details</h3>
              <p style="font-size:12px;color:#6b7280">Complete APMC System Record</p>
            </div>
          </div>

          <div id="admin-view-modal-body"></div>

          <div style="margin-top:20px;display:flex;justify-content:flex-end">
            <button id="btn-admin-view-modal-close" class="btn-outline" style="padding:8px 18px">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
