// src/components/AuthModal.js

export class AuthModal {
  constructor(api, onLoginSuccess) {
    this.api = api;
    this.onLoginSuccess = onLoginSuccess;
    this.activeTab = 'farmer'; // 'farmer' | 'admin' | 'buyer'
    this.step = 'phone'; // 'phone' or 'otp' for farmer
    this.currentPhone = '';
    this.demoOtp = '';
    this.error = null;
  }

  open(defaultTab = 'farmer') {
    this.activeTab = defaultTab;
    this.step = 'phone';
    this.currentPhone = defaultTab === 'farmer' ? '9876543210' : '';
    this.error = null;
    this.render();
  }

  close() {
    const el = document.getElementById('auth-modal-root');
    if (el) el.innerHTML = '';
  }

  async handleSendOtp() {
    const input = document.getElementById('auth-phone-input');
    const phone = input ? input.value.trim() : '';
    if (!phone || phone.length < 10) {
      this.error = 'Please enter a valid 10-digit mobile number.';
      this.render();
      return;
    }

    try {
      this.error = null;
      const res = await this.api.sendOtp(phone);
      this.currentPhone = phone;
      this.demoOtp = res.demoOtp || '';
      this.step = 'otp';
      this.render();
    } catch (err) {
      this.error = err.message || 'Failed to send OTP';
      this.render();
    }
  }

  async handleVerifyOtp() {
    const input = document.getElementById('auth-otp-input');
    const otp = input ? input.value.trim() : '';
    if (!otp) {
      this.error = 'Please enter the 6-digit OTP sent via SMS.';
      this.render();
      return;
    }

    try {
      this.error = null;
      const res = await this.api.verifyOtp(this.currentPhone, otp);
      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.error = err.message || 'Verification failed';
      this.render();
    }
  }

  async handleAdminLogin() {
    const idInput = document.getElementById('auth-admin-id');
    const pwdInput = document.getElementById('auth-admin-pwd');
    const staffId = idInput ? idInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';

    if (!staffId || !password) {
      this.error = 'Please enter both Admin/Staff ID and Password.';
      this.render();
      return;
    }

    try {
      this.error = null;
      const res = await this.api.loginStaff(staffId, password);
      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.error = err.message || 'Admin login failed';
      this.render();
    }
  }

  async handleBuyerLogin() {
    const idInput = document.getElementById('auth-buyer-id');
    const pwdInput = document.getElementById('auth-buyer-pwd');
    const identifier = idInput ? idInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';

    if (!identifier || !password) {
      this.error = 'Please enter both Buyer ID / Mobile and Password.';
      this.render();
      return;
    }

    try {
      this.error = null;
      const res = await this.api.loginBuyer(identifier, password);
      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.error = err.message || 'Buyer login failed';
      this.render();
    }
  }

  async handleQuickDemo(role) {
    try {
      this.error = null;
      const res = await this.api.quickSwitch(role);
      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.error = err.message || 'Quick login failed';
      this.render();
    }
  }

  render() {
    let container = document.getElementById('auth-modal-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'auth-modal-root';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-window" style="max-width:480px">
          <button id="modal-close" class="modal-close-btn">✕</button>

          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:36px;margin-bottom:6px">🌱</div>
            <h2 style="font-size:22px;color:#0f2e1b;font-weight:800">KrishiSlot Login</h2>
            <p style="font-size:13px;color:#6b7280">Unified Smart Mandi & Procurement Portal</p>
          </div>

          <!-- 3 Role Tabs -->
          <div class="auth-role-tabs">
            <button id="tab-farmer" class="auth-tab-btn ${this.activeTab === 'farmer' ? 'active' : ''}">
              🌾 Farmer (Seller)
            </button>
            <button id="tab-admin" class="auth-tab-btn ${this.activeTab === 'admin' ? 'active' : ''}">
              🛡️ Admin
            </button>
            <button id="tab-buyer" class="auth-tab-btn ${this.activeTab === 'buyer' ? 'active' : ''}">
              🛒 Buyer (Trader)
            </button>
          </div>

          ${this.error ? `
            <div style="background:#fee2e2;color:#b91c1c;padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:18px;font-weight:600">
              ⚠️ ${this.error}
            </div>
          ` : ''}

          <!-- TAB 1: FARMER (SELLER) -->
          ${this.activeTab === 'farmer' ? `
            <div class="auth-role-header">
              <strong>🌾 Farmer / Crop Seller Access</strong>
              <span>Book procurement slots, track mandi queue, J-Forms & DBT payments</span>
            </div>

            ${this.step === 'phone' ? `
              <div class="form-field">
                <label>Registered Mobile Number / मोबाइल नंबर</label>
                <div style="display:flex;gap:8px">
                  <span style="display:flex;align-items:center;padding:0 14px;background:#f3f4f6;border:1.5px solid #d4dfd2;border-radius:12px;font-weight:700;color:#374151">+91</span>
                  <input id="auth-phone-input" type="tel" value="${this.currentPhone || '9876543210'}" placeholder="Enter 10-digit mobile" maxlength="10" />
                </div>
              </div>

              <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:12px;border-radius:10px;font-size:12px;color:#166534;margin-bottom:18px">
                💡 <b>Demo Account Ready:</b> Mobile <code>9876543210</code> (Ramesh Kumar). Live SMS will appear in virtual mobile phone!
              </div>

              <button id="btn-submit-phone" class="cta" style="width:100%;margin-bottom:12px">
                Get OTP via SMS / ओटीपी प्राप्त करें →
              </button>

              <div style="display:flex;align-items:center;gap:10px;margin:12px 0">
                <div style="flex:1;height:1px;background:#e5e7eb"></div>
                <span style="font-size:11px;color:#9ca3af;font-weight:600">OR 1-CLICK INSTANT DEMO</span>
                <div style="flex:1;height:1px;background:#e5e7eb"></div>
              </div>

              <button id="btn-quick-farmer" class="btn-secondary" style="width:100%;font-weight:700">
                ⚡ Instant Login: Farmer Ramesh Kumar
              </button>
            ` : `
              <div class="form-field">
                <label>Enter 6-Digit SMS OTP sent to +91 ${this.currentPhone}</label>
                <input id="auth-otp-input" type="text" placeholder="e.g. ${this.demoOtp || '123456'}" maxlength="6" style="font-size:22px;letter-spacing:0.2em;text-align:center" />
              </div>

              ${this.demoOtp ? `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;background:#ecfdf5;border:1px solid #a7f3d0;padding:10px 14px;border-radius:10px;font-size:12px;color:#065f46">
                  <span>SMS OTP Received: <b>${this.demoOtp}</b></span>
                  <button id="btn-autofill-otp" class="btn-outline btn-sm" style="background:#fff">Auto-fill</button>
                </div>
              ` : ''}

              <button id="btn-submit-otp" class="cta" style="width:100%;margin-bottom:12px">
                Verify OTP & Enter / सत्यापित करें →
              </button>

              <button id="btn-back-phone" class="btn-outline" style="width:100%">
                ← Change Mobile Number
              </button>
            `}
          ` : ''}

          <!-- TAB 2: APMC ADMIN -->
          ${this.activeTab === 'admin' ? `
            <div class="auth-role-header">
              <strong>🛡️ APMC Admin & Mandi Command Center</strong>
              <span>Manage procurement centres, call tokens, weighment assay & DBT approvals</span>
            </div>

            <div class="form-field">
              <label>Staff / Admin Code</label>
              <input id="auth-admin-id" type="text" value="APMC-ADMIN" placeholder="e.g. APMC-ADMIN or OFFICER-01" />
            </div>

            <div class="form-field">
              <label>Password</label>
              <input id="auth-admin-pwd" type="password" value="admin123" placeholder="Enter password" />
            </div>

            <div style="background:#fef3c7;border:1px solid #fde68a;padding:12px;border-radius:10px;font-size:12px;color:#92400e;margin-bottom:18px">
              🔑 Demo Admin: <b>APMC-ADMIN</b> / Password: <b>admin123</b> (Director Alok Nath)
            </div>

            <button id="btn-submit-admin" class="cta" style="width:100%;margin-bottom:12px">
              Admin Login →
            </button>

            <div style="display:flex;align-items:center;gap:10px;margin:12px 0">
              <div style="flex:1;height:1px;background:#e5e7eb"></div>
              <span style="font-size:11px;color:#9ca3af;font-weight:600">OR 1-CLICK INSTANT DEMO</span>
              <div style="flex:1;height:1px;background:#e5e7eb"></div>
            </div>

            <button id="btn-quick-admin" class="btn-secondary" style="width:100%;font-weight:700">
              ⚡ Instant Login: APMC Director (Admin)
            </button>
          ` : ''}

          <!-- TAB 3: BUYER (TRADER / MILLER) -->
          ${this.activeTab === 'buyer' ? `
            <div class="auth-role-header">
              <strong>🛒 Commercial Buyer / Trader Portal</strong>
              <span>Browse Mandi arrival lots, submit bids, track contracts & download gate passes</span>
            </div>

            <div class="form-field">
              <label>Buyer ID or Registered Mobile</label>
              <input id="auth-buyer-id" type="text" value="BUYER-01" placeholder="e.g. BUYER-01 or 9822334455" />
            </div>

            <div class="form-field">
              <label>Password</label>
              <input id="auth-buyer-pwd" type="password" value="buyer123" placeholder="Enter password" />
            </div>

            <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:12px;border-radius:10px;font-size:12px;color:#1e40af;margin-bottom:18px">
              🏢 Demo Buyer: <b>BUYER-01</b> (AgroCorp Foods) / Password: <b>buyer123</b>
            </div>

            <button id="btn-submit-buyer" class="cta" style="width:100%;margin-bottom:12px">
              Buyer Portal Login →
            </button>

            <div style="display:flex;align-items:center;gap:10px;margin:12px 0">
              <div style="flex:1;height:1px;background:#e5e7eb"></div>
              <span style="font-size:11px;color:#9ca3af;font-weight:600">OR 1-CLICK INSTANT DEMO</span>
              <div style="flex:1;height:1px;background:#e5e7eb"></div>
            </div>

            <button id="btn-quick-buyer" class="btn-secondary" style="width:100%;font-weight:700">
              ⚡ Instant Login: AgroCorp Foods (Buyer)
            </button>
          ` : ''}

        </div>
      </div>
    `;

    // Bind events
    document.getElementById('modal-close')?.addEventListener('click', () => this.close());
    
    document.getElementById('tab-farmer')?.addEventListener('click', () => {
      this.activeTab = 'farmer';
      this.render();
    });
    document.getElementById('tab-admin')?.addEventListener('click', () => {
      this.activeTab = 'admin';
      this.render();
    });
    document.getElementById('tab-buyer')?.addEventListener('click', () => {
      this.activeTab = 'buyer';
      this.render();
    });

    // Farmer events
    document.getElementById('btn-submit-phone')?.addEventListener('click', () => this.handleSendOtp());
    document.getElementById('btn-submit-otp')?.addEventListener('click', () => this.handleVerifyOtp());
    document.getElementById('btn-autofill-otp')?.addEventListener('click', () => {
      const otpInp = document.getElementById('auth-otp-input');
      if (otpInp && this.demoOtp) otpInp.value = this.demoOtp;
    });
    document.getElementById('btn-back-phone')?.addEventListener('click', () => {
      this.step = 'phone';
      this.render();
    });
    document.getElementById('btn-quick-farmer')?.addEventListener('click', () => this.handleQuickDemo('farmer'));

    // Admin events
    document.getElementById('btn-submit-admin')?.addEventListener('click', () => this.handleAdminLogin());
    document.getElementById('btn-quick-admin')?.addEventListener('click', () => this.handleQuickDemo('admin'));

    // Buyer events
    document.getElementById('btn-submit-buyer')?.addEventListener('click', () => this.handleBuyerLogin());
    document.getElementById('btn-quick-buyer')?.addEventListener('click', () => this.handleQuickDemo('buyer'));
  }
}
