// src/components/AuthModal.js

export class AuthModal {
  constructor(api, onLoginSuccess) {
    this.api = api;
    this.onLoginSuccess = onLoginSuccess;
    this.activeTab = 'farmer'; // 'farmer' | 'admin' | 'buyer'
    this.authMode = 'otp'; // 'otp' | 'password'
    this.step = 'email'; // 'email' | 'otp'
    this.currentEmail = 'ramesh.farmer@krishislot.in';
    this.demoOtp = '';
    this.error = null;
    this.successMessage = null;
    this.isLoading = false;
    this.isRealEmail = false;
    this.emailConfig = null;

    // Password visibility toggles
    this.showLoginPwd = false;
    this.showSavePwd = false;
    this.showAdminPwd = false;
    this.showBuyerPwd = false;

    // Countdown timer for OTP
    this.countdownSeconds = 0;
    this.timerInterval = null;

    // Saved credentials in localStorage
    this.farmerSaved = this.api.getSavedCredential('farmer');
    this.buyerSaved = this.api.getSavedCredential('buyer');
    this.adminSaved = this.api.getSavedCredential('admin');
  }

  async open(defaultTab = 'farmer') {
    this.activeTab = defaultTab;
    this.step = 'email';
    this.error = null;
    this.successMessage = null;
    this.isLoading = false;
    this.isRealEmail = false;
    this.clearIntervalTimer();

    this.farmerSaved = this.api.getSavedCredential('farmer');
    this.buyerSaved = this.api.getSavedCredential('buyer');
    this.adminSaved = this.api.getSavedCredential('admin');

    if (defaultTab === 'farmer') {
      if (this.farmerSaved?.password) {
        this.currentEmail = this.farmerSaved.email || 'ramesh.farmer@krishislot.in';
        this.authMode = 'password';
      } else {
        this.currentEmail = 'ramesh.farmer@krishislot.in';
        this.authMode = 'otp';
      }
    } else if (defaultTab === 'admin') {
      this.currentEmail = this.adminSaved?.identifier || 'admin@krishislot.in';
      this.authMode = 'password';
    } else if (defaultTab === 'buyer') {
      this.currentEmail = this.buyerSaved?.identifier || 'buyer@agrocorp.in';
      this.authMode = 'password';
    }

    this.render();

    // Check live gateway status from server
    try {
      this.emailConfig = await this.api.getEmailStatus();
      this.render();
    } catch {
      // ignore
    }
  }

  close() {
    this.clearIntervalTimer();
    const el = document.getElementById('auth-modal-root');
    if (el) el.innerHTML = '';
  }

  clearIntervalTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startResendTimer(seconds = 60) {
    this.clearIntervalTimer();
    this.countdownSeconds = seconds;
    this.timerInterval = setInterval(() => {
      this.countdownSeconds--;
      const timerSpan = document.getElementById('auth-timer-display');
      const resendBtn = document.getElementById('btn-resend-email-otp');
      if (timerSpan) {
        timerSpan.textContent = `(${this.countdownSeconds}s)`;
      }
      if (this.countdownSeconds <= 0) {
        this.clearIntervalTimer();
        if (timerSpan) timerSpan.textContent = '';
        if (resendBtn) resendBtn.removeAttribute('disabled');
      }
    }, 1000);
  }

  // --- EMAIL OTP FLOW ---
  async handleSendOtp(emailOverride = null) {
    if (this.isLoading) return;

    const input = document.getElementById('auth-email-input');
    const email = (emailOverride || (input ? input.value : '')).trim().toLowerCase();

    if (!email || !email.includes('@') || email.length < 5) {
      this.error = 'Please enter a valid email address (e.g. farmer@krishislot.in).';
      this.render();
      return;
    }

    this.currentEmail = email;
    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const res = await this.api.sendEmailOtp(email);
      this.isLoading = false;
      this.isRealEmail = Boolean(res.isRealEmail);
      this.demoOtp = null;
      this.step = 'otp';
      this.successMessage = res.message || `Verification code sent to ${email}`;
      this.render();
      this.startResendTimer(60);
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Failed to dispatch email verification code.';
      this.render();
    }
  }

  async handleVerifyOtp() {
    const otpInput = document.getElementById('auth-otp-input');
    const otp = otpInput ? otpInput.value.trim() : '';
    const newPwdInput = document.getElementById('auth-save-pwd-input');
    const savePassword = newPwdInput ? newPwdInput.value.trim() : '';
    const rememberCheckbox = document.getElementById('auth-save-pwd-remember');
    const remember = rememberCheckbox ? rememberCheckbox.checked : true;

    if (!otp || otp.length < 4) {
      this.error = 'Please enter the 6-digit verification code sent to your email.';
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const res = await this.api.verifyEmailOtp(this.currentEmail, otp, savePassword || null);
      this.isLoading = false;

      if (savePassword && remember) {
        this.api.setSavedCredential(this.activeTab, {
          email: this.currentEmail,
          identifier: this.currentEmail,
          password: savePassword
        });
      }

      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Verification failed. Please check the code.';
      this.render();
    }
  }

  // --- PASSWORD LOGIN (FARMER / BUYER / ADMIN) ---
  async handlePasswordLogin() {
    const identInput = document.getElementById('auth-pwd-ident-input');
    const pwdInput = document.getElementById('auth-pwd-input');
    const identifier = identInput ? identInput.value.trim() : '';
    const password = pwdInput ? pwdInput.value : '';
    const rememberCheckbox = document.getElementById('auth-remember-password-checkbox');
    const remember = rememberCheckbox ? rememberCheckbox.checked : true;

    if (!identifier) {
      this.error = this.activeTab === 'farmer' 
        ? 'Please enter your registered email.' 
        : 'Please enter your ID or Email.';
      this.render();
      return;
    }

    if (!password) {
      this.error = 'Please enter your password.';
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      let res;
      if (this.activeTab === 'admin') {
        res = await this.api.loginStaff(identifier, password);
      } else if (this.activeTab === 'buyer') {
        res = await this.api.loginBuyer(identifier, password);
      } else {
        res = await this.api.loginWithEmailPassword(identifier, password);
      }

      this.isLoading = false;

      if (remember) {
        this.api.setSavedCredential(this.activeTab, {
          email: identifier,
          identifier,
          password
        });
      } else {
        this.api.setSavedCredential(this.activeTab, null);
      }

      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Login failed. Please check your credentials.';
      this.render();
    }
  }

  // --- 1-CLICK INSTANT DEMO ---
  async handleQuickDemo(role) {
    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const res = await this.api.quickSwitch(role);
      this.isLoading = false;
      this.close();
      if (this.onLoginSuccess) this.onLoginSuccess(res.user);
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Instant login failed';
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

    const savedFarmer = this.api.getSavedCredential('farmer');
    const savedBuyer = this.api.getSavedCredential('buyer');
    const savedAdmin = this.api.getSavedCredential('admin');

    // Identifiers for the active tab (no hardcoded passwords)
    let defaultIdent = '';
    let defaultPwd = '';
    if (this.activeTab === 'farmer') {
      defaultIdent = savedFarmer?.email || savedFarmer?.identifier || this.currentEmail || '';
    } else if (this.activeTab === 'admin') {
      defaultIdent = savedAdmin?.identifier || '';
    } else {
      defaultIdent = savedBuyer?.identifier || '';
    }

    container.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-window auth-modal-box">
          <button id="modal-close" class="modal-close-btn" aria-label="Close modal">✕</button>

          <!-- Modal Brand Header -->
          <div class="auth-brand-header">
            <div class="auth-brand-icon">🌱</div>
            <h2 class="auth-brand-title">KrishiSlot Login</h2>
            <p class="auth-brand-subtitle">Smart Mandi Slot Booking & Unified Procurement</p>
          </div>

          <!-- 3 Role Tabs -->
          <div class="auth-role-tabs">
            <button id="tab-farmer" class="auth-tab-btn ${this.activeTab === 'farmer' ? 'active' : ''}">
              🌾 Farmer
            </button>
            <button id="tab-admin" class="auth-tab-btn ${this.activeTab === 'admin' ? 'active' : ''}">
              🛡️ Admin
            </button>
            <button id="tab-buyer" class="auth-tab-btn ${this.activeTab === 'buyer' ? 'active' : ''}">
              🛒 Buyer
            </button>
          </div>

          <!-- Feedback Alerts -->
          ${this.error ? `
            <div class="auth-alert error">
              <span>⚠️</span>
              <span style="flex:1">${this.error}</span>
            </div>
          ` : ''}

          ${this.successMessage ? `
            <div class="auth-alert success">
              <span>✅</span>
              <span style="flex:1">${this.successMessage}</span>
            </div>
          ` : ''}

          <!-- Role Description Banner -->
          <div class="auth-role-header">
            <strong>${
              this.activeTab === 'farmer' ? '🌾 Farmer / Crop Seller Portal' :
              this.activeTab === 'admin' ? '🛡️ APMC Admin & Mandi Command' :
              '🛒 Commercial Buyer & Trader Portal'
            }</strong>
            <span>${
              this.activeTab === 'farmer' ? 'Book slots, track real-time queue, J-Forms & DBT payments' :
              this.activeTab === 'admin' ? 'Manage procurement centres, call tokens & weighment assays' :
              'Browse arrival lots, place verified bids & download gate passes'
            }</span>
          </div>

          <!-- Real Gmail Gateway Status Badge -->
          ${this.emailConfig?.configured ? `
            <div class="auth-gateway-badge active" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:9px 12px;font-size:12px;color:#1e40af;margin-bottom:14px;display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">🟢</span>
              <div>
                <b>Live Gmail Gateway Active:</b> Real OTP will be sent to your Gmail inbox from <code>${this.emailConfig.senderEmail}</code>.
              </div>
            </div>
          ` : `
            <div class="auth-gateway-badge demo" style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:9px 12px;font-size:12px;color:#854d0e;margin-bottom:14px;display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">💡</span>
              <div>
                <b>Real Gmail Delivery:</b> Set <code>GMAIL_USER</code> & <code>GMAIL_APP_PASSWORD</code> in <code>.env</code> for live inbox delivery.
              </div>
            </div>
          `}

          <!-- Mode Switcher: Email OTP vs Password -->
          <div class="auth-mode-switch">
            <button id="mode-pill-otp" class="auth-mode-pill ${this.authMode === 'otp' ? 'active' : ''}">
              📧 Email OTP Login
            </button>
            <button id="mode-pill-password" class="auth-mode-pill ${this.authMode === 'password' ? 'active' : ''}">
              🔑 Password Login
            </button>
          </div>

          <!-- ========================================== -->
          <!-- MODE 1: EMAIL OTP FLOW                      -->
          <!-- ========================================== -->
          ${this.authMode === 'otp' ? `
            ${this.step === 'email' ? `
              <!-- Step A: Enter Email Address -->
              <form id="email-otp-send-form" action="#" onsubmit="return false;">
                <div class="form-field">
                  <label for="auth-email-input">Your Gmail / Registered Email</label>
                  <div class="auth-input-icon-wrapper">
                    <span class="auth-input-icon">✉️</span>
                    <input 
                      id="auth-email-input" 
                      name="email"
                      type="email" 
                      value="${this.currentEmail || ''}" 
                      placeholder="Enter your Gmail address (e.g. name@gmail.com)" 
                      autocomplete="email"
                      required
                    />
                  </div>
                </div>

                <div class="auth-info-note">
                  📬 <b>Real Gmail Delivery:</b> A 6-digit verification code will be sent to your Gmail inbox.
                </div>

                <button id="btn-submit-email" type="submit" class="cta auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
                  ${this.isLoading ? '⏳ Sending OTP to Email...' : 'Get OTP on Email / ओटीपी प्राप्त करें →'}
                </button>

                <div class="auth-footer-link">
                  <button type="button" id="btn-switch-to-pwd-mode" class="auth-link-btn">
                    Already have a password? Login with Password →
                  </button>
                </div>
              </form>
            ` : `
              <!-- Step B: Verify OTP Code -->
              <form id="email-otp-verify-form" action="#" onsubmit="return false;">
                <div class="form-field">
                  <label for="auth-otp-input">
                    Enter 6-Digit Code sent to <b>${this.currentEmail}</b>
                  </label>
                  <input 
                    id="auth-otp-input" 
                    name="otp"
                    type="text" 
                    placeholder="Enter 6-digit OTP from Gmail" 
                    maxlength="6" 
                    class="auth-otp-field"
                    autocomplete="one-time-code"
                    autofocus
                    required
                  />
                </div>

                <div class="auth-real-gmail-banner" style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px;margin-bottom:16px">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                    <span style="font-size:22px">📬</span>
                    <div>
                      <b style="color:#166534;font-size:13.5px">Real Gmail OTP Sent!</b>
                      <div style="font-size:12px;color:#15803d">
                        Sent to your inbox: <b>${this.currentEmail}</b>
                      </div>
                    </div>
                  </div>
                  <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 10px;font-size:12px;color:#92400e;line-height:1.4">
                    ⚠️ <b>Check SPAM / JUNK Folder:</b> Google often filters automated emails into your <u>Spam / Junk</u> folder or Promotions tab. Please check there if not in Primary inbox!
                  </div>
                </div>

                <!-- Optional Save Password -->
                <div class="auth-save-box">
                  <div class="auth-save-header">
                    <span>🔒 Set / Remember Password (Optional)</span>
                  </div>
                  <p style="font-size:11.5px;color:#64748b;margin-bottom:8px">
                    Save a password to login instantly next time without waiting for an email code!
                  </p>
                  <div class="auth-pwd-wrapper">
                    <input 
                      id="auth-save-pwd-input" 
                      name="new-password"
                      type="${this.showSavePwd ? 'text' : 'password'}" 
                      placeholder="Create password (e.g. farmer123)" 
                      autocomplete="new-password"
                      value="${savedFarmer?.password || ''}"
                    />
                    <button type="button" id="btn-toggle-save-pwd" class="auth-eye-btn" title="Toggle visibility">
                      ${this.showSavePwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <label class="auth-checkbox-row">
                    <input id="auth-save-pwd-remember" type="checkbox" checked />
                    <span>Remember credentials on this device</span>
                  </label>
                </div>

                <button id="btn-submit-otp" type="submit" class="cta auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
                  ${this.isLoading ? '⏳ Verifying Code...' : 'Verify OTP & Enter / सत्यापित करें →'}
                </button>

                <div class="auth-verify-actions">
                  <button type="button" id="btn-back-email" class="auth-link-btn" style="color:#64748b">
                    ← Change Email
                  </button>
                  <button type="button" id="btn-resend-email-otp" class="auth-link-btn" ${this.countdownSeconds > 0 ? 'disabled' : ''}>
                    Resend Code <span id="auth-timer-display">${this.countdownSeconds > 0 ? `(${this.countdownSeconds}s)` : ''}</span>
                  </button>
                </div>
              </form>
            `}
          ` : `
            <!-- ========================================== -->
            <!-- MODE 2: PASSWORD LOGIN FLOW                 -->
            <!-- ========================================== -->
            <form id="password-login-form" action="#" onsubmit="return false;">
              <div class="form-field">
                <label for="auth-pwd-ident-input">
                  ${this.activeTab === 'farmer' ? 'Registered Email / ईमेल पता' :
                    this.activeTab === 'admin' ? 'Staff ID or Admin Email' :
                    'Buyer ID or Commercial Email'}
                </label>
                <div class="auth-input-icon-wrapper">
                  <span class="auth-input-icon">👤</span>
                  <input 
                    id="auth-pwd-ident-input" 
                    name="username"
                    type="${this.activeTab === 'farmer' ? 'email' : 'text'}" 
                    value="${defaultIdent}" 
                    placeholder="${
                      this.activeTab === 'farmer' ? 'ramesh.farmer@krishislot.in' :
                      this.activeTab === 'admin' ? 'APMC-ADMIN or admin@krishislot.in' :
                      'BUYER-01 or buyer@agrocorp.in'
                    }" 
                    autocomplete="username"
                    required
                  />
                </div>
              </div>

              <div class="form-field">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                  <label for="auth-pwd-input" style="margin:0">Password / पासवर्ड</label>
                  <button type="button" id="btn-switch-to-otp-reset" class="auth-link-btn" style="font-size:11.5px">
                    Forgot Password? Login with OTP
                  </button>
                </div>
                <div class="auth-pwd-wrapper">
                  <input 
                    id="auth-pwd-input" 
                    name="password"
                    type="${this.showLoginPwd ? 'text' : 'password'}" 
                    value="" 
                    placeholder="Enter your password" 
                    autocomplete="current-password"
                    required
                  />
                  <button type="button" id="btn-toggle-login-pwd" class="auth-eye-btn" title="Toggle visibility">
                    ${this.showLoginPwd ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style="margin-bottom:14px">
                <label class="auth-checkbox-row">
                  <input id="auth-remember-password-checkbox" type="checkbox" checked />
                  <span>Remember me on this device</span>
                </label>
              </div>

              <button id="btn-submit-pwd-login" type="submit" class="cta auth-submit-btn" ${this.isLoading ? 'disabled' : ''}>
                ${this.isLoading ? '⏳ Authenticating...' : 'Login with Password →'}
              </button>

              <div class="auth-footer-link">
                <button type="button" id="btn-switch-to-otp-mode" class="auth-link-btn">
                  ← Or Login using 1-Time Email OTP Code
                </button>
              </div>
            </form>
          `}

          <!-- 1-Click Demo Shortcut -->
          <div class="auth-divider">
            <div class="auth-divider-line"></div>
            <span class="auth-divider-text">OR 1-CLICK INSTANT DEMO</span>
            <div class="auth-divider-line"></div>
          </div>

          <button id="btn-quick-active-role" type="button" class="btn-secondary auth-quick-btn">
            ⚡ Instant Login: ${
              this.activeTab === 'farmer' ? 'Farmer Ramesh Kumar' :
              this.activeTab === 'admin' ? 'APMC Director Dr. Alok Nath' :
              'Commercial Buyer Vikram (AgroCorp)'
            }
          </button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Modal Close
    document.getElementById('modal-close')?.addEventListener('click', () => this.close());

    // Role Tab Switching
    document.getElementById('tab-farmer')?.addEventListener('click', () => {
      this.activeTab = 'farmer';
      this.step = 'email';
      this.currentEmail = this.farmerSaved?.email || '';
      this.error = null;
      this.successMessage = null;
      this.render();
    });

    document.getElementById('tab-admin')?.addEventListener('click', () => {
      this.activeTab = 'admin';
      this.step = 'email';
      this.currentEmail = this.adminSaved?.identifier || '';
      this.authMode = 'password';
      this.error = null;
      this.successMessage = null;
      this.render();
    });

    document.getElementById('tab-buyer')?.addEventListener('click', () => {
      this.activeTab = 'buyer';
      this.step = 'email';
      this.currentEmail = this.buyerSaved?.identifier || '';
      this.authMode = 'password';
      this.error = null;
      this.successMessage = null;
      this.render();
    });

    // Mode Switching (OTP vs Password)
    document.getElementById('mode-pill-otp')?.addEventListener('click', () => {
      this.authMode = 'otp';
      this.step = 'email';
      this.error = null;
      this.render();
    });

    document.getElementById('mode-pill-password')?.addEventListener('click', () => {
      this.authMode = 'password';
      this.error = null;
      this.render();
    });

    document.getElementById('btn-switch-to-pwd-mode')?.addEventListener('click', () => {
      this.authMode = 'password';
      this.error = null;
      this.render();
    });

    document.getElementById('btn-switch-to-otp-mode')?.addEventListener('click', () => {
      this.authMode = 'otp';
      this.step = 'email';
      this.error = null;
      this.render();
    });

    document.getElementById('btn-switch-to-otp-reset')?.addEventListener('click', () => {
      this.authMode = 'otp';
      this.step = 'email';
      this.error = null;
      this.render();
    });

    // Password Visibility Toggles
    document.getElementById('btn-toggle-login-pwd')?.addEventListener('click', () => {
      this.showLoginPwd = !this.showLoginPwd;
      const inp = document.getElementById('auth-pwd-input');
      if (inp) inp.type = this.showLoginPwd ? 'text' : 'password';
      const btn = document.getElementById('btn-toggle-login-pwd');
      if (btn) btn.textContent = this.showLoginPwd ? '🙈' : '👁️';
    });

    document.getElementById('btn-toggle-save-pwd')?.addEventListener('click', () => {
      this.showSavePwd = !this.showSavePwd;
      const inp = document.getElementById('auth-save-pwd-input');
      if (inp) inp.type = this.showSavePwd ? 'text' : 'password';
      const btn = document.getElementById('btn-toggle-save-pwd');
      if (btn) btn.textContent = this.showSavePwd ? '🙈' : '👁️';
    });

    // Form Submissions (guard against duplicate triggers)
    document.getElementById('email-otp-send-form')?.addEventListener('submit', (e) => {
      e?.preventDefault();
      this.handleSendOtp();
    });

    document.getElementById('email-otp-verify-form')?.addEventListener('submit', (e) => {
      e?.preventDefault();
      this.handleVerifyOtp();
    });
    document.getElementById('btn-submit-otp')?.addEventListener('click', () => this.handleVerifyOtp());

    document.getElementById('password-login-form')?.addEventListener('submit', (e) => {
      e?.preventDefault();
      this.handlePasswordLogin();
    });
    document.getElementById('btn-submit-pwd-login')?.addEventListener('click', () => this.handlePasswordLogin());

    // Back to change email
    document.getElementById('btn-back-email')?.addEventListener('click', () => {
      this.step = 'email';
      this.error = null;
      this.clearIntervalTimer();
      this.render();
    });

    // Resend OTP
    document.getElementById('btn-resend-email-otp')?.addEventListener('click', () => {
      if (this.countdownSeconds <= 0) {
        this.handleSendOtp(this.currentEmail);
      }
    });

    // 1-Click Instant Demo Button
    document.getElementById('btn-quick-active-role')?.addEventListener('click', () => {
      this.handleQuickDemo(this.activeTab);
    });
  }
}
