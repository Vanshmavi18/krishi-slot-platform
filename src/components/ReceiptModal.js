// src/components/ReceiptModal.js

export class ReceiptModal {
  constructor() {
    this.currentData = null;
  }

  open(procurement) {
    this.currentData = procurement;
    this.render();
  }

  close() {
    const el = document.getElementById('receipt-modal-root');
    if (el) el.innerHTML = '';
  }

  render() {
    let container = document.getElementById('receipt-modal-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'receipt-modal-root';
      document.body.appendChild(container);
    }

    const p = this.currentData;
    if (!p) return;

    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-window" style="max-width:620px">
          <button id="btn-close-receipt" class="modal-close-btn">✕</button>

          <div class="jform-slip" id="printable-slip">
            <div class="jform-header">
              <div style="font-size:28px;margin-bottom:4px">🏛️</div>
              <h2>GOVERNMENT PROCUREMENT RECEIPT (J-FORM)</h2>
              <div style="font-size:12px;color:#374151">Agricultural Produce Market Committee (APMC) • State Procurement Board</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px">Issued under MSP Procurement & Direct Benefit Transfer (DBT) Guidelines 2026</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:14px;background:#f0fdf4;padding:8px 12px;border-radius:8px;font-size:12px">
              <span>Receipt No: <b>${p.id}</b></span>
              <span>Date: <b>${p.date}</b></span>
            </div>

            <div class="jform-grid">
              <div>
                <span style="font-size:11px;color:#6b7280;display:block">FARMER DETAILS (विक्रेता किसान)</span>
                <b>${p.farmerName}</b>
                <div style="font-size:12px;color:#4b5563">ID: ${p.farmerId}</div>
                <div style="font-size:12px;color:#4b5563">Bank: ${p.bankName || 'SBI'} (${p.bankAccMasked || '•••• 4862'})</div>
              </div>
              <div>
                <span style="font-size:11px;color:#6b7280;display:block">PROCUREMENT CENTRE (खरीद केंद्र)</span>
                <b>${p.centre || 'Jaitpur Procurement Centre'}</b>
                <div style="font-size:12px;color:#4b5563">District: ${p.centreDistrict || 'Gorakhpur, UP'}</div>
                <div style="font-size:12px;color:#4b5563">Inspector: ${p.officer || 'V. K. Verma'}</div>
              </div>
            </div>

            <!-- Weighment Table -->
            <table class="data-table" style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px">
              <thead style="background:#f9fafb">
                <tr>
                  <th>Commodity</th>
                  <th>Gross Wt</th>
                  <th>Tare Wt</th>
                  <th>Net Wt</th>
                  <th>Moisture</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>${p.cropFullName || p.crop || 'Paddy'}</b></td>
                  <td>${p.grossWeight || 60.5} qtl</td>
                  <td>${p.tareWeight || 2.5} qtl</td>
                  <td><b style="color:#15803d">${p.netWeight} qtl</b></td>
                  <td>${p.moisturePercent || 14.0}% FAQ</td>
                </tr>
              </tbody>
            </table>

            <!-- Financial Calculation -->
            <div style="background:#fbfcf9;border:1.5px dashed #cbe0c5;border-radius:10px;padding:14px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
                <span>Government Minimum Support Price (MSP Rate):</span>
                <b>₹${(p.mspRate || 2300).toLocaleString('en-IN')} / quintal</b>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
                <span>Net Deliverable Quantity:</span>
                <b>${p.netWeight} quintals</b>
              </div>
              <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:8px;font-size:16px">
                <span style="font-weight:800;color:#0f2e1b">Total Net Payable to Farmer:</span>
                <b style="font-weight:800;color:#15803d;font-size:20px">₹${p.amount.toLocaleString('en-IN')}</b>
              </div>
            </div>

            <!-- DBT Transfer Details -->
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:18px">
              <div>
                <span>DBT Status: <b>${p.paymentStatus === 'PAID' ? 'Transfer Cleared ✓' : 'In Processing via PFMS'}</b></span>
                ${p.utr ? `<div style="color:#15803d;font-size:11px">Bank UTR: <b>${p.utr}</b></div>` : `<div style="color:#b45309;font-size:11px">Expected Transfer by: ${p.expectedDate || '2-3 Working Days'}</div>`}
              </div>
              <div style="text-align:right">
                <span style="display:block;font-size:10px;color:#6b7280">DIGITALLY VERIFIED</span>
                <span style="color:#15803d;font-weight:800">AgriQueue APMC ✓</span>
              </div>
            </div>

            <div style="display:flex;gap:12px">
              <button id="btn-print-slip" class="cta" style="flex:1">
                🖨️ Print / Download Official J-Form Slip
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-close-receipt')?.addEventListener('click', () => this.close());
    document.getElementById('btn-print-slip')?.addEventListener('click', () => window.print());
  }
}
