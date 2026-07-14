async function renderAdmin() {
  try {
    const siteHeader = document.getElementById('site-header');
    const siteFooter = document.getElementById('site-footer');
    if (siteHeader) siteHeader.style.display = 'none';
    if (siteFooter) siteFooter.style.display = 'none';

    const sessionMe = await api('/api/auth/me');
    if (sessionMe?.user && sessionMe.user.role === 'admin') {
      currentUser = sessionMe.user;
    }

    // 1. Check if setup is required
    const status = await api('/api/admin/check-setup');
    if (status.error) throw new Error(status.error);
    
    if (status.setupRequired) {
      await showAdminSetup();
      return;
    }

    // 2. Normal Login Flow
    if (!currentUser || currentUser.role !== 'admin') {
      await showAdminLogin();
      return;
    }
    buildAdminPanel();
  } catch (err) {
    console.error('Admin Boot Error:', err);
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;background:var(--dark);">
        <div style="background:#fff;padding:2.5rem;border-radius:24px;max-width:400px;text-align:center;">
          <h2 style="color:var(--rose-dark);margin-bottom:1rem;">System Boot Error</h2>
          <p style="color:var(--gray);margin-bottom:1.5rem;">The admin module failed to initialize. This usually happens due to connection issues or security conflicts.</p>
          <div style="background:#fef2f2;color:#991b1b;padding:10px;border-radius:8px;font-size:.8rem;margin-bottom:1.5rem;font-family:monospace;">${err.message}</div>
          <button class="btn-primary full-width" onclick="location.reload()">Reload Admin Panel</button>
        </div>
      </div>`;
  }
}

function showAdminSetup() {
  document.getElementById('app').innerHTML = `
  <div style="min-height:100vh;background:var(--dark);display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="background:#fff;border-radius:24px;padding:2.5rem;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <div style="text-align:center;margin-bottom:2rem;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:var(--rose);letter-spacing:.2em;margin-bottom:.5rem;">✦ LENCHO ✦</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;margin-bottom:.4rem;">Master Admin Setup</h2>
        <p style="color:var(--gray);font-size:.875rem;">Create the primary administrative account</p>
      </div>
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group"><label>Full Name</label><input type="text" id="setup-name" placeholder="Name"/></div>
        <div class="form-group"><label>Phone Number</label><input type="text" id="setup-phone" placeholder="987xxxxxx"/></div>
      </div>
      <div class="form-group"><label>Email Address</label><input type="email" id="setup-email" placeholder="admin@lencho.in"/></div>
      <div class="form-group"><label>Password</label><input type="password" id="setup-pass" placeholder="Password"/></div>
      <div class="form-group">
        <label>Security Question: Birthplace</label>
        <input type="text" id="setup-answer" placeholder="Your birthplace (for recovery)"/>
      </div>
      <div id="setup-err" style="color:#ef4444;font-size:.8rem;margin-bottom:.75rem;"></div>
      <button class="btn-primary full-width" onclick="handleAdminSetup()">
        <i class="fas fa-check-circle"></i> Complete Master Registration
      </button>
    </div>
  </div>`;
}

async function handleAdminSetup() {
  const body = {
    name: document.getElementById('setup-name').value,
    phone: document.getElementById('setup-phone').value,
    email: document.getElementById('setup-email').value,
    password: document.getElementById('setup-pass').value,
    securityQuestion: 'Birthplace',
    securityAnswer: document.getElementById('setup-answer').value
  };
  const r = await api('/api/admin/setup', { method: 'POST', body });
  if (r.error) { document.getElementById('setup-err').textContent = r.error; return; }
  toast('Admin account created! Logging in...', 'success');
  renderAdmin();
}

async function showAdminLogin() {
  const captcha = await api(`/api/captcha?ts=${Date.now()}`);
  document.getElementById('app').innerHTML = `
  <div style="min-height:100vh;background:var(--dark);display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="background:#fff;border-radius:24px;padding:2.5rem;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);">
      <div style="text-align:center;margin-bottom:2rem;">
        <div style="font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:var(--rose);letter-spacing:.2em;margin-bottom:.5rem;">✦ LENCHO ✦</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.8rem;margin-bottom:.4rem;">Admin Login</h2>
        <p style="color:var(--gray);font-size:.875rem;">Secure admin access - Capital or small letters</p>
      </div>
      <div class="form-group"><label>Email Address</label><input type="email" id="adm-email" placeholder="admin@example.com" autofocus/></div>
      <div class="form-group"><label>Password</label><input type="password" id="adm-pass" placeholder="Password"/></div>
      
      <div style="background:var(--beige);padding:1rem;border-radius:12px;margin-bottom:1.5rem;border:1px solid rgba(0,0,0,.04);">
        <label style="font-size:.7rem;text-transform:uppercase;color:var(--gray);display:block;margin-bottom:8px;letter-spacing:.08em;">Security Code (letters only)</label>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;">
          <div style="min-width:180px;flex:1;background:#fff;padding:.85rem 1rem;border-radius:10px;border:1px solid #eee;display:flex;flex-direction:column;gap:.2rem;">
            <span style="font-size:.72rem;color:var(--gray);text-transform:uppercase;letter-spacing:.08em;">Type this code exactly</span>
            <span style="font-weight:800;font-size:1.35rem;letter-spacing:.12em;color:var(--rose-dark);">${captcha.question.replace('Type this code: ', '')}</span>
          </div>
          <button type="button" class="btn-outline" onclick="showAdminLogin()" style="white-space:nowrap;padding:.75rem 1rem;">
            <i class="fas fa-rotate-right"></i> Refresh
          </button>
        </div>
        <div class="form-group" style="margin-top:12px;margin-bottom:0;">
          <input type="text" id="adm-captcha" inputmode="text" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="5" pattern="[A-Za-z0-9]{5}" placeholder="Enter security code" style="appearance:none;-webkit-appearance:none;-moz-appearance:textfield;text-align:center;letter-spacing:.35em;font-weight:700;" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5)"/>
        </div>
      </div>

      <div id="adm-err" style="color:#ef4444;font-size:.8rem;margin-bottom:.75rem;min-height:20px;"></div>
      <button class="btn-primary full-width" onclick="adminLogin()">
        <i class="fas fa-shield-alt"></i> Sign In
      </button>

      <button class="btn-outline full-width" style="margin-top:10px;" onclick="showRecovery()">
        Recover Admin Account
      </button>
    </div>
  </div>`;

  setTimeout(() => document.getElementById('adm-captcha')?.focus(), 0);
}

async function adminLogin() {
  const email = document.getElementById('adm-email')?.value;
  const pass = document.getElementById('adm-pass')?.value;
  const captcha = document.getElementById('adm-captcha')?.value;
  const err = document.getElementById('adm-err');
  const btn = document.querySelector('#adm-err + button.btn-primary') || document.querySelector('.btn-primary');

  if (!email || !pass || !captcha) { err.textContent = 'Please fill all fields'; return; }

  // Show loading state
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Sending OTP...'; }

  // Admin login with OTP - Step 1: Verify credentials and send OTP
  // Timeout set to 45s because SMTP can take 25-30s on cold start
  const r = await api('/api/admin/login/request-otp', { method: 'POST', body: { email, password: pass, captchaAnswer: captcha }, timeoutMs: 45000 });
  
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-shield-alt"></i> Sign In'; }
  
  if (r.error) {
    err.textContent = r.error;
    showAdminLogin(); // Refresh CAPTCHA on error
    return;
  }

  // OTP sent successfully - show OTP verification step
  toast(r.message || 'OTP sent to your admin email!', 'success');
  showAdminVerifyOtp(email);
}

function showAdminVerifyOtp(email) {
  document.getElementById('app').innerHTML = `
  <div class="admin-otp-container">
    <div class="admin-otp-card">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <div style="width:72px;height:72px;margin:0 auto 1rem;background:linear-gradient(135deg,rgba(201,149,76,.08),rgba(212,168,83,.15));border:1.5px solid rgba(201,149,76,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:otpShieldPulse 2.5s ease-in-out infinite;">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" fill="url(#ag)" opacity=".15"/><path d="M12 2L3 7V12C3 17.55 6.84 22.74 12 24C17.16 22.74 21 17.55 21 12V7L12 2Z" stroke="url(#ag)" stroke-width="1.5" fill="none"/><path d="M9 12L11 14L15 10" stroke="url(#ag)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="ag" x1="3" y1="2" x2="21" y2="24"><stop stop-color="#c9954c"/><stop offset="1" stop-color="#d4a853"/></linearGradient></defs></svg>
        </div>
        <div style="font-family:'Cormorant Garamond',serif;font-size:.75rem;color:#c9954c;letter-spacing:.35em;font-weight:600;">✦ LENCHO ADMIN ✦</div>
        <h2 style="font-family:'Cormorant Garamond',serif;font-size:1.6rem;margin:.4rem 0;font-weight:700;">Verify Your Identity</h2>
        <p style="color:var(--gray);font-size:.85rem;margin-bottom:.75rem;">We've sent a one-time verification code to</p>
        <div style="display:inline-flex;align-items:center;gap:.5rem;background:linear-gradient(135deg,#fdf6ee,#fef9f3);border:1px solid rgba(201,149,76,.2);padding:.5rem 1rem;border-radius:99px;font-size:.82rem;font-weight:600;">
          <i class="fas fa-envelope" style="color:#c9954c;"></i> ${email}
        </div>
      </div>
      
      <div style="text-align:center;margin:1.5rem 0;">
        <label style="display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.15em;color:var(--gray);margin-bottom:.75rem;font-weight:600;">Enter Verification Code</label>
        <div class="admin-otp-boxes" id="admin-otp-row">
          <input type="text" class="adm-otp-digit" data-idx="0" maxlength="1" inputmode="numeric" aria-label="Admin OTP digit 1"/>
          <input type="text" class="adm-otp-digit" data-idx="1" maxlength="1" inputmode="numeric" aria-label="Admin OTP digit 2"/>
          <input type="text" class="adm-otp-digit" data-idx="2" maxlength="1" inputmode="numeric" aria-label="Admin OTP digit 3"/>
          <input type="text" class="adm-otp-digit" data-idx="3" maxlength="1" inputmode="numeric" aria-label="Admin OTP digit 4"/>
          <input type="text" class="adm-otp-digit" data-idx="4" maxlength="1" inputmode="numeric" aria-label="Admin OTP digit 5"/>
          <input type="text" class="adm-otp-digit" data-idx="5" maxlength="1" inputmode="numeric" aria-label="Admin OTP digit 6"/>
        </div>
        <input type="hidden" id="adm-otp" value=""/>
      </div>

      <div id="adm-otp-err" style="color:#ef4444;font-size:.82rem;min-height:22px;margin:.5rem 0;text-align:center;"></div>
      
      <button class="otp-verify-btn" id="adm-verify-btn" onclick="verifyAdminOtp('${email}')" disabled>
        <span class="otp-btn-text">Verify & Access Panel</span>
        <span class="otp-btn-loader" style="display:none"><i class="fas fa-spinner fa-spin"></i> Verifying...</span>
      </button>
      
      <div style="text-align:center;margin-top:1.25rem;">
        <div id="adm-otp-timer" style="font-size:.78rem;color:var(--gray);margin-bottom:.6rem;display:flex;align-items:center;justify-content:center;gap:.35rem;">
          <i class="fas fa-clock" style="color:#c9954c;font-size:.75rem;"></i> Resend available in <span id="adm-otp-countdown" style="font-weight:700;color:#c9954c;">60</span>s
        </div>
        <button class="otp-resend-btn" id="adm-resend-btn" onclick="resendAdminOtp('${email}')" disabled>
          <i class="fas fa-redo-alt"></i> Resend OTP
        </button>
        <div style="display:flex;gap:.5rem;margin-top:.75rem;">
          <button class="otp-resend-btn" onclick="showAdminLogin()" style="flex:1;border-color:#d4d0cc;color:var(--gray);">
            <i class="fas fa-arrow-left"></i> Back to Login
          </button>
        </div>
        <div style="font-size:.7rem;color:#b8b5b1;display:flex;align-items:center;justify-content:center;gap:.35rem;margin-top:.75rem;">
          <i class="fas fa-lock" style="font-size:.65rem;color:#c9954c;"></i> Admin access is OTP-protected for security
        </div>
      </div>
    </div>
  </div>`;

  // Initialize admin OTP boxes
  initAdminOtpBoxes(email);
  
  // Start countdown timer
  startAdminOtpTimer();
}

function initAdminOtpBoxes(email) {
  const boxes = document.querySelectorAll('#admin-otp-row .adm-otp-digit');
  if (!boxes.length) return;
  
  const hiddenInput = document.getElementById('adm-otp');
  const verifyBtn = document.getElementById('adm-verify-btn');
  
  function syncVal() {
    const val = Array.from(boxes).map(b => b.value).join('');
    if (hiddenInput) hiddenInput.value = val;
    if (verifyBtn) verifyBtn.disabled = val.length !== 6;
  }
  
  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      if (val && idx < 5) boxes[idx + 1].focus();
      box.classList.toggle('filled', !!val);
      syncVal();
      const full = Array.from(boxes).map(b => b.value).join('');
      if (full.length === 6) setTimeout(() => verifyAdminOtp(email), 200);
    });
    
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
        boxes[idx - 1].value = '';
        boxes[idx - 1].classList.remove('filled');
        syncVal();
      }
      if (e.key === 'ArrowLeft' && idx > 0) boxes[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < 5) boxes[idx + 1].focus();
    });
    
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      paste.split('').forEach((ch, i) => { if (boxes[i]) { boxes[i].value = ch; boxes[i].classList.add('filled'); } });
      boxes[Math.min(paste.length, 5)]?.focus();
      syncVal();
      if (paste.length === 6) setTimeout(() => verifyAdminOtp(email), 200);
    });
    
    box.addEventListener('focus', () => box.select());
  });
  
  setTimeout(() => boxes[0]?.focus(), 200);
}

function startAdminOtpTimer() {
  const endsAt = Date.now() + 60000;
  const timer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const countdown = document.getElementById('adm-otp-countdown');
    const timerEl = document.getElementById('adm-otp-timer');
    const resendBtn = document.getElementById('adm-resend-btn');
    if (!countdown) { clearInterval(timer); return; }
    if (remaining <= 0) {
      if (timerEl) timerEl.style.display = 'none';
      if (resendBtn) { resendBtn.disabled = false; }
      clearInterval(timer);
      return;
    }
    countdown.textContent = remaining;
  }, 1000);
}

async function verifyAdminOtp(email) {
  const boxes = document.querySelectorAll('#admin-otp-row .adm-otp-digit');
  const otp = boxes.length ? Array.from(boxes).map(b => b.value).join('') : (document.getElementById('adm-otp')?.value || '');
  const err = document.getElementById('adm-otp-err');
  if (!otp || otp.length !== 6 || !email) { 
    if (err) err.textContent = 'Please enter the 6-digit OTP';
    boxes.forEach(b => { b.classList.add('error'); setTimeout(() => b.classList.remove('error'), 600); });
    return; 
  }

  const verifyBtn = document.getElementById('adm-verify-btn');
  const btnText = verifyBtn?.querySelector('.otp-btn-text');
  const btnLoader = verifyBtn?.querySelector('.otp-btn-loader');
  if (btnText) btnText.style.display = 'none';
  if (btnLoader) btnLoader.style.display = 'inline-flex';
  if (verifyBtn) verifyBtn.disabled = true;

  const r = await api('/api/admin/login/verify-otp', { method: 'POST', body: { email, otp } });
  
  if (btnText) btnText.style.display = 'inline-flex';
  if (btnLoader) btnLoader.style.display = 'none';
  
  if (r.error) {
    if (err) err.textContent = r.error;
    if (verifyBtn) verifyBtn.disabled = false;
    boxes.forEach(b => { b.classList.add('error'); setTimeout(() => b.classList.remove('error'), 600); });
    return;
  }

  // Save JWT token for session persistence across refreshes
  if (r.token) {
    if (typeof setJWTToken === 'function') setJWTToken(r.token);
    localStorage.setItem('authToken', r.token);
    localStorage.setItem('lencho_jwt_token_v1', r.token);
  }

  // Success: save user and build admin panel
  currentUser = r.user || null;
  if (typeof saveCurrentUser === 'function') saveCurrentUser(currentUser);
  updateHeader();
  toast('Admin Authorization Granted! ✦', 'success');
  buildAdminPanel();
}

async function resendAdminOtp(email) {
  const el = document.getElementById('adm-otp-err');
  const resendBtn = document.getElementById('adm-resend-btn');
  if (resendBtn) { resendBtn.disabled = true; resendBtn.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Sending...'; }
  if (el) el.textContent = '';
  
  const r = await api('/api/admin/login/request-otp', { method: 'POST', body: { email, resend: true }, timeoutMs: 45000 });
  
  if (resendBtn) { resendBtn.disabled = false; resendBtn.innerHTML = '<i class="fas fa-redo-alt"></i> Resend OTP'; }
  
  if (r && r.error) { 
    if (el) el.textContent = r.error; 
    return; 
  }
  if (el) el.textContent = '';
  toast('OTP resent to your email!', 'success');
  startAdminOtpTimer();
}

function buildAdminPanel() {
  const siteHeader = document.getElementById('site-header');
  const siteFooter = document.getElementById('site-footer');
  const marquee = document.querySelector('.marquee-strip');
  if (siteHeader) siteHeader.style.display = 'none';
  if (siteFooter) siteFooter.style.display = 'none';
  if (marquee) marquee.style.display = 'none';

  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="admin-layout light-theme">
    <button class="admin-mob-toggle" onclick="document.getElementById('admin-sidebar').classList.toggle('open')"><i class="fas fa-bars"></i></button>
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="admin-logo">✦ LENCHO<br/><span style="font-size:.7rem;opacity:.6;letter-spacing:.05em;">Admin Panel</span></div>
      <div id="admin-visitor-counter" style="margin:0 .8rem 1rem;padding:.7rem .75rem;border-radius:12px;background:linear-gradient(135deg,rgba(201,106,138,.12),rgba(201,149,76,.12));border:1px solid rgba(201,106,138,.25);font-size:.78rem;color:var(--dark);">
        <div style="font-weight:700;display:flex;align-items:center;gap:.4rem;"><i class="fas fa-chart-line"></i> Live Visitors</div>
        <div style="margin-top:.2rem;font-size:1.05rem;font-weight:800;color:var(--rose-dark);" id="admin-website-visitors">Loading...</div>
      </div>
      <div id="admin-store-counter" style="margin:0 .8rem 1rem;padding:.7rem .75rem;border-radius:12px;background:linear-gradient(135deg,rgba(132,118,206,.12),rgba(147,112,219,.12));border:1px solid rgba(132,118,206,.25);font-size:.78rem;color:var(--dark);">
        <div style="font-weight:700;display:flex;align-items:center;gap:.4rem;"><i class="fas fa-store"></i> Store Visitors</div>
        <div style="margin-top:.2rem;font-size:1.05rem;font-weight:800;color:#7c3aed;" id="admin-store-visitors">Loading...</div>
      </div>
      <nav class="admin-menu">
        <div class="admin-menu-item active" id="am-dashboard" onclick="adminTab('dashboard')"><i class="fas fa-chart-line" style="width:20px;"></i> Dashboard</div>
        <div class="admin-menu-item" id="am-orders" onclick="adminTab('orders')"><i class="fas fa-shopping-bag" style="width:20px;"></i> Orders</div>
        <div class="admin-menu-item" id="am-products" onclick="adminTab('products')"><i class="fas fa-gem" style="width:20px;"></i> Jewellery Products</div>
        <div class="admin-menu-item" id="am-woollen" onclick="adminTab('woollen')"><i class="fas fa-mitten" style="width:20px;"></i> Woollen Store</div>
        <div class="admin-menu-item" id="am-collections" onclick="adminTab('collections')"><i class="fas fa-layer-group" style="width:20px;"></i> Jewellery Collections</div>
        <div class="admin-menu-item" id="am-inquiries" onclick="adminTab('inquiries')"><i class="fas fa-envelope-open-text" style="width:20px;"></i> Inquiries</div>
        <div class="admin-menu-item" id="am-marketing" onclick="adminTab('marketing')"><i class="fas fa-paper-plane" style="width:20px;"></i> Marketing Hub</div>
        <div class="admin-menu-item" id="am-users" onclick="adminTab('users')"><i class="fas fa-users" style="width:20px;"></i> Users</div>
        <div class="admin-menu-item" id="am-gst" onclick="adminTab('gst')"><i class="fas fa-file-invoice" style="width:20px;"></i> GST Hub</div>
        <div class="admin-menu-item" id="am-testimonials" onclick="adminTab('testimonials')"><i class="fas fa-comment-dots" style="width:20px;"></i> Testimonials</div>
        <div class="admin-menu-item" id="am-login-logs" onclick="adminTab('login-logs')"><i class="fas fa-user-clock" style="width:20px;"></i> Login Logs</div>
        <div class="admin-menu-item" id="am-delivery-manager" onclick="adminTab('delivery-manager')"><i class="fas fa-truck-fast" style="width:20px;"></i> Delivery Manager</div>
        <div class="admin-menu-item" id="am-legal-pages" onclick="adminTab('legal-pages')"><i class="fas fa-balance-scale" style="width:20px;"></i> Legal Pages</div>
        <div class="admin-menu-item" id="am-site-manager" onclick="adminTab('site-manager')"><i class="fas fa-paint-brush" style="width:20px;"></i> Site Manager</div>
        <div class="admin-menu-item" id="am-settings" onclick="adminTab('settings')"><i class="fas fa-cog" style="width:20px;"></i> Business Settings</div>
        <div class="admin-menu-item" id="am-backup" onclick="adminTab('backup')"><i class="fas fa-shield-alt" style="width:20px;"></i> Backup & Recovery</div>
        <div class="admin-menu-item" id="am-account" onclick="adminTab('account')"><i class="fas fa-user-shield" style="width:20px;"></i> Account Security</div>
        <div style="border-top:1px solid rgba(0,0,0,.05);margin-top:1rem;padding-top:1rem;">
          <div class="admin-menu-item" onclick="exitAdmin()"><i class="fas fa-home" style="width:20px;"></i> View Site</div>
          <div class="admin-menu-item" style="color:#ef4444;" onclick="handleLogout()"><i class="fas fa-sign-out-alt" style="width:20px;"></i> Logout</div>
        </div>
      </nav>
    </aside>
    <main class="admin-main" id="admin-main">
      <div id="admin-content" style="padding:1.5rem;"></div>
    </main>
  </div>`;
  loadAdminVisitorCounter();
  if (window.adminVisitorCounterTimer) clearInterval(window.adminVisitorCounterTimer);
  window.adminVisitorCounterTimer = setInterval(loadAdminVisitorCounter, 60000);
  
  // Show loading indicator
  document.getElementById('admin-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
      <div style="text-align:center;">
        <div style="font-size:2rem;margin-bottom:1rem;animation:spin 1s linear infinite;"><i class="fas fa-spinner"></i></div>
        <div style="font-size:.95rem;color:var(--gray);">Loading Dashboard...</div>
      </div>
    </div>
  `;
  
  adminTab('dashboard');
}

function exitAdmin() {
  if (window.adminVisitorCounterTimer) {
    clearInterval(window.adminVisitorCounterTimer);
    window.adminVisitorCounterTimer = null;
  }
  // Restore header/footer when leaving admin
  const siteHeader = document.getElementById('site-header');
  const siteFooter = document.getElementById('site-footer');
  const marquee = document.querySelector('.marquee-strip');
  if (siteHeader) siteHeader.style.display = '';
  if (siteFooter) siteFooter.style.display = '';
  if (marquee) marquee.style.display = '';
  navigate('/');
}


function adminTab(tab) {
  document.querySelectorAll('.admin-menu-item').forEach(e => e.classList.remove('active'));
  const btn = document.getElementById('am-' + tab);
  if (btn) btn.classList.add('active');
  const sidebar = document.getElementById('admin-sidebar');
  if (sidebar) sidebar.classList.remove('open'); // Close mobile menu

  if (tab === 'dashboard') adminDashboard();
  if (tab === 'orders') adminOrders();
  if (tab === 'products') adminProducts();
  if (tab === 'add-product') adminAddProduct();
  if (tab === 'woollen') adminWoollen();
  if (tab === 'collections') adminCollections();
  if (tab === 'inquiries') adminInquiries();
  if (tab === 'marketing') adminMarketingHub();
  if (tab === 'users') adminUsers();
  if (tab === 'gst') adminGST();
  if (tab === 'testimonials') adminTestimonials();
  if (tab === 'login-logs') adminLoginLogs();
  if (tab === 'delivery-manager') adminDeliveryManager();
  if (tab === 'legal-pages') adminLegalPages();
  if (tab === 'site-manager') adminSiteManager();
  if (tab === 'settings') {
    if (typeof adminStoreSettings === 'function') adminStoreSettings();
    else adminSettings();
  }
  if (tab === 'backup') adminBackupRecovery();
  if (tab === 'account') adminSecuritySettings();
}

function adminSafeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function adminSafeStats(stats = {}) {
  const safe = stats && !stats.error ? stats : {};
  return {
    totalRevenue: adminSafeNumber(safe.totalRevenue),
    totalOrders: adminSafeNumber(safe.totalOrders),
    todayOrders: adminSafeNumber(safe.todayOrders),
    todayRevenue: adminSafeNumber(safe.todayRevenue),
    totalUsers: adminSafeNumber(safe.totalUsers),
    totalProducts: adminSafeNumber(safe.totalProducts),
    totalGstCollected: adminSafeNumber(safe.totalGstCollected),
    totalVisitors: adminSafeNumber(safe.totalVisitors),
    storeVisitors: adminSafeNumber(safe.storeVisitors),
    statusCounts: safe.statusCounts || {},
    recentOrders: Array.isArray(safe.recentOrders) ? safe.recentOrders : []
  };
}
function formatAdminVisitorCount(value) {
  const count = Number(value) || 0;
  if (count >= 10000000) {
    const crore = count / 10000000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(1)} crore`;
  }
  if (count >= 100000) {
    const lakh = count / 100000;
    return `${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} lakh`;
  }
  return count.toLocaleString('en-IN');
}

async function loadAdminVisitorCounter() {
  const websiteBox = document.getElementById('admin-visitor-counter');
  const storeBox = document.getElementById('admin-store-counter');
  if (!websiteBox && !storeBox) return;

  const stats = await api('/api/admin/stats');
  const safeStats = adminSafeStats(stats);
  const websiteVisits = formatAdminVisitorCount(safeStats.totalVisitors);
  const storeVisits = formatAdminVisitorCount(safeStats.storeVisitors);
  
  if (websiteBox) {
    const websiteVisitorElem = document.getElementById('admin-website-visitors');
    if (websiteVisitorElem) websiteVisitorElem.textContent = websiteVisits;
  }
  
  if (storeBox) {
    const storeVisitorElem = document.getElementById('admin-store-visitors');
    if (storeVisitorElem) storeVisitorElem.textContent = storeVisits;
  }
}

async function adminLoginLogs() {
  const logs = await api('/api/admin/login-logs');
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header">
      <h1 class="admin-page-title">Login Activity (${Array.isArray(logs) ? logs.length : 0})</h1>
      <button class="btn-outline" onclick="adminTab('login-logs')"><i class="fas fa-sync"></i> Refresh</button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>User</th><th>Method</th><th>Status</th><th>Role</th><th>IP</th><th>Time</th></tr></thead>
        <tbody>${(Array.isArray(logs) ? logs : []).map(log => `
          <tr>
            <td>
              <div style="font-weight:700;">${log.name || 'User'}</div>
              <div style="font-size:.75rem;color:var(--gray);">${log.email || '-'}</div>
            </td>
            <td>${(log.method || 'password').toUpperCase()}</td>
            <td><span style="padding:4px 10px;border-radius:999px;font-size:.75rem;background:${log.status === 'success' ? '#dcfce7' : '#fee2e2'};color:${log.status === 'success' ? '#166534' : '#991b1b'};font-weight:700;">${log.status || 'unknown'}</span></td>
            <td>${log.role || 'user'}</td>
            <td style="font-family:monospace;font-size:.75rem;">${log.ip || '-'}</td>
            <td>${log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN') : '-'}</td>
          </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No login activity yet.</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function adminInquiries() {
  const inquiries = await api('/api/admin/inquiries');
  
  // Tabs for filtering
  const pendingCount = inquiries.filter(i => i.status !== 'replied').length;
  const solvedCount = inquiries.filter(i => i.status === 'replied').length;
  
  let filterStatus = localStorage.getItem('inquiry-filter') || 'all';
  let filtered = inquiries;
  
  if (filterStatus === 'pending') filtered = inquiries.filter(i => i.status !== 'replied');
  if (filterStatus === 'solved') filtered = inquiries.filter(i => i.status === 'replied');
  
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header">
      <h1 class="admin-page-title">Customer Inquiries (${inquiries.length})</h1>
      <button class="btn-outline" onclick="adminTab('inquiries')"><i class="fas fa-sync"></i> Refresh</button>
    </div>
    <div style="display:flex;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap;">
      <button class="btn-${filterStatus==='all' ? 'primary' : 'outline'}" onclick="filterInquiries('all')">
        <i class="fas fa-inbox"></i> All (${inquiries.length})
      </button>
      <button class="btn-${filterStatus==='pending' ? 'primary' : 'outline'}" onclick="filterInquiries('pending')">
        <i class="fas fa-clock"></i> Pending (${pendingCount})
      </button>
      <button class="btn-${filterStatus==='solved' ? 'primary' : 'outline'}" onclick="filterInquiries('solved')">
        <i class="fas fa-check-circle"></i> Solved (${solvedCount})
      </button>
    </div>
    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Details</th><th>Message</th><th>Status</th><th>Received At</th><th>Actions</th></tr></thead>
        <tbody>${filtered.map(iq => {
          const safeName = adminEscapeHtml(iq.name || 'Customer');
          const safeEmail = adminEscapeHtml(iq.email || '');
          const safePhone = adminEscapeHtml(iq.phone || 'No Phone');
          const safeMessage = adminEscapeHtml(iq.message || '');
          const replyUrl = adminInquiryReplyUrl(iq);
          return `
          <tr>
            <td style="min-width:180px;">
              <div style="font-weight:700;">${safeName}</div>
              <div style="font-size:.7rem;color:var(--gray);">${safeEmail || '-'}</div>
              <div style="font-size:.7rem;color:var(--rose-dark);font-weight:600;">${safePhone}</div>
            </td>
            <td><div style="font-size:.85rem;max-width:400px;line-height:1.4;">${safeMessage}</div></td>
            <td>
              <span class="order-status-badge status-${iq.status === 'replied' ? 'delivered' : 'pending'}" style="font-size:.7rem;">
                ${iq.status === 'replied' ? 'Solved' : 'Pending'}
              </span>
            </td>
            <td style="white-space:nowrap;font-size:.75rem;">${new Date(iq.createdAt).toLocaleString()}</td>
            <td>
              <button class="btn-sm" onclick="markInquirySolved('${iq._id}', '${iq.status === 'replied' ? 'new' : 'replied'}')" title="Toggle Status" style="background:${iq.status === 'replied' ? '#fef3c7' : '#dcfce7'};color:${iq.status === 'replied' ? '#92400e' : '#15803d'};border:none;">
                <i class="fas fa-${iq.status === 'replied' ? 'undo' : 'check'}"></i>
              </button>
              <button class="btn-sm btn-danger" onclick="deleteInquiry('${iq._id}')"><i class="fas fa-trash"></i></button>
              <a href="${adminEscapeAttr(replyUrl)}" target="_blank" rel="noopener" class="btn-sm btn-primary" style="text-decoration:none;"><i class="fas fa-reply"></i> Reply</a>
            </td>
          </tr>
        `;}).join('')}</tbody>
      </table>
    </div>`;
}

function adminInquiryReplyUrl(inquiry = {}) {
  const email = String(inquiry.email || '').trim();
  if (!email) return '#';
  const name = String(inquiry.name || 'Customer').trim() || 'Customer';
  const phone = String(inquiry.phone || '').trim();
  const message = String(inquiry.message || '').trim();
  const subject = `Re: Lencho inquiry from ${name}`;
  const body = [
    `Hi ${name},`,
    '',
    'Thank you for contacting Lencho.',
    '',
    message ? `Your message: ${message}` : '',
    phone ? `Phone: ${phone}` : '',
    '',
    'Regards,',
    'Lencho Team'
  ].filter(line => line !== '').join('\n');
  const url = new URL('https://mail.google.com/mail/');
  url.searchParams.set('view', 'cm');
  url.searchParams.set('fs', '1');
  url.searchParams.set('to', email);
  url.searchParams.set('su', subject);
  url.searchParams.set('body', body);
  return url.toString();
}
function filterInquiries(status) {
  localStorage.setItem('inquiry-filter', status);
  adminInquiries();
}

async function markInquirySolved(id, newStatus) {
  const r = await api(`/api/admin/inquiries/${id}/status`, { method: 'PUT', body: { status: newStatus } });
  if (r.error) { toast(r.error, 'error'); return; }
  toast(`Inquiry marked as ${newStatus === 'replied' ? 'Solved' : 'Pending'}`, 'success');
  adminInquiries();
}

async function deleteInquiry(id) {
  if(!confirm('Delete this inquiry?')) return;
  await api('/api/admin/inquiries/'+id, { method:'DELETE' });
  adminInquiries();
}

async function adminDashboard() {
  const s = adminSafeStats(await api('/api/admin/stats'));
  const formatVisitorCount = (value) => {
    const count = Number(value) || 0;
    if (count >= 10000000) {
      const crore = count / 10000000;
      return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(1)} crore`;
    }
    if (count >= 100000) {
      const lakh = count / 100000;
      return `${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} lakh`;
    }
    return count.toLocaleString('en-IN');
  };
  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">Dashboard Overview</h1><span style="font-size:.875rem;color:var(--gray);">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span></div>
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-label">Total Revenue</div><div class="stat-value">${formatCurrency(s.totalRevenue)}</div><div class="stat-change">↑ All time</div></div>
    <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-label">Total Orders</div><div class="stat-value">${s.totalOrders}</div><div class="stat-change">Today: ${s.todayOrders}</div></div>
    <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-label">Customers</div><div class="stat-value">${s.totalUsers}</div><div class="stat-change">Registered users</div></div>
    <div class="stat-card"><div class="stat-icon">👁️</div><div class="stat-label">Website Visitors</div><div class="stat-value">${formatVisitorCount(s.totalVisitors)}</div><div class="stat-change">Total unique sessions</div></div>
    <div class="stat-card"><div class="stat-icon">🏷️</div><div class="stat-label">Total GST Collected</div><div class="stat-value">${formatCurrency(s.totalGstCollected)}</div><div class="stat-change">All orders</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:2rem;">
    <div class="stat-card">
      <div class="stat-label">Today's Revenue</div>
      <div class="stat-value">${formatCurrency(s.todayRevenue)}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-top:1rem;">
        ${Object.entries(s.statusCounts||{}).map(([k,v])=>`<div style="text-align:center;padding:.5rem;background:var(--light-gray);border-radius:8px;"><div style="font-size:1.2rem;font-weight:700;">${v}</div><div style="font-size:.7rem;color:var(--gray);text-transform:capitalize;">${k.replace('_',' ')}</div></div>`).join('')}
      </div>
    </div>
    <div class="admin-table-wrap">
      <div class="admin-table-header"><h3>Recent Orders</h3><button class="btn-primary btn-sm" onclick="adminTab('orders')">View All</button></div>
      <table><thead><tr><th>Order ID</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>${(s.recentOrders||[]).map(o=>`<tr><td style="font-weight:600;color:var(--rose-dark);">${o.id}</td><td>${o.userName}</td><td>${formatCurrency(o.grandTotal)}</td><td><span class="order-status-badge status-${o.status}" style="font-size:.7rem;">${o.status}</span></td></tr>`).join('')}</tbody>
      </table>
    </div>
  </div>`;
}

async function adminOrders() {
  const orders = await api('/api/admin/orders');
  const statusLabelMap = {
    hold: 'Hold',
    pending: 'Pending',
    shipping: 'Shipping',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    placed: 'Placed',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    out_for_delivery: 'Out For Delivery'
  };
  const statusOptionsFor = (currentStatus) => {
    const preferred = ['hold', 'pending', 'shipping', 'delivered', 'cancelled'];
    const legacy = ['placed', 'confirmed', 'shipped', 'out_for_delivery'];
    const opts = [...new Set([String(currentStatus || '').trim(), ...preferred, ...legacy].filter(Boolean))];
    return opts.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${statusLabelMap[s] || s.replace('_', ' ')}</option>`).join('');
  };
  
  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header">
    <h1 class="admin-page-title">Manage Orders (${orders.length})</h1>
    <div style="font-size: .8rem; color: var(--gray);">Integration: <span style="color:#22c55e;">● Shiprocket Active</span></div>
  </div>
  <div class="admin-table-wrap">
    <table>
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th><th>Logistics (SR)</th><th>AWB / Tracking</th><th>Actions</th></tr></thead>
      <tbody>${orders.map(o=>`
      <tr>
        <td><b style="color:var(--rose-dark);">${o.id}</b><br/><span style="font-size:.65rem;color:var(--gray);text-transform:uppercase;">${o.paymentMethod}</span></td>
        <td>${formatDate(o.createdAt)}</td>
        <td>${o.userName}</td>
        <td><b>${formatCurrency(o.grandTotal)}</b></td>
        <td id="status-${o.id}"><span class="order-status-badge status-${o.status}" style="font-size:.7rem;">${o.status.replace('_',' ')}</span></td>
        <td>
          <select id="new-status-${o.id}" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;font-size:.75rem;">${statusOptionsFor(o.status)}</select>
        </td>
        <td>
          <div style="font-size:.75rem;font-weight:700;">${o.awbCode || o.trackingNumber || '—'}</div>
          <div style="font-size:.65rem;color:var(--gray);">${o.deliveryPartner || 'SR Auto'}</div>
        </td>
        <td>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;">
            <button class="btn-sm" onclick="updateOrderStatus('${o.id}')" title="Change Status"><i class="fas fa-edit"></i></button>
            <button class="btn-sm btn-outline" onclick="adminViewInvoice('${o.id}')" title="Invoice"><i class="fas fa-file-invoice"></i></button>
            <button class="btn-sm" onclick="window.open('/api/admin/orders/${o.id}/label-branded')" title="Generate Branded Label" style="background:#fef3c7;color:#92400e;border-color:#f59e0b;"><i class="fas fa-print"></i> Label</button>
            ${o.awbCode ? `<button class="btn-sm btn-gold" onclick="adminShiprocketLabel('${o.id}')" title="SR Label"><i class="fas fa-download"></i> SR</button>` : `<button class="btn-sm" onclick="adminShiprocketShip('${o.id}')" title="Ship with Shiprocket" style="background:#e0f2fe;color:#0369a1;"><i class="fas fa-shipping-fast"></i> Ship</button>`}
            <button class="btn-sm" onclick="deleteOrder('${o.id}')" title="Delete Order" style="background:#fee2e2;color:#991b1b;border-color:#fca5a5;"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function adminShiprocketShip(id) {
  if (!confirm('Sync this order with Shiprocket and generate AWB?')) return;
  toast('Initiating Shiprocket Sync...', 'info');
  const r = await api(`/api/admin/orders/${id}/shiprocket`, { method: 'POST' });
  if (r.error) { toast(r.error, 'error'); return; }
  toast('AWB Generated: ' + r.awb, 'success');
  adminOrders();
}

async function adminShiprocketLabel(id) {
  const r = await api(`/api/admin/orders/${id}/label`);
  if (r.error) { toast(r.error, 'error'); return; }
  if (r.label_url) window.open(r.label_url, '_blank');
  else toast('Label URL not generated yet', 'error');
}

async function updateOrderStatus(orderId) {
  const status = document.getElementById('new-status-' + orderId)?.value;
  const deliveryPartner = document.getElementById('dp-' + orderId)?.value;
  const trackingNumber = document.getElementById('tn-' + orderId)?.value;
  const r = await api('/api/admin/orders/' + orderId + '/status', { method: 'PUT', body: { status, deliveryPartner, trackingNumber } });
  if (r.error) { toast(r.error, 'error'); return; }
  const nextStatus = r.order?.status || status;
  toast(`Order ${orderId} updated to "${nextStatus}"`, 'success');
  const el = document.getElementById('status-' + orderId);
  if (el) el.innerHTML = `<span class="order-status-badge status-${nextStatus}" style="font-size:.7rem;">${nextStatus.replace('_',' ')}</span>`;
}

async function deleteOrder(orderId) {
  if (!confirm(`Are you sure you want to delete order ${orderId}? This cannot be undone.`)) return;
  const r = await api(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
  if (r.error) { toast(r.error, 'error'); return; }
  toast(`Order ${orderId} deleted successfully`, 'success');
  adminOrders();
}

async function adminViewInvoice(orderId) { await downloadInvoice(orderId); }

async function adminProducts() {
  const products = await api('/api/products');
  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">Catalog Inventory (${products.length})</h1><button class="btn-primary" onclick="adminTab('add-product')"><i class="fas fa-plus"></i> Add New Product</button></div>
  <div class="admin-table-wrap">
    <table>
      <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>HSN Code</th><th>GST %</th><th>Tags</th><th>Actions</th></tr></thead>
      <tbody>${products.map(p=>`
      <tr>
        <td><img src="${safeImageUrl(p.images[0], p.category)}" ${imageFallbackAttr(p.category,p.images[0])} style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid #eee;"/></td>
        <td><div style="font-weight:700;">${p.name}</div><div style="font-size:.7rem;color:var(--gray);">${p.id.substring(0,8)}...</div></td>
        <td style="text-transform:capitalize;"><span class="product-badge" style="position:static;font-size:0.7rem;padding:3px 8px;">${p.category}</span></td>
        <td><div style="font-weight:700;">${formatCurrency(p.price)}</div><div style="font-size:.7rem;color:var(--gray);text-decoration:line-through;">${formatCurrency(p.mrp)}</div></td>
        <td><span style="color:${p.stock>10?'#22c55e':p.stock>0?'#f59e0b':'#ef4444'};font-weight:700;background:${p.stock>10?'#f0fdf4':'#fffbeb'};padding:4px 8px;border-radius:6px;">${p.stock}</span></td>
        <td><code>${p.hsn || '7117'}</code></td>
        <td><span style="font-weight:600;color:var(--rose);">${p.gstRate || 18}%</span></td>
        <td>${[
          p.popular ? 'Best Seller' : '',
          p.featured ? 'Featured' : '',
          p.trending ? 'Trending' : '',
          p.newArrival ? 'New Arrival' : '',
          p.sale ? 'Sale' : ''
        ].filter(Boolean).map(t => `<span class="product-badge" style="position:static;font-size:.65rem;padding:3px 7px;margin:2px;display:inline-block;">${t}</span>`).join('') || '<span style="color:#aaa;">—</span>'}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn-outline btn-sm" onclick="adminEditProduct('${p.id}')" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-danger btn-sm" onclick="adminDeleteProduct('${p.id}','${p.name.replace(/'/g,'\\\'')}')" style="background:#fee2e2;color:#ef4444;border:1px solid #fca5a5;padding:6px 10px;border-radius:6px;" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function adminDeleteProduct(id, name) {
  if (!confirm(`🚨 ARE YOU SURE?\n\nDelete "${name}"?\n\nThis action CANNOT be undone. The product will be permanently removed from your store.`)) return;
  
  // Double confirmation on mobile
  if (window.innerWidth <= 768) {
    if (!confirm(`Final confirmation: Delete "${name}"?`)) return;
  }
  
  try {
    const r = await api('/api/products/' + id, { method: 'DELETE' });
    if (r.error) { toast(r.error, 'error'); return; }
    toast('✓ Product deleted successfully', 'info');
    await new Promise(resolve => setTimeout(resolve, 500));
    adminProducts();
  } catch (e) {
    toast('Error deleting product: ' + e.message, 'error');
  }
}

async function adminAddProduct(product = null) {
  const isEdit = !!product;
  const cats = await api('/api/categories');
  const catOptions = cats.length > 0 
    ? cats.map(c => `<option value="${c.slug}" ${product?.category===c.slug?'selected':''}>${c.name}</option>`).join('')
    : `<option value="others">Jewelry</option>`;

  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">${isEdit?'Edit':'Add'} Product</h1></div>
  <div class="admin-form">
    <div class="form-grid">
      <div class="form-group"><label>Product Name *</label><input id="p-name" value="${product?.name||''}" placeholder="e.g. Rose Gold Hoop Earrings"/></div>
      <div class="form-group"><label>Category Collection *</label>
        <select id="p-cat">
          ${catOptions}
        </select>
      </div>
      <div class="form-group"><label>Store</label>
        <select id="p-store-type">
          <option value="main" ${product?.storeType !== 'woollen' ? 'selected' : ''}>Main Jewellery Store</option>
          <option value="woollen" ${product?.storeType === 'woollen' ? 'selected' : ''}>Woollen Store</option>
        </select>
      </div>
      <div class="form-group"><label>Selling Price (₹) *</label><input id="p-price" type="number" value="${product?.price||''}" placeholder="599"/></div>
      <div class="form-group"><label>MRP (₹) *</label><input id="p-mrp" type="number" value="${product?.mrp||''}" placeholder="999"/></div>
      <div class="form-group"><label>Discount (%)</label><input id="p-discount" type="number" value="${product?.discount||''}" placeholder="40"/></div>
      <div class="form-group"><label>Stock Quantity *</label><input id="p-stock" type="number" value="${product?.stock||''}" placeholder="50"/></div>
      <div class="form-group"><label>GST Rate (%)</label><input id="p-gst" type="number" value="${product?.gstRate||3}" placeholder="3"/></div>
      <div class="form-group"><label>HSN Code</label><input id="p-hsn" value="${product?.hsn||'7117'}" placeholder="7117"/></div>
    </div>
    <div class="form-group"><label>Description *</label><textarea id="p-desc" rows="4" placeholder="Product description...">${product?.description||''}</textarea></div>
    <div class="form-group">
      <label>Featured Product</label>
      <select id="p-featured"><option value="false" ${!product?.featured?'selected':''}>No</option><option value="true" ${product?.featured?'selected':''}>Yes</option></select>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Best Seller</label><select id="p-popular"><option value="false" ${!product?.popular?'selected':''}>No</option><option value="true" ${product?.popular?'selected':''}>Yes - Show in Best Sellers</option></select></div>
      <div class="form-group"><label>Trending</label><select id="p-trending"><option value="false" ${!product?.trending?'selected':''}>No</option><option value="true" ${product?.trending?'selected':''}>Yes</option></select></div>
      <div class="form-group"><label>New Arrival</label><select id="p-new-arrival"><option value="false" ${!product?.newArrival?'selected':''}>No</option><option value="true" ${product?.newArrival?'selected':''}>Yes</option></select></div>
      <div class="form-group"><label>Sale</label><select id="p-sale"><option value="false" ${!product?.sale?'selected':''}>No</option><option value="true" ${product?.sale?'selected':''}>Yes</option></select></div>
    </div>
    <div class="form-group">
      <label>Product Images (Image 1 = Main Display Image)</label>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;" id="img-upload-grid">
        ${[1,2,3,4,5].map(n => {
          const existingImg = product?.images?.[n-1] || '';
          return `<div style="border:2px dashed var(--border);border-radius:12px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;cursor:pointer;background:#fafafa;" onclick="document.getElementById('p-img-${n}').click()">
            <input type="file" id="p-img-${n}" accept="image/*" style="display:none" onchange="previewSingleImage(this,${n})">
            <img id="p-img-preview-${n}" src="${safeImageUrl(existingImg, product?.category)}" ${imageFallbackAttr(product?.category, existingImg)} style="width:100%;height:100%;object-fit:cover;display:${existingImg?'block':'none'};" />
            <div id="p-img-label-${n}" style="text-align:center;color:var(--gray);font-size:.75rem;display:${existingImg?'none':'block'};">
              <i class="fas fa-plus" style="font-size:1.2rem;display:block;margin-bottom:4px;"></i>
              ${n===1?'Main':'Image '+n}
            </div>
            ${existingImg ? `<button type="button" class="img-remove-btn" onclick="event.stopPropagation(); markImageRemoved(${n}, '${existingImg}')" title="Remove image" style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.9);border:1px solid #f3d7df;border-radius:8px;padding:6px;cursor:pointer;">✕</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>
    <div style="display:flex;gap:1rem;">
      <button class="btn-primary" onclick="${isEdit?`saveEditProduct('${product.id}')`:'saveNewProduct()'}">${isEdit?'Save Changes':'Add Product ✦'}</button>
      <button class="btn-outline" onclick="adminTab('products')">Cancel</button>
    </div>
  </div>`;
}

function previewSingleImage(input, n) {
  const preview = document.getElementById('p-img-preview-' + n);
  const label = document.getElementById('p-img-label-' + n);
  if (input.files && input.files[0]) {
    preview.src = URL.createObjectURL(input.files[0]);
    preview.style.display = 'block';
    if (label) label.style.display = 'none';
    // If user selected a new file for an existing slot, unmark removal
    const rem = document.getElementById('p-img-removed-' + n);
    if (rem) rem.value = '';
  }
}

function markImageRemoved(n, url) {
  // Hide preview and mark image for removal
  const preview = document.getElementById('p-img-preview-' + n);
  const label = document.getElementById('p-img-label-' + n);
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
  if (label) label.style.display = 'block';
  // add or set hidden input to track removals
  let rem = document.getElementById('p-img-removed-' + n);
  if (!rem) {
    rem = document.createElement('input');
    rem.type = 'hidden';
    rem.id = 'p-img-removed-' + n;
    rem.name = 'removedImages[]';
    document.querySelector('.admin-form').appendChild(rem);
  }
  rem.value = url;
}

async function saveNewProduct() {
  const fd = new FormData();
  fd.append('name', document.getElementById('p-name').value);
  fd.append('category', document.getElementById('p-cat').value);
  fd.append('price', document.getElementById('p-price').value);
  fd.append('mrp', document.getElementById('p-mrp').value);
  fd.append('discount', document.getElementById('p-discount').value);
  fd.append('stock', document.getElementById('p-stock').value);
  fd.append('gstRate', document.getElementById('p-gst').value);
  fd.append('hsn', document.getElementById('p-hsn').value);
  fd.append('description', document.getElementById('p-desc').value);
  fd.append('featured', document.getElementById('p-featured').value);
  fd.append('storeType', document.getElementById('p-store-type').value);
  fd.append('popular', document.getElementById('p-popular').value);
  fd.append('trending', document.getElementById('p-trending').value);
  fd.append('newArrival', document.getElementById('p-new-arrival').value);
  fd.append('sale', document.getElementById('p-sale').value);
  for (let i = 1; i <= 5; i++) {
    const inp = document.getElementById('p-img-' + i);
    if (inp && inp.files && inp.files[0]) fd.append('images', inp.files[0]);
  }
  const res = await fetch('/api/products', { method: 'POST', body: fd });
  const r = await res.json();
  if (r.error) { toast(r.error, 'error'); return; }
  toast('Product added successfully! ✦', 'success');
  adminTab('products');
}

async function adminEditProduct(id) {
  const p = await api('/api/products/' + id);
  if (p.error) { toast(p.error, 'error'); return; }
  adminAddProduct(p);
  // Override save button
  setTimeout(() => {
    document.querySelector('.admin-form .btn-primary').onclick = () => saveEditProduct(id);
  }, 100);
}

async function saveEditProduct(id) {
  const fd = new FormData();
  fd.append('name', document.getElementById('p-name').value);
  fd.append('category', document.getElementById('p-cat').value);
  fd.append('price', document.getElementById('p-price').value);
  fd.append('mrp', document.getElementById('p-mrp').value);
  fd.append('discount', document.getElementById('p-discount').value);
  fd.append('stock', document.getElementById('p-stock').value);
  fd.append('gstRate', document.getElementById('p-gst').value);
  fd.append('hsn', document.getElementById('p-hsn').value);
  fd.append('description', document.getElementById('p-desc').value);
  fd.append('featured', document.getElementById('p-featured').value);
  fd.append('storeType', document.getElementById('p-store-type').value);
  fd.append('popular', document.getElementById('p-popular').value);
  fd.append('trending', document.getElementById('p-trending').value);
  fd.append('newArrival', document.getElementById('p-new-arrival').value);
  fd.append('sale', document.getElementById('p-sale').value);
  for (let i = 1; i <= 5; i++) {
    const inp = document.getElementById('p-img-' + i);
    if (inp && inp.files && inp.files[0]) fd.append('images', inp.files[0]);
  }
  const res = await fetch('/api/products/' + id, { method: 'PUT', body: fd });
  const r = await res.json();
  if (r.error) { toast(r.error, 'error'); return; }
  toast('Product updated! ✦', 'success');
  adminTab('products');
}

let adminProductFormState = null;
let adminCategoryFormState = null;

function getAdminAuthHeaders() {
  const headers = {};
  try {
    const token = typeof getJWTToken === 'function' ? getJWTToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}
  return headers;
}

async function uploadAdminMediaFile(file, folder = 'products/general') {
  const fd = new FormData();
  fd.append('media', file);
  fd.append('folder', folder);
  const res = await fetch('/api/admin/upload-media', { method: 'POST', credentials: 'include', headers: getAdminAuthHeaders(), body: fd });
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error('Upload API returned non-JSON response');
  }
  if (!res.ok || data.error || !data.url) throw new Error(data.error || 'Upload failed');
  return data.url;
}

function createEmptyVariantRow(variantType = 'color', variant = {}) {
  return {
    id: variant.id || `variant-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    label: variant.label || variant.value || '',
    value: variant.value || variant.label || '',
    colorHex: variant.colorHex || (variantType === 'color' ? '#d88ea6' : ''),
    price: variant.price ?? '',
    mrp: variant.mrp ?? '',
    stock: variant.stock ?? '',
    sku: variant.sku || '',
    images: Array.isArray(variant.images) ? [...variant.images] : []
  };
}

async function adminAddProduct(product = null) {
  const isEdit = !!product;
  const cats = await api('/api/categories');
  const catOptions = cats.length > 0 ? cats.map(c => `<option value="${c.slug}" ${product?.category===c.slug?'selected':''}>${c.name}</option>`).join('') : `<option value="others">Jewelry</option>`;
  adminProductFormState = {
    allCategories: Array.isArray(cats) ? [...cats] : [],
    images: Array.isArray(product?.images) ? [...product.images] : [],
    hasVariants: Boolean(product?.hasVariants),
    variantType: product?.variantType || 'color',
    variants: Array.isArray(product?.variants) && product.variants.length ? product.variants.map(variant => createEmptyVariantRow(product?.variantType || 'color', variant)) : []
  };
  document.getElementById('admin-content').innerHTML = `<div class="admin-header"><h1 class="admin-page-title">${isEdit?'Edit':'Add'} Product</h1></div><div class="admin-form"><div class="form-grid"><div class="form-group"><label>Product Name *</label><input id="p-name" value="${product?.name||''}" placeholder="e.g. Rose Gold Hoop Earrings"/></div><div class="form-group"><label>Category Collection *</label><select id="p-cat">${catOptions}</select></div><div class="form-group"><label>Store</label><select id="p-store-type"><option value="main" ${product?.storeType !== 'woollen' ? 'selected' : ''}>Main Jewellery Store</option><option value="woollen" ${product?.storeType === 'woollen' ? 'selected' : ''}>Woollen Store</option></select></div><div class="form-group"><label>Has Variants?</label><select id="p-has-variants" onchange="toggleAdminVariantSection()"><option value="false" ${!adminProductFormState.hasVariants ? 'selected' : ''}>No</option><option value="true" ${adminProductFormState.hasVariants ? 'selected' : ''}>Yes</option></select></div><div class="form-group"><label>Selling Price (₹) *</label><input id="p-price" type="number" value="${product?.price||''}" placeholder="599"/></div><div class="form-group"><label>MRP (₹) *</label><input id="p-mrp" type="number" value="${product?.mrp||''}" placeholder="999"/></div><div class="form-group"><label>Discount (%)</label><input id="p-discount" type="number" value="${product?.discount||''}" placeholder="40"/></div><div class="form-group"><label>Stock Quantity *</label><input id="p-stock" type="number" value="${product?.stock||''}" placeholder="50"/></div><div class="form-group"><label>SKU</label><input id="p-sku" value="${product?.sku||''}" placeholder="LEN-001"/></div><div class="form-group"><label>GST Rate (%)</label><input id="p-gst" type="number" value="${product?.gstRate||3}" placeholder="3"/></div><div class="form-group"><label>HSN Code</label><input id="p-hsn" value="${product?.hsn||'7117'}" placeholder="7117"/></div></div><div class="form-group"><label>Description *</label><textarea id="p-desc" rows="4" placeholder="Product description...">${product?.description||''}</textarea></div><div id="admin-variant-section" style="display:${adminProductFormState.hasVariants ? 'block' : 'none'};margin-bottom:1.5rem;border:1px solid var(--border);border-radius:16px;padding:1rem;"><div class="form-grid"><div class="form-group"><label>Variant Type</label><select id="p-variant-type" onchange="renderAdminVariantRows()">${['color','size','weight','material','length','custom'].map(type => `<option value="${type}" ${adminProductFormState.variantType===type?'selected':''}>${type.charAt(0).toUpperCase()+type.slice(1)}</option>`).join('')}</select></div></div><div id="admin-variant-rows"></div><button class="btn-outline" type="button" onclick="addAdminVariantRow()"><i class="fas fa-plus"></i> Add Variant</button></div><div class="form-group"><label>Featured Product</label><select id="p-featured"><option value="false" ${!product?.featured?'selected':''}>No</option><option value="true" ${product?.featured?'selected':''}>Yes</option></select></div><div class="form-grid"><div class="form-group"><label>Best Seller</label><select id="p-popular"><option value="false" ${!product?.popular?'selected':''}>No</option><option value="true" ${product?.popular?'selected':''}>Yes - Show in Best Sellers</option></select></div><div class="form-group"><label>Trending</label><select id="p-trending"><option value="false" ${!product?.trending?'selected':''}>No</option><option value="true" ${product?.trending?'selected':''}>Yes</option></select></div><div class="form-group"><label>New Arrival</label><select id="p-new-arrival"><option value="false" ${!product?.newArrival?'selected':''}>No</option><option value="true" ${product?.newArrival?'selected':''}>Yes</option></select></div><div class="form-group"><label>Sale</label><select id="p-sale"><option value="false" ${!product?.sale?'selected':''}>No</option><option value="true" ${product?.sale?'selected':''}>Yes</option></select></div></div><div class="form-group"><label>Product Images (First image becomes main image)</label><div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-bottom:.85rem;"><input type="file" id="p-image-upload" accept="image/*" multiple onchange="handleAdminProductImageInput(event)"/><span style="font-size:.82rem;color:var(--gray);">Upload now, preview instantly, and reorder before saving.</span></div><div id="admin-product-image-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;"></div></div><div style="display:flex;gap:1rem;"><button class="btn-primary" onclick="${isEdit?`saveEditProduct('${product.id}')`:'saveNewProduct()'}">${isEdit?'Save Changes':'Add Product ✦'}</button><button class="btn-outline" onclick="adminTab('products')">Cancel</button></div></div>`;
  toggleAdminVariantSection();
  const storeSelect = document.getElementById('p-store-type');
  const categorySelect = document.getElementById('p-cat');
  if (storeSelect) storeSelect.addEventListener('change', refreshAdminProductCategoryOptions);
  if (categorySelect) categorySelect.addEventListener('change', () => {
    renderAdminProductImages();
    renderAdminVariantRows();
  });
  refreshAdminProductCategoryOptions(product?.category || '');
  renderAdminProductImages();
  renderAdminVariantRows();
}

async function saveNewProduct() { await submitAdminProduct(); }
async function adminEditProduct(id) { const p = await api('/api/products/' + id); if (p.error) { toast(p.error, 'error'); return; } adminAddProduct(p); }
async function saveEditProduct(id) { await submitAdminProduct(id); }

function toggleAdminVariantSection() { const hasVariants = document.getElementById('p-has-variants')?.value === 'true'; if (adminProductFormState) adminProductFormState.hasVariants = hasVariants; const section = document.getElementById('admin-variant-section'); if (section) section.style.display = hasVariants ? 'block' : 'none'; }
function refreshAdminProductCategoryOptions(preferredCategory = '') {
  if (!adminProductFormState?.allCategories?.length) return;
  const select = document.getElementById('p-cat');
  const store = document.getElementById('p-store-type')?.value || 'main';
  if (!select) return;
  const previous = preferredCategory || select.value || '';
  const filtered = adminProductFormState.allCategories.filter(category => (category?.storeType || 'main') === store);
  select.innerHTML = filtered.length
    ? filtered.map(category => `<option value="${category.slug}" ${category.slug === previous ? 'selected' : ''}>${category.name}</option>`).join('')
    : `<option value="others">General</option>`;
  if (![...select.options].some(option => option.value === previous) && select.options.length) {
    select.selectedIndex = 0;
  }
}
function renderAdminProductImages() { const grid = document.getElementById('admin-product-image-grid'); if (!grid || !adminProductFormState) return; const category = document.getElementById('p-cat')?.value || ''; grid.innerHTML = adminProductFormState.images.length ? adminProductFormState.images.map((image, index) => `<div style="border:1px solid var(--border);border-radius:14px;padding:.6rem;background:#fff;"><div style="position:relative;aspect-ratio:1;overflow:hidden;border-radius:12px;background:#faf7f9;"><img src="${safeImageUrl(image, category)}" style="width:100%;height:100%;object-fit:cover;" />${index === 0 ? '<span style="position:absolute;left:8px;top:8px;background:rgba(22,163,74,.92);color:#fff;padding:4px 8px;border-radius:999px;font-size:.72rem;font-weight:700;">Main</span>' : ''}</div><div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.55rem;"><button type="button" class="btn-outline btn-sm" onclick="moveAdminProductImage(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn-outline btn-sm" onclick="moveAdminProductImage(${index}, 1)" ${index === adminProductFormState.images.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="btn-outline btn-sm" onclick="removeAdminProductImage(${index})" style="color:#dc2626;border-color:#fecaca;">Remove</button></div></div>`).join('') : `<div style="padding:1rem;border:2px dashed var(--border);border-radius:16px;color:var(--gray);text-align:center;">Upload product images to preview them here.</div>`; }
async function handleAdminProductImageInput(event) { const files = Array.from(event.target.files || []); if (!files.length || !adminProductFormState) return; const category = document.getElementById('p-cat')?.value || 'general'; try { for (const file of files) adminProductFormState.images.push(await uploadAdminMediaFile(file, `products/${category}`)); renderAdminProductImages(); toast('Images uploaded successfully', 'success'); } catch (error) { toast(error.message || 'Image upload failed', 'error'); } finally { event.target.value = ''; } }
function removeAdminProductImage(index) { if (!adminProductFormState) return; adminProductFormState.images.splice(index, 1); renderAdminProductImages(); }
function moveAdminProductImage(index, delta) { if (!adminProductFormState) return; const nextIndex = index + delta; if (nextIndex < 0 || nextIndex >= adminProductFormState.images.length) return; const [image] = adminProductFormState.images.splice(index, 1); adminProductFormState.images.splice(nextIndex, 0, image); renderAdminProductImages(); }
function renderAdminVariantRows() { if (!adminProductFormState) return; adminProductFormState.variantType = document.getElementById('p-variant-type')?.value || adminProductFormState.variantType || 'color'; const container = document.getElementById('admin-variant-rows'); if (!container) return; if (adminProductFormState.hasVariants && !adminProductFormState.variants.length) adminProductFormState.variants.push(createEmptyVariantRow(adminProductFormState.variantType)); const title = adminProductFormState.variantType.charAt(0).toUpperCase() + adminProductFormState.variantType.slice(1); container.innerHTML = adminProductFormState.variants.map((variant, index) => `<div style="border:1px solid var(--border);border-radius:14px;padding:1rem;margin-bottom:.85rem;background:#fffafc;"><div class="form-grid"><div class="form-group"><label>${title} Name</label><input value="${variant.label || ''}" onchange="handleAdminVariantFieldChange(${index}, 'label', this.value)" placeholder="e.g. Rose Gold"/></div>${adminProductFormState.variantType === 'color' ? `<div class="form-group"><label>Color Hex</label><input type="color" value="${variant.colorHex || '#d88ea6'}" onchange="handleAdminVariantFieldChange(${index}, 'colorHex', this.value)"/></div>` : ''}<div class="form-group"><label>Price</label><input type="number" value="${variant.price ?? ''}" onchange="handleAdminVariantFieldChange(${index}, 'price', this.value)"/></div><div class="form-group"><label>MRP</label><input type="number" value="${variant.mrp ?? ''}" onchange="handleAdminVariantFieldChange(${index}, 'mrp', this.value)"/></div><div class="form-group"><label>Stock</label><input type="number" value="${variant.stock ?? ''}" onchange="handleAdminVariantFieldChange(${index}, 'stock', this.value)"/></div><div class="form-group"><label>SKU</label><input value="${variant.sku || ''}" onchange="handleAdminVariantFieldChange(${index}, 'sku', this.value)"/></div></div><div class="form-group"><label>Variant Images</label><input type="file" accept="image/*" multiple onchange="handleAdminVariantImageInput(event, ${index})"/><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-top:.75rem;">${(variant.images || []).map((image, imageIndex) => `<div style="position:relative;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#fff;"><img src="${safeImageUrl(image, document.getElementById('p-cat')?.value || '')}" style="width:100%;aspect-ratio:1;object-fit:cover;" /><button type="button" onclick="handleAdminVariantFieldChange(${index}, 'removeImage', ${imageIndex})" style="position:absolute;right:6px;top:6px;border:none;background:rgba(255,255,255,.94);border-radius:999px;padding:4px 7px;cursor:pointer;">×</button></div>`).join('')}</div></div><button type="button" class="btn-outline btn-sm" onclick="removeAdminVariantRow(${index})" style="color:#dc2626;border-color:#fecaca;">Remove Variant</button></div>`).join(''); }
function addAdminVariantRow() { if (!adminProductFormState) return; adminProductFormState.variants.push(createEmptyVariantRow(adminProductFormState.variantType || 'color')); renderAdminVariantRows(); }
function removeAdminVariantRow(index) { if (!adminProductFormState) return; adminProductFormState.variants.splice(index, 1); renderAdminVariantRows(); }
function handleAdminVariantFieldChange(index, field, value) { if (!adminProductFormState?.variants?.[index]) return; if (field === 'removeImage') adminProductFormState.variants[index].images.splice(value, 1); else { adminProductFormState.variants[index][field] = value; if (field === 'label') adminProductFormState.variants[index].value = value; } renderAdminVariantRows(); }
async function handleAdminVariantImageInput(event, index) { const files = Array.from(event.target.files || []); if (!files.length || !adminProductFormState?.variants?.[index]) return; const category = document.getElementById('p-cat')?.value || 'general'; try { for (const file of files) adminProductFormState.variants[index].images.push(await uploadAdminMediaFile(file, `products/${category}/variants`)); renderAdminVariantRows(); toast('Variant images uploaded', 'success'); } catch (error) { toast(error.message || 'Variant image upload failed', 'error'); } finally { event.target.value = ''; } }
function collectAdminProductPayload() { const hasVariants = document.getElementById('p-has-variants')?.value === 'true'; adminProductFormState.hasVariants = hasVariants; adminProductFormState.variantType = document.getElementById('p-variant-type')?.value || adminProductFormState.variantType || 'color'; return { name: document.getElementById('p-name').value.trim(), category: document.getElementById('p-cat').value, storeType: document.getElementById('p-store-type').value, hasVariants, variantType: adminProductFormState.variantType, price: document.getElementById('p-price').value, mrp: document.getElementById('p-mrp').value, discount: document.getElementById('p-discount').value, stock: document.getElementById('p-stock').value, sku: document.getElementById('p-sku').value.trim(), gstRate: document.getElementById('p-gst').value, hsn: document.getElementById('p-hsn').value, description: document.getElementById('p-desc').value.trim(), featured: document.getElementById('p-featured').value, popular: document.getElementById('p-popular').value, trending: document.getElementById('p-trending').value, newArrival: document.getElementById('p-new-arrival').value, sale: document.getElementById('p-sale').value, existingImages: adminProductFormState.images, imageOrder: adminProductFormState.images, variants: hasVariants ? adminProductFormState.variants.map(variant => ({ ...variant, label: String(variant.label || '').trim(), value: String(variant.label || variant.value || '').trim(), price: Number(variant.price) || 0, mrp: Number(variant.mrp) || Number(variant.price) || 0, stock: Number(variant.stock) || 0, sku: String(variant.sku || '').trim(), images: Array.isArray(variant.images) ? variant.images : [] })) : [] }; }
function validateAdminProductPayload(payload) { if (!payload.name) return 'Product name is required'; if (!payload.category) return 'Collection is required'; if (payload.hasVariants) { if (!payload.variantType) return 'Choose a variant type'; if (!payload.variants.length) return 'Add at least one variant'; const invalid = payload.variants.find(variant => !variant.label || !(Number(variant.price) > 0)); if (invalid) return 'Each variant needs a name and price'; } else { if (!(Number(payload.price) > 0)) return 'Selling price is required'; if (!(Number(payload.mrp) > 0)) return 'MRP is required'; } return ''; }
async function submitAdminProduct(id = '') { const payload = collectAdminProductPayload(); const validationError = validateAdminProductPayload(payload); if (validationError) return toast(validationError, 'error'); const response = await api(id ? `/api/products/${id}` : '/api/products', { method: id ? 'PUT' : 'POST', body: { ...payload, variants: JSON.stringify(payload.variants), existingImages: JSON.stringify(payload.existingImages), imageOrder: JSON.stringify(payload.imageOrder), removedImages: JSON.stringify([]) } }); if (response.error) return toast(response.error, 'error'); toast(id ? 'Product updated successfully' : 'Product added successfully', 'success'); adminTab('products'); }

async function adminUsers() {
  const response = await api('/api/admin/users');
  const users = Array.isArray(response) ? response : (response.users || []);
  const summary = response?.summary || {
    total: users.length,
    verified: users.filter(user => user.isVerified).length,
    blocked: users.filter(user => user.isBlocked).length,
    providers: users.reduce((acc, user) => {
      const key = user.authProvider || 'email';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  };
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
    <h1 class="admin-page-title">Users (${summary.total})</h1>
    <div style="display:flex;gap:.75rem;flex-wrap:wrap;font-size:.85rem;">
      <span style="padding:.45rem .7rem;border-radius:999px;background:#ecfeff;color:#155e75;">Verified ${summary.verified}</span>
      <span style="padding:.45rem .7rem;border-radius:999px;background:#fef2f2;color:#991b1b;">Blocked ${summary.blocked}</span>
      <span style="padding:.45rem .7rem;border-radius:999px;background:#f5f3ff;color:#6d28d9;">Email ${summary.providers.email || 0}</span>
      <span style="padding:.45rem .7rem;border-radius:999px;background:#fefce8;color:#a16207;">Google ${summary.providers.google || 0}</span>
    </div>
  </div>
  <div class="admin-form" style="margin-bottom:1rem;display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;">
    <div class="form-group" style="margin-bottom:0;min-width:240px;flex:1;">
      <label>Search Users</label>
      <input id="admin-user-search" type="text" placeholder="Name, email, phone, gender" oninput="filterAdminUsers()" />
    </div>
    <div class="form-group" style="margin-bottom:0;min-width:180px;">
      <label>Status</label>
      <select id="admin-user-status" onchange="filterAdminUsers()">
        <option value="">All</option>
        <option value="verified">Verified</option>
        <option value="unverified">Unverified</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0;min-width:180px;">
      <label>Provider</label>
      <select id="admin-user-provider" onchange="filterAdminUsers()">
        <option value="">All</option>
        <option value="email">Email</option>
        <option value="google">Google</option>
      </select>
    </div>
  </div>
  <div class="admin-table-wrap" style="overflow-x:auto;">
    <table style="min-width:980px;">
      <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Gender</th><th>Provider</th><th>Verified</th><th>Join Date</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="admin-users-tbody">${users.map(u=>`
      <tr data-name="${escapeHtml(u.name).toLowerCase()}" data-email="${escapeHtml(u.email).toLowerCase()}" data-phone="${escapeHtml(u.phone || '').toLowerCase()}" data-gender="${escapeHtml(u.gender || '').toLowerCase()}" data-provider="${escapeHtml(u.authProvider || 'email')}" data-verified="${u.isVerified ? 'verified' : 'unverified'}" data-blocked="${u.isBlocked ? 'blocked' : 'active'}">
        <td><b>${escapeHtml(u.name)}</b></td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.phone || '—')}</td>
        <td>${escapeHtml(u.gender || '—')}</td>
        <td><span style="padding:3px 10px;border-radius:99px;font-size:.7rem;font-weight:600;background:${u.authProvider==='google'?'#f5f3ff':'#ecfeff'};color:${u.authProvider==='google'?'#6d28d9':'#155e75'};">${escapeHtml(u.authProvider || 'email')}</span></td>
        <td>${u.isVerified ? 'Yes' : 'No'}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td>${formatDate(u.lastLoginAt || u.updatedAt || u.createdAt)}</td>
        <td>${u.isBlocked ? '<span style="color:#b91c1c;font-weight:700;">Blocked</span>' : '<span style="color:#166534;font-weight:700;">Active</span>'}</td>
        <td style="display:flex;gap:.4rem;flex-wrap:wrap;">
          ${u.role !== 'admin' ? `<button class="btn-outline btn-sm" onclick="toggleUserBlock('${u.id}', ${u.isBlocked ? 'false' : 'true'})" style="padding:5px 10px;border-radius:6px;cursor:pointer;font-size:.75rem;">${u.isBlocked ? 'Unblock' : 'Block'}</button>` : '<span style="color:#888;">Protected</span>'}
          ${u.role !== 'admin' ? `<button class="btn-danger btn-sm" onclick="deleteUser('${u.id}','${escapeHtml(u.name)}')" style="padding:5px 10px;border-radius:6px;background:#fee2e2;color:#ef4444;border:1px solid #fca5a5;cursor:pointer;font-size:.75rem;">Remove</button>` : ''}
        </td>
      </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function filterAdminUsers() {
  const search = String(document.getElementById('admin-user-search')?.value || '').trim().toLowerCase();
  const status = String(document.getElementById('admin-user-status')?.value || '').toLowerCase();
  const provider = String(document.getElementById('admin-user-provider')?.value || '').toLowerCase();
  document.querySelectorAll('#admin-users-tbody tr').forEach(row => {
    const matchesSearch = !search || [row.dataset.name, row.dataset.email, row.dataset.phone, row.dataset.gender].some(value => String(value || '').includes(search));
    const matchesStatus = !status || (
      status === 'blocked' ? row.dataset.blocked === 'blocked' :
      status === 'verified' ? row.dataset.verified === 'verified' :
      row.dataset.verified === 'unverified'
    );
    const matchesProvider = !provider || row.dataset.provider === provider;
    row.style.display = matchesSearch && matchesStatus && matchesProvider ? '' : 'none';
  });
}

async function deleteUser(id, name) {
  if (!confirm(`Remove user "${name}"?`)) return;
  const r = await api('/api/admin/users/' + id, { method: 'DELETE' });
  if (r.error) { toast(r.error, 'error'); return; }
  toast('User removed', 'info');
  adminUsers();
}

async function toggleUserBlock(id, blocked) {
  const r = await api('/api/admin/users/' + id + '/block', { method: 'PUT', body: { blocked } });
  if (r.error) { toast(r.error, 'error'); return; }
  toast(r.blocked ? 'User blocked' : 'User unblocked', 'info');
  adminUsers();
}

async function adminGST() {
  const now = new Date();
  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">GST Report & Tax Invoice</h1></div>
  <div class="admin-form" style="margin-bottom:1.5rem;">
    <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;">
      <div class="form-group" style="margin-bottom:0;"><label>Month</label><select id="gst-month">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${i+1===now.getMonth()+1?'selected':''}>${new Date(2000,i).toLocaleString('en-IN',{month:'long'})}</option>`).join('')}</select></div>
      <div class="form-group" style="margin-bottom:0;"><label>Year</label><select id="gst-year">${[2025,2026,2027].map(y=>`<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`).join('')}</select></div>
      <button class="btn-primary" onclick="loadGSTReport()"><i class="fas fa-search"></i> Generate Report</button>
      <button class="btn-outline" onclick="downloadGSTReport()"><i class="fas fa-download"></i> Download CSV</button>
    </div>
  </div>
  <div id="gst-report-content"><p style="color:var(--gray);text-align:center;padding:2rem;">Select month and year, then click Generate Report</p></div>`;
}

let lastGSTData = null;
async function loadGSTReport() {
  const month = document.getElementById('gst-month').value;
  const year = document.getElementById('gst-year').value;
  const r = await api(`/api/admin/gst-report?month=${month}&year=${year}`);
  lastGSTData = r;
  const el = document.getElementById('gst-report-content');
  if (!r.report.length) { el.innerHTML = '<p style="text-align:center;color:var(--gray);padding:2rem;">No orders found for this period</p>'; return; }
  el.innerHTML = `
  <div class="admin-table-wrap">
    <div class="admin-table-header">
      <h3>${r.count} Orders – ${new Date(2000,parseInt(document.getElementById('gst-month').value)-1).toLocaleString('en-IN',{month:'long'})} ${year}</h3>
    </div>
    <table class="gst-report-table">
      <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Taxable Amt</th><th>CGST</th><th>SGST</th><th>Total GST</th><th>Grand Total</th><th>Payment</th><th>Invoice</th></tr></thead>
      <tbody>
        ${r.report.map(row=>`
        <tr>
          <td><b>${row.orderId}</b></td>
          <td>${row.date}</td>
          <td>${row.customerName}</td>
          <td>₹${row.taxableAmount.toFixed(2)}</td>
          <td style="color:#1d4ed8;">₹${row.cgst.toFixed(2)}</td>
          <td style="color:#1d4ed8;">₹${row.sgst.toFixed(2)}</td>
          <td style="color:#166534;font-weight:600;">₹${row.totalGst.toFixed(2)}</td>
          <td style="font-weight:600;">₹${row.grandTotal.toFixed(2)}</td>
          <td>${row.paymentMethod?.toUpperCase()}</td>
          <td><button class="btn-outline btn-sm" onclick="downloadInvoice('${row.orderId}')"><i class="fas fa-file-pdf"></i></button></td>
        </tr>`).join('')}
        <tr class="gst-total-row">
          <td colspan="3"><b>TOTALS (${r.count} orders)</b></td>
          <td>₹${r.totals.taxableAmount.toFixed(2)}</td>
          <td>₹${r.totals.cgst.toFixed(2)}</td>
          <td>₹${r.totals.sgst.toFixed(2)}</td>
          <td>₹${r.totals.totalGst.toFixed(2)}</td>
          <td>₹${r.totals.grandTotal.toFixed(2)}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>`;
}

function downloadGSTReport() {
  if (!lastGSTData || !lastGSTData.report.length) { toast('Generate report first', 'error'); return; }
  const headers = ['Order ID','Date','Customer','Taxable Amount','CGST','SGST','Total GST','Grand Total','Payment'];
  const rows = lastGSTData.report.map(r => [r.orderId,r.date,r.customerName,r.taxableAmount.toFixed(2),r.cgst.toFixed(2),r.sgst.toFixed(2),r.totalGst.toFixed(2),r.grandTotal.toFixed(2),r.paymentMethod]);
  rows.push(['TOTAL','','',lastGSTData.totals.taxableAmount.toFixed(2),lastGSTData.totals.cgst.toFixed(2),lastGSTData.totals.sgst.toFixed(2),lastGSTData.totals.totalGst.toFixed(2),lastGSTData.totals.grandTotal.toFixed(2),'']);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `GST_Report_Lencho_${document.getElementById('gst-month').value}_${document.getElementById('gst-year').value}.csv`;
  a.click();
  toast('GST Report downloaded! ✦', 'success');
}

async function adminWoollen() {
  const [products, collections, settingsRaw] = await Promise.all([
    api('/api/products?storeType=woollen'),
    api('/api/categories?storeType=woollen'),
    api('/api/settings')
  ]);
  const settings = normalizeSettings(settingsRaw);
  const list = Array.isArray(products) ? products : [];
  const cats = Array.isArray(collections) ? collections : [];
  const g = (k, fallback = '') => settings[k] ?? fallback;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header">
      <h1 class="admin-page-title">Woollen Collection</h1>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
        <button class="btn-primary" onclick="adminAddWoollenProduct()"><i class="fas fa-plus"></i> Add Woollen Product</button>
        <button class="btn-outline" onclick="showAddCategory('woollen')"><i class="fas fa-layer-group"></i> New Woollen Collection</button>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:2rem;">
      <div class="stat-card"><div class="stat-label">Woollen Products</div><div class="stat-value">${list.length}</div></div>
      <div class="stat-card"><div class="stat-label">Collections</div><div class="stat-value">${cats.length}</div></div>
      <div class="stat-card"><div class="stat-label">Best Sellers</div><div class="stat-value">${list.filter(p=>p.popular).length}</div></div>
    </div>

    <div class="admin-form" style="margin-bottom:2rem;">
      <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-palette"></i> Woollen Page Editor</h3>
      <div class="form-grid">
        <div class="form-group"><label>Header Title</label><input id="wl-woollenHeaderTitle" value="${g('woollenHeaderTitle','Lencho Woollen')}"/></div>
        <div class="form-group"><label>Hero Title</label><input id="wl-woollenHeroTitle" value="${g('woollenHeroTitle','Handmade Woollen Collection')}"/></div>
        <div class="form-group"><label>Hero Subtitle</label><input id="wl-woollenHeroSubtitle" value="${g('woollenHeroSubtitle','')}"/></div>
        <div class="form-group"><label>Button Text</label><input id="wl-woollenHeroButtonText" value="${g('woollenHeroButtonText','View All Woollen')}"/></div>
        <div class="form-group"><label>Hero Banner URL</label><input id="wl-woollenHeroBanner" value="${g('woollenHeroBanner','')}"/></div>
        <div class="form-group"><label>Header Background</label><input type="color" id="wl-woollenHeaderBg" value="${g('woollenHeaderBg','#fff7fb')}"/></div>
        <div class="form-group"><label>Text Color</label><input type="color" id="wl-woollenHeaderText" value="${g('woollenHeaderText','#3f2434')}"/></div>
        <div class="form-group"><label>Hover Color</label><input type="color" id="wl-woollenHoverColor" value="${g('woollenHoverColor','#c9748f')}"/></div>
        <div class="form-group"><label>Button Color</label><input type="color" id="wl-woollenButtonColor" value="${g('woollenButtonColor','#9b4065')}"/></div>
        <div class="form-group"><label>Logo Position</label><select id="wl-woollenLogoPosition"><option value="left" ${g('woollenLogoPosition')==='left'?'selected':''}>Left</option><option value="center" ${g('woollenLogoPosition')==='center'?'selected':''}>Center</option><option value="right" ${g('woollenLogoPosition')==='right'?'selected':''}>Right</option></select></div>
        <div class="form-group"><label>Footer Color</label><input type="color" id="wl-woollenFooterColor" value="${g('woollenFooterColor','#3f2434')}"/></div>
        <div class="form-group"><label>Footer Text Color</label><input type="color" id="wl-woollenFooterTextColor" value="${g('woollenFooterTextColor','#fff7fb')}"/></div>
        <div class="form-group"><label>Footer Image URL</label><input id="wl-woollenFooterImage" value="${g('woollenFooterImage','')}"/></div>
        <div class="form-group"><label>Social Icons</label><input id="wl-woollenSocialIcons" value="${g('woollenSocialIcons','instagram,whatsapp')}"/></div>
      </div>
      <div class="form-group"><label>About Section</label><textarea id="wl-woollenAbout" rows="3">${g('woollenAbout','')}</textarea></div>
      <div class="form-group"><label>Footer Content</label><textarea id="wl-woollenFooterContent" rows="2">${g('woollenFooterContent','')}</textarea></div>
      <button class="btn-primary" onclick="saveWoollenSettings()"><i class="fas fa-save"></i> Save Woollen Page</button>
    </div>

    <div class="admin-form" style="margin-bottom:2rem;">
      <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-layer-group"></i> Woollen Collections</h3>
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Icon</th><th>Theme</th><th>Products</th><th>Actions</th></tr></thead>
          <tbody>${cats.map(c => `<tr>
            <td><b>${c.name}</b><div style="font-size:.75rem;color:var(--gray);">${c.slug}</div></td>
            <td>${c.icon || 'star'}</td>
            <td>${c.theme || 'auto'}</td>
            <td>${list.filter(p=>p.category===c.slug).length}</td>
            <td><button class="btn-outline btn-sm" onclick="viewCategoryProducts('${c.slug}')">Inventory</button> <button class="btn-sm" onclick="deleteCategory('${c.id || c._id || c.slug}')" style="background:#fee2e2;color:#ef4444;border:none;padding:5px 12px;border-radius:6px;">Delete</button></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Stock</th><th>Tags</th><th>Actions</th></tr></thead>
        <tbody>${list.map(p => `<tr>
          <td><b>${p.name}</b></td>
          <td>${p.category}</td>
          <td>${formatCurrency(p.price)}</td>
          <td>${p.stock}</td>
          <td>${[
            p.popular ? 'Best Seller' : '',
            p.featured ? 'Featured' : '',
            p.trending ? 'Trending' : '',
            p.newArrival ? 'New Arrival' : '',
            p.sale ? 'Sale' : ''
          ].filter(Boolean).join(', ') || '-'}</td>
          <td><button class="btn-outline btn-sm" onclick="adminEditProduct('${p.id}')"><i class="fas fa-edit"></i></button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function adminAddWoollenProduct() {
  await adminAddProduct();
  const store = document.getElementById('p-store-type');
  if (store) store.value = 'woollen';
  refreshAdminProductCategoryOptions();
}

async function saveWoollenSettings() {
  const keys = [
    'woollenHeaderTitle','woollenHeroTitle','woollenHeroSubtitle','woollenHeroButtonText','woollenHeroBanner',
    'woollenAbout','woollenHeaderBg','woollenHeaderText','woollenHoverColor','woollenButtonColor','woollenLogoPosition',
    'woollenFooterColor','woollenFooterTextColor','woollenFooterContent','woollenFooterImage','woollenSocialIcons'
  ];
  for (const key of keys) {
    const el = document.getElementById('wl-' + key);
    if (el) await api('/api/admin/settings', { method: 'POST', body: { key, value: el.value } });
  }
  toast('Woollen page settings saved', 'success');
}

async function adminSettings() {
  // Load existing settings
  const settings = normalizeSettings(await api('/api/admin/settings'));
  
  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">⚙️ Admin Settings</h1></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;">
    <!-- Change Credentials -->
    <div class="admin-form">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;margin-bottom:1.25rem;padding-bottom:.75rem;border-bottom:1px solid var(--border);">🔐 Change Login Credentials</h3>
      <div class="form-group"><label>Current Password *</label><input type="password" id="set-cur-pass" placeholder="Enter current password"/></div>
      <div class="form-group"><label>New Email (optional)</label><input type="email" id="set-new-email" placeholder="New email address" value="${currentUser?.email||''}"/></div>
      <div class="form-group"><label>Display Name</label><input id="set-name" placeholder="Admin name" value="${currentUser?.name||''}"/></div>
      <div class="form-group"><label>New Password (optional)</label><input type="password" id="set-new-pass" placeholder="New password (min 6 chars)"/></div>
      <div class="form-group"><label>Confirm New Password</label><input type="password" id="set-conf-pass" placeholder="Confirm new password"/></div>
      <div id="set-err" style="color:#ef4444;font-size:.8rem;margin-bottom:.75rem;min-height:20px;"></div>
      <button class="btn-primary" onclick="saveAdminCredentials()"><i class="fas fa-save"></i> Save Credentials</button>
    </div>

    <!-- Administrative Tools -->
    <div>
      <div class="admin-form" style="margin-bottom:1.5rem;">
        <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;margin-bottom:1.25rem;padding-bottom:.75rem;border-bottom:1px solid var(--border);">🛠️ Administrative Tools</h3>
        <div style="background:#fee2e2;padding:1.5rem;border-radius:12px;border:1.5px solid #fca5a5;">
          <h4 style="color:#991b1b;margin-bottom:.5rem;">Clear System Data</h4>
          <p style="font-size:.8rem;color:#7f1d1d;margin-bottom:1rem;">Permanently delete Orders, Inquiries, Carts, and Wishlists. Use only to clear test data.</p>
          <button class="btn-danger" style="width:100%;font-weight:700;" onclick="clearTestData()"><i class="fas fa-trash-alt"></i> Clear All Test Data</button>
        </div>
      </div>
      
      <div class="admin-form" style="background:var(--grad-rose);color:#fff;">
        <h3 style="color:#fff;font-family:'Cormorant Garamond',serif;font-size:1.2rem;margin-bottom:1rem;">✦ Session Info</h3>
        <div style="display:flex;flex-direction:column;gap:.75rem;font-size:.875rem;">
          <div><span style="opacity:.7;">Login:</span> <b>${currentUser?.email}</b></div>
          <div><span style="opacity:.7;">Status:</span> <span style="background:#fff;color:var(--rose);padding:2px 10px;border-radius:99px;font-size:.7rem;font-weight:700;">ACTIVE ADMIN</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- SMTP Configuration Section -->
  <div style="margin-top:2rem;">
    <div class="admin-form">
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.4rem;margin-bottom:.5rem;padding-bottom:.75rem;border-bottom:1px solid var(--border);">
        <i class="fas fa-envelope" style="color:var(--rose);margin-right:.5rem;"></i>📧 SMTP Email Configuration
      </h3>
      <p style="color:var(--gray);font-size:.85rem;margin-bottom:1.5rem;">Configure SMTP settings for OTP emails, order notifications, and password resets. These settings are used by both user OTP and admin OTP systems.</p>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group">
          <label><i class="fas fa-server" style="color:var(--rose);margin-right:4px;"></i> SMTP Host</label>
          <input type="text" id="smtp-host" placeholder="smtp.gmail.com" value="${settings.smtpHost || ''}"/>
          <small style="color:var(--gray);font-size:.72rem;">Gmail: smtp.gmail.com | Outlook: smtp.office365.com</small>
        </div>
        <div class="form-group">
          <label><i class="fas fa-hashtag" style="color:var(--rose);margin-right:4px;"></i> SMTP Port</label>
          <input type="number" id="smtp-port" placeholder="465" value="${settings.smtpPort || ''}"/>
          <small style="color:var(--gray);font-size:.72rem;">SSL: 465 | TLS: 587</small>
        </div>
        <div class="form-group">
          <label><i class="fas fa-user" style="color:var(--rose);margin-right:4px;"></i> SMTP Username / Email</label>
          <input type="email" id="smtp-user" placeholder="your-email@gmail.com" value="${settings.smtpUser || ''}"/>
          <small style="color:var(--gray);font-size:.72rem;">The email address used to send OTPs</small>
        </div>
        <div class="form-group">
          <label><i class="fas fa-key" style="color:var(--rose);margin-right:4px;"></i> SMTP Password / App Password</label>
          <input type="password" id="smtp-pass" placeholder="••••••••••••••••" value="${settings.smtpPass || ''}"/>
          <small style="color:var(--gray);font-size:.72rem;">For Gmail: use App Password (not your regular password)</small>
        </div>
        <div class="form-group">
          <label><i class="fas fa-tag" style="color:var(--rose);margin-right:4px;"></i> Sender Name</label>
          <input type="text" id="smtp-sender-name" placeholder="Lencho" value="${settings.storeName || ''}"/>
          <small style="color:var(--gray);font-size:.72rem;">Name shown as email sender (e.g. "Lencho")</small>
        </div>
        <div class="form-group">
          <label><i class="fas fa-paper-plane" style="color:var(--rose);margin-right:4px;"></i> Test Email Address</label>
          <input type="email" id="smtp-test-email" placeholder="test@example.com" value="${currentUser?.email || ''}"/>
          <small style="color:var(--gray);font-size:.72rem;">Send a test email to verify configuration</small>
        </div>
      </div>

      <div id="smtp-status" style="min-height:24px;margin:1rem 0;font-size:.85rem;"></div>

      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <button class="btn-primary" onclick="saveSmtpSettings()" id="smtp-save-btn">
          <i class="fas fa-save"></i> Save SMTP Settings
        </button>
        <button class="btn-outline" onclick="testSmtpConnection()" id="smtp-test-btn">
          <i class="fas fa-paper-plane"></i> Send Test Email
        </button>
      </div>

      <div style="margin-top:1.5rem;padding:1rem;background:var(--beige);border-radius:12px;border:1px solid rgba(0,0,0,.04);">
        <h4 style="font-size:.85rem;margin-bottom:.5rem;color:var(--dark);">💡 Gmail App Password Setup</h4>
        <ol style="font-size:.78rem;color:var(--gray);line-height:1.7;margin:0;padding-left:1.2rem;">
          <li>Go to <a href="https://myaccount.google.com/security" target="_blank" style="color:var(--rose);">Google Account Security</a></li>
          <li>Enable 2-Step Verification (required)</li>
          <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" style="color:var(--rose);">App Passwords</a></li>
          <li>Create a new App Password for "Mail"</li>
          <li>Copy the 16-character password and paste it above</li>
        </ol>
      </div>
    </div>
  </div>`;
}

async function clearTestData() {
  if(!confirm('🚨 WARNING: This will delete ALL orders and inquiries. Are you absolutely sure?')) return;
  const pass = prompt('Please enter your CURRENT ADMIN PASSWORD to confirm:');
  if(!pass) return;
  const r = await api('/api/admin/clear-data', { method:'PUT', body:{ password:pass } });
  if(r.success) { toast('System data cleared successfully!', 'success'); adminDashboard(); }
  else { toast(r.error || 'Failed to clear data', 'error'); }
}

async function saveAdminCredentials() {
  const currentPassword = document.getElementById('set-cur-pass').value;
  const newEmail = document.getElementById('set-new-email').value;
  const newPassword = document.getElementById('set-new-pass').value;
  const confirm = document.getElementById('set-conf-pass').value;
  const name = document.getElementById('set-name').value;
  
  if(!currentPassword) return document.getElementById('set-err').textContent = 'Current password required';
  if(newPassword && newPassword !== confirm) return document.getElementById('set-err').textContent = 'Passwords do not match';
  
  const r = await api('/api/admin/change-credentials', { method:'PUT', body: { currentPassword, newEmail, newPassword, name } });
  if(r.error) document.getElementById('set-err').textContent = r.error;
  else { toast('Credentials updated! Please login again.', 'success'); handleLogout(); }
}

async function saveSmtpSettings() {
  const btn = document.getElementById('smtp-save-btn');
  const status = document.getElementById('smtp-status');
  
  const host = document.getElementById('smtp-host')?.value?.trim();
  const port = document.getElementById('smtp-port')?.value?.trim();
  const user = document.getElementById('smtp-user')?.value?.trim();
  const pass = document.getElementById('smtp-pass')?.value?.trim();
  const senderName = document.getElementById('smtp-sender-name')?.value?.trim();

  if (!host || !user || !pass) {
    status.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Please fill Host, Username, and Password fields.</span>';
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Saving...'; }
  status.innerHTML = '<span style="color:var(--gray);"><i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Saving SMTP settings...</span>';

  const r = await api('/api/admin/settings', {
    method: 'PUT',
    body: {
      smtpHost: host,
      smtpPort: Number(port) || 465,
      smtpUser: user,
      smtpPass: pass,
      storeName: senderName || 'Lencho'
    }
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save SMTP Settings'; }

  if (r.error) {
    status.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> Error: ${r.error}</span>`;
    toast('Failed to save SMTP settings', 'error');
  } else {
    status.innerHTML = '<span style="color:#22c55e;"><i class="fas fa-check-circle"></i> SMTP settings saved successfully!</span>';
    toast('SMTP settings saved! ✦', 'success');
  }
}

async function testSmtpConnection() {
  const btn = document.getElementById('smtp-test-btn');
  const status = document.getElementById('smtp-status');
  const testEmail = document.getElementById('smtp-test-email')?.value?.trim();

  if (!testEmail) {
    status.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Please enter a test email address.</span>';
    return;
  }

  // Save settings first before testing
  const host = document.getElementById('smtp-host')?.value?.trim();
  const user = document.getElementById('smtp-user')?.value?.trim();
  const pass = document.getElementById('smtp-pass')?.value?.trim();
  
  if (!host || !user || !pass) {
    status.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Please save SMTP settings first before testing.</span>';
    return;
  }

  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Sending test email...'; }
  status.innerHTML = '<span style="color:var(--gray);"><i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Sending test email... This may take a few seconds.</span>';

  const r = await api('/api/admin/test-smtp', {
    method: 'POST',
    body: { testEmail },
    timeoutMs: 45000
  });

  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Test Email'; }

  if (r.error) {
    status.innerHTML = `<span style="color:#ef4444;"><i class="fas fa-times-circle"></i> Test failed: ${r.error}</span>`;
    toast('SMTP test failed: ' + r.error, 'error');
  } else {
    status.innerHTML = `<span style="color:#22c55e;"><i class="fas fa-check-circle"></i> ✅ Test email sent successfully to ${testEmail}! Check your inbox.</span>`;
    toast('Test email sent successfully! Check your inbox.', 'success');
  }
}

function normalizeSettings(settings) {
  if (Array.isArray(settings)) {
    const normalized = {};
    settings.forEach(item => {
      if (item && item.key !== undefined) normalized[item.key] = item.value;
    });
    return normalized;
  }
  return settings && typeof settings === 'object' ? settings : {};
}


async function adminDiscounts() {
  const items = await api('/api/admin/discounts');
  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">Claimed Coupons (${items.length})</h1></div>
  <div class="admin-table-wrap">
    <table>
      <thead><tr><th>Email Address</th><th>Coupon Code</th><th>Claimed At</th></tr></thead>
      <tbody>${items.map(i=>`
      <tr>
        <td><b>${i.email}</b></td>
        <td><span style="background:var(--rose-light);color:var(--rose-dark);padding:4px 8px;border-radius:6px;font-weight:bold;font-size:12px;">${i.code}</span></td>
        <td>${formatDate(i.createdAt)}</td>
      </tr>`).join('')}
      ${!items.length ? '<tr><td colspan="3" style="text-align:center;color:var(--gray);">No coupons claimed yet.</td></tr>' : ''}
      </tbody>
    </table>
  </div>`;
}

// ── TESTIMONIALS MANAGEMENT ─────────────────────────────────
function adminEscapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminEscapeAttr(value = '') {
  return adminEscapeHtml(value).replace(/`/g, '&#96;');
}

function adminDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function legalPageStarterTemplate(slug = '') {
  const templates = {
    privacy: `Privacy Policy\n\nBusiness legal name:\nWebsite:\nContact email:\nPhone:\nAddress:\n\n1. Information we collect\nName, email, phone number, shipping address, billing details, order details, device/browser information, and payment status.\n\n2. How we use information\nTo process orders, deliver products, provide customer support, send offers only with consent, prevent fraud, and improve the website.\n\n3. Payments\nPayments are processed by secure payment partners. We do not store card, UPI PIN, or netbanking passwords.\n\n4. Marketing consent\nCustomers can unsubscribe from promotional emails anytime using the unsubscribe link.\n\n5. Contact\nFor privacy requests, contact:`,
    terms: `Terms and Conditions\n\nBusiness legal name:\nWebsite:\nContact email:\nPhone:\nAddress:\n\n1. Product information\nProduct images, prices, taxes, delivery charges, and availability are shown on the website and may change without prior notice.\n\n2. Orders\nOrders are confirmed after successful payment or accepted COD request. We may cancel orders if stock, payment, address, or fraud checks fail.\n\n3. Pricing and taxes\nAll product prices, taxes, shipping charges, and discounts will be shown before checkout.\n\n4. Customer responsibilities\nCustomers must provide correct contact and delivery details.\n\n5. Contact`,
    shipping: `Shipping Policy\n\nBusiness legal name:\nSupport email:\nSupport phone:\nPickup/dispatch location:\n\n1. Shipping locations\nWe ship to serviceable pin codes in India.\n\n2. Dispatch timeline\nOrders are usually dispatched within __ business days.\n\n3. Delivery timeline\nEstimated delivery is __ to __ business days after dispatch depending on location.\n\n4. Shipping charges\nShipping charges/free shipping threshold are shown at checkout.\n\n5. Tracking\nTracking details will be shared after shipment is created.`,
    returns: `Return and Refund Policy\n\nBusiness legal name:\nSupport email:\nSupport phone:\n\n1. Return window\nCustomers can request return/replacement within __ days of delivery for eligible products.\n\n2. Eligibility\nProduct must be unused, unwashed, undamaged, and with original packaging.\n\n3. Non-returnable items\nMention hygiene/customized/sale items if applicable.\n\n4. Refund timeline\nRefunds are processed within __ business days after return approval/quality check.\n\n5. Refund method\nRefund is issued to original payment method or store credit, as applicable.`,
    cancellation: `Cancellation Policy\n\nBusiness legal name:\nSupport email:\nSupport phone:\n\n1. Before dispatch\nOrders can be cancelled before dispatch by contacting support.\n\n2. After dispatch\nAfter dispatch, cancellation may not be possible. Customer may follow return policy after delivery if eligible.\n\n3. COD cancellation\nRepeated fake COD orders may be restricted.\n\n4. Refund timeline\nPrepaid cancellation refunds are processed within __ business days.`,
    'contact-details': `Contact Us\n\nBusiness legal name:\nEmail:\nPhone:\nWhatsApp:\nRegistered/business address:\nCustomer support hours:\n\nFor product/order support, customers can contact us using the above details.`,
    grievance: `Grievance Officer\n\nBusiness legal name:\nGrievance officer name:\nEmail:\nPhone:\nAddress:\nWorking hours:\n\nCustomers can contact the grievance officer for unresolved complaints. We aim to acknowledge complaints within __ hours and resolve them within __ days.`,
    'payment-policy': `Payment, COD and Refund Timeline\n\nBusiness legal name:\nSupport email:\n\n1. Payment methods\nWe accept prepaid payments through available payment partners and COD where enabled.\n\n2. COD\nCOD availability depends on pin code, order value, and internal checks.\n\n3. Failed payments\nIf money is deducted but order is not confirmed, contact support with payment reference.\n\n4. Refund timeline\nApproved refunds are usually processed within __ business days. Bank/payment partner timelines may apply.`,
    'size-guide': `Size Guide\n\nBusiness legal name:\nSupport email:\n\n1. Jewellery sizing\nAdd ring, toe ring, bracelet, bangle, chain, necklace, and anklet sizing guidance here.\n\n2. Adjustable products\nMention which products are adjustable and how customers should fit them safely.\n\n3. Measurement help\nExplain how customers can measure at home and contact support before ordering.\n\n4. Fit note\nProduct fit may vary slightly by design, material, and handmade finishing.`,
    disclaimer: `Disclaimer\n\nThe information on this website is provided in good faith for general shopping and product information. Product colors may vary slightly due to screen settings and photography lighting. Handmade products may have minor natural variations.`
  };
  return templates[slug] || '';
}

async function adminLegalPages(selectedSlug = 'privacy') {
  const [res, settingsRaw] = await Promise.all([
    api('/api/admin/legal-pages', { timeoutMs: 12000 }),
    api('/api/settings', { timeoutMs: 12000 })
  ]);
  const settings = normalizeSettings(settingsRaw);
  const settingValue = (key, fallback = '') => settings[key] ?? fallback;
  const fallbackPages = [
    { slug: 'terms', title: 'Terms and Conditions' },
    { slug: 'privacy', title: 'Privacy Policy' },
    { slug: 'shipping', title: 'Shipping Policy' },
    { slug: 'returns', title: 'Return and Refund Policy' },
    { slug: 'cancellation', title: 'Cancellation Policy' },
    { slug: 'contact-details', title: 'Contact Us' },
    { slug: 'grievance', title: 'Grievance Officer' },
    { slug: 'payment-policy', title: 'Payment, COD and Refund Timeline' },
    { slug: 'size-guide', title: 'Size Guide' },
    { slug: 'disclaimer', title: 'Disclaimer' }
  ];
  const pages = Array.isArray(res.pages) && res.pages.length ? res.pages : fallbackPages;
  const selected = pages.find(page => page.slug === selectedSlug) || pages[0];

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header" style="align-items:flex-start;gap:1rem;">
      <div>
        <h1 class="admin-page-title">Legal Pages</h1>
        <p style="color:var(--gray);margin-top:4px;">Add your real policies here. Footer links and public pages update from this CMS.</p>
      </div>
      <button class="btn-outline" onclick="navigate('/${adminEscapeAttr(selected.slug)}')"><i class="fas fa-eye"></i> View Current Page</button>
    </div>

    <div class="admin-form" style="margin-bottom:1rem;">
      <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-building"></i> Business Legal Details</h3>
      <div class="form-grid">
        <div class="form-group"><label>Business Legal Name</label><input id="legalBusinessName" value="${adminEscapeAttr(settingValue('legalBusinessName', settingValue('storeName', 'Lencho')))}" placeholder="Your legal business name"/></div>
        <div class="form-group"><label>Support Email</label><input id="legalSupportEmail" value="${adminEscapeAttr(settingValue('legalSupportEmail', settingValue('footerEmail', settingValue('storeEmail'))))}" placeholder="support@example.com"/></div>
        <div class="form-group"><label>Support Phone</label><input id="legalSupportPhone" value="${adminEscapeAttr(settingValue('legalSupportPhone', settingValue('footerPhone', settingValue('storePhone'))))}" placeholder="+91 ..."/></div>
        <div class="form-group"><label>Grievance Officer Name</label><input id="grievanceOfficerName" value="${adminEscapeAttr(settingValue('grievanceOfficerName'))}" placeholder="Name"/></div>
        <div class="form-group"><label>Grievance Officer Email</label><input id="grievanceOfficerEmail" value="${adminEscapeAttr(settingValue('grievanceOfficerEmail', settingValue('legalSupportEmail', settingValue('storeEmail'))))}" placeholder="grievance@example.com"/></div>
        <div class="form-group"><label>Refund Timeline</label><input id="refundTimeline" value="${adminEscapeAttr(settingValue('refundTimeline'))}" placeholder="Example: 5-7 business days after approval"/></div>
      </div>
      <div class="form-group"><label>Business Address</label><textarea id="legalBusinessAddress" rows="2" placeholder="Full business address">${adminEscapeHtml(settingValue('legalBusinessAddress', settingValue('footerAddress', settingValue('storeAddress'))))}</textarea></div>
      <button class="btn-primary" onclick="saveLegalBusinessDetails()"><i class="fas fa-save"></i> Save Business Details</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;align-items:start;">
      <div class="admin-form" style="padding:1rem;">
        <h3 style="font-size:1rem;margin-bottom:.8rem;color:var(--rose-dark);">Pages</h3>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${pages.map(page => `
            <button class="${page.slug === selected.slug ? 'btn-primary' : 'btn-outline'}" style="justify-content:flex-start;text-align:left;padding:.75rem .85rem;" onclick="adminLegalPages('${adminEscapeAttr(page.slug)}')">
              ${adminEscapeHtml(page.title)}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="admin-form">
        <input type="hidden" id="legal-page-slug" value="${adminEscapeAttr(selected.slug)}"/>
        <div class="form-grid">
          <div class="form-group">
            <label>Page</label>
            <select onchange="adminLegalPages(this.value)">
              ${pages.map(page => `<option value="${adminEscapeAttr(page.slug)}" ${page.slug === selected.slug ? 'selected' : ''}>${adminEscapeHtml(page.title)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Public URL</label>
            <input value="/${adminEscapeAttr(selected.slug)}" readonly/>
          </div>
        </div>
        <div class="form-group">
          <label>${adminEscapeHtml(selected.title)} Content</label>
          <textarea id="legal-page-content" rows="18" placeholder="Paste or write your legal page content here...">${adminEscapeHtml(selected.content || '')}</textarea>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Upload PDF / file</label>
            <input type="file" id="legal-page-file" accept=".pdf,.doc,.docx,.txt,image/*,application/pdf"/>
          </div>
          <div class="form-group">
            <label>Quick actions</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn-outline" type="button" onclick="uploadLegalPageFile()"><i class="fas fa-upload"></i> Upload & Insert Link</button>
              <button class="btn-outline" type="button" onclick="insertLegalPageTemplate('${adminEscapeAttr(selected.slug)}')"><i class="fas fa-magic"></i> Insert Starter Template</button>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:1rem;">
          <button class="btn-primary" onclick="saveLegalPage()"><i class="fas fa-save"></i> Save Legal Page</button>
          <button class="btn-outline" onclick="navigate('/${adminEscapeAttr(selected.slug)}')"><i class="fas fa-external-link-alt"></i> View Live</button>
        </div>
      </div>
    </div>`;
}

function insertLegalPageTemplate(slug) {
  const textarea = document.getElementById('legal-page-content');
  if (!textarea) return;
  if (textarea.value.trim() && !confirm('Replace current text with the starter template?')) return;
  textarea.value = legalPageStarterTemplate(slug);
}

async function uploadLegalPageFile() {
  const fileInput = document.getElementById('legal-page-file');
  const textarea = document.getElementById('legal-page-content');
  if (!fileInput?.files?.[0] || !textarea) return toast('Please select a file first', 'error');

  const fd = new FormData();
  fd.append('media', fileInput.files[0]);
  fd.append('folder', 'legal');

  const resp = await fetch('/api/admin/upload-media', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminAuthHeaders(),
    body: fd
  });
  const raw = await resp.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { return toast('Upload API returned invalid response', 'error'); }
  if (!resp.ok || data.error || !data.url) return toast(data.error || 'Upload failed', 'error');

  textarea.value = `${textarea.value.trim()}\n\nDownload file: ${data.url}`;
  toast('File link inserted. Save page to publish it.', 'success');
}

async function saveLegalPage() {
  const slug = document.getElementById('legal-page-slug')?.value;
  const content = document.getElementById('legal-page-content')?.value ?? '';
  if (!slug) return toast('Select a page first', 'error');
  const r = await api(`/api/admin/cms/${slug}`, { method: 'POST', body: { content }, timeoutMs: 15000 });
  if (r.error) return toast(r.error, 'error');
  toast('Legal page saved and published', 'success');
  adminLegalPages(slug);
}

async function saveLegalBusinessDetails() {
  const payload = {};
  ['legalBusinessName', 'legalSupportEmail', 'legalSupportPhone', 'grievanceOfficerName', 'grievanceOfficerEmail', 'refundTimeline', 'legalBusinessAddress'].forEach(key => {
    const el = document.getElementById(key);
    if (el) payload[key] = el.value;
  });
  if (payload.legalSupportEmail !== undefined) payload.footerEmail = payload.legalSupportEmail;
  if (payload.legalSupportPhone !== undefined) payload.footerPhone = payload.legalSupportPhone;
  if (payload.legalBusinessAddress !== undefined) payload.footerAddress = payload.legalBusinessAddress;
  const r = await api('/api/admin/settings', { method: 'POST', body: payload, timeoutMs: 15000 });
  if (r.error) return toast(r.error, 'error');
  toast('Business legal details saved', 'success');
}

async function adminMarketingHub() {
  const [subRes, campRes] = await Promise.all([
    api('/api/admin/marketing/subscribers', { timeoutMs: 15000 }),
    api('/api/admin/marketing/campaigns', { timeoutMs: 15000 })
  ]);
  const subscribers = Array.isArray(subRes.subscribers) ? subRes.subscribers : [];
  const stats = subRes.stats || {
    total: subscribers.length,
    subscribed: subscribers.filter(s => s.status === 'subscribed').length,
    unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
    popup: subscribers.filter(s => String(s.source || '').includes('popup')).length
  };
  const campaigns = Array.isArray(campRes.campaigns) ? campRes.campaigns : [];

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header" style="align-items:flex-start;gap:1rem;">
      <div>
        <h1 class="admin-page-title">Marketing Hub</h1>
        <p style="color:var(--gray);margin-top:4px;">Popup emails, campaign sending, unsubscribe safety, and send logs.</p>
      </div>
      <button class="btn-outline" onclick="adminMarketingHub()"><i class="fas fa-sync"></i> Refresh</button>
    </div>

    <div class="stats-grid" style="margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-label">Total Subscribers</div><div class="stat-value">${Number(stats.total || 0).toLocaleString('en-IN')}</div></div>
      <div class="stat-card"><div class="stat-label">Subscribed</div><div class="stat-value">${Number(stats.subscribed || 0).toLocaleString('en-IN')}</div></div>
      <div class="stat-card"><div class="stat-label">Unsubscribed</div><div class="stat-value">${Number(stats.unsubscribed || 0).toLocaleString('en-IN')}</div></div>
      <div class="stat-card"><div class="stat-label">Popup Source</div><div class="stat-value">${Number(stats.popup || 0).toLocaleString('en-IN')}</div></div>
    </div>

    <div class="admin-form" style="margin-bottom:1.5rem;">
      <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-envelope-open-text"></i> Create Campaign</h3>
      <div class="form-grid">
        <div class="form-group"><label>Subject *</label><input id="mkt-subject" placeholder="Flat 20% off today only"/></div>
        <div class="form-group"><label>Preview Text</label><input id="mkt-preview" placeholder="Short inbox preview line"/></div>
      </div>
      <div class="form-group"><label>Message *</label><textarea id="mkt-body" rows="6" placeholder="Write your offer/reminder message..."></textarea></div>
      <div class="form-grid">
        <div class="form-group"><label>Offer Code</label><input id="mkt-offer" placeholder="WELCOME10"/></div>
        <div class="form-group"><label>Segment</label><select id="mkt-segment"><option value="subscribed">Subscribed users</option><option value="discount_popup">Discount popup users</option><option value="popup">All popup users</option><option value="all">All subscribed statuses except unsubscribed</option></select></div>
        <div class="form-group"><label>CTA Text</label><input id="mkt-cta-text" placeholder="Shop Now"/></div>
        <div class="form-group"><label>CTA URL</label><input id="mkt-cta-url" placeholder="https://lencho.in/products"/></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Image URL</label><input id="mkt-image" placeholder="https://..."/></div>
        <div class="form-group"><label>Upload Campaign Image</label><input type="file" id="mkt-image-file" accept="image/*"/></div>
      </div>
      <button class="btn-outline" type="button" onclick="uploadCmsMedia('mkt-image-file','mkt-image')"><i class="fas fa-upload"></i> Upload Image</button>
      <div class="form-grid" style="margin-top:1rem;">
        <div class="form-group"><label>Test Email</label><input id="mkt-test-email" placeholder="you@example.com"/></div>
        <div class="form-group"><label>Schedule Date/Time</label><input id="mkt-scheduled-at" type="datetime-local"/></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:1rem;">
        <button class="btn-outline" onclick="submitMarketingCampaign('draft')"><i class="fas fa-save"></i> Save Draft</button>
        <button class="btn-outline" onclick="submitMarketingCampaign('test')"><i class="fas fa-paper-plane"></i> Send Test Email</button>
        <button class="btn-outline" onclick="submitMarketingCampaign('schedule')"><i class="fas fa-clock"></i> Schedule Reminder</button>
        <button class="btn-primary" onclick="submitMarketingCampaign('send')"><i class="fas fa-bullhorn"></i> Send to Segment</button>
      </div>
    </div>

    <div class="admin-table-wrap" style="margin-bottom:1.5rem;">
      <div class="admin-table-header"><h3>Subscribers (${subscribers.length})</h3></div>
      <table>
        <thead><tr><th>Email</th><th>Source</th><th>Status</th><th>Consent Date</th><th>Last Sent</th><th>Action</th></tr></thead>
        <tbody>${subscribers.slice(0, 300).map(sub => `
          <tr>
            <td><b>${adminEscapeHtml(sub.email)}</b></td>
            <td>${adminEscapeHtml(sub.source || '-')}</td>
            <td><span style="padding:4px 9px;border-radius:99px;font-size:.72rem;font-weight:700;background:${sub.status === 'subscribed' ? '#dcfce7' : '#fee2e2'};color:${sub.status === 'subscribed' ? '#166534' : '#991b1b'};">${adminEscapeHtml(sub.status)}</span></td>
            <td>${adminDateTime(sub.consentAt || sub.createdAt)}</td>
            <td>${adminDateTime(sub.lastSentAt)}</td>
            <td>${sub.status === 'subscribed'
              ? `<button class="btn-sm btn-outline" onclick="toggleMarketingSubscriberStatus('${adminEscapeAttr(sub.email)}','unsubscribed')">Unsubscribe</button>`
              : `<button class="btn-sm btn-outline" onclick="toggleMarketingSubscriberStatus('${adminEscapeAttr(sub.email)}','subscribed')">Resubscribe</button>`}</td>
          </tr>
        `).join('')}
        ${!subscribers.length ? '<tr><td colspan="6" style="text-align:center;color:var(--gray);">No subscribers yet. Popup signups will appear here.</td></tr>' : ''}
        </tbody>
      </table>
    </div>

    <div class="admin-table-wrap">
      <div class="admin-table-header"><h3>Campaigns (${campaigns.length})</h3></div>
      <table>
        <thead><tr><th>Subject</th><th>Status</th><th>Segment</th><th>Sent</th><th>Failed</th><th>Created</th><th>Logs</th></tr></thead>
        <tbody>${campaigns.map(c => `
          <tr>
            <td><b>${adminEscapeHtml(c.subject)}</b><div style="font-size:.72rem;color:var(--gray);max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${adminEscapeHtml(c.previewText || c.body || '')}</div></td>
            <td>${adminEscapeHtml(c.status)}</td>
            <td>${adminEscapeHtml(c.segment)}</td>
            <td>${Number(c.sentCount || 0).toLocaleString('en-IN')}</td>
            <td>${Number(c.failedCount || 0).toLocaleString('en-IN')}</td>
            <td>${adminDateTime(c.createdAt)}</td>
            <td><button class="btn-sm btn-outline" onclick="viewMarketingCampaignLogs('${adminEscapeAttr(c.id)}')">View Logs</button></td>
          </tr>
        `).join('')}
        ${!campaigns.length ? '<tr><td colspan="7" style="text-align:center;color:var(--gray);">No campaigns yet.</td></tr>' : ''}
        </tbody>
      </table>
    </div>`;
}

function collectMarketingCampaignPayload(action) {
  return {
    action,
    subject: document.getElementById('mkt-subject')?.value || '',
    previewText: document.getElementById('mkt-preview')?.value || '',
    body: document.getElementById('mkt-body')?.value || '',
    offerCode: document.getElementById('mkt-offer')?.value || '',
    imageUrl: document.getElementById('mkt-image')?.value || '',
    ctaText: document.getElementById('mkt-cta-text')?.value || '',
    ctaUrl: document.getElementById('mkt-cta-url')?.value || '',
    segment: document.getElementById('mkt-segment')?.value || 'subscribed',
    testEmail: document.getElementById('mkt-test-email')?.value || '',
    scheduledAt: document.getElementById('mkt-scheduled-at')?.value || ''
  };
}

async function submitMarketingCampaign(action) {
  const payload = collectMarketingCampaignPayload(action);
  if (!payload.subject.trim()) return toast('Subject is required', 'error');
  if (!payload.body.trim()) return toast('Message is required', 'error');
  if (action === 'test' && !payload.testEmail.trim()) return toast('Test email is required', 'error');
  if (action === 'schedule' && !payload.scheduledAt) return toast('Schedule date/time is required', 'error');
  if (action === 'send' && !confirm('Send this campaign to the selected subscribed segment now?')) return;

  const r = await api('/api/admin/marketing/campaigns', { method: 'POST', body: payload, timeoutMs: 120000 });
  if (r.error) return toast(r.error, 'error');
  toast(r.message || 'Marketing action completed', 'success');
  if (action !== 'test') setTimeout(adminMarketingHub, 600);
}

async function toggleMarketingSubscriberStatus(email, status) {
  const r = await api(`/api/admin/marketing/subscribers/${encodeURIComponent(email)}/status`, { method: 'PATCH', body: { status }, timeoutMs: 15000 });
  if (r.error) return toast(r.error, 'error');
  toast('Subscriber status updated', 'success');
  adminMarketingHub();
}

async function viewMarketingCampaignLogs(campaignId) {
  const r = await api(`/api/admin/marketing/campaigns/${campaignId}/logs`, { timeoutMs: 15000 });
  if (r.error) return toast(r.error, 'error');
  const logs = Array.isArray(r.logs) ? r.logs : [];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="max-width:860px;width:92vw;max-height:82vh;overflow:auto;padding:1.5rem;">
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:center;margin-bottom:1rem;">
        <h3>Email Logs</h3>
        <button class="btn-outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
      <div class="admin-table-wrap">
        <table>
          <thead><tr><th>Email</th><th>Status</th><th>Error</th><th>Time</th></tr></thead>
          <tbody>${logs.map(log => `
            <tr>
              <td>${adminEscapeHtml(log.email)}</td>
              <td>${adminEscapeHtml(log.status)}</td>
              <td style="max-width:360px;font-size:.78rem;color:#991b1b;">${adminEscapeHtml(log.error || '')}</td>
              <td>${adminDateTime(log.sentAt || log.createdAt)}</td>
            </tr>
          `).join('')}
          ${!logs.length ? '<tr><td colspan="4" style="text-align:center;color:var(--gray);">No logs yet.</td></tr>' : ''}
          </tbody>
        </table>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function adminTestimonials() {
  const settings = normalizeSettings(await api('/api/settings'));
  const showTestimonials = settings.showTestimonials !== false; // defaults to true
  
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
      <h1 class="admin-page-title">Manage Testimonials</h1>
      <div style="display:flex;gap:1.5rem;align-items:center;">
        <label class="switch" style="display:flex;align-items:center;gap:10px;cursor:pointer;">
          <span style="font-size:0.9rem;font-weight:600;">Show on Website:</span>
          <input type="checkbox" id="toggle-testi-vis" ${showTestimonials ? 'checked' : ''} onchange="toggleTestimonialVisibility(this.checked)" style="width:18px;height:18px;cursor:pointer;">
        </label>
        <button class="btn-primary" onclick="showAddTestimonial()">+ Add Review</button>
      </div>
    </div>
    <div id="testi-list-container" class="admin-table-wrap">Loading...</div>
  `;
  const t = await api('/api/admin/testimonials');
  const grid = document.getElementById('testi-list-container');
  grid.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>City</th><th>Rating</th><th>Comment</th><th>Actions</th></tr></thead>
      <tbody>${t.map(item => `
        <tr>
          <td><b>${item.name}</b></td>
          <td>${item.city}</td>
          <td>${item.rating} ⭐</td>
          <td style="max-width:300px; font-size:.8rem;">${item.comment}</td>
          <td><button class="btn-danger btn-sm" onclick="deleteTestimonial('${item._id}')" style="background:#fee2e2;color:#ef4444;border:none;padding:5px 10px;border-radius:4px;"><i class="fas fa-trash"></i></button></td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

async function toggleTestimonialVisibility(state) {
  const r = await api('/api/admin/settings', { method: 'POST', body: { showTestimonials: state } });
  if (r.success) {
    toast('Visibility updated!', 'success');
  } else {
    toast(r.error || 'Failed to update visibility', 'error');
  }
}

function showAddTestimonial() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card" style="padding:2rem;">
      <h3>Add Customer Reference</h3>
      <div class="form-group"><label>Customer Name</label><input id="nt-name" placeholder="e.g. Priya Sharma"/></div>
      <div class="form-group"><label>City</label><input id="nt-city" placeholder="e.g. Mumbai"/></div>
      <div class="form-group"><label>Rating</label><select id="nt-rating"><option value="5">5 Stars</option><option value="4">4 Stars</option></select></div>
      <div class="form-group"><label>Comment</label><textarea id="nt-comment" rows="3"></textarea></div>
      <div style="display:flex;gap:1rem;">
        <button class="btn-primary" onclick="saveTestimonial()">Add Testimonial</button>
        <button class="btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveTestimonial() {
  const body = {
    name: document.getElementById('nt-name').value,
    city: document.getElementById('nt-city').value,
    rating: document.getElementById('nt-rating').value,
    comment: document.getElementById('nt-comment').value
  };
  const r = await api('/api/admin/testimonials', { method: 'POST', body });
  if (r.error) { toast(r.error, 'error'); return; }
  toast('Reference added! ✦', 'success');
  document.querySelector('.modal-overlay').remove();
  adminTestimonials();
}

async function deleteTestimonial(id) {
  if (!confirm('Delete this testimonial?')) return;
  await api('/api/admin/testimonials/' + id, { method: 'DELETE' });
  adminTestimonials();
}

// ── COLLECTIONS (A-Z) ────────────────────────────────────────
async function adminCollections() {
  const cats = await api('/api/categories');
  const products = await api('/api/products');
  
  // Calculate counts
  const counts = products.reduce((acc, p) => { 
    acc[p.category] = (acc[p.category] || 0) + 1; 
    return acc; 
  }, {});

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header">
      <h1 class="admin-page-title">Product Collections (${cats.length})</h1>
      <button class="btn-primary" onclick="showAddCategory()"><i class="fas fa-plus"></i> New Collection</button>
    </div>
    
    <div class="stats-grid" style="margin-bottom:2rem;">
      <div class="stat-card"><div class="stat-label">Total Categories</div><div class="stat-value">${cats.length}</div></div>
      <div class="stat-card"><div class="stat-label">Active Slugs</div><div class="stat-value">${cats.filter(c=>c.slug).length}</div></div>
    </div>

    <div class="admin-table-wrap">
      <table>
        <thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>Product Count</th><th>Actions</th></tr></thead>
        <tbody>${cats.map(c => `
          <tr>
            <td><img src="${c.image || ''}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:#f0f0f0;"/></td>
            <td>${c.name}</td>
            <td><code>${c.slug}</code></td>
            <td><span style="background:var(--rose-light);color:var(--rose-dark);padding:4px 8px;border-radius:6px;font-weight:600;">${counts[c.slug] || 0}</span></td>
            <td>
              <button class="btn-sm btn-outline" onclick="viewCategoryProducts('${c.slug}')"><i class="fas fa-boxes"></i> Inventory</button>
              <button class="btn-sm" onclick="deleteCategory('${c._id}')" style="background:#fee2e2;color:#ef4444;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;"><i class="fas fa-trash"></i></button>
            </td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>

    <div id="category-inventory" style="margin-top:3rem;display:none;">
      <div class="admin-header">
        <h2 id="inv-title" class="admin-page-title">Inventory: <span>All Products</span></h2>
        <button class="btn-outline" onclick="document.getElementById('category-inventory').style.display='none'">Close</button>
      </div>
      <div class="admin-table-wrap">
        <table id="inv-table">
          <thead><tr><th>Product</th><th>Original Price</th><th>Stock Status</th><th>Action</th></tr></thead>
          <tbody id="inv-body"></tbody>
        </table>
      </div>
    </div>
  `;
}

async function viewCategoryProducts(slug) {
  const products = await api('/api/products?category=' + slug);
  const container = document.getElementById('category-inventory');
  const body = document.getElementById('inv-body');
  const title = document.querySelector('#inv-title span');
  
  title.innerText = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'All Products';
  body.innerHTML = products.map(p => {
    let statusClass = 'status-instock';
    let statusText = 'IN STOCK';
    if(p.stock <= 0) { statusClass = 'status-outofstock'; statusText = 'OUT OF STOCK'; }
    else if(p.stock < 5) { statusClass = 'status-fewstock'; statusText = 'FEW STOCK ('+p.stock+')'; }
    
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:15px;">
            <img src="${safeImageUrl(p.image, p.category)}" ${imageFallbackAttr(p.category,p.image)} style="width:40px;height:40px;border-radius:8px;object-fit:cover;"/>
            <div style="font-weight:600;">${p.name}</div>
          </div>
        </td>
        <td>${formatCurrency(p.price)}</td>
        <td><span class="stock-badge ${statusClass}">${statusText}</span></td>
        <td><button class="btn-sm" onclick="adminEditProduct('${p.id}')"><i class="fas fa-edit"></i> Edit</button></td>
      </tr>
    `;
  }).join('');
  
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });
}

async function showAddCategory(storeType = 'main') {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Add New ${storeType === 'woollen' ? 'Woollen ' : ''}Collection</h3>
      <div class="form-group"><label>Name (e.g. Earrings)</label><input id="nc-name" placeholder="Name"/></div>
      <div class="form-group"><label>Image URL</label><input id="nc-image" placeholder="Image URL"/></div>
      <div class="form-group"><label>Banner Image URL</label><input id="nc-banner" placeholder="Banner image URL"/></div>
      <div class="form-group"><label>Upload Collection Image</label><input type="file" id="nc-file" accept="image/*"/></div>
      <button class="btn-outline" type="button" onclick="uploadCmsMedia('nc-file','nc-image')"><i class="fas fa-upload"></i> Upload Image</button>
      <div class="form-grid" style="margin-top:1rem;">
        <div class="form-group"><label>Icon</label><select id="nc-icon">${['ribbon','flower','butterfly','yarn','star','baby','diamond','heart','gift','sparkles','home','snowflake'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
        <div class="form-group"><label>Theme</label><select id="nc-theme">${['pastel-pink','lavender','mint','cream','peach','baby-blue','light-yellow','rose-gold','soft-purple','sage'].map(v=>`<option value="${v}">${v}</option>`).join('')}</select></div>
      </div>
      <input type="hidden" id="nc-store-type" value="${storeType}"/>
      <div class="form-group"><label>Description</label><textarea id="nc-desc" rows="2"></textarea></div>
      <div style="display:flex;gap:1rem;">
        <button class="btn-primary" onclick="saveCategory()">Create Collection</button>
        <button class="btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveCategory() {
  const body = {
    name: document.getElementById('nc-name').value,
    image: document.getElementById('nc-image').value,
    bannerImage: document.getElementById('nc-banner').value,
    icon: document.getElementById('nc-icon')?.value || 'star',
    theme: document.getElementById('nc-theme')?.value || '',
    storeType: document.getElementById('nc-store-type')?.value || 'main',
    description: document.getElementById('nc-desc').value
  };
  const r = await api('/api/admin/categories', { method: 'POST', body });
  if (r.error) { toast(r.error, 'error'); return; }
  toast('Collection Added! ✦', 'success');
  document.querySelector('.modal-overlay').remove();
  if (body.storeType === 'woollen') adminWoollen();
  else adminCollections();
}

async function deleteCategory(id) {
  if (!confirm('Delete this collection?')) return;
  await api('/api/admin/categories/' + id, { method: 'DELETE' });
  adminCollections();
}

// ── SECURITY SETTINGS ────────────────────────────────────────
async function adminSecuritySettings() {
  const u = currentUser;
  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header"><h1 class="admin-page-title">Lock & Security Settings</h1></div>
    <div class="admin-form" style="max-width:600px;">
      <div class="form-group"><label>Full Name</label><input id="sec-name" value="${u.name}"/></div>
      <div class="form-group"><label>Email Address</label><input id="sec-email" value="${u.email}"/></div>
      <div class="form-group"><label>Phone Number</label><input id="sec-phone" value="${u.phone||''}"/></div>
      <div class="form-group"><label>Security Question: Birthplace</label><input id="sec-answer" value="${u.securityAnswer||''}" placeholder="Your answer"/></div>
      <div class="form-group"><label>New Password (Optional)</label><input id="sec-pass" type="password" placeholder="Leave blank to keep current"/></div>
      <button class="btn-primary" onclick="saveSecuritySettings()"><i class="fas fa-save"></i> Update Credentials</button>
    </div>
  `;
}

async function saveSecuritySettings() {
  const body = {
    name: document.getElementById('sec-name').value,
    email: document.getElementById('sec-email').value,
    phone: document.getElementById('sec-phone').value,
    securityAnswer: document.getElementById('sec-answer').value
  };
  const pass = document.getElementById('sec-pass').value;
  if (pass) body.password = pass;

  const r = await api('/api/profile', { method: 'PUT', body });
  if (r.error) { toast(r.error, 'error'); return; }
  currentUser = r.user;
  toast('Admin credentials saved successfully! ✦', 'success');
}

function showRecovery() {
  document.getElementById('app').innerHTML = `
  <div style="min-height:100vh;background:var(--dark);display:flex;align-items:center;justify-content:center;padding:2rem;">
    <div style="background:#fff;border-radius:24px;padding:2.5rem;max-width:400px;width:100%;">
      <h2 style="font-family:'Cormorant Garamond',serif;margin-bottom:1rem;">Account Recovery</h2>
      <div class="form-group"><label>Registered Email</label><input id="rec-email" type="email"/></div>
      <div class="form-group"><label>Security Question: Birthplace</label><input id="rec-answer" type="text"/></div>
      <div class="form-group"><label>New Password</label><input id="rec-pass" type="password"/></div>
      <div id="rec-err" style="color:#ef4444;font-size:.8rem;margin-bottom:1rem;"></div>
      <button class="btn-primary full-width" onclick="handleRecovery()">Reset Password</button>
      <button class="btn-outline full-width" style="margin-top:10px;" onclick="renderAdmin()">Back to Login</button>
    </div>
  </div>`;
}

async function handleRecovery() {
  const body = {
    email: document.getElementById('rec-email').value,
    securityAnswer: document.getElementById('rec-answer').value,
    newPassword: document.getElementById('rec-pass').value
  };
  const r = await api('/api/admin/forgot-password', { method: 'POST', body });
  if (r.error) { document.getElementById('rec-err').textContent = r.error; return; }
  toast('Password reset success! Please login.', 'success');
  renderAdmin();
}

// ── SITE MANAGER (CMS) ─────────────────────────────────────
async function adminSiteManager() {
  const settings = normalizeSettings(await api('/api/settings'));
  const g = (k) => settings[k] ?? '';
  const isOn = (k) => settings[k] === true || settings[k] === 'true';
  const colorVal = (k, fallback) => {
    const value = g(k);
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
  };

  document.getElementById('admin-content').innerHTML = `
  <div class="admin-header"><h1 class="admin-page-title">🎨 Site Manager — Homepage CMS</h1><p style="color:var(--gray);margin-top:4px;">Control every section of your homepage from here. Changes appear instantly on the live site.</p></div>

  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-palette"></i> Design System (Theme Control)</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
      <div class="form-group"><label>Primary Rose</label><input type="color" id="cms-themeRose" value="${colorVal('themeRose', '#c9748f')}"/></div>
      <div class="form-group"><label>Rose Dark</label><input type="color" id="cms-themeRoseDark" value="${colorVal('themeRoseDark', '#a85070')}"/></div>
      <div class="form-group"><label>Rose Light</label><input type="color" id="cms-themeRoseLight" value="${colorVal('themeRoseLight', '#fbe4e9')}"/></div>
      <div class="form-group"><label>Gold</label><input type="color" id="cms-themeGold" value="${colorVal('themeGold', '#b39031')}"/></div>
      <div class="form-group"><label>Gold Light</label><input type="color" id="cms-themeGoldLight" value="${colorVal('themeGoldLight', '#d4af37')}"/></div>
      <div class="form-group"><label>Background</label><input type="color" id="cms-themeBeige" value="${colorVal('themeBeige', '#fdf6f0')}"/></div>
      <div class="form-group"><label>Dark Text</label><input type="color" id="cms-themeDark" value="${colorVal('themeDark', '#1f1f38')}"/></div>
      <div class="form-group"><label>Card Radius</label><input id="cms-themeRadius" value="${g('themeRadius') || '16px'}" placeholder="16px"/></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:8px;">
      <div class="form-group"><label>Collections Section Background (CSS value)</label><input id="cms-homeCollectionsBg" value="${g('homeCollectionsBg')}" placeholder="#ffffff or linear-gradient(...)"/></div>
      <div class="form-group"><label>Featured Section Background (CSS value)</label><input id="cms-homeFeaturedBg" value="${g('homeFeaturedBg') || 'var(--beige)'}" placeholder="#fdf6f0"/></div>
      <div class="form-group"><label>Testimonials Section Background (CSS value)</label><input id="cms-homeTestimonialsBg" value="${g('homeTestimonialsBg')}" placeholder="#fff"/></div>
    </div>
    <button class="btn-primary" style="margin-top:1rem;" onclick="saveCmsDesignSystem()"><i class="fas fa-save"></i> Save Design System</button>
  </div>

  <!-- SECTION TOGGLES -->
  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-toggle-on"></i> Section Visibility</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
      ${[
        'showOfferBanner:Offer Banner',
        'showTrustHub:Trust Hub Strip',
        'showFeaturedProducts:Best Seller Section',
        'showCollections:Collections Grid',
        'showPromo:Promo Section',
        'showTestimonials:Testimonials',
        'showProductRatings:Product Detail Ratings',
        'showProductDeliveryDetails:Product Detail Delivery/Tax Box',
        'showProductAvailability:Product Detail Availability',
        'showProductCardRatings:Product Card Ratings',
        'showProductCardDeliveryBox:Product Card Delivery Mini Box'
      ].map(item => {
        const [key, label] = item.split(':');
        return `<label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f9f9f9;border-radius:10px;cursor:pointer;border:1px solid var(--border);">
          <input type="checkbox" id="cms-${key}" ${isOn(key) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--rose);"/>
          <span style="font-size:.9rem;font-weight:500;">${label}</span>
        </label>`;
      }).join('')}
    </div>
    <button class="btn-primary" style="margin-top:1rem;" onclick="saveCmsToggles()"><i class="fas fa-save"></i> Save Toggles</button>
  </div>

  <!-- OFFER BANNER -->
  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-bullhorn"></i> Offer Banner Strip</h3>
    <div class="form-group"><label>Banner Text</label><input id="cms-offerBanner" value="${g('offerBanner')}" placeholder="🎁 LIMITED OFFER: FLAT 50% OFF..."/></div>
    <button class="btn-primary" onclick="saveCmsField('offerBanner')"><i class="fas fa-save"></i> Save Banner</button>
  </div>

  <!-- HERO SECTION -->
  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-image"></i> Hero Section</h3>
    <div class="form-grid">
      <div class="form-group"><label>Badge Text</label><input id="cms-heroBadge" value="${g('heroBadge')}" placeholder="✦ PREMIUM COLLECTION 2026 ✦"/></div>
      <div class="form-group"><label>Media Type</label>
        <select id="cms-heroMediaType" onchange="document.getElementById('hero-video-group').style.display=this.value==='video'?'block':'none';document.getElementById('hero-image-group').style.display=this.value==='image'?'block':'none';">
          <option value="image" ${g('heroMediaType')!=='video'?'selected':''}>Image</option>
          <option value="video" ${g('heroMediaType')==='video'?'selected':''}>Video (10-20 sec)</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Hero Title</label><input id="cms-heroTitle" value="${g('heroTitle')}" placeholder="Handmade Woollen"/></div>
    <div class="form-group"><label>Hero Subtitle</label><input id="cms-heroSubtitle" value="${g('heroSubtitle')}" placeholder="Soft, Gift-ready Pieces"/></div>
    <div class="form-group"><label>Description</label><textarea id="cms-heroDescription" rows="2" placeholder="Premium artificial jewellery...">${g('heroDescription')}</textarea></div>
    <div id="hero-image-group" style="display:${g('heroMediaType')!=='video'?'block':'none'};">
      <div class="form-group"><label>Background Image URL</label><input id="cms-heroImage" value="${g('heroImage')}" placeholder="https://..."/></div>
      <div class="form-group"><label>Upload Hero Image</label><input type="file" id="cms-heroImage-file" accept="image/*"/></div>
      <button class="btn-outline" type="button" onclick="uploadCmsMedia('cms-heroImage-file','cms-heroImage')"><i class="fas fa-upload"></i> Upload Hero Image</button>
    </div>
    <div id="hero-video-group" style="display:${g('heroMediaType')==='video'?'block':'none'};">
      <div class="form-group"><label>Video URL (MP4, 10-20 sec max)</label><input id="cms-heroVideoUrl" value="${g('heroVideoUrl')}" placeholder="https://...video.mp4"/></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Button 1 Text</label><input id="cms-heroButton1Text" value="${g('heroButton1Text')}" placeholder="Shop Woollen"/></div>
      <div class="form-group"><label>Button 2 Text</label><input id="cms-heroButton2Text" value="${g('heroButton2Text')}" placeholder="View Collections"/></div>
    </div>
    <button class="btn-primary" onclick="saveCmsHero()"><i class="fas fa-save"></i> Save Hero Section</button>
  </div>

  <!-- PROMO / TIMER SECTION -->
  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-clock"></i> Promo / Timer Section</h3>
    <div class="form-grid">
      <div class="form-group"><label>Promo Title</label><input id="cms-promoTitle" value="${g('promoTitle')}" placeholder="Exclusive Seasonal Drop"/></div>
      <div class="form-group"><label>Promo Subtitle</label><input id="cms-promoSubtitle" value="${g('promoSubtitle')}" placeholder="Sale Ends In"/></div>
    </div>
    <div class="form-group"><label>Promo Description</label><textarea id="cms-promoDescription" rows="2" placeholder="Our most awaited collection...">${g('promoDescription')}</textarea></div>
    <div class="form-grid">
      <div class="form-group"><label>Media Type</label>
        <select id="cms-promoMediaType" onchange="document.getElementById('promo-video-group').style.display=this.value==='video'?'block':'none';document.getElementById('promo-image-group').style.display=this.value==='image'?'block':'none';">
          <option value="image" ${g('promoMediaType')!=='video'?'selected':''}>Image</option>
          <option value="video" ${g('promoMediaType')==='video'?'selected':''}>Video (10-20 sec)</option>
        </select>
      </div>
      <div class="form-group"><label>Button Text</label><input id="cms-promoButtonText" value="${g('promoButtonText')}" placeholder="Explore Collection"/></div>
    </div>
    <div id="promo-image-group" style="display:${g('promoMediaType')!=='video'?'block':'none'};">
      <div class="form-group"><label>Promo Image URL</label><input id="cms-promoImage" value="${g('promoImage')}" placeholder="https://..."/></div>
      <div class="form-group"><label>Upload Promo Image</label><input type="file" id="cms-promoImage-file" accept="image/*"/></div>
      <button class="btn-outline" type="button" onclick="uploadCmsMedia('cms-promoImage-file','cms-promoImage')"><i class="fas fa-upload"></i> Upload Promo Image</button>
    </div>
    <div id="promo-video-group" style="display:${g('promoMediaType')==='video'?'block':'none'};">
      <div class="form-group"><label>Promo Video URL (MP4, 10-20 sec)</label><input id="cms-promoVideoUrl" value="${g('promoVideoUrl')}" placeholder="https://...video.mp4"/></div>
    </div>
    <button class="btn-primary" onclick="saveCmsPromo()"><i class="fas fa-save"></i> Save Promo Section</button>
  </div>

  <!-- FOOTER -->
  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-shoe-prints"></i> Footer Details</h3>
    <div class="form-grid">
      <div class="form-group"><label>Phone</label><input id="cms-footerPhone" value="${g('footerPhone')}" placeholder="+91 7404217625"/></div>
      <div class="form-group"><label>Email</label><input id="cms-footerEmail" value="${g('footerEmail')}" placeholder="lencho.official01@gmail.com"/></div>
    </div>
    <div class="form-group"><label>Address</label><input id="cms-footerAddress" value="${g('footerAddress')}" placeholder="197 Sarakpur, Barara, Ambala"/></div>
    <button class="btn-primary" onclick="saveCmsFooter()"><i class="fas fa-save"></i> Save Footer</button>
  </div>`;

  // SEO Panel
  document.getElementById('admin-content').innerHTML += `
  <div class="admin-form" style="margin-bottom:2rem;">
    <h3 style="margin-bottom:1rem;color:var(--rose-dark);"><i class="fas fa-search"></i> SEO & Social Defaults</h3>
    <div class="form-group"><label>Default SEO Title</label><input id="cms-seoTitleDefault" value="${g('seoTitleDefault') || ''}" placeholder="Lencho - Handmade Woollen Accessories"/></div>
    <div class="form-group"><label>Default SEO Description</label><textarea id="cms-seoDescriptionDefault" rows="2" placeholder="Default meta description...">${g('seoDescriptionDefault') || ''}</textarea></div>
    <div class="form-group"><label>Canonical Base URL</label><input id="cms-seoCanonicalBaseUrl" value="${g('seoCanonicalBaseUrl') || ''}" placeholder="https://lencho.in"/></div>
    <div class="form-group"><label>OG Image URL</label><input id="cms-seoOgImageUrl" value="${g('seoOgImageUrl') || ''}" placeholder="https://.../og-image.png"/></div>
    <div class="form-group"><label>Upload OG Image</label><input type="file" id="cms-seoOgImageUrl-file" accept="image/*"/></div>
    <button class="btn-outline" type="button" onclick="uploadCmsMedia('cms-seoOgImageUrl-file','cms-seoOgImageUrl')"><i class="fas fa-upload"></i> Upload OG Image</button>
    <div style="height:8px"></div>
    <div class="form-group"><label>Twitter Image URL</label><input id="cms-seoTwitterImageUrl" value="${g('seoTwitterImageUrl') || ''}" placeholder="https://.../twitter-image.png"/></div>
    <div class="form-group"><label>Upload Twitter Image</label><input type="file" id="cms-seoTwitterImageUrl-file" accept="image/*"/></div>
    <button class="btn-outline" type="button" onclick="uploadCmsMedia('cms-seoTwitterImageUrl-file','cms-seoTwitterImageUrl')"><i class="fas fa-upload"></i> Upload Twitter Image</button>
    <div style="margin-top:1rem;display:flex;gap:10px;"><button class="btn-primary" onclick="saveSeoSettings()"><i class="fas fa-save"></i> Save SEO Defaults</button></div>
  </div>`;

}

async function saveSeoSettings() {
  const keys = ['seoTitleDefault','seoDescriptionDefault','seoCanonicalBaseUrl','seoOgImageUrl','seoTwitterImageUrl'];
  for (const k of keys) {
    const el = document.getElementById('cms-' + k);
    if (!el) continue;
    await api('/api/admin/settings', { method: 'POST', body: { key: k, value: el.value } });
  }
  toast('✅ SEO settings saved!', 'success');
}

async function saveCmsToggles() {
  const keys = ['showOfferBanner','showTrustHub','showCollections','showFeaturedProducts','showPromo','showTestimonials','showProductRatings','showProductDeliveryDetails','showProductAvailability','showProductCardRatings','showProductCardDeliveryBox'];
  for (const k of keys) {
    const el = document.getElementById('cms-' + k);
    await api('/api/admin/settings', { method: 'POST', body: { key: k, value: el.checked } });
  }
  toast('✅ Section toggles saved!', 'success');
}

async function saveCmsField(key) {
  const val = document.getElementById('cms-' + key).value;
  await api('/api/admin/settings', { method: 'POST', body: { key, value: val } });
  toast('✅ Saved!', 'success');
}

async function saveCmsHero() {
  const fields = ['heroBadge','heroTitle','heroSubtitle','heroDescription','heroImage','heroButton1Text','heroButton2Text','heroMediaType','heroVideoUrl'];
  for (const k of fields) {
    const el = document.getElementById('cms-' + k);
    if (el) await api('/api/admin/settings', { method: 'POST', body: { key: k, value: el.value } });
  }
  toast('✅ Hero section saved!', 'success');
}

async function saveCmsPromo() {
  const fields = ['promoTitle','promoSubtitle','promoDescription','promoImage','promoButtonText','promoMediaType','promoVideoUrl'];
  for (const k of fields) {
    const el = document.getElementById('cms-' + k);
    if (el) await api('/api/admin/settings', { method: 'POST', body: { key: k, value: el.value } });
  }
  toast('✅ Promo section saved!', 'success');
}

async function saveCmsFooter() {
  const fields = ['footerPhone','footerEmail','footerAddress'];
  for (const k of fields) {
    const el = document.getElementById('cms-' + k);
    if (el) await api('/api/admin/settings', { method: 'POST', body: { key: k, value: el.value } });
  }
  toast('✅ Footer details saved!', 'success');
}

async function saveCmsDesignSystem() {
  const keys = [
    'themeRose','themeRoseDark','themeRoseLight','themeGold','themeGoldLight','themeBeige','themeDark','themeRadius',
    'homeCollectionsBg','homeFeaturedBg','homeTestimonialsBg'
  ];

  for (const key of keys) {
    const el = document.getElementById('cms-' + key);
    if (!el) continue;
    await api('/api/admin/settings', { method: 'POST', body: { key, value: el.value } });
  }
  toast('✅ Design system saved!', 'success');
}

async function uploadCmsMedia(fileInputId, targetInputId) {
  const fileInput = document.getElementById(fileInputId);
  const targetInput = document.getElementById(targetInputId);
  if (!fileInput || !targetInput || !fileInput.files || !fileInput.files[0]) {
    toast('Please select a file first', 'error');
    return;
  }

  const fd = new FormData();
  fd.append('media', fileInput.files[0]);
  fd.append('folder', 'cms');

  const resp = await fetch('/api/admin/upload-media', {
    method: 'POST',
    credentials: 'include',
    headers: getAdminAuthHeaders(),
    body: fd
  });
  const raw = await resp.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    toast('Upload API returned invalid response', 'error');
    return;
  }
  if (!resp.ok || data.error) {
    toast(data.error || 'Upload failed', 'error');
    return;
  }

  targetInput.value = data.url;
  toast('Media uploaded. Save section to apply.', 'success');
}

async function adminDeliveryManager() {
  const cfg = await api('/api/admin/delivery-manager');
  if (cfg.error) {
    document.getElementById('admin-content').innerHTML = `<div class="admin-form"><p style="color:#991b1b;">${cfg.error}</p></div>`;
    return;
  }

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header"><h1 class="admin-page-title">Delivery Manager</h1></div>
    <div class="admin-form" style="max-width:900px;">
      <p style="margin-bottom:1rem;color:var(--gray);">Connect your delivery partner API and trigger a live test payload from admin.</p>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" id="dm-enabled" ${cfg.enabled ? 'checked' : ''}/>
          Enable Delivery Automation
        </label>
      </div>
      <div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="form-group"><label>Provider Name</label><input id="dm-provider" value="${cfg.provider || 'custom'}" placeholder="shiprocket / delhivery / custom"/></div>
        <div class="form-group"><label>API Base URL</label><input id="dm-api-base" value="${cfg.apiBaseUrl || ''}" placeholder="https://api.partner.com"/></div>
      </div>
      <div class="form-group"><label>API Key / Token</label><input id="dm-api-key" value="${cfg.apiKey || ''}" placeholder="Bearer token or API key"/></div>
      <div class="form-group"><label>Webhook / Order Push URL</label><input id="dm-webhook" value="${cfg.webhookUrl || ''}" placeholder="https://api.partner.com/orders"/></div>
      <div class="form-group"><label>Tracking URL Template (use {{id}})</label><input id="dm-track-template" value="${cfg.trackingUrlTemplate || ''}" placeholder="https://partner.com/track/{{id}}"/></div>
      <div class="form-group"><label>Internal Notes</label><textarea id="dm-notes" rows="3" placeholder="pickup SLA, partner contact, etc">${cfg.notes || ''}</textarea></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn-primary" onclick="saveDeliveryManagerSettings()"><i class="fas fa-save"></i> Save Delivery Config</button>
        <button class="btn-outline" onclick="testDeliveryManagerWebhook()"><i class="fas fa-plug"></i> API Test Button</button>
      </div>
      <div id="dm-result" style="margin-top:1rem;font-size:.85rem;"></div>
    </div>`;
}

async function saveDeliveryManagerSettings() {
  const payload = {
    enabled: document.getElementById('dm-enabled')?.checked,
    provider: (document.getElementById('dm-provider')?.value || '').trim(),
    apiBaseUrl: (document.getElementById('dm-api-base')?.value || '').trim(),
    apiKey: (document.getElementById('dm-api-key')?.value || '').trim(),
    webhookUrl: (document.getElementById('dm-webhook')?.value || '').trim(),
    trackingUrlTemplate: (document.getElementById('dm-track-template')?.value || '').trim(),
    notes: (document.getElementById('dm-notes')?.value || '').trim()
  };
  if (payload.enabled && !payload.webhookUrl && !payload.apiBaseUrl) {
    toast('Enable automation requires API Base URL or Webhook URL', 'error');
    return;
  }
  const r = await api('/api/admin/delivery-manager', { method: 'POST', body: payload });
  if (r.error) { toast(r.error, 'error'); return; }
  toast('Delivery manager config saved', 'success');
}

async function testDeliveryManagerWebhook() {
  const box = document.getElementById('dm-result');
  const payload = {
    provider: (document.getElementById('dm-provider')?.value || '').trim(),
    apiBaseUrl: (document.getElementById('dm-api-base')?.value || '').trim(),
    apiKey: (document.getElementById('dm-api-key')?.value || '').trim(),
    webhookUrl: (document.getElementById('dm-webhook')?.value || '').trim(),
    trackingUrlTemplate: (document.getElementById('dm-track-template')?.value || '').trim(),
    paymentMethod: 'prepaid',
    amount: 999
  };

  if (!payload.webhookUrl && !payload.apiBaseUrl) {
    if (box) box.innerHTML = '<span style="color:#991b1b;">Please fill Webhook URL or API Base URL first.</span>';
    return;
  }

  if (box) box.innerHTML = '<span style="color:var(--gray);">Sending test payload...</span>';
  const r = await api('/api/admin/delivery-manager/test', {
    method: 'POST',
    body: payload
  });

  if (r.error) {
    if (box) box.innerHTML = `<span style="color:#991b1b;">Test failed: ${r.error}</span>`;
    return;
  }

  if (box) {
    box.innerHTML = `<span style="color:#166534;">Test success (HTTP ${r.upstreamStatus})</span><pre style="margin-top:.5rem;background:#111827;color:#e5e7eb;padding:10px;border-radius:8px;overflow:auto;max-height:240px;">${JSON.stringify(r.upstreamData || {}, null, 2)}</pre>`;
  }
}

// ─── BACKUP & RECOVERY SYSTEM ──────────────────────────────────
async function adminBackupRecovery() {
  try {
    const statsResp = await api('/api/admin/visitor-stats');
    const backupsResp = await api('/api/admin/backups');
    const stats = statsResp || { totalVisitors: 0, storeVisitors: 0 };
    const backups = (backupsResp?.backups || []).slice(0, 20); // Show last 20 backups

    document.getElementById('admin-content').innerHTML = `
      <div class="admin-header">
        <h1 class="admin-page-title">
          <i class="fas fa-shield-alt" style="margin-right:.5rem;"></i> Backup & Recovery System
        </h1>
        <button class="btn-primary" onclick="loadBackupRecovery()">
          <i class="fas fa-sync"></i> Refresh
        </button>
      </div>

      <!-- VISITOR COUNT MANAGEMENT -->
      <div class="admin-form" style="margin-bottom:2rem;">
        <h3 style="color:var(--rose-dark);margin-bottom:1.5rem;">
          <i class="fas fa-chart-line"></i> Visitor Count Management
        </h3>
        <p style="color:var(--gray);margin-bottom:1rem;font-size:.9rem;">
          ⚠️ Your current visitor count: <strong style="color:var(--rose);">${stats.totalVisitors?.toLocaleString() || 0}</strong> visitors | 
          <strong style="color:var(--rose);">${stats.storeVisitors?.toLocaleString() || 0}</strong> store visitors
        </p>
        
        <div class="form-grid">
          <div class="form-group">
            <label>Total Website Visitors</label>
            <input type="number" id="visitor-total" value="${stats.totalVisitors || 0}" placeholder="1000"/>
          </div>
          <div class="form-group">
            <label>Store Visitors Count</label>
            <input type="number" id="visitor-store" value="${stats.storeVisitors || 0}" placeholder="500"/>
          </div>
        </div>
        <button class="btn-primary" onclick="saveVisitorCount()">
          <i class="fas fa-save"></i> Save Visitor Count
        </button>
      </div>

      <!-- CODE BACKUP SECTION -->
      <div class="admin-form" style="margin-bottom:2rem;">
        <h3 style="color:var(--rose-dark);margin-bottom:1.5rem;">
          <i class="fas fa-database"></i> Create Code Backup
        </h3>
        <p style="color:var(--gray);margin-bottom:1rem;font-size:.9rem;">
          Create a backup of your code before pushing to GitHub. This protects your visitor count and allows you to restore old versions.
        </p>
        <div class="form-group">
          <label>Backup Description (optional)</label>
          <input type="text" id="backup-desc" placeholder="e.g., Before pushing footer accordion fix to GitHub"/>
        </div>
        <button class="btn-primary" onclick="createNewBackup()">
          <i class="fas fa-cloud-upload-alt"></i> Create Backup Now
        </button>
      </div>

      <!-- BACKUPS LIST -->
      <div class="admin-form">
        <h3 style="color:var(--rose-dark);margin-bottom:1.5rem;">
          <i class="fas fa-history"></i> Backup History (Last 20)
        </h3>
        ${backups.length === 0 ? `
          <div style="text-align:center;padding:2rem;color:var(--gray);">
            <i class="fas fa-inbox" style="font-size:2rem;margin-bottom:.5rem;display:block;opacity:.5;"></i>
            <p>No backups yet. Create your first backup above.</p>
          </div>
        ` : `
          <div style="overflow-x:auto;">
            <table style="width:100%;font-size:.85rem;">
              <thead style="background:rgba(201,106,138,.1);border-bottom:2px solid rgba(201,106,138,.3);">
                <tr>
                  <th style="padding:1rem;text-align:left;font-weight:700;">Description</th>
                  <th style="padding:1rem;text-align:left;font-weight:700;">Files</th>
                  <th style="padding:1rem;text-align:left;font-weight:700;">Date & Time</th>
                  <th style="padding:1rem;text-align:left;font-weight:700;">By</th>
                  <th style="padding:1rem;text-align:center;font-weight:700;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${backups.map((b, i) => {
                  const date = new Date(b.timestamp);
                  const formattedDate = date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN');
                  return `
                    <tr style="border-bottom:1px solid rgba(0,0,0,.05);${i % 2 === 0 ? 'background:rgba(0,0,0,.015);' : ''}">
                      <td style="padding:1rem;"><strong>${b.description || 'Auto Backup'}</strong></td>
                      <td style="padding:1rem;">${b.filesBackedUp || 0} files</td>
                      <td style="padding:1rem;">${formattedDate}</td>
                      <td style="padding:1rem;font-size:.8rem;color:var(--gray);">${b.byUser || '-'}</td>
                      <td style="padding:1rem;text-align:center;">
                        <button class="btn-outline" style="padding:.5rem 1rem;font-size:.8rem;" onclick="restoreBackup('${b.id}')">
                          <i class="fas fa-undo"></i> Restore
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div style="margin-top:2rem;padding:1.5rem;background:rgba(201,149,76,.08);border-radius:12px;border-left:4px solid var(--gold);color:var(--dark);font-size:.85rem;">
        <p><strong>📌 How to use Backup & Recovery:</strong></p>
        <ol style="margin:0.5rem 0 0 1.5rem;padding:0;">
          <li style="margin:.3rem 0;">Update your visitor count if it resets</li>
          <li style="margin:.3rem 0;">Create a backup with description before pushing code to GitHub</li>
          <li style="margin:.3rem 0;">If something breaks, restore from any previous backup</li>
          <li style="margin:.3rem 0;">Backups include code + data files (max 50 kept)</li>
        </ol>
      </div>
    `;
  } catch (err) {
    document.getElementById('admin-content').innerHTML = `
      <div style="padding:2rem;text-align:center;color:#991b1b;">
        <i class="fas fa-exclamation-circle" style="font-size:2rem;margin-bottom:.5rem;display:block;"></i>
        <p>Error loading backup system: ${err.message}</p>
        <button class="btn-outline" onclick="adminTab('backup')">Try Again</button>
      </div>
    `;
  }
}

async function saveVisitorCount() {
  const total = Number(document.getElementById('visitor-total').value) || 0;
  const store = Number(document.getElementById('visitor-store').value) || 0;

  const r = await api('/api/admin/visitor-count', {
    method: 'PUT',
    body: { totalVisitors: total, storeVisitors: store }
  });

  if (r.success) {
    toast(`✓ Visitor count updated! Total: ${total.toLocaleString()} | Store: ${store.toLocaleString()}`, 'success');
    loadAdminVisitorCounter();
  } else {
    toast('Error updating visitor count: ' + (r.error || 'Unknown'), 'error');
  }
}

async function createNewBackup() {
  const desc = (document.getElementById('backup-desc')?.value || '').trim();
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Creating...';

  const r = await api('/api/admin/backups', {
    method: 'POST',
    body: { description: desc || 'Manual Backup' }
  });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Create Backup Now';

  if (r.success) {
    toast('✓ Backup created with ' + r.backup.filesBackedUp + ' files!', 'success');
    setTimeout(() => loadBackupRecovery(), 500);
  } else {
    toast('Error creating backup: ' + (r.error || 'Unknown'), 'error');
  }
}

async function restoreBackup(backupId) {
  if (!confirm('⚠️ This will restore your code and data from this backup. Continue?')) return;

  const btn = event.target.closest('button');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner" style="animation:spin 1s linear infinite;"></i> Restoring...';

  const r = await api(`/api/admin/backups/${backupId}/restore`, { method: 'POST' });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-undo"></i> Restore';

  if (r.success) {
    toast(`✓ Restored ${r.filesRestored} files! Page will reload...`, 'success');
    setTimeout(() => location.reload(), 1500);
  } else {
    toast('Error restoring backup: ' + (r.error || 'Unknown'), 'error');
  }
}

function loadBackupRecovery() {
  adminTab('backup');
}

// Overrides appended late so they win over older admin helpers.
async function adminCollections() {
  const cats = await api('/api/categories');
  const products = await api('/api/products');
  const counts = products.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {});
  document.getElementById('admin-content').innerHTML = `<div class="admin-header"><h1 class="admin-page-title">Product Collections (${cats.length})</h1><button class="btn-primary" onclick="showAddCategory()"><i class="fas fa-plus"></i> New Collection</button></div><div class="stats-grid" style="margin-bottom:2rem;"><div class="stat-card"><div class="stat-label">Total Categories</div><div class="stat-value">${cats.length}</div></div><div class="stat-card"><div class="stat-label">Active Slugs</div><div class="stat-value">${cats.filter(c=>c.slug).length}</div></div></div><div class="admin-table-wrap"><table><thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>Product Count</th><th>Actions</th></tr></thead><tbody>${cats.map(c => `<tr><td><img src="${safeImageUrl(c.image, c.slug)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:#f0f0f0;"/></td><td>${c.name}</td><td><code>${c.slug}</code></td><td><span style="background:var(--rose-light);color:var(--rose-dark);padding:4px 8px;border-radius:6px;font-weight:600;">${counts[c.slug] || 0}</span></td><td><button class="btn-sm btn-outline" onclick="viewCategoryProducts('${c.slug}')"><i class="fas fa-boxes"></i> Inventory</button> <button class="btn-sm btn-outline" onclick='showAddCategory("${c.storeType || 'main'}", ${JSON.stringify(JSON.stringify(c))})'><i class="fas fa-pen"></i> Edit</button> <button class="btn-sm" onclick="deleteCategory('${c.id || c._id}', '${c.storeType || 'main'}')" style="background:#fee2e2;color:#ef4444;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div><div id="category-inventory" style="margin-top:3rem;display:none;"><div class="admin-header"><h2 id="inv-title" class="admin-page-title">Inventory: <span>All Products</span></h2><button class="btn-outline" onclick="document.getElementById('category-inventory').style.display='none'">Close</button></div><div class="admin-table-wrap"><table id="inv-table"><thead><tr><th>Product</th><th>Original Price</th><th>Stock Status</th><th>Action</th></tr></thead><tbody id="inv-body"></tbody></table></div></div>`;
}

async function handleCategoryImageUpload(event, field) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    adminCategoryFormState[field] = await uploadAdminMediaFile(file, `categories/${adminCategoryFormState?.storeType || 'main'}`);
    const img = document.getElementById(`nc-preview-${field}`);
    if (img) { img.src = safeImageUrl(adminCategoryFormState[field], ''); img.style.display = 'block'; }
    toast('Collection image uploaded', 'success');
  } catch (error) {
    toast(error.message || 'Image upload failed', 'error');
  } finally {
    event.target.value = '';
  }
}

async function showAddCategory(storeType = 'main', categoryJson = null) {
  const existing = categoryJson ? JSON.parse(categoryJson) : null;
  adminCategoryFormState = { id: existing?.id || existing?._id || '', name: existing?.name || '', image: existing?.image || '', bannerImage: existing?.bannerImage || '', icon: existing?.icon || 'star', theme: existing?.theme || '', storeType: existing?.storeType || storeType || 'main', description: existing?.description || '' };
  const safeCategoryName = adminProductManagerEscape(adminCategoryFormState.name);
  const safeCategoryDescription = adminProductManagerEscape(adminCategoryFormState.description);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `<div class="modal-card"><h3>${existing ? 'Edit' : 'Add New'} ${adminCategoryFormState.storeType === 'woollen' ? 'Woollen ' : ''}Collection</h3><div class="form-group"><label>Name</label><input id="nc-name" value="${safeCategoryName}" placeholder="Collection name"/></div><div class="form-grid"><div class="form-group"><label>Collection Image</label><input type="file" accept="image/*" onchange="handleCategoryImageUpload(event, 'image')"/><img id="nc-preview-image" src="${safeImageUrl(adminCategoryFormState.image, '')}" style="width:100%;max-width:160px;margin-top:.75rem;border-radius:12px;object-fit:cover;${adminCategoryFormState.image ? '' : 'display:none;'}"/></div><div class="form-group"><label>Banner Image</label><input type="file" accept="image/*" onchange="handleCategoryImageUpload(event, 'bannerImage')"/><img id="nc-preview-bannerImage" src="${safeImageUrl(adminCategoryFormState.bannerImage, '')}" style="width:100%;max-width:160px;margin-top:.75rem;border-radius:12px;object-fit:cover;${adminCategoryFormState.bannerImage ? '' : 'display:none;'}"/></div></div><div class="form-grid" style="margin-top:1rem;"><div class="form-group"><label>Icon</label><select id="nc-icon">${['ribbon','flower','butterfly','yarn','star','baby','diamond','heart','gift','sparkles','home','snowflake'].map(v=>`<option value="${v}" ${adminCategoryFormState.icon===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="form-group"><label>Theme</label><select id="nc-theme">${['pastel-pink','lavender','mint','cream','peach','baby-blue','light-yellow','rose-gold','soft-purple','sage'].map(v=>`<option value="${v}" ${adminCategoryFormState.theme===v?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="form-group"><label>Description</label><textarea id="nc-desc" rows="2">${safeCategoryDescription}</textarea></div><div style="display:flex;gap:1rem;flex-wrap:wrap;"><button class="btn-primary" onclick="saveCategory()">${existing ? 'Save Collection' : 'Create Collection'}</button><button class="btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button></div></div>`;
  document.body.appendChild(modal);
}

async function saveCategory() {
  const body = { name: document.getElementById('nc-name').value.trim(), image: adminCategoryFormState?.image || '', bannerImage: adminCategoryFormState?.bannerImage || '', icon: document.getElementById('nc-icon')?.value || 'star', theme: document.getElementById('nc-theme')?.value || '', storeType: adminCategoryFormState?.storeType || 'main', description: document.getElementById('nc-desc').value.trim() };
  if (!body.name) return toast('Collection name is required', 'error');
  const endpoint = adminCategoryFormState?.id ? `/api/admin/categories/${adminCategoryFormState.id}` : '/api/admin/categories';
  const method = adminCategoryFormState?.id ? 'PUT' : 'POST';
  const r = await api(endpoint, { method, body });
  if (r.error) return toast(r.error, 'error');
  toast(adminCategoryFormState?.id ? 'Collection updated' : 'Collection added', 'success');
  document.querySelector('.modal-overlay')?.remove();
  if (body.storeType === 'woollen') adminWoollen();
  else adminCollections();
}

async function deleteCategory(id, storeType = '') {
  if (!confirm('Delete this collection?')) return;
  const targetStore = storeType || adminCategoryFormState?.storeType || adminProductManagerState?.storeType || 'main';
  const r = await api('/api/admin/categories/' + id, { method: 'DELETE' });
  if (r.error) return toast(r.error, 'error');
  toast('Collection deleted', 'info');
  if (targetStore === 'woollen') adminWoollen();
  else adminCollections();
}

async function editCategoryById(categoryId) {
  const cats = await api('/api/categories');
  const category = (cats || []).find(item => String(item.id || item._id) === String(categoryId));
  if (!category) return toast('Collection not found', 'error');
  showAddCategory(category.storeType || 'main', JSON.stringify(category));
}

async function adminCollections() {
  const cats = await api('/api/categories');
  const products = await api('/api/products');
  const counts = products.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {});
  document.getElementById('admin-content').innerHTML = `<div class="admin-header"><h1 class="admin-page-title">Product Collections (${cats.length})</h1><button class="btn-primary" onclick="showAddCategory()"><i class="fas fa-plus"></i> New Collection</button></div><div class="stats-grid" style="margin-bottom:2rem;"><div class="stat-card"><div class="stat-label">Total Categories</div><div class="stat-value">${cats.length}</div></div><div class="stat-card"><div class="stat-label">Active Slugs</div><div class="stat-value">${cats.filter(c=>c.slug).length}</div></div></div><div class="admin-table-wrap"><table><thead><tr><th>Image</th><th>Name</th><th>Slug</th><th>Product Count</th><th>Actions</th></tr></thead><tbody>${cats.map(c => `<tr><td><img src="${safeImageUrl(c.image, c.slug)}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;background:#f0f0f0;"/></td><td>${c.name}</td><td><code>${c.slug}</code></td><td><span style="background:var(--rose-light);color:var(--rose-dark);padding:4px 8px;border-radius:6px;font-weight:600;">${counts[c.slug] || 0}</span></td><td><button class="btn-sm btn-outline" onclick="viewCategoryProducts('${c.slug}')"><i class="fas fa-boxes"></i> Inventory</button> <button class="btn-sm btn-outline" onclick="editCategoryById('${c.id || c._id}')"><i class="fas fa-pen"></i> Edit</button> <button class="btn-sm" onclick="deleteCategory('${c.id || c._id}', '${c.storeType || 'main'}')" style="background:#fee2e2;color:#ef4444;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div><div id="category-inventory" style="margin-top:3rem;display:none;"><div class="admin-header"><h2 id="inv-title" class="admin-page-title">Inventory: <span>All Products</span></h2><button class="btn-outline" onclick="document.getElementById('category-inventory').style.display='none'">Close</button></div><div class="admin-table-wrap"><table id="inv-table"><thead><tr><th>Product</th><th>Original Price</th><th>Stock Status</th><th>Action</th></tr></thead><tbody id="inv-body"></tbody></table></div></div>`;
}

let adminProductManagerState = {
  storeType: 'main',
  products: [],
  categories: [],
  selectedIds: new Set(),
  filters: { search: '', sku: '', category: '', status: '', sort: 'latest' },
  page: 1,
  pageSize: 10,
  keepValues: false,
  editingProduct: null,
  uploadingCount: 0
};

const ADMIN_PRODUCT_TEMPLATE_STORAGE_KEY = 'lencho_admin_product_templates_v1';

function getAdminStoreLabel(storeType = 'main') {
  return storeType === 'woollen' ? 'Woollen' : 'Jewellery';
}

function adminProductManagerEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function adminProductManagerSlugLabel(slug = '') {
  const category = adminProductManagerState.categories.find(item => item.slug === slug);
  if (category?.name) return category.name;
  return String(slug || '').replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

const ADMIN_PRODUCT_DETAIL_FIELDS = [
  { key: 'brand', label: 'Brand', placeholder: 'Lencho' },
  { key: 'modelName', label: 'Model Name', placeholder: 'Adjustable Toe Ring' },
  { key: 'modelNumber', label: 'Model Number', placeholder: 'LEN-TR-001' },
  { key: 'type', label: 'Product Type', placeholder: 'Scrunchie / Hair Clip / Toe Ring' },
  { key: 'color', label: 'Color', placeholder: 'Silver / Rose Gold / Pink' },
  { key: 'size', label: 'Size', placeholder: 'Free Size / S / M / L' },
  { key: 'ringSize', label: 'Ring Size', placeholder: 'Adjustable' },
  { key: 'idealFor', label: 'Ideal For', placeholder: 'Women / Girls / Baby' },
  { key: 'occasion', label: 'Occasion', placeholder: 'Everyday / Festive / Wedding' },
  { key: 'collection', label: 'Collection', placeholder: 'Ethnic / Western / Handmade' },
  { key: 'fit', label: 'Fit', placeholder: 'Regular / Adjustable' },
  { key: 'baseMaterial', label: 'Base Material', placeholder: 'Cotton yarn / Wool / Brass / Alloy' },
  { key: 'plating', label: 'Plating', placeholder: 'Silver Plated / Gold Plated' },
  { key: 'finish', label: 'Finish', placeholder: 'Oxidized / Glossy / Matte' },
  { key: 'stoneType', label: 'Stone Type', placeholder: 'Crystal / Pearl / NA' },
  { key: 'diamondCut', label: 'Diamond Cut', placeholder: 'NA' },
  { key: 'netQuantity', label: 'Net Quantity', placeholder: '1 pair / 6 pieces' },
  { key: 'netWeight', label: 'Net Weight (gms)', placeholder: '25' },
  { key: 'packageContains', label: 'In The Box', placeholder: '1 pair toe rings' },
  { key: 'warranty', label: 'Warranty', placeholder: 'No warranty / 7-day replacement' },
  { key: 'sellerSku', label: 'Seller SKU ID', placeholder: 'LEN-SELLER-001' },
  { key: 'styleCode', label: 'Style Code / Product ID', placeholder: 'LEN-STYLE-001' },
  { key: 'genericName', label: 'Generic Name', placeholder: 'Handmade Woollen Accessory / Artificial Jewellery' },
  { key: 'countryOfOrigin', label: 'Country of Origin', placeholder: 'India' }
];

const ADMIN_PRODUCT_LEGAL_FIELDS = [
  { key: 'manufacturerName', label: 'Manufacturer Name', placeholder: 'Lencho' },
  { key: 'manufacturerAddress', label: 'Manufacturer Address', placeholder: 'Full manufacturer address' },
  { key: 'manufacturerPincode', label: 'Manufacturer Pincode', placeholder: '133201' },
  { key: 'packerName', label: 'Packer Name', placeholder: 'Lencho' },
  { key: 'packerAddress', label: 'Packer Address', placeholder: 'Full packer address' },
  { key: 'packerPincode', label: 'Packer Pincode', placeholder: '133201' },
  { key: 'importerName', label: 'Importer Name', placeholder: 'Only if imported' },
  { key: 'importerAddress', label: 'Importer Address', placeholder: 'Only if imported' },
  { key: 'importerPincode', label: 'Importer Pincode', placeholder: 'Only if imported' }
];

function adminProductDetailValue(product, key) {
  const value = product?.[key];
  if (Array.isArray(value)) return value.join('\n');
  return value ?? '';
}

function renderAdminProductDetailInput(field, product) {
  return `<div class="form-group"><label>${field.label}</label><input id="p-${field.key}" value="${adminProductManagerEscape(adminProductDetailValue(product, field.key))}" placeholder="${adminProductManagerEscape(field.placeholder || '')}"/></div>`;
}

function renderAdminProductDetailSection(product) {
  return `
    <div class="admin-seller-section">
      <div class="admin-seller-head">
        <div>
          <h3>Marketplace Product Details</h3>
          <p>Fill these like a seller panel so the live product page looks professional.</p>
        </div>
        <span>Specs</span>
      </div>
      <div class="form-grid">
        ${ADMIN_PRODUCT_DETAIL_FIELDS.map(field => renderAdminProductDetailInput(field, product)).join('')}
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Product Highlights (one per line)</label><textarea id="p-productHighlights" rows="4" placeholder="Adjustable size&#10;Silver oxidized finish&#10;Comfortable daily wear">${adminProductManagerEscape(adminProductDetailValue(product, 'productHighlights'))}</textarea></div>
        <div class="form-group"><label>Care Instructions</label><textarea id="p-careInstructions" rows="4" placeholder="Keep away from water and perfume">${adminProductManagerEscape(adminProductDetailValue(product, 'careInstructions'))}</textarea></div>
        <div class="form-group"><label>Search Keywords</label><textarea id="p-searchKeywords" rows="4" placeholder="toe ring, bichiya, silver jewellery">${adminProductManagerEscape(adminProductDetailValue(product, 'searchKeywords'))}</textarea></div>
        <div class="form-group"><label>Return Policy Text</label><textarea id="p-returnPolicyText" rows="4" placeholder="7-day return/exchange as per policy">${adminProductManagerEscape(adminProductDetailValue(product, 'returnPolicyText'))}</textarea></div>
      </div>
    </div>

    <div class="admin-seller-section">
      <div class="admin-seller-head">
        <div>
          <h3>Legal / Manufacturer Info</h3>
          <p>Useful for invoices, compliance pages, and product detail trust sections.</p>
        </div>
        <span>Legal</span>
      </div>
      <div class="form-grid">
        ${ADMIN_PRODUCT_LEGAL_FIELDS.map(field => renderAdminProductDetailInput(field, product)).join('')}
      </div>
    </div>
  `;
}

function collectAdminProductDetailPayload() {
  const payload = {};
  [...ADMIN_PRODUCT_DETAIL_FIELDS, ...ADMIN_PRODUCT_LEGAL_FIELDS].forEach(field => {
    payload[field.key] = document.getElementById(`p-${field.key}`)?.value.trim() || '';
  });
  payload.productHighlights = (document.getElementById('p-productHighlights')?.value || '')
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);
  payload.careInstructions = document.getElementById('p-careInstructions')?.value.trim() || '';
  payload.searchKeywords = document.getElementById('p-searchKeywords')?.value.trim() || '';
  payload.returnPolicyText = document.getElementById('p-returnPolicyText')?.value.trim() || '';
  return payload;
}

function copyAdminProductDetailFields(source = {}) {
  const detail = {};
  [...ADMIN_PRODUCT_DETAIL_FIELDS, ...ADMIN_PRODUCT_LEGAL_FIELDS].forEach(field => {
    detail[field.key] = source[field.key] || '';
  });
  detail.productHighlights = Array.isArray(source.productHighlights) ? [...source.productHighlights] : [];
  detail.careInstructions = source.careInstructions || '';
  detail.searchKeywords = source.searchKeywords || '';
  detail.returnPolicyText = source.returnPolicyText || '';
  return detail;
}

function getAdminProductTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ADMIN_PRODUCT_TEMPLATE_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getAdminLastProductTemplate(storeType = adminProductManagerState.storeType) {
  const templates = getAdminProductTemplates();
  const template = templates[storeType || 'main'];
  return template?.payload ? template : null;
}

function saveAdminLastProductTemplate(payload = {}, product = {}) {
  try {
    const storeType = payload.storeType || adminProductManagerState.storeType || 'main';
    const templates = getAdminProductTemplates();
    templates[storeType] = {
      productName: product.name || payload.name || 'Last product',
      savedAt: new Date().toISOString(),
      payload: createAdminDraftFromPayload(payload)
    };
    localStorage.setItem(ADMIN_PRODUCT_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.warn('Unable to save product template:', error.message);
  }
}

function clearAdminLastProductTemplate() {
  const storeType = adminProductManagerState.storeType || 'main';
  const templates = getAdminProductTemplates();
  delete templates[storeType];
  localStorage.setItem(ADMIN_PRODUCT_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  toast('Last product suggestion cleared', 'success');
  renderAdminProductManager();
}

function applyAdminLastProductTemplate() {
  const template = getAdminLastProductTemplate();
  if (!template?.payload) return toast('No saved product suggestion found', 'error');
  adminProductManagerState.editingProduct = {
    ...template.payload,
    storeType: adminProductManagerState.storeType,
    status: template.payload.status || 'published',
    name: '',
    sku: '',
    images: []
  };
  toast('Last product details applied. Add name, SKU and images.', 'success');
  renderAdminProductManager();
  setTimeout(() => document.getElementById('p-name')?.focus(), 60);
}

function renderAdminProductTemplateSuggestion(isEdit = false) {
  if (isEdit) return '';
  const template = getAdminLastProductTemplate();
  if (!template?.payload) return '';
  const payload = template.payload;
  const savedDate = template.savedAt ? formatDate(template.savedAt) : '';
  const chips = [
    adminProductManagerSlugLabel(payload.category || ''),
    payload.price ? `₹${payload.price}` : '',
    payload.mrp ? `MRP ₹${payload.mrp}` : '',
    payload.baseMaterial || payload.type || '',
    payload.gstRate ? `GST ${payload.gstRate}%` : '',
    payload.hsn ? `HSN ${payload.hsn}` : ''
  ].filter(Boolean).slice(0, 6);
  return `
    <div style="border:1px solid rgba(201,106,138,.28);background:#fff7fb;border-radius:14px;padding:1rem;margin-bottom:1rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;">
      <div>
        <div style="font-weight:800;color:var(--dark);margin-bottom:.25rem;"><i class="fas fa-wand-magic-sparkles"></i> Last product suggestion</div>
        <div style="font-size:.85rem;color:var(--gray);">Saved from "${adminProductManagerEscape(template.productName || 'last product')}"${savedDate ? ` on ${savedDate}` : ''}. Use common price, GST, specs, policy and category for the next product.</div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.65rem;">
          ${chips.map(chip => `<span style="font-size:.75rem;font-weight:700;background:#fff;border:1px solid rgba(201,106,138,.2);border-radius:999px;padding:.28rem .55rem;color:var(--rose-dark);">${adminProductManagerEscape(chip)}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        <button class="btn-primary btn-sm" type="button" onclick="applyAdminLastProductTemplate()">Use Last Details</button>
        <button class="btn-outline btn-sm" type="button" onclick="clearAdminLastProductTemplate()">Clear</button>
      </div>
    </div>
  `;
}

function snapshotAdminProductManagerDraft() {
  if (!document.getElementById('p-name') || !adminProductFormState) return adminProductManagerState.editingProduct;
  try {
    const payload = collectAdminProductPayload();
    return {
      ...adminProductManagerState.editingProduct,
      ...payload,
      id: adminProductManagerState.editingProduct?.id || '',
      images: [...(payload.existingImages || [])],
      variants: [...(payload.variants || [])],
      storeType: payload.storeType || adminProductManagerState.storeType,
      status: payload.status || 'published',
      hasVariants: Boolean(payload.hasVariants),
      featured: payload.featured === true || payload.featured === 'true',
      popular: payload.popular === true || payload.popular === 'true',
      trending: payload.trending === true || payload.trending === 'true',
      newArrival: payload.newArrival === true || payload.newArrival === 'true',
      sale: payload.sale === true || payload.sale === 'true'
    };
  } catch {
    return adminProductManagerState.editingProduct;
  }
}

async function loadAdminProductManagerData(storeType = 'main') {
  const [productsRaw, categoriesRaw] = await Promise.all([
    api(`/api/products?storeType=${storeType}`),
    api(`/api/categories?storeType=${storeType}`)
  ]);
  adminProductManagerState.storeType = storeType;
  adminProductManagerState.products = Array.isArray(productsRaw) ? [...productsRaw] : [];
  adminProductManagerState.categories = Array.isArray(categoriesRaw) ? [...categoriesRaw] : [];
  adminProductManagerState.selectedIds = new Set();
}

function getAdminProductManagerFilteredProducts() {
  const { search, sku, category, status, sort } = adminProductManagerState.filters;
  let products = [...adminProductManagerState.products];
  if (search) {
    const needle = String(search).trim().toLowerCase();
    products = products.filter(product =>
      String(product.name || '').toLowerCase().includes(needle) ||
      String(product.description || '').toLowerCase().includes(needle) ||
      String(product.sku || '').toLowerCase().includes(needle)
    );
  }
  if (sku) {
    const needle = String(sku).trim().toLowerCase();
    products = products.filter(product => String(product.sku || '').toLowerCase().includes(needle));
  }
  if (category) products = products.filter(product => product.category === category);
  if (status) products = products.filter(product => String(product.status || 'published') === status);

  if (sort === 'price-asc') products.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  else if (sort === 'price-desc') products.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  else if (sort === 'stock') products.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
  else if (sort === 'oldest') products.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  else products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return products;
}

function renderAdminProductManagerTable() {
  const filtered = getAdminProductManagerFilteredProducts();
  const total = filtered.length;
  const pageSize = Number(adminProductManagerState.pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  adminProductManagerState.page = Math.min(Math.max(1, adminProductManagerState.page), totalPages);
  const start = (adminProductManagerState.page - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const selectedCount = adminProductManagerState.selectedIds.size;

  return `
    <div id="admin-product-manager-list" class="admin-form" style="margin-top:1.5rem;">
      <div class="admin-header" style="margin-bottom:1rem;align-items:flex-end;">
        <div>
          <h2 class="admin-page-title" style="font-size:1.45rem;margin-bottom:.2rem;">${getAdminStoreLabel(adminProductManagerState.storeType)} Product List</h2>
          <p style="color:var(--gray);font-size:.88rem;">${total} total products. Saved items appear here instantly.</p>
        </div>
        <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;">
          <label style="font-size:.85rem;color:var(--gray);">Per page
            <select id="admin-product-page-size" onchange="setAdminProductManagerPageSize(this.value)" style="margin-left:.45rem;">
              ${[10,25,50,100].map(size => `<option value="${size}" ${pageSize === size ? 'selected' : ''}>${size}</option>`).join('')}
            </select>
          </label>
          <button class="btn-outline" onclick="refreshAdminProductManagerList(true)"><i class="fas fa-rotate-right"></i> Refresh</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem;margin-bottom:1rem;">
        <input id="admin-product-filter-search" placeholder="Search by name" value="${adminProductManagerEscape(adminProductManagerState.filters.search)}" oninput="updateAdminProductManagerFilter('search', this.value)" />
        <input id="admin-product-filter-sku" placeholder="Search by SKU" value="${adminProductManagerEscape(adminProductManagerState.filters.sku)}" oninput="updateAdminProductManagerFilter('sku', this.value)" />
        <select onchange="updateAdminProductManagerFilter('category', this.value)">
          <option value="">All Collections</option>
          ${adminProductManagerState.categories.map(category => `<option value="${category.slug}" ${adminProductManagerState.filters.category === category.slug ? 'selected' : ''}>${adminProductManagerEscape(category.name)}</option>`).join('')}
        </select>
        <select onchange="updateAdminProductManagerFilter('status', this.value)">
          <option value="">All Status</option>
          <option value="published" ${adminProductManagerState.filters.status === 'published' ? 'selected' : ''}>Published</option>
          <option value="draft" ${adminProductManagerState.filters.status === 'draft' ? 'selected' : ''}>Draft</option>
        </select>
        <select onchange="updateAdminProductManagerFilter('sort', this.value)">
          <option value="latest" ${adminProductManagerState.filters.sort === 'latest' ? 'selected' : ''}>Latest</option>
          <option value="oldest" ${adminProductManagerState.filters.sort === 'oldest' ? 'selected' : ''}>Oldest</option>
          <option value="price-asc" ${adminProductManagerState.filters.sort === 'price-asc' ? 'selected' : ''}>Price Low to High</option>
          <option value="price-desc" ${adminProductManagerState.filters.sort === 'price-desc' ? 'selected' : ''}>Price High to Low</option>
          <option value="stock" ${adminProductManagerState.filters.sort === 'stock' ? 'selected' : ''}>Stock</option>
        </select>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem;padding:.85rem 1rem;border:1px solid var(--border);border-radius:14px;background:#fffafc;">
        <div style="font-size:.9rem;color:var(--dark);font-weight:600;">${selectedCount ? `${selectedCount} selected` : 'Bulk actions ready'}</div>
        <div style="display:flex;gap:.65rem;flex-wrap:wrap;align-items:center;">
          <select id="admin-product-bulk-action">
            <option value="">Select bulk action</option>
            <option value="publish">Publish</option>
            <option value="draft">Move to Draft</option>
            <option value="change-category">Change Collection</option>
            <option value="delete">Delete</option>
            <option value="export">Export CSV</option>
          </select>
          <button class="btn-outline" onclick="applyAdminProductBulkAction()">Apply</button>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table style="min-width:1240px;">
          <thead>
            <tr>
              <th><input type="checkbox" onchange="toggleAdminProductSelectionForVisible(this.checked)" ${visible.length && visible.every(product => adminProductManagerState.selectedIds.has(product.id)) ? 'checked' : ''}></th>
              <th>Product Image</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Collection</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${visible.length ? visible.map(product => {
              const safeName = String(product.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              return `<tr>
                <td><input type="checkbox" onchange="toggleAdminProductSelection('${product.id}', this.checked)" ${adminProductManagerState.selectedIds.has(product.id) ? 'checked' : ''}></td>
                <td><img src="${safeImageUrl(product.images?.[0], product.category)}" ${imageFallbackAttr(product.category, product.images?.[0])} style="width:48px;height:48px;border-radius:10px;object-fit:cover;background:#fff;border:1px solid #eee;"></td>
                <td><div style="font-weight:700;">${adminProductManagerEscape(product.name)}</div><div style="font-size:.72rem;color:var(--gray);">${adminProductManagerEscape(product.id || '')}</div></td>
                <td>${getAdminStoreLabel(product.storeType || adminProductManagerState.storeType)}</td>
                <td>${adminProductManagerEscape(adminProductManagerSlugLabel(product.category))}</td>
                <td>${adminProductManagerEscape(product.sku || '-')}</td>
                <td>${formatCurrency(product.price || 0)}</td>
                <td><span style="color:${Number(product.stock || 0) > 0 ? '#166534' : '#b91c1c'};font-weight:700;">${Number(product.stock || 0)}</span></td>
                <td><span style="padding:4px 10px;border-radius:999px;font-size:.72rem;font-weight:700;background:${String(product.status || 'published') === 'draft' ? '#fff7ed' : '#ecfdf3'};color:${String(product.status || 'published') === 'draft' ? '#b45309' : '#166534'};">${String(product.status || 'published') === 'draft' ? 'Draft' : 'Published'}</span></td>
                <td>${formatDate(product.createdAt || product.updatedAt || Date.now())}</td>
                <td>
                  <div style="display:flex;gap:.35rem;flex-wrap:wrap;">
                    <button class="btn-outline btn-sm" onclick="viewAdminProduct('${product.id}')" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn-outline btn-sm" onclick="adminEditProduct('${product.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-outline btn-sm" onclick="duplicateAdminProduct('${product.id}')" title="Duplicate"><i class="fas fa-copy"></i></button>
                    <button class="btn-outline btn-sm" onclick="openAdminProductInventory('${product.id}')" title="Inventory"><i class="fas fa-box"></i></button>
                    <button class="btn-danger btn-sm" onclick="adminDeleteProduct('${product.id}','${safeName}')" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;" title="Delete"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>`;
            }).join('') : `<tr><td colspan="11" style="text-align:center;padding:1.5rem;color:var(--gray);">No products found for the current filters.</td></tr>`}
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-top:1rem;">
        <div style="font-size:.85rem;color:var(--gray);">Showing ${total ? start + 1 : 0}-${Math.min(start + pageSize, total)} of ${total}</div>
        <div style="display:flex;gap:.5rem;align-items:center;">
          <button class="btn-outline btn-sm" onclick="setAdminProductManagerPage(${adminProductManagerState.page - 1})" ${adminProductManagerState.page <= 1 ? 'disabled' : ''}>Previous</button>
          <span style="font-size:.85rem;font-weight:600;">Page ${adminProductManagerState.page} / ${totalPages}</span>
          <button class="btn-outline btn-sm" onclick="setAdminProductManagerPage(${adminProductManagerState.page + 1})" ${adminProductManagerState.page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    </div>
  `;
}

function renderAdminProductManager(preserveDraft = false) {
  if (preserveDraft) {
    adminProductManagerState.editingProduct = snapshotAdminProductManagerDraft();
  }
  const product = adminProductManagerState.editingProduct;
  const isEdit = !!(product && product.id);
  const cats = adminProductManagerState.categories || [];
  const catOptions = cats.length
    ? cats.map(category => `<option value="${category.slug}" ${product?.category === category.slug ? 'selected' : ''}>${adminProductManagerEscape(category.name)}</option>`).join('')
    : '<option value="others">General</option>';

  adminProductFormState = {
    allCategories: [...cats],
    images: Array.isArray(product?.images) ? [...product.images] : [],
    hasVariants: Boolean(product?.hasVariants),
    variantType: product?.variantType || 'color',
    variants: Array.isArray(product?.variants) && product.variants.length ? product.variants.map(variant => createEmptyVariantRow(product?.variantType || 'color', variant)) : []
  };
  const isWoollenStore = adminProductManagerState.storeType === 'woollen';
  const productNamePlaceholder = isWoollenStore ? 'e.g. Crochet Hair Clip Set' : 'e.g. Rose Gold Hoop Earrings';
  const skuPlaceholder = isWoollenStore ? 'WOL-001' : 'LEN-001';
  const hsnDefault = isWoollenStore ? '6117' : '7117';
  const descriptionPlaceholder = isWoollenStore ? 'Soft handmade woollen piece, colour, size, care and use...' : 'Product description...';

  document.getElementById('admin-content').innerHTML = `
    <div class="admin-header" style="align-items:flex-end;">
      <div>
        <h1 class="admin-page-title">${getAdminStoreLabel(adminProductManagerState.storeType)} Product Manager</h1>
        <p style="color:var(--gray);font-size:.9rem;">Shopify-style add, edit, preview, and manage flow for ${getAdminStoreLabel(adminProductManagerState.storeType).toLowerCase()} products.</p>
      </div>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
        <button class="btn-primary" onclick="adminAddProduct()"><i class="fas fa-plus"></i> New Product</button>
        <button class="btn-outline" onclick="showAddCategory('${adminProductManagerState.storeType}')"><i class="fas fa-layer-group"></i> ${getAdminStoreLabel(adminProductManagerState.storeType)} Collections</button>
      </div>
    </div>

    <div class="admin-form">
      <div class="admin-header" style="margin-bottom:1rem;align-items:flex-end;">
        <div>
          <h2 class="admin-page-title" style="font-size:1.45rem;">${isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <p style="color:var(--gray);font-size:.88rem;">Upload multiple images, preview instantly, and keep adding products without leaving the page.</p>
        </div>
        <label style="display:flex;align-items:center;gap:.5rem;font-size:.88rem;font-weight:600;">
          <input type="checkbox" ${adminProductManagerState.keepValues ? 'checked' : ''} onchange="toggleAdminProductKeepValues(this.checked)">
          Keep form values
        </label>
      </div>

      ${renderAdminProductTemplateSuggestion(isEdit)}

      <div class="form-grid">
        <div class="form-group"><label>Product Name *</label><input id="p-name" value="${adminProductManagerEscape(product?.name || '')}" placeholder="${productNamePlaceholder}"/></div>
        <div class="form-group"><label>Collection *</label><select id="p-cat">${catOptions}</select></div>
        <div class="form-group"><label>Store</label><select id="p-store-type" disabled><option value="main" ${adminProductManagerState.storeType !== 'woollen' ? 'selected' : ''}>Main Jewellery Store</option><option value="woollen" ${adminProductManagerState.storeType === 'woollen' ? 'selected' : ''}>Woollen Store</option></select></div>
        <div class="form-group"><label>Status</label><select id="p-status"><option value="published" ${String(product?.status || 'published') === 'published' ? 'selected' : ''}>Published</option><option value="draft" ${String(product?.status || '') === 'draft' ? 'selected' : ''}>Draft</option></select></div>
        <div class="form-group"><label>Has Variants?</label><select id="p-has-variants" onchange="toggleAdminVariantSection()"><option value="false" ${!adminProductFormState.hasVariants ? 'selected' : ''}>No</option><option value="true" ${adminProductFormState.hasVariants ? 'selected' : ''}>Yes</option></select></div>
        <div class="form-group"><label>Selling Price (₹) *</label><input id="p-price" type="number" value="${product?.price || ''}" placeholder="599"/></div>
        <div class="form-group"><label>MRP (₹) *</label><input id="p-mrp" type="number" value="${product?.mrp || ''}" placeholder="999"/></div>
        <div class="form-group"><label>Discount (%)</label><input id="p-discount" type="number" value="${product?.discount || ''}" placeholder="40"/></div>
        <div class="form-group"><label>Stock Quantity *</label><input id="p-stock" type="number" value="${product?.stock || ''}" placeholder="50"/></div>
        <div class="form-group"><label>SKU</label><input id="p-sku" value="${adminProductManagerEscape(product?.sku || '')}" placeholder="${skuPlaceholder}"/></div>
        <div class="form-group"><label>GST Rate (%)</label><input id="p-gst" type="number" value="${product?.gstRate || 3}" placeholder="3"/></div>
        <div class="form-group"><label>HSN Code</label><input id="p-hsn" value="${adminProductManagerEscape(product?.hsn || hsnDefault)}" placeholder="${hsnDefault}"/></div>
      </div>

      <div class="form-group"><label>Description *</label><textarea id="p-desc" rows="4" placeholder="${descriptionPlaceholder}">${adminProductManagerEscape(product?.description || '')}</textarea></div>

      ${renderAdminProductDetailSection(product)}

      <div id="admin-variant-section" style="display:${adminProductFormState.hasVariants ? 'block' : 'none'};margin-bottom:1.5rem;border:1px solid var(--border);border-radius:16px;padding:1rem;">
        <div class="form-grid"><div class="form-group"><label>Variant Type</label><select id="p-variant-type" onchange="renderAdminVariantRows()">${['color','size','weight','material','length','custom'].map(type => `<option value="${type}" ${adminProductFormState.variantType===type?'selected':''}>${type.charAt(0).toUpperCase()+type.slice(1)}</option>`).join('')}</select></div></div>
        <div id="admin-variant-rows"></div>
        <button class="btn-outline" type="button" onclick="addAdminVariantRow()"><i class="fas fa-plus"></i> Add Variant</button>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Featured Product</label><select id="p-featured"><option value="false" ${!product?.featured?'selected':''}>No</option><option value="true" ${product?.featured?'selected':''}>Yes</option></select></div>
        <div class="form-group"><label>Best Seller</label><select id="p-popular"><option value="false" ${!product?.popular?'selected':''}>No</option><option value="true" ${product?.popular?'selected':''}>Yes - Show in Best Sellers</option></select></div>
        <div class="form-group"><label>Trending</label><select id="p-trending"><option value="false" ${!product?.trending?'selected':''}>No</option><option value="true" ${product?.trending?'selected':''}>Yes</option></select></div>
        <div class="form-group"><label>New Arrival</label><select id="p-new-arrival"><option value="false" ${!product?.newArrival?'selected':''}>No</option><option value="true" ${product?.newArrival?'selected':''}>Yes</option></select></div>
        <div class="form-group"><label>Sale</label><select id="p-sale"><option value="false" ${!product?.sale?'selected':''}>No</option><option value="true" ${product?.sale?'selected':''}>Yes</option></select></div>
      </div>

      <div class="form-group">
        <label>Product Images (First image becomes main image)</label>
        <div id="admin-product-dropzone" style="border:2px dashed rgba(201,106,138,.35);border-radius:16px;padding:1rem;background:#fffafc;">
          <div style="display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-bottom:.75rem;">
            <input type="file" id="p-image-upload" accept="image/*" multiple onchange="handleAdminProductImageInput(event)" />
            <span style="font-size:.82rem;color:var(--gray);">Drag and drop or choose multiple images. Preview appears below.</span>
          </div>
          <div id="admin-product-upload-status" style="font-size:.8rem;color:${adminProductManagerState.uploadingCount ? '#b45309' : 'var(--gray)'};">${adminProductManagerState.uploadingCount ? `Uploading ${adminProductManagerState.uploadingCount} image(s)...` : 'Upload now, preview instantly, and reorder before saving.'}</div>
        </div>
        <div id="admin-product-image-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,140px));justify-content:start;align-items:start;gap:12px;margin-top:1rem;"></div>
      </div>

      <div style="display:flex;gap:1rem;flex-wrap:wrap;">
        <button class="btn-primary" id="admin-product-submit" onclick="${isEdit ? `saveEditProduct('${product.id}')` : 'saveNewProduct()'}">${isEdit ? 'Save Changes' : 'Add Product ✦'}</button>
        <button class="btn-outline" onclick="resetAdminProductForm()">Clear Form</button>
      </div>
    </div>

    ${renderAdminProductManagerTable()}
  `;

  const storeSelect = document.getElementById('p-store-type');
  const categorySelect = document.getElementById('p-cat');
  if (storeSelect) storeSelect.addEventListener('change', () => {
    adminProductManagerState.storeType = storeSelect.value === 'woollen' ? 'woollen' : 'main';
    refreshAdminProductCategoryOptions(product?.category || '');
  });
  if (categorySelect) categorySelect.addEventListener('change', () => {
    renderAdminProductImages();
    renderAdminVariantRows();
  });

  toggleAdminVariantSection();
  refreshAdminProductCategoryOptions(product?.category || '');
  renderAdminProductImages();
  renderAdminVariantRows();
  bindAdminProductDropzone();
}

function bindAdminProductDropzone() {
  const zone = document.getElementById('admin-product-dropzone');
  if (!zone) return;
  ['dragenter', 'dragover'].forEach(eventName => zone.addEventListener(eventName, (event) => {
    event.preventDefault();
    zone.style.borderColor = 'var(--rose)';
    zone.style.background = '#fff5f8';
  }));
  ['dragleave', 'drop'].forEach(eventName => zone.addEventListener(eventName, (event) => {
    event.preventDefault();
    zone.style.borderColor = 'rgba(201,106,138,.35)';
    zone.style.background = '#fffafc';
  }));
  zone.addEventListener('drop', async (event) => {
    const files = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'));
    await handleAdminProductFiles(files);
  });
}

async function refreshAdminProductManagerList(reloadFromServer = false) {
  const draft = snapshotAdminProductManagerDraft();
  if (reloadFromServer) {
    await loadAdminProductManagerData(adminProductManagerState.storeType);
  }
  adminProductManagerState.editingProduct = draft;
  renderAdminProductManager();
}

function updateAdminProductManagerFilter(key, value) {
  adminProductManagerState.editingProduct = snapshotAdminProductManagerDraft();
  adminProductManagerState.filters[key] = value;
  adminProductManagerState.page = 1;
  renderAdminProductManager();
}

function setAdminProductManagerPage(page) {
  adminProductManagerState.editingProduct = snapshotAdminProductManagerDraft();
  adminProductManagerState.page = Math.max(1, Number(page) || 1);
  renderAdminProductManager();
}

function setAdminProductManagerPageSize(size) {
  adminProductManagerState.editingProduct = snapshotAdminProductManagerDraft();
  adminProductManagerState.pageSize = Number(size) || 10;
  adminProductManagerState.page = 1;
  renderAdminProductManager();
}

function toggleAdminProductKeepValues(checked) {
  adminProductManagerState.keepValues = Boolean(checked);
}

function toggleAdminProductSelection(id, checked) {
  adminProductManagerState.editingProduct = snapshotAdminProductManagerDraft();
  if (checked) adminProductManagerState.selectedIds.add(id);
  else adminProductManagerState.selectedIds.delete(id);
  renderAdminProductManager();
}

function toggleAdminProductSelectionForVisible(checked) {
  adminProductManagerState.editingProduct = snapshotAdminProductManagerDraft();
  const filtered = getAdminProductManagerFilteredProducts();
  const visible = filtered.slice((adminProductManagerState.page - 1) * adminProductManagerState.pageSize, adminProductManagerState.page * adminProductManagerState.pageSize);
  visible.forEach(product => {
    if (checked) adminProductManagerState.selectedIds.add(product.id);
    else adminProductManagerState.selectedIds.delete(product.id);
  });
  renderAdminProductManager();
}

async function adminProducts() {
  await loadAdminProductManagerData('main');
  adminProductManagerState.editingProduct = null;
  renderAdminProductManager();
}

async function adminWoollen() {
  await loadAdminProductManagerData('woollen');
  adminProductManagerState.editingProduct = null;
  renderAdminProductManager();
}

async function adminAddProduct(product = null) {
  const nextStoreType = product?.storeType || adminProductManagerState.storeType || 'main';
  if (adminProductManagerState.storeType !== nextStoreType || !adminProductManagerState.categories.length) {
    await loadAdminProductManagerData(nextStoreType);
  }
  adminProductManagerState.editingProduct = product ? { ...product } : { storeType: nextStoreType, status: 'published' };
  renderAdminProductManager();
}

async function adminAddWoollenProduct() {
  await loadAdminProductManagerData('woollen');
  adminProductManagerState.editingProduct = { storeType: 'woollen', status: 'published' };
  renderAdminProductManager();
}

async function adminEditProduct(id) {
  const current = adminProductManagerState.products.find(product => String(product.id) === String(id));
  const product = current || await api('/api/products/' + id);
  if (product?.error) return toast(product.error, 'error');
  adminProductManagerState.editingProduct = { ...product };
  renderAdminProductManager();
  setTimeout(() => document.getElementById('p-name')?.focus(), 60);
}

function resetAdminProductForm() {
  adminProductManagerState.editingProduct = { storeType: adminProductManagerState.storeType, status: 'published' };
  renderAdminProductManager();
}

async function handleAdminProductFiles(files) {
  const list = Array.from(files || []).filter(file => file && file.type?.startsWith('image/'));
  if (!list.length || !adminProductFormState) return;
  const category = document.getElementById('p-cat')?.value || 'general';
  adminProductManagerState.uploadingCount += list.length;
  renderAdminProductManager(true);
  try {
    for (const file of list) {
      const tempUrl = URL.createObjectURL(file);
      adminProductFormState.images.push(tempUrl);
      renderAdminProductImages();
      const placeholderIndex = adminProductFormState.images.length - 1;
      try {
        const uploadedUrl = await uploadAdminMediaFile(file, `products/${category}`);
        adminProductFormState.images[placeholderIndex] = uploadedUrl;
        renderAdminProductImages();
      } catch (error) {
        adminProductFormState.images = adminProductFormState.images.filter((_, index) => index !== placeholderIndex);
        renderAdminProductImages();
        throw error;
      } finally {
        URL.revokeObjectURL(tempUrl);
      }
    }
    toast('Images uploaded successfully', 'success');
  } catch (error) {
    toast(error.message || 'Image upload failed', 'error');
  } finally {
    adminProductManagerState.uploadingCount = Math.max(0, adminProductManagerState.uploadingCount - list.length);
    const status = document.getElementById('admin-product-upload-status');
    if (status) status.textContent = adminProductManagerState.uploadingCount ? `Uploading ${adminProductManagerState.uploadingCount} image(s)...` : 'Upload now, preview instantly, and reorder before saving.';
    const input = document.getElementById('p-image-upload');
    if (input) input.value = '';
  }
}

async function handleAdminProductImageInput(event) {
  await handleAdminProductFiles(Array.from(event.target.files || []));
}

function collectAdminProductPayload() {
  const hasVariants = document.getElementById('p-has-variants')?.value === 'true';
  adminProductFormState.hasVariants = hasVariants;
  adminProductFormState.variantType = document.getElementById('p-variant-type')?.value || adminProductFormState.variantType || 'color';
  return {
    name: document.getElementById('p-name').value.trim(),
    category: document.getElementById('p-cat').value,
    storeType: document.getElementById('p-store-type').value,
    status: document.getElementById('p-status').value,
    hasVariants,
    variantType: adminProductFormState.variantType,
    price: document.getElementById('p-price').value,
    mrp: document.getElementById('p-mrp').value,
    discount: document.getElementById('p-discount').value,
    stock: document.getElementById('p-stock').value,
    sku: document.getElementById('p-sku').value.trim(),
    gstRate: document.getElementById('p-gst').value,
    hsn: document.getElementById('p-hsn').value,
    description: document.getElementById('p-desc').value.trim(),
    ...collectAdminProductDetailPayload(),
    featured: document.getElementById('p-featured').value,
    popular: document.getElementById('p-popular').value,
    trending: document.getElementById('p-trending').value,
    newArrival: document.getElementById('p-new-arrival').value,
    sale: document.getElementById('p-sale').value,
    existingImages: adminProductFormState.images.filter(image => !String(image || '').startsWith('blob:')),
    imageOrder: adminProductFormState.images.filter(image => !String(image || '').startsWith('blob:')),
    variants: hasVariants ? adminProductFormState.variants.map(variant => ({
      ...variant,
      label: String(variant.label || '').trim(),
      value: String(variant.label || variant.value || '').trim(),
      price: Number(variant.price) || 0,
      mrp: Number(variant.mrp) || Number(variant.price) || 0,
      stock: Number(variant.stock) || 0,
      sku: String(variant.sku || '').trim(),
      images: Array.isArray(variant.images) ? variant.images.filter(image => !String(image || '').startsWith('blob:')) : []
    })) : []
  };
}

function createAdminDraftFromPayload(payload) {
  return {
    name: '',
    category: payload.category,
    storeType: payload.storeType,
    status: payload.status,
    hasVariants: payload.hasVariants,
    variantType: payload.variantType,
    price: payload.price,
    mrp: payload.mrp,
    discount: payload.discount,
    stock: payload.stock,
    sku: '',
    gstRate: payload.gstRate,
    hsn: payload.hsn,
    description: payload.description,
    ...copyAdminProductDetailFields(payload),
    featured: payload.featured === 'true' || payload.featured === true,
    popular: payload.popular === 'true' || payload.popular === true,
    trending: payload.trending === 'true' || payload.trending === true,
    newArrival: payload.newArrival === 'true' || payload.newArrival === true,
    sale: payload.sale === 'true' || payload.sale === true,
    images: [],
    variants: (payload.variants || []).map(variant => ({ ...variant, images: [] }))
  };
}

async function submitAdminProduct(id = '') {
  if (adminProductManagerState.uploadingCount > 0) {
    return toast('Please wait for image uploads to finish', 'error');
  }
  const payload = collectAdminProductPayload();
  const validationError = validateAdminProductPayload(payload);
  if (validationError) return toast(validationError, 'error');

  const button = document.getElementById('admin-product-submit');
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${id ? 'Saving...' : 'Adding...'}`;
  }

  const response = await api(id ? `/api/products/${id}` : '/api/products', {
    method: id ? 'PUT' : 'POST',
    timeoutMs: 20000,
    body: {
      ...payload,
      variants: JSON.stringify(payload.variants),
      existingImages: JSON.stringify(payload.existingImages),
      imageOrder: JSON.stringify(payload.imageOrder),
      removedImages: JSON.stringify([])
    }
  });

  if (button) {
    button.disabled = false;
    button.innerHTML = id ? 'Save Changes' : 'Add Product ✦';
  }

  if (response.error || !response.product) {
    return toast(response.error || 'Product save failed', 'error');
  }

  const nextProduct = response.product;
  const idx = adminProductManagerState.products.findIndex(product => String(product.id) === String(nextProduct.id));
  if (idx >= 0) adminProductManagerState.products[idx] = nextProduct;
  else adminProductManagerState.products.unshift(nextProduct);
  adminProductManagerState.page = 1;
  toast(response.message || (id ? 'Product updated successfully' : 'Product added successfully'), 'success');
  saveAdminLastProductTemplate(payload, nextProduct);

  if (id) {
    adminProductManagerState.editingProduct = { ...nextProduct };
  } else {
    adminProductManagerState.editingProduct = adminProductManagerState.keepValues ? createAdminDraftFromPayload(payload) : { storeType: adminProductManagerState.storeType, status: 'published' };
  }
  renderAdminProductManager();
}

async function saveNewProduct() { await submitAdminProduct(); }
async function saveEditProduct(id) { await submitAdminProduct(id); }

async function adminDeleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
  const response = await api('/api/products/' + id, { method: 'DELETE' });
  if (response.error) return toast(response.error, 'error');
  adminProductManagerState.products = adminProductManagerState.products.filter(product => String(product.id) !== String(id));
  adminProductManagerState.selectedIds.delete(id);
  if (String(adminProductManagerState.editingProduct?.id || '') === String(id)) {
    adminProductManagerState.editingProduct = { storeType: adminProductManagerState.storeType, status: 'published' };
  }
  toast('Product deleted successfully', 'success');
  renderAdminProductManager();
}

function buildAdminProductBodyFromRecord(product, overrides = {}) {
  const merged = { ...product, ...overrides };
  return {
    name: merged.name,
    category: merged.category,
    storeType: merged.storeType || adminProductManagerState.storeType,
    status: merged.status || 'published',
    hasVariants: merged.hasVariants ? 'true' : 'false',
    variantType: merged.variantType || '',
    price: merged.price || 0,
    mrp: merged.mrp || 0,
    discount: merged.discount || 0,
    stock: merged.stock || 0,
    sku: merged.sku || '',
    gstRate: merged.gstRate || 3,
    hsn: merged.hsn || '7117',
    description: merged.description || '',
    ...copyAdminProductDetailFields(merged),
    featured: merged.featured ? 'true' : 'false',
    popular: merged.popular ? 'true' : 'false',
    trending: merged.trending ? 'true' : 'false',
    newArrival: merged.newArrival ? 'true' : 'false',
    sale: merged.sale ? 'true' : 'false',
    variants: JSON.stringify(Array.isArray(merged.variants) ? merged.variants : []),
    existingImages: JSON.stringify(Array.isArray(merged.images) ? merged.images : []),
    imageOrder: JSON.stringify(Array.isArray(merged.images) ? merged.images : []),
    removedImages: JSON.stringify([])
  };
}

async function duplicateAdminProduct(id) {
  const source = adminProductManagerState.products.find(product => String(product.id) === String(id));
  if (!source) return toast('Product not found', 'error');
  const response = await api('/api/products', {
    method: 'POST',
    body: buildAdminProductBodyFromRecord(source, {
      name: `${source.name} Copy`,
      sku: source.sku ? `${source.sku}-COPY` : ''
    })
  });
  if (response.error || !response.product) return toast(response.error || 'Duplicate failed', 'error');
  adminProductManagerState.products.unshift(response.product);
  adminProductManagerState.page = 1;
  toast('Product duplicated successfully', 'success');
  renderAdminProductManager(true);
}

function viewAdminProduct(id) {
  const product = adminProductManagerState.products.find(item => String(item.id) === String(id));
  if (!product) return;
  navigate(productRoutePath(product));
}

function openAdminProductInventory(id) {
  adminEditProduct(id);
  setTimeout(() => document.getElementById('p-stock')?.focus(), 80);
}

function exportAdminProductsCsv(records) {
  const list = Array.isArray(records) && records.length ? records : getAdminProductManagerFilteredProducts();
  const rows = [
    ['Name', 'SKU', 'Category', 'Store', 'Price', 'MRP', 'Stock', 'Status', 'Created Date']
  ];
  list.forEach(product => rows.push([
    product.name || '',
    product.sku || '',
    adminProductManagerSlugLabel(product.category),
    getAdminStoreLabel(product.storeType || adminProductManagerState.storeType),
    product.price || 0,
    product.mrp || 0,
    product.stock || 0,
    product.status || 'published',
    product.createdAt || ''
  ]));
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${adminProductManagerState.storeType}-products.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function applyAdminProductBulkAction() {
  const action = document.getElementById('admin-product-bulk-action')?.value || '';
  const ids = [...adminProductManagerState.selectedIds];
  if (!action) return toast('Choose a bulk action', 'error');

  if (action === 'export') {
    const selected = adminProductManagerState.products.filter(product => ids.includes(product.id));
    exportAdminProductsCsv(selected.length ? selected : getAdminProductManagerFilteredProducts());
    return;
  }

  if (!ids.length) return toast('Select at least one product', 'error');

  let body = { action, ids };
  if (action === 'change-category') {
    const hint = adminProductManagerState.categories.map(category => `${category.name} (${category.slug})`).join(', ');
    const category = prompt(`Enter collection slug.\nAvailable: ${hint}`);
    if (!category) return;
    body.category = category;
  }

  const response = await api('/api/admin/products/bulk', { method: 'POST', body });
  if (response.error) return toast(response.error, 'error');

  if (action === 'delete') {
    adminProductManagerState.products = adminProductManagerState.products.filter(product => !ids.includes(product.id));
  } else if (action === 'publish' || action === 'draft') {
    adminProductManagerState.products = adminProductManagerState.products.map(product => ids.includes(product.id) ? { ...product, status: action === 'publish' ? 'published' : 'draft' } : product);
  } else if (action === 'change-category') {
    adminProductManagerState.products = adminProductManagerState.products.map(product => ids.includes(product.id) ? { ...product, category: body.category } : product);
  }
  adminProductManagerState.selectedIds = new Set();
  toast(response.message || 'Bulk action completed', 'success');
  renderAdminProductManager(true);
}
