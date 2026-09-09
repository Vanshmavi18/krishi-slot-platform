// src/components/VirtualPhone.js

export class VirtualPhone {
  constructor(api, onSmsAction) {
    this.api = api;
    this.onSmsAction = onSmsAction;
    this.isOpen = false;
    this.smsList = [];
    this.unreadCount = 0;
    this.init();
  }

  async init() {
    // Fetch existing SMS logs
    try {
      const data = await this.api.getSmsLogs();
      if (data && data.logs) {
        this.smsList = data.logs;
      }
    } catch (e) {
      console.warn('Could not load initial SMS logs:', e);
    }

    // Register live SSE listener
    this.api.onSmsReceived((sms) => {
      this.smsList.unshift(sms);
      if (!this.isOpen) {
        this.unreadCount++;
      }
      this.render();
      // If phone is closed, open briefly to show incoming message!
      if (!this.isOpen) {
        this.toggle(true);
      }
    });

    this.render();
  }

  toggle(forceState = null) {
    this.isOpen = forceState !== null ? forceState : !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
    }
    this.render();
  }

  formatTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  }

  render() {
    let container = document.getElementById('virtual-phone-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'virtual-phone-root';
      container.className = 'virtual-phone-widget';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = `
        <button id="btn-open-phone" class="phone-toggle-button">
          <span>📱 Farmer Virtual Phone (SMS Hub)</span>
          ${this.unreadCount > 0 ? `<span class="phone-toggle-badge">${this.unreadCount} New</span>` : ''}
        </button>
      `;
      document.getElementById('btn-open-phone')?.addEventListener('click', () => this.toggle(true));
      return;
    }

    container.innerHTML = `
      <div class="phone-screen-container">
        <div class="phone-notch"></div>
        <div class="phone-status-bar">
          <span>9:41 AM</span>
          <span>📶 5G • 🔋 98%</span>
        </div>
        <div class="phone-app-header">
          <div>
            <b>Messages (एसएमएस)</b>
            <div style="font-size:10px;color:#15803d;font-weight:700">● Live Telecom Gateway</div>
          </div>
          <button id="btn-close-phone" style="border:none;background:transparent;font-size:18px;cursor:pointer;color:#6b7280">✕</button>
        </div>
        <div class="phone-sms-list" id="phone-sms-items">
          ${this.smsList.length === 0 ? `
            <div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:13px">
              No SMS messages yet.<br>Book a slot or advance the queue to see live SMS arrive!
            </div>
          ` : this.smsList.map(sms => `
            <div class="phone-bubble">
              <div class="phone-bubble-header">
                <span>VK-KRISHI (Govt. of India)</span>
                <span>${sms.type || 'ALERT'}</span>
              </div>
              <div>${sms.message}</div>
              <time>${this.formatTime(sms.timestamp)} • Delivered ✓</time>
            </div>
          `).join('')}
        </div>
        <div style="padding:10px;background:#f3f4f6;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#6b7280">
          Simulated Farmer Mobile Device (DLT Compliant)
        </div>
      </div>
    `;

    document.getElementById('btn-close-phone')?.addEventListener('click', () => this.toggle(false));
  }
}
