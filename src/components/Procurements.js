// src/components/Procurements.js

export function renderProcurements({ procurements, t }) {
  const list = procurements || [];

  return `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${t.procurements.title}</h1>
        <p class="page-subtitle">${t.procurements.subtitle}</p>
      </div>

      <article class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>${t.procurements.tableId}</th>
                <th>${t.procurements.tableDate}</th>
                <th>${t.procurements.tableCrop}</th>
                <th>${t.procurements.tableAmount}</th>
                <th>${t.procurements.tableStatus}</th>
                <th>${t.procurements.tablePayment}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${list.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align:center;padding:30px;color:#9ca3af">
                    No procurement records found.
                  </td>
                </tr>
              ` : list.map(p => `
                <tr>
                  <td><b>${p.id}</b></td>
                  <td>${p.date}</td>
                  <td>${p.crop || p.cropFullName}</td>
                  <td><b style="color:#0f2e1b">₹${p.amount.toLocaleString('en-IN')}</b></td>
                  <td><span class="status-pill completed">${p.status}</span></td>
                  <td>
                    <span class="status-pill ${p.paymentStatus === 'PAID' ? 'paid' : 'processing'}">
                      ${p.paymentStatus === 'PAID' ? 'Paid ✓' : (p.expectedDate ? `Expected ${p.expectedDate}` : 'Processing')}
                    </span>
                  </td>
                  <td style="white-space:nowrap">
                    <button class="btn-outline btn-sm btn-view-slip" data-id="${p.id}">
                      📄 ${t.procurements.actionSlip}
                    </button>
                    ${p.paymentStatus !== 'PAID' ? `
                      <button class="btn-sm btn-secondary btn-approve-pay" data-id="${p.id}" style="margin-left:6px;font-size:11px" title="Simulate PFMS DBT Credit">
                        ⚡ Clear DBT
                      </button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </article>

      <!-- Active Payment Pipeline Tracking (For Most Recent Transaction) -->
      ${list.length > 0 ? `
        <article class="card" style="margin-top:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">
            <div>
              <h3 style="font-size:18px;font-weight:800">${t.procurements.pipelineTitle}</h3>
              <p style="font-size:13px;color:#6b7280">Procurement ID: <b>${list[0].id}</b> • Net Payable: <b>₹${Number(list[0].amount).toLocaleString('en-IN')}</b></p>
            </div>
            <div style="display:flex;gap:10px;align-items:center">
              <span class="status-pill ${list[0].paymentStatus === 'PAID' ? 'paid' : 'processing'}">
                ${list[0].paymentStatus === 'PAID' ? 'Payment Credited ✓' : 'In Processing via PFMS'}
              </span>
              ${list[0].paymentStatus !== 'PAID' ? `
                <button class="btn-sm btn-secondary btn-approve-pay" data-id="${list[0].id}">
                  ⚡ Simulate PFMS DBT Clearing
                </button>
              ` : ''}
            </div>
          </div>

          <div class="dbt-pipeline">
            ${(list[0].milestones || []).map((m, idx) => `
              <div class="dbt-step ${m.done ? 'done' : ''}">
                <div class="dbt-step-circle">${m.done ? '✓' : idx + 1}</div>
                <div class="dbt-step-info">
                  <b>${m.stage}</b>
                  <small>${m.time}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </article>
      ` : ''}
    </div>
  `;
}
