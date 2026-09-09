// src/components/NotificationCenter.js

export class NotificationCenter {
  constructor({ api, onNavigate, onUpdate }) {
    this.api = api;
    this.onNavigate = onNavigate;
    this.onUpdate = onUpdate;
    this.isOpen = false;
    this.activeFilter = 'all'; // 'all' | 'unread' | 'slots' | 'payments' | 'orders' | 'alerts'
    this.notifications = [];
    this.unreadCount = 0;
  }

  setNotifications(list = [], unreadCount = 0) {
    this.notifications = list;
    this.unreadCount = unreadCount;
    if (this.isOpen) {
      this.render();
    }
  }

  toggle(force = null) {
    this.isOpen = force !== null ? force : !this.isOpen;
    this.render();
  }

  close() {
    this.isOpen = false;
    const container = document.getElementById('notification-center-root');
    if (container) container.innerHTML = '';
  }

  formatTime(isoString) {
    if (!isoString) return 'Recent';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay === 1) return 'Yesterday';
      return `${diffDay}d ago`;
    } catch {
      return 'Recent';
    }
  }

  getCategoryIcon(category, type) {
    switch (category) {
      case 'slots':
        return '📅';
      case 'payments':
        return '💰';
      case 'orders':
        return '🛒';
      case 'marketplace':
        return '🌾';
      case 'alerts':
      default:
        return '🔔';
    }
  }

  getFilteredNotifications() {
    if (this.activeFilter === 'unread') {
      return this.notifications.filter(n => !n.read);
    }
    if (this.activeFilter === 'slots') {
      return this.notifications.filter(n => n.category === 'slots' || n.type?.includes('SLOT'));
    }
    if (this.activeFilter === 'payments') {
      return this.notifications.filter(n => n.category === 'payments' || n.type?.includes('PAYMENT'));
    }
    if (this.activeFilter === 'orders') {
      return this.notifications.filter(n => n.category === 'orders' || n.category === 'marketplace');
    }
    if (this.activeFilter === 'alerts') {
      return this.notifications.filter(n => n.category === 'alerts' || n.type?.includes('ALERT'));
    }
    return this.notifications;
  }

  async handleMarkRead(id, link) {
    try {
      await this.api.markNotificationRead(id);
      const item = this.notifications.find(n => n.id === id);
      if (item) item.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      if (this.onUpdate) this.onUpdate(this.notifications, this.unreadCount);
      this.render();

      if (link && this.onNavigate) {
        this.close();
        this.onNavigate(link);
      }
    } catch (e) {
      console.warn('Failed to mark read:', e);
    }
  }

  async handleMarkAllRead(userId, role) {
    try {
      await this.api.markAllNotificationsRead(userId, role);
      this.notifications.forEach(n => { n.read = true; });
      this.unreadCount = 0;
      if (this.onUpdate) this.onUpdate(this.notifications, 0);
      this.render();
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  }

  async handleClear(userId, role) {
    try {
      await this.api.clearNotifications(userId, role);
      this.notifications = this.notifications.filter(n => !n.read);
      if (this.onUpdate) this.onUpdate(this.notifications, this.unreadCount);
      this.render();
    } catch (e) {
      console.warn('Failed to clear notifications:', e);
    }
  }

  render() {
    let container = document.getElementById('notification-center-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-center-root';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

    const filtered = this.getFilteredNotifications();
    const currentUser = this.api.currentUser;

    container.innerHTML = `
      <div id="notif-backdrop" class="notif-backdrop"></div>
      <aside class="notif-panel" role="dialog" aria-label="Notifications Center">
        <!-- Panel Header -->
        <div class="notif-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🔔</span>
            <strong style="font-size:17px;color:#0f2e1b">Notifications</strong>
            ${this.unreadCount > 0 ? `<span class="notif-unread-pill">${this.unreadCount} new</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <button id="btn-mark-all-read" class="btn-text-action" title="Mark all as read">
              ✓✓ Mark all read
            </button>
            <button id="btn-close-notif" class="modal-close-btn" style="position:static;width:30px;height:30px;font-size:14px">
              ✕
            </button>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="notif-filter-bar">
          <button class="notif-chip ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">
            All (${this.notifications.length})
          </button>
          <button class="notif-chip ${this.activeFilter === 'unread' ? 'active' : ''}" data-filter="unread">
            Unread (${this.unreadCount})
          </button>
          <button class="notif-chip ${this.activeFilter === 'slots' ? 'active' : ''}" data-filter="slots">
            📅 Slots
          </button>
          <button class="notif-chip ${this.activeFilter === 'payments' ? 'active' : ''}" data-filter="payments">
            💰 Payments
          </button>
          <button class="notif-chip ${this.activeFilter === 'orders' ? 'active' : ''}" data-filter="orders">
            🛒 Orders
          </button>
          <button class="notif-chip ${this.activeFilter === 'alerts' ? 'active' : ''}" data-filter="alerts">
            ⚠️ Alerts
          </button>
        </div>

        <!-- Notification List -->
        <div class="notif-list">
          ${filtered.length === 0 ? `
            <div class="notif-empty">
              <div style="font-size:42px;margin-bottom:12px">✨</div>
              <strong style="color:#374151">All caught up!</strong>
              <p style="font-size:13px;color:#9ca3af;margin-top:4px">No notifications in this category right now.</p>
            </div>
          ` : `
            ${filtered.map(item => `
              <div class="notif-card ${item.read ? 'read' : 'unread'}" data-id="${item.id}" data-link="${item.link || ''}">
                <div class="notif-icon-box ${item.category || 'alerts'}">
                  ${this.getCategoryIcon(item.category, item.type)}
                </div>
                <div class="notif-body">
                  <div class="notif-card-header">
                    <span class="notif-title">${item.title}</span>
                    <span class="notif-time">${this.formatTime(item.timestamp)}</span>
                  </div>
                  <p class="notif-message">${item.message}</p>
                  ${item.link ? `
                    <div class="notif-action-link">
                      View details →
                    </div>
                  ` : ''}
                </div>
                ${!item.read ? `<span class="notif-dot" title="Unread"></span>` : ''}
              </div>
            `).join('')}
          `}
        </div>

        <!-- Panel Footer -->
        <div class="notif-footer">
          <button id="btn-clear-read" class="btn-text-action" style="color:#6b7280;font-size:12px">
            🗑️ Clear read alerts
          </button>
          <span style="font-size:11px;color:#9ca3af">Real-time Mandi Sync Active</span>
        </div>
      </aside>
    `;

    // Bind events
    document.getElementById('notif-backdrop')?.addEventListener('click', () => this.close());
    document.getElementById('btn-close-notif')?.addEventListener('click', () => this.close());

    document.querySelectorAll('.notif-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeFilter = chip.getAttribute('data-filter');
        this.render();
      });
    });

    document.querySelectorAll('.notif-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        const link = card.getAttribute('data-link');
        this.handleMarkRead(id, link);
      });
    });

    document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
      this.handleMarkAllRead(currentUser?.id, currentUser?.role);
    });

    document.getElementById('btn-clear-read')?.addEventListener('click', () => {
      this.handleClear(currentUser?.id, currentUser?.role);
    });
  }
}
