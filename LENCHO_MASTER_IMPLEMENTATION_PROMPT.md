# 🚀 LENCHO JEWELLERY WEBSITE — COMPLETE MASTER IMPLEMENTATION PROMPT

**Website:** lencho.in | **Tech Stack:** Node.js + Express + Vanilla JS (NO React/Vue) | **Target:** Indian mobile users  
**Brand Colors:** Rose `#C96A8A` | Gold `#C9954C` | Dark `#18122B`  
**Status:** Partial build complete — needs critical bug fixes, animations, admin features, and performance optimization

---

## 🔴 PRIORITY 1 — CRITICAL BUGS (Fix FIRST)

### BUG #1 — OTP Not Working (MOST URGENT)

**Problem:**
- User enters Gmail ID in signup form
- Admin has configured Gmail SMTP + App Password in settings
- User clicks "Send OTP" → nothing happens OR error message
- OTP email is NOT received by user
- System fails silently OR shows generic error

**Investigation Path in `server.js`:**
```
1. Find the POST /api/auth/send-otp route (or /api/send-otp)
2. Check the sendEmailOTP() function:
   - Is SMTP config being loaded from DB/file BEFORE each send? (NOT cached at startup)
   - Is nodemailer.createTransport() being called with correct Gmail settings?
   - Is transporter.verify() being called? (test connection before sending)
   - Is there a try/catch? (log errors to console)

3. Verify Gmail SMTP settings are EXACTLY:
   host: 'smtp.gmail.com'
   port: 587
   secure: false (NOT true for port 587)
   auth: { user: smtpUser, pass: smtpAppPassword }
   tls: { rejectUnauthorized: false }

4. OTP generation & storage:
   - Generate 6-digit OTP: Math.floor(100000 + Math.random() * 900000)
   - Store with 10-minute expiry in MongoDB otpLogs or data/otps.json
   - Mark as "sent" in logs
```

**Fix Required in `server.js`:**
```javascript
// Route: POST /api/auth/send-otp
// Input: { email, emailType: 'signup' | 'forgot-password' }
// Output: { success: true/false, message: string }

const sendOtpRoute = async (req, res) => {
  try {
    const { email, emailType } = req.body;
    
    // 1. Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email address' 
      });
    }
    
    // 2. Load SMTP settings FRESH from DB (not cached)
    const settings = await getSettingsFromDB(); // or data/settings.json
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
      console.error('SMTP settings not configured in admin panel');
      return res.status(500).json({ 
        success: false, 
        message: 'SMTP is not configured. Admin must add email settings.' 
      });
    }
    
    // 3. Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost || 'smtp.gmail.com',
      port: settings.smtpPort || 587,
      secure: false,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      },
      tls: { rejectUnauthorized: false }
    });
    
    // 4. Test SMTP connection
    const verifyResult = await transporter.verify();
    if (!verifyResult) {
      console.error('SMTP verification failed');
      return res.status(500).json({ 
        success: false, 
        message: 'SMTP configuration error. Check admin settings and Gmail App Password.' 
      });
    }
    
    // 5. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // 6. Save OTP to DB
    await saveOtpToDb(email, otp, expiresAt);
    
    // 7. Send OTP email
    const mailResult = await transporter.sendMail({
      from: settings.smtpUser,
      to: email,
      subject: 'Your OTP for Lencho Account',
      html: `
        <div style="font-family: Arial; text-align: center; padding: 40px;">
          <h2 style="color: #C96A8A;">Lencho Jewellery</h2>
          <p style="font-size: 16px; margin: 20px 0;">Your verification code is:</p>
          <h1 style="color: #C9954C; letter-spacing: 5px; font-size: 36px; margin: 20px 0;">${otp}</h1>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">If you didn't request this, ignore this email.</p>
        </div>
      `
    });
    
    console.log(`OTP sent to ${email}:`, mailResult.messageId);
    
    return res.json({ 
      success: true, 
      message: 'OTP sent to your email' 
    });
    
  } catch (error) {
    console.error('OTP send error:', error.message, error);
    return res.status(500).json({ 
      success: false, 
      message: `OTP error: ${error.message}` 
    });
  }
};

// Route: POST /api/auth/verify-otp
// Input: { email, otp }
// Output: { success: true/false, token, user }

const verifyOtpRoute = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // 1. Find OTP in DB
    const otpRecord = await findOtpInDb(email, otp);
    
    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }
    
    // 2. Check expiry
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP expired. Request a new one.' 
      });
    }
    
    // 3. Check if already used
    if (otpRecord.used) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP already used' 
      });
    }
    
    // 4. Mark OTP as used
    await markOtpAsUsed(email, otp);
    
    // 5. User exists? Create new one if signup
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ 
        email, 
        isVerified: true,
        createdAt: new Date()
      });
    }
    
    // 6. Generate JWT token
    const token = generateJWT(user._id);
    
    // 7. Return token & user
    return res.json({ 
      success: true, 
      message: 'OTP verified',
      token,
      user: { _id: user._id, email: user.email, name: user.name }
    });
    
  } catch (error) {
    console.error('OTP verify error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Verification failed' 
    });
  }
};
```

**Fix Required in `public/js/app.js` (Frontend OTP Flow):**
```javascript
// OTP Signup Flow
async function handleSendOtp() {
  const email = document.getElementById('signup-email').value;
  
  if (!email || !isValidEmail(email)) {
    showError('Enter valid email');
    return;
  }
  
  const sendBtn = document.getElementById('send-otp-btn');
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span> Sending...';
  
  try {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, emailType: 'signup' })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show OTP input field
      document.getElementById('otp-input-section').style.display = 'block';
      document.getElementById('signup-form').style.display = 'none';
      
      showToast('OTP sent to your email!', 'success');
      startResendCountdown(60); // 60 second countdown
    } else {
      showError(data.message || 'Failed to send OTP');
      sendBtn.disabled = false;
      sendBtn.innerHTML = 'Send OTP';
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    showError('Network error. Please try again.');
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'Send OTP';
  }
}

async function handleVerifyOtp() {
  const email = document.getElementById('signup-email').value;
  const otp = document.getElementById('otp-input').value;
  
  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    showError('Enter 6-digit OTP');
    return;
  }
  
  const verifyBtn = document.getElementById('verify-otp-btn');
  verifyBtn.disabled = true;
  verifyBtn.innerHTML = '<span class="spinner"></span> Verifying...';
  
  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Save token & user
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      showToast('✓ Account created! Logging you in...', 'success');
      setTimeout(() => {
        closeAuthModal();
        location.reload(); // Reload to update header
      }, 1000);
    } else {
      showError(data.message || 'OTP verification failed');
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = 'Verify OTP';
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    showError('Verification failed. Please try again.');
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = 'Verify OTP';
  }
}

function startResendCountdown(seconds) {
  const resendBtn = document.getElementById('resend-otp-btn');
  const timerDisplay = document.getElementById('otp-timer');
  
  resendBtn.disabled = true;
  
  const interval = setInterval(() => {
    seconds--;
    timerDisplay.textContent = `Resend OTP in 00:${String(seconds).padStart(2, '0')}`;
    
    if (seconds <= 0) {
      clearInterval(interval);
      resendBtn.disabled = false;
      timerDisplay.textContent = '';
    }
  }, 1000);
}

function handleResendOtp() {
  handleSendOtp(); // Just call send again
}

// OTP Input: Auto-focus to next field when user types 6 digits
document.getElementById('otp-input')?.addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  if (e.target.value.length === 6) {
    document.getElementById('verify-otp-btn').focus();
  }
});
```

**Fix Required in `public/index.html` (Add OTP section):**
```html
<!-- In auth modal, add this section (initially hidden) -->
<div id="otp-input-section" style="display: none; padding: 20px;">
  <h3 style="text-align: center; color: #C9954C; margin-bottom: 20px;">Enter OTP</h3>
  <p style="text-align: center; color: #888; margin-bottom: 20px;">
    We've sent a code to <strong id="otp-email-display"></strong>
  </p>
  
  <input 
    id="otp-input" 
    type="text" 
    placeholder="000000" 
    maxlength="6"
    style="width: 100%; padding: 12px; font-size: 24px; text-align: center; 
           letter-spacing: 10px; border: 2px solid #C9954C; border-radius: 8px;
           background: #1e1535; color: white;"
  />
  
  <button 
    id="verify-otp-btn" 
    style="width: 100%; padding: 12px; margin-top: 20px; background: linear-gradient(135deg, #C96A8A, #C9954C);
           color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;"
  >
    Verify OTP
  </button>
  
  <div style="text-align: center; margin-top: 15px; font-size: 14px; color: #888;">
    <span id="otp-timer"></span>
    <button 
      id="resend-otp-btn" 
      style="background: none; border: none; color: #C9954C; cursor: pointer; text-decoration: underline; margin-left: 10px;"
    >
      Resend OTP
    </button>
  </div>
</div>
```

---

### BUG #2 — Buttons Not Working (Add to Cart, Buy Now, Watchlist)

**Problem:**
- Product cards render but buttons don't respond to clicks
- "Add to Cart" button: click → nothing happens
- "Buy Now" button: click → nothing happens
- "Watchlist" button: click → heart doesn't fill
- Product cards not clickable to open detail page

**Root Cause:**
- Event listeners are attached BEFORE DOM renders (wrong order)
- OR Product cards are rendered as innerHTML AFTER page load, but listeners were only attached at startup
- Solution: Use event delegation (attach listener to parent, detect child clicks)

**Fix in `public/js/pages.js` (Product Rendering):**
```javascript
// Function that renders product cards (called on page load and category filter)
function renderProductCards(products, containerId = 'products-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = products.map(product => `
    <div class="product-card" data-id="${product._id}" style="cursor: pointer;">
      <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-category">${product.category || 'Jewellery'}</p>
      <p class="product-price">₹${product.price}</p>
      
      <div class="product-actions">
        <button class="btn btn-primary add-to-cart-btn" data-id="${product._id}">
          Add to Cart
        </button>
        <button class="btn-icon wishlist-btn" data-id="${product._id}" title="Add to Wishlist">
          ♡
        </button>
      </div>
    </div>
  `).join('');
  
  // IMPORTANT: Event delegation (attach once, works for all dynamically rendered cards)
  attachProductCardEventListeners(container);
}

function attachProductCardEventListeners(container) {
  // Click on card to open detail
  container.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (card && !e.target.closest('button')) { // Don't navigate if button clicked
      const productId = card.dataset.id;
      showProductDetail(productId);
      window.location.hash = `#product/${productId}`;
    }
  });
  
  // Add to Cart button
  container.addEventListener('click', (e) => {
    if (e.target.closest('.add-to-cart-btn')) {
      e.stopPropagation(); // Don't trigger card navigation
      const btn = e.target.closest('.add-to-cart-btn');
      const productId = btn.dataset.id;
      
      addToCart(productId, 1);
      
      // Animate button
      btn.textContent = '✓ Added!';
      btn.style.background = '#27ae60';
      setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.style.background = 'linear-gradient(135deg, #C96A8A, #C9954C)';
      }, 1500);
      
      showToast('Added to cart!', 'success');
    }
  });
  
  // Wishlist button
  container.addEventListener('click', (e) => {
    if (e.target.closest('.wishlist-btn')) {
      e.stopPropagation();
      const btn = e.target.closest('.wishlist-btn');
      const productId = btn.dataset.id;
      
      toggleWishlist(productId);
      
      // Toggle heart fill
      btn.textContent = btn.textContent === '♡' ? '♥' : '♡';
      btn.style.color = btn.textContent === '♥' ? '#C96A8A' : 'inherit';
      
      showToast('Wishlist updated', 'success');
    }
  });
}

function addToCart(productId, quantity = 1) {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existingItem = cart.find(item => item._id === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    const product = window.allProducts?.find(p => p._id === productId);
    if (product) {
      cart.push({ ...product, quantity });
    }
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  
  // POST to backend
  fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  }).catch(err => console.error('Cart POST error:', err));
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.querySelector('.cart-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
  }
}

function toggleWishlist(productId) {
  const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
  const index = wishlist.indexOf(productId);
  
  if (index > -1) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
  
  // POST to backend
  fetch('/api/wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  }).catch(err => console.error('Wishlist POST error:', err));
}

function showProductDetail(productId) {
  const product = window.allProducts?.find(p => p._id === productId);
  if (!product) return;
  
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <div class="product-detail-page">
      <img src="${product.image}" alt="${product.name}" class="detail-image">
      <div class="detail-info">
        <h1>${product.name}</h1>
        <p class="detail-category">${product.category}</p>
        <h2 class="detail-price">₹${product.price}</h2>
        <p class="detail-description">${product.description || ''}</p>
        
        <div class="detail-actions">
          <button class="btn btn-primary btn-large" id="buy-now-btn">Buy Now</button>
          <button class="btn btn-secondary btn-large" id="add-to-cart-detail-btn">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
  
  // Attach event listeners
  document.getElementById('buy-now-btn')?.addEventListener('click', () => {
    addToCart(productId, 1);
    window.location.hash = '#checkout';
  });
  
  document.getElementById('add-to-cart-detail-btn')?.addEventListener('click', () => {
    addToCart(productId, 1);
    showToast('Added to cart!', 'success');
  });
}
```

**CSS Fix in `public/css/style.css`:**
```css
.product-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(201, 149, 76, 0.2);
}

.product-image {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
}

.product-actions {
  display: flex;
  gap: 10px;
  padding: 15px;
}

.add-to-cart-btn, .buy-now-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #C96A8A, #C9954C);
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-to-cart-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(201, 106, 138, 0.3);
}

.wishlist-btn {
  width: 45px;
  height: 45px;
  border: 2px solid #C9954C;
  border-radius: 50%;
  background: white;
  color: #C9954C;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wishlist-btn:hover {
  background: #C9954C;
  color: white;
}

@media (max-width: 768px) {
  .product-image { height: 200px; }
  .product-actions { flex-direction: column; gap: 8px; }
  .wishlist-btn { width: 100%; border-radius: 8px; }
}
```

---

### BUG #3 — Mobile Layout Completely Broken

**Problem:**
- On phones: content overflows horizontally
- Buttons are too small to tap
- Auth modal takes full screen
- Text is too small
- No proper spacing

**CSS Mobile Fixes in `public/css/style.css`:**
```css
/* BASE RESET */
* { box-sizing: border-box; }
html, body { 
  margin: 0; 
  padding: 0; 
  overflow-x: hidden; /* No horizontal scroll */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* PRODUCT GRID */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 15px;
  padding: 15px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .product-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 12px; }
}

@media (max-width: 768px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px; }
}

@media (max-width: 480px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px; }
}

/* BUTTONS */
.btn, button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
  font-size: 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

@media (max-width: 480px) {
  .btn, button {
    min-height: 48px;
    font-size: 14px;
    padding: 14px 16px;
  }
}

/* AUTH MODAL */
.auth-modal {
  background: rgba(24, 18, 43, 0.98);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  border: 1px solid rgba(201, 149, 76, 0.3);
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (max-width: 768px) {
  .auth-modal {
    width: 95vw;
    max-width: 450px;
    padding: 25px;
    margin: auto;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

@media (max-width: 480px) {
  .auth-modal {
    width: 90vw;
    padding: 20px;
    max-height: 90vh;
    overflow-y: auto;
  }
}

/* HEADER */
header {
  padding: 15px 20px;
  background: #18122B;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

@media (max-width: 480px) {
  header {
    padding: 12px 15px;
  }
  
  header nav {
    display: none; /* Hide nav on small screens, use hamburger */
  }
}

/* FORM INPUTS */
input, textarea, select {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 2px solid #C9954C;
  border-radius: 8px;
  background: #1e1535;
  color: white;
  font-size: 14px;
}

@media (max-width: 480px) {
  input, textarea, select {
    padding: 14px;
    font-size: 16px; /* Prevents zoom on iOS */
  }
}

/* HERO SECTION */
.hero-section {
  padding: 60px 20px;
  text-align: center;
  background: linear-gradient(135deg, #18122B 0%, #2d1b4e 100%);
}

.hero-title {
  font-size: 2.5rem;
  color: white;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 40px 20px;
  }
  
  .hero-title {
    font-size: 1.8rem;
  }
}

@media (max-width: 480px) {
  .hero-section {
    padding: 30px 15px;
  }
  
  .hero-title {
    font-size: 1.4rem;
  }
}

/* FOOTER */
footer {
  padding: 40px 20px;
  background: #0a0614;
}

@media (max-width: 768px) {
  footer {
    padding: 25px 15px;
  }
  
  footer section {
    margin-bottom: 20px;
  }
}

/* CHECKOUT FORM */
.checkout-form {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  background: #1a1530;
  border-radius: 12px;
}

@media (max-width: 480px) {
  .checkout-form {
    max-width: 100%;
    margin: 10px;
    padding: 15px;
  }
}

/* NO HORIZONTAL SCROLL */
body, html {
  max-width: 100%;
  overflow-x: hidden;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* CART PAGE */
.cart-item {
  display: flex;
  gap: 15px;
  padding: 15px;
  border: 1px solid #333;
  border-radius: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

@media (max-width: 480px) {
  .cart-item {
    flex-direction: column;
    padding: 10px;
  }
  
  .cart-item img {
    width: 100%;
    height: auto;
  }
}
```

---

## 🟡 PRIORITY 2 — PERFORMANCE FIXES

### Google Login Slow Loading

**Fix in `public/js/firebase.js` or `public/js/app.js`:**
```javascript
// Lazy load Firebase only when user clicks Google login button
let firebaseInitialized = false;

async function initFirebaseLazy() {
  if (firebaseInitialized) return;
  
  try {
    // Firebase script should already be loaded (added to HTML with async defer)
    // Just initialize the SDK
    const config = {
      apiKey: window.FIREBASE_API_KEY,
      authDomain: 'lencho-b556e.firebaseapp.com',
      projectId: 'lencho-b556e',
      storageBucket: 'lencho-b556e.appspot.com',
      messagingSenderId: 'YOUR_SENDER_ID',
      appId: 'YOUR_APP_ID'
    };
    
    window.firebase.initializeApp(config);
    firebaseInitialized = true;
    console.log('Firebase initialized');
  } catch (error) {
    console.error('Firebase init error:', error);
  }
}

document.getElementById('google-login-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('google-login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Connecting to Google...';
  
  try {
    await initFirebaseLazy();
    await startGoogleLogin();
  } catch (error) {
    console.error('Google login error:', error);
    showError('Google login failed. Please try again.');
    btn.disabled = false;
    btn.innerHTML = 'Continue with Google';
  }
});
```

### Reduce Google Auth Backend Latency

**Fix in `server.js` (Google auth route):**
```javascript
// POST /api/auth/firebase/google
// Add caching and timeout

const tokenCache = new Map();

async function verifyGoogleIdTokenWithCache(idToken) {
  // Check cache (5 minute TTL)
  if (tokenCache.has(idToken)) {
    const cached = tokenCache.get(idToken);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.data;
    }
    tokenCache.delete(idToken);
  }
  
  // Verify with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Token invalid');
    }
    
    const data = await response.json();
    
    // Cache the result
    tokenCache.set(idToken, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

app.post('/api/auth/firebase/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'No token provided' });
    }
    
    const googleData = await verifyGoogleIdTokenWithCache(idToken);
    
    if (!googleData.email) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }
    
    // Find or create user
    let user = await User.findOne({ email: googleData.email });
    if (!user) {
      user = await User.create({
        email: googleData.email,
        name: googleData.name || 'User',
        googleId: googleData.sub,
        isVerified: true
      });
    }
    
    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    return res.json({
      success: true,
      token,
      user: { _id: user._id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
});
```

### Website Speed Optimization

**Update `public/index.html` head:**
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#18122B">
  
  <!-- Preconnect to external resources -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://your-backend.onrender.com">
  
  <!-- Critical CSS inline (or load async) -->
  <link rel="stylesheet" href="/css/style.css">
  
  <!-- Deferred non-critical scripts -->
  <link rel="preload" href="/js/app.js" as="script">
  
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  
  <title>Lencho — Premium Artificial Jewellery</title>
</head>

<body>
  <!-- HTML content -->
  
  <!-- Scripts at bottom with defer -->
  <script defer src="/js/firebase.js"></script>
  <script defer src="/js/app.js"></script>
  <script defer src="/js/pages.js"></script>
</body>
```

**Add to `server.js`:**
```javascript
// Compression middleware (if not already present)
const compression = require('compression');
app.use(compression());

// Static file caching
app.use('/public', express.static('public', {
  maxAge: '7d',
  etag: true
}));

// Cache API responses (for admin dashboard, etc.)
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  next();
});
```

---

## 🎨 PRIORITY 3 — ANIMATIONS & VISUAL UPGRADE

### Complete Animation System in `public/css/style.css`

```css
/* ===== KEYFRAME ANIMATIONS ===== */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.05); opacity: 0.9; }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-15px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes goldShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 20px rgba(201, 149, 76, 0.5); }
  50%      { box-shadow: 0 0 40px rgba(201, 106, 138, 0.6); }
}

@keyframes toastIn {
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

/* ===== ELEMENT ANIMATIONS ===== */

/* Product Cards */
.product-card {
  animation: fadeInUp 0.6s ease both;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.product-card:nth-child(1) { animation-delay: 0.05s; }
.product-card:nth-child(2) { animation-delay: 0.10s; }
.product-card:nth-child(3) { animation-delay: 0.15s; }
.product-card:nth-child(4) { animation-delay: 0.20s; }
.product-card:nth-child(5) { animation-delay: 0.25s; }
.product-card:nth-child(6) { animation-delay: 0.30s; }

.product-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow: 0 25px 50px rgba(201, 149, 76, 0.25);
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #18122B 0%, #2d1b4e 40%, #1a0d2e 70%, #18122B 100%);
  position: relative;
  overflow: hidden;
  padding: 80px 20px;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(ellipse at center, rgba(201, 149, 76, 0.08) 0%, transparent 60%);
  animation: pulse 6s ease-in-out infinite;
  pointer-events: none;
}

.hero-title {
  font-size: 3rem;
  color: white;
  margin-bottom: 20px;
  animation: fadeInUp 0.8s ease both;
  position: relative;
  z-index: 2;
}

.hero-title-gradient {
  background: linear-gradient(135deg, #C9954C 0%, #f5d08a 40%, #C96A8A 70%, #C9954C 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: goldShimmer 4s linear infinite;
}

/* Buttons */
.btn-primary, .btn-secondary {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #C96A8A 0%, #C9954C 100%);
  background-size: 200% auto;
  color: white;
}

.btn-primary:hover {
  background-position: right center;
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(201, 106, 138, 0.4);
}

.btn-primary:active {
  transform: translateY(-1px);
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  transition: left 0.4s ease;
}

.btn-primary:hover::before {
  left: 100%;
}

/* Add to Cart Animation */
.add-to-cart-btn.added {
  background: linear-gradient(135deg, #27ae60, #2ecc71) !important;
  animation: pulse 0.5s ease;
}

/* Auth Modal */
.auth-modal {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid;
  border-image: linear-gradient(135deg, #C9954C, #C96A8A) 1;
}

.modal-overlay {
  animation: fadeInUp 0.3s ease;
  backdrop-filter: blur(10px);
}

/* Loading Skeleton */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% auto;
  animation: shimmer 1.5s infinite linear;
  border-radius: 8px;
}

/* Toast Notifications */
.toast-notification {
  animation: toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation-fill-mode: forwards;
}

.toast-success {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.toast-error {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

/* Header Scroll Effect */
header {
  transition: all 0.3s ease;
}

header.scrolled {
  backdrop-filter: blur(20px);
  background: rgba(24, 18, 43, 0.95);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}

/* Input Focus Animations */
input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #C96A8A;
  box-shadow: 0 0 15px rgba(201, 106, 138, 0.3);
  transform: scale(1.02);
  transition: all 0.3s ease;
}

/* Floating Labels */
.input-group {
  position: relative;
  margin: 20px 0;
}

.input-group input:focus + label,
.input-group input:not(:placeholder-shown) + label {
  transform: translateY(-24px) scale(0.85);
  color: #C9954C;
  font-weight: 600;
}

.input-group label {
  position: absolute;
  top: 15px;
  left: 15px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  color: #999;
}

/* Page Transitions */
.page-content {
  animation: fadeInUp 0.5s ease both;
}

/* Reveal Animation (for scroll) */
.reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Category Badge */
.category-badge {
  background: linear-gradient(135deg, #C96A8A, #C9954C);
  color: white;
  padding: 6px 16px;
  border-radius: 25px;
  font-size: 12px;
  font-weight: 700;
  display: inline-block;
  animation: fadeInUp 0.5s ease both;
}

/* Checkout Progress */
.progress-bar {
  height: 4px;
  background: linear-gradient(90deg, #C96A8A, #C9954C);
  width: var(--progress);
  transition: width 0.3s ease;
  border-radius: 2px;
}
```

### Add Scroll Animation JS to `public/js/app.js`

```javascript
// Initialize scroll reveal animations
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Header scroll effect
window.addEventListener('scroll', throttle(() => {
  const header = document.querySelector('header');
  if (header) {
    header.classList.toggle('scrolled', window.scrollY > 50);
  }
}, 100));

// Throttle helper
function throttle(func, wait) {
  let timeout;
  return function() {
    if (timeout) return;
    timeout = setTimeout(() => {
      func.apply(this, arguments);
      timeout = null;
    }, wait);
  };
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 14px 20px;
    border-radius: 10px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    max-width: 300px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
});
```

---

## ⚙️ PRIORITY 4 — ADMIN PANEL FEATURES

### 1. SMTP Test Button (Critical for OTP debugging)

**Add to `server.js`:**
```javascript
app.post('/api/admin/test-smtp', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await getSettingsFromDB();
    
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
      return res.status(400).json({
        success: false,
        message: 'SMTP settings not configured'
      });
    }
    
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: false,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass
      },
      tls: { rejectUnauthorized: false }
    });
    
    // Test verification
    const verified = await transporter.verify();
    
    if (!verified) {
      return res.status(500).json({
        success: false,
        message: 'SMTP connection failed. Check credentials.'
      });
    }
    
    // Send test email to admin
    await transporter.sendMail({
      from: settings.smtpUser,
      to: settings.smtpUser,
      subject: '✓ Lencho SMTP Test',
      html: '<p>SMTP is configured correctly! ✓</p>'
    });
    
    return res.json({
      success: true,
      message: 'Test email sent to ' + settings.smtpUser
    });
    
  } catch (error) {
    console.error('SMTP test error:', error);
    return res.status(500).json({
      success: false,
      message: 'SMTP error: ' + error.message
    });
  }
});
```

**Add to Admin Panel HTML:**
```html
<section class="admin-smtp-settings">
  <h3>SMTP Configuration</h3>
  
  <div class="form-group">
    <label>SMTP Host</label>
    <input type="text" id="smtp-host" placeholder="smtp.gmail.com" value="">
  </div>
  
  <div class="form-group">
    <label>SMTP Port</label>
    <input type="number" id="smtp-port" placeholder="587" value="587">
  </div>
  
  <div class="form-group">
    <label>Email (Gmail)</label>
    <input type="email" id="smtp-user" placeholder="your-email@gmail.com" value="">
  </div>
  
  <div class="form-group">
    <label>App Password (Gmail)</label>
    <input type="password" id="smtp-pass" placeholder="16-character app password">
    <small>Get this from: Google Account → Security → App passwords</small>
  </div>
  
  <button id="test-smtp-btn" class="btn btn-primary">
    Test SMTP Connection
  </button>
  <div id="smtp-test-result"></div>
  
  <button id="save-smtp-btn" class="btn btn-success">
    Save SMTP Settings
  </button>
</section>
```

**Add to `public/js/admin.js`:**
```javascript
document.getElementById('test-smtp-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('test-smtp-btn');
  const result = document.getElementById('smtp-test-result');
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Testing...';
  result.innerHTML = '';
  
  try {
    const response = await fetch('/api/admin/test-smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      result.innerHTML = `<p style="color: #27ae60;">✓ ${data.message}</p>`;
    } else {
      result.innerHTML = `<p style="color: #e74c3c;">✗ ${data.message}</p>`;
    }
  } catch (error) {
    result.innerHTML = `<p style="color: #e74c3c;">✗ Error: ${error.message}</p>`;
  }
  
  btn.disabled = false;
  btn.innerHTML = 'Test SMTP Connection';
});
```

### 2. Dashboard Quick Stats

```html
<!-- Add to admin dashboard -->
<div class="admin-stats-grid">
  <div class="stat-card">
    <h4>Today's Orders</h4>
    <p class="stat-number" id="stat-orders">0</p>
    <p class="stat-change" id="stat-orders-change"></p>
  </div>
  
  <div class="stat-card">
    <h4>Today's Revenue</h4>
    <p class="stat-number" id="stat-revenue">₹0</p>
    <p class="stat-change" id="stat-revenue-change"></p>
  </div>
  
  <div class="stat-card">
    <h4>New Users</h4>
    <p class="stat-number" id="stat-users">0</p>
  </div>
  
  <div class="stat-card danger">
    <h4>Pending Orders</h4>
    <p class="stat-number" id="stat-pending">0</p>
  </div>
</div>
```

```css
.admin-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: linear-gradient(135deg, #18122B, #2d1b4e);
  border: 1px solid #C9954C;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  animation: fadeInUp 0.5s ease both;
}

.stat-card h4 {
  color: #888;
  font-size: 12px;
  text-transform: uppercase;
  margin: 0 0 10px 0;
}

.stat-number {
  font-size: 2.5rem;
  color: #C9954C;
  margin: 10px 0;
  font-weight: bold;
}

.stat-change {
  font-size: 12px;
  color: #27ae60;
  margin: 0;
}

.stat-card.danger { border-color: #e74c3c; }
.stat-card.danger .stat-number { color: #e74c3c; }
```

```javascript
async function loadAdminStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
    });
    
    const data = await response.json();
    
    document.getElementById('stat-orders').textContent = data.todayOrders;
    document.getElementById('stat-orders-change').textContent = 
      `${data.ordersChangePercent > 0 ? '↑' : '↓'} ${Math.abs(data.ordersChangePercent)}% vs yesterday`;
    
    document.getElementById('stat-revenue').textContent = `₹${data.todayRevenue}`;
    document.getElementById('stat-pending').textContent = data.pendingOrders;
  } catch (error) {
    console.error('Stats load error:', error);
  }
}
```

---

## 🔐 PRIORITY 5 — LOGIN/SIGNUP SYSTEM REDESIGN

### Complete Auth Modal HTML

```html
<div id="auth-modal" class="auth-modal" style="display: none;">
  <div class="modal-header">
    <img src="/images/lencho-logo.svg" alt="Lencho" class="modal-logo">
    <button class="modal-close-btn" onclick="closeAuthModal()">✕</button>
  </div>
  
  <div class="auth-tabs">
    <button class="tab-btn active" data-tab="login">Login</button>
    <button class="tab-btn" data-tab="signup">Sign Up</button>
  </div>
  
  <!-- LOGIN TAB -->
  <div id="login-tab" class="auth-tab active">
    <form id="login-form" onsubmit="handleLogin(event)">
      <div class="input-group">
        <input type="email" id="login-email" placeholder="Email" required>
        <label>Email</label>
      </div>
      
      <div class="input-group">
        <input type="password" id="login-password" placeholder="Password" required>
        <label>Password</label>
      </div>
      
      <div class="input-group">
        <input type="text" id="login-security" placeholder="Security Code" required>
        <label>Security Code</label>
      </div>
      
      <button type="submit" class="btn btn-primary" style="width: 100%;">
        Login
      </button>
    </form>
    
    <div style="text-align: center; margin: 20px 0;">
      <button class="btn-icon-google" id="google-login-btn">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="..." fill="white"/> <!-- Google icon SVG -->
        </svg>
        Continue with Google
      </button>
    </div>
    
    <p style="text-align: center; color: #888; font-size: 14px;">
      Don't have an account?
      <button class="link-btn" onclick="switchTab('signup')">Sign up</button>
    </p>
  </div>
  
  <!-- SIGNUP TAB -->
  <div id="signup-tab" class="auth-tab">
    <form id="signup-form" onsubmit="handleSignup(event)">
      <div class="input-group">
        <input type="text" id="signup-name" placeholder="Full Name" required>
        <label>Full Name</label>
      </div>
      
      <div class="input-group">
        <input type="email" id="signup-email" placeholder="Email" required>
        <label>Email</label>
      </div>
      
      <div class="input-group">
        <input type="tel" id="signup-phone" placeholder="Phone (10 digits)" required>
        <label>Phone</label>
      </div>
      
      <button type="button" class="btn btn-primary" id="send-otp-btn" style="width: 100%;">
        Send OTP
      </button>
    </form>
    
    <!-- OTP Section (hidden initially) -->
    <div id="otp-section" style="display: none;">
      <div class="input-group">
        <input type="text" id="otp-input" placeholder="000000" maxlength="6" pattern="[0-9]{6}">
        <label>Enter OTP</label>
      </div>
      
      <button type="button" class="btn btn-primary" id="verify-otp-btn" style="width: 100%;">
        Verify OTP
      </button>
      
      <div style="text-align: center; margin-top: 15px;">
        <span id="otp-timer" style="color: #888; font-size: 12px;"></span>
        <button type="button" class="link-btn" id="resend-otp-btn" disabled>
          Resend OTP
        </button>
      </div>
    </div>
  </div>
  
  <div id="auth-error" style="color: #e74c3c; text-align: center; margin-top: 10px; display: none;"></div>
</div>

<!-- Modal Overlay -->
<div id="modal-overlay" class="modal-overlay" onclick="closeAuthModal()" style="display: none;"></div>
```

### Auth Modal CSS

```css
.auth-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
  background: rgba(24, 18, 43, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(201, 149, 76, 0.3);
  border-radius: 16px;
  padding: 30px;
  max-width: 420px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-logo {
  height: 40px;
  width: auto;
}

.modal-close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.modal-close-btn:hover {
  color: #C9954C;
}

/* Tabs */
.auth-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 30px;
  border-bottom: 2px solid #333;
}

.tab-btn {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  color: #888;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}

.tab-btn.active {
  color: #C9954C;
  border-bottom-color: #C9954C;
}

.auth-tab {
  display: none;
  animation: fadeInUp 0.3s ease;
}

.auth-tab.active {
  display: block;
}

/* Input Groups with floating labels */
.input-group {
  position: relative;
  margin: 20px 0;
}

.input-group input {
  width: 100%;
  padding: 14px;
  background: #1e1535;
  border: 2px solid #444;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  transition: all 0.3s ease;
}

.input-group input:focus {
  outline: none;
  border-color: #C9954C;
  box-shadow: 0 0 15px rgba(201, 149, 76, 0.2);
}

.input-group input::placeholder {
  color: transparent;
}

.input-group label {
  position: absolute;
  top: 14px;
  left: 14px;
  color: #999;
  font-size: 12px;
  transition: all 0.3s ease;
  pointer-events: none;
}

.input-group input:focus + label,
.input-group input:not(:placeholder-shown) + label {
  top: -10px;
  left: 10px;
  color: #C9954C;
  background: rgba(24, 18, 43, 0.98);
  padding: 0 8px;
}

/* Google Button */
.btn-icon-google {
  width: 100%;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: white;
  color: #333;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 20px 0;
}

.btn-icon-google:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

/* Link button */
.link-btn {
  background: none;
  border: none;
  color: #C9954C;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.3s ease;
}

.link-btn:hover {
  color: #C96A8A;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  animation: fadeInUp 0.2s ease;
}

@media (max-width: 480px) {
  .auth-modal {
    width: 90vw;
    padding: 20px;
    max-height: 95vh;
  }
}
```

---

## 📝 COMPLETE IMPLEMENTATION CHECKLIST

Mark as complete after implementing each section:

**Auth & OTP:**
- [ ] OTP generation and storage working
- [ ] Gmail SMTP configured and sending OTP emails
- [ ] OTP verification route working
- [ ] User account created on OTP verification
- [ ] JWT token returned and stored
- [ ] Admin SMTP test button working

**Frontend Buttons:**
- [ ] Product card click opens detail page
- [ ] "Add to Cart" button adds items and updates header count
- [ ] "Buy Now" button adds item and goes to checkout
- [ ] "Wishlist" button toggles heart icon
- [ ] All buttons show loading state while processing
- [ ] Success toast notifications showing

**Mobile Optimization:**
- [ ] No horizontal scroll on any screen width
- [ ] Product grid is 2 columns on mobile
- [ ] All buttons are 44x44px minimum tap target
- [ ] Auth modal is 92% width on mobile, centered
- [ ] Form inputs are 48px height on mobile
- [ ] Text is minimum 14px on mobile

**Animations:**
- [ ] Product cards fade in with stagger
- [ ] Buttons have hover animations
- [ ] Page transitions are smooth
- [ ] Toast notifications slide in
- [ ] Header blur effect on scroll
- [ ] Hero title has gradient shimmer

**Performance:**
- [ ] Page loads in < 3 seconds on 3G
- [ ] Google login completes in < 5 seconds
- [ ] No console errors on F12
- [ ] Images are lazy loaded
- [ ] Compression enabled on server
- [ ] Static files cached for 7 days

**Admin Features:**
- [ ] SMTP test button working
- [ ] Dashboard stats showing
- [ ] OTP logs visible
- [ ] Product quick edit working
- [ ] Order status bulk update working

**SEO:**
- [ ] Meta title and description set
- [ ] OG image for social sharing
- [ ] Structured data (JSON-LD) added
- [ ] sitemap.xml accessible
- [ ] robots.txt present

---

## 🎯 QUICK START — WHAT TO DO NOW

1. **Fix OTP FIRST** (Copy server.js and app.js code above, test with Gmail)
2. **Fix Buttons** (Use event delegation, copy pages.js code)
3. **Fix Mobile** (Copy CSS media queries)
4. **Add Animations** (Copy animation keyframes and apply to elements)
5. **Optimize Performance** (Add compression, caching, lazy load)
6. **Add Admin Features** (SMTP test, stats, OTP logs)
7. **Test Everything** (Go through checklist)

**Environment Variables Needed:**
```env
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-32-character-secret-key
SESSION_SECRET=your-32-character-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-character-app-password
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://lencho.in
```

---

**Document Version:** 2.0 | **Last Updated:** May 2026  
**Website:** lencho.in | **Support:** lencho.official01@gmail.com
