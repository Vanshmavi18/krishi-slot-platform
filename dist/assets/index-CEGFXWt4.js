(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const n of s.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&i(n)}).observe(document,{childList:!0,subtree:!0});function t(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(a){if(a.ep)return;a.ep=!0;const s=t(a);fetch(a.href,s)}})();class g{constructor(){this.token=localStorage.getItem("krishi_token")||null,this.currentUser=JSON.parse(localStorage.getItem("krishi_user")||"null"),this.sseSource=null,this.listeners={queue:[],sms:[],notification:[]},this.initAudio()}initAudio(){this.playChime=()=>{try{const e=window.AudioContext||window.webkitAudioContext;if(!e)return;const t=new e,i=t.createOscillator(),a=t.createGain();i.connect(a),a.connect(t.destination),i.type="sine",i.frequency.setValueAtTime(587.33,t.currentTime),i.frequency.setValueAtTime(880,t.currentTime+.1),a.gain.setValueAtTime(.2,t.currentTime),a.gain.exponentialRampToValueAtTime(.001,t.currentTime+.5),i.start(),i.stop(t.currentTime+.5)}catch{}}}setSession(e,t){this.token=e,this.currentUser=t,e?(localStorage.setItem("krishi_token",e),localStorage.setItem("krishi_user",JSON.stringify(t))):(localStorage.removeItem("krishi_token"),localStorage.removeItem("krishi_user"))}async fetch(e,t={}){const i={"Content-Type":"application/json",...t.headers||{}};this.token&&(i.Authorization=`Bearer ${this.token}`);try{const a=await fetch(e,{...t,headers:i}),s=await a.json();if(!a.ok)throw new Error(s.error||"Network error occurred");return s}catch(a){throw console.error(`API Error on ${e}:`,a),a}}connectSSE(){if(!this.sseSource)try{this.sseSource=new EventSource("/api/queue/stream"),this.sseSource.onmessage=e=>{try{const t=JSON.parse(e.data);t.type==="QUEUE_UPDATE"?this.listeners.queue.forEach(i=>i(t.payload)):t.type==="SMS_NOTIFICATION"?(this.playChime(),this.listeners.sms.forEach(i=>i(t.payload))):t.type==="NOTIFICATION_NEW"&&(this.playChime(),this.listeners.notification.forEach(i=>i(t.payload)))}catch(t){console.warn("Error parsing SSE event:",t)}},this.sseSource.onerror=()=>{}}catch(e){console.warn("SSE not supported or failed to connect:",e)}}onQueueUpdate(e){this.listeners.queue.push(e)}onSmsReceived(e){this.listeners.sms.push(e)}onNotificationReceived(e){this.listeners.notification.push(e)}async sendOtp(e){return this.fetch("/api/auth/send-otp",{method:"POST",body:JSON.stringify({phone:e})})}async verifyOtp(e,t){const i=await this.fetch("/api/auth/verify-otp",{method:"POST",body:JSON.stringify({phone:e,otp:t})});return this.setSession(i.token,i.user),i}async loginStaff(e,t){const i=await this.fetch("/api/auth/login-staff",{method:"POST",body:JSON.stringify({staffId:e,password:t})});return this.setSession(i.token,i.user),i}async loginBuyer(e,t){const i=await this.fetch("/api/auth/login-buyer",{method:"POST",body:JSON.stringify({identifier:e,password:t})});return this.setSession(i.token,i.user),i}async quickSwitch(e,t=null){const i=await this.fetch("/api/auth/quick-switch",{method:"POST",body:JSON.stringify({role:e,id:t})});return this.setSession(i.token,i.user),i}async getNotifications(e,t){const i=new URLSearchParams;return e&&i.append("userId",e),t&&i.append("role",t),this.fetch(`/api/notifications?${i.toString()}`)}async markNotificationRead(e){return this.fetch(`/api/notifications/${e}/read`,{method:"POST"})}async markAllNotificationsRead(e,t){return this.fetch("/api/notifications/read-all",{method:"POST",body:JSON.stringify({userId:e,role:t})})}async clearNotifications(e,t){return this.fetch("/api/notifications/clear",{method:"POST",body:JSON.stringify({userId:e,role:t})})}async getBuyerMarketplace(){return this.fetch("/api/buyer/marketplace")}async getBuyerOrders(e){return this.fetch(`/api/buyer/orders?buyerId=${e||""}`)}async placeBuyerOrder(e){return this.fetch("/api/buyer/orders",{method:"POST",body:JSON.stringify(e)})}async getCentres(){return this.fetch("/api/slots/centres")}async getCrops(){return this.fetch("/api/slots/crops")}async getAvailability(e,t){return this.fetch(`/api/slots/availability?centreId=${e}&date=${t}`)}async bookSlot(e){return this.fetch("/api/slots/book",{method:"POST",body:JSON.stringify(e)})}async getMyBookings(e){return this.fetch(`/api/slots/my-bookings?farmerId=${e||""}`)}async getQueueStatus(e,t){return this.fetch(`/api/queue/status?centreId=${e||""}&token=${t||""}`)}async advanceQueue(e=2){return this.fetch("/api/queue/advance",{method:"POST",body:JSON.stringify({counterId:e})})}async broadcastDelay(e,t){return this.fetch("/api/queue/broadcast-delay",{method:"POST",body:JSON.stringify({reason:e,delayMins:t})})}async getProcurements(e){return this.fetch(`/api/procurements?farmerId=${e||""}`)}async getProcurementStats(e){return this.fetch(`/api/procurements/stats?farmerId=${e||""}`)}async createProcurement(e){return this.fetch("/api/procurements/create",{method:"POST",body:JSON.stringify(e)})}async approvePayment(e){return this.fetch(`/api/procurements/${e}/approve-payment`,{method:"POST"})}async getSmsLogs(e){return this.fetch(`/api/sms/logs?phone=${e||""}`)}}const c=new g,h={en:{brandName:"KrishiSlot",brandTagline:"Smart Mandi & Procurement Platform",govLabel:"Govt. of India & State APMC Mandi Portal",nav:{dashboard:"Dashboard",booking:"Book Slot",queue:"Live Queue",procurements:"My Procurements",smsLogs:"SMS & Alerts",profile:"Farmer Profile",centreOps:"Mandi Counter Operations",logout:"Logout"},hero:{eyebrow:"Smart Agricultural Procurement",title:"Your Crop. Your Time.",titleAccent:"Zero Mandi Waiting.",subtitle:"Book verified procurement slots, monitor live mandi gate queues, receive real-time SMS alerts at home, and track DBT payment transfers directly to your bank account.",loginFarmer:"Farmer Login (Mobile OTP) →",loginStaff:"Mandi Staff Portal",demoFarmer:"Quick Demo: Farmer Ramesh",demoOfficer:"Quick Demo: Mandi Officer Verma",stats:{farmers:"2.4 Lakh+",farmersSub:"Registered Farmers",centres:"340+",centresSub:"APMC Centres",payments:"₹18.6 Cr",paymentsSub:"DBT Payments Dispatched"}},dashboard:{greeting:"Namaste",subtitle:"Here is your real-time procurement, slot booking, and queue status.",upcomingSlot:"YOUR UPCOMING PROCUREMENT SLOT",mandi:"Mandi Centre",crop:"Crop",token:"YOUR TOKEN",totalProcured:"Total Procured",paid:"Payment Received",pending:"Pending DBT",liveQueueTitle:"Live Queue",nowServing:"now serving",completedToday:"farmers completed today",avgWait:"Avg. wait per token",viewQueue:"Open Live Queue →",quickActions:"Quick Actions",bookSlotBtn:"Book a Slot",bookSlotSub:"New harvest appointment",checkQueueBtn:"Check Queue",checkQueueSub:"Live token board",trackPaymentBtn:"Track Payment",trackPaymentSub:"DBT bank status",smsAlertsBtn:"SMS Messages",smsAlertsSub:"View mobile inbox",recentActivity:"Recent Procurement Activity",centreNotice:"Centre Advisory",noticeContent:"Jaitpur Procurement Centre is operating normally. Please bring Aadhaar, Land Record (Khasra), and arrive 15 minutes before your scheduled slot."},booking:{title:"Book Procurement Slot",subtitle:"Select your mandi, crop harvest details, and pick an available time slot.",step1:"1. Select Mandi",step2:"2. Crop & Quantity",step3:"3. Time Window",centreLabel:"Select Procurement Centre / Mandi",cropLabel:"Select Crop & Official MSP Rate",qtyLabel:"Estimated Quantity (Quintals)",vehicleLabel:"Vehicle / Transport Type",dateLabel:"Choose Date",slotLabel:"Available Time Slots",slotsLeft:"slots left",full:"Full",summaryTitle:"Booking Estimate & Summary",calculatedAmount:"Estimated MSP Payout",confirmBtn:"Confirm Slot Booking & Send SMS",note:"Token number and QR verification slip will be generated instantly and dispatched via SMS to your registered mobile number."},queue:{title:"Live Mandi Queue Board",subtitle:"Real-time multi-counter status and arrival advisory.",nowServing:"NOW SERVING",expectedPosition:"YOUR ESTIMATED POSITION",ahead:"farmers ahead of you",estWait:"Estimated Arrival Wait Time",countersTitle:"Active Counter Breakdown",planArrival:"Arrival Advisory",reminderNotice:"Proximity SMS will automatically trigger to your phone when 5 tokens remain before yours. Arrive only then to eliminate wait times.",setReminderBtn:"Set SMS Arrival Reminder",simulateBtn:"Simulate Queue Movement (+1 Token)",centreCapacity:"Today’s Centre Load"},procurements:{title:"My Procurements & Payment Tracking",subtitle:"Complete history of delivered crops, weighbridge records, and DBT disbursements.",tableId:"Receipt ID",tableDate:"Date",tableCrop:"Crop / Net Qtl",tableAmount:"Total Amount",tableStatus:"Procurement Status",tablePayment:"DBT Transfer Status",actionSlip:"View J-Form Receipt",pipelineTitle:"Direct Benefit Transfer (DBT) Milestones"},centre:{title:"Mandi Officer Control Room",subtitle:"Jaitpur Procurement Centre • Live Gate, Assay & Weighbridge Control",todayBooked:"Booked Today",waitingTokens:"Waiting in Mandi",completedCount:"Weighed & Completed",advanceBtn:"Call Next Token (Counter 2)",delayAlertBtn:"Broadcast Weather / Congestion Delay SMS",weighmentTitle:"New Weighment & Assay Entry",tokenInput:"Token Number",grossInput:"Gross Weight (qtl)",tareInput:"Tare Weight (qtl)",moistureInput:"Moisture % (FAQ Standard)",saveWeighmentBtn:"Record Weighment & Issue J-Form Slip"}},hi:{brandName:"कृषि स्लॉट",brandTagline:"स्मार्ट मंडी एवं खरीद प्रबंधन प्रणाली",govLabel:"भारत सरकार एवं राज्य कृषि उपज मंडी समिति पोर्टल",nav:{dashboard:"डैशबोर्ड",booking:"स्लॉट बुक करें",queue:"लाइव कतार स्थिति",procurements:"मेरी फसल खरीद",smsLogs:"एसएमएस एवं अलर्ट",profile:"किसान प्रोफाइल",centreOps:"मंडी काउंटर नियंत्रण",logout:"लॉगआउट"},hero:{eyebrow:"आधुनिक डिजिटल फसल खरीद",title:"आपकी फसल. आपका समय.",titleAccent:"मंडी में लंबी कतारों से मुक्ति।",subtitle:"अपनी उपज बेचने के लिए समय स्लॉट बुक करें, घर बैठे लाइव कतार देखें, सीधे मोबाइल पर SMS अलर्ट पाएं, और DBT द्वारा सीधे बैंक खाते में भुगतान प्राप्त करें।",loginFarmer:"किसान लॉगिन (मोबाइल OTP) →",loginStaff:"मंडी अधिकारी लॉगिन",demoFarmer:"तुरंत डेमो: किसान रमेश कुमार",demoOfficer:"तुरंत डेमो: मंडी निरीक्षक वर्मा",stats:{farmers:"2.4 लाख+",farmersSub:"पंजीकृत किसान",centres:"340+",centresSub:"खरीद केंद्र",payments:"₹18.6 करोड़",paymentsSub:"सीधे बैंक में हस्तांतरित"}},dashboard:{greeting:"नमस्ते",subtitle:"आज की फसल खरीद, स्लॉट बुकिंग और लाइव कतार की स्थिति।",upcomingSlot:"आपका आगामी खरीद स्लॉट",mandi:"खरीद केंद्र",crop:"फसल",token:"आपका टोकन नंबर",totalProcured:"कुल फसल खरीद",paid:"प्राप्त भुगतान",pending:"प्रक्रियाधीन DBT",liveQueueTitle:"लाइव कतार",nowServing:"वर्तमान में सेवारत",completedToday:"किसानों की तुलाई पूरी",avgWait:"औसत समय प्रति टोकन",viewQueue:"लाइव कतार देखें →",quickActions:"त्वरित सेवाएं",bookSlotBtn:"स्लॉट बुक करें",bookSlotSub:"नई खरीद का समय चुनें",checkQueueBtn:"कतार देखें",checkQueueSub:"लाइव टोकन बोर्ड",trackPaymentBtn:"भुगतान स्थिति",trackPaymentSub:"DBT बैंक खाता स्थिति",smsAlertsBtn:"एसएमएस अलर्ट",smsAlertsSub:"मोबाइल संदेश देखें",recentActivity:"हाल की खरीद गतिविधियां",centreNotice:"खरीद केंद्र सूचना",noticeContent:"जैतपुर खरीद केंद्र सामान्य रूप से कार्य कर रहा है। कृपया आधार, खसरा-खतौनी और बैंक पासबुक साथ लाएं तथा निर्धारित समय से 15 मिनट पूर्व ही पहुंचें।"},booking:{title:"खरीद स्लॉट बुक करें",subtitle:"अपनी सुविधानुसार खरीद केंद्र, फसल का विवरण और समय स्लॉट चुनें।",step1:"1. केंद्र चुनें",step2:"2. फसल एवं वजन",step3:"3. समय स्लॉट",centreLabel:"खरीद केंद्र / मंडी चुनें",cropLabel:"फसल एवं न्यूनतम समर्थन मूल्य (MSP)",qtyLabel:"अनुमानित मात्रा (क्विंटल)",vehicleLabel:"वाहन का प्रकार",dateLabel:"तारीख चुनें",slotLabel:"उपलब्ध समय स्लॉट",slotsLeft:"स्लॉट शेष",full:"फुल",summaryTitle:"बुकिंग सारांश एवं अनुमानित आय",calculatedAmount:"अनुमानित समर्थन मूल्य (MSP)",confirmBtn:"स्लॉट बुकिंग पक्की करें एवं SMS भेजें",note:"बुकिंग की पुष्टि होते ही आपके मोबाइल नंबर पर टोकन नंबर और QR कोड का एसएमएस तुरंत भेज दिया जाएगा।"},queue:{title:"लाइव मंडी कतार स्थिति",subtitle:"सभी काउंटरों की सजीव स्थिति एवं आगमन परामर्श।",nowServing:"वर्तमान टोकन",expectedPosition:"आपकी अनुमानित स्थिति",ahead:"किसान आपके आगे हैं",estWait:"अनुमानित प्रतीक्षा समय",countersTitle:"काउंटरवार स्थिति",planArrival:"मंडी आगमन परामर्श",reminderNotice:"जब आपके नंबर से पहले केवल 5 किसान शेष रहेंगे, तब आपके मोबाइल पर तुरंत SMS अलर्ट भेजा जाएगा। तभी मंडी के लिए निकलें।",setReminderBtn:"SMS अलर्ट सेट करें",simulateBtn:"कतार आगे बढ़ाएं (+1 टोकन)",centreCapacity:"आज का मंडी भार"},procurements:{title:"मेरी फसल खरीद एवं भुगतान स्थिति",subtitle:"तुलाई विवरण, डिजिटल रसीद (J-Form) एवं सीधे बैंक खाते (DBT) में भुगतान का इतिहास।",tableId:"रसीद संख्या",tableDate:"दिनांक",tableCrop:"फसल / शुद्ध वजन",tableAmount:"कुल देय राशि",tableStatus:"खरीद स्थिति",tablePayment:"DBT भुगतान स्थिति",actionSlip:"डिजिटल J-Form रसीद देखें",pipelineTitle:"प्रत्यक्ष लाभ हस्तांतरण (DBT) चरण"},centre:{title:"मंडी अधिकारी नियंत्रण कक्ष",subtitle:"जैतपुर खरीद केंद्र • टोकन सत्यापन, गुणवत्ता जांच एवं धर्मकांटा नियंत्रण",todayBooked:"आज की कुल बुकिंग",waitingTokens:"प्रतीक्षारत किसान",completedCount:"तुलाई संपन्न",advanceBtn:"अगला टोकन बुलाएं (काउंटर 2)",delayAlertBtn:"मौसम / जाम का SMS अलर्ट जारी करें",weighmentTitle:"नई तुलाई एवं गुणवत्ता प्रविष्टि",tokenInput:"टोकन संख्या",grossInput:"कुल वजन (सकल क्विंटल)",tareInput:"वाहन का खाली वजन (क्विंटल)",moistureInput:"नमी प्रतिशत (FAQ मानक)",saveWeighmentBtn:"तुलाई दर्ज करें और डिजिटल रसीद जारी करें"}}};function v({language:o,t:e}){return`
    <div class="landing-view">
      <!-- Landing Header -->
      <nav class="landing-nav">
        <div class="brand-wrapper">
          <div class="brand-icon">🌱</div>
          <div>
            <span>${e.brandName}</span>
            <div style="font-size:11px;font-weight:600;color:#15803d">${e.brandTagline}</div>
          </div>
        </div>

        <div class="nav-right-actions">
          <button id="landing-lang-toggle" class="lang-toggle">
            🌐 ${o==="en"?"हिन्दी (Hindi)":"English"}
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
            ${e.hero.eyebrow}
          </div>
          <h1>
            ${e.hero.title}
            <em>${e.hero.titleAccent}</em>
          </h1>
          <p>${e.hero.subtitle}</p>

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
              <strong>${e.hero.stats.farmers}</strong>
              <span>${e.hero.stats.farmersSub}</span>
            </div>
            <div class="stat-box">
              <strong>${e.hero.stats.centres}</strong>
              <span>${e.hero.stats.centresSub}</span>
            </div>
            <div class="stat-box">
              <strong>${e.hero.stats.payments}</strong>
              <span>${e.hero.stats.paymentsSub}</span>
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
            <span>Live Real-Time Notification & SMS Sync (VK-KRISHI)</span>
          </div>

          <div style="background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#fff">
            <span>🛡️ 3-Role Security: Farmer • Admin • Buyer</span>
            <span style="font-weight:700">SIH 2026 Ready</span>
          </div>
        </div>
      </header>
    </div>
  `}function y({user:o,language:e,t,unreadSmsCount:i=0,unreadNotifCount:a=0}){const s=(o?.role||"farmer").toLowerCase();let n="Farmer (Seller)",d="👨‍🌾";return s==="admin"||s==="officer"?(n="APMC Admin",d="🏛️"):s==="buyer"&&(n="Commercial Buyer",d="🛒"),`
    <header class="app-topbar">
      <div class="topbar-left">
        <span class="pulse-dot"></span>
        <div class="topbar-greeting">
          <span>🏛️ APMC Mandi Network</span>
          <strong>Jaitpur Centre • Uttar Pradesh</strong>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Language Switcher -->
        <button id="btn-toggle-lang" class="lang-toggle">
          🌐 ${e==="en"?"हिन्दी (Hindi)":"English"}
        </button>

        <!-- 3-Role Fast Switcher -->
        <select id="quick-role-switch" class="btn-outline role-select-dropdown" style="padding:6px 12px;font-weight:700">
          <option value="farmer" ${s==="farmer"?"selected":""}>🌾 Farmer: Ramesh Kumar</option>
          <option value="admin" ${s==="admin"||s==="officer"?"selected":""}>🛡️ Admin: Dr. Alok Nath</option>
          <option value="buyer" ${s==="buyer"?"selected":""}>🛒 Buyer: Vikram Singhania</option>
        </select>

        <!-- Notification Bell (NEW!) -->
        <button id="btn-topbar-notif" class="icon-btn notif-bell-btn" title="Open Notifications Center" aria-label="Notifications">
          <span>🔔</span>
          ${a>0?`<span class="icon-badge notif-badge">${a}</span>`:""}
        </button>

        <!-- SMS Alert Mobile Hub -->
        <button id="btn-topbar-sms" class="icon-btn" title="Open Mobile SMS Hub">
          <span>📱</span>
          ${i>0?'<span class="icon-badge"></span>':""}
        </button>

        <!-- User Profile Pill -->
        <div class="user-pill-container" style="display:flex;align-items:center;gap:10px">
          <div class="user-avatar">${d}</div>
          <div style="font-size:13px;line-height:1.2">
            <b>${o?.name||"Ramesh Kumar"}</b>
            <div class="role-badge ${s}" style="padding:2px 8px;font-size:10px;margin-top:2px">
              ${n}
            </div>
          </div>
        </div>

        <button id="btn-logout" class="btn-outline btn-sm" style="color:#b91c1c;border-color:#fca5a5">
          ${t.nav.logout}
        </button>
      </div>
    </header>
  `}function f({currentView:o,user:e,t}){const i=(e?.role||"farmer").toLowerCase(),a=i==="farmer",s=i==="admin"||i==="officer",n=i==="buyer";return`
    <aside class="app-sidebar">
      <div>
        <div class="sidebar-brand">
          <div class="brand-wrapper">
            <div class="brand-icon">🌱</div>
            <div>
              <span>${t.brandName}</span>
              <div style="font-size:10px;font-weight:700;color:#15803d;letter-spacing:0.05em">
                ${n?"BUYER & TRADER HUB":s?"APMC ADMIN CONTROL":"FARMER SELLER PORTAL"}
              </div>
            </div>
          </div>
        </div>

        <!-- FARMER PORTAL LINKS -->
        ${a?`
          <div class="sidebar-section-title">Farmer (Seller) Portal</div>
          <nav class="sidebar-nav">
            <button class="nav-link ${o==="dashboard"?"active":""}" data-view="dashboard">
              <i>📊</i>
              <span>${t.nav.dashboard}</span>
            </button>
            <button class="nav-link ${o==="booking"?"active":""}" data-view="booking">
              <i>📅</i>
              <span>${t.nav.booking}</span>
            </button>
            <button class="nav-link ${o==="queue"?"active":""}" data-view="queue">
              <i>⏱️</i>
              <span>${t.nav.queue}</span>
            </button>
            <button class="nav-link ${o==="procurements"?"active":""}" data-view="procurements">
              <i>🌾</i>
              <span>${t.nav.procurements}</span>
            </button>
            <button class="nav-link ${o==="sms"?"active":""}" data-view="sms">
              <i>📱</i>
              <span>${t.nav.smsLogs}</span>
            </button>
          </nav>
        `:""}

        <!-- APMC ADMIN LINKS -->
        ${s?`
          <div class="sidebar-section-title">APMC Administration</div>
          <nav class="sidebar-nav">
            <button class="nav-link ${o==="centre"?"active":""}" data-view="centre">
              <i>🏢</i>
              <span>Mandi Operations</span>
              <span class="badge-count">Live</span>
            </button>
            <button class="nav-link ${o==="queue"?"active":""}" data-view="queue">
              <i>⏱️</i>
              <span>Live Queue Monitor</span>
            </button>
            <button class="nav-link ${o==="procurements"?"active":""}" data-view="procurements">
              <i>📜</i>
              <span>Procurement Slips & DBT</span>
            </button>
            <button class="nav-link ${o==="buyer"?"active":""}" data-view="buyer">
              <i>🛒</i>
              <span>Buyer Contracts & Lots</span>
            </button>
          </nav>
        `:""}

        <!-- BUYER PORTAL LINKS -->
        ${n?`
          <div class="sidebar-section-title">Buyer & Processor Portal</div>
          <nav class="sidebar-nav">
            <button class="nav-link ${o==="buyer"?"active":""}" data-view="buyer">
              <i>🛒</i>
              <span>Mandi Marketplace</span>
              <span class="badge-count" style="background:#2563eb">Active</span>
            </button>
            <button class="nav-link ${o==="queue"?"active":""}" data-view="queue">
              <i>⏱️</i>
              <span>Gate & Inward Status</span>
            </button>
            <button class="nav-link ${o==="centre"?"active":""}" data-view="centre">
              <i>🏢</i>
              <span>Centre Weighbridge</span>
            </button>
          </nav>
        `:""}

        <!-- Common Quick Notification Link -->
        <div class="sidebar-section-title" style="margin-top:14px">Quick Center</div>
        <nav class="sidebar-nav">
          <button id="sidebar-notif-btn" class="nav-link" data-view="notifications">
            <i>🔔</i>
            <span>Alerts & Notifications</span>
          </button>
        </nav>
      </div>

      <div class="sidebar-footer">
        <div class="support-card">
          <b>🌾 Mandi Helpline</b>
          <span>Toll-Free Govt. APMC Support</span>
          <span class="support-phone">📞 1800-180-1551</span>
        </div>
      </div>
    </aside>
  `}function S({user:o,stats:e,latestBooking:t,queueStatus:i,t:a,onNavigate:s}){const n=t||{date:"12 September, Friday",timeSlot:"10:30 – 11:00 AM",token:"A-047",centreName:"Jaitpur Procurement Centre",cropName:"Paddy (धान)",quantity:42},d=i||{nowServingToken:"A-038",farmersAhead:9},u=e||{totalProcured:133400,paid:133400,pending:101850};return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${a.dashboard.greeting}, ${o?.name||"Ramesh Kumar"}! 👋</h1>
        <p class="page-subtitle">${a.dashboard.subtitle}</p>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <div>
          <!-- Upcoming Procurement Slot Card -->
          <article class="slot-hero-card">
            <div class="slot-hero-eyebrow">${a.dashboard.upcomingSlot}</div>
            <h2 class="slot-hero-title">${n.displayDate||n.date} <span>• ${n.timeSlot}</span></h2>
            
            <div class="slot-hero-footer">
              <div class="slot-hero-info">
                <p>${a.dashboard.mandi}: <b>${n.centreName}</b></p>
                <p>${a.dashboard.crop}: <b>${n.cropName} • ${n.quantity} quintals</b></p>
              </div>
              <div class="token-box">
                <span>${a.dashboard.token}</span>
                <strong>#${n.token}</strong>
              </div>
            </div>
          </article>

          <!-- Season Financial Stats -->
          <div class="stats-grid">
            <div class="stat-card">
              <span class="label">${a.dashboard.totalProcured}</span>
              <strong class="value">₹${(u.totalProcured||235250).toLocaleString("en-IN")}</strong>
              <span class="sub">↑ Active Season 2026</span>
            </div>
            <div class="stat-card">
              <span class="label">${a.dashboard.paid}</span>
              <strong class="value" style="color:#15803d">₹${(u.paid||133400).toLocaleString("en-IN")}</strong>
              <span class="sub">✓ 2 DBT Cleared</span>
            </div>
            <div class="stat-card">
              <span class="label">${a.dashboard.pending}</span>
              <strong class="value" style="color:#d97706">₹${(u.pending||101850).toLocaleString("en-IN")}</strong>
              <span class="sub" style="color:#d97706">Processing by PFMS</span>
            </div>
          </div>
        </div>

        <!-- Live Queue Snapshot Card -->
        <article class="card">
          <div class="queue-card-head">
            <h3>${a.dashboard.liveQueueTitle}</h3>
            <span class="pulse-dot"></span>
          </div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:10px">Jaitpur Centre • Real-time Gate Feed</p>
          
          <div class="queue-number-display">
            #${d.nowServingToken||"A-038"}
            <small>${a.dashboard.nowServing}</small>
          </div>

          <div class="queue-progress-bar">
            <div class="queue-progress-bar-fill"></div>
          </div>

          <div style="font-size:13px;color:#4b5d50;margin-bottom:16px">
            <b>42</b> ${a.dashboard.completedToday} • ${a.dashboard.avgWait}: <b>3 min</b>
          </div>

          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 14px;font-size:12px;color:#0369a1;margin-bottom:16px">
            📍 Your token <b>#${n.token}</b> is <b>${d.farmersAhead}</b> positions away.
          </div>

          <button id="dash-open-queue" class="btn-outline" style="width:100%;font-weight:700">
            ${a.dashboard.viewQueue}
          </button>
        </article>
      </div>

      <!-- Quick Action Shortcuts -->
      <div class="quick-shortcuts">
        <button id="dash-quick-book" class="shortcut-card">
          <span class="shortcut-icon">＋</span>
          <b>${a.dashboard.bookSlotBtn}</b>
          <small>${a.dashboard.bookSlotSub}</small>
        </button>
        <button id="dash-quick-queue" class="shortcut-card">
          <span class="shortcut-icon">◷</span>
          <b>${a.dashboard.checkQueueBtn}</b>
          <small>${a.dashboard.checkQueueSub}</small>
        </button>
        <button id="dash-quick-pay" class="shortcut-card">
          <span class="shortcut-icon">₹</span>
          <b>${a.dashboard.trackPaymentBtn}</b>
          <small>${a.dashboard.trackPaymentSub}</small>
        </button>
        <button id="dash-quick-sms" class="shortcut-card">
          <span class="shortcut-icon">📱</span>
          <b>${a.dashboard.smsAlertsBtn}</b>
          <small>${a.dashboard.smsAlertsSub}</small>
        </button>
      </div>

      <!-- Recent Timeline & Mandi Advisory -->
      <div class="bottom-info-grid">
        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:17px;font-weight:800">${a.dashboard.recentActivity}</h3>
            <button id="dash-view-all-history" class="btn-outline btn-sm">View all →</button>
          </div>
          
          <div class="activity-row">
            <div class="activity-icon-box">✓</div>
            <div style="flex:1">
              <b style="font-size:14px">Payment Received — ₹1,33,400</b>
              <p style="font-size:12px;color:#6b7280">Paddy Procurement • UTR SBI982341908234</p>
            </div>
            <span class="status-pill paid">Paid</span>
          </div>

          <div class="activity-row">
            <div class="activity-icon-box">🌾</div>
            <div style="flex:1">
              <b style="font-size:14px">Wheat Procurement Weighed — 42 qtl</b>
              <p style="font-size:12px;color:#6b7280">Receipt #KR-2026-8645 • Jaitpur Mandi</p>
            </div>
            <span class="status-pill processing">Processing</span>
          </div>

          <div class="activity-row">
            <div class="activity-icon-box">📅</div>
            <div style="flex:1">
              <b style="font-size:14px">Slot Booked for 12 September</b>
              <p style="font-size:12px;color:#6b7280">Token #${n.token} • SMS Confirmed</p>
            </div>
            <span class="status-pill waiting">Confirmed</span>
          </div>
        </article>

        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:17px;font-weight:800">${a.dashboard.centreNotice}</h3>
            <span class="status-pill paid">Open Today</span>
          </div>
          <p style="font-size:14px;color:#4b5d50;line-height:1.6;margin-bottom:16px">
            ${a.dashboard.noticeContent}
          </p>
          <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:12px;padding:14px;font-size:13px;color:#92400e;line-height:1.5">
            🔔 <b>SMS Arrival Guidance:</b> You do not need to stand in long queues. The automated system will send an SMS when only 5 farmers remain before your turn.
          </div>
        </article>
      </div>
    </div>
  `}function x({centres:o,crops:e,availableSlots:t,selectedValues:i,t:a}){const s=o||[],n=e||[],d=t||[],u=i||{centreId:"CTR-UP-01",cropId:"paddy_comm",quantity:42,date:"2026-09-12",timeSlot:"10:30 – 11:00 AM"},p=n.find(l=>l.id===u.cropId)||n[0]||{name:"Paddy / धान",mspRate:2300},m=s.find(l=>l.id===u.centreId)||s[0]||{name:"Jaitpur Procurement Centre"},b=Math.round((Number(u.quantity)||0)*(p.mspRate||2300)),r=[{value:"2026-09-12",label:"12 Sep",day:"Friday"},{value:"2026-09-13",label:"13 Sep",day:"Saturday"},{value:"2026-09-15",label:"15 Sep",day:"Monday"},{value:"2026-09-16",label:"16 Sep",day:"Tuesday"}];return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${a.booking.title}</h1>
        <p class="page-subtitle">${a.booking.subtitle}</p>
      </div>

      <div class="booking-layout">
        <article class="card">
          <div class="stepper-header">
            <div class="stepper-step active"></div>
            <div class="stepper-step active"></div>
            <div class="stepper-step active"></div>
          </div>

          <!-- Step 1: Centre Selection -->
          <div class="form-field">
            <label>${a.booking.centreLabel}</label>
            <select id="book-centre-select">
              ${s.map(l=>`
                <option value="${l.id}" ${l.id===u.centreId?"selected":""}>
                  ${l.name} (${l.distanceKm} km away) • Today: ${l.todayBooked||64}/${l.dailyCapacity||90}
                </option>
              `).join("")}
            </select>
          </div>

          <!-- Step 2: Crop & Quantity -->
          <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px">
            <div class="form-field">
              <label>${a.booking.cropLabel}</label>
              <select id="book-crop-select">
                ${n.map(l=>`
                  <option value="${l.id}" ${l.id===u.cropId?"selected":""}>
                    ${l.name} — MSP: ₹${l.mspRate.toLocaleString("en-IN")}/qtl
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="form-field">
              <label>${a.booking.qtyLabel}</label>
              <input id="book-qty-input" type="number" min="1" max="500" value="${u.quantity||42}" />
            </div>
          </div>

          <div class="form-field">
            <label>${a.booking.vehicleLabel}</label>
            <select id="book-vehicle-select">
              <option value="Tractor Trolley">Tractor Trolley / ट्रैक्टर ट्रॉली</option>
              <option value="Pickup / LCV 407">Pickup Truck / छोटा हाथी (LCV)</option>
              <option value="Bullock Cart / Small Carrier">Bullock Cart / बैलगाड़ी / छोटा वाहन</option>
              <option value="Multi-axle Truck">Large Heavy Truck / भारी ट्रक</option>
            </select>
          </div>

          <!-- Step 3: Date & Time Slot Grid -->
          <div class="form-field">
            <label>${a.booking.dateLabel}</label>
            <div class="slot-pill-grid">
              ${r.map(l=>`
                <div class="slot-pill date-choice ${l.value===u.date?"selected":""}" data-date="${l.value}">
                  <b>${l.label}</b>
                  <small>${l.day}</small>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="form-field">
            <label>${a.booking.slotLabel}</label>
            <div class="slot-pill-grid">
              ${d.map(l=>`
                <div class="slot-pill time-choice ${l.label===u.timeSlot?"selected":""}" data-slot="${l.label}">
                  <b>${l.label}</b>
                  <small>${l.remaining} ${a.booking.slotsLeft}</small>
                </div>
              `).join("")}
            </div>
          </div>

          <button id="btn-confirm-slot-booking" class="cta" style="width:100%;margin-top:10px;padding:16px;font-size:16px">
            ✓ ${a.booking.confirmBtn}
          </button>
        </article>

        <!-- Right Booking Summary Card -->
        <aside class="card" style="height:fit-content">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px">${a.booking.summaryTitle}</h3>
          
          <div class="summary-line">
            <span>Procurement Mandi</span>
            <b>${m.name}</b>
          </div>

          <div class="summary-line">
            <span>Crop Harvest</span>
            <b>${p.name}</b>
          </div>

          <div class="summary-line">
            <span>Government MSP Rate</span>
            <b>₹${p.mspRate.toLocaleString("en-IN")} / qtl</b>
          </div>

          <div class="summary-line">
            <span>Declared Quantity</span>
            <b>${u.quantity||42} quintals</b>
          </div>

          <div class="summary-line">
            <span>Scheduled Date</span>
            <b>${r.find(l=>l.value===u.date)?.label||"12 Sep"}, 2026</b>
          </div>

          <div class="summary-line">
            <span>Time Window</span>
            <b>${u.timeSlot||"10:30 – 11:00 AM"}</b>
          </div>

          <div class="summary-total">
            <span>${a.booking.calculatedAmount}:</span>
            <b>₹${b.toLocaleString("en-IN")}</b>
          </div>

          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px;font-size:12px;color:#92400e;line-height:1.5;margin-top:20px">
            📩 <b>${a.booking.note}</b>
          </div>
        </aside>
      </div>
    </div>
  `}function k({queueStatus:o,userToken:e,t}){const i=o||{centreName:"Jaitpur Procurement Centre",nowServingToken:"A-038",currentFarmer:"Vijay Singh",farmersAhead:9,estimatedWaitMin:27,counters:[{id:1,name:"Counter 1 (Gate & Token Verification)",servingToken:"A-035",servingFarmer:"Ram Swaroop"},{id:2,name:"Counter 2 (Moisture & Quality Assay)",servingToken:"A-038",servingFarmer:"Vijay Singh"},{id:3,name:"Counter 3 (Weighbridge & J-Form Slip)",servingToken:"A-032",servingFarmer:"Ghanshyam"}],totalBooked:64,completedToday:42,dailyCapacity:90},a=e;return`
    <div class="page-container">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <h1 class="page-title">${t.queue.title}</h1>
          <p class="page-subtitle">${i.centreName} • <span class="pulse-dot"></span> Sate-of-the-art Live Stream</p>
        </div>
        <div>
          <button id="btn-simulate-queue" class="btn-secondary">
            ⚡ ${t.queue.simulateBtn}
          </button>
        </div>
      </div>

      <div class="queue-board-layout">
        <div>
          <!-- Giant Now Serving Board -->
          <article class="giant-serving-card">
            <span class="badge">${t.queue.nowServing}</span>
            <div class="giant-serving-num">#${i.nowServingToken}</div>
            <div class="giant-serving-farmer">${i.currentFarmer||"Farmer"} • Counter ${i.counter||2}</div>
            <p style="font-size:13px;color:#6b7280;margin-top:6px">Live Gate Sensors Active • Updated in real-time</p>
          </article>

          <!-- Expected Farmer Position -->
          <div class="expected-position-box">
            <div class="position-icon">📍</div>
            <div style="flex:1">
              <span style="font-size:12px;color:#4b5d50;font-weight:700;letter-spacing:0.04em">${t.queue.expectedPosition}</span>
              <div style="display:flex;align-items:baseline;gap:10px">
                <strong>#${a}</strong>
                <span style="font-size:14px;color:#15803d;font-weight:700">• ${i.farmersAhead} ${t.queue.ahead}</span>
              </div>
            </div>
          </div>

          <!-- Multi-Counter Breakdown -->
          <article class="card" style="margin-top:20px">
            <h3 style="font-size:17px;font-weight:800;margin-bottom:14px">${t.queue.countersTitle}</h3>
            
            ${(i.counters||[]).map(s=>`
              <div class="counter-row">
                <div class="counter-name">
                  <b>${s.name.split("(")[0]}</b>
                  <div style="font-size:11px;color:#6b7280">${s.name.split("(")[1]?.replace(")","")||""}</div>
                </div>
                <div class="counter-meter">
                  <i style="width:${s.id===1?"75%":s.id===2?"85%":"60%"}"></i>
                </div>
                <div class="counter-serving-token">#${s.servingToken}</div>
              </div>
            `).join("")}
          </article>
        </div>

        <!-- Right Side Advisory & Capacity -->
        <aside class="card" style="height:fit-content">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:12px">${t.queue.planArrival}</h3>
          
          <div class="queue-number-display" style="font-size:44px;color:#15803d">
            ~${i.estimatedWaitMin} min
          </div>
          <p style="font-size:13px;color:#6b7280;margin-bottom:20px">${t.queue.estWait}</p>

          <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:16px;font-size:13px;color:#1e40af;line-height:1.5">
            🔔 <b>Smart SMS Advisory:</b><br>
            ${t.queue.reminderNotice}
          </div>

          <button id="btn-set-arrival-reminder" class="btn-outline" style="width:100%;margin-top:16px;padding:12px;font-weight:700">
            📲 ${t.queue.setReminderBtn}
          </button>

          <div style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:20px">
            <h4 style="font-size:15px;font-weight:700;margin-bottom:14px">${t.queue.centreCapacity}</h4>
            
            <div class="summary-line">
              <span>Booked Slots Today</span>
              <b>${i.totalBooked} / ${i.dailyCapacity}</b>
            </div>
            <div class="summary-line">
              <span>Weighed & Completed</span>
              <b style="color:#15803d">${i.completedToday} farmers</b>
            </div>
            <div class="summary-line">
              <span>Remaining Capacity</span>
              <b>${Math.max(0,i.dailyCapacity-i.totalBooked)} vehicles</b>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `}function w({procurements:o,t:e}){const t=o||[];return`
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">${e.procurements.title}</h1>
        <p class="page-subtitle">${e.procurements.subtitle}</p>
      </div>

      <article class="card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>${e.procurements.tableId}</th>
                <th>${e.procurements.tableDate}</th>
                <th>${e.procurements.tableCrop}</th>
                <th>${e.procurements.tableAmount}</th>
                <th>${e.procurements.tableStatus}</th>
                <th>${e.procurements.tablePayment}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${t.length===0?`
                <tr>
                  <td colspan="7" style="text-align:center;padding:30px;color:#9ca3af">
                    No procurement records found.
                  </td>
                </tr>
              `:t.map(i=>`
                <tr>
                  <td><b>${i.id}</b></td>
                  <td>${i.date}</td>
                  <td>${i.crop||i.cropFullName}</td>
                  <td><b style="color:#0f2e1b">₹${i.amount.toLocaleString("en-IN")}</b></td>
                  <td><span class="status-pill completed">${i.status}</span></td>
                  <td>
                    <span class="status-pill ${i.paymentStatus==="PAID"?"paid":"processing"}">
                      ${i.paymentStatus==="PAID"?"Paid ✓":i.expectedDate?`Expected ${i.expectedDate}`:"Processing"}
                    </span>
                  </td>
                  <td>
                    <button class="btn-outline btn-sm btn-view-slip" data-id="${i.id}">
                      📄 ${e.procurements.actionSlip}
                    </button>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>

      <!-- Active Payment Pipeline Tracking (For Most Recent Transaction) -->
      ${t.length>0?`
        <article class="card" style="margin-top:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <div>
              <h3 style="font-size:18px;font-weight:800">${e.procurements.pipelineTitle}</h3>
              <p style="font-size:13px;color:#6b7280">Procurement ID: <b>${t[0].id}</b> • Net Payable: <b>₹${t[0].amount.toLocaleString("en-IN")}</b></p>
            </div>
            <span class="status-pill ${t[0].paymentStatus==="PAID"?"paid":"processing"}">
              ${t[0].paymentStatus==="PAID"?"Payment Credited ✓":"In Processing via PFMS"}
            </span>
          </div>

          <div class="dbt-pipeline">
            ${(t[0].milestones||[]).map((i,a)=>`
              <div class="dbt-step ${i.done?"done":""}">
                <div class="dbt-step-circle">${i.done?"✓":a+1}</div>
                <div class="dbt-step-info">
                  <b>${i.stage}</b>
                  <small>${i.time}</small>
                </div>
              </div>
            `).join("")}
          </div>
        </article>
      `:""}
    </div>
  `}function $({stats:o,tokens:e,crops:t,t:i}){const a=o?.metrics||{todayBookings:64,dailyCapacity:90,waitingNow:19,completedToday:42,nowServing:"A-038"},s=e||[],n=t||[];return`
    <div class="page-container">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <h1 class="page-title">${i.centre.title}</h1>
          <p class="page-subtitle">${i.centre.subtitle}</p>
        </div>
        <div style="display:flex;gap:10px">
          <button id="btn-centre-advance" class="cta">
            📢 ${i.centre.advanceBtn}
          </button>
          <button id="btn-open-delay-modal" class="btn-secondary">
            ⚠️ ${i.centre.delayAlertBtn}
          </button>
        </div>
      </div>

      <!-- Mandi Key Operational Metrics -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
        <div class="stat-card">
          <span class="label">${i.centre.todayBooked}</span>
          <strong class="value">${a.todayBookings} <small style="font-size:14px;color:#6b7280">/ ${a.dailyCapacity}</small></strong>
          <span class="sub">71% Capacity Utilized</span>
        </div>
        <div class="stat-card">
          <span class="label">${i.centre.waitingTokens}</span>
          <strong class="value" style="color:#d97706">${a.waitingNow}</strong>
          <span class="sub" style="color:#d97706">Avg. wait 18 min</span>
        </div>
        <div class="stat-card">
          <span class="label">${i.centre.completedCount}</span>
          <strong class="value" style="color:#15803d">${a.completedToday}</strong>
          <span class="sub">↑ 14% vs yesterday</span>
        </div>
        <div class="stat-card">
          <span class="label">Now Serving</span>
          <strong class="value" style="color:#15803d">#${a.nowServing}</strong>
          <span class="sub">Counter 2 (Assay)</span>
        </div>
      </div>

      <!-- Live Counter Control & Weighment Entry -->
      <div class="booking-layout">
        <!-- New Weighment & Quality Entry Form -->
        <article class="card">
          <h3 style="font-size:18px;font-weight:800;margin-bottom:16px">${i.centre.weighmentTitle}</h3>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-field">
              <label>${i.centre.tokenInput}</label>
              <input id="weigh-token-input" type="text" value="A-047" placeholder="e.g. A-047" />
            </div>

            <div class="form-field">
              <label>Crop Selection</label>
              <select id="weigh-crop-select">
                ${n.map(d=>`
                  <option value="${d.id}">${d.name} (MSP ₹${d.mspRate})</option>
                `).join("")}
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
            <div class="form-field">
              <label>${i.centre.grossInput}</label>
              <input id="weigh-gross-input" type="number" step="0.1" value="62.5" />
            </div>

            <div class="form-field">
              <label>${i.centre.tareInput}</label>
              <input id="weigh-tare-input" type="number" step="0.1" value="2.5" />
            </div>

            <div class="form-field">
              <label>${i.centre.moistureInput}</label>
              <input id="weigh-moisture-input" type="number" step="0.1" value="14.0" />
            </div>
          </div>

          <div style="background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:16px;margin:16px 0">
            <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px">
              <span>Calculated Net Weight:</span>
              <b id="calc-net-wt" style="color:#15803d;font-size:16px">60.0 quintals</b>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:14px">
              <span>Total Payable to Farmer (at Official MSP):</span>
              <b id="calc-net-amount" style="color:#0f2e1b;font-size:18px">₹1,38,000</b>
            </div>
          </div>

          <button id="btn-submit-weighment" class="cta" style="width:100%;padding:14px">
            ⚖️ ${i.centre.saveWeighmentBtn}
          </button>
        </article>

        <!-- Scheduled Farmer Tokens List for Today -->
        <article class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <h3 style="font-size:17px;font-weight:800">Today’s Mandi Arrivals</h3>
            <span class="status-pill waiting">${s.length} scheduled</span>
          </div>

          <div class="table-container" style="max-height:380px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Farmer</th>
                  <th>Time Slot</th>
                  <th>Crop</th>
                </tr>
              </thead>
              <tbody>
                ${s.map(d=>`
                  <tr>
                    <td><b>#${d.token}</b></td>
                    <td>${d.farmerName}</td>
                    <td>${d.timeSlot}</td>
                    <td>${d.cropName||"Paddy"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <!-- Delay Broadcast Modal (Hidden by default) -->
      <div id="delay-broadcast-modal" class="modal-backdrop hidden">
        <div class="modal-window">
          <button id="btn-close-delay-modal" class="modal-close-btn">✕</button>

          <h2 style="font-size:20px;font-weight:800;color:#991b1b;margin-bottom:8px">
            📢 Broadcast Mandi Delay / Emergency Alert
          </h2>
          <p style="font-size:13px;color:#6b7280;margin-bottom:18px">
            This will immediately trigger an urgent bilingual SMS advisory to all scheduled farmers booked for today at Jaitpur Mandi.
          </p>

          <div class="form-field">
            <label>Reason for Delay</label>
            <input id="broadcast-reason" type="text" value="Unseasonal rain and wet grain assay delay" />
          </div>

          <div class="form-field">
            <label>Estimated Delay (Minutes)</label>
            <input id="broadcast-delay-mins" type="number" value="45" />
          </div>

          <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:10px;font-size:12px;color:#991b1b;margin-bottom:20px">
            ⚠️ <b>Telecom Broadcast Notice:</b> Message will be delivered with sender ID <code>VK-KRISHI</code> to all pending vehicle drivers.
          </div>

          <button id="btn-send-broadcast" class="cta" style="width:100%;background:#dc2626">
            Send Broadcast SMS Now →
          </button>
        </div>
      </div>
    </div>
  `}function E({user:o,lots:e=[],orders:t=[],t:i}){const a=o?.name||"Vikram Singhania",s=o?.company||"AgroCorp Foods Pvt Ltd",n=o?.licenseNo||"APMC-DL-8821",d=o?.gstin||"09AAACA1234Q1Z5",u=t.length,p=t.reduce((r,l)=>r+(Number(l.quantity)||0),0),m=t.reduce((r,l)=>r+(Number(l.totalValue)||0),0),b=t.filter(r=>r.gatePassId).length;return`
    <div class="page-container buyer-view">
      <!-- Buyer Header -->
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="role-badge" style="background:#dbeafe;color:#1e40af;border-color:#bfdbfe">
              🏢 APMC Licensed Buyer & Processor
            </span>
            <span style="font-size:12px;color:#6b7280">License: <b>${n}</b> • GSTIN: <b>${d}</b></span>
          </div>
          <h1 class="page-title" style="font-size:26px">Welcome, ${a}</h1>
          <p class="page-subtitle">${s} • Direct Mandi Procurement Hub</p>
        </div>

        <div style="display:flex;gap:10px">
          <button id="btn-refresh-market" class="btn-secondary" style="font-weight:700">
            🔄 Refresh Marketplace
          </button>
          <a href="#marketplace-section" class="cta">
            🌾 Browse Mandi Lots (${e.length}) →
          </a>
        </div>
      </div>

      <!-- Commercial Procurement Metrics Grid -->
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:28px">
        <div class="stat-card">
          <span class="label">Procurement Contracts</span>
          <strong class="value" style="color:#1e40af">${u}</strong>
          <span class="sub" style="color:#2563eb">Active APMC Trade Contracts</span>
        </div>

        <div class="stat-card">
          <span class="label">Grain Volume Booked</span>
          <strong class="value" style="color:#0f766e">${p} <small style="font-size:14px;color:#6b7280">quintals</small></strong>
          <span class="sub" style="color:#0d9488">Direct from Registered Farmers</span>
        </div>

        <div class="stat-card">
          <span class="label">Total Mandi Outlay</span>
          <strong class="value" style="color:#15803d">₹${m.toLocaleString("en-IN")}</strong>
          <span class="sub">Guaranteed MSP & Competitive Bids</span>
        </div>

        <div class="stat-card">
          <span class="label">Active Gate Passes</span>
          <strong class="value" style="color:#d97706">${b}</strong>
          <span class="sub" style="color:#b45309">Vehicles authorized for weighbridge</span>
        </div>
      </div>

      <!-- SECTION 1: MANDI ARRIVAL MARKETPLACE -->
      <section id="marketplace-section" style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
                🌾 Live Mandi Arrivals & Farmer Harvest Lots
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Scheduled farmer deliveries arriving across Gorakhpur Mandi network. Place verified commercial bids.
              </p>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="pill-live" style="background:#dcfce7;color:#15803d;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">
                <span class="pulse-dot" style="display:inline-block;margin-right:4px"></span>
                ${e.length} Lots Available Today
              </span>
            </div>
          </div>

          <div class="table-container" style="max-height:420px;overflow-y:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Token & ID</th>
                  <th>Crop & Variety</th>
                  <th>Farmer (Seller)</th>
                  <th>Mandi Centre</th>
                  <th>Scheduled Arrival</th>
                  <th>Quantity</th>
                  <th>Official MSP</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${e.length===0?`
                  <tr>
                    <td colspan="8" style="text-align:center;padding:30px;color:#9ca3af">
                      No arriving lots listed at the moment.
                    </td>
                  </tr>
                `:e.map(r=>`
                  <tr>
                    <td>
                      <span class="status-pill waiting" style="font-weight:800">#${r.token||"A-001"}</span>
                    </td>
                    <td>
                      <b>${r.cropName}</b>
                      <div style="font-size:11px;color:#6b7280">${r.estimatedMoisture||"FAQ Grade"}</div>
                    </td>
                    <td>
                      <div><b>${r.farmerName}</b></div>
                      <small style="color:#9ca3af">ID: ${r.farmerId}</small>
                    </td>
                    <td>
                      <div>${r.centreName}</div>
                    </td>
                    <td>
                      <b>${r.displayDate||r.arrivalDate}</b>
                      <div style="font-size:12px;color:#4b5563">${r.timeSlot}</div>
                    </td>
                    <td>
                      <strong style="color:#0f766e;font-size:15px">${r.quantity} qtl</strong>
                    </td>
                    <td>
                      <div style="font-weight:700;color:#15803d">₹${(r.mspRate||2300).toLocaleString("en-IN")}</div>
                      <small style="font-size:10px;color:#6b7280">per quintal</small>
                    </td>
                    <td>
                      <button 
                        class="btn-bid-lot cta" 
                        style="padding:7px 14px;font-size:12px;box-shadow:none"
                        data-lot='${JSON.stringify(r).replace(/'/g,"&apos;")}'
                      >
                        ⚡ Place Bid / Buy
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- SECTION 2: BUYER ORDERS & GATE PASSES -->
      <section style="margin-bottom:36px">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <div>
              <h2 style="font-size:19px;font-weight:800;color:#0f2e1b">
                📑 My Mandi Procurement Contracts & Logistics
              </h2>
              <p style="font-size:13px;color:#6b7280">
                Track confirmed orders, download weighbridge gate passes, and review procurement invoices.
              </p>
            </div>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order Contract #</th>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Offered Rate</th>
                  <th>Total Payable</th>
                  <th>Mandi Centre</th>
                  <th>Status</th>
                  <th>Pickup Gate Pass</th>
                </tr>
              </thead>
              <tbody>
                ${t.length===0?`
                  <tr>
                    <td colspan="8" style="text-align:center;padding:30px;color:#9ca3af">
                      No contracts placed yet. Select a lot above to place your first commercial procurement order!
                    </td>
                  </tr>
                `:t.map(r=>`
                  <tr>
                    <td>
                      <b>#${r.id}</b>
                      <div style="font-size:11px;color:#9ca3af">${new Date(r.createdAt||Date.now()).toLocaleDateString()}</div>
                    </td>
                    <td><b>${r.cropName}</b></td>
                    <td>${r.quantity} qtl</td>
                    <td>₹${(r.offeredRate||0).toLocaleString("en-IN")}/qtl</td>
                    <td>
                      <strong style="color:#15803d;font-size:15px">₹${(r.totalValue||0).toLocaleString("en-IN")}</strong>
                    </td>
                    <td>${r.centreName||"Jaitpur Procurement Centre"}</td>
                    <td>
                      <span class="status-pill ${r.status==="CONFIRMED"?"confirmed":"waiting"}">
                        ${r.status}
                      </span>
                    </td>
                    <td>
                      ${r.gatePassId?`
                        <button class="btn-view-gatepass btn-outline btn-sm" data-order='${JSON.stringify(r).replace(/'/g,"&apos;")}'>
                          🎫 Pass #${r.gatePassId}
                        </button>
                      `:`
                        <span style="font-size:12px;color:#9ca3af">Processing pass...</span>
                      `}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- BID MODAL (Rendered into body or hidden element) -->
      <div id="buyer-bid-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:480px">
          <button id="btn-close-bid-modal" class="modal-close-btn">✕</button>

          <div style="text-align:center;margin-bottom:18px">
            <div style="font-size:32px;margin-bottom:6px">🤝</div>
            <h2 style="font-size:20px;font-weight:800;color:#0f2e1b">Place Commercial Purchase Offer</h2>
            <p style="font-size:13px;color:#6b7280">Direct APMC Mandi Procurement Contract</p>
          </div>

          <div id="bid-modal-lot-summary" style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;border-radius:12px;margin-bottom:16px;font-size:13px">
            <!-- Populated dynamically -->
          </div>

          <div class="form-field">
            <label>Quantity to Procure (Quintals)</label>
            <input id="bid-qty-input" type="number" step="1" value="50" min="5" />
          </div>

          <div class="form-field">
            <label>Offered Rate per Quintal (₹)</label>
            <input id="bid-rate-input" type="number" step="10" value="2350" />
            <small style="color:#059669;font-size:11px;margin-top:4px;display:block">
              ℹ️ Offer should meet or exceed the official MSP rate for guaranteed acceptance.
            </small>
          </div>

          <div style="background:#ecfdf5;border:1.5px dashed #10b981;border-radius:12px;padding:14px;margin:18px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span>Estimated Contract Value:</span>
              <b id="bid-calc-total" style="color:#065f46;font-size:17px">₹1,17,500</b>
            </div>
            <div style="font-size:11px;color:#047857">
              Includes APMC mandi cess, weighment supervision, and instant J-Form generation.
            </div>
          </div>

          <button id="btn-confirm-buyer-bid" class="cta" style="width:100%;padding:14px">
            Confirm & Issue Contract Order →
          </button>
        </div>
      </div>

      <!-- GATE PASS MODAL -->
      <div id="buyer-pass-modal" class="modal-backdrop hidden">
        <div class="modal-window" style="max-width:440px;text-align:center">
          <button id="btn-close-pass-modal" class="modal-close-btn">✕</button>

          <div style="border-bottom:2px dashed #e2e8f0;padding-bottom:16px;margin-bottom:16px">
            <div style="font-size:28px;margin-bottom:4px">🏛️</div>
            <h3 style="font-size:18px;color:#0f2e1b">APMC Mandi Weighbridge Pass</h3>
            <span id="pass-modal-id" style="font-size:12px;font-weight:700;color:#1e40af;letter-spacing:0.05em">GATE PASS #GP-2026-881</span>
          </div>

          <div id="pass-modal-content" style="text-align:left;font-size:13px;line-height:1.6;margin-bottom:20px">
            <!-- Populated dynamically -->
          </div>

          <div style="background:#f1f5f9;padding:12px;border-radius:10px;font-family:monospace;letter-spacing:0.15em;font-weight:700;margin-bottom:16px">
            ||||| | |||| |||||| || | |||| |||||
          </div>

          <button id="btn-print-gate-pass" class="btn-outline" style="width:100%">
            🖨️ Print / Download Gate Pass (PDF)
          </button>
        </div>
      </div>
    </div>
  `}class I{constructor({api:e,onNavigate:t,onUpdate:i}){this.api=e,this.onNavigate=t,this.onUpdate=i,this.isOpen=!1,this.activeFilter="all",this.notifications=[],this.unreadCount=0}setNotifications(e=[],t=0){this.notifications=e,this.unreadCount=t,this.isOpen&&this.render()}toggle(e=null){this.isOpen=e!==null?e:!this.isOpen,this.render()}close(){this.isOpen=!1;const e=document.getElementById("notification-center-root");e&&(e.innerHTML="")}formatTime(e){if(!e)return"Recent";try{const t=Date.now()-new Date(e).getTime(),i=Math.floor(t/1e3),a=Math.floor(i/60),s=Math.floor(a/60),n=Math.floor(s/24);return i<60?"Just now":a<60?`${a}m ago`:s<24?`${s}h ago`:n===1?"Yesterday":`${n}d ago`}catch{return"Recent"}}getCategoryIcon(e,t){switch(e){case"slots":return"📅";case"payments":return"💰";case"orders":return"🛒";case"marketplace":return"🌾";default:return"🔔"}}getFilteredNotifications(){return this.activeFilter==="unread"?this.notifications.filter(e=>!e.read):this.activeFilter==="slots"?this.notifications.filter(e=>e.category==="slots"||e.type?.includes("SLOT")):this.activeFilter==="payments"?this.notifications.filter(e=>e.category==="payments"||e.type?.includes("PAYMENT")):this.activeFilter==="orders"?this.notifications.filter(e=>e.category==="orders"||e.category==="marketplace"):this.activeFilter==="alerts"?this.notifications.filter(e=>e.category==="alerts"||e.type?.includes("ALERT")):this.notifications}async handleMarkRead(e,t){try{await this.api.markNotificationRead(e);const i=this.notifications.find(a=>a.id===e);i&&(i.read=!0),this.unreadCount=Math.max(0,this.unreadCount-1),this.onUpdate&&this.onUpdate(this.notifications,this.unreadCount),this.render(),t&&this.onNavigate&&(this.close(),this.onNavigate(t))}catch(i){console.warn("Failed to mark read:",i)}}async handleMarkAllRead(e,t){try{await this.api.markAllNotificationsRead(e,t),this.notifications.forEach(i=>{i.read=!0}),this.unreadCount=0,this.onUpdate&&this.onUpdate(this.notifications,0),this.render()}catch(i){console.warn("Failed to mark all read:",i)}}async handleClear(e,t){try{await this.api.clearNotifications(e,t),this.notifications=this.notifications.filter(i=>!i.read),this.onUpdate&&this.onUpdate(this.notifications,this.unreadCount),this.render()}catch(i){console.warn("Failed to clear notifications:",i)}}render(){let e=document.getElementById("notification-center-root");if(e||(e=document.createElement("div"),e.id="notification-center-root",document.body.appendChild(e)),!this.isOpen){e.innerHTML="";return}const t=this.getFilteredNotifications(),i=this.api.currentUser;e.innerHTML=`
      <div id="notif-backdrop" class="notif-backdrop"></div>
      <aside class="notif-panel" role="dialog" aria-label="Notifications Center">
        <!-- Panel Header -->
        <div class="notif-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🔔</span>
            <strong style="font-size:17px;color:#0f2e1b">Notifications</strong>
            ${this.unreadCount>0?`<span class="notif-unread-pill">${this.unreadCount} new</span>`:""}
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
          <button class="notif-chip ${this.activeFilter==="all"?"active":""}" data-filter="all">
            All (${this.notifications.length})
          </button>
          <button class="notif-chip ${this.activeFilter==="unread"?"active":""}" data-filter="unread">
            Unread (${this.unreadCount})
          </button>
          <button class="notif-chip ${this.activeFilter==="slots"?"active":""}" data-filter="slots">
            📅 Slots
          </button>
          <button class="notif-chip ${this.activeFilter==="payments"?"active":""}" data-filter="payments">
            💰 Payments
          </button>
          <button class="notif-chip ${this.activeFilter==="orders"?"active":""}" data-filter="orders">
            🛒 Orders
          </button>
          <button class="notif-chip ${this.activeFilter==="alerts"?"active":""}" data-filter="alerts">
            ⚠️ Alerts
          </button>
        </div>

        <!-- Notification List -->
        <div class="notif-list">
          ${t.length===0?`
            <div class="notif-empty">
              <div style="font-size:42px;margin-bottom:12px">✨</div>
              <strong style="color:#374151">All caught up!</strong>
              <p style="font-size:13px;color:#9ca3af;margin-top:4px">No notifications in this category right now.</p>
            </div>
          `:`
            ${t.map(a=>`
              <div class="notif-card ${a.read?"read":"unread"}" data-id="${a.id}" data-link="${a.link||""}">
                <div class="notif-icon-box ${a.category||"alerts"}">
                  ${this.getCategoryIcon(a.category,a.type)}
                </div>
                <div class="notif-body">
                  <div class="notif-card-header">
                    <span class="notif-title">${a.title}</span>
                    <span class="notif-time">${this.formatTime(a.timestamp)}</span>
                  </div>
                  <p class="notif-message">${a.message}</p>
                  ${a.link?`
                    <div class="notif-action-link">
                      View details →
                    </div>
                  `:""}
                </div>
                ${a.read?"":'<span class="notif-dot" title="Unread"></span>'}
              </div>
            `).join("")}
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
    `,document.getElementById("notif-backdrop")?.addEventListener("click",()=>this.close()),document.getElementById("btn-close-notif")?.addEventListener("click",()=>this.close()),document.querySelectorAll(".notif-chip").forEach(a=>{a.addEventListener("click",()=>{this.activeFilter=a.getAttribute("data-filter"),this.render()})}),document.querySelectorAll(".notif-card").forEach(a=>{a.addEventListener("click",()=>{const s=a.getAttribute("data-id"),n=a.getAttribute("data-link");this.handleMarkRead(s,n)})}),document.getElementById("btn-mark-all-read")?.addEventListener("click",()=>{this.handleMarkAllRead(i?.id,i?.role)}),document.getElementById("btn-clear-read")?.addEventListener("click",()=>{this.handleClear(i?.id,i?.role)})}}class T{constructor(e,t){this.api=e,this.onSmsAction=t,this.isOpen=!1,this.smsList=[],this.unreadCount=0,this.init()}async init(){try{const e=await this.api.getSmsLogs();e&&e.logs&&(this.smsList=e.logs)}catch(e){console.warn("Could not load initial SMS logs:",e)}this.api.onSmsReceived(e=>{this.smsList.unshift(e),this.isOpen||this.unreadCount++,this.render(),this.isOpen||this.toggle(!0)}),this.render()}toggle(e=null){this.isOpen=e!==null?e:!this.isOpen,this.isOpen&&(this.unreadCount=0),this.render()}formatTime(e){try{return new Date(e).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}catch{return"Just now"}}render(){let e=document.getElementById("virtual-phone-root");if(e||(e=document.createElement("div"),e.id="virtual-phone-root",e.className="virtual-phone-widget",document.body.appendChild(e)),!this.isOpen){e.innerHTML=`
        <button id="btn-open-phone" class="phone-toggle-button">
          <span>📱 Farmer Virtual Phone (SMS Hub)</span>
          ${this.unreadCount>0?`<span class="phone-toggle-badge">${this.unreadCount} New</span>`:""}
        </button>
      `,document.getElementById("btn-open-phone")?.addEventListener("click",()=>this.toggle(!0));return}e.innerHTML=`
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
          ${this.smsList.length===0?`
            <div style="text-align:center;padding:40px 20px;color:#9ca3af;font-size:13px">
              No SMS messages yet.<br>Book a slot or advance the queue to see live SMS arrive!
            </div>
          `:this.smsList.map(t=>`
            <div class="phone-bubble">
              <div class="phone-bubble-header">
                <span>VK-KRISHI (Govt. of India)</span>
                <span>${t.type||"ALERT"}</span>
              </div>
              <div>${t.message}</div>
              <time>${this.formatTime(t.timestamp)} • Delivered ✓</time>
            </div>
          `).join("")}
        </div>
        <div style="padding:10px;background:#f3f4f6;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#6b7280">
          Simulated Farmer Mobile Device (DLT Compliant)
        </div>
      </div>
    `,document.getElementById("btn-close-phone")?.addEventListener("click",()=>this.toggle(!1))}}class L{constructor(e,t){this.api=e,this.onLoginSuccess=t,this.activeTab="farmer",this.step="phone",this.currentPhone="",this.demoOtp="",this.error=null}open(e="farmer"){this.activeTab=e,this.step="phone",this.currentPhone=e==="farmer"?"9876543210":"",this.error=null,this.render()}close(){const e=document.getElementById("auth-modal-root");e&&(e.innerHTML="")}async handleSendOtp(){const e=document.getElementById("auth-phone-input"),t=e?e.value.trim():"";if(!t||t.length<10){this.error="Please enter a valid 10-digit mobile number.",this.render();return}try{this.error=null;const i=await this.api.sendOtp(t);this.currentPhone=t,this.demoOtp=i.demoOtp||"",this.step="otp",this.render()}catch(i){this.error=i.message||"Failed to send OTP",this.render()}}async handleVerifyOtp(){const e=document.getElementById("auth-otp-input"),t=e?e.value.trim():"";if(!t){this.error="Please enter the 6-digit OTP sent via SMS.",this.render();return}try{this.error=null;const i=await this.api.verifyOtp(this.currentPhone,t);this.close(),this.onLoginSuccess&&this.onLoginSuccess(i.user)}catch(i){this.error=i.message||"Verification failed",this.render()}}async handleAdminLogin(){const e=document.getElementById("auth-admin-id"),t=document.getElementById("auth-admin-pwd"),i=e?e.value.trim():"",a=t?t.value:"";if(!i||!a){this.error="Please enter both Admin/Staff ID and Password.",this.render();return}try{this.error=null;const s=await this.api.loginStaff(i,a);this.close(),this.onLoginSuccess&&this.onLoginSuccess(s.user)}catch(s){this.error=s.message||"Admin login failed",this.render()}}async handleBuyerLogin(){const e=document.getElementById("auth-buyer-id"),t=document.getElementById("auth-buyer-pwd"),i=e?e.value.trim():"",a=t?t.value:"";if(!i||!a){this.error="Please enter both Buyer ID / Mobile and Password.",this.render();return}try{this.error=null;const s=await this.api.loginBuyer(i,a);this.close(),this.onLoginSuccess&&this.onLoginSuccess(s.user)}catch(s){this.error=s.message||"Buyer login failed",this.render()}}async handleQuickDemo(e){try{this.error=null;const t=await this.api.quickSwitch(e);this.close(),this.onLoginSuccess&&this.onLoginSuccess(t.user)}catch(t){this.error=t.message||"Quick login failed",this.render()}}render(){let e=document.getElementById("auth-modal-root");e||(e=document.createElement("div"),e.id="auth-modal-root",document.body.appendChild(e)),e.innerHTML=`
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
            <button id="tab-farmer" class="auth-tab-btn ${this.activeTab==="farmer"?"active":""}">
              🌾 Farmer (Seller)
            </button>
            <button id="tab-admin" class="auth-tab-btn ${this.activeTab==="admin"?"active":""}">
              🛡️ Admin
            </button>
            <button id="tab-buyer" class="auth-tab-btn ${this.activeTab==="buyer"?"active":""}">
              🛒 Buyer (Trader)
            </button>
          </div>

          ${this.error?`
            <div style="background:#fee2e2;color:#b91c1c;padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:18px;font-weight:600">
              ⚠️ ${this.error}
            </div>
          `:""}

          <!-- TAB 1: FARMER (SELLER) -->
          ${this.activeTab==="farmer"?`
            <div class="auth-role-header">
              <strong>🌾 Farmer / Crop Seller Access</strong>
              <span>Book procurement slots, track mandi queue, J-Forms & DBT payments</span>
            </div>

            ${this.step==="phone"?`
              <div class="form-field">
                <label>Registered Mobile Number / मोबाइल नंबर</label>
                <div style="display:flex;gap:8px">
                  <span style="display:flex;align-items:center;padding:0 14px;background:#f3f4f6;border:1.5px solid #d4dfd2;border-radius:12px;font-weight:700;color:#374151">+91</span>
                  <input id="auth-phone-input" type="tel" value="${this.currentPhone||"9876543210"}" placeholder="Enter 10-digit mobile" maxlength="10" />
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
            `:`
              <div class="form-field">
                <label>Enter 6-Digit SMS OTP sent to +91 ${this.currentPhone}</label>
                <input id="auth-otp-input" type="text" placeholder="e.g. ${this.demoOtp||"123456"}" maxlength="6" style="font-size:22px;letter-spacing:0.2em;text-align:center" />
              </div>

              ${this.demoOtp?`
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;background:#ecfdf5;border:1px solid #a7f3d0;padding:10px 14px;border-radius:10px;font-size:12px;color:#065f46">
                  <span>SMS OTP Received: <b>${this.demoOtp}</b></span>
                  <button id="btn-autofill-otp" class="btn-outline btn-sm" style="background:#fff">Auto-fill</button>
                </div>
              `:""}

              <button id="btn-submit-otp" class="cta" style="width:100%;margin-bottom:12px">
                Verify OTP & Enter / सत्यापित करें →
              </button>

              <button id="btn-back-phone" class="btn-outline" style="width:100%">
                ← Change Mobile Number
              </button>
            `}
          `:""}

          <!-- TAB 2: APMC ADMIN -->
          ${this.activeTab==="admin"?`
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
          `:""}

          <!-- TAB 3: BUYER (TRADER / MILLER) -->
          ${this.activeTab==="buyer"?`
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
          `:""}

        </div>
      </div>
    `,document.getElementById("modal-close")?.addEventListener("click",()=>this.close()),document.getElementById("tab-farmer")?.addEventListener("click",()=>{this.activeTab="farmer",this.render()}),document.getElementById("tab-admin")?.addEventListener("click",()=>{this.activeTab="admin",this.render()}),document.getElementById("tab-buyer")?.addEventListener("click",()=>{this.activeTab="buyer",this.render()}),document.getElementById("btn-submit-phone")?.addEventListener("click",()=>this.handleSendOtp()),document.getElementById("btn-submit-otp")?.addEventListener("click",()=>this.handleVerifyOtp()),document.getElementById("btn-autofill-otp")?.addEventListener("click",()=>{const t=document.getElementById("auth-otp-input");t&&this.demoOtp&&(t.value=this.demoOtp)}),document.getElementById("btn-back-phone")?.addEventListener("click",()=>{this.step="phone",this.render()}),document.getElementById("btn-quick-farmer")?.addEventListener("click",()=>this.handleQuickDemo("farmer")),document.getElementById("btn-submit-admin")?.addEventListener("click",()=>this.handleAdminLogin()),document.getElementById("btn-quick-admin")?.addEventListener("click",()=>this.handleQuickDemo("admin")),document.getElementById("btn-submit-buyer")?.addEventListener("click",()=>this.handleBuyerLogin()),document.getElementById("btn-quick-buyer")?.addEventListener("click",()=>this.handleQuickDemo("buyer"))}}class P{constructor(){this.currentData=null}open(e){this.currentData=e,this.render()}close(){const e=document.getElementById("receipt-modal-root");e&&(e.innerHTML="")}render(){let e=document.getElementById("receipt-modal-root");e||(e=document.createElement("div"),e.id="receipt-modal-root",document.body.appendChild(e));const t=this.currentData;t&&(e.innerHTML=`
      <div class="modal-backdrop">
        <div class="modal-window" style="max-width:620px">
          <button id="btn-close-receipt" class="modal-close-btn">✕</button>

          <div class="jform-slip" id="printable-slip">
            <div class="jform-header">
              <div style="font-size:28px;margin-bottom:4px">🏛️</div>
              <h2>GOVERNMENT PROCUREMENT RECEIPT (J-FORM)</h2>
              <div style="font-size:12px;color:#374151">Agricultural Produce Market Committee (APMC) • State Procurement Board</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px">Issued under MSP Procurement & Direct Benefit Transfer (DBT) Guidelines 2026</div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:14px;background:#f0fdf4;padding:8px 12px;border-radius:8px;font-size:12px">
              <span>Receipt No: <b>${t.id}</b></span>
              <span>Date: <b>${t.date}</b></span>
            </div>

            <div class="jform-grid">
              <div>
                <span style="font-size:11px;color:#6b7280;display:block">FARMER DETAILS (विक्रेता किसान)</span>
                <b>${t.farmerName}</b>
                <div style="font-size:12px;color:#4b5563">ID: ${t.farmerId}</div>
                <div style="font-size:12px;color:#4b5563">Bank: ${t.bankName||"SBI"} (${t.bankAccMasked||"•••• 4862"})</div>
              </div>
              <div>
                <span style="font-size:11px;color:#6b7280;display:block">PROCUREMENT CENTRE (खरीद केंद्र)</span>
                <b>${t.centre||"Jaitpur Procurement Centre"}</b>
                <div style="font-size:12px;color:#4b5563">District: ${t.centreDistrict||"Gorakhpur, UP"}</div>
                <div style="font-size:12px;color:#4b5563">Inspector: ${t.officer||"V. K. Verma"}</div>
              </div>
            </div>

            <!-- Weighment Table -->
            <table class="data-table" style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px">
              <thead style="background:#f9fafb">
                <tr>
                  <th>Commodity</th>
                  <th>Gross Wt</th>
                  <th>Tare Wt</th>
                  <th>Net Wt</th>
                  <th>Moisture</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>${t.cropFullName||t.crop||"Paddy"}</b></td>
                  <td>${t.grossWeight||60.5} qtl</td>
                  <td>${t.tareWeight||2.5} qtl</td>
                  <td><b style="color:#15803d">${t.netWeight} qtl</b></td>
                  <td>${t.moisturePercent||14}% FAQ</td>
                </tr>
              </tbody>
            </table>

            <!-- Financial Calculation -->
            <div style="background:#fbfcf9;border:1.5px dashed #cbe0c5;border-radius:10px;padding:14px;margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
                <span>Government Minimum Support Price (MSP Rate):</span>
                <b>₹${(t.mspRate||2300).toLocaleString("en-IN")} / quintal</b>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
                <span>Net Deliverable Quantity:</span>
                <b>${t.netWeight} quintals</b>
              </div>
              <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:8px;font-size:16px">
                <span style="font-weight:800;color:#0f2e1b">Total Net Payable to Farmer:</span>
                <b style="font-weight:800;color:#15803d;font-size:20px">₹${t.amount.toLocaleString("en-IN")}</b>
              </div>
            </div>

            <!-- DBT Transfer Details -->
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f3f4f6;padding:10px 14px;border-radius:8px;font-size:12px;margin-bottom:18px">
              <div>
                <span>DBT Status: <b>${t.paymentStatus==="PAID"?"Transfer Cleared ✓":"In Processing via PFMS"}</b></span>
                ${t.utr?`<div style="color:#15803d;font-size:11px">Bank UTR: <b>${t.utr}</b></div>`:`<div style="color:#b45309;font-size:11px">Expected Transfer by: ${t.expectedDate||"2-3 Working Days"}</div>`}
              </div>
              <div style="text-align:right">
                <span style="display:block;font-size:10px;color:#6b7280">DIGITALLY VERIFIED</span>
                <span style="color:#15803d;font-weight:800">KrishiSlot APMC ✓</span>
              </div>
            </div>

            <div style="display:flex;gap:12px">
              <button id="btn-print-slip" class="cta" style="flex:1">
                🖨️ Print / Download Official J-Form Slip
              </button>
            </div>
          </div>
        </div>
      </div>
    `,document.getElementById("btn-close-receipt")?.addEventListener("click",()=>this.close()),document.getElementById("btn-print-slip")?.addEventListener("click",()=>window.print()))}}class B{constructor(){this.user=c.currentUser||{id:"FRM-UP-26032",name:"Ramesh Kumar",phone:"9876543210",role:"farmer",village:"Jaitpur, Gorakhpur"};const e=(this.user?.role||"farmer").toLowerCase();e==="buyer"?this.currentView="buyer":e==="admin"||e==="officer"?this.currentView="centre":this.currentView=this.user?"dashboard":"landing",this.language=localStorage.getItem("krishi_lang")||"en",this.bookingState={centreId:"CTR-UP-01",cropId:"paddy_comm",quantity:42,vehicle:"Tractor Trolley",date:"2026-09-12",timeSlot:"10:30 – 11:00 AM"},this.centres=[],this.crops=[],this.availableSlots=[],this.procurements=[],this.stats=null,this.queueStatus=null,this.centreTokens=[],this.buyerLots=[],this.buyerOrders=[],this.activeBiddingLot=null,this.notifications=[],this.unreadNotifCount=0,this.virtualPhone=null,this.authModal=null,this.receiptModal=null,this.notificationCenter=null}async init(){this.virtualPhone=new T(c,()=>{}),this.notificationCenter=new I({api:c,onNavigate:e=>{this.currentView=e,this.render()},onUpdate:(e,t)=>{this.notifications=e,this.unreadNotifCount=t,this.updateTopbarBadges()}}),this.authModal=new L(c,e=>{this.user=e;const t=(e.role||"farmer").toLowerCase();t==="buyer"?this.currentView="buyer":t==="admin"||t==="officer"?this.currentView="centre":this.currentView="dashboard",this.showToast(`Namaste ${e.name}! Logged in successfully.`),this.refreshData().then(()=>this.render())}),this.receiptModal=new P,c.connectSSE(),c.onQueueUpdate(e=>{this.queueStatus=e,this.showToast(`🔔 Queue update: Token #${e.nowServingToken} called at Counter ${e.counter}`),(this.currentView==="queue"||this.currentView==="dashboard"||this.currentView==="centre")&&this.render()}),c.onSmsReceived(e=>{this.showToast(`📩 New SMS: ${e.message.slice(0,50)}...`)}),c.onNotificationReceived(e=>{const t=(this.user?.role||"farmer").toLowerCase(),i=!e.userId||e.userId===this.user?.id,a=e.role==="all"||e.role===t;(i||a)&&(this.notifications.unshift(e),this.unreadNotifCount++,this.notificationCenter.setNotifications(this.notifications,this.unreadNotifCount),this.updateTopbarBadges(),this.showToast(`🔔 ${e.title}: ${e.message}`))}),await this.refreshData(),this.render()}async refreshData(){try{const[e,t]=await Promise.all([c.getCentres(),c.getCrops()]);this.centres=e.centres||[],this.crops=t.crops||[];const i=await c.getAvailability(this.bookingState.centreId,this.bookingState.date);this.availableSlots=i.slots||[];const a=await c.getQueueStatus(this.bookingState.centreId);if(this.queueStatus=a.queue,this.user){const[u,p]=await Promise.all([c.getProcurements(this.user.id),c.getProcurementStats(this.user.id)]);this.procurements=u.procurements||[],this.stats=p.stats;const m=await c.getNotifications(this.user.id,this.user.role);m.success&&(this.notifications=m.notifications||[],this.unreadNotifCount=m.unreadCount||0,this.notificationCenter.setNotifications(this.notifications,this.unreadNotifCount))}const s=await c.fetch("/api/centre/tokens");this.centreTokens=s.tokens||[];const[n,d]=await Promise.all([c.getBuyerMarketplace(),c.getBuyerOrders(this.user?.id)]);this.buyerLots=n.lots||[],this.buyerOrders=d.orders||[]}catch(e){console.warn("Data refresh failed:",e)}}t(){return h[this.language]||h.en}toggleLanguage(){this.language=this.language==="en"?"hi":"en",localStorage.setItem("krishi_lang",this.language),this.render()}showToast(e){const t=document.getElementById("toast");t&&(t.innerHTML=`<span>📢</span> <span>${e}</span>`,t.classList.add("show"),setTimeout(()=>{t.classList.remove("show")},4500))}updateTopbarBadges(){const e=document.getElementById("btn-topbar-notif");if(!e)return;const t=e.querySelector(".notif-badge");if(this.unreadNotifCount>0)if(t)t.innerText=this.unreadNotifCount;else{const i=document.createElement("span");i.className="icon-badge notif-badge",i.innerText=this.unreadNotifCount,e.appendChild(i)}else t&&t.remove()}async switchRole(e,t=null){try{const i=await c.quickSwitch(e,t);this.user=i.user;const a=e.toLowerCase();a==="buyer"?this.currentView="buyer":a==="admin"||a==="officer"?this.currentView="centre":this.currentView="dashboard",this.showToast(`Switched active role to: ${this.user.name} (${this.user.role})`),await this.refreshData(),this.render()}catch(i){this.showToast(`Error switching role: ${i.message}`)}}async handleSlotBooking(){try{const e=await c.bookSlot({farmerId:this.user?.id||"FRM-UP-26032",farmerName:this.user?.name||"Ramesh Kumar",farmerPhone:this.user?.phone||"9876543210",centreId:this.bookingState.centreId,cropId:this.bookingState.cropId,quantity:Number(this.bookingState.quantity)||42,vehicle:this.bookingState.vehicle,date:this.bookingState.date,timeSlot:this.bookingState.timeSlot});this.showToast(`🎉 Slot Confirmed! Token #${e.booking.token} dispatched to your SMS & notifications!`),await this.refreshData(),this.currentView="dashboard",this.render()}catch(e){this.showToast(`⚠️ Booking failed: ${e.message}`)}}async handleAdvanceQueue(){try{const e=await c.advanceQueue(2);this.queueStatus=e.queue,this.showToast(`Called Token #${e.token}. Proximity SMS & alert dispatched to upcoming farmers!`),this.render()}catch(e){this.showToast(`Error advancing queue: ${e.message}`)}}async handleWeighmentSubmission(){document.getElementById("weigh-token-input")?.value;const e=document.getElementById("weigh-crop-select")?.value,t=document.getElementById("weigh-gross-input")?.value,i=document.getElementById("weigh-tare-input")?.value,a=document.getElementById("weigh-moisture-input")?.value;try{const s=await c.createProcurement({farmerId:this.user?.id||"FRM-UP-26032",bookingId:null,cropId:e,grossWeight:t,tareWeight:i,moisturePercent:a,centreId:this.bookingState.centreId,officerName:this.user?.name||"V. K. Verma"});this.showToast(`⚖️ Weighment Recorded & Official J-Form ${s.procurement.id} Issued! SMS & Notification sent.`),await this.refreshData(),this.receiptModal.open(s.procurement),this.render()}catch(s){this.showToast(`Weighment error: ${s.message}`)}}async handleBuyerPlaceBid(){if(!this.activeBiddingLot)return;const e=document.getElementById("bid-qty-input"),t=document.getElementById("bid-rate-input"),i=Number(e?.value)||50,a=Number(t?.value)||2350;try{const s=await c.placeBuyerOrder({buyerId:this.user?.id||"BUYER-01",buyerName:this.user?.name||"Vikram Singhania",cropId:this.activeBiddingLot.cropId,cropName:this.activeBiddingLot.cropName,quantity:i,offeredRate:a,centreId:this.activeBiddingLot.centreId,farmerId:this.activeBiddingLot.farmerId,farmerName:this.activeBiddingLot.farmerName});document.getElementById("buyer-bid-modal")?.classList.add("hidden"),this.showToast(`🤝 Purchase Order #${s.order.id} Confirmed! Gate pass #${s.order.gatePassId} generated.`),await this.refreshData(),this.render()}catch(s){this.showToast(`Order failed: ${s.message}`)}}openBidModal(e){this.activeBiddingLot=e;const t=document.getElementById("buyer-bid-modal"),i=document.getElementById("bid-modal-lot-summary"),a=document.getElementById("bid-qty-input"),s=document.getElementById("bid-rate-input"),n=document.getElementById("bid-calc-total");if(!t)return;i&&(i.innerHTML=`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <b>${e.cropName}</b>
          <span class="status-pill confirmed">Arrival Token #${e.token||"A-047"}</span>
        </div>
        <div style="color:#4b5563">
          Farmer: <b>${e.farmerName}</b> • Centre: <b>${e.centreName}</b>
        </div>
        <div style="color:#4b5563;margin-top:4px">
          Official Govt MSP: <b>₹${(e.mspRate||2300).toLocaleString("en-IN")}/qtl</b> • Arriving: <b>${e.displayDate||e.arrivalDate}</b>
        </div>
      `),a&&(a.value=e.quantity||50),s&&(s.value=Math.max(e.mspRate||2300,2350));const d=()=>{const u=Number(a?.value)||0,p=Number(s?.value)||0,m=u*p;n&&(n.innerText=`₹${m.toLocaleString("en-IN")}`)};a?.removeEventListener("input",d),s?.removeEventListener("input",d),a?.addEventListener("input",d),s?.addEventListener("input",d),d(),t.classList.remove("hidden")}openGatePassModal(e){const t=document.getElementById("buyer-pass-modal"),i=document.getElementById("pass-modal-id"),a=document.getElementById("pass-modal-content");t&&(i&&(i.innerText=`GATE PASS #${e.gatePassId||"GP-2026-881"}`),a&&(a.innerHTML=`
        <div style="background:#f8fafc;padding:12px;border-radius:10px;margin-bottom:12px;border:1px solid #e2e8f0">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Buyer Licensee:</span>
            <b>${this.user?.company||"AgroCorp Foods Pvt Ltd"}</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Associated Contract:</span>
            <b>#${e.id}</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Crop & Volume:</span>
            <b>${e.cropName} (${e.quantity} qtl)</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="color:#6b7280">Pickup Window:</span>
            <b>${e.pickupSlot||"11:00 AM – 01:00 PM"}</b>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#6b7280">Weighbridge Gate:</span>
            <b style="color:#15803d">Counter 3 (Outward Inward)</b>
          </div>
        </div>
      `),t.classList.remove("hidden"))}bindEvents(){this.t(),document.getElementById("landing-lang-toggle")?.addEventListener("click",()=>this.toggleLanguage()),document.getElementById("landing-btn-farmer")?.addEventListener("click",()=>this.authModal.open("farmer")),document.getElementById("landing-btn-staff")?.addEventListener("click",()=>this.authModal.open("admin")),document.getElementById("landing-btn-buyer")?.addEventListener("click",()=>this.authModal.open("buyer")),document.getElementById("hero-btn-login")?.addEventListener("click",()=>this.authModal.open("farmer")),document.getElementById("hero-btn-staff")?.addEventListener("click",()=>this.authModal.open("admin")),document.getElementById("hero-btn-buyer")?.addEventListener("click",()=>this.authModal.open("buyer")),document.getElementById("demo-farmer-pill")?.addEventListener("click",()=>this.switchRole("farmer")),document.getElementById("demo-officer-pill")?.addEventListener("click",()=>this.switchRole("admin")),document.getElementById("demo-buyer-pill")?.addEventListener("click",()=>this.switchRole("buyer")),document.getElementById("btn-toggle-lang")?.addEventListener("click",()=>this.toggleLanguage()),document.getElementById("btn-topbar-sms")?.addEventListener("click",()=>this.virtualPhone.toggle(!0)),document.getElementById("btn-topbar-notif")?.addEventListener("click",()=>this.notificationCenter.toggle()),document.getElementById("sidebar-notif-btn")?.addEventListener("click",()=>this.notificationCenter.toggle(!0)),document.getElementById("quick-role-switch")?.addEventListener("change",s=>this.switchRole(s.target.value)),document.getElementById("btn-logout")?.addEventListener("click",()=>{c.setSession(null,null),this.user=null,this.currentView="landing",this.render()}),document.querySelectorAll(".nav-link").forEach(s=>{s.addEventListener("click",()=>{const n=s.getAttribute("data-view");n==="sms"?this.virtualPhone.toggle(!0):n==="notifications"?this.notificationCenter.toggle(!0):n&&(this.currentView=n,this.render())})}),document.getElementById("dash-open-queue")?.addEventListener("click",()=>{this.currentView="queue",this.render()}),document.getElementById("dash-quick-book")?.addEventListener("click",()=>{this.currentView="booking",this.render()}),document.getElementById("dash-quick-queue")?.addEventListener("click",()=>{this.currentView="queue",this.render()}),document.getElementById("dash-quick-pay")?.addEventListener("click",()=>{this.currentView="procurements",this.render()}),document.getElementById("dash-quick-sms")?.addEventListener("click",()=>{this.virtualPhone.toggle(!0)}),document.getElementById("dash-view-all-history")?.addEventListener("click",()=>{this.currentView="procurements",this.render()}),document.getElementById("book-centre-select")?.addEventListener("change",async s=>{this.bookingState.centreId=s.target.value;const n=await c.getAvailability(this.bookingState.centreId,this.bookingState.date);this.availableSlots=n.slots||[],this.render()}),document.getElementById("book-crop-select")?.addEventListener("change",s=>{this.bookingState.cropId=s.target.value,this.render()}),document.getElementById("book-qty-input")?.addEventListener("input",s=>{this.bookingState.quantity=s.target.value,this.render()}),document.getElementById("book-vehicle-select")?.addEventListener("change",s=>{this.bookingState.vehicle=s.target.value}),document.querySelectorAll(".date-choice").forEach(s=>{s.addEventListener("click",async()=>{this.bookingState.date=s.getAttribute("data-date");const n=await c.getAvailability(this.bookingState.centreId,this.bookingState.date);this.availableSlots=n.slots||[],this.render()})}),document.querySelectorAll(".time-choice").forEach(s=>{s.addEventListener("click",()=>{this.bookingState.timeSlot=s.getAttribute("data-slot"),this.render()})}),document.getElementById("btn-confirm-slot-booking")?.addEventListener("click",()=>{this.handleSlotBooking()}),document.getElementById("btn-simulate-queue")?.addEventListener("click",()=>{this.handleAdvanceQueue()}),document.getElementById("btn-set-arrival-reminder")?.addEventListener("click",()=>{this.showToast("✅ Proximity alert active! You will receive both SMS and in-app alert at 5 tokens away."),this.virtualPhone.toggle(!0)}),document.querySelectorAll(".btn-view-slip").forEach(s=>{s.addEventListener("click",()=>{const n=s.getAttribute("data-id"),d=this.procurements.find(u=>u.id===n);d&&this.receiptModal.open(d)})}),document.getElementById("btn-centre-advance")?.addEventListener("click",()=>{this.handleAdvanceQueue()}),document.getElementById("btn-open-delay-modal")?.addEventListener("click",()=>{const s=document.getElementById("delay-broadcast-modal");s&&s.classList.remove("hidden")}),document.getElementById("btn-close-delay-modal")?.addEventListener("click",()=>{const s=document.getElementById("delay-broadcast-modal");s&&s.classList.add("hidden")}),document.getElementById("btn-send-broadcast")?.addEventListener("click",async()=>{const s=document.getElementById("broadcast-reason")?.value,n=document.getElementById("broadcast-delay-mins")?.value;try{await c.broadcastDelay(s,Number(n)||30),this.showToast("📢 Urgent weather/congestion delay broadcasted to all scheduled farmers & dashboard alerts!"),document.getElementById("delay-broadcast-modal")?.classList.add("hidden")}catch(d){this.showToast(`Broadcast failed: ${d.message}`)}});const e=document.getElementById("weigh-gross-input"),t=document.getElementById("weigh-tare-input"),i=document.getElementById("weigh-crop-select"),a=()=>{const s=parseFloat(e?.value)||0,n=parseFloat(t?.value)||0,d=Math.max(0,s-n),u=this.crops.find(l=>l.id===i?.value)||this.crops[0],p=u?u.mspRate:2300,m=Math.round(d*p),b=document.getElementById("calc-net-wt"),r=document.getElementById("calc-net-amount");b&&(b.innerText=`${d.toFixed(1)} quintals`),r&&(r.innerText=`₹${m.toLocaleString("en-IN")}`)};e?.addEventListener("input",a),t?.addEventListener("input",a),i?.addEventListener("change",a),document.getElementById("btn-submit-weighment")?.addEventListener("click",()=>{this.handleWeighmentSubmission()}),document.getElementById("btn-refresh-market")?.addEventListener("click",async()=>{await this.refreshData(),this.render(),this.showToast("Marketplace refreshed with latest arrival lots.")}),document.querySelectorAll(".btn-bid-lot").forEach(s=>{s.addEventListener("click",()=>{try{const n=JSON.parse(s.getAttribute("data-lot"));this.openBidModal(n)}catch(n){console.error("Failed to parse lot data:",n)}})}),document.getElementById("btn-close-bid-modal")?.addEventListener("click",()=>{document.getElementById("buyer-bid-modal")?.classList.add("hidden")}),document.getElementById("btn-confirm-buyer-bid")?.addEventListener("click",()=>{this.handleBuyerPlaceBid()}),document.querySelectorAll(".btn-view-gatepass").forEach(s=>{s.addEventListener("click",()=>{try{const n=JSON.parse(s.getAttribute("data-order"));this.openGatePassModal(n)}catch(n){console.error("Failed to parse order data:",n)}})}),document.getElementById("btn-close-pass-modal")?.addEventListener("click",()=>{document.getElementById("buyer-pass-modal")?.classList.add("hidden")}),document.getElementById("btn-print-gate-pass")?.addEventListener("click",()=>{this.showToast("🖨️ Generating Gate Pass PDF with digital security barcode..."),window.print()})}render(){const e=document.getElementById("app");if(!e)return;const t=this.t();if(this.currentView==="landing"||!this.user){e.innerHTML=v({language:this.language,t}),this.bindEvents();return}let i="";switch(this.currentView){case"dashboard":i=S({user:this.user,stats:this.stats,latestBooking:this.centreTokens[0]||null,queueStatus:this.queueStatus,t,onNavigate:a=>{this.currentView=a,this.render()}});break;case"booking":i=x({centres:this.centres,crops:this.crops,availableSlots:this.availableSlots,selectedValues:this.bookingState,t});break;case"queue":i=k({queueStatus:this.queueStatus,userToken:"A-047",t});break;case"procurements":i=w({procurements:this.procurements,t});break;case"centre":i=$({stats:{metrics:{todayBookings:64,dailyCapacity:90,waitingNow:19,completedToday:42,nowServing:this.queueStatus?.nowServingToken||"A-038"}},tokens:this.centreTokens,crops:this.crops,t});break;case"buyer":i=E({user:this.user,lots:this.buyerLots,orders:this.buyerOrders,t});break;default:i='<div class="page-container">Page not found</div>'}e.innerHTML=`
      <div class="app-shell">
        ${f({currentView:this.currentView,user:this.user,t})}
        <main class="app-main">
          ${y({user:this.user,language:this.language,t,unreadSmsCount:this.virtualPhone?.unreadCount||0,unreadNotifCount:this.unreadNotifCount||0})}
          ${i}
        </main>
      </div>
    `,this.bindEvents()}}window.krishiApp=new B;window.krishiApp.init();
