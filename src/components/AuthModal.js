// src/components/AuthModal.js

export class AuthModal {
  constructor(api, onLoginSuccess) {
    this.api = api;
    this.onLoginSuccess = onLoginSuccess;
    this.modalMode = 'login'; // 'login' | 'signup' | 'forgot'
    
    // Login state
    this.activeTab = 'farmer'; // 'farmer' | 'buyer' | 'admin'
    this.loginIdentifier = '';
    this.loginPassword = '';
    this.showLoginPwd = false;

    // Signup multi-step wizard state
    // Step 1: Enter Gmail
    // Step 2: Verify Gmail OTP
    // Step 3: Choose unique username & set password
    // Step 4: Account created successfully -> redirect to Login
    this.signupStep = 1;
    this.signupEmail = '';
    this.signupOtp = '';
    this.signupToken = '';
    this.signupUsername = '';
    this.signupFullName = '';
    this.signupPhone = '';
    this.signupPassword = '';
    this.signupConfirmPassword = '';
    this.signupRole = 'farmer'; // 'farmer' | 'buyer'
    this.signupVillage = '';
    this.signupAcres = '';
    this.signupCompany = '';
    this.signupLicense = '';
    this.showSignupPwd = false;
    this.usernameStatus = null; // { available: boolean, message: string }

    // Forgot Password multi-step wizard state
    // Step 1: Enter Gmail
    // Step 2: Verify OTP
    // Step 3: Create New Password
    // Step 4: Password reset successfully -> redirect to Login
    this.forgotStep = 1;
    this.forgotEmail = '';
    this.forgotOtp = '';
    this.forgotToken = '';
    this.forgotPassword = '';
    this.forgotConfirmPassword = '';
    this.showForgotPwd = false;

    // General state
    this.error = null;
    this.successMessage = null;
    this.isLoading = false;
    this.countdownSeconds = 0;
    this.timerInterval = null;
  }

  open(defaultTab = 'farmer', mode = 'login') {
    this.modalMode = mode;
    this.activeTab = defaultTab;
    this.signupRole = defaultTab;
    this.error = null;
    this.successMessage = null;
    this.isLoading = false;
    this.clearIntervalTimer();

    if (mode === 'signup') {
      this.signupStep = 1;
      this.signupEmail = '';
      this.signupOtp = '';
      this.signupToken = '';
      this.signupUsername = '';
      this.signupPassword = '';
      this.signupConfirmPassword = '';
      this.usernameStatus = null;
    } else if (mode === 'forgot') {
      this.forgotStep = 1;
      this.forgotEmail = '';
      this.forgotOtp = '';
      this.forgotToken = '';
      this.forgotPassword = '';
      this.forgotConfirmPassword = '';
    }

    this.render();
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

  startResendTimer(seconds = 60, targetDisplayId = 'auth-timer-display', btnId = 'btn-resend-otp') {
    this.clearIntervalTimer();
    this.countdownSeconds = seconds;
    this.timerInterval = setInterval(() => {
      this.countdownSeconds--;
      const timerSpan = document.getElementById(targetDisplayId);
      const resendBtn = document.getElementById(btnId);
      if (timerSpan) {
        timerSpan.textContent = this.countdownSeconds > 0 ? `(${this.countdownSeconds}s)` : '';
      }
      if (this.countdownSeconds <= 0) {
        this.clearIntervalTimer();
        if (resendBtn) resendBtn.removeAttribute('disabled');
      }
    }, 1000);
  }

  // ============================================================================
  // SIGNUP FLOW ACTIONS
  // ============================================================================

  // Step 1 -> Step 2: Send OTP to Gmail
  async handleSendSignupOtp() {
    if (this.isLoading) return;

    const emailInp = document.getElementById('signup-email-input');
    const rawEmail = (emailInp ? emailInp.value : '').trim();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      this.error = 'Please enter a valid Gmail / Email address (e.g. yourname@gmail.com).';
      this.render();
      return;
    }

    this.signupEmail = rawEmail.toLowerCase();
    this.isLoading = true;
    this.error = null;
    this.successMessage = null;
    this.render();

    try {
      const res = await this.api.sendSignupOtp(this.signupEmail);
      this.isLoading = false;
      this.signupStep = 2;
      this.successMessage = res.message || 'OTP sent to your email';
      if (res.providerNotice) {
        this.error = res.providerNotice;
      }
      this.render();
      this.startResendTimer(60, 'signup-timer-display', 'btn-resend-signup-otp');
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Failed to send OTP. Please try again.';
      this.render();
    }
  }

  // Step 2 -> Step 3: Verify OTP
  async handleVerifySignupOtp() {
    if (this.isLoading) return;

    const otpInp = document.getElementById('signup-otp-input');
    const otp = otpInp ? otpInp.value.trim() : '';

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      this.error = 'Please enter the valid 6-digit OTP sent to your email.';
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const res = await this.api.verifySignupOtp(this.signupEmail, otp);
      this.isLoading = false;
      this.signupToken = res.signupToken;
      this.signupStep = 3;
      this.successMessage = 'Email verified successfully! Now choose your unique username & password.';
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Invalid OTP. Please check and try again.';
      this.render();
    }
  }

  // Real-time or on-blur username availability check
  async handleCheckUsername(username) {
    const clean = String(username || '').trim().toLowerCase();
    if (!clean || clean.length < 3) {
      this.usernameStatus = null;
      return;
    }

    try {
      const res = await this.api.checkUsername(clean);
      this.usernameStatus = res;
      const statusEl = document.getElementById('username-availability-badge');
      if (statusEl) {
        if (res.available) {
          statusEl.innerHTML = `<span style="color:#15803d;font-weight:700">✅ ${res.message}</span>`;
        } else {
          statusEl.innerHTML = `<span style="color:#dc2626;font-weight:700">❌ ${res.error || res.message}</span>`;
        }
      }
    } catch {
      // ignore network glitch on blur
    }
  }

  // Step 4 & 5: Create Account in MongoDB
  async handleCompleteSignup() {
    if (this.isLoading) return;

    const usernameInp = document.getElementById('signup-username-input');
    const nameInp = document.getElementById('signup-fullname-input');
    const phoneInp = document.getElementById('signup-phone-input');
    const pwdInp = document.getElementById('signup-pwd-input');
    const confirmPwdInp = document.getElementById('signup-confirm-pwd-input');
    const villageInp = document.getElementById('signup-village-input');
    const acresInp = document.getElementById('signup-acres-input');
    const companyInp = document.getElementById('signup-company-input');
    const licenseInp = document.getElementById('signup-license-input');

    const username = usernameInp ? usernameInp.value.trim().toLowerCase() : '';
    const name = nameInp ? nameInp.value.trim() : '';
    const phone = phoneInp ? phoneInp.value.replace(/\D/g, '').slice(-10) : '';
    const password = pwdInp ? pwdInp.value : '';
    const confirmPassword = confirmPwdInp ? confirmPwdInp.value : '';

    // Validations
    if (!username) {
      this.error = 'Please enter a username.';
      this.render();
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      this.error = 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.';
      this.render();
      return;
    }

    if (!password || password.length < 8) {
      this.error = 'Password must be at least 8 characters long.';
      this.render();
      return;
    }

    if (password !== confirmPassword) {
      this.error = 'Confirm password must match the password.';
      this.render();
      return;
    }

    const payload = {
      signupToken: this.signupToken,
      username,
      name: name || username,
      phone: phone || '',
      password,
      confirmPassword,
      role: this.signupRole || 'farmer',
      village: villageInp ? villageInp.value.trim() : '',
      landAcres: acresInp ? Number(acresInp.value) : 0,
      company: companyInp ? companyInp.value.trim() : '',
      mandiLicense: licenseInp ? licenseInp.value.trim() : ''
    };

    this.isLoading = true;
    this.error = null;
    this.successMessage = null;
    this.render();

    try {
      const res = await this.api.signup(payload);
      this.isLoading = false;
      this.signupStep = 4;
      this.successMessage = 'Account created successfully';
      this.render();

      // Automatically redirect to Login after 2 seconds
      setTimeout(() => {
        this.modalMode = 'login';
        this.loginIdentifier = username;
        this.successMessage = 'Account created successfully! Please login with your new credentials.';
        this.error = null;
        this.render();
      }, 2000);
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Account creation failed. Please check your details.';
      this.render();
    }
  }

  // ============================================================================
  // LOGIN FLOW ACTIONS (Username OR Gmail + Password)
  // ============================================================================

  async handleLogin() {
    if (this.isLoading) return;

    const identInp = document.getElementById('login-ident-input');
    const pwdInp = document.getElementById('login-pwd-input');
    const identifier = identInp ? identInp.value.trim() : '';
    const password = pwdInp ? pwdInp.value : '';

    if (!identifier || !password) {
      this.error = 'Please enter both your Username/Email and password.';
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.successMessage = null;
    this.render();

    try {
      const res = await this.api.login(identifier, password, this.activeTab);
      this.isLoading = false;
      this.close();
      if (this.onLoginSuccess) {
        this.onLoginSuccess(res.user);
      }
    } catch (err) {
      this.isLoading = false;
      // Exact requirement: "Invalid username/email or password"
      this.error = err.message || 'Invalid username/email or password';
      this.render();
    }
  }

  // ============================================================================
  // FORGOT PASSWORD FLOW ACTIONS
  // ============================================================================

  // Step 1 -> Step 2: Send Reset OTP
  async handleSendResetOtp() {
    if (this.isLoading) return;

    const emailInp = document.getElementById('forgot-email-input');
    const rawEmail = (emailInp ? emailInp.value : '').trim();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      this.error = 'Please enter your registered Gmail / Email address.';
      this.render();
      return;
    }

    this.forgotEmail = rawEmail.toLowerCase();
    this.isLoading = true;
    this.error = null;
    this.successMessage = null;
    this.render();

    try {
      const res = await this.api.sendResetOtp(this.forgotEmail);
      this.isLoading = false;
      this.forgotStep = 2;
      this.successMessage = res.message || 'OTP sent to your email';
      if (res.providerNotice) {
        this.error = res.providerNotice;
      }
      this.render();
      this.startResendTimer(60, 'forgot-timer-display', 'btn-resend-forgot-otp');
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Failed to send OTP. Please check your email.';
      this.render();
    }
  }

  // Step 2 -> Step 3: Verify Reset OTP
  async handleVerifyResetOtp() {
    if (this.isLoading) return;

    const otpInp = document.getElementById('forgot-otp-input');
    const otp = otpInp ? otpInp.value.trim() : '';

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      this.error = 'Please enter the valid 6-digit OTP sent to your email.';
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const res = await this.api.verifyResetOtp(this.forgotEmail, otp);
      this.isLoading = false;
      this.forgotToken = res.resetToken;
      this.forgotStep = 3;
      this.successMessage = 'OTP verified successfully. Please enter your new password.';
      this.render();
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Invalid OTP. Please try again.';
      this.render();
    }
  }

  // Step 3 -> Step 4: Reset Password
  async handleResetPasswordSubmit() {
    if (this.isLoading) return;

    const pwdInp = document.getElementById('forgot-new-pwd-input');
    const confirmPwdInp = document.getElementById('forgot-confirm-pwd-input');
    const newPassword = pwdInp ? pwdInp.value : '';
    const confirmNewPassword = confirmPwdInp ? confirmPwdInp.value : '';

    if (!newPassword || newPassword.length < 8) {
      this.error = 'New password must be at least 8 characters long.';
      this.render();
      return;
    }

    if (newPassword !== confirmNewPassword) {
      this.error = 'Confirm password must match the new password.';
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.successMessage = null;
    this.render();

    try {
      const res = await this.api.resetPassword({
        email: this.forgotEmail,
        resetToken: this.forgotToken,
        newPassword,
        confirmNewPassword
      });

      this.isLoading = false;
      this.forgotStep = 4;
      this.successMessage = res.message || 'Password reset successfully';
      this.render();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.modalMode = 'login';
        this.loginIdentifier = this.forgotEmail;
        this.successMessage = 'Password reset successfully! Please log in with your new password.';
        this.error = null;
        this.render();
      }, 2000);
    } catch (err) {
      this.isLoading = false;
      this.error = err.message || 'Failed to reset password. Please try again.';
      this.render();
    }
  }


  // ============================================================================
  // VIEW RENDERING
  // ============================================================================

  render() {
    let root = document.getElementById('auth-modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'auth-modal-root';
      document.body.appendChild(root);
    }

    const isLogin = this.modalMode === 'login';
    const isSignup = this.modalMode === 'signup';
    const isForgot = this.modalMode === 'forgot';

    let headerTitle = 'AgriQueue Official Gateway';
    let headerSubtitle = 'Sign in to access APMC slot booking & mandi operations.';

    if (isLogin) {
      if (this.activeTab === 'buyer') {
        headerTitle = '🏢 Commercial Buyer Portal';
        headerSubtitle = 'Sign in to access Mandi arrival lots, live biddings & gate passes.';
      } else if (this.activeTab === 'admin') {
        headerTitle = '🛡️ APMC Mandi Admin Portal';
        headerSubtitle = 'Sign in for Mandi token management, weighbridge & DBT operations.';
      } else {
        headerTitle = '👨‍🌾 Farmer (Seller) Portal';
        headerSubtitle = 'Sign in to book APMC procurement slots, track tokens & live payments.';
      }
    } else if (isSignup) {
      headerTitle = 'Create Your AgriQueue Account';
      headerSubtitle = 'Step-by-step verified registration for farmers, buyers & mandi staff.';
    } else if (isForgot) {
      headerTitle = 'Reset Forgotten Password';
      headerSubtitle = 'Secure OTP-verified password recovery.';
    }

    root.innerHTML = `
      <div class="modal-backdrop active" id="auth-backdrop" style="background:rgba(10, 25, 15, 0.85);backdrop-filter:blur(8px);z-index:99999;padding:16px;display:flex;align-items:center;justify-content:center;position:fixed;inset:0;overflow-y:auto">
        <div class="auth-modal-card" style="background:#ffffff;color:#0f172a;max-width:540px;width:100%;margin:auto;padding:0;overflow:hidden;border-radius:22px;box-shadow:0 30px 80px -15px rgba(0,0,0,0.65), 0 0 0 2px #10b981;border:1px solid #cbd5e1;position:relative">
          
          <!-- Top Modal Header -->
          <div style="background:linear-gradient(135deg, #064e3b 0%, #15803d 100%);padding:24px 28px;color:#ffffff;position:relative">
            <button id="btn-close-auth-modal" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.25);border:none;color:#ffffff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;transition:background 0.2s" title="Close">✕</button>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
              <span style="font-size:28px">🌱</span>
              <div>
                <span style="font-size:20px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;display:block">${headerTitle}</span>
                <span style="font-size:12px;font-weight:600;color:#86efac;text-transform:uppercase;letter-spacing:0.06em">Official Authentication Gateway</span>
              </div>
            </div>
            <p style="margin:0;font-size:14px;color:#ecfdf5;opacity:0.95;line-height:1.5">
              ${headerSubtitle}
            </p>

            ${!isForgot ? `
              <!-- Mode Switcher: Login vs Sign Up -->
              <div style="display:flex;gap:8px;margin-top:18px;background:rgba(0,0,0,0.35);padding:5px;border-radius:12px">
                <button 
                  id="tab-toggle-login" 
                  type="button"
                  style="flex:1;padding:10px 14px;border:none;border-radius:9px;font-weight:800;font-size:14px;cursor:pointer;transition:all 0.2s;background:${isLogin ? '#ffffff' : 'transparent'};color:${isLogin ? '#064e3b' : '#ffffff'};box-shadow:${isLogin ? '0 4px 12px rgba(0,0,0,0.25)' : 'none'}"
                >
                  🌾 Login (लॉग इन)
                </button>
                <button 
                  id="tab-toggle-signup" 
                  type="button"
                  style="flex:1;padding:10px 14px;border:none;border-radius:9px;font-weight:800;font-size:14px;cursor:pointer;transition:all 0.2s;background:${isSignup ? '#ffffff' : 'transparent'};color:${isSignup ? '#064e3b' : '#ffffff'};box-shadow:${isSignup ? '0 4px 12px rgba(0,0,0,0.25)' : 'none'}"
                >
                  ✨ Sign Up (नया खाता)
                </button>
              </div>
            ` : ''}
          </div>

          <div class="auth-body" style="background:#ffffff;color:#0f172a;padding:26px 28px">
            <!-- Global Feedback Alerts -->
            ${this.error ? `
              <div class="auth-error-banner" style="background:#fef2f2;border:2px solid #ef4444;color:#991b1b;padding:14px 16px;border-radius:12px;font-size:14px;font-weight:700;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;box-shadow:0 2px 8px rgba(239,68,68,0.15)">
                <span style="font-size:18px">⚠️</span>
                <span style="flex:1;line-height:1.4">${this.error}</span>
              </div>
            ` : ''}

            ${this.successMessage ? `
              <div style="background:#f0fdf4;border:2px solid #22c55e;color:#166534;padding:14px 16px;border-radius:12px;font-size:14px;font-weight:700;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;box-shadow:0 2px 8px rgba(34,197,94,0.15)">
                <span style="font-size:18px">✅</span>
                <span style="flex:1;line-height:1.4">${this.successMessage}</span>
              </div>
            ` : ''}

            ${isSignup ? this.renderSignupView() : isForgot ? this.renderForgotView() : this.renderLoginView()}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  // ============================================================================
  // 1. SIGNUP STEP-BY-STEP VIEW
  // ============================================================================
  renderSignupView() {
    return `
      <div>
        <!-- Step Progress Indicator -->
        <div style="margin-bottom:24px;background:#f8fafc;padding:12px 16px;border-radius:12px;border:1px solid #e2e8f0">
          <div style="font-size:12px;font-weight:800;color:#047857;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">
            Create Account • Step ${this.signupStep} of 4
          </div>
          <div style="display:flex;gap:6px">
            <div style="flex:1;height:6px;border-radius:3px;background:${this.signupStep >= 1 ? '#10b981' : '#e2e8f0'}"></div>
            <div style="flex:1;height:6px;border-radius:3px;background:${this.signupStep >= 2 ? '#10b981' : '#e2e8f0'}"></div>
            <div style="flex:1;height:6px;border-radius:3px;background:${this.signupStep >= 3 ? '#10b981' : '#e2e8f0'}"></div>
            <div style="flex:1;height:6px;border-radius:3px;background:${this.signupStep >= 4 ? '#10b981' : '#e2e8f0'}"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#64748b;margin-top:6px">
            <span>1. Enter Gmail</span>
            <span>2. Verify OTP</span>
            <span>3. Choose Username</span>
            <span>4. Done</span>
          </div>
        </div>

        ${this.signupStep === 1 ? this.renderSignupStep1() : ''}
        ${this.signupStep === 2 ? this.renderSignupStep2() : ''}
        ${this.signupStep === 3 ? this.renderSignupStep3() : ''}
        ${this.signupStep === 4 ? this.renderSignupStep4() : ''}
      </div>
    `;
  }

  // Signup Step 1: Ask for Gmail
  renderSignupStep1() {
    return `
      <form id="signup-step1-form" onsubmit="return false;">
        <div style="margin-bottom:18px">
          <label for="signup-email-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px;display:block">
            Gmail / Email Address <span style="color:#dc2626">*</span>
          </label>
          <input 
            id="signup-email-input" 
            type="email" 
            placeholder="example@gmail.com" 
            value="${this.signupEmail || ''}"
            required 
            style="width:100%;padding:14px 16px;border:2px solid #94a3b8;border-radius:10px;font-size:16px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
          />
          <div style="font-size:12px;color:#64748b;margin-top:6px">
            We will send a 6-digit verification code to this Gmail address.
          </div>
        </div>

        <button 
          type="button" 
          id="btn-signup-step1-submit" 
          style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 6px 20px -2px rgba(22,163,74,0.45)"
          ${this.isLoading ? 'disabled' : ''}
        >
          ${this.isLoading ? '<span class="pulse-dot"></span> Sending OTP...' : 'Send 6-Digit OTP →'}
        </button>

        <div style="margin-top:20px;text-align:center;font-size:14px;color:#334155;font-weight:600">
          Already registered on AgriQueue? 
          <button type="button" id="link-signup-to-login" style="background:none;border:none;color:#15803d;font-weight:800;cursor:pointer;text-decoration:underline;font-size:14px">
            Log In
          </button>
        </div>
      </form>
    `;
  }

  // Signup Step 2: Verify OTP
  renderSignupStep2() {
    return `
      <div>
        <div style="background:#f0fdf4;padding:14px 16px;border-radius:12px;border:1.5px solid #bbf7d0;text-align:center;margin-bottom:20px">
          <div style="font-size:13px;color:#166534;font-weight:700">OTP sent to your email</div>
          <div style="font-size:16px;font-weight:900;color:#064e3b;margin-top:2px">${this.signupEmail}</div>
        </div>

        <form id="signup-step2-form" onsubmit="return false;">
          <div style="margin-bottom:20px">
            <label for="signup-otp-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px;display:block;text-align:center">
              Enter 6-Digit OTP
            </label>
            <input 
              id="signup-otp-input" 
              type="text" 
              maxlength="6" 
              placeholder="••••••" 
              required 
              style="width:100%;padding:14px;border:2.5px solid #059669;border-radius:10px;font-size:26px;text-align:center;letter-spacing:10px;font-weight:900;color:#0f172a;background:#ffffff;box-sizing:border-box"
            />
          </div>

          <button 
            type="button" 
            id="btn-signup-step2-submit" 
            style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px -2px rgba(22,163,74,0.45)"
            ${this.isLoading ? 'disabled' : ''}
          >
            ${this.isLoading ? '<span class="pulse-dot"></span> Verifying OTP...' : 'Verify OTP & Continue →'}
          </button>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:13px;font-weight:700">
            <button type="button" id="btn-back-to-step1" style="background:none;border:none;color:#64748b;cursor:pointer">
              ← Change Email
            </button>
            <button type="button" id="btn-resend-signup-otp" style="background:none;border:none;color:#15803d;font-weight:800;cursor:pointer" ${this.countdownSeconds > 0 ? 'disabled' : ''}>
              Resend OTP <span id="signup-timer-display"></span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // Signup Step 3: Choose Username & Password
  renderSignupStep3() {
    const isFarmer = this.signupRole === 'farmer' || !this.signupRole;
    const isBuyer = this.signupRole === 'buyer';
    const isAdmin = this.signupRole === 'admin';

    return `
      <div>
        <form id="signup-step3-form" onsubmit="return false;">
          <!-- Role Selection Tabs -->
          <div style="margin-bottom:16px">
            <label style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;display:block">
              Registering As:
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              <button 
                type="button"
                id="signup-role-farmer" 
                style="padding:10px 6px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;transition:all 0.15s;background:${isFarmer ? '#ecfdf5' : '#ffffff'};color:${isFarmer ? '#065f46' : '#334155'};border:2px solid ${isFarmer ? '#059669' : '#cbd5e1'};box-shadow:${isFarmer ? '0 4px 12px rgba(5,150,105,0.2)' : 'none'}"
              >
                👨‍🌾 Farmer (किसान)
              </button>
              <button 
                type="button"
                id="signup-role-buyer" 
                style="padding:10px 6px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;transition:all 0.15s;background:${isBuyer ? '#eff6ff' : '#ffffff'};color:${isBuyer ? '#1e40af' : '#334155'};border:2px solid ${isBuyer ? '#2563eb' : '#cbd5e1'};box-shadow:${isBuyer ? '0 4px 12px rgba(37,99,235,0.2)' : 'none'}"
              >
                🏢 Buyer (व्यापारी)
              </button>
              <button 
                type="button"
                id="signup-role-admin" 
                style="padding:10px 6px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;transition:all 0.15s;background:${isAdmin ? '#f1f5f9' : '#ffffff'};color:${isAdmin ? '#0f172a' : '#334155'};border:2px solid ${isAdmin ? '#475569' : '#cbd5e1'};box-shadow:${isAdmin ? '0 4px 12px rgba(71,85,105,0.2)' : 'none'}"
              >
                🏛️ Mandi Admin
              </button>
            </div>
          </div>

          <!-- Unique Username Field -->
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <label for="signup-username-input" style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:0">
                Choose Unique Username <span style="color:#dc2626">*</span>
              </label>
              <span id="username-availability-badge" style="font-size:12px"></span>
            </div>
            <input 
              id="signup-username-input" 
              type="text" 
              placeholder="e.g. vansh123" 
              value="${this.signupUsername || ''}"
              required 
              style="width:100%;padding:12px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
            />
            <div style="font-size:11px;color:#64748b;margin-top:4px">
              3-20 characters (letters, numbers, underscore). Must be completely unique.
            </div>
          </div>

          <!-- Password & Confirm Password Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div>
              <label for="signup-pwd-input" style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
                Password (min 8) <span style="color:#dc2626">*</span>
              </label>
              <div style="position:relative">
                <input 
                  id="signup-pwd-input" 
                  type="${this.showSignupPwd ? 'text' : 'password'}" 
                  placeholder="••••••••" 
                  required 
                  style="width:100%;padding:12px 40px 12px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
                />
                <button 
                  type="button" 
                  id="btn-toggle-signup-pwd" 
                  style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#475569"
                >
                  ${this.showSignupPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label for="signup-confirm-pwd-input" style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
                Confirm Password <span style="color:#dc2626">*</span>
              </label>
              <input 
                id="signup-confirm-pwd-input" 
                type="${this.showSignupPwd ? 'text' : 'password'}" 
                placeholder="••••••••" 
                required 
                style="width:100%;padding:12px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
              />
            </div>
          </div>

          <!-- Full Name & Mobile -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
            <div>
              <label for="signup-fullname-input" style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
                Full Name
              </label>
              <input 
                id="signup-fullname-input" 
                type="text" 
                placeholder="e.g. Enter your full name" 
                style="width:100%;padding:12px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:14px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
              />
            </div>

            <div>
              <label for="signup-phone-input" style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
                Mobile Number
              </label>
              <input 
                id="signup-phone-input" 
                type="tel" 
                maxlength="10" 
                placeholder="9876543210" 
                style="width:100%;padding:12px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:14px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
              />
            </div>
          </div>

          <!-- Role-specific optional inputs -->
          ${isFarmer ? `
            <div style="background:#f0fdf4;padding:12px;border-radius:10px;border:1.5px solid #bbf7d0;margin-bottom:16px">
              <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;margin-bottom:6px">Farmer Details (Optional)</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <input id="signup-village-input" type="text" placeholder="Village / District" style="width:100%;padding:9px 12px;border:1px solid #86efac;border-radius:8px;font-size:13px;box-sizing:border-box" />
                <input id="signup-acres-input" type="number" step="0.5" placeholder="Land (Acres)" style="width:100%;padding:9px 12px;border:1px solid #86efac;border-radius:8px;font-size:13px;box-sizing:border-box" />
              </div>
            </div>
          ` : `
            <div style="background:#eff6ff;padding:12px;border-radius:10px;border:1.5px solid #bfdbfe;margin-bottom:16px">
              <div style="font-size:11px;font-weight:800;color:#1e40af;text-transform:uppercase;margin-bottom:6px">Commercial Buyer Details</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <input id="signup-company-input" type="text" placeholder="Company Name" style="width:100%;padding:9px 12px;border:1px solid #93c5fd;border-radius:8px;font-size:13px;box-sizing:border-box" />
                <input id="signup-license-input" type="text" placeholder="Mandi License / GST" style="width:100%;padding:9px 12px;border:1px solid #93c5fd;border-radius:8px;font-size:13px;box-sizing:border-box" />
              </div>
            </div>
          `}

          <button 
            type="button" 
            id="btn-signup-step3-submit" 
            style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px -2px rgba(22,163,74,0.45)"
            ${this.isLoading ? 'disabled' : ''}
          >
            ${this.isLoading ? '<span class="pulse-dot"></span> Creating Account...' : '✨ Create Account & Finish →'}
          </button>
        </form>
      </div>
    `;
  }

  // Signup Step 4: Success View
  renderSignupStep4() {
    return `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;margin-bottom:12px">🎉</div>
        <h3 style="font-size:22px;font-weight:900;color:#166534;margin:0 0 8px">Account created successfully</h3>
        <p style="font-size:14px;color:#4b5563;margin:0 0 20px">
          Your credentials have been securely stored in MongoDB.<br/>
          Redirecting you to the Login page...
        </p>
        <button 
          type="button" 
          id="btn-goto-login-now" 
          style="padding:12px 28px;font-size:15px;font-weight:800;border-radius:10px;background:#15803d;color:#ffffff;border:none;cursor:pointer"
        >
          Go to Login Now →
        </button>
      </div>
    `;
  }

  // ============================================================================
  // 2. LOGIN VIEW (Single Field: Username OR Gmail + Password)
  // ============================================================================
  renderLoginView() {
    const isFarmer = this.activeTab === 'farmer' || !this.activeTab;
    const isBuyer = this.activeTab === 'buyer';
    const isAdmin = this.activeTab === 'admin';

    let identLabel = 'Username or Gmail';
    let identPlaceholder = 'e.g. vansh123 or example@gmail.com';
    let buttonText = 'Login as Farmer →';

    if (isBuyer) {
      identLabel = 'Buyer ID, Username or Gmail';
      identPlaceholder = 'e.g. BUYER-01, vansh or buyer@gmail.com';
      buttonText = 'Login to Buyer Portal →';
    } else if (isAdmin) {
      identLabel = 'Staff ID, Username or Gmail';
      identPlaceholder = 'e.g. APMC-ADMIN, vansh or staff@gmail.com';
      buttonText = 'Login to Mandi Admin Portal →';
    }

    return `
      <div>
        <form id="auth-unified-login-form" onsubmit="return false;">
          <!-- Role Selection Tabs for Login -->
          <div style="margin-bottom:18px">
            <label style="font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;display:block">
              Select Portal / Role to Access:
            </label>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
              <button 
                type="button"
                id="login-role-farmer" 
                style="padding:10px 6px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;transition:all 0.15s;background:${isFarmer ? '#ecfdf5' : '#ffffff'};color:${isFarmer ? '#065f46' : '#334155'};border:2px solid ${isFarmer ? '#059669' : '#cbd5e1'};box-shadow:${isFarmer ? '0 4px 12px rgba(5,150,105,0.2)' : 'none'}"
              >
                👨‍🌾 Farmer (किसान)
              </button>
              <button 
                type="button"
                id="login-role-buyer" 
                style="padding:10px 6px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;transition:all 0.15s;background:${isBuyer ? '#eff6ff' : '#ffffff'};color:${isBuyer ? '#1e40af' : '#334155'};border:2px solid ${isBuyer ? '#2563eb' : '#cbd5e1'};box-shadow:${isBuyer ? '0 4px 12px rgba(37,99,235,0.2)' : 'none'}"
              >
                🏢 Buyer (व्यापारी)
              </button>
              <button 
                type="button"
                id="login-role-admin" 
                style="padding:10px 6px;font-size:12px;font-weight:800;border-radius:10px;cursor:pointer;transition:all 0.15s;background:${isAdmin ? '#f1f5f9' : '#ffffff'};color:${isAdmin ? '#0f172a' : '#334155'};border:2px solid ${isAdmin ? '#475569' : '#cbd5e1'};box-shadow:${isAdmin ? '0 4px 12px rgba(71,85,105,0.2)' : 'none'}"
              >
                🏛️ Mandi Admin
              </button>
            </div>
          </div>

          <!-- Unified Username OR Gmail Field -->
          <div style="margin-bottom:16px">
            <label for="login-ident-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
              ${identLabel} <span style="color:#dc2626">*</span>
            </label>
            <input 
              id="login-ident-input" 
              type="text" 
              value="${this.loginIdentifier || ''}" 
              placeholder="${identPlaceholder}" 
              required 
              style="width:100%;padding:14px 16px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
            />
          </div>

          <!-- Password Field -->
          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <label for="login-pwd-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:0">
                Password <span style="color:#dc2626">*</span>
              </label>
              <button 
                type="button" 
                id="link-forgot-password" 
                style="background:none;border:none;color:#15803d;font-size:13px;font-weight:800;cursor:pointer;text-decoration:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div style="position:relative">
              <input 
                id="login-pwd-input" 
                type="${this.showLoginPwd ? 'text' : 'password'}" 
                placeholder="Enter your password" 
                required 
                style="width:100%;padding:14px 44px 14px 16px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
              />
              <button 
                type="button" 
                id="btn-toggle-login-pwd" 
                style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:17px;color:#475569"
              >
                ${this.showLoginPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <!-- Login Submit Button -->
          <button 
            type="button" 
            id="btn-submit-login" 
            style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, ${isBuyer ? '#2563eb, #1d4ed8' : isAdmin ? '#334155, #1e293b' : '#16a34a, #15803d'});color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 6px 20px -2px rgba(0,0,0,0.25);transition:transform 0.15s ease"
            ${this.isLoading ? 'disabled' : ''}
          >
            ${this.isLoading ? '<span class="pulse-dot"></span> Authenticating...' : buttonText}
          </button>

          <!-- Don't have an account? Sign Up Link -->
          <div style="margin-top:20px;text-align:center;font-size:14px;color:#334155;font-weight:600">
            Don't have an account? 
            <button type="button" id="link-switch-to-signup" style="background:none;border:none;color:#15803d;font-weight:800;cursor:pointer;text-decoration:underline;font-size:14px">
              Sign Up
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ============================================================================
  // 3. FORGOT PASSWORD STEP-BY-STEP VIEW
  // ============================================================================
  renderForgotView() {
    return `
      <div>
        <!-- Step Progress Indicator -->
        <div style="margin-bottom:20px;background:#f8fafc;padding:12px 16px;border-radius:12px;border:1px solid #e2e8f0">
          <div style="font-size:12px;font-weight:800;color:#047857;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">
            Reset Password • Step ${this.forgotStep} of 3
          </div>
          <div style="display:flex;gap:6px">
            <div style="flex:1;height:6px;border-radius:3px;background:${this.forgotStep >= 1 ? '#10b981' : '#e2e8f0'}"></div>
            <div style="flex:1;height:6px;border-radius:3px;background:${this.forgotStep >= 2 ? '#10b981' : '#e2e8f0'}"></div>
            <div style="flex:1;height:6px;border-radius:3px;background:${this.forgotStep >= 3 ? '#10b981' : '#e2e8f0'}"></div>
          </div>
        </div>

        ${this.forgotStep === 1 ? `
          <form id="forgot-step1-form" onsubmit="return false;">
            <div style="margin-bottom:18px">
              <label for="forgot-email-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px;display:block">
                Registered Gmail / Email <span style="color:#dc2626">*</span>
              </label>
              <input 
                id="forgot-email-input" 
                type="email" 
                placeholder="example@gmail.com" 
                value="${this.forgotEmail || ''}"
                required 
                style="width:100%;padding:14px 16px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
              />
            </div>

            <button 
              type="button" 
              id="btn-forgot-step1-submit" 
              style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px -2px rgba(22,163,74,0.45)"
              ${this.isLoading ? 'disabled' : ''}
            >
              ${this.isLoading ? '<span class="pulse-dot"></span> Sending OTP...' : 'Send Reset OTP →'}
            </button>

            <div style="margin-top:16px;text-align:center">
              <button type="button" id="link-forgot-to-login" style="background:none;border:none;color:#64748b;font-weight:700;font-size:13px;cursor:pointer">
                ← Back to Login
              </button>
            </div>
          </form>
        ` : ''}

        ${this.forgotStep === 2 ? `
          <div>
            <div style="background:#f0fdf4;padding:14px 16px;border-radius:12px;border:1.5px solid #bbf7d0;text-align:center;margin-bottom:20px">
              <div style="font-size:13px;color:#166534;font-weight:700">OTP sent to your email</div>
              <div style="font-size:16px;font-weight:900;color:#064e3b;margin-top:2px">${this.forgotEmail}</div>
            </div>

            <form id="forgot-step2-form" onsubmit="return false;">
              <div style="margin-bottom:20px">
                <label for="forgot-otp-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:8px;display:block;text-align:center">
                  Enter 6-Digit OTP
                </label>
                <input 
                  id="forgot-otp-input" 
                  type="text" 
                  maxlength="6" 
                  placeholder="••••••" 
                  required 
                  style="width:100%;padding:14px;border:2.5px solid #059669;border-radius:10px;font-size:26px;text-align:center;letter-spacing:10px;font-weight:900;color:#0f172a;background:#ffffff;box-sizing:border-box"
                />
              </div>

              <button 
                type="button" 
                id="btn-forgot-step2-submit" 
                style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px -2px rgba(22,163,74,0.45)"
                ${this.isLoading ? 'disabled' : ''}
              >
                ${this.isLoading ? '<span class="pulse-dot"></span> Verifying OTP...' : 'Verify OTP →'}
              </button>

              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;font-size:13px;font-weight:700">
                <button type="button" id="btn-back-forgot-step1" style="background:none;border:none;color:#64748b;cursor:pointer">
                  ← Change Email
                </button>
                <button type="button" id="btn-resend-forgot-otp" style="background:none;border:none;color:#15803d;font-weight:800;cursor:pointer" ${this.countdownSeconds > 0 ? 'disabled' : ''}>
                  Resend OTP <span id="forgot-timer-display"></span>
                </button>
              </div>
            </form>
          </div>
        ` : ''}

        ${this.forgotStep === 3 ? `
          <form id="forgot-step3-form" onsubmit="return false;">
            <div style="margin-bottom:16px">
              <label for="forgot-new-pwd-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
                New Password (min 8) <span style="color:#dc2626">*</span>
              </label>
              <div style="position:relative">
                <input 
                  id="forgot-new-pwd-input" 
                  type="${this.showForgotPwd ? 'text' : 'password'}" 
                  placeholder="Enter new password" 
                  required 
                  style="width:100%;padding:13px 44px 13px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
                />
                <button 
                  type="button" 
                  id="btn-toggle-forgot-pwd" 
                  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:#475569"
                >
                  ${this.showForgotPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style="margin-bottom:20px">
              <label for="forgot-confirm-pwd-input" style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:6px;display:block">
                Confirm New Password <span style="color:#dc2626">*</span>
              </label>
              <input 
                id="forgot-confirm-pwd-input" 
                type="${this.showForgotPwd ? 'text' : 'password'}" 
                placeholder="Re-enter new password" 
                required 
                style="width:100%;padding:13px 14px;border:2px solid #94a3b8;border-radius:10px;font-size:15px;font-weight:600;background:#ffffff;color:#0f172a;box-sizing:border-box"
              />
            </div>

            <button 
              type="button" 
              id="btn-forgot-step3-submit" 
              style="width:100%;padding:15px;font-size:16px;font-weight:900;border-radius:12px;background:linear-gradient(135deg, #16a34a, #15803d);color:#ffffff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px -2px rgba(22,163,74,0.45)"
              ${this.isLoading ? 'disabled' : ''}
            >
              ${this.isLoading ? '<span class="pulse-dot"></span> Updating Password...' : 'Save New Password & Log In →'}
            </button>
          </form>
        ` : ''}

        ${this.forgotStep === 4 ? `
          <div style="text-align:center;padding:20px 0">
            <div style="font-size:48px;margin-bottom:12px">🔒✅</div>
            <h3 style="font-size:22px;font-weight:900;color:#166534;margin:0 0 8px">Password reset successfully</h3>
            <p style="font-size:14px;color:#4b5563;margin:0 0 20px">
              Your password has been updated in MongoDB. The old password is now invalid.<br/>
              Redirecting to login...
            </p>
            <button 
              type="button" 
              id="btn-goto-login-now-reset" 
              style="padding:12px 28px;font-size:15px;font-weight:800;border-radius:10px;background:#15803d;color:#ffffff;border:none;cursor:pointer"
            >
              Login with New Password →
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ============================================================================
  // EVENT BINDINGS
  // ============================================================================
  bindEvents() {
    // Modal close handlers
    document.getElementById('btn-close-auth-modal')?.addEventListener('click', () => this.close());
    document.getElementById('auth-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'auth-backdrop') this.close();
    });

    // Header Mode Switches
    document.getElementById('tab-toggle-login')?.addEventListener('click', () => {
      this.modalMode = 'login';
      this.error = null;
      this.successMessage = null;
      this.render();
    });

    document.getElementById('tab-toggle-signup')?.addEventListener('click', () => {
      this.modalMode = 'signup';
      this.signupStep = 1;
      this.error = null;
      this.successMessage = null;
      this.render();
    });

    // Links between modes
    document.getElementById('link-switch-to-signup')?.addEventListener('click', () => {
      this.modalMode = 'signup';
      this.signupStep = 1;
      this.error = null;
      this.render();
    });

    document.getElementById('link-signup-to-login')?.addEventListener('click', () => {
      this.modalMode = 'login';
      this.error = null;
      this.render();
    });

    document.getElementById('link-forgot-password')?.addEventListener('click', () => {
      this.modalMode = 'forgot';
      this.forgotStep = 1;
      this.error = null;
      this.successMessage = null;
      this.render();
    });

    document.getElementById('link-forgot-to-login')?.addEventListener('click', () => {
      this.modalMode = 'login';
      this.error = null;
      this.render();
    });

    // --- Signup Events ---
    document.getElementById('btn-signup-step1-submit')?.addEventListener('click', () => this.handleSendSignupOtp());
    document.getElementById('btn-signup-step2-submit')?.addEventListener('click', () => this.handleVerifySignupOtp());
    document.getElementById('btn-back-to-step1')?.addEventListener('click', () => {
      this.signupStep = 1;
      this.clearIntervalTimer();
      this.render();
    });
    document.getElementById('btn-resend-signup-otp')?.addEventListener('click', () => {
      if (this.countdownSeconds <= 0) {
        this.handleSendSignupOtp();
      }
    });

    // Real-time username check
    const usernameInp = document.getElementById('signup-username-input');
    usernameInp?.addEventListener('blur', (e) => this.handleCheckUsername(e.target.value));

    // Role tabs in signup
    document.getElementById('signup-role-farmer')?.addEventListener('click', () => {
      this.signupRole = 'farmer';
      this.render();
    });
    document.getElementById('signup-role-buyer')?.addEventListener('click', () => {
      this.signupRole = 'buyer';
      this.render();
    });
    document.getElementById('signup-role-admin')?.addEventListener('click', () => {
      this.signupRole = 'admin';
      this.render();
    });

    // Signup password toggle
    document.getElementById('btn-toggle-signup-pwd')?.addEventListener('click', () => {
      this.showSignupPwd = !this.showSignupPwd;
      const p1 = document.getElementById('signup-pwd-input');
      const p2 = document.getElementById('signup-confirm-pwd-input');
      if (p1) p1.type = this.showSignupPwd ? 'text' : 'password';
      if (p2) p2.type = this.showSignupPwd ? 'text' : 'password';
      const btn = document.getElementById('btn-toggle-signup-pwd');
      if (btn) btn.textContent = this.showSignupPwd ? '🙈' : '👁️';
    });

    document.getElementById('btn-signup-step3-submit')?.addEventListener('click', () => this.handleCompleteSignup());
    document.getElementById('btn-goto-login-now')?.addEventListener('click', () => {
      this.modalMode = 'login';
      this.render();
    });

    // --- Login Role Portal Tabs ---
    document.getElementById('login-role-farmer')?.addEventListener('click', () => {
      this.activeTab = 'farmer';
      this.signupRole = 'farmer';
      this.render();
    });
    document.getElementById('login-role-buyer')?.addEventListener('click', () => {
      this.activeTab = 'buyer';
      this.signupRole = 'buyer';
      this.render();
    });
    document.getElementById('login-role-admin')?.addEventListener('click', () => {
      this.activeTab = 'admin';
      this.signupRole = 'admin';
      this.render();
    });

    // --- Login Events ---
    document.getElementById('btn-submit-login')?.addEventListener('click', () => this.handleLogin());
    document.getElementById('btn-toggle-login-pwd')?.addEventListener('click', () => {
      this.showLoginPwd = !this.showLoginPwd;
      const inp = document.getElementById('login-pwd-input');
      if (inp) inp.type = this.showLoginPwd ? 'text' : 'password';
      const btn = document.getElementById('btn-toggle-login-pwd');
      if (btn) btn.textContent = this.showLoginPwd ? '🙈' : '👁️';
    });

    // Allow Enter key to trigger login
    document.getElementById('login-pwd-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    document.getElementById('login-ident-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });

    // --- Forgot Password Events ---
    document.getElementById('btn-forgot-step1-submit')?.addEventListener('click', () => this.handleSendResetOtp());
    document.getElementById('btn-forgot-step2-submit')?.addEventListener('click', () => this.handleVerifyResetOtp());
    document.getElementById('btn-back-forgot-step1')?.addEventListener('click', () => {
      this.forgotStep = 1;
      this.clearIntervalTimer();
      this.render();
    });
    document.getElementById('btn-resend-forgot-otp')?.addEventListener('click', () => {
      if (this.countdownSeconds <= 0) {
        this.handleSendResetOtp();
      }
    });

    // Forgot password toggle
    document.getElementById('btn-toggle-forgot-pwd')?.addEventListener('click', () => {
      this.showForgotPwd = !this.showForgotPwd;
      const p1 = document.getElementById('forgot-new-pwd-input');
      const p2 = document.getElementById('forgot-confirm-pwd-input');
      if (p1) p1.type = this.showForgotPwd ? 'text' : 'password';
      if (p2) p2.type = this.showForgotPwd ? 'text' : 'password';
      const btn = document.getElementById('btn-toggle-forgot-pwd');
      if (btn) btn.textContent = this.showForgotPwd ? '🙈' : '👁️';
    });

    document.getElementById('btn-forgot-step3-submit')?.addEventListener('click', () => this.handleResetPasswordSubmit());
    document.getElementById('btn-goto-login-now-reset')?.addEventListener('click', () => {
      this.modalMode = 'login';
      this.render();
    });

  }
}
