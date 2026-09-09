// src/main.js
import './styles.css';
import { api } from './api.js';
import { translations } from './i18n.js';
import { renderLandingPage } from './components/LandingPage.js';
import { renderTopbar } from './components/Topbar.js';
import { renderSidebar } from './components/Sidebar.js';
import { renderFarmerDashboard } from './components/FarmerDashboard.js';
import { renderSlotBooking } from './components/SlotBooking.js';
import { renderLiveQueue } from './components/LiveQueue.js';
import { renderProcurements } from './components/Procurements.js';
import { renderCentreOperations } from './components/CentreOperations.js';
import { renderBuyerDashboard } from './components/BuyerDashboard.js';
import { NotificationCenter } from './components/NotificationCenter.js';
import { VirtualPhone } from './components/VirtualPhone.js';
import { AuthModal } from './components/AuthModal.js';
import { ReceiptModal } from './components/ReceiptModal.js';

class KrishiSlotApp {
  constructor() {
    this.user = api.currentUser || null;
    
    // Set initial view based on role
    if (!this.user) {
      this.currentView = 'landing';
    } else {
      const initialRole = (this.user?.role || 'farmer').toLowerCase();
      if (initialRole === 'buyer') {
        this.currentView = 'buyer';
      } else if (initialRole === 'admin' || initialRole === 'officer') {
        this.currentView = 'centre';
      } else {
        this.currentView = 'dashboard';
      }
    }

    this.language = localStorage.getItem('krishi_lang') || 'en';

    this.bookingState = {
      centreId: 'CTR-UP-01',
      cropId: 'paddy_comm',
      quantity: 42,
      vehicle: 'Tractor Trolley',
      date: '2026-09-12',
      timeSlot: '10:30 – 11:00 AM'
    };

    this.centres = [];
    this.crops = [];
    this.availableSlots = [];
    this.myBookings = [];
    this.procurements = [];
    this.stats = null;
    this.queueStatus = null;
    this.centreTokens = [];

    // Buyer state
    this.buyerLots = [];
    this.buyerOrders = [];
    this.activeBiddingLot = null;

    // Notifications state
    this.notifications = [];
    this.unreadNotifCount = 0;

    this.virtualPhone = null;
    this.authModal = null;
    this.receiptModal = null;
    this.notificationCenter = null;
  }

  async init() {
    // Initialize Modals, Notification Center & Virtual Phone
    this.virtualPhone = new VirtualPhone(api, () => {});
    
    this.notificationCenter = new NotificationCenter({
      api,
      onNavigate: (view) => {
        this.currentView = view;
        this.render();
      },
      onUpdate: (list, unread) => {
        this.notifications = list;
        this.unreadNotifCount = unread;
        this.updateTopbarBadges();
      }
    });

    this.authModal = new AuthModal(api, (user) => {
      this.user = user;
      const role = (user.role || 'farmer').toLowerCase();
      if (role === 'buyer') {
        this.currentView = 'buyer';
      } else if (role === 'admin' || role === 'officer') {
        this.currentView = 'centre';
      } else {
        this.currentView = 'dashboard';
      }
      this.showToast(`Namaste ${user.name}! Logged in successfully.`);
      this.refreshData().then(() => this.render());
    });

    this.receiptModal = new ReceiptModal();

    // Connect real-time Server-Sent Events stream
    api.connectSSE();

    api.onQueueUpdate((data) => {
      this.queueStatus = data;
      this.showToast(`🔔 Queue update: Token #${data.nowServingToken} called at Counter ${data.counter}`);
      if (this.currentView === 'queue' || this.currentView === 'dashboard' || this.currentView === 'centre') {
        this.render();
      }
    });

    api.onSmsReceived((sms) => {
      this.showToast(`📩 New SMS: ${sms.message.slice(0, 50)}...`);
    });

    api.onNotificationReceived((notif) => {
      // Check if notification is for this user or role
      const currentUserRole = (this.user?.role || 'farmer').toLowerCase();
      const matchesUser = !notif.userId || notif.userId === this.user?.id;
      const matchesRole = notif.role === 'all' || notif.role === currentUserRole;

      if (matchesUser || matchesRole) {
        this.notifications.unshift(notif);
        this.unreadNotifCount++;
        this.notificationCenter.setNotifications(this.notifications, this.unreadNotifCount);
        this.updateTopbarBadges();
        this.showToast(`🔔 ${notif.title}: ${notif.message}`);
      }
    });

    await this.refreshData();
    this.render();
  }

  async refreshData() {
    try {
      const [centresRes, cropsRes] = await Promise.all([
        api.getCentres(),
        api.getCrops()
      ]);
      this.centres = centresRes.centres || [];
      this.crops = cropsRes.crops || [];

      // Fetch slot availability
      const slotsRes = await api.getAvailability(this.bookingState.centreId, this.bookingState.date);
      this.availableSlots = slotsRes.slots || [];

      // Fetch queue
      const queueRes = await api.getQueueStatus(this.bookingState.centreId);
      this.queueStatus = queueRes.queue;

      // Fetch farmer procurements, stats & bookings
      if (this.user) {
        const [procRes, statsRes, bookingsRes] = await Promise.all([
          api.getProcurements(this.user.id),
          api.getProcurementStats(this.user.id),
          api.getMyBookings(this.user.id)
        ]);
        this.procurements = procRes.procurements || [];
        this.stats = statsRes.stats;
        this.myBookings = bookingsRes.bookings || [];

        // Fetch notifications
        const notifRes = await api.getNotifications(this.user.id, this.user.role);
        if (notifRes.success) {
          this.notifications = notifRes.notifications || [];
          this.unreadNotifCount = notifRes.unreadCount || 0;
          this.notificationCenter.setNotifications(this.notifications, this.unreadNotifCount);
        }
      } else {
        this.procurements = [];
        this.stats = null;
        this.myBookings = [];
      }

      // Fetch centre tokens
      const centreTokensRes = await api.fetch('/api/centre/tokens');
      this.centreTokens = centreTokensRes.tokens || [];

      // Fetch Buyer marketplace lots and orders
      const [marketRes, ordersRes] = await Promise.all([
        api.getBuyerMarketplace(),
        api.getBuyerOrders(this.user?.id)
      ]);
      this.buyerLots = marketRes.lots || [];
      this.buyerOrders = ordersRes.orders || [];

    } catch (err) {
      console.warn('Data refresh failed:', err);
    }
  }

  t() {
    return translations[this.language] || translations.en;
  }

  toggleLanguage() {
    this.language = this.language === 'en' ? 'hi' : 'en';
    localStorage.setItem('krishi_lang', this.language);
    this.render();
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = `<span>📢</span> <span>${msg}</span>`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  updateTopbarBadges() {
    const bellBtn = document.getElementById('btn-topbar-notif');
    if (!bellBtn) return;
    const existingBadge = bellBtn.querySelector('.notif-badge');
    if (this.unreadNotifCount > 0) {
      if (existingBadge) {
        existingBadge.innerText = this.unreadNotifCount;
      } else {
        const span = document.createElement('span');
        span.className = 'icon-badge notif-badge';
        span.innerText = this.unreadNotifCount;
        bellBtn.appendChild(span);
      }
    } else if (existingBadge) {
      existingBadge.remove();
    }
  }

  async switchRole(role, id = null) {
    try {
      const res = await api.quickSwitch(role, id);
      this.user = res.user;
      const lower = role.toLowerCase();
      if (lower === 'buyer') {
        this.currentView = 'buyer';
      } else if (lower === 'admin' || lower === 'officer') {
        this.currentView = 'centre';
      } else {
        this.currentView = 'dashboard';
      }
      this.showToast(`Switched active role to: ${this.user.name} (${this.user.role})`);
      await this.refreshData();
      this.render();
    } catch (err) {
      this.showToast(`Error switching role: ${err.message}`);
    }
  }

  async handleSlotBooking() {
    try {
      const res = await api.bookSlot({
        farmerId: this.user?.id || 'FRM-UP-26032',
        farmerName: this.user?.name || 'Ramesh Kumar',
        farmerPhone: this.user?.phone || '9876543210',
        farmerEmail: this.user?.email || null,
        centreId: this.bookingState.centreId,
        cropId: this.bookingState.cropId,
        quantity: Number(this.bookingState.quantity) || 42,
        vehicle: this.bookingState.vehicle,
        date: this.bookingState.date,
        timeSlot: this.bookingState.timeSlot
      });

      this.showToast(`🎉 Slot Confirmed! Gate Token #${res.booking.token} dispatched via SMS & Email!`);
      await this.refreshData();
      this.currentView = 'dashboard';
      this.render();
    } catch (err) {
      this.showToast(`⚠️ Booking failed: ${err.message}`);
    }
  }

  async handleAdvanceQueue() {
    try {
      const res = await api.advanceQueue(2);
      this.queueStatus = res.queue;
      this.showToast(`Called Token #${res.token}. Proximity SMS & alert dispatched to upcoming farmers!`);
      this.render();
    } catch (err) {
      this.showToast(`Error advancing queue: ${err.message}`);
    }
  }

  async handleWeighmentSubmission() {
    const token = document.getElementById('weigh-token-input')?.value;
    const cropId = document.getElementById('weigh-crop-select')?.value;
    const gross = document.getElementById('weigh-gross-input')?.value;
    const tare = document.getElementById('weigh-tare-input')?.value;
    const moisture = document.getElementById('weigh-moisture-input')?.value;

    try {
      const res = await api.createProcurement({
        token: token ? token.trim() : null,
        farmerId: this.user?.id || 'FRM-UP-26032',
        bookingId: null,
        cropId,
        grossWeight: gross,
        tareWeight: tare,
        moisturePercent: moisture,
        centreId: this.bookingState.centreId,
        officerName: this.user?.name || 'V. K. Verma'
      });

      this.showToast(`⚖️ Weighment Recorded & Official J-Form #${res.procurement.id} Issued! SMS & Email sent.`);
      await this.refreshData();
      this.receiptModal.open(res.procurement);
      this.render();
    } catch (err) {
      this.showToast(`Weighment error: ${err.message}`);
    }
  }

  async handleApprovePayment(receiptId) {
    try {
      const res = await api.approvePayment(receiptId);
      this.showToast(`💰 DBT Payment for J-Form #${receiptId} Cleared! UTR: ${res.procurement.utr}`);
      await this.refreshData();
      this.render();
    } catch (err) {
      this.showToast(`DBT approval error: ${err.message}`);
    }
  }

  async handleBuyerPlaceBid() {
    if (!this.activeBiddingLot) return;
    const qtyInput = document.getElementById('bid-qty-input');
    const rateInput = document.getElementById('bid-rate-input');
    const qty = Number(qtyInput?.value) || 50;
    const rate = Number(rateInput?.value) || 2350;

    try {
      const res = await api.placeBuyerOrder({
        buyerId: this.user?.id || 'BUYER-01',
        buyerName: this.user?.name || 'Vikram Singhania',
        cropId: this.activeBiddingLot.cropId,
        cropName: this.activeBiddingLot.cropName,
        quantity: qty,
        offeredRate: rate,
        centreId: this.activeBiddingLot.centreId,
        farmerId: this.activeBiddingLot.farmerId,
        farmerName: this.activeBiddingLot.farmerName
      });

      document.getElementById('buyer-bid-modal')?.classList.add('hidden');
      this.showToast(`🤝 Purchase Order #${res.order.id} Confirmed! Gate pass #${res.order.gatePassId} generated.`);
      await this.refreshData();
      this.render();
    } catch (err) {
      this.showToast(`Order failed: ${err.message}`);
    }
  }

  openBidModal(lot) {
    this.activeBiddingLot = lot;
    const modal = document.getElementById('buyer-bid-modal');
    const summary = document.getElementById('bid-modal-lot-summary');
    const qtyInput = document.getElementById('bid-qty-input');
    const rateInput = document.getElementById('bid-rate-input');
    const calcTotal = document.getElementById('bid-calc-total');

    if (!modal) return;

    if (summary) {
      summary.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <b>${lot.cropName}</b>
          <span class="status-pill confirmed">Arrival Token #${lot.token || 'A-047'}</span>
        </div>
        <div style="color:#4b5563">
          Farmer: <b>${lot.farmerName}</b> • Centre: <b>${lot.centreName}</b>
        </div>
        <div style="color:#4b5563;margin-top:4px">
          Official Govt MSP: <b>₹${(lot.mspRate || 2300).toLocaleString('en-IN')}/qtl</b> • Arriving: <b>${lot.displayDate || lot.arrivalDate}</b>
        </div>
      `;
    }

    if (qtyInput) qtyInput.value = lot.quantity || 50;
    if (rateInput) rateInput.value = Math.max(lot.mspRate || 2300, 2350);

    const updateCalc = () => {
      const q = Number(qtyInput?.value) || 0;
      const r = Number(rateInput?.value) || 0;
      const tot = q * r;
      if (calcTotal) calcTotal.innerText = `₹${tot.toLocaleString('en-IN')}`;
    };

    qtyInput?.removeEventListener('input', updateCalc);
    rateInput?.removeEventListener('input', updateCalc);
    qtyInput?.addEventListener('input', updateCalc);
    rateInput?.addEventListener('input', updateCalc);
    updateCalc();

    modal.classList.remove('hidden');
  }

  openGatePassModal(order) {
    const modal = document.getElementById('buyer-pass-modal');
    const passIdEl = document.getElementById('pass-modal-id');
    const content = document.getElementById('pass-modal-content');

    if (!modal) return;
    if (passIdEl) passIdEl.innerText = `GATE PASS #${order.gatePassId || 'GP-2026-881'}`;

    if (content) {
      content.innerHTML = `
        <div style="background:#f8fafc;padding:12px;border-radius:10px;margin-bottom:12px;border:1px solid #e2e8f0">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Buyer Licensee:</span>
            <b>${this.user?.company || 'AgroCorp Foods Pvt Ltd'}</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Associated Contract:</span>
            <b>#${order.id}</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Crop & Volume:</span>
            <b>${order.cropName} (${order.quantity} qtl)</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Pickup Window:</span>
            <b>${order.pickupSlot || '11:00 AM – 01:00 PM'}</b>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#6b7280">Weighbridge Gate:</span>
            <b style="color:#15803d">Counter 3 (Outward Inward)</b>
          </div>
        </div>
      `;
    }

    modal.classList.remove('hidden');
  }

  bindEvents() {
    const t = this.t();

    // Landing Page events
    document.getElementById('landing-lang-toggle')?.addEventListener('click', () => this.toggleLanguage());
    document.getElementById('landing-btn-farmer')?.addEventListener('click', () => this.authModal.open('farmer'));
    document.getElementById('landing-btn-staff')?.addEventListener('click', () => this.authModal.open('admin'));
    document.getElementById('landing-btn-buyer')?.addEventListener('click', () => this.authModal.open('buyer'));
    document.getElementById('hero-btn-login')?.addEventListener('click', () => this.authModal.open('farmer'));
    document.getElementById('hero-btn-staff')?.addEventListener('click', () => this.authModal.open('admin'));
    document.getElementById('hero-btn-buyer')?.addEventListener('click', () => this.authModal.open('buyer'));
    document.getElementById('demo-farmer-pill')?.addEventListener('click', () => this.switchRole('farmer'));
    document.getElementById('demo-officer-pill')?.addEventListener('click', () => this.switchRole('admin'));
    document.getElementById('demo-buyer-pill')?.addEventListener('click', () => this.switchRole('buyer'));

    // Topbar events
    document.getElementById('btn-toggle-lang')?.addEventListener('click', () => this.toggleLanguage());
    document.getElementById('btn-topbar-sms')?.addEventListener('click', () => this.virtualPhone.toggle(true));
    document.getElementById('btn-topbar-notif')?.addEventListener('click', () => this.notificationCenter.toggle());
    document.getElementById('sidebar-notif-btn')?.addEventListener('click', () => this.notificationCenter.toggle(true));
    document.getElementById('quick-role-switch')?.addEventListener('change', (e) => this.switchRole(e.target.value));

    // Mobile Drawer Navigation Toggles
    const closeMobileDrawer = () => {
      document.getElementById('app-sidebar')?.classList.remove('mobile-open');
      document.getElementById('sidebar-backdrop')?.classList.remove('active');
    };

    document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
      document.getElementById('app-sidebar')?.classList.toggle('mobile-open');
      document.getElementById('sidebar-backdrop')?.classList.toggle('active');
    });

    document.getElementById('btn-close-sidebar')?.addEventListener('click', closeMobileDrawer);
    document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileDrawer);
    
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      api.setSession(null, null);
      this.user = null;
      this.currentView = 'landing';
      this.myBookings = [];
      this.procurements = [];
      this.stats = null;
      this.showToast('You have been logged out successfully.');
      this.render();
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileDrawer();
        const view = link.getAttribute('data-view');
        if (view === 'sms') {
          this.virtualPhone.toggle(true);
        } else if (view === 'notifications') {
          this.notificationCenter.toggle(true);
        } else if (view) {
          this.currentView = view;
          this.render();
        }
      });
    });

    // Mobile Bottom Navigation Bar
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        closeMobileDrawer();
        const view = btn.getAttribute('data-view');
        if (view === 'notifications') {
          this.notificationCenter.toggle(true);
        } else if (view) {
          this.currentView = view;
          this.render();
        }
      });
    });

    // Dashboard shortcuts
    document.getElementById('dash-hero-book-btn')?.addEventListener('click', () => {
      this.currentView = 'booking';
      this.render();
    });
    document.getElementById('dash-open-queue')?.addEventListener('click', () => {
      this.currentView = 'queue';
      this.render();
    });
    document.getElementById('dash-quick-book')?.addEventListener('click', () => {
      this.currentView = 'booking';
      this.render();
    });
    document.getElementById('dash-quick-queue')?.addEventListener('click', () => {
      this.currentView = 'queue';
      this.render();
    });
    document.getElementById('dash-quick-pay')?.addEventListener('click', () => {
      this.currentView = 'procurements';
      this.render();
    });
    document.getElementById('dash-quick-sms')?.addEventListener('click', () => {
      this.virtualPhone.toggle(true);
    });
    document.getElementById('dash-view-all-history')?.addEventListener('click', () => {
      this.currentView = 'procurements';
      this.render();
    });

    // Booking form controls
    document.getElementById('book-centre-select')?.addEventListener('change', async (e) => {
      this.bookingState.centreId = e.target.value;
      const slots = await api.getAvailability(this.bookingState.centreId, this.bookingState.date);
      this.availableSlots = slots.slots || [];
      this.render();
    });

    document.getElementById('book-crop-select')?.addEventListener('change', (e) => {
      this.bookingState.cropId = e.target.value;
      this.render();
    });

    document.getElementById('book-qty-input')?.addEventListener('input', (e) => {
      this.bookingState.quantity = e.target.value;
      this.render();
    });

    document.getElementById('book-vehicle-select')?.addEventListener('change', (e) => {
      this.bookingState.vehicle = e.target.value;
    });

    document.querySelectorAll('.date-choice').forEach(el => {
      el.addEventListener('click', async () => {
        this.bookingState.date = el.getAttribute('data-date');
        const slots = await api.getAvailability(this.bookingState.centreId, this.bookingState.date);
        this.availableSlots = slots.slots || [];
        this.render();
      });
    });

    document.querySelectorAll('.time-choice').forEach(el => {
      el.addEventListener('click', () => {
        this.bookingState.timeSlot = el.getAttribute('data-slot');
        this.render();
      });
    });

    document.getElementById('btn-confirm-slot-booking')?.addEventListener('click', () => {
      this.handleSlotBooking();
    });

    // Queue actions
    document.getElementById('btn-simulate-queue')?.addEventListener('click', () => {
      this.handleAdvanceQueue();
    });
    document.getElementById('btn-set-arrival-reminder')?.addEventListener('click', () => {
      this.showToast('✅ Proximity alert active! You will receive both SMS and in-app alert at 5 tokens away.');
      this.virtualPhone.toggle(true);
    });

    // Procurements actions
    document.querySelectorAll('.btn-view-slip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const record = this.procurements.find(p => p.id === id);
        if (record) {
          this.receiptModal.open(record);
        }
      });
    });

    document.querySelectorAll('.btn-approve-pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) {
          this.handleApprovePayment(id);
        }
      });
    });

    // Mandi Centre Officer Actions
    document.getElementById('btn-centre-advance')?.addEventListener('click', () => {
      this.handleAdvanceQueue();
    });

    document.getElementById('btn-open-delay-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('delay-broadcast-modal');
      if (modal) modal.classList.remove('hidden');
    });

    document.getElementById('btn-close-delay-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('delay-broadcast-modal');
      if (modal) modal.classList.add('hidden');
    });

    document.getElementById('btn-send-broadcast')?.addEventListener('click', async () => {
      const reason = document.getElementById('broadcast-reason')?.value;
      const delayMins = document.getElementById('broadcast-delay-mins')?.value;
      try {
        await api.broadcastDelay(reason, Number(delayMins) || 30);
        this.showToast('📢 Urgent weather/congestion delay broadcasted to all scheduled farmers & dashboard alerts!');
        document.getElementById('delay-broadcast-modal')?.classList.add('hidden');
      } catch (err) {
        this.showToast(`Broadcast failed: ${err.message}`);
      }
    });

    // Auto-calculation for weighment form
    const grossInp = document.getElementById('weigh-gross-input');
    const tareInp = document.getElementById('weigh-tare-input');
    const cropSel = document.getElementById('weigh-crop-select');

    const updateWeighCalc = () => {
      const g = parseFloat(grossInp?.value) || 0;
      const t = parseFloat(tareInp?.value) || 0;
      const net = Math.max(0, g - t);
      const selCrop = this.crops.find(c => c.id === cropSel?.value) || this.crops[0];
      const rate = selCrop ? selCrop.mspRate : 2300;
      const amt = Math.round(net * rate);

      const netEl = document.getElementById('calc-net-wt');
      const amtEl = document.getElementById('calc-net-amount');
      if (netEl) netEl.innerText = `${net.toFixed(1)} quintals`;
      if (amtEl) amtEl.innerText = `₹${amt.toLocaleString('en-IN')}`;
    };

    grossInp?.addEventListener('input', updateWeighCalc);
    tareInp?.addEventListener('input', updateWeighCalc);
    cropSel?.addEventListener('change', updateWeighCalc);

    document.getElementById('btn-submit-weighment')?.addEventListener('click', () => {
      this.handleWeighmentSubmission();
    });

    document.querySelectorAll('.btn-select-arrival, .arrival-row').forEach(el => {
      el.addEventListener('click', (e) => {
        const row = el.closest('.arrival-row') || el;
        const tok = row.getAttribute('data-token');
        const crop = row.getAttribute('data-crop');
        const qty = parseFloat(row.getAttribute('data-qty')) || 42;
        if (tok) {
          const tokInp = document.getElementById('weigh-token-input');
          const cropSel = document.getElementById('weigh-crop-select');
          const grossInp = document.getElementById('weigh-gross-input');
          const tareInp = document.getElementById('weigh-tare-input');
          if (tokInp) tokInp.value = tok;
          if (cropSel && crop) cropSel.value = crop;
          if (grossInp) grossInp.value = (qty + 2.5).toFixed(1);
          if (tareInp) tareInp.value = '2.5';
          grossInp?.dispatchEvent(new Event('input'));
          this.showToast(`Selected arrival Token #${tok} (${qty} qtl) for weighment entry.`);
        }
      });
    });

    // Buyer Portal Events
    document.getElementById('btn-refresh-market')?.addEventListener('click', async () => {
      await this.refreshData();
      this.render();
      this.showToast('Marketplace refreshed with latest arrival lots.');
    });

    document.querySelectorAll('.btn-bid-lot').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const lotData = JSON.parse(btn.getAttribute('data-lot'));
          this.openBidModal(lotData);
        } catch (e) {
          console.error('Failed to parse lot data:', e);
        }
      });
    });

    document.getElementById('btn-close-bid-modal')?.addEventListener('click', () => {
      document.getElementById('buyer-bid-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-confirm-buyer-bid')?.addEventListener('click', () => {
      this.handleBuyerPlaceBid();
    });

    document.querySelectorAll('.btn-view-gatepass').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const orderData = JSON.parse(btn.getAttribute('data-order'));
          this.openGatePassModal(orderData);
        } catch (e) {
          console.error('Failed to parse order data:', e);
        }
      });
    });

    document.getElementById('btn-close-pass-modal')?.addEventListener('click', () => {
      document.getElementById('buyer-pass-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-print-gate-pass')?.addEventListener('click', () => {
      this.showToast('🖨️ Generating Gate Pass PDF with digital security barcode...');
      window.print();
    });
  }

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    const t = this.t();

    // If logged out or on landing
    if (this.currentView === 'landing' || !this.user) {
      app.innerHTML = renderLandingPage({
        language: this.language,
        t
      });
      this.bindEvents();
      return;
    }

    // App Shell with Sidebar & Topbar
    let contentHtml = '';

    switch (this.currentView) {
      case 'dashboard': {
        const latestBooking = (this.myBookings || []).find(b => b.status === 'CONFIRMED' || b.queueStatus === 'WAITING') || this.myBookings[0] || null;
        contentHtml = renderFarmerDashboard({
          user: this.user,
          stats: this.stats,
          latestBooking,
          myBookings: this.myBookings,
          procurements: this.procurements,
          queueStatus: this.queueStatus,
          t,
          onNavigate: (view) => {
            this.currentView = view;
            this.render();
          }
        });
        break;
      }

      case 'booking':
        contentHtml = renderSlotBooking({
          centres: this.centres,
          crops: this.crops,
          availableSlots: this.availableSlots,
          selectedValues: this.bookingState,
          t
        });
        break;

      case 'queue': {
        const activeBooking = (this.myBookings || []).find(b => b.status === 'CONFIRMED' || b.queueStatus === 'WAITING') || this.myBookings[0] || null;
        contentHtml = renderLiveQueue({
          queueStatus: this.queueStatus,
          userToken: activeBooking ? activeBooking.token : null,
          t
        });
        break;
      }

      case 'procurements':
        contentHtml = renderProcurements({
          procurements: this.procurements,
          t
        });
        break;

      case 'centre': {
        const todayBookings = this.centreTokens.length || 64;
        const waitingNow = this.centreTokens.filter(t => t.queueStatus === 'WAITING' || t.status === 'CONFIRMED' || !t.status).length || 19;
        const completedToday = this.centreTokens.filter(t => t.status === 'COMPLETED').length || 42;
        contentHtml = renderCentreOperations({
          stats: {
            metrics: {
              todayBookings,
              dailyCapacity: 90,
              waitingNow,
              completedToday,
              nowServing: this.queueStatus?.nowServingToken || 'A-038'
            }
          },
          tokens: this.centreTokens,
          crops: this.crops,
          t
        });
        break;
      }

      case 'buyer':
        contentHtml = renderBuyerDashboard({
          user: this.user,
          lots: this.buyerLots,
          orders: this.buyerOrders,
          t
        });
        break;

      default:
        contentHtml = '<div class="page-container">Page not found</div>';
    }

    app.innerHTML = `
      <div class="app-shell">
        ${renderSidebar({
          currentView: this.currentView,
          user: this.user,
          t
        })}
        <main class="app-main">
          ${renderTopbar({
            user: this.user,
            language: this.language,
            t,
            unreadSmsCount: this.virtualPhone?.unreadCount || 0,
            unreadNotifCount: this.unreadNotifCount || 0
          })}
          ${contentHtml}
        </main>
      </div>
    `;

    this.bindEvents();
  }
}

// Instantiate and start app
window.krishiApp = new KrishiSlotApp();
window.krishiApp.init();
