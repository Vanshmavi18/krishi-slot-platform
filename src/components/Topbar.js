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

        <!-- Active Portal / Role Switcher -->
        <div class="topbar-role-container" style="display:flex;align-items:center">
          <select 
            id="topbar-role-switch" 
            class="role-select-dropdown" 
            aria-label="Switch Active Portal" 
            title="Switch between Farmer, Buyer and Admin Portals"
            style="padding:6px 12px;border-radius:20px;background:#ffffff;border:1.5px solid #059669;color:#064e3b;font-size:12px;font-weight:800;cursor:pointer;outline:none;box-shadow:0 2px 6px rgba(0,0,0,0.06)"
          >
            <option value="farmer" ${currentRole === 'farmer' ? 'selected' : ''}>👨‍🌾 Farmer Portal</option>
            <option value="buyer" ${currentRole === 'buyer' ? 'selected' : ''}>🏢 Buyer Portal</option>
            <option value="admin" ${currentRole === 'admin' || currentRole === 'officer' ? 'selected' : ''}>🏛️ Mandi Admin</option>
          </select>
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
