// src/api.js

class ApiService {
  constructor() {
    this.token = localStorage.getItem('krishi_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('krishi_user') || 'null');
    this.sseSource = null;
    this.listeners = {
      queue: [],
      sms: [],
      notification: []
    };
    this.initAudio();
  }

  initAudio() {
    // Simple synthesized notification chime using Web Audio API
    this.playChime = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        // Audio might require user interaction first
      }
    };
  }

  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    if (token) {
      localStorage.setItem('krishi_token', token);
      localStorage.setItem('krishi_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('krishi_token');
      localStorage.removeItem('krishi_user');
    }
  }

  async fetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Network error occurred');
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${url}:`, err);
      throw err;
    }
  }

  // Real-time SSE Connection
  connectSSE() {
    if (this.sseSource) return;

    try {
      this.sseSource = new EventSource('/api/queue/stream');

      this.sseSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'QUEUE_UPDATE') {
            this.listeners.queue.forEach(fn => fn(parsed.payload));
          } else if (parsed.type === 'SMS_NOTIFICATION') {
            this.playChime();
            this.listeners.sms.forEach(fn => fn(parsed.payload));
          } else if (parsed.type === 'NOTIFICATION_NEW') {
            this.playChime();
            this.listeners.notification.forEach(fn => fn(parsed.payload));
          }
        } catch (e) {
          console.warn('Error parsing SSE event:', e);
        }
      };

      this.sseSource.onerror = () => {
        // Retry connection automatically
      };
    } catch (e) {
      console.warn('SSE not supported or failed to connect:', e);
    }
  }

  onQueueUpdate(fn) {
    this.listeners.queue.push(fn);
  }

  onSmsReceived(fn) {
    this.listeners.sms.push(fn);
  }

  onNotificationReceived(fn) {
    this.listeners.notification.push(fn);
  }

  // --- EMAIL AUTHENTICATION ---
  async sendEmailOtp(email) {
    return this.fetch('/api/auth/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async verifyEmailOtp(email, otp, savePassword = null) {
    const data = await this.fetch('/api/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, savePassword })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async loginWithEmailPassword(email, password) {
    const data = await this.fetch('/api/auth/login-email-password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async checkEmail(email) {
    return this.fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
  }

  async saveEmailPassword(email, password) {
    return this.fetch('/api/auth/save-email-password', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async getEmailStatus() {
    return this.fetch('/api/auth/email-status');
  }

  // --- LEGACY ADAPTERS (FOR BACKWARD COMPATIBILITY) ---
  async sendOtp(phoneOrEmail) {
    return this.fetch('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ [String(phoneOrEmail).includes('@') ? 'email' : 'phone']: phoneOrEmail })
    });
  }

  async verifyOtp(phoneOrEmail, otp, savePassword = null) {
    const isEmail = String(phoneOrEmail).includes('@');
    const data = await this.fetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ [isEmail ? 'email' : 'phone']: phoneOrEmail, otp, savePassword })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async loginWithMobilePassword(phoneOrEmail, password) {
    const isEmail = String(phoneOrEmail).includes('@');
    const data = await this.fetch('/api/auth/login-mobile-password', {
      method: 'POST',
      body: JSON.stringify({ [isEmail ? 'email' : 'phone']: phoneOrEmail, password })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  // Saved credentials persistence in localStorage
  getSavedCredential(role = 'farmer') {
    try {
      const raw = localStorage.getItem(`krishi_saved_cred_${role}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setSavedCredential(role, creds) {
    try {
      if (creds) {
        localStorage.setItem(`krishi_saved_cred_${role}`, JSON.stringify(creds));
      } else {
        localStorage.removeItem(`krishi_saved_cred_${role}`);
      }
    } catch (e) {
      console.warn('Could not persist credentials:', e);
    }
  }

  async loginStaff(staffId, password) {
    const data = await this.fetch('/api/auth/login-staff', {
      method: 'POST',
      body: JSON.stringify({ staffId, password })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async loginBuyer(identifier, password) {
    const data = await this.fetch('/api/auth/login-buyer', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async quickSwitch(role, id = null) {
    const data = await this.fetch('/api/auth/quick-switch', {
      method: 'POST',
      body: JSON.stringify({ role, id })
    });
    this.setSession(data.token, data.user);
    return data;
  }

  // Notifications
  async getNotifications(userId, role) {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (role) params.append('role', role);
    return this.fetch(`/api/notifications?${params.toString()}`);
  }

  async markNotificationRead(id) {
    return this.fetch(`/api/notifications/${id}/read`, {
      method: 'POST'
    });
  }

  async markAllNotificationsRead(userId, role) {
    return this.fetch('/api/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    });
  }

  async clearNotifications(userId, role) {
    return this.fetch('/api/notifications/clear', {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    });
  }

  // Buyer Marketplace & Orders
  async getBuyerMarketplace() {
    return this.fetch('/api/buyer/marketplace');
  }

  async getBuyerOrders(buyerId) {
    return this.fetch(`/api/buyer/orders?buyerId=${buyerId || ''}`);
  }

  async placeBuyerOrder(payload) {
    return this.fetch('/api/buyer/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Slots
  async getCentres() {
    return this.fetch('/api/slots/centres');
  }

  async getCrops() {
    return this.fetch('/api/slots/crops');
  }

  async getAvailability(centreId, date) {
    return this.fetch(`/api/slots/availability?centreId=${centreId}&date=${date}`);
  }

  async bookSlot(payload) {
    return this.fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Farmer Slot Booking Endpoints
  async createBooking(payload) {
    return this.fetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getMyBookings(farmerId) {
    try {
      const res = await this.fetch('/api/bookings/my');
      return res;
    } catch (err) {
      // Fallback to legacy endpoint if token is unauthenticated
      return this.fetch(`/api/slots/my-bookings?farmerId=${farmerId || ''}`);
    }
  }

  async getAvailableBookings() {
    return this.fetch('/api/bookings/available');
  }

  async getBookingDetails(bookingId) {
    return this.fetch(`/api/bookings/${bookingId}`);
  }

  async getAdminBookings() {
    return this.fetch('/api/bookings/admin');
  }

  async updateBookingStatus(bookingId, status, notes = '') {
    return this.fetch(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
  }

  async requestBuySlot(bookingId, payload = {}) {
    return this.fetch(`/api/bookings/${bookingId}/buy-request`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async cancelBooking(bookingId, reason = '') {
    return this.fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason })
    });
  }

  // Queue
  async getQueueStatus(centreId, token) {
    return this.fetch(`/api/queue/status?centreId=${centreId || ''}&token=${token || ''}`);
  }

  async advanceQueue(counterId = 2) {
    return this.fetch('/api/queue/advance', {
      method: 'POST',
      body: JSON.stringify({ counterId })
    });
  }

  async broadcastDelay(reason, delayMins) {
    return this.fetch('/api/queue/broadcast-delay', {
      method: 'POST',
      body: JSON.stringify({ reason, delayMins })
    });
  }

  // Procurements
  async getProcurements(farmerId) {
    return this.fetch(`/api/procurements?farmerId=${farmerId || ''}`);
  }

  async getProcurementStats(farmerId) {
    return this.fetch(`/api/procurements/stats?farmerId=${farmerId || ''}`);
  }

  async createProcurement(payload) {
    return this.fetch('/api/procurements/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async approvePayment(receiptId) {
    return this.fetch(`/api/procurements/${receiptId}/approve-payment`, {
      method: 'POST'
    });
  }

  // SMS
  async getSmsLogs(phone) {
    return this.fetch(`/api/sms/logs?phone=${phone || ''}`);
  }
}

export const api = new ApiService();
