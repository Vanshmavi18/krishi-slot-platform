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
import { AuthModal } from './components/AuthModal.js';
import { ReceiptModal } from './components/ReceiptModal.js';
import { renderMyBookings } from './components/MyBookings.js';
import { renderAdminSlotManagement } from './components/AdminSlotManagement.js';

class AgriQueueApp {
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
      cropName: 'Paddy / धान (Common)',
      quantity: 42,
      quantityUnit: 'quintal',
      expectedPrice: 2300,
      vehicle: 'Tractor Trolley',
      date: '2026-09-12',
      preferredDate: '2026-09-12',
      timeSlot: '10:30 – 11:00 AM',
      location: 'Jaitpur Procurement Centre',
      notes: ''
    };

    this.centres = [];
    this.crops = [];
    this.availableSlots = [];
    this.myBookings = [];
    this.adminBookings = [];
    this.availableBookings = [];
    this.procurements = [];
    this.stats = null;
    this.queueStatus = null;
    this.centreTokens = [];

    // Buyer state
    this.buyerLots = [];
    this.buyerOrders = [];
    this.activeBiddingLot = null;
    this.activeRequestSlot = null;

    // Slot system state
    this.activeCancelBookingId = null;
    this.activeAdminAction = null;

    // Notifications state
    this.notifications = [];
    this.unreadNotifCount = 0;

    this.authModal = null;
    this.receiptModal = null;
    this.notificationCenter = null;
  }

  async init() {
    // Initialize Modals & Notification Center
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
        this.bookingsError = null;
        const [procRes, statsRes, bookingsRes, availBookingsRes] = await Promise.all([
          api.getProcurements(this.user.id).catch(() => ({})),
          api.getProcurementStats(this.user.id).catch(() => ({})),
          api.getFarmerBookings().catch(err => {
            console.error('Failed to load farmer bookings:', err);
            this.bookingsError = err.message || 'Failed to load bookings from database';
            return { bookings: [] };
          }),
          api.getBuyerBookings().catch(() => ({ bookings: [] }))
        ]);
        this.procurements = procRes.procurements || [];
        this.stats = statsRes.stats;
        this.myBookings = bookingsRes.bookings || [];
        this.availableBookings = availBookingsRes.bookings || [];

        // Fetch Admin bookings if admin or officer
        const userRole = (this.user.role || '').toLowerCase();
        if (userRole === 'admin' || userRole === 'officer') {
          const adminBookingsRes = await api.getAdminBookings().catch(() => ({ bookings: [] }));
          this.adminBookings = adminBookingsRes.bookings || [];
        } else {
          this.adminBookings = [];
        }

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
        this.adminBookings = [];
        this.availableBookings = [];
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
      const targetId = id || this.user?.id;
      const res = await api.quickSwitch(role, targetId);
      this.user = res.user;
      api.setSession(res.token, res.user);
      const lower = (res.user?.role || role).toLowerCase();
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
        farmerId: this.user?.id || 'FRM-USER',
        farmerName: this.user?.name || this.user?.username || 'Registered Farmer',
        farmerPhone: this.user?.phone || '',
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
    document.getElementById('landing-btn-login')?.addEventListener('click', () => this.authModal.open('farmer', 'login'));
    document.getElementById('landing-btn-signup')?.addEventListener('click', () => this.authModal.open('farmer', 'signup'));
    document.getElementById('nav-btn-login')?.addEventListener('click', () => this.authModal.open('farmer', 'login'));
    document.getElementById('nav-btn-signup')?.addEventListener('click', () => this.authModal.open('farmer', 'signup'));
    document.getElementById('landing-btn-farmer')?.addEventListener('click', () => this.authModal.open('farmer', 'login'));
    document.getElementById('landing-btn-staff')?.addEventListener('click', () => this.authModal.open('admin', 'login'));
    document.getElementById('landing-btn-buyer')?.addEventListener('click', () => this.authModal.open('buyer', 'login'));
    document.getElementById('role-card-farmer')?.addEventListener('click', (e) => {
      if (e.target.id !== 'landing-btn-farmer') this.authModal.open('farmer', 'login');
    });
    document.getElementById('role-card-buyer')?.addEventListener('click', (e) => {
      if (e.target.id !== 'landing-btn-buyer') this.authModal.open('buyer', 'login');
    });
    document.getElementById('role-card-staff')?.addEventListener('click', (e) => {
      if (e.target.id !== 'landing-btn-staff') this.authModal.open('admin', 'login');
    });
    document.getElementById('hero-btn-login')?.addEventListener('click', () => this.authModal.open('farmer', 'login'));
    document.getElementById('hero-btn-staff')?.addEventListener('click', () => this.authModal.open('admin', 'login'));
    document.getElementById('hero-btn-buyer')?.addEventListener('click', () => this.authModal.open('buyer', 'login'));
    // Topbar events
    document.getElementById('btn-toggle-lang')?.addEventListener('click', () => this.toggleLanguage());
    document.getElementById('btn-topbar-notif')?.addEventListener('click', () => this.notificationCenter.toggle());
    document.getElementById('sidebar-notif-btn')?.addEventListener('click', () => this.notificationCenter.toggle(true));
    document.getElementById('topbar-role-switch')?.addEventListener('change', (e) => this.switchRole(e.target.value));

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
    
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await api.logout();
      this.user = null;
      this.currentView = 'landing';
      this.myBookings = [];
      this.adminBookings = [];
      this.availableBookings = [];
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
        if (view === 'notifications') {
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

    // Dashboard & Navigation shortcuts
    const navigateTo = (view) => {
      this.currentView = view;
      this.render();
    };

    document.getElementById('dash-hero-book-btn')?.addEventListener('click', () => navigateTo('booking'));
    document.getElementById('dash-top-book-btn')?.addEventListener('click', () => navigateTo('booking'));
    document.getElementById('dash-quick-book')?.addEventListener('click', () => navigateTo('booking'));
    document.getElementById('btn-nav-book-slot')?.addEventListener('click', () => navigateTo('booking'));
    document.getElementById('empty-btn-book-slot')?.addEventListener('click', () => navigateTo('booking'));

    document.getElementById('dash-top-my-bookings-btn')?.addEventListener('click', () => navigateTo('my-bookings'));
    document.getElementById('dash-quick-my-bookings')?.addEventListener('click', () => navigateTo('my-bookings'));
    document.getElementById('btn-view-my-bookings-shortcut')?.addEventListener('click', () => navigateTo('my-bookings'));

    document.getElementById('dash-open-queue')?.addEventListener('click', () => navigateTo('queue'));
    document.getElementById('dash-quick-queue')?.addEventListener('click', () => navigateTo('queue'));
    document.getElementById('dash-quick-pay')?.addEventListener('click', () => navigateTo('procurements'));
    document.getElementById('dash-quick-sms')?.addEventListener('click', () => this.notificationCenter.toggle(true));
    document.getElementById('dash-view-all-history')?.addEventListener('click', () => navigateTo('procurements'));

    // --- FARMER BOOKING FORM CONTROLS & LIVE CALCULATION ---
    const cropInp = document.getElementById('book-crop-input');
    const cropQuickSel = document.getElementById('book-crop-quick-select');
    const qtyInp = document.getElementById('book-qty-input');
    const unitSel = document.getElementById('book-unit-select');
    const priceInp = document.getElementById('book-price-input');
    const locationSel = document.getElementById('book-location-select');
    const customLocationInp = document.getElementById('book-custom-location');
    const customDateInp = document.getElementById('book-custom-date');
    const notesInp = document.getElementById('book-notes-input');

    const updateBookingSummary = () => {
      const crop = cropInp?.value || 'Paddy';
      const qty = parseFloat(qtyInp?.value) || 0;
      const unit = unitSel?.value || 'quintal';
      const price = parseFloat(priceInp?.value) || 0;
      const date = customDateInp?.value || this.bookingState.date || '2026-09-12';
      const slot = this.bookingState.timeSlot || '10:30 – 11:00 AM';
      const loc = locationSel?.value === 'Custom Mandi / Other Location'
        ? (customLocationInp?.value || 'Custom Location')
        : (locationSel?.value || 'Jaitpur Mandi');
      const payout = Math.round(qty * price);

      const sumCrop = document.getElementById('sum-crop-name');
      const sumQty = document.getElementById('sum-qty');
      const sumPrice = document.getElementById('sum-price');
      const sumDate = document.getElementById('sum-date');
      const sumSlot = document.getElementById('sum-slot');
      const sumMandi = document.getElementById('sum-mandi');
      const sumPayout = document.getElementById('sum-total-payout');

      if (sumCrop) sumCrop.innerText = crop;
      if (sumQty) sumQty.innerText = `${qty} ${unit}`;
      if (sumPrice) sumPrice.innerText = `₹${price.toLocaleString('en-IN')} / ${unit}`;
      if (sumDate) sumDate.innerText = date;
      if (sumSlot) sumSlot.innerText = slot;
      if (sumMandi) sumMandi.innerText = loc;
      if (sumPayout) sumPayout.innerText = `₹${payout.toLocaleString('en-IN')}`;
    };

    cropQuickSel?.addEventListener('change', (e) => {
      const selOpt = e.target.selectedOptions?.[0];
      if (selOpt && selOpt.value) {
        if (cropInp) cropInp.value = selOpt.value;
        const rate = selOpt.getAttribute('data-rate');
        if (rate && priceInp) priceInp.value = rate;
        updateBookingSummary();
      }
    });

    locationSel?.addEventListener('change', (e) => {
      if (e.target.value === 'Custom Mandi / Other Location') {
        customLocationInp?.classList.remove('hidden');
        customLocationInp?.focus();
      } else {
        customLocationInp?.classList.add('hidden');
      }
      updateBookingSummary();
    });

    cropInp?.addEventListener('input', updateBookingSummary);
    qtyInp?.addEventListener('input', updateBookingSummary);
    unitSel?.addEventListener('change', updateBookingSummary);
    priceInp?.addEventListener('input', updateBookingSummary);
    customLocationInp?.addEventListener('input', updateBookingSummary);
    customDateInp?.addEventListener('change', (e) => {
      this.bookingState.date = e.target.value;
      updateBookingSummary();
    });

    document.querySelectorAll('.date-choice').forEach(el => {
      el.addEventListener('click', async () => {
        document.querySelectorAll('.date-choice').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');
        const dt = el.getAttribute('data-date');
        this.bookingState.date = dt;
        if (customDateInp) customDateInp.value = dt;
        updateBookingSummary();
      });
    });

    document.querySelectorAll('.time-choice').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.time-choice').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        this.bookingState.timeSlot = el.getAttribute('data-slot');
        updateBookingSummary();
      });
    });

    // Submit Booking handler (Farmer)
    const handleFarmerBookingSubmit = async () => {
      const errBox = document.getElementById('booking-form-error');
      const submitBtn = document.getElementById('btn-submit-farmer-booking') || document.getElementById('btn-confirm-slot-booking');

      const cropName = cropInp?.value?.trim();
      const quantity = parseFloat(qtyInp?.value);
      const quantityUnit = unitSel?.value || 'quintal';
      const expectedPrice = parseFloat(priceInp?.value);
      const preferredDate = customDateInp?.value || this.bookingState.date || '2026-09-12';
      const timeSlot = this.bookingState.timeSlot || '10:30 – 11:00 AM';
      const location = locationSel?.value === 'Custom Mandi / Other Location'
        ? customLocationInp?.value?.trim()
        : locationSel?.value?.trim();
      const vehicle = document.getElementById('book-vehicle-select')?.value || 'Tractor Trolley';
      const notes = notesInp?.value?.trim() || '';

      // Validation
      if (!cropName) {
        if (errBox) {
          errBox.innerText = '⚠️ Please enter or select a Crop/Product name.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (isNaN(quantity) || quantity <= 0) {
        if (errBox) {
          errBox.innerText = '⚠️ Please enter a valid quantity greater than 0.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (isNaN(expectedPrice) || expectedPrice <= 0) {
        if (errBox) {
          errBox.innerText = '⚠️ Please enter a valid expected selling price.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (!preferredDate) {
        if (errBox) {
          errBox.innerText = '⚠️ Please choose a preferred delivery date.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (!location) {
        if (errBox) {
          errBox.innerText = '⚠️ Please specify a delivery Mandi or location.';
          errBox.classList.remove('hidden');
        }
        return;
      }

      if (errBox) errBox.classList.add('hidden');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = '⏳ Submitting to APMC Mandi...';
      }

      try {
        const res = await api.createBooking({
          cropName,
          quantity,
          quantityUnit,
          expectedPrice,
          preferredDate,
          timeSlot,
          location,
          vehicle,
          notes
        });

        this.showToast(`🎉 Booking #${res.bookingId} submitted successfully! Status: Pending APMC Review.`);
        await this.refreshData();
        this.currentView = 'my-bookings';
        this.render();
      } catch (err) {
        if (errBox) {
          errBox.innerText = `⚠️ Booking failed: ${err.message}`;
          errBox.classList.remove('hidden');
        }
        this.showToast(`⚠️ Booking failed: ${err.message}`);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = '🚀 Submit Booking →';
        }
      }
    };

    document.getElementById('btn-submit-farmer-booking')?.addEventListener('click', handleFarmerBookingSubmit);
    document.getElementById('btn-confirm-slot-booking')?.addEventListener('click', handleFarmerBookingSubmit);

    // --- FARMER: MY BOOKINGS SECTION EVENTS ---
    document.getElementById('btn-refresh-my-bookings')?.addEventListener('click', async () => {
      await this.refreshData();
      this.render();
      this.showToast('Bookings refreshed from database.');
    });

    document.getElementById('filter-my-bookings-status')?.addEventListener('change', (e) => {
      const val = e.target.value;
      const rows = document.querySelectorAll('#my-bookings-table-body tr');
      rows.forEach(tr => {
        const st = tr.getAttribute('data-status');
        if (val === 'ALL' || st === val || (val === 'Approved' && st === 'CONFIRMED')) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
    });

    // View Details Modal (Farmer)
    document.querySelectorAll('.btn-view-booking-details').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const b = JSON.parse(btn.getAttribute('data-booking'));
          const modal = document.getElementById('booking-details-modal');
          const idEl = document.getElementById('modal-booking-id');
          const content = document.getElementById('modal-booking-content');

          if (!modal) return;
          if (idEl) idEl.innerText = `Booking Details #${b.bookingId || b.id}`;

          const requests = Array.isArray(b.buyerRequests) ? b.buyerRequests : [];
          const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : b.date || 'TBD');

          if (content) {
            content.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;background:#f8fafc;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0">
                <span>Current Status:</span>
                <b>${b.status}</b>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;line-height:1.6;margin-bottom:14px">
                <div><span style="color:#64748b">Farmer Name:</span><br><b>${b.farmerName}</b></div>
                <div><span style="color:#64748b">Farmer ID:</span><br><b>${b.farmerId}</b></div>
                <div><span style="color:#64748b">Crop / Variety:</span><br><b>${b.cropName}</b></div>
                <div><span style="color:#64748b">Quantity:</span><br><b>${b.quantity} ${b.quantityUnit || 'quintal'}</b></div>
                <div><span style="color:#64748b">Expected Selling Price:</span><br><b>₹${Number(b.expectedPrice || 0).toLocaleString('en-IN')} / ${b.quantityUnit || 'qtl'}</b></div>
                <div><span style="color:#64748b">Total Estimated:</span><br><b style="color:#15803d">₹${Math.round(Number(b.quantity || 0) * Number(b.expectedPrice || 0)).toLocaleString('en-IN')}</b></div>
                <div><span style="color:#64748b">Scheduled Date:</span><br><b>${dateDisplay}</b></div>
                <div><span style="color:#64748b">Time Slot:</span><br><b>${b.timeSlot}</b></div>
                <div style="grid-column:span 2"><span style="color:#64748b">Procurement Mandi:</span><br><b>${b.location || b.centreName || 'Gorakhpur APMC'}</b></div>
              </div>

              ${b.notes ? `
                <div style="background:#fffbeb;border:1px solid #fef3c7;padding:10px 12px;border-radius:8px;font-size:12.5px;color:#92400e;margin-bottom:14px">
                  <b>Farmer Notes:</b> ${b.notes}
                </div>
              ` : ''}

              ${requests.length > 0 ? `
                <div style="border-top:1px solid #e2e8f0;padding-top:12px;margin-top:12px">
                  <h4 style="font-size:14px;font-weight:700;margin-bottom:8px;color:#1e40af">Commercial Buyer Purchase Offers (${requests.length})</h4>
                  ${requests.map(r => `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 12px;margin-bottom:6px;font-size:12.5px">
                      <div style="display:flex;justify-content:space-between">
                        <b>${r.buyerName || 'Commercial Buyer'}</b>
                        <b style="color:#1e40af">Offered: ₹${r.offeredPrice || b.expectedPrice}/${b.quantityUnit || 'qtl'}</b>
                      </div>
                      ${r.notes ? `<div style="color:#475569;margin-top:2px;font-size:11.5px">Note: ${r.notes}</div>` : ''}
                      <small style="color:#94a3b8;font-size:11px">${new Date(r.requestedAt || Date.now()).toLocaleString()}</small>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            `;
          }

          modal.classList.remove('hidden');
        } catch (e) {
          console.error('Error opening booking details:', e);
        }
      });
    });

    document.getElementById('btn-close-booking-details')?.addEventListener('click', () => {
      document.getElementById('booking-details-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-modal-close-action')?.addEventListener('click', () => {
      document.getElementById('booking-details-modal')?.classList.add('hidden');
    });

    // Cancellation Modal (Farmer)
    document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const crop = btn.getAttribute('data-crop');
        this.activeCancelBookingId = id;

        const modal = document.getElementById('cancel-confirm-modal');
        const textEl = document.getElementById('cancel-confirm-text');
        if (textEl) {
          textEl.innerText = `Are you sure you want to cancel booking #${id} for ${crop}? This will release your reserved slot.`;
        }
        modal?.classList.remove('hidden');
      });
    });

    document.getElementById('btn-cancel-modal-dismiss')?.addEventListener('click', () => {
      document.getElementById('cancel-confirm-modal')?.classList.add('hidden');
      this.activeCancelBookingId = null;
    });

    document.getElementById('btn-confirm-cancel-action')?.addEventListener('click', async () => {
      if (!this.activeCancelBookingId) return;
      const reason = document.getElementById('cancel-reason-input')?.value;

      try {
        await api.cancelBooking(this.activeCancelBookingId, reason);
        document.getElementById('cancel-confirm-modal')?.classList.add('hidden');
        this.showToast(`✓ Booking #${this.activeCancelBookingId} cancelled.`);
        this.activeCancelBookingId = null;
        await this.refreshData();
        this.render();
      } catch (err) {
        this.showToast(`Cancellation error: ${err.message}`);
      }
    });

    // --- BUYER: AVAILABLE FARMER SLOTS & REQUEST TO BUY ---
    document.querySelectorAll('.btn-request-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const booking = JSON.parse(btn.getAttribute('data-booking'));
          this.activeRequestSlot = booking;

          const modal = document.getElementById('buyer-request-slot-modal');
          const summary = document.getElementById('request-modal-slot-summary');
          const priceInput = document.getElementById('req-offered-price-input');
          const calcTotal = document.getElementById('req-calc-total');

          if (!modal) return;

          const dateDisplay = booking.displayDate || (booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString() : booking.date || 'TBD');

          if (summary) {
            summary.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <b>${booking.cropName}</b>
                <span class="status-pill confirmed">Slot #${booking.bookingId || booking.id}</span>
              </div>
              <div style="color:#4b5563">
                Farmer: <b>${booking.farmerName}</b> • Location: <b>${booking.location || booking.centreName}</b>
              </div>
              <div style="color:#4b5563;margin-top:4px">
                Available: <b>${booking.quantity} ${booking.quantityUnit || 'quintal'}</b> • Expected Rate: <b>₹${Number(booking.expectedPrice).toLocaleString('en-IN')}/${booking.quantityUnit || 'qtl'}</b>
              </div>
              <div style="color:#64748b;font-size:12px;margin-top:2px">
                Arrival: <b>${dateDisplay} (${booking.timeSlot})</b>
              </div>
            `;
          }

          if (priceInput) priceInput.value = booking.expectedPrice || 2300;

          const updateReqTotal = () => {
            const pr = parseFloat(priceInput?.value) || 0;
            const tot = Math.round((Number(booking.quantity) || 0) * pr);
            if (calcTotal) calcTotal.innerText = `₹${tot.toLocaleString('en-IN')}`;
          };

          priceInput?.removeEventListener('input', updateReqTotal);
          priceInput?.addEventListener('input', updateReqTotal);
          updateReqTotal();

          modal.classList.remove('hidden');
        } catch (e) {
          console.error('Error opening request modal:', e);
        }
      });
    });

    document.getElementById('btn-close-request-slot-modal')?.addEventListener('click', () => {
      document.getElementById('buyer-request-slot-modal')?.classList.add('hidden');
      this.activeRequestSlot = null;
    });

    document.getElementById('btn-submit-buy-request')?.addEventListener('click', async () => {
      if (!this.activeRequestSlot) return;

      const price = parseFloat(document.getElementById('req-offered-price-input')?.value);
      const notes = document.getElementById('req-buyer-notes-input')?.value;

      try {
        const id = this.activeRequestSlot.bookingId || this.activeRequestSlot.id;
        await api.requestBuySlot(id, { offeredPrice: price, notes });

        document.getElementById('buyer-request-slot-modal')?.classList.add('hidden');
        this.showToast(`🤝 Purchase request submitted for Slot #${id}! Farmer & APMC Admin notified.`);
        this.activeRequestSlot = null;
        await this.refreshData();
        this.render();
      } catch (err) {
        this.showToast(`Request failed: ${err.message}`);
      }
    });

    // --- ADMIN: SLOT MANAGEMENT EVENTS ---
    document.getElementById('btn-refresh-admin-slots')?.addEventListener('click', async () => {
      await this.refreshData();
      this.render();
      this.showToast('Admin slots refreshed from MongoDB.');
    });

    const filterAdminTable = () => {
      const q = (document.getElementById('search-admin-slots')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('filter-admin-slots-status')?.value || 'ALL';
      const rows = document.querySelectorAll('#admin-slots-table-body tr');

      rows.forEach(tr => {
        const rowStatus = tr.getAttribute('data-status');
        const rowSearch = tr.getAttribute('data-search') || '';

        const matchesStatus = statusFilter === 'ALL' || rowStatus === statusFilter || (statusFilter === 'Approved' && rowStatus === 'CONFIRMED');
        const matchesSearch = !q || rowSearch.includes(q);

        if (matchesStatus && matchesSearch) {
          tr.style.display = '';
        } else {
          tr.style.display = 'none';
        }
      });
    };

    document.getElementById('search-admin-slots')?.addEventListener('input', filterAdminTable);
    document.getElementById('filter-admin-slots-status')?.addEventListener('change', filterAdminTable);

    // Admin View Booking Modal
    document.querySelectorAll('.btn-admin-view-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const b = JSON.parse(btn.getAttribute('data-booking'));
          const modal = document.getElementById('admin-view-booking-modal');
          const idEl = document.getElementById('admin-view-modal-id');
          const bodyEl = document.getElementById('admin-view-modal-body');

          if (!modal) return;
          if (idEl) idEl.innerText = `APMC Mandi Slot Record #${b.bookingId || b.id}`;

          const requests = Array.isArray(b.buyerRequests) ? b.buyerRequests : [];
          const dateDisplay = b.displayDate || (b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : b.date || 'TBD');

          if (bodyEl) {
            bodyEl.innerHTML = `
              <div style="background:#f8fafc;padding:12px 14px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:14px;display:flex;justify-content:space-between">
                <span>Current Status:</span>
                <b>${b.status}</b>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;line-height:1.6;margin-bottom:14px">
                <div><span style="color:#64748b">Farmer Name:</span><br><b>${b.farmerName}</b></div>
                <div><span style="color:#64748b">Farmer ID:</span><br><b>${b.farmerId}</b></div>
                <div><span style="color:#64748b">Farmer Phone:</span><br><b>${b.farmerPhone || 'N/A'}</b></div>
                <div><span style="color:#64748b">Farmer Email:</span><br><b>${b.farmerEmail || 'N/A'}</b></div>
                <div><span style="color:#64748b">Crop / Variety:</span><br><b>${b.cropName}</b></div>
                <div><span style="color:#64748b">Quantity:</span><br><b>${b.quantity} ${b.quantityUnit || 'quintal'}</b></div>
                <div><span style="color:#64748b">Expected Rate:</span><br><b>₹${Number(b.expectedPrice || 0).toLocaleString('en-IN')}/${b.quantityUnit || 'qtl'}</b></div>
                <div><span style="color:#64748b">Total Value:</span><br><b style="color:#15803d">₹${Math.round(Number(b.quantity || 0) * Number(b.expectedPrice || 0)).toLocaleString('en-IN')}</b></div>
                <div><span style="color:#64748b">Arrival Date:</span><br><b>${dateDisplay}</b></div>
                <div><span style="color:#64748b">Time Window:</span><br><b>${b.timeSlot}</b></div>
                <div><span style="color:#64748b">Assigned Mandi:</span><br><b>${b.location || b.centreName || 'Gorakhpur Mandi'}</b></div>
                <div><span style="color:#64748b">Gate Token:</span><br><b>#${b.token || 'N/A'}</b></div>
              </div>

              ${b.notes ? `
                <div style="background:#fffbeb;border:1px solid #fef3c7;padding:10px;border-radius:8px;font-size:12px;color:#92400e;margin-bottom:12px">
                  <b>Farmer Notes:</b> ${b.notes}
                </div>
              ` : ''}

              ${requests.length > 0 ? `
                <div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:10px">
                  <h4 style="font-size:13.5px;font-weight:700;margin-bottom:8px;color:#1e40af">Buyer Purchase Requests (${requests.length})</h4>
                  ${requests.map(r => `
                    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:12px">
                      <div style="display:flex;justify-content:space-between">
                        <b>${r.buyerName}</b>
                        <b style="color:#1e40af">Offer: ₹${r.offeredPrice}/${b.quantityUnit || 'qtl'}</b>
                      </div>
                      ${r.notes ? `<div style="color:#475569;margin-top:2px">Note: ${r.notes}</div>` : ''}
                      <small style="color:#94a3b8">${new Date(r.requestedAt || Date.now()).toLocaleString()}</small>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="font-size:12px;color:#94a3af;font-style:italic">No buyer commercial purchase requests submitted yet.</div>
              `}
            `;
          }

          modal.classList.remove('hidden');
        } catch (e) {
          console.error('Admin view booking error:', e);
        }
      });
    });

    document.getElementById('btn-close-admin-view-modal')?.addEventListener('click', () => {
      document.getElementById('admin-view-booking-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-admin-view-modal-close')?.addEventListener('click', () => {
      document.getElementById('admin-view-booking-modal')?.classList.add('hidden');
    });

    // Admin Status Change Trigger
    document.querySelectorAll('.btn-admin-status-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const target = btn.getAttribute('data-target');
        const crop = btn.getAttribute('data-crop');
        const farmer = btn.getAttribute('data-farmer');

        this.activeAdminAction = { id, targetStatus: target };

        const modal = document.getElementById('admin-status-modal');
        const titleEl = document.getElementById('admin-modal-title');
        const descEl = document.getElementById('admin-modal-desc');
        const iconEl = document.getElementById('admin-modal-icon');
        const detailsEl = document.getElementById('admin-modal-details-box');
        const confirmBtn = document.getElementById('btn-admin-modal-confirm');

        if (!modal) return;

        if (titleEl) titleEl.innerText = `Confirm Booking ${target}`;
        if (descEl) descEl.innerText = `Are you sure you want to mark this booking as ${target}?`;

        if (iconEl) {
          iconEl.innerText = target === 'Approved' ? '✅' : target === 'Rejected' ? '✕' : target === 'Completed' ? '🎉' : '⚠️';
        }

        if (detailsEl) {
          detailsEl.innerHTML = `
            <div>Booking ID: <b>#${id}</b></div>
            <div>Farmer: <b>${farmer}</b> • Crop: <b>${crop}</b></div>
            <div>New State: <b style="color:${target === 'Approved' ? '#15803d' : target === 'Rejected' ? '#b91c1c' : '#0284c7'}">${target}</b></div>
          `;
        }

        if (confirmBtn) {
          confirmBtn.style.background = target === 'Rejected' || target === 'Cancelled' ? '#dc2626' : '#15803d';
          confirmBtn.innerText = `Confirm ${target} →`;
        }

        modal.classList.remove('hidden');
      });
    });

    document.getElementById('btn-close-admin-status-modal')?.addEventListener('click', () => {
      document.getElementById('admin-status-modal')?.classList.add('hidden');
      this.activeAdminAction = null;
    });
    document.getElementById('btn-admin-modal-dismiss')?.addEventListener('click', () => {
      document.getElementById('admin-status-modal')?.classList.add('hidden');
      this.activeAdminAction = null;
    });

    document.getElementById('btn-admin-modal-confirm')?.addEventListener('click', async () => {
      if (!this.activeAdminAction) return;

      const notes = document.getElementById('admin-status-notes-input')?.value;

      try {
        await api.updateBookingStatus(this.activeAdminAction.id, this.activeAdminAction.targetStatus, notes);
        document.getElementById('admin-status-modal')?.classList.add('hidden');
        this.showToast(`✓ Booking #${this.activeAdminAction.id} marked as ${this.activeAdminAction.targetStatus}!`);
        this.activeAdminAction = null;
        await this.refreshData();
        this.render();
      } catch (err) {
        this.showToast(`Status update failed: ${err.message}`);
      }
    });

    // Queue actions
    document.getElementById('btn-simulate-queue')?.addEventListener('click', () => {
      this.handleAdvanceQueue();
    });
    document.getElementById('btn-set-arrival-reminder')?.addEventListener('click', () => {
      this.showToast('✅ Proximity alert active! You will receive an alert when your token is within 5 turns.');
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

    // Buyer Direct Slot Booking Modal
    document.getElementById('btn-buyer-open-booking-modal')?.addEventListener('click', () => {
      const modal = document.getElementById('buyer-book-slot-modal');
      if (modal) modal.classList.remove('hidden');
    });

    document.getElementById('btn-close-buyer-booking-modal')?.addEventListener('click', () => {
      document.getElementById('buyer-book-slot-modal')?.classList.add('hidden');
    });

    const updateBuyerCalc = () => {
      const q = Number(document.getElementById('buyer-booking-qty')?.value) || 0;
      const p = Number(document.getElementById('buyer-booking-price')?.value) || 0;
      const el = document.getElementById('buyer-booking-total-display');
      if (el) el.innerText = `₹${(q * p).toLocaleString('en-IN')}`;
    };

    document.getElementById('buyer-booking-qty')?.addEventListener('input', updateBuyerCalc);
    document.getElementById('buyer-booking-price')?.addEventListener('input', updateBuyerCalc);
    document.getElementById('buyer-booking-crop')?.addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      const rate = opt?.getAttribute('data-rate');
      const priceInp = document.getElementById('buyer-booking-price');
      if (rate && priceInp) {
        priceInp.value = rate;
        updateBuyerCalc();
      }
    });

    document.getElementById('btn-submit-buyer-direct-booking')?.addEventListener('click', async () => {
      const centreSel = document.getElementById('buyer-booking-centre');
      const cropSel = document.getElementById('buyer-booking-crop');
      const qtyInp = document.getElementById('buyer-booking-qty');
      const priceInp = document.getElementById('buyer-booking-price');
      const dateInp = document.getElementById('buyer-booking-date');
      const slotSel = document.getElementById('buyer-booking-timeslot');
      const vehicleInp = document.getElementById('buyer-booking-vehicle');

      const payload = {
        farmerId: this.user?.id || 'BUYER-01',
        farmerName: this.user?.company || this.user?.name || 'Commercial Buyer',
        buyerId: this.user?.id || 'BUYER-01',
        buyerName: this.user?.company || this.user?.name || 'Commercial Buyer',
        cropName: cropSel ? cropSel.value.split('(')[0].trim() : 'Wheat',
        quantity: Number(qtyInp?.value) || 50,
        quantityUnit: 'quintal',
        expectedPrice: Number(priceInp?.value) || 2425,
        preferredDate: dateInp?.value || '2026-09-18',
        timeSlot: slotSel?.value || '10:30 – 11:00 AM',
        location: centreSel?.selectedOptions[0]?.text || 'Jaitpur Procurement Centre',
        vehicle: vehicleInp?.value || 'Commercial Truck'
      };

      try {
        const res = await api.createBooking(payload);
        document.getElementById('buyer-book-slot-modal')?.classList.add('hidden');
        this.showToast(`🎉 Procurement Booking #${res.bookingId} Saved in Database! Gate Token #${res.booking.token}`);
        await this.refreshData();
        this.render();
      } catch (err) {
        this.showToast(`⚠️ Booking failed: ${err.message}`);
      }
    });

    // Buyer Request to Buy Farmer Slot Modal
    document.querySelectorAll('.btn-request-slot').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const booking = JSON.parse(btn.getAttribute('data-booking'));
          this.activeRequestSlot = booking;
          const modal = document.getElementById('buyer-request-slot-modal');
          const summary = document.getElementById('request-modal-slot-summary');
          const priceInp = document.getElementById('req-offered-price-input');
          const totalEl = document.getElementById('req-calc-total');

          if (summary) {
            summary.innerHTML = `
              <b>${booking.crop || booking.cropName}</b> (${booking.quantity} ${booking.quantityUnit || 'qtl'})<br>
              <span style="color:#6b7280">Farmer: <b>${booking.farmerName}</b> • ${booking.location || 'APMC Mandi'}</span><br>
              <span style="color:#15803d">Expected: <b>₹${booking.expectedPrice || 2300}/qtl</b> • Date: <b>${booking.displayDate || booking.date}</b></span>
            `;
          }
          if (priceInp) priceInp.value = booking.expectedPrice || 2300;
          if (totalEl) totalEl.innerText = `₹${((Number(booking.quantity) || 50) * Number(priceInp?.value || 2300)).toLocaleString('en-IN')}`;

          modal?.classList.remove('hidden');
        } catch (e) {
          console.error(e);
        }
      });
    });

    document.getElementById('btn-close-request-slot-modal')?.addEventListener('click', () => {
      document.getElementById('buyer-request-slot-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-submit-buy-request')?.addEventListener('click', async () => {
      if (!this.activeRequestSlot) return;
      const priceInp = document.getElementById('req-offered-price-input');
      const notesInp = document.getElementById('req-buyer-notes-input');

      try {
        await api.requestBuySlot(this.activeRequestSlot.bookingId || this.activeRequestSlot.id, {
          offeredPrice: Number(priceInp?.value) || this.activeRequestSlot.expectedPrice,
          notes: notesInp?.value || ''
        });
        document.getElementById('buyer-request-slot-modal')?.classList.add('hidden');
        this.showToast(`🤝 Purchase request recorded in database for #${this.activeRequestSlot.bookingId || this.activeRequestSlot.id}!`);
        await this.refreshData();
        this.render();
      } catch (err) {
        this.showToast(`Request failed: ${err.message}`);
      }
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
        const latestBooking = (this.myBookings || []).find(b => b.status === 'Pending' || b.status === 'Approved' || b.status === 'CONFIRMED' || b.queueStatus === 'WAITING') || this.myBookings[0] || null;
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
          user: this.user,
          centres: this.centres,
          crops: this.crops,
          availableSlots: this.availableSlots,
          selectedValues: this.bookingState,
          t
        });
        break;

      case 'my-bookings':
        contentHtml = renderMyBookings({
          user: this.user,
          bookings: this.myBookings,
          error: this.bookingsError,
          t,
          onNavigate: (view) => {
            this.currentView = view;
            this.render();
          }
        });
        break;

      case 'admin-slots':
        contentHtml = renderAdminSlotManagement({
          user: this.user,
          bookings: this.adminBookings,
          t
        });
        break;

      case 'queue': {
        const activeBooking = (this.myBookings || []).find(b => b.status === 'CONFIRMED' || b.status === 'Approved' || b.queueStatus === 'WAITING') || this.myBookings[0] || null;
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
          availableBookings: this.availableBookings,
          centres: this.centres,
          crops: this.crops,
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
window.agriQueueApp = new AgriQueueApp();
window.agriQueueApp.init();
