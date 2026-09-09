// src/components/Sidebar.js

export function renderSidebar({ currentView, user, t }) {
  const role = (user?.role || 'farmer').toLowerCase();
  const isFarmer = role === 'farmer';
  const isAdmin = role === 'admin' || role === 'officer';
  const isBuyer = role === 'buyer';

  return `
    <aside class="app-sidebar">
      <div>
        <div class="sidebar-brand">
          <div class="brand-wrapper">
            <div class="brand-icon">🌱</div>
            <div>
              <span>${t.brandName}</span>
              <div style="font-size:10px;font-weight:700;color:#15803d;letter-spacing:0.05em">
                ${isBuyer ? 'BUYER & TRADER HUB' : isAdmin ? 'APMC ADMIN CONTROL' : 'FARMER SELLER PORTAL'}
              </div>
            </div>
          </div>
        </div>

        <!-- FARMER PORTAL LINKS -->
        ${isFarmer ? `
          <div class="sidebar-section-title">Farmer (Seller) Portal</div>
          <nav class="sidebar-nav">
            <button class="nav-link ${currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
              <i>📊</i>
              <span>${t.nav.dashboard}</span>
            </button>
            <button class="nav-link ${currentView === 'booking' ? 'active' : ''}" data-view="booking">
              <i>📅</i>
              <span>${t.nav.booking}</span>
            </button>
            <button class="nav-link ${currentView === 'queue' ? 'active' : ''}" data-view="queue">
              <i>⏱️</i>
              <span>${t.nav.queue}</span>
            </button>
            <button class="nav-link ${currentView === 'procurements' ? 'active' : ''}" data-view="procurements">
              <i>🌾</i>
              <span>${t.nav.procurements}</span>
            </button>
            <button class="nav-link ${currentView === 'sms' ? 'active' : ''}" data-view="sms">
              <i>📱</i>
              <span>${t.nav.smsLogs}</span>
            </button>
          </nav>
        ` : ''}

        <!-- APMC ADMIN LINKS -->
        ${isAdmin ? `
          <div class="sidebar-section-title">APMC Administration</div>
          <nav class="sidebar-nav">
            <button class="nav-link ${currentView === 'centre' ? 'active' : ''}" data-view="centre">
              <i>🏢</i>
              <span>Mandi Operations</span>
              <span class="badge-count">Live</span>
            </button>
            <button class="nav-link ${currentView === 'queue' ? 'active' : ''}" data-view="queue">
              <i>⏱️</i>
              <span>Live Queue Monitor</span>
            </button>
            <button class="nav-link ${currentView === 'procurements' ? 'active' : ''}" data-view="procurements">
              <i>📜</i>
              <span>Procurement Slips & DBT</span>
            </button>
            <button class="nav-link ${currentView === 'buyer' ? 'active' : ''}" data-view="buyer">
              <i>🛒</i>
              <span>Buyer Contracts & Lots</span>
            </button>
          </nav>
        ` : ''}

        <!-- BUYER PORTAL LINKS -->
        ${isBuyer ? `
          <div class="sidebar-section-title">Buyer & Processor Portal</div>
          <nav class="sidebar-nav">
            <button class="nav-link ${currentView === 'buyer' ? 'active' : ''}" data-view="buyer">
              <i>🛒</i>
              <span>Mandi Marketplace</span>
              <span class="badge-count" style="background:#2563eb">Active</span>
            </button>
            <button class="nav-link ${currentView === 'queue' ? 'active' : ''}" data-view="queue">
              <i>⏱️</i>
              <span>Gate & Inward Status</span>
            </button>
            <button class="nav-link ${currentView === 'centre' ? 'active' : ''}" data-view="centre">
              <i>🏢</i>
              <span>Centre Weighbridge</span>
            </button>
          </nav>
        ` : ''}

        <!-- Common Quick Notification Link -->
        <div class="sidebar-section-title" style="margin-top:14px">Quick Center</div>
        <nav class="sidebar-nav">
          <button id="sidebar-notif-btn" class="nav-link" data-view="notifications">
            <i>🔔</i>
            <span>Alerts & Notifications</span>
          </button>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="support-card">
          <b>🌾 Mandi Helpline</b>
          <span>Toll-Free Govt. APMC Support</span>
          <span class="support-phone">📞 1800-180-1551</span>
        </div>
      </div>
    </aside>
  `;
}
