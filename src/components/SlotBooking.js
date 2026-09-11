// src/components/SlotBooking.js

export function renderSlotBooking({ user, centres, crops, availableSlots, selectedValues, t }) {
  const cList = centres || [];
  const cropList = crops || [];
  const slots = availableSlots || [];

  const farmerName = user?.name || 'Ramesh Kumar';
  const farmerId = user?.id || 'FRM-UP-26032';

  const sel = selectedValues || {
    centreId: 'CTR-UP-01',
    cropName: 'Paddy / धान (Common)',
    quantity: 42,
    quantityUnit: 'quintal',
    expectedPrice: 2300,
    vehicle: 'Tractor Trolley',
    preferredDate: '2026-09-12',
    date: '2026-09-12',
    timeSlot: '10:30 – 11:00 AM',
    location: 'Jaitpur Procurement Centre',
    notes: ''
  };

  const cropNameVal = sel.cropName || 'Paddy / धान (Common)';
  const qtyVal = sel.quantity || 42;
  const unitVal = sel.quantityUnit || 'quintal';
  const priceVal = sel.expectedPrice || 2300;
  const locationVal = sel.location || (cList[0]?.name || 'Jaitpur Procurement Centre');
  const dateVal = sel.preferredDate || sel.date || '2026-09-12';
  const timeVal = sel.timeSlot || '10:30 – 11:00 AM';
  const notesVal = sel.notes || '';

  const estimatedPayout = Math.round(Number(qtyVal) * Number(priceVal));

  const dates = [
    { value: '2026-09-12', label: '12 Sep', day: 'Friday' },
    { value: '2026-09-13', label: '13 Sep', day: 'Saturday' },
    { value: '2026-09-15', label: '15 Sep', day: 'Monday' },
    { value: '2026-09-16', label: '16 Sep', day: 'Tuesday' }
  ];

  return `
    <div class="page-container">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="role-badge" style="background:#ecfdf5;color:#065f46;border-color:#a7f3d0">
              🌱 Official APMC E-Procurement
            </span>
            <span style="font-size:12px;color:#6b7280">Farmer ID: <b>${farmerId}</b></span>
          </div>
          <h1 class="page-title">Book Crop Delivery Slot</h1>
          <p class="page-subtitle">Schedule your mandi arrival window, set expected pricing, and receive official APMC gate pass approval.</p>
        </div>

        <button id="btn-view-my-bookings-shortcut" class="btn-secondary" style="font-weight:700">
          📋 My Bookings →
        </button>
      </div>

      <div class="booking-layout">
        <!-- Main Booking Form Card -->
        <article class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:20px">
            <h2 style="font-size:18px;font-weight:800;color:#0f2e1b">
              🌾 Mandi Harvest Arrival Booking
            </h2>
            <span class="status-pill waiting" style="font-size:11px">Status: Pending APMC Approval</span>
          </div>

          <form id="farmer-slot-booking-form" onsubmit="return false;">
            <!-- Auto-populated Farmer Details -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;background:#f8fafc;padding:14px 16px;border-radius:12px;border:1px solid #e2e8f0">
              <div class="form-field" style="margin-bottom:0">
                <label style="color:#64748b;font-size:12px">Farmer Name (Logged In)</label>
                <input id="book-farmer-name" type="text" value="${farmerName}" readonly disabled style="background:#f1f5f9;cursor:not-allowed;font-weight:700;color:#1e293b" />
              </div>
              <div class="form-field" style="margin-bottom:0">
                <label style="color:#64748b;font-size:12px">Farmer ID (System Assigned)</label>
                <input id="book-farmer-id" type="text" value="${farmerId}" readonly disabled style="background:#f1f5f9;cursor:not-allowed;font-weight:700;color:#1e293b" />
              </div>
            </div>

            <!-- Crop/Product Name -->
            <div class="form-field">
              <label for="book-crop-input">Crop / Product Name <span style="color:#dc2626">*</span></label>
              <div style="display:flex;gap:10px">
                <input 
                  id="book-crop-input" 
                  type="text" 
                  value="${cropNameVal}" 
                  placeholder="e.g. Paddy (Common), Wheat, Mustard, Soybean" 
                  required
                  style="flex:1"
                />
                <select id="book-crop-quick-select" style="max-width:220px">
                  <option value="">Choose standard crop...</option>
                  ${cropList.map(c => `
                    <option value="${c.name}" data-rate="${c.mspRate}">${c.name} (MSP ₹${c.mspRate})</option>
                  `).join('')}
                </select>
              </div>
              <small style="color:#64748b;font-size:11px;margin-top:4px;display:block">
                Select from standard mandi crops or type your custom variety/product name.
              </small>
            </div>

            <!-- Quantity & Quantity Unit -->
            <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px">
              <div class="form-field">
                <label for="book-qty-input">Quantity <span style="color:#dc2626">*</span></label>
                <input id="book-qty-input" type="number" min="0.1" step="0.1" value="${qtyVal}" required />
              </div>

              <div class="form-field">
                <label for="book-unit-select">Quantity Unit <span style="color:#dc2626">*</span></label>
                <select id="book-unit-select" required>
                  <option value="quintal" ${unitVal === 'quintal' ? 'selected' : ''}>Quintal (100 kg)</option>
                  <option value="kg" ${unitVal === 'kg' ? 'selected' : ''}>Kilogram (kg)</option>
                  <option value="ton" ${unitVal === 'ton' ? 'selected' : ''}>Metric Ton (1,000 kg)</option>
                </select>
              </div>
            </div>

            <!-- Expected Selling Price -->
            <div class="form-field">
              <label for="book-price-input">Expected Selling Price (₹ per selected unit) <span style="color:#dc2626">*</span></label>
              <input id="book-price-input" type="number" min="1" step="10" value="${priceVal}" required />
              <small style="color:#059669;font-size:11px;margin-top:4px;display:block">
                ✓ Fair market/MSP guideline price. Commercial buyers will make purchase requests based on this rate.
              </small>
            </div>

            <!-- Location / Mandi -->
            <div class="form-field">
              <label for="book-location-select">Location / Procurement Mandi <span style="color:#dc2626">*</span></label>
              <div style="display:flex;gap:10px">
                <select id="book-location-select" style="flex:1" required>
                  ${cList.map(c => `
                    <option value="${c.name}" ${locationVal === c.name ? 'selected' : ''}>
                      ${c.name} (${c.district || 'Gorakhpur'}) • Distance: ${c.distanceKm || 3.2} km
                    </option>
                  `).join('')}
                  <option value="Custom Mandi / Other Location">Other Mandi / Custom Location...</option>
                </select>
              </div>
              <input 
                id="book-custom-location" 
                type="text" 
                placeholder="Type custom Mandi or Yard location name..." 
                class="hidden" 
                style="margin-top:8px" 
              />
            </div>

            <!-- Preferred Date -->
            <div class="form-field">
              <label>Preferred Delivery Date <span style="color:#dc2626">*</span></label>
              <div class="slot-pill-grid" style="margin-bottom:10px">
                ${dates.map(d => `
                  <div class="slot-pill date-choice ${d.value === dateVal ? 'selected' : ''}" data-date="${d.value}">
                    <b>${d.label}</b>
                    <small>${d.day}</small>
                  </div>
                `).join('')}
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:12px;color:#64748b">Or pick custom calendar date:</span>
                <input id="book-custom-date" type="date" value="${dateVal}" style="max-width:200px" />
              </div>
            </div>

            <!-- Preferred Time Slot -->
            <div class="form-field">
              <label>Preferred Arrival Time Slot <span style="color:#dc2626">*</span></label>
              <div class="slot-pill-grid">
                ${slots.map(s => `
                  <div class="slot-pill time-choice ${s.label === timeVal ? 'selected' : ''}" data-slot="${s.label}">
                    <b>${s.label}</b>
                    <small>${s.remaining} slots available</small>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Vehicle Selection (Optional helper) -->
            <div class="form-field">
              <label for="book-vehicle-select">Transport Vehicle</label>
              <select id="book-vehicle-select">
                <option value="Tractor Trolley">Tractor Trolley / ट्रैक्टर ट्रॉली</option>
                <option value="Pickup / LCV 407">Pickup Truck / छोटा हाथी (LCV)</option>
                <option value="Bullock Cart / Small Carrier">Bullock Cart / बैलगाड़ी / छोटा वाहन</option>
                <option value="Multi-axle Truck">Large Heavy Truck / भारी ट्रक</option>
              </select>
            </div>

            <!-- Additional Notes -->
            <div class="form-field">
              <label for="book-notes-input">Additional Notes / Special Instructions (Optional)</label>
              <textarea 
                id="book-notes-input" 
                rows="3" 
                placeholder="e.g. Moisture ~12%, cleaned grain bags, require forklift assistance..."
                style="resize:vertical"
              >${notesVal}</textarea>
            </div>

            <!-- Error container -->
            <div id="booking-form-error" class="hidden" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px;border-radius:10px;font-size:13px;margin-bottom:16px"></div>

            <!-- Submit Button -->
            <button id="btn-submit-farmer-booking" type="button" class="cta" style="width:100%;padding:16px;font-size:16px;font-weight:800">
              🚀 Submit Booking →
            </button>
          </form>
        </article>

        <!-- Right Summary Sidebar Card -->
        <aside class="card" style="height:fit-content">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px">Booking Summary</h3>
          
          <div class="summary-line">
            <span>Farmer Name</span>
            <b id="sum-farmer-name">${farmerName}</b>
          </div>

          <div class="summary-line">
            <span>Crop / Product</span>
            <b id="sum-crop-name">${cropNameVal}</b>
          </div>

          <div class="summary-line">
            <span>Declared Quantity</span>
            <b id="sum-qty">${qtyVal} ${unitVal}</b>
          </div>

          <div class="summary-line">
            <span>Expected Unit Price</span>
            <b id="sum-price">₹${Number(priceVal).toLocaleString('en-IN')} / ${unitVal}</b>
          </div>

          <div class="summary-line">
            <span>Scheduled Date</span>
            <b id="sum-date">${dateVal}</b>
          </div>

          <div class="summary-line">
            <span>Time Window</span>
            <b id="sum-slot">${timeVal}</b>
          </div>

          <div class="summary-line">
            <span>Arrival Mandi</span>
            <b id="sum-mandi">${locationVal}</b>
          </div>

          <div class="summary-total" style="margin-top:16px;padding-top:16px;border-top:2px dashed #e2e8f0">
            <span>Estimated Value:</span>
            <b id="sum-total-payout" style="color:#15803d;font-size:18px">₹${estimatedPayout.toLocaleString('en-IN')}</b>
          </div>

          <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px;font-size:12px;color:#065f46;line-height:1.5;margin-top:20px">
            🛡️ <b>Guaranteed Process:</b> Upon submitting, your booking will receive a unique Tracking ID and be saved to the APMC MongoDB database in <b>Pending</b> status. Once Mandi Admin reviews and approves it, commercial buyers can request to purchase it directly.
          </div>
        </aside>
      </div>
    </div>
  `;
}
