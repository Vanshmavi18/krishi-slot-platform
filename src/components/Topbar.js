// src/components/Topbar.js

export function renderTopbar({ user, language, t, unreadSmsCount = 0, unreadNotifCount = 0 }) {
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
          <span class="topbar-brand-text">KrishiSlot</span>
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

        <!-- 3-Role Fast Switcher -->
        <select id="quick-role-switch" class="btn-outline role-select-dropdown" aria-label="Switch User Role">
          <option value="farmer" ${currentRole === 'farmer' ? 'selected' : ''}>🌾 Ramesh (Farmer)</option>
          <option value="admin" ${currentRole === 'admin' || currentRole === 'officer' ? 'selected' : ''}>🛡️ Dr. Alok (Admin)</option>
          <option value="buyer" ${currentRole === 'buyer' ? 'selected' : ''}>🛒 Vikram (Buyer)</option>
        </select>

        <!-- Notification Bell -->
        <button id="btn-topbar-notif" class="icon-btn notif-bell-btn" title="Open Notifications" aria-label="Notifications">
          <span>🔔</span>
          ${unreadNotifCount > 0 ? `<span class="icon-badge notif-badge">${unreadNotifCount}</span>` : ''}
        </button>

        <!-- SMS Alert Mobile Hub -->
        <button id="btn-topbar-sms" class="icon-btn" title="Open Mandi SMS Hub" aria-label="Mandi SMS Alerts">
          <span>📱</span>
          ${unreadSmsCount > 0 ? `<span class="icon-badge"></span>` : ''}
        </button>

        <!-- User Profile Pill -->
        <div class="user-pill-container" title="${user?.email || user?.name || 'User'}">
          <div class="user-avatar">${avatarIcon}</div>
          <div class="user-info-text">
            <b class="user-name">${user?.name || 'Ramesh Kumar'}</b>
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
