// src/components/LandingPage.js

export function renderLandingPage({ language, t }) {
  const isHi = language === 'hi';

  return `
    <div class="landing-view">
      <!-- Clean Top Navigation -->
      <nav class="landing-nav">
        <div class="brand-wrapper">
          <div class="brand-icon">🌱</div>
          <div>
            <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#0f2e1b">AgriQueue</span>
            <div style="font-size:11px;font-weight:700;color:#15803d">
              ${isHi ? 'स्मार्ट कृषि खरीद एवं मंडी टोकन पोर्टल' : 'Smart Mandi & Agricultural Procurement Platform'}
            </div>
          </div>
        </div>

        <div class="nav-right-actions">
          <button id="landing-lang-toggle" class="lang-toggle" title="Toggle Language">
            🌐 ${isHi ? 'English' : 'हिन्दी (Hindi)'}
          </button>
          <button id="nav-btn-login" class="btn-outline" style="font-weight:700;border-color:#15803d;color:#15803d">
            ${isHi ? 'लॉग इन' : 'Login'}
          </button>
          <button id="nav-btn-signup" class="cta" style="font-weight:700;padding:8px 18px">
            ${isHi ? 'साइन अप करें' : 'Sign Up'}
          </button>
        </div>
      </nav>

      <!-- Welcome Hero Section -->
      <main class="welcome-hero-container" style="max-width:1100px;margin:40px auto 30px;padding:0 24px;text-align:center">
        <!-- Agriculture Themed Eyebrow Badge -->
        <div style="display:inline-flex;align-items:center;gap:8px;background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:6px 16px;border-radius:999px;font-size:13px;font-weight:700;margin-bottom:20px">
          <span class="pulse-dot"></span>
          <span>${isHi ? 'राष्ट्रीय ई-मंडी एवं न्यूनतम समर्थन मूल्य (MSP) प्रणाली' : 'Official APMC E-Procurement & Smart Queue System'}</span>
        </div>

        <!-- Required Title -->
        <h1 class="welcome-title" style="font-size:clamp(32px, 5vw, 52px);font-weight:900;color:#064e3b;line-height:1.15;margin-bottom:16px;letter-spacing:-0.03em">
          Welcome to AgriQueue
        </h1>

        <!-- Subtitle & Value Proposition -->
        <p style="font-size:clamp(16px, 2vw, 19px);color:#374151;max-width:760px;margin:0 auto 32px;line-height:1.6">
          ${isHi 
            ? 'किसानों, मंडी अधिकारियों और व्यापारियों के लिए एकीकृत खरीद समाधान। टोकन बुक करें, लाइव कतार ट्रैक करें और सीधे बैंक खाते में भुगतान प्राप्त करें।' 
            : 'A smart agricultural procurement solution eliminating mandi wait times, providing transparent slot booking, live queue updates, and direct DBT payments for farmers and verified buyers.'}
        </p>

        <!-- The Two Primary Action Buttons: [ Login ] and [ Sign Up ] -->
        <div class="landing-primary-actions" style="display:flex;gap:18px;justify-content:center;align-items:center;flex-wrap:wrap;margin-bottom:44px">
          <button 
            id="landing-btn-login" 
            class="cta welcome-action-btn" 
            style="padding:16px 42px;font-size:18px;font-weight:800;border-radius:12px;box-shadow:0 10px 25px -5px rgba(22,163,74,0.4);display:inline-flex;align-items:center;gap:10px;cursor:pointer"
          >
            <span>🌾</span>
            <span>${isHi ? 'लॉग इन करें (Login)' : 'Login'}</span>
          </button>

          <button 
            id="landing-btn-signup" 
            class="btn-secondary welcome-action-btn" 
            style="padding:16px 42px;font-size:18px;font-weight:800;border-radius:12px;background:#ffffff;border:2px solid #16a34a;color:#15803d;display:inline-flex;align-items:center;gap:10px;cursor:pointer;transition:all 0.2s ease"
          >
            <span>✨</span>
            <span>${isHi ? 'नया खाता बनाएं (Sign Up)' : 'Sign Up'}</span>
          </button>
        </div>

        <!-- 3 Role Portals Quick Selector -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:24px;margin-bottom:40px;text-align:left">
          <div style="font-size:13px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px;text-align:center">
            ${isHi ? 'अपने खाते के प्रकार के अनुसार चुनें' : 'Choose Your Account Type'}
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px">
            <!-- Farmer -->
            <div id="role-card-farmer" style="background:#ffffff;border:1px solid #dcfce7;border-radius:12px;padding:18px;cursor:pointer;transition:transform 0.2s ease, box-shadow 0.2s ease" class="role-hover-card">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <span style="font-size:28px">👨‍🌾</span>
                <div>
                  <div style="font-size:16px;font-weight:800;color:#0f2e1b">${isHi ? 'किसान (विक्रेता)' : 'Farmer (Seller)'}</div>
                  <div style="font-size:12px;color:#15803d;font-weight:600">${isHi ? 'स्लॉट बुकिंग • कतार टोकन • DBT भुगतान' : 'Book Slots • Queue Tokens • Direct DBT'}</div>
                </div>
              </div>
              <p style="font-size:13px;color:#6b7280;margin:0 0 12px">
                ${isHi ? 'फसल बिक्री के लिए समय स्लॉट बुक करें और बिना लाइन में लगे मंडी पहुंचें।' : 'Schedule your crop arrival window and avoid long mandi waiting lines.'}
              </p>
              <button id="landing-btn-farmer" class="btn-outline btn-sm" style="width:100%;font-weight:700;color:#15803d;border-color:#86efac">
                ${isHi ? 'किसान पोर्टल में जाएं →' : 'Farmer Access →'}
              </button>
            </div>

            <!-- Buyer -->
            <div id="role-card-buyer" style="background:#ffffff;border:1px solid #dbeafe;border-radius:12px;padding:18px;cursor:pointer;transition:transform 0.2s ease, box-shadow 0.2s ease" class="role-hover-card">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <span style="font-size:28px">🏢</span>
                <div>
                  <div style="font-size:16px;font-weight:800;color:#1e3a8a">${isHi ? 'व्यापारी / खरीदार' : 'Commercial Buyer'}</div>
                  <div style="font-size:12px;color:#2563eb;font-weight:600">${isHi ? 'मंडी लॉट • डिजिटल अनुबंध • गेट पास' : 'Mandi Lots • Digital Contracts • Gate Pass'}</div>
                </div>
              </div>
              <p style="font-size:13px;color:#6b7280;margin:0 0 12px">
                ${isHi ? 'सत्यापित किसानों से उच्च गुणवत्ता वाली फसलें सीधे खरीदें।' : 'Procure quality tested grains directly with guaranteed APMC compliance.'}
              </p>
              <button id="landing-btn-buyer" class="btn-outline btn-sm" style="width:100%;font-weight:700;color:#1e40af;border-color:#bfdbfe">
                ${isHi ? 'खरीदार पोर्टल में जाएं →' : 'Buyer Access →'}
              </button>
            </div>

            <!-- Admin -->
            <div id="role-card-staff" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;cursor:pointer;transition:transform 0.2s ease, box-shadow 0.2s ease" class="role-hover-card">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <span style="font-size:28px">🛡️</span>
                <div>
                  <div style="font-size:16px;font-weight:800;color:#1e293b">${isHi ? 'APMC मंडी अधिकारी' : 'APMC Mandi Admin'}</div>
                  <div style="font-size:12px;color:#475569;font-weight:600">${isHi ? 'गेट नियंत्रण • तुलाई • जे-फॉर्म जारी' : 'Gate Control • Weighbridge • J-Forms'}</div>
                </div>
              </div>
              <p style="font-size:13px;color:#6b7280;margin:0 0 12px">
                ${isHi ? 'दैनिक आगमन क्षमता और तुलाई काउंटर प्रबंधित करें।' : 'Manage daily capacity, advance counters, and dispatch live SMS alerts.'}
              </p>
              <button id="landing-btn-staff" class="btn-outline btn-sm" style="width:100%;font-weight:700;color:#334155;border-color:#cbd5e1">
                ${isHi ? 'अधिकारी लॉगिन →' : 'Officer Login →'}
              </button>
            </div>
          </div>
        </div>

        <!-- 1-Click Demo Accounts for Fast Testing -->
        <div class="demo-pills" style="margin-bottom:48px;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap">
          <span style="font-weight:700;color:#4b5563;font-size:13px">${isHi ? 'त्वरित परीक्षण (डेमो):' : 'Instant 1-Click Demo Login:'}</span>
          <button id="demo-farmer-pill" class="demo-pill-btn" title="Login as Demo Farmer Ramesh">
            👨‍🌾 Ramesh (Farmer)
          </button>
          <button id="demo-buyer-pill" class="demo-pill-btn" style="background:#eff6ff;color:#1e40af;border-color:#bfdbfe" title="Login as Demo Buyer Vikram">
            🏢 Vikram (Buyer)
          </button>
          <button id="demo-officer-pill" class="demo-pill-btn" title="Login as Mandi Admin Dr. Alok">
            🛡️ Dr. Alok (Admin)
          </button>
        </div>

        <!-- Platform Impact Metrics Grid -->
        <div class="trust-stats" style="margin-bottom:48px">
          <div class="stat-box">
            <strong style="color:#15803d">12,480+</strong>
            <span>${isHi ? 'पंजीकृत किसान' : 'Registered Farmers'}</span>
          </div>
          <div class="stat-box">
            <strong style="color:#0f766e">48 APMC</strong>
            <span>${isHi ? 'सक्रिय खरीद केंद्र' : 'Active Mandi Centres'}</span>
          </div>
          <div class="stat-box">
            <strong style="color:#1e40af">₹14.2 Cr</strong>
            <span>${isHi ? 'DBT भुगतान वितरित' : 'DBT Payments Dispatched'}</span>
          </div>
          <div class="stat-box">
            <strong style="color:#d97706">&lt; 20 Mins</strong>
            <span>${isHi ? 'औसत मंडी प्रतीक्षा समय' : 'Avg Mandi Gate Wait'}</span>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer style="border-top:1px solid #e2e8f0;padding:24px 20px;text-align:center;font-size:13px;color:#6b7280;background:#ffffff">
        <div style="max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <b>AgriQueue (एग्रीक्यू)</b> — Smart Agricultural Procurement & Slot Management System
          </div>
          <div style="display:flex;align-items:center;gap:16px">
            <span>🌾 APMC Aligned</span>
            <span>🔒 256-bit SSL Security</span>
            <span>🇮🇳 SIH 2026 Ready</span>
          </div>
        </div>
      </footer>
    </div>
  `;
}
