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
        <span class="pulse-dot"></span>
        <div class="topbar-greeting">
          <span>🏛️ APMC Mandi Network</span>
          <strong>Jaitpur Centre • Uttar Pradesh</strong>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Language Switcher -->
        <button id="btn-toggle-lang" class="lang-toggle">
          🌐 ${language === 'en' ? 'हिन्दी (Hindi)' : 'English'}
        </button>

        <!-- 3-Role Fast Switcher -->
        <select id="quick-role-switch" class="btn-outline role-select-dropdown" style="padding:6px 12px;font-weight:700">
          <option value="farmer" ${currentRole === 'farmer' ? 'selected' : ''}>🌾 Farmer: Ramesh Kumar</option>
          <option value="admin" ${currentRole === 'admin' || currentRole === 'officer' ? 'selected' : ''}>🛡️ Admin: Dr. Alok Nath</option>
          <option value="buyer" ${currentRole === 'buyer' ? 'selected' : ''}>🛒 Buyer: Vikram Singhania</option>
        </select>

        <!-- Notification Bell (NEW!) -->
        <button id="btn-topbar-notif" class="icon-btn notif-bell-btn" title="Open Notifications Center" aria-label="Notifications">
          <span>🔔</span>
          ${unreadNotifCount > 0 ? `<span class="icon-badge notif-badge">${unreadNotifCount}</span>` : ''}
        </button>

        <!-- SMS Alert Mobile Hub -->
        <button id="btn-topbar-sms" class="icon-btn" title="Open Mobile SMS Hub">
          <span>📱</span>
          ${unreadSmsCount > 0 ? `<span class="icon-badge"></span>` : ''}
        </button>

        <!-- User Profile Pill -->
        <div class="user-pill-container" style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar">${avatarIcon}</div>
          <div style="font-size:13px;line-height:1.2">
            <b>${user?.name || 'Ramesh Kumar'}</b>
            <div class="role-badge ${currentRole}" style="padding:2px 8px;font-size:10px;margin-top:2px">
              ${roleLabel}
            </div>
          </div>
        </div>

        <button id="btn-logout" class="btn-outline btn-sm" style="color:#b91c1c;border-color:#fca5a5">
          ${t.nav.logout}
        </button>
      </div>
    </header>
  `;
}
