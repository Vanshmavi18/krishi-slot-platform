// src/components/SlotBooking.js

export function renderSlotBooking({ centres, crops, availableSlots, selectedValues, t }) {
  const cList = centres || [];
  const cropList = crops || [];
  const slots = availableSlots || [];
  const sel = selectedValues || {
    centreId: 'CTR-UP-01',
    cropId: 'paddy_comm',
    quantity: 42,
    vehicle: 'Tractor Trolley',
    date: '2026-09-12',
    timeSlot: '10:30 – 11:00 AM'
  };

  const selectedCrop = cropList.find(c => c.id === sel.cropId) || cropList[0] || { name: 'Paddy / धान', mspRate: 2300 };
  const selectedCentre = cList.find(c => c.id === sel.centreId) || cList[0] || { name: 'Jaitpur Procurement Centre', distanceKm: 3.2 };
  const estimatedPayout = Math.round((Number(sel.quantity) || 0) * (selectedCrop.mspRate || 2300));

  const dates = [
    { value: '2026-09-12', label: '12 Sep', day: 'Friday' },
    { value: '2026-09-13', label: '13 Sep', day: 'Saturday' },
    { value: '2026-09-15', label: '15 Sep', day: 'Monday' },
    { value: '2026-09-16', label: '16 Sep', day: 'Tuesday' }
  ];

  return `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${t.booking.title}</h1>
        <p class="page-subtitle">${t.booking.subtitle}</p>
      </div>

      <div class="booking-layout">
        <article class="card">
          <div class="stepper-header">
            <div class="stepper-step active"></div>
            <div class="stepper-step active"></div>
            <div class="stepper-step active"></div>
          </div>

          <!-- Step 1: Centre Selection -->
          <div class="form-field">
            <label>${t.booking.centreLabel}</label>
            <select id="book-centre-select">
              ${cList.map(c => `
                <option value="${c.id}" ${c.id === sel.centreId ? 'selected' : ''}>
                  ${c.name} (${c.distanceKm} km away) • Today: ${c.todayBooked || 64}/${c.dailyCapacity || 90}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Step 2: Crop & Quantity -->
          <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px">
            <div class="form-field">
              <label>${t.booking.cropLabel}</label>
              <select id="book-crop-select">
                ${cropList.map(cr => `
                  <option value="${cr.id}" ${cr.id === sel.cropId ? 'selected' : ''}>
                    ${cr.name} — MSP: ₹${cr.mspRate.toLocaleString('en-IN')}/qtl
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-field">
              <label>${t.booking.qtyLabel}</label>
              <input id="book-qty-input" type="number" min="1" max="500" value="${sel.quantity || 42}" />
            </div>
          </div>

          <div class="form-field">
            <label>${t.booking.vehicleLabel}</label>
            <select id="book-vehicle-select">
              <option value="Tractor Trolley">Tractor Trolley / ट्रैक्टर ट्रॉली</option>
              <option value="Pickup / LCV 407">Pickup Truck / छोटा हाथी (LCV)</option>
              <option value="Bullock Cart / Small Carrier">Bullock Cart / बैलगाड़ी / छोटा वाहन</option>
              <option value="Multi-axle Truck">Large Heavy Truck / भारी ट्रक</option>
            </select>
          </div>

          <!-- Step 3: Date & Time Slot Grid -->
          <div class="form-field">
            <label>${t.booking.dateLabel}</label>
            <div class="slot-pill-grid">
              ${dates.map(d => `
                <div class="slot-pill date-choice ${d.value === sel.date ? 'selected' : ''}" data-date="${d.value}">
                  <b>${d.label}</b>
                  <small>${d.day}</small>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="form-field">
            <label>${t.booking.slotLabel}</label>
            <div class="slot-pill-grid">
              ${slots.map(s => `
                <div class="slot-pill time-choice ${s.label === sel.timeSlot ? 'selected' : ''}" data-slot="${s.label}">
                  <b>${s.label}</b>
                  <small>${s.remaining} ${t.booking.slotsLeft}</small>
                </div>
              `).join('')}
            </div>
          </div>

          <button id="btn-confirm-slot-booking" class="cta" style="width:100%;margin-top:10px;padding:16px;font-size:16px">
            ✓ ${t.booking.confirmBtn}
          </button>
        </article>

        <!-- Right Booking Summary Card -->
        <aside class="card" style="height:fit-content">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px">${t.booking.summaryTitle}</h3>
          
          <div class="summary-line">
            <span>Procurement Mandi</span>
            <b>${selectedCentre.name}</b>
          </div>

          <div class="summary-line">
            <span>Crop Harvest</span>
            <b>${selectedCrop.name}</b>
          </div>

          <div class="summary-line">
            <span>Government MSP Rate</span>
            <b>₹${selectedCrop.mspRate.toLocaleString('en-IN')} / qtl</b>
          </div>

          <div class="summary-line">
            <span>Declared Quantity</span>
            <b>${sel.quantity || 42} quintals</b>
          </div>

          <div class="summary-line">
            <span>Scheduled Date</span>
            <b>${dates.find(d => d.value === sel.date)?.label || '12 Sep'}, 2026</b>
          </div>

          <div class="summary-line">
            <span>Time Window</span>
            <b>${sel.timeSlot || '10:30 – 11:00 AM'}</b>
          </div>

          <div class="summary-total">
            <span>${t.booking.calculatedAmount}:</span>
            <b>₹${estimatedPayout.toLocaleString('en-IN')}</b>
          </div>

          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px;font-size:12px;color:#92400e;line-height:1.5;margin-top:20px">
            📩 <b>${t.booking.note}</b>
          </div>
        </aside>
      </div>
    </div>
  `;
}
