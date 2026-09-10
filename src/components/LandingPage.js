// src/components/LandingPage.js

export function renderLandingPage({ language, t }) {
  return `
    <div class="landing-view">
      <!-- Landing Header -->
      <nav class="landing-nav">
        <div class="brand-wrapper">
          <div class="brand-icon">🌱</div>
          <div>
            <span>${t.brandName}</span>
            <div style="font-size:11px;font-weight:600;color:#15803d">${t.brandTagline}</div>
          </div>
        </div>

        <div class="nav-right-actions">
          <button id="landing-lang-toggle" class="lang-toggle">
            🌐 ${language === 'en' ? 'हिन्दी (Hindi)' : 'English'}
          </button>
          <button id="landing-btn-buyer" class="btn-outline" style="font-weight:700;color:#1e40af;border-color:#bfdbfe">
            🛒 Buyer Portal
          </button>
          <button id="landing-btn-staff" class="btn-outline" style="font-weight:700">
            🛡️ APMC Admin
          </button>
          <button id="landing-btn-farmer" class="cta">
            🌾 Farmer Login
          </button>
        </div>
      </nav>

      <!-- Hero Section -->
      <header class="hero-section">
        <div class="hero-content">
          <div class="badge">
            <span class="pulse-dot"></span>
            ${t.hero.eyebrow}
          </div>
          <h1>
            ${t.hero.title}
            <em>${t.hero.titleAccent}</em>
          </h1>
          <p>${t.hero.subtitle}</p>

          <!-- 3 Role Action Buttons -->
          <div class="hero-actions" style="display:flex;flex-wrap:wrap;gap:12px">
            <button id="hero-btn-login" class="cta" style="padding:14px 24px;font-size:15px">
              🌾 Farmer (Seller) Login
            </button>
            <button id="hero-btn-buyer" class="btn-secondary" style="padding:14px 22px;font-size:15px;color:#1e40af;border-color:#bfdbfe;background:#eff6ff">
              🛒 Buyer / Trader Access
            </button>
            <button id="hero-btn-staff" class="btn-secondary" style="padding:14px 22px;font-size:15px">
              🛡️ APMC Mandi Admin
            </button>
          </div>

          <!-- Quick Interactive Demo Pills for All 3 Types -->
          <div class="demo-pills" style="margin-top:16px">
            <span style="font-weight:700;color:#374151">Instant 1-Click Access:</span>
            <button id="demo-farmer-pill" class="demo-pill-btn" title="Login as Farmer">
              👨‍🌾 Farmer: Ramesh
            </button>
            <button id="demo-officer-pill" class="demo-pill-btn" title="Login as Mandi Admin">
              🛡️ Admin: Dr. Alok
            </button>
            <button id="demo-buyer-pill" class="demo-pill-btn" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe" title="Login as Commercial Buyer">
              🛒 Buyer: Vikram (AgroCorp)
            </button>
          </div>

          <!-- National Impact Stats -->
          <div class="trust-stats">
            <div class="stat-box">
              <strong>${t.hero.stats.farmers}</strong>
              <span>${t.hero.stats.farmersSub}</span>
            </div>
            <div class="stat-box">
              <strong>${t.hero.stats.centres}</strong>
              <span>${t.hero.stats.centresSub}</span>
            </div>
            <div class="stat-box">
              <strong>${t.hero.stats.payments}</strong>
              <span>${t.hero.stats.paymentsSub}</span>
            </div>
          </div>
        </div>

        <!-- Right Side Showcase Card -->
        <div class="hero-card">
          <div class="hero-card-banner">
            <span class="pill-live"><span class="pulse-dot" style="display:inline-block;margin-right:6px"></span> LIVE APMC GATE & BIDDING SYSTEM</span>
            <div>
              <h3>Smart Appointment, Inward & Bidding</h3>
              <p style="color:#dcfce7;font-size:13px">Direct farm-to-mandi procurement connecting sellers, admin and verified buyers.</p>
            </div>
          </div>

          <div class="hero-slot-preview">
            <div class="slot-preview-header">
              <b>Verified Procurement Lot</b>
              <span class="slot-token-tag">#A-047</span>
            </div>
            <div class="slot-preview-details">
              <div>
                Centre
                <strong>Jaitpur Mandi</strong>
              </div>
              <div>
                Arrival Slot
                <strong>10:30 AM</strong>
              </div>
              <div>
                Crop & MSP
                <strong>Paddy • ₹2,300</strong>
              </div>
            </div>
          </div>

          <div class="floating-badge" style="margin-bottom:8px">
            <span class="pulse-dot"></span>
            <span>Live Real-Time Notification & Email OTP Sync (AgriQueue)</span>
          </div>

          <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#fff">
            <span>🛡️ 3-Role Security: Farmer • Admin • Buyer</span>
            <span style="font-weight:700">SIH 2026 Ready</span>
          </div>
        </div>
      </header>
    </div>
  `;
}
