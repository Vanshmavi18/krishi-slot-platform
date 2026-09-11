// src/components/Topbar.js

export function renderTopbar({ user, language, t, unreadNotifCount = 0 }) {
  const currentRole = (user?.role || 'farmer').toLowerCase();
  
  let roleLabel = 'Farmer (Seller)';
  let avatarIcon = '👨‍🌾';
  if (currentRole === 'admin' || currentRole === 'officer') {
    roleLabel = 'APMC Admin';
    avatarIcon = '🏛️';
  } else if (currentRole === 'buyer') {
    roleLabel = 'Commercial Buyer';
    avatarIcon = '🛒';
  }

  return `
    <header class="app-topbar">
      <div class="topbar-left">
        <!-- Mobile Drawer Hamburger Button -->
        <button id="btn-mobile-menu" class="mobile-hamburger-btn" aria-label="Toggle navigation menu">
          <span>☰</span>
        </button>

        <div class="topbar-brand-mobile">
          <span class="topbar-brand-icon">🌱</span>
          <span class="topbar-brand-text">AgriQueue</span>
        </div>

        <div class="topbar-greeting">
          <span class="pulse-dot"></span>
          <div class="topbar-greeting-text">
            <span class="mandi-network-title">🏛️ APMC Mandi Network</span>
            <strong>Jaitpur Centre • Uttar Pradesh</strong>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Language Switcher -->
        <button id="btn-toggle-lang" class="lang-toggle" title="Switch Language">
          🌐 <span class="lang-text">${language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        <!-- Active Role Badge -->
        <div class="user-role-badge" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;font-size:12px;font-weight:700;color:#334155">
          <span>${avatarIcon}</span>
          <span>${roleLabel}</span>
        </div>

        <!-- Notification Bell -->
        <button id="btn-topbar-notif" class="icon-btn notif-bell-btn" title="Open Notifications" aria-label="Notifications">
          <span>🔔</span>
          ${unreadNotifCount > 0 ? `<span class="icon-badge notif-badge">${unreadNotifCount}</span>` : ''}
        </button>

        <!-- User Profile Pill -->
        <div class="user-pill-container" title="${user?.email || user?.name || 'User'}">
          <div class="user-avatar">${avatarIcon}</div>
          <div class="user-info-text">
            <b class="user-name">${user?.name || user?.username || 'User'}</b>
            <div class="role-badge ${currentRole}">
              ${roleLabel}
            </div>
          </div>
        </div>

        <!-- Logout Button -->
        <button id="btn-logout" class="btn-outline btn-sm btn-logout" title="Log Out">
          <span>🚪</span>
          <span class="logout-text">${t.nav.logout}</span>
        </button>
      </div>
    </header>
  `;
}
