/* ── LENCHO – MAIN APP ─────────────────────────────── */
let currentUser = null;
let cartCount = 0;
let localCartCache = []; // Local cart cache for instant updates
let cachedPublicSettings = null;
let publicSettingsPromise = null;
let loginType = 'email'; // Track current login type (email or phone)
let authOtpRequestInFlight = false;
let authOtpResendTimer = null;
let authOtpResendEndsAt = 0;
let searchCache = new Map();
let searchTimeout = null;
const apiGetCache = new Map();
const API_CACHE_TTL_MS = 2 * 60 * 1000;
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CART_LOCAL_STORAGE_KEY = 'lencho_cart_local_v1';
const WISHLIST_LOCAL_STORAGE_KEY = 'lencho_wishlist_local_v1';

try { window.__appLoaded = true; } catch {}

const SETTINGS_CACHE_KEY = 'lencho_public_settings_cache_v1';
const JWT_TOKEN_KEY = 'lencho_jwt_token_v1';
const JWT_USER_KEY = 'lencho_current_user_v1';
const MEDIA_FALLBACKS = {
  earrings: '/images/earrings.png',
  necklace: '/images/necklace.png',
  'toe-rings': '/images/toe-rings.png',
  payal: '/images/payal.png',
  rings: '/images/p1.png',
  bangles: '/images/p4.png',
  bracelets: '/images/p1.png',
  chains: '/images/showcase.png',
  'maang-tikka': '/images/showcase.png',
  sets: '/images/showcase.png',
  default: '/images/hero.png'
};
let currentPageContext = { route: '/', category: '', product: null };

// Global event delegation for all critical buttons (works even with CSP blocking inline handlers)
document.addEventListener('click', (e) => {
  // Popup close button
  if (e.target.closest('.popup-close')) {
    closePopup();
    return;
  }

  
  // Modal close button
  if (e.target.closest('.modal-close')) {
    closeAuthModal();
    return;
  }
  
  // Claim discount button
  if (e.target.closest('[onclick*="claimDiscount"]')) {
    claimDiscount();
    return;
  }
  
  // Login button
  if (e.target.closest('#login-btn')) {
    handleLogin();
    return;
  }
  
  // Signup button
  if (e.target.closest('#signup-btn')) {
    handleSignup();
    return;
  }
  
  // OTP verify button
  if (e.target.closest('#verify-otp-btn')) {
    verifyEmailOTP();
    return;
  }
  
  // Resend OTP
  if (e.target.closest('#resend-otp-btn')) {
    resendEmailOTP();
    return;
  }
  
  // Create Account button
  if (e.target.closest('[onclick*="completeSignupAfterOTP"]')) {
    completeSignupAfterOTP();
    return;
  }
});

function readCachedPublicSettings() {
  if (cachedPublicSettings && typeof cachedPublicSettings === 'object') return cachedPublicSettings;
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    cachedPublicSettings = normalizeSettings(parsed);
    return cachedPublicSettings;
  } catch {
    return {};
  }
}

function saveCachedPublicSettings(settings) {
  const normalized = normalizeSettings(settings);
  cachedPublicSettings = normalized;
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(normalized));
  } catch {}
  return normalized;
}

function getCategoryImageFallback(category = '') {
  const key = String(category || '').trim().toLowerCase();
  return MEDIA_FALLBACKS[key] || MEDIA_FALLBACKS.default;
}

function safeImageUrl(url, category = '', fallback = '') {
  const value = String(url || '').trim();
  return value || fallback || getCategoryImageFallback(category);
}

function handleImageFallback(img, category = '', fallback = '') {
  if (!img) return;
  const next = fallback || getCategoryImageFallback(category);
  if (img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = next;
}

function imageFallbackAttr(category = '', fallback = '') {
  const safeCategory = String(category || '').replace(/[^a-z0-9-]/gi, '');
  const safeFallback = safeImageUrl(fallback, safeCategory);
  return `onerror="handleImageFallback(this,'${safeCategory}','${safeFallback}')"`; 
}

function normalizeClientProduct(product) {
  if (!product || typeof product !== 'object') return product;
  const category = String(product.category || '').trim().toLowerCase();
  const images = Array.isArray(product.images) && product.images.length
    ? product.images.map(img => safeImageUrl(img, category))
    : [getCategoryImageFallback(category)];

  if (images.length === 1) images.push(images[0]);

  return {
    ...product,
    category,
    images,
    image: safeImageUrl(product.image || images[0], category)
  };
}

function setPageContext(next = {}) {
  currentPageContext = {
    route: next.route || location.pathname || '/',
    category: next.category || '',
    product: next.product ? normalizeClientProduct(next.product) : null
  };
}

function upsertMeta(selector, attribute, value) {
  if (!value) return;
  let node = document.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute.includes('property') ? 'property' : 'name', attribute.replace(/^.*=/, ''));
    document.head.appendChild(node);
  }
  node.setAttribute('content', value);
}

function upsertNamedMeta(name, value) {
  upsertMeta(`meta[name="${name}"]`, `name=${name}`, value);
}

function upsertPropertyMeta(property, value) {
  upsertMeta(`meta[property="${property}"]`, `property=${property}`, value);
}

function upsertLink(rel, href) {
  if (!href) return;
  let node = document.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', rel);
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

function upsertJsonLd(id, payload) {
  if (!payload) return;
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement('script');
    node.type = 'application/ld+json';
    node.id = id;
    document.head.appendChild(node);
  }
  node.textContent = JSON.stringify(payload);
}

function syncFooterDetails(settings = {}) {
  const phone = settings.footerPhone || settings.storePhone || '+91 7404217625';
  const email = settings.footerEmail || settings.storeEmail || 'lencho.official01@gmail.com';
  const address = settings.footerAddress || settings.storeAddress || '197 Sarakpur, Barara, Ambala, Haryana';

  const phoneEl = document.getElementById('footer-phone');
  const emailEl = document.getElementById('footer-email');
  const addressEl = document.getElementById('footer-address');

  if (phoneEl) phoneEl.textContent = phone;
  if (emailEl) emailEl.textContent = email;
  if (addressEl) addressEl.textContent = address;
}

async function applyRouteSeo(context = {}, settingsInput = null) {
  const settings = normalizeSettings(settingsInput || readCachedPublicSettings());
  const route = context.route || currentPageContext.route || location.pathname || '/';
  const category = context.category || currentPageContext.category || '';
  const product = context.product ? normalizeClientProduct(context.product) : currentPageContext.product;
  const baseUrl = String(settings.seoCanonicalBaseUrl || location.origin).replace(/\/+$/, '');
  const currentUrl = `${baseUrl}${route.startsWith('/') ? route : `/${route}`}${location.search || ''}`;
  const defaultTitle = settings.seoTitleDefault || 'Lencho - Premium Artificial Jewellery';
  const defaultDescription = settings.seoDescriptionDefault || 'Shop premium artificial jewellery at Lencho.';
  const defaultImage = safeImageUrl(settings.seoOgImageUrl || settings.heroImage, '', '/images/premium_hero.png');
  const twitterImage = safeImageUrl(settings.seoTwitterImageUrl || defaultImage, '', defaultImage);

  let title = defaultTitle;
  let description = defaultDescription;
  let image = defaultImage;
  let keywords = 'artificial jewellery, lencho, fashion jewellery';
  let schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: settings.storeName || 'Lencho',
    url: baseUrl,
    image: `${baseUrl}${defaultImage}`,
    description: defaultDescription,
    telephone: settings.schemaPhone || settings.storePhone || '',
    email: settings.schemaEmail || settings.storeEmail || '',
    address: settings.schemaAddress || settings.storeAddress || ''
  };

  if (route === '/' || route === '') {
    title = defaultTitle;
    description = defaultDescription;
    image = safeImageUrl(settings.heroImage || defaultImage, '', defaultImage);
  } else if (route === '/products' && category) {
    const label = category.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
    title = `${label} Collection | ${settings.storeName || 'Lencho'}`;
    description = `Browse ${label} at ${settings.storeName || 'Lencho'}. Premium styles, current discounts, and fast delivery support.`;
  } else if (route.startsWith('/product/') && product) {
    title = `${product.name} | ${settings.storeName || 'Lencho'}`;
    description = product.description || defaultDescription;
    image = safeImageUrl(product.images?.[0], product.category, defaultImage);
    keywords = Array.isArray(product.seoTags) && product.seoTags.length
      ? product.seoTags.join(', ')
      : `${product.category}, ${product.name}, lencho`;
    schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image: product.images.map(img => `${baseUrl}${img.startsWith('/') ? img : `/${img}`}`),
      sku: product.id,
      category: product.category,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: Number(product.price) || 0,
        availability: Number(product.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: currentUrl
      }
    };
  } else if (route === '/track') {
    title = `Track Order | ${settings.storeName || 'Lencho'}`;
    description = 'Track your Lencho order using your order ID.';
  } else if (route === '/contact') {
    title = `Contact ${settings.storeName || 'Lencho'}`;
    description = 'Contact Lencho for product help, order support, and business inquiries.';
  }

  document.title = title;
  upsertNamedMeta('description', description);
  upsertNamedMeta('keywords', keywords);
  upsertPropertyMeta('og:title', title);
  upsertPropertyMeta('og:description', description);
  upsertPropertyMeta('og:url', currentUrl);
  upsertPropertyMeta('og:image', `${baseUrl}${image.startsWith('/') ? image : `/${image}`}`);
  upsertNamedMeta('twitter:title', title);
  upsertNamedMeta('twitter:description', description);
  upsertNamedMeta('twitter:image', `${baseUrl}${twitterImage.startsWith('/') ? twitterImage : `/${twitterImage}`}`);
  upsertLink('canonical', currentUrl);
  upsertJsonLd('dynamic-seo-jsonld', schema);
  syncFooterDetails(settings);
}

function withTimeout(promise, timeoutMs = 3000) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      });
  });
}

async function fetchPublicSettings(options = {}) {
  const { force = false, timeoutMs = 3000 } = options;
  if (!force && cachedPublicSettings) return cachedPublicSettings;
  if (!force && publicSettingsPromise) return publicSettingsPromise;

  publicSettingsPromise = (async () => {
    const resp = await withTimeout(api('/api/settings/public'), timeoutMs);
    const normalized = normalizeSettings(resp || {});
    if (!resp || resp.error || Object.keys(normalized).length === 0) {
      return readCachedPublicSettings();
    }
    return saveCachedPublicSettings(normalized);
  })();

  const data = await publicSettingsPromise;
  publicSettingsPromise = null;
  return data;
}

function getHeaderOffset() {
  return window.innerWidth <= 768 ? '110px' : '72px';
}

// ── ROUTER ────────────────────────────────────────────────
async function navigate(path, pushState = true) {
  if (pushState) history.pushState({}, '', path);
  const app = document.getElementById('app');
  const footer = document.getElementById('site-footer');
  const header = document.getElementById('site-header');
  app.innerHTML = '<div style="min-height:60vh;display:flex;align-items:center;justify-content:center;"><div class="loader-logo" style="color:var(--rose);font-size:1.5rem;">✦</div></div>';
  const [route, query] = path.split('?');
  const params = new URLSearchParams(query || '');
  setPageContext({ route, category: params.get('category') || '' });

  // ── SAFETY GUARD: Always ensure header/footer visible for non-admin routes ──
  const isAdmin = route === '/admin';
  footer.style.display = isAdmin ? 'none' : '';
  header.style.display = isAdmin ? 'none' : '';
  app.style.paddingTop = isAdmin ? '0' : getHeaderOffset();

  try {
    if (route === '/' || route === '') { app.style.paddingTop = '0'; renderHome(); }
    else if (route === '/products') { renderProducts(params); }
    else if (route.startsWith('/product/')) { renderProductDetail(route.split('/product/')[1]); }
    else if (route === '/cart') { renderCart(); }
    else if (route === '/checkout') { renderCheckout(); }
    else if (route.startsWith('/checkout-now/')) { renderCheckoutNow(route.split('/checkout-now/')[1]); }
    else if (route === '/track') { renderTrack(); }
    else if (route === '/contact') { renderContact(); }
    else if (route === '/dashboard') { app.style.paddingTop = '0'; renderDashboard(); }
    else if (route === '/wishlist') { renderWishlist(); }
    else if (route === '/terms') { renderTerms(); }
    else if (route === '/privacy') { renderPrivacy(); }
    else if (route === '/disclaimer') { renderDisclaimer(); }
    else if (isAdmin) { renderAdmin(); }
    else { app.innerHTML = `<div class="page-wrap" style="text-align:center;padding-top:120px;"><div class="empty-icon">🔍</div><h2 style="font-family:'Cormorant Garamond',serif;font-size:2rem;">Page Not Found</h2><p style="color:var(--gray);margin:1rem 0 2rem;">The page you're looking for doesn't exist.</p><button class="btn-primary" onclick="navigate('/')">Go Home</button></div>`; }
  } catch (e) { console.error(e); }
  if (!isAdmin) applyRouteSeo({ route, category: params.get('category') || '' });
  window.scrollTo(0, 0);
  initScrollReveal();
}

window.addEventListener('popstate', () => navigate(location.pathname + location.search, false));

// ── API HELPER ────────────────────────────────────────────
async function api(url, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs || 6000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const method = String(opts.method || 'GET').toUpperCase();
    const cacheable = method === 'GET' && /^\/api\/(products|categories|testimonials|recommendations|settings(\/public)?)\b/.test(url);

    if (cacheable) {
      const hit = apiGetCache.get(url);
      if (hit && (Date.now() - hit.ts) < API_CACHE_TTL_MS) return hit.data;
    }

    // Build headers with JWT token if available
    const headers = { 'Content-Type': 'application/json' };
    const token = getJWTToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { 
      method,
      credentials: 'include',
      signal: controller.signal,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined 
    });
    
    // Check for non-JSON or error responses
    if (!res.ok) {
      const text = await res.text();
      let errData;
      try { errData = JSON.parse(text); } catch(e) {}
      console.error(`API Error [${res.status}]:`, text);
      
      // If unauthorized, clear stored token
      if (res.status === 401) {
        clearAuth();
      }
      
      return { error: (errData && errData.error) || `Server Error: ${res.status}` };
    }
    
    const data = await res.json();
    if (cacheable && !data?.error) {
      apiGetCache.set(url, { ts: Date.now(), data });
    }
    return data;
  } catch (e) {
    if (e && e.name === 'AbortError') {
      return { error: 'Request timed out. Please try again.' };
    }
    console.error('Fetch Error:', e);
    return { error: 'Connection lost. Please restart your local server (npm start).' };
  } finally {
    clearTimeout(timeoutId);
  }
}
// ── TOAST ─────────────────────────────────────────────────

// ── JWT TOKEN MANAGEMENT ──────────────────────────────────
function getJWTToken() {
  try {
    return localStorage.getItem(JWT_TOKEN_KEY) || null;
  } catch(e) {
    console.error('Error retrieving JWT token:', e);
    return null;
  }
}

function setJWTToken(token) {
  try {
    if (token) {
      localStorage.setItem(JWT_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(JWT_TOKEN_KEY);
    }
  } catch(e) {
    console.error('Error storing JWT token:', e);
  }
}

function saveCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(JWT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(JWT_USER_KEY);
    }
  } catch(e) {
    console.error('Error storing user data:', e);
  }
}

function getSavedUser() {
  try {
    const data = localStorage.getItem(JWT_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch(e) {
    console.error('Error retrieving saved user:', e);
    return null;
  }
}

function clearAuth() {
  setJWTToken(null);
  saveCurrentUser(null);
  currentUser = null;
}

function generateClientSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-');
}

function getFirebaseAuthErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase();
  if (code === 'auth/popup-blocked') return 'Google popup was blocked by your browser. Please allow popups and try again.';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorized for Firebase Google login yet.';
  if (code === 'auth/network-request-failed') return 'Network error during Google sign-in. Please try again.';
  if (code === 'auth/cancelled-popup-request') return 'Google sign-in request was replaced. Please try again.';
  const message = String(error?.message || 'Google login failed. Please try again.');
  return code ? `${code}: ${message}` : message;
}

// ── TOAST ─────────────────────────────────────────────────
function toast(msg, type = 'info', dur = 3000) {
  const icons = { success: '✓', error: '✕', info: '✦', cart: '🛍️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '✦'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── AUTH ──────────────────────────────────────────────────
async function loadUser() {
  const r = await api('/api/me');
  if (r.user) {
    currentUser = r.user;
    updateHeader();
  }
}

// Auto-login with saved JWT token on page load
async function autoLoginWithToken() {
  const token = getJWTToken();
  const savedUser = getSavedUser();
  
  if (!token) {
    // No token at all — user is genuinely logged out
    currentUser = null;
    updateHeader();
    return;
  }
  
  // ── INSTANT RESTORE: Show saved user immediately so UI never flickers ──
  if (savedUser) {
    currentUser = savedUser;
    updateHeader();
    console.log('[Auth] Session restored from localStorage:', savedUser.email || savedUser.name);
  }
  
  // ── BACKGROUND VALIDATION: Verify JWT with server (non-blocking) ──
  try {
    const r = await api('/api/me');
    if (r.user) {
      // Server confirmed — update with fresh data
      currentUser = r.user;
      saveCurrentUser(r.user);
      updateHeader();
      console.log('[Auth] JWT validated by server:', r.user.email);
      return;
    }
    
    // Server returned { user: null } — token is explicitly invalid/expired
    if (r.error && (r.error.includes('401') || r.error.includes('expired') || r.error.includes('invalid'))) {
      console.warn('[Auth] Token explicitly rejected by server, clearing auth');
      clearAuth();
      updateHeader();
      return;
    }
    
    // Server returned null user but no error — might be a server issue
    // Keep the saved user to avoid flicker, but don't save new data
    if (!currentUser && savedUser) {
      currentUser = savedUser;
      updateHeader();
    }
  } catch(e) {
    // Network error, timeout, or server unreachable — NEVER clear auth
    console.warn('[Auth] Background validation failed (keeping session):', e?.message || e);
    if (!currentUser && savedUser) {
      currentUser = savedUser;
      updateHeader();
    }
  }
}

function updateHeader() {
  const btn = document.getElementById('header-user-btn');
  if (currentUser) {
    const firstName = String(currentUser.name || 'User').trim().split(/\s+/)[0];
    const avatar = String(currentUser.avatar || '').trim();
    if (avatar) {
      btn.innerHTML = `<img src="${avatar}" alt="${firstName}" class="header-user-avatar"/><span class="header-user-label">Hi, ${firstName}</span>`;
    } else {
      btn.innerHTML = `<i class="fas fa-user-check"></i><span class="header-user-label">Hi, ${firstName}</span>`;
    }
    btn.classList.add('signed-in');
    btn.style.color = 'var(--rose)';
  } else {
    btn.innerHTML = `<i class="fas fa-user"></i>`;
    btn.classList.remove('signed-in');
    btn.style.color = '';
  }
}

function switchLoginType(type = 'email') {
  window.loginType = type;
  const emailBtn = document.getElementById('email-login-type-btn');
  const googleBtn = document.getElementById('google-login-type-btn');
  const emailFields = document.getElementById('email-login-fields');

  if (type === 'email') {
    if (emailBtn) {
      emailBtn.style.color = 'var(--rose)';
      emailBtn.style.borderBottomColor = 'var(--rose)';
    }
    if (googleBtn) {
      googleBtn.style.color = '';
      googleBtn.style.borderBottomColor = '';
    }
    if (emailFields) emailFields.style.display = 'block';
    return;
  }

  if (emailBtn) {
    emailBtn.style.color = '';
    emailBtn.style.borderBottomColor = '';
  }
  if (googleBtn) {
    googleBtn.style.color = 'var(--rose)';
    googleBtn.style.borderBottomColor = 'var(--rose)';
  }
  if (emailFields) emailFields.style.display = 'none';
}

function switchToLogin() {
  const modalCard = document.querySelector('#auth-modal .modal-card');
  document.getElementById('auth-otp-step').style.display = 'none';
  const signupPasswordStep = document.getElementById('auth-signup-password-step');
  if (signupPasswordStep) signupPasswordStep.style.display = 'none';
  document.getElementById('auth-signup-form').style.display = 'none';
  document.getElementById('auth-login-form').style.display = 'block';
  if (modalCard) modalCard.scrollTop = 0;
  window.loginType = 'email';
  switchLoginType('email');
  renderGoogleButtons();
}

function switchToSignup() {
  const modalCard = document.querySelector('#auth-modal .modal-card');
  const authLoginForm = document.getElementById('auth-login-form');
  const authSignupForm = document.getElementById('auth-signup-form');
  const authOtpStep = document.getElementById('auth-otp-step');
  const signupPasswordStep = document.getElementById('auth-signup-password-step');
  if (authOtpStep) authOtpStep.style.display = 'none';
  if (signupPasswordStep) signupPasswordStep.style.display = 'none';
  if (authLoginForm) authLoginForm.style.display = 'none';
  if (authSignupForm) authSignupForm.style.display = 'block';
  if (modalCard) modalCard.scrollTop = 0;
  window.loginType = 'email';
  switchLoginType('email');
  renderGoogleButtons();
}

function resetAuthModalState() {
  authOtpRequestInFlight = false;
  googleAuthInFlight = false;
  window.pendingAuth = null;

  if (authOtpResendTimer) {
    clearInterval(authOtpResendTimer);
    authOtpResendTimer = null;
  }
  authOtpResendEndsAt = 0;

  for (const id of ['login-error', 'signup-error', 'otp-error', 'signup-password-step-error']) {
    const node = document.getElementById(id);
    if (node) node.textContent = '';
  }

  const resendBtn = document.getElementById('resend-otp-btn');
  if (resendBtn) {
    resendBtn.textContent = 'Resend OTP';
    resendBtn.style.pointerEvents = '';
    resendBtn.style.opacity = '';
  }

  const otpInput = document.getElementById('auth-otp-input');
  if (otpInput) otpInput.value = '';
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  const modalCard = document.querySelector('#auth-modal .modal-card');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  if (modalCard) modalCard.scrollTop = 0;
  renderGoogleButtons();
  loadAuthCaptcha();
  switchToLogin();
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  resetAuthModalState();
  switchToLogin();
  modal.style.display = 'none';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

function handleUserClick() {
  if (currentUser) {
    navigate(currentUser.role === 'admin' ? '/admin' : '/dashboard');
    return;
  }
  openAuthModal();
}

// ── CAPTCHA HELPERS ──────────────────────────────────────
async function loadAuthCaptcha() {
  const loginQ = document.getElementById('login-captcha-q');
  const signupQ = document.getElementById('signup-captcha-q');
  if (loginQ) loginQ.textContent = 'Loading...';
  if (signupQ) signupQ.textContent = 'Loading...';

  try {
    const r = await api('/api/captcha');
    if (r.question) {
      if (loginQ) loginQ.textContent = r.question;
      if (signupQ) signupQ.textContent = r.question;
    } else {
      if (loginQ) loginQ.textContent = 'Security code unavailable';
      if (signupQ) signupQ.textContent = 'Security code unavailable';
    }
    // Clear previous answers
    const loginCaptcha = document.getElementById('login-captcha');
    const signupCaptcha = document.getElementById('signup-captcha');
    if (loginCaptcha) loginCaptcha.value = '';
    if (signupCaptcha) signupCaptcha.value = '';
  } catch(e) {
    console.error('Captcha load error:', e);
    if (loginQ) loginQ.textContent = 'Security code unavailable';
    if (signupQ) signupQ.textContent = 'Security code unavailable';
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const captchaAnswer = document.getElementById('login-captcha')?.value || '';
  const err = document.getElementById('login-error');
  if(!email || !password) { err.textContent = 'Please enter email and password'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { err.textContent = 'Please enter a valid email address'; return; }
  if(!captchaAnswer.trim()) { err.textContent = 'Please enter the security code'; return; }
  
  window.pendingAuth = { type: 'login', email, password, captchaAnswer };
  sendEmailOTP(email, 'auth-login-form', 'login-error', captchaAnswer);
}

async function handleSignup() {
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const gender = document.getElementById('signup-gender')?.value || 'female';
  const phone = document.getElementById('signup-phone')?.value || '';
  const captchaAnswer = document.getElementById('signup-captcha')?.value || '';
  const err = document.getElementById('signup-error');
  
  if(!name || !email) { err.textContent = 'Please fill name and email'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { err.textContent = 'Please enter a valid email address'; return; }
  if(!captchaAnswer.trim()) { err.textContent = 'Please enter the security code'; return; }

  window.pendingAuth = { type: 'signup', name, email, phone, gender, captchaAnswer };
  sendEmailOTP(email, 'auth-signup-form', 'signup-error', captchaAnswer);
}

async function handlePhoneLogin() {
  // Phone login disabled — redirect user to email login flow
  const err = document.getElementById('phone-login-error');
  if (err) err.textContent = 'Phone login is disabled. Please use Email login.';
}

async function sendEmailOTP(email, currentFormId, errorId, captchaAnswer = '', isResend = false) {
  const err = document.getElementById(errorId);
  const btnId = currentFormId === 'auth-login-form' ? 'login-btn' : 'signup-btn';
  const btn = document.getElementById(btnId);
  if (err) err.textContent = '';

  if (authOtpRequestInFlight) {
    if (err) err.textContent = 'OTP request is already in progress. Please wait.';
    return;
  }

  // Validate captcha answer before sending if not resending
  if (!isResend) {
    if (!captchaAnswer || !captchaAnswer.trim()) {
      if (err) err.textContent = 'Please enter the security code';
      return;
    }
  }

  authOtpRequestInFlight = true;
  
  if (btn) { btn.disabled = true; btn.textContent = 'Sending OTP... ✦'; }
  let resp = null;
  
  try {
    resp = await api('/api/otp/send-email', { 
      method: 'POST', 
      body: { 
        email: email.trim().toLowerCase(), 
        captchaAnswer: isResend ? '' : captchaAnswer.trim(),
        resend: isResend
      }, 
      timeoutMs: 45000 
    });
    
    authOtpRequestInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = currentFormId === 'auth-login-form' ? 'Sign In' : 'Send OTP ✦'; }
    
    if (resp.error) {
      const raw = String(resp.error || '');
      // Refresh captcha on any error so user can retry (only if not resending)
      if (!isResend) await loadAuthCaptcha();
      if (/535|badcredentials|invalid login|username and password not accepted/i.test(raw)) {
        if (err) err.textContent = 'Email OTP service is not configured correctly. Please try Google login or contact support.';
      } else {
        if (err) err.textContent = raw;
        toast(raw, 'error');
      }
      return;
    }

    toast('OTP sent successfully', 'success');
    authOtpResendEndsAt = Date.now() + 60000;
    const resendBtn = document.getElementById('resend-otp-btn');
    if (resendBtn) {
      resendBtn.disabled = true;
    }
    
  // ── Premium OTP Countdown Timer ──
  if (authOtpResendTimer) clearInterval(authOtpResendTimer);
  const countdownEl = document.getElementById('otp-countdown');
  const timerDisplay = document.getElementById('otp-timer-display');
  
  authOtpResendTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((authOtpResendEndsAt - Date.now()) / 1000));
    const resendNode = document.getElementById('resend-otp-btn');
    const countdownNode = document.getElementById('otp-countdown');
    const timerNode = document.getElementById('otp-timer-display');
    if (!resendNode) return;
    
    if (remaining <= 0) {
      if (resendNode) { resendNode.disabled = false; resendNode.innerHTML = '<i class="fas fa-redo-alt"></i> Resend OTP'; }
      if (timerNode) timerNode.style.display = 'none';
      clearInterval(authOtpResendTimer);
      authOtpResendTimer = null;
      return;
    }
    if (countdownNode) countdownNode.textContent = remaining;
    if (timerNode) timerNode.style.display = '';
  }, 1000);
  
  // ── Show Premium OTP Step ──
  document.getElementById(currentFormId).style.display = 'none';
  document.getElementById('otp-error').textContent = '';
  document.getElementById('auth-otp-input').value = '';
  const otpSuccess = document.getElementById('otp-success');
  if (otpSuccess) otpSuccess.style.display = 'none';
  document.getElementById('auth-otp-step').style.display = 'block';
  document.getElementById('otp-title').textContent = 'Verify Your Email';
  document.getElementById('otp-subtitle').textContent = `We've sent a 6-digit verification code to your email`;
  
  // Show email in the badge
  const emailDisplay = document.getElementById('otp-target-email');
  if (emailDisplay) emailDisplay.textContent = email;
  
  // Initialize 6-box OTP input
  initOtpBoxes();
  
  document.getElementById('verify-otp-btn').onclick = () => verifyEmailOTP();
  } catch (error) {
    authOtpRequestInFlight = false;
    if (btn) { btn.disabled = false; btn.textContent = currentFormId === 'auth-login-form' ? 'Sign In' : 'Send OTP ✦'; }
    err.textContent = 'Network error or timeout. Please try again.';
    toast('Network error or timeout. Please try again.', 'error');
    await loadAuthCaptcha();
  }
  
  // Show OTP in dev mode if available
  if (resp && (resp.debugOTP || resp.devOtp)) {
    const devMsg = `DEV MODE: Your OTP is ${resp.debugOTP || resp.devOtp}. This will only show in development.`;
    document.getElementById('otp-error').textContent = devMsg;
    console.log(devMsg);
  }
}

async function sendPhoneOTP(phone) {
  const err = document.getElementById('phone-login-error');
  const btn = document.getElementById('login-phone-btn');
  err.textContent = '';
  
  if (btn) { btn.disabled = true; btn.textContent = 'Sending OTP... 📱'; }
  
  const resp = await api('/api/otp/send', { method: 'POST', body: { phone } });
  
  if (btn) { btn.disabled = false; btn.textContent = 'Get OTP'; }
  
  if (resp.error) { err.textContent = resp.error; return; }
  
  document.getElementById('phone-login-fields').style.display = 'none';
  document.getElementById('otp-error').textContent = '';
  document.getElementById('auth-otp-input').value = '';
  document.getElementById('auth-otp-step').style.display = 'block';
  document.getElementById('otp-title').textContent = 'Verify Phone';
  document.getElementById('otp-subtitle').textContent = `We've sent a 6-digit code to ${phone}`;
  document.getElementById('verify-otp-btn').onclick = () => verifyPhoneOTP();
  toast('OTP sent successfully', 'success');
}

// ── PREMIUM 6-BOX OTP INPUT HANDLER ──────────────────────────
function initOtpBoxes() {
  const boxes = document.querySelectorAll('#otp-input-row .otp-box');
  if (!boxes.length) return;
  
  // Clear all boxes
  boxes.forEach(box => {
    box.value = '';
    box.classList.remove('filled', 'error', 'success');
  });
  
  // Focus first box
  setTimeout(() => boxes[0]?.focus(), 150);
  
  boxes.forEach((box, idx) => {
    // Remove old listeners by cloning
    const newBox = box.cloneNode(true);
    box.parentNode.replaceChild(newBox, box);
  });
  
  // Re-select after cloning
  const freshBoxes = document.querySelectorAll('#otp-input-row .otp-box');
  const verifyBtn = document.getElementById('verify-otp-btn');
  const hiddenInput = document.getElementById('auth-otp-input');
  
  function syncHiddenInput() {
    const val = Array.from(freshBoxes).map(b => b.value).join('');
    if (hiddenInput) hiddenInput.value = val;
    if (verifyBtn) verifyBtn.disabled = val.length !== 6;
  }
  
  freshBoxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val.slice(0, 1);
      
      if (val && idx < 5) freshBoxes[idx + 1].focus();
      box.classList.toggle('filled', !!val);
      syncHiddenInput();
      
      // Auto-verify when all 6 digits entered
      const fullOtp = Array.from(freshBoxes).map(b => b.value).join('');
      if (fullOtp.length === 6) {
        setTimeout(() => verifyEmailOTP(), 200);
      }
    });
    
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        freshBoxes[idx - 1].focus();
        freshBoxes[idx - 1].value = '';
        freshBoxes[idx - 1].classList.remove('filled');
        syncHiddenInput();
      }
      if (e.key === 'ArrowLeft' && idx > 0) freshBoxes[idx - 1].focus();
      if (e.key === 'ArrowRight' && idx < 5) freshBoxes[idx + 1].focus();
    });
    
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      paste.split('').forEach((ch, i) => {
        if (freshBoxes[i]) {
          freshBoxes[i].value = ch;
          freshBoxes[i].classList.add('filled');
        }
      });
      const lastIdx = Math.min(paste.length, 5);
      freshBoxes[lastIdx]?.focus();
      syncHiddenInput();
      
      if (paste.length === 6) {
        setTimeout(() => verifyEmailOTP(), 200);
      }
    });
    
    box.addEventListener('focus', () => box.select());
  });
  
  setTimeout(() => freshBoxes[0]?.focus(), 200);
}

async function verifyEmailOTP() {
  const boxes = document.querySelectorAll('#otp-input-row .otp-box');
  const otp = boxes.length ? Array.from(boxes).map(b => b.value).join('') : String(document.getElementById('auth-otp-input').value || '').replace(/\D/g, '').slice(0, 6);
  const err = document.getElementById('otp-error');
  const email = window.pendingAuth.email;
  const verifyBtn = document.getElementById('verify-otp-btn');
  const btnText = verifyBtn?.querySelector('.otp-btn-text');
  const btnLoader = verifyBtn?.querySelector('.otp-btn-loader');

  if (otp.length !== 6) {
    err.textContent = 'Please enter a valid 6-digit OTP';
    boxes.forEach(b => b.classList.add('error'));
    setTimeout(() => boxes.forEach(b => b.classList.remove('error')), 600);
    return;
  }
  
  // Show loading state
  if (btnText) btnText.style.display = 'none';
  if (btnLoader) btnLoader.style.display = 'inline-flex';
  if (verifyBtn) verifyBtn.disabled = true;
  err.textContent = '';
  
  const resp = await api('/api/otp/verify-email', { method: 'POST', body: { email, otp } });
  
  if (resp.error) {
    // Reset button
    if (btnText) btnText.style.display = 'inline-flex';
    if (btnLoader) btnLoader.style.display = 'none';
    if (verifyBtn) verifyBtn.disabled = false;
    err.textContent = resp.error;
    boxes.forEach(b => b.classList.add('error'));
    setTimeout(() => boxes.forEach(b => b.classList.remove('error')), 600);
    return;
  }

  // ── SUCCESS ANIMATION ──
  boxes.forEach(b => { b.classList.remove('error'); b.classList.add('success'); });
  const otpSuccess = document.getElementById('otp-success');
  if (otpSuccess) otpSuccess.style.display = 'block';
  err.textContent = '';

  const p = window.pendingAuth;
  if (p.type === 'signup') {
    setTimeout(() => {
      document.getElementById('auth-otp-step').style.display = 'none';
      document.getElementById('signup-password-step-error').textContent = '';
      document.getElementById('signup-password-step').value = '';
      document.getElementById('signup-confirm-password-step').value = '';
      document.getElementById('auth-signup-password-step').style.display = 'block';
      toast('Email verified. Now set your password.', 'success');
    }, 800);
    return;
  }

  // OTP Verified, now complete the original login action
  const endpoint = p.type === 'login' ? '/api/login' : '/api/signup';
  const finalResp = await api(endpoint, { method: 'POST', body: p });
  
  // Reset button
  if (btnText) btnText.style.display = 'inline-flex';
  if (btnLoader) btnLoader.style.display = 'none';
  
  if (finalResp.error) { err.textContent = finalResp.error; return; }
  
  // Save JWT token and user data with persistent session
  if (finalResp.token) {
    setJWTToken(finalResp.token);
    localStorage.setItem('authToken', finalResp.token);
    localStorage.setItem('loginTime', Date.now());
    localStorage.setItem('sessionId', finalResp.sessionId || generateClientSessionId());
    localStorage.setItem('otpLoginSource', 'email');
  }
  
  currentUser = finalResp.user;
  saveCurrentUser(currentUser);
  updateHeader();
  closeAuthModal();
  toast(`Welcome ${currentUser.name}! ✦`, 'success');
  updateCartCount();
  updateWishlistCount();
  if (currentUser.role === 'admin') navigate('/admin');
  else navigate('/'); // Redirect to home page after login
}

async function verifyPhoneOTP() {
  const otp = String(document.getElementById('auth-otp-input').value || '').replace(/\D/g, '').slice(0, 6);
  const err = document.getElementById('otp-error');
  const phone = window.pendingAuth.phone;

  if (otp.length !== 6) {
    err.textContent = 'Please enter a valid 6-digit OTP';
    return;
  }
  
  const resp = await api('/api/otp/verify', { method: 'POST', body: { phone, otp } });
  if (resp.error) { err.textContent = resp.error; return; }

  // Phone verified - login via phone works slightly differently
  // For now, we'll show a message and require manual verification
  toast('Phone verified! Your account is logged in. ✦', 'success');
  currentUser = { name: phone, phone: phone, role: 'user' };
  updateHeader();
  closeAuthModal();
  updateCartCount();
  updateWishlistCount();
  navigate('/');
}

async function completeSignupAfterOTP() {
  const password = document.getElementById('signup-password-step').value;
  const confirmPassword = document.getElementById('signup-confirm-password-step').value;
  const err = document.getElementById('signup-password-step-error');
  const btn = document.getElementById('signup-password-btn');

  if (!window.pendingAuth || window.pendingAuth.type !== 'signup') {
    err.textContent = 'Signup session expired. Please start again.';
    return;
  }
  if (!password) { err.textContent = 'Please enter password'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
  if (password !== confirmPassword) { err.textContent = 'Passwords do not match'; return; }

  const payload = { ...window.pendingAuth, password };
  if (btn) { btn.disabled = true; btn.textContent = 'Creating Account... ⏳'; }
  
  try {
    const finalResp = await api('/api/signup', { method: 'POST', body: payload });
    if (finalResp.error) { 
      err.textContent = finalResp.error; 
      if (btn) { btn.disabled = false; btn.textContent = 'Create Account ✦'; }
      return; 
    }

    // Save JWT token and user data
    if (finalResp.token) {
      setJWTToken(finalResp.token);
    }
    
    currentUser = finalResp.user;
    saveCurrentUser(currentUser);
    updateHeader();
    closeAuthModal();
    toast(`Welcome ${currentUser.name}! ✦`, 'success');
    updateCartCount();
    updateWishlistCount();
    navigate('/'); // Redirect to home page after signup
  } catch (error) {
    console.error('Signup error:', error);
    err.textContent = 'An error occurred during account creation. Please try again.';
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account ✦'; }
  }
}

function resendEmailOTP() {
  if (authOtpRequestInFlight) return;
  if (authOtpResendEndsAt && Date.now() < authOtpResendEndsAt) return;
  if (window.pendingAuth) {
    if (window.pendingAuth.loginType === 'phone' && window.pendingAuth.phone) {
      sendPhoneOTP(window.pendingAuth.phone);
    } else if (window.pendingAuth.email) {
      sendEmailOTP(window.pendingAuth.email, 'auth-otp-step', 'otp-error', '', true);
    }
  }
}

function toggleDesc(btn) {
  const p = btn.previousElementSibling;
  if(p.classList.contains('desc-collapsed')) {
    p.classList.remove('desc-collapsed');
    btn.textContent = 'See Less';
  } else {
    p.classList.add('desc-collapsed');
    btn.textContent = 'See More';
  }
}


function toggleSpec(el) {
  const item = el.closest('.spec-item');
  const isActive = item.classList.contains('active');
  document.querySelectorAll('.spec-item').forEach(i => i.classList.remove('active'));
  if (!isActive) item.classList.add('active');
}

async function handleLogout() {
  try {
    if (window.lenchoFirebaseAuth && typeof window.lenchoFirebaseAuth.signOut === 'function') {
      await window.lenchoFirebaseAuth.signOut();
    }
  } catch (e) {
    console.warn('Firebase sign out failed:', e);
  }

  try {
    await api('/api/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Logout API call failed:', e);
  }
  
  // Clear all authentication data
  clearAuth();
  
  // Clear all localStorage auth data (including all variations)
  localStorage.removeItem('authToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('googleLoginSource');
  localStorage.removeItem('loginTime');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('jwtToken');
  localStorage.removeItem(JWT_TOKEN_KEY);
  localStorage.removeItem(JWT_USER_KEY);
  
  // Clear session data
  if (window.sessionStorage) {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.clear();
  }
  
  // Reset global state
  currentUser = null;
  cartCount = 0;
  wishlistCount = 0;
  updateHeader();
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) cartCountEl.textContent = '0';
  const wishlistCountEl = document.getElementById('wishlist-count');
  if (wishlistCountEl) {
    wishlistCountEl.textContent = '0';
    wishlistCountEl.style.display = 'none';
  }
  
  toast('Logged out successfully', 'info');
  navigate('/');
}

// ── CART COUNT (INSTANT UPDATES & LOCAL CACHE) ───────────
async function updateCartCount() {
  if (!currentUser) { document.getElementById('cart-count').textContent = '0'; return; }
  const cacheKey = 'cart_cache_' + currentUser.id;
  try {
    // 1. Optimistic restore from local storage cache
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      cartCount = (cached.items || []).reduce((sum, i) => sum + i.quantity, 0);
      const cartBadge = document.getElementById('cart-count');
      if (cartBadge) cartBadge.textContent = cartCount;
      updateCartButtonsUI();
    }

    // 2. Fetch fresh cart from server
    const r = await api('/api/cart');
    if (r && !r.error) {
      localStorage.setItem(cacheKey, JSON.stringify(r));
      cartCount = (r.items || []).reduce((sum, i) => sum + i.quantity, 0);
      const cartBadge = document.getElementById('cart-count');
      if (cartBadge) cartBadge.textContent = cartCount;
      updateCartButtonsUI();
    }
  } catch (e) {
    console.error('Cart count update error:', e);
  }
}

// ── WISHLIST COUNT (INSTANT UPDATES & LOCAL CACHE) ────────
let wishlistCount = 0;
async function updateWishlistCount() {
  const badge = document.getElementById('wishlist-count');
  if (!badge) return;
  if (!currentUser) {
    badge.textContent = '0';
    badge.style.display = 'none';
    return;
  }
  const cacheKey = 'wishlist_cache_' + currentUser.id;
  try {
    // 1. Optimistic restore from cache
    const cachedRaw = localStorage.getItem(cacheKey);
    if (cachedRaw) {
      const items = JSON.parse(cachedRaw) || [];
      wishlistCount = items.length;
      badge.textContent = wishlistCount;
      badge.style.display = wishlistCount > 0 ? 'flex' : 'none';
    }

    // 2. Background fetch
    const r = await api('/api/wishlist');
    if (Array.isArray(r)) {
      localStorage.setItem(cacheKey, JSON.stringify(r));
      wishlistCount = r.length;
      badge.textContent = wishlistCount;
      badge.style.display = wishlistCount > 0 ? 'flex' : 'none';
    }
  } catch (e) {
    console.error('Wishlist count update error:', e);
  }
}

// Helper: Update badge immediately (optimistic)
function updateCartBadgeOptimistic(newCount) {
  cartCount = Math.max(0, newCount);
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = cartCount;
}

// Add to cart with INSTANT UI update (no waiting for server)
async function addToCart(productId, showToast = true) {
  if (!currentUser) { openAuthModal(); return; }
  const cacheKey = 'cart_cache_' + currentUser.id;
  
  // ✓ INSTANT OPTIMISTIC UPDATE
  try {
    const raw = localStorage.getItem(cacheKey);
    let cached = { items: [] };
    if (raw) cached = JSON.parse(raw);
    const existing = (cached.items || []).find(i => i.productId === productId);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      (cached.items || []).push({ productId, quantity: 1, product: { id: productId, _id: productId } });
    }
    localStorage.setItem(cacheKey, JSON.stringify(cached));
    const freshCount = (cached.items || []).reduce((sum, i) => sum + i.quantity, 0);
    updateCartBadgeOptimistic(freshCount);
    updateCartButtonsUI();
  } catch (e) {
    updateCartBadgeOptimistic(cartCount + 1);
  }
  
  if (showToast) toast('Product added to cart successfully', 'success');
  
  // Background: Sync with server
  try {
    const r = await api('/api/cart/add', { method: 'POST', body: { productId, quantity: 1 } });
    if (r.error) { 
      toast(r.error, 'error'); 
      updateCartCount(); 
      return; 
    }
    
    // Sync with server in background to get actual cart data
    const fresh = await api('/api/cart');
    if (fresh && !fresh.error) {
      localStorage.setItem(cacheKey, JSON.stringify(fresh));
      const freshCount = (fresh.items || []).reduce((sum, i) => sum + i.quantity, 0);
      updateCartBadgeOptimistic(freshCount);
      updateCartButtonsUI();
      // Refresh cart page if open
      if (location.pathname === '/cart') {
        renderCart();
      }
    }
  } catch (e) {
    console.error('Add to cart error:', e);
    updateCartCount(); // Fallback: sync with server
  }
}

// Remove from cart with INSTANT feedback
async function removeFromCart(productId) {
  if (!currentUser) return;
  const cacheKey = 'cart_cache_' + currentUser.id;

  // ✓ INSTANT OPTIMISTIC UPDATE
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const cached = JSON.parse(raw);
      cached.items = (cached.items || []).filter(i => i.productId !== productId);
      localStorage.setItem(cacheKey, JSON.stringify(cached));
      const freshCount = cached.items.reduce((sum, i) => sum + i.quantity, 0);
      updateCartBadgeOptimistic(freshCount);
      toast('Item removed from cart', 'info');
      if (location.pathname === '/cart') {
        renderCart();
      }
    }
  } catch (e) {
    console.error('Optimistic remove failed:', e);
  }
  
  // Background: Sync with server
  try {
    const r = await api(`/api/cart/${productId}`, { method: 'DELETE' });
    if (r.error) {
      toast(r.error, 'error');
      updateCartCount();
      return;
    }
    const fresh = await api('/api/cart');
    if (fresh && !fresh.error) {
      localStorage.setItem(cacheKey, JSON.stringify(fresh));
      renderCart();
    }
  } catch (e) {
    console.error('Remove from cart error:', e);
    updateCartCount(); // Fallback: sync with server
  }
}

// Clear entire cart with confirmation
async function clearCart() {
  const confirmed = confirm('Are you sure you want to clear your entire cart? This action cannot be undone.');
  if (!confirmed) return;
  if (!currentUser) return;
  const cacheKey = 'cart_cache_' + currentUser.id;
  
  // ✓ INSTANT OPTIMISTIC UPDATE
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ items: [], count: 0 }));
    updateCartBadgeOptimistic(0);
    toast('Cart cleared!', 'success');
    if (location.pathname === '/cart') {
      renderCart();
    }
  } catch (e) {
    console.error('Optimistic clear failed:', e);
  }
  
  // Background: Sync with server
  try {
    const r = await api('/api/cart', { method: 'DELETE' });
    if (r.error) {
      toast(r.error, 'error');
      updateCartCount();
      return;
    }
  } catch (e) {
    console.error('Clear cart error:', e);
    updateCartCount(); // Fallback
  }
}

// Wishlist with INSTANT updates
async function toggleWishlist(productId, btn) {
  if (!currentUser) { openAuthModal(); return; }
  
  // ✓ INSTANT UI UPDATE
  const willAdd = !btn.classList.contains('active');
  btn.classList.toggle('active');
  
  if (btn.classList.contains('btn-wishlist-large')) {
    btn.innerHTML = `<i class="fas fa-heart"></i> ${willAdd ? 'Remove from Watchlist' : 'Add to Watchlist'}`;
  }
  
  // Optimistically update count
  const badge = document.getElementById('wishlist-count');
  if (badge) {
    wishlistCount = Math.max(0, wishlistCount + (willAdd ? 1 : -1));
    badge.textContent = wishlistCount;
    badge.style.display = wishlistCount > 0 ? 'flex' : 'none';
    localStorage.setItem('wishlist_count_' + currentUser.id, wishlistCount);
  }
  
  if (willAdd) toast('Product added to wishlist successfully', 'success');
  else toast('Removed from watchlist', 'info');
  
  // Background: Sync with server
  try {
    const r = await api('/api/wishlist/toggle', { method: 'POST', body: { productId } });
    if (r.error) {
      toast(r.error, 'error');
      btn.classList.toggle('active');
      if (btn.classList.contains('btn-wishlist-large')) {
        btn.innerHTML = `<i class="fas fa-heart"></i> ${!willAdd ? 'Remove from Watchlist' : 'Add to Watchlist'}`;
      }
      updateWishlistCount();
      return;
    }
    
    // Sync with server in background to get actual wishlist items
    const fresh = await api('/api/wishlist');
    if (Array.isArray(fresh)) {
      localStorage.setItem('wishlist_cache_' + currentUser.id, JSON.stringify(fresh));
      wishlistCount = fresh.length;
      if (badge) {
        badge.textContent = wishlistCount;
        badge.style.display = wishlistCount > 0 ? 'flex' : 'none';
      }
      if (location.pathname === '/wishlist') {
        renderWishlist();
      }
    }
  } catch (e) {
    console.error('Wishlist toggle error:', e);
    btn.classList.toggle('active'); // Revert on error
    if (btn.classList.contains('btn-wishlist-large')) {
      btn.innerHTML = `<i class="fas fa-heart"></i> ${!willAdd ? 'Remove from Watchlist' : 'Add to Watchlist'}`;
    }
    updateWishlistCount();
  }
}

// Buy Now - DIRECT to product checkout (not through add-to-cart)
async function buyNow(productId) {
  if (!currentUser) { openAuthModal(); return; }
  navigate(`/checkout-now/${productId}`);
  toast('Opening checkout...', 'success');
}

// ── DISCOUNT POPUP (SHOW ONCE PER SESSION) ────────────────
function showDiscountPopup() {
  if (sessionStorage.getItem('popupShown')) return;
  
  const popup = document.getElementById('discount-popup');
  if (!popup) return;
  
  popup.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  sessionStorage.setItem('popupShown', '1');
}

function closePopup() {
  const popup = document.getElementById('discount-popup');
  if (!popup) return;
  popup.style.display = 'none';
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  sessionStorage.setItem('popupShown', '1'); // Force save just in case
}
async function claimDiscount() {
  const email = document.getElementById('popup-email')?.value;
  if (!email) { toast('Please enter your email', 'error'); return; }
  const btn = document.querySelector('.popup-form .btn-primary');
  const form = document.querySelector('.popup-form');
  
  btn.textContent = 'Claiming...'; btn.disabled = true;
  const r = await api('/api/discount/email', { method: 'POST', body: { email } });
  
  if (r.error) { 
    toast(r.error, 'error'); 
    btn.textContent = 'Claim My Discount 🎁'; 
    btn.disabled = false; 
    return; 
  }
  
  // Hide form and show result
  if (form) form.style.display = 'none';
  const result = document.getElementById('popup-result');
  result.innerHTML = `<div style="text-align:center;padding:1rem;">🎉 Thank you! Your code:<br/><strong style="color:var(--rose-dark);font-size:1.6rem;display:block;margin:10px 0;">WELCOME10</strong> — 10% OFF applied!</div>`;
  setTimeout(closePopup, 5000);
}

// ── HEADER SCROLL ─────────────────────────────────────────
function initHeader() {
  const h = document.getElementById('site-header');
  const headerInner = document.querySelector('.header-inner');
  const mainNav = document.getElementById('main-nav');
  const headerActions = document.querySelector('.header-actions');
  const navClose = document.getElementById('nav-close-btn');

  function syncMobileHeaderLayout() {
    if (!headerInner || !mainNav || !headerActions || !navClose) return;
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      if (!mainNav.contains(headerActions)) {
        headerActions.classList.add('mobile-nav-actions');
        navClose.insertAdjacentElement('afterend', headerActions);
      }
    } else {
      if (!headerInner.contains(headerActions)) {
        headerActions.classList.remove('mobile-nav-actions');
        headerInner.appendChild(headerActions);
      }
    }
  }

  const closeMobileMenu = () => {
    const nav = document.getElementById('main-nav');
    if (window.innerWidth <= 768 && nav) nav.classList.remove('open');
  };

  syncMobileHeaderLayout();
  window.addEventListener('resize', syncMobileHeaderLayout, { passive: true });

  window.addEventListener('scroll', () => {
    h.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
  document.getElementById('hamburger-btn').addEventListener('click', () => {
    document.getElementById('main-nav').classList.add('open');
  });
  document.getElementById('nav-close-btn').addEventListener('click', () => {
    document.getElementById('main-nav').classList.remove('open');
  });
  document.querySelectorAll('.nav-link').forEach(l => {
    l.addEventListener('click', closeMobileMenu);
  });

  // Close drawer on all actionable elements inside mobile nav.
  document.querySelectorAll('#main-nav a, #main-nav .icon-btn').forEach(el => {
    el.addEventListener('click', closeMobileMenu);
  });

  // Safety guard: if the header actions are ever left inside the mobile nav
  // while on desktop (due to a race), move them back to the header.
  try {
    const mo = new MutationObserver(() => {
      if (window.innerWidth > 768 && mainNav.contains(headerActions) && headerInner) {
        headerActions.classList.remove('mobile-nav-actions');
        headerInner.appendChild(headerActions);
      }
    });
    mo.observe(mainNav, { attributes: true, attributeFilter: ['class'] });
  } catch (e) { /* ignore if MutationObserver not available */ }
}

// ── MOBILE NAV DROPDOWN TOGGLE ────────────────────────────
function toggleNavDropdown(e) {
  e.stopPropagation();
  const isMobile = window.innerWidth <= 768;
  const dd = document.getElementById('nav-collections-dd');
  const arrow = document.getElementById('coll-arrow');
  if (isMobile) {
    // On mobile: toggle open/close
    const isOpen = dd.classList.contains('mob-open');
    dd.classList.toggle('mob-open', !isOpen);
    if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  } else {
    // On desktop: navigate directly
    navigate('/products');
  }
}

// ── FOOTER DROPDOWN TOGGLE (Mobile) ────────────────────────
function toggleFooterDropdown(el) {
  const isMobile = window.innerWidth <= 768;
  if (!isMobile) return;
  
  el.stopPropagation?.();
  const isOpen = el.classList.contains('open');
  
  if (isOpen) {
    el.classList.remove('open');
    el.classList.add('closed');
  } else {
    el.classList.remove('closed');
    el.classList.add('open');
  }
}

// Initialize footer dropdowns as closed on mobile on page load
function initFooterDropdowns() {
  if (window.innerWidth <= 768) {
    document.querySelectorAll('.footer-dropdown').forEach((el) => {
      el.classList.add('closed');
      el.classList.remove('open');
    });
  } else {
    // On desktop, remove closed class and show everything
    document.querySelectorAll('.footer-dropdown').forEach((el) => {
      el.classList.remove('closed', 'open');
    });
  }
}

// Call on load and on resize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFooterDropdowns);
} else {
  initFooterDropdowns();
}
window.addEventListener('resize', initFooterDropdowns);

// ── DYNAMIC COLLECTIONS HEADER ────────────────────────────
async function loadHeaderCollections() {
  const container = document.getElementById('header-collections-menu');
  if (!container) return;
  try {
    const cats = await api('/api/categories');
    if (Array.isArray(cats) && cats.length > 0) {
      container.innerHTML = cats.map(c => `
        <a href="/products?category=${c.slug}" onclick="event.preventDefault(); navigate('/products?category=${c.slug}')">${c.icon ? c.icon + ' ' : ''}${c.name}</a>
      `).join('');
    }
  } catch (e) {
    console.error('Error loading header collections:', e);
  }
}

// ── DYNAMIC CART ACTION BUTTONS UI ────────────────────────
function updateCartButtonsUI() {
  if (!currentUser) return;
  const cacheKey = 'cart_cache_' + currentUser.id;
  let cart = { items: [] };
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cart = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading cart cache:', e);
  }
  
  const items = cart.items || [];
  
  document.querySelectorAll('[data-product-actions]').forEach(el => {
    const productId = el.getAttribute('data-product-actions');
    const item = items.find(i => i.productId === productId);
    
    // Determine context (Details Page vs Product Card)
    const isDetailPage = el.classList.contains('product-actions') && !el.closest('.product-card');
    
    if (item) {
      const qty = item.quantity || 1;
      el.innerHTML = `
        <div class="qty-control" style="display:flex;align-items:center;justify-content:center;gap:0.75rem;width:100%;margin-bottom:0.5rem;background:var(--beige);padding:8px;border-radius:8px;">
          <button class="qty-btn" onclick="event.stopPropagation(); updateQty('${productId}', ${qty - 1})" style="width:30px;height:30px;border-radius:50%;border:none;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><i class="fas fa-minus" style="font-size:0.8rem;color:var(--rose);"></i></button>
          <span style="font-weight:700;font-size:1.1rem;color:var(--dark);min-width:1.5rem;text-align:center;">${qty}</span>
          <button class="qty-btn" onclick="event.stopPropagation(); updateQty('${productId}', ${qty + 1})" style="width:30px;height:30px;border-radius:50%;border:none;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);"><i class="fas fa-plus" style="font-size:0.8rem;color:var(--rose);"></i></button>
        </div>
        ${!isDetailPage ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;width:100%;">
          <button class="btn-outline btn-sm" onclick="navigate('/product/${productId}')" style="padding:10px;border-radius:8px;border:2px solid var(--rose);background:#fff;color:var(--rose);font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.background='var(--rose-light)'" onmouseout="this.style.background='#fff'">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn-gold btn-sm" onclick="event.stopPropagation(); buyNow('${productId}')" style="padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9954c,#a67a38);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
        </div>
        ` : `
        <div style="display:flex;gap:.5rem;width:100%;margin-top:0.5rem;">
          <button class="btn-buy-now" onclick="buyNow('${productId}')" style="flex:1;">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
          <button class="btn-wishlist-large" onclick="toggleWishlist('${productId}',this)">
            <i class="fas fa-heart"></i> Watchlist
          </button>
        </div>
        `}
      `;
    } else {
      if (!isDetailPage) {
        el.innerHTML = `
          <button class="btn-primary btn-sm" onclick="addToCart('${productId}')" style="flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <i class="fas fa-shopping-bag"></i> Add to Cart
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
            <button class="btn-outline btn-sm" onclick="navigate('/product/${productId}')" style="padding:10px;border-radius:8px;border:2px solid var(--rose);background:#fff;color:var(--rose);font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.background='var(--rose-light)'" onmouseout="this.style.background='#fff'">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn-gold btn-sm" onclick="event.stopPropagation(); buyNow('${productId}')" style="padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9954c,#a67a38);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              <i class="fas fa-bolt"></i> Buy Now
            </button>
          </div>
        `;
      } else {
        el.innerHTML = `
          <button class="btn-add-to-cart" onclick="addToCart('${productId}')">
            <i class="fas fa-shopping-bag"></i> Add to Cart
          </button>
          <button class="btn-buy-now" onclick="buyNow('${productId}')">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
          <button class="btn-wishlist-large" onclick="toggleWishlist('${productId}',this)">
            <i class="fas fa-heart"></i> Watchlist
          </button>
        `;
      }
    }
  });
}

// Close mobile dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dd = document.getElementById('nav-collections-dd');
  if (dd && !dd.contains(e.target)) {
    dd.classList.remove('mob-open');
    const arrow = document.getElementById('coll-arrow');
    if (arrow) arrow.style.transform = '';
  }
});

// ── SCROLL REVEAL ─────────────────────────────────────────
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el => obs.observe(el));
}

// ── STARS HELPER ─────────────────────────────────────────
function renderStars(rating) {
  const full = Math.floor(rating), half = rating % 1 >= 0.5;
  let s = '';
  for (let i = 0; i < full; i++) s += '<i class="fas fa-star"></i>';
  if (half) s += '<i class="fas fa-star-half-alt"></i>';
  for (let i = Math.ceil(rating); i < 5; i++) s += '<i class="far fa-star"></i>';
  return s;
}

function formatCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function formatDate(d) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

// ── PRODUCT CARD ─────────────────────────────────────────
function productCardHTML(p) {
  const product = normalizeClientProduct(p);
  const secondaryImg = product.images[1] || product.images[0];
  const stockStatus = p.stock < 5 && p.stock > 0 ? '⚡ Only ' + p.stock + ' left!' : '';
  const isFeatured = p.featured ? '⭐ Trending' : '';
  const badge = isFeatured || stockStatus || (p.discount > 30 ? '🔥 Hot Deal' : '');
  
  let inWishlist = false;
  if (currentUser) {
    try {
      const cachedRaw = localStorage.getItem('wishlist_cache_' + currentUser.id);
      if (cachedRaw) {
        const items = JSON.parse(cachedRaw) || [];
        inWishlist = items.some(item => (item.id || item._id || item.productId) === product.id);
      }
    } catch(e) {}
  }
  
  return `
  <div class="product-card reveal" style="border-radius:16px !important;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08) !important;transition:transform .3s ease,box-shadow .3s ease !important;background:#fff;border:1px solid rgba(201,106,138,.08);" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 12px 32px rgba(201,106,138,.15) !important';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 16px rgba(0,0,0,.08) !important';">
    <div class="product-img-wrap" onclick="navigate('/product/${product.id}')" style="position:relative;overflow:hidden;aspect-ratio:1/1.15;cursor:pointer;">
      <img class="product-img" src="${safeImageUrl(product.images[0], product.category)}" alt="${product.name}" loading="lazy" decoding="async" ${imageFallbackAttr(product.category)} style="width:100%;height:100%;object-fit:cover;transition:transform .5s ease !important;display:block;"/>
      <img class="product-img img-hover" src="${safeImageUrl(secondaryImg, product.category)}" alt="${product.name}" loading="lazy" decoding="async" ${imageFallbackAttr(product.category)} style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0;transition:opacity .4s ease !important;display:block;"/>
      
      ${p.discount ? `<span class="product-badge" style="position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:.75rem;z-index:2;">✦ ${p.discount}% OFF ✦</span>` : ''}
      
      ${badge ? `<span style="position:absolute;bottom:12px;left:12px;background:var(--gold);color:var(--dark);padding:6px 12px;border-radius:8px;font-weight:600;font-size:.75rem;z-index:2;">${badge}</span>` : ''}
      
      <button class="product-wish ${inWishlist ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}',this)" title="${inWishlist ? 'Remove from Watchlist' : 'Add to Watchlist'}" style="position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.95);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;transition:transform .2s;font-size:.9rem;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-heart"></i></button>
    </div>
    
    <div class="product-body" style="padding:1rem 1rem 1.2rem;">
      <div class="product-name" onclick="navigate('/product/${p.id}')" style="font-weight:600;font-size:.95rem;color:var(--dark);cursor:pointer;line-height:1.3;margin-bottom:.5rem;transition:color .2s;" onmouseover="this.style.color='var(--rose)'" onmouseout="this.style.color='var(--dark)'">${p.name}</div>
      
      <div class="product-rating" style="margin-bottom:.6rem;">
        <span class="stars" style="font-size:.85rem;">${renderStars(p.rating || 0)}</span>
        ${p.reviews?.length ? `<span class="rating-count" style="font-size:.75rem;color:var(--gray);margin-left:.5rem;">(${p.reviews.length})</span>` : ''}
      </div>
      
      <div class="product-price" style="margin-bottom:.75rem;">
        <span class="price-current" style="font-size:1.2rem;font-weight:700;color:var(--rose);">₹${Math.round(p.price)}</span>
        ${p.mrp ? `<span class="price-mrp" style="font-size:.85rem;color:var(--gray);text-decoration:line-through;margin-left:.5rem;">₹${Math.round(p.mrp)}</span>` : ''}
        ${p.discount ? `<span class="price-off" style="font-size:.75rem;color:var(--gold);margin-left:.5rem;font-weight:600;">Save ${p.discount}%</span>` : ''}
      </div>
      
      <div style="margin-bottom:0.75rem; padding:0.75rem; background:var(--beige); border-radius:8px; font-size:.8rem; color:var(--gray);">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:4px;">
          <i class="fas fa-truck-fast" style="color:var(--rose);"></i>
          <span><strong>Free</strong> delivery above ₹999</span>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;">
          <i class="fas fa-tag" style="color:var(--gold);"></i>
          <span>Standard delivery in 3-5 days</span>
        </div>
      </div>
      
      <div class="product-actions" data-product-actions="${p.id}" style="margin-top:1rem;display:flex;gap:.5rem;flex-direction:column;">
        <button class="btn-primary btn-sm" onclick="addToCart('${p.id}')" style="flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
          <i class="fas fa-shopping-bag"></i> Add to Cart
        </button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
          <button class="btn-outline btn-sm" onclick="navigate('/product/${p.id}')" style="padding:10px;border-radius:8px;border:2px solid var(--rose);background:#fff;color:var(--rose);font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.background='var(--rose-light)'" onmouseout="this.style.background='#fff'">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn-gold btn-sm" onclick="event.stopPropagation(); buyNow('${p.id}')" style="padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9954c,#a67a38);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function renderFallbackCollectionCards(container) {
  const fallbackCollections = shuffleArray([
    { name: 'Earrings', slug: 'earrings', image: '/images/earrings.png' },
    { name: 'Necklace Sets', slug: 'necklace', image: '/images/necklace.png' },
    { name: 'Rings', slug: 'rings', image: '/images/p1.png' },
    { name: 'Bridal Sets', slug: 'sets', image: '/images/showcase.png' },
    { name: 'Bangles', slug: 'bangles', image: '/images/p4.png' },
    { name: 'Bracelets', slug: 'bracelets', image: '/images/p1.png' },
  ]);

  container.innerHTML = fallbackCollections.map((c, i) => `
    <div class="cat-card reveal" style="animation-delay:${i * 0.05}s" onclick="navigate('/products?category=${c.slug}')">
      <img class="cat-img" src="${safeImageUrl(c.image, c.slug)}" alt="${c.name}" ${imageFallbackAttr(c.slug)}/>
      <div class="cat-overlay"></div>
      <div class="cat-content"><div class="cat-name">${c.name}</div><button class="cat-btn">Shop Now</button></div>
    </div>
  `).join('');
  initScrollReveal();
}

function renderFallbackFeaturedCards(container) {
  const fallbackFeatured = shuffleArray([
    { title: 'Rose Glow Earrings', slug: 'earrings', image: '/images/earrings.png' },
    { title: 'Royal Necklace Set', slug: 'necklace', image: '/images/necklace.png' },
    { title: 'Bridal Ring Collection', slug: 'rings', image: '/images/p1.png' },
    { title: 'Statement Bangles', slug: 'bangles', image: '/images/p4.png' },
  ]);

  container.innerHTML = fallbackFeatured.map((item, i) => `
    <div class="product-card reveal" style="border-radius:16px !important;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08) !important;transition:transform .3s ease,box-shadow .3s ease !important;background:#fff;border:1px solid rgba(201,106,138,.08);" onclick="navigate('/products?category=${item.slug}')">
      <div class="product-img-wrap" style="position:relative;overflow:hidden;aspect-ratio:1/1.15;cursor:pointer;">
        <img class="product-img" src="${safeImageUrl(item.image, item.slug)}" alt="${item.title}" loading="lazy" decoding="async" ${imageFallbackAttr(item.slug)} style="width:100%;height:100%;object-fit:cover;display:block;"/>
        <span class="product-badge" style="position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:.75rem;z-index:2;">✦ Featured ✦</span>
      </div>
      <div class="product-body" style="padding:1rem 1rem 1.2rem;">
        <div class="product-name" style="font-weight:600;font-size:.95rem;color:var(--dark);line-height:1.3;margin-bottom:.5rem;">${item.title}</div>
        <div class="product-price" style="margin-bottom:.75rem;">
          <span class="price-current" style="font-size:1.2rem;font-weight:700;color:var(--rose);">Explore Collection</span>
        </div>
        <button class="btn-primary btn-sm" style="width:100%;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;font-weight:600;cursor:pointer;">View Collection</button>
      </div>
    </div>
  `).join('');
  initScrollReveal();
}

// ── HOME PAGE ─────────────────────────────────────────────
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

function applyCmsDesign(cms) {
  const root = document.documentElement;
  const setVar = (key, cssVar, fallback) => {
    const value = cms[key];
    root.style.setProperty(cssVar, value && String(value).trim() ? String(value).trim() : fallback);
  };

  setVar('themeRose', '--rose', '#c9748f');
  setVar('themeRoseDark', '--rose-dark', '#a85070');
  setVar('themeRoseLight', '--rose-light', '#fbe4e9');
  setVar('themeGold', '--gold', '#b39031');
  setVar('themeGoldLight', '--gold-light', '#d4af37');
  setVar('themeBeige', '--beige', '#fdf6f0');
  setVar('themeDark', '--dark', '#1f1f38');

  const radius = cms.themeRadius || '16px';
  root.style.setProperty('--radius', String(radius));
}

async function renderHome(options = {}) {
  const { skipRefresh = false } = options;
  const app = document.getElementById('app');

  // Render immediately with cached/default settings so first paint is instant.
  let cms = readCachedPublicSettings();
  const hasCachedSettings = Object.keys(cms).length > 0;

  if (!hasCachedSettings) {
    // Start background fetch without blocking first render.
    fetchPublicSettings({ timeoutMs: 1500 }).catch(() => {});
  }

  if (!skipRefresh) {
    fetchPublicSettings({ force: !hasCachedSettings, timeoutMs: 3000 })
      .then((freshSettings) => {
        if (!freshSettings || Object.keys(freshSettings).length === 0) return;
        const sameRoute = location.pathname === '/' || location.pathname === '';
        if (!sameRoute) return;
        const next = JSON.stringify(freshSettings);
        const curr = JSON.stringify(cms || {});
        if (next !== curr) renderHome({ skipRefresh: true });
      })
      .catch(() => {});
  }

  applyCmsDesign(cms);

  const g = (k, def) => cms[k] || def || '';
  const isOn = (k) => cms[k] === true || cms[k] === 'true' || cms[k] === undefined;

  // Hero media
  const heroMediaType = g('heroMediaType', 'image');
  const heroImage = g('heroImage', '/images/hero_model.png');
  const heroVideo = g('heroVideoUrl', '');
  
  // Optimize hero background image - use WebP if available, add loading optimization
  const optimizedHeroImage = heroImage.includes('unsplash') || heroImage.includes('cloudinary') 
    ? heroImage + '?w=1920&q=85&auto=format' 
    : heroImage;
  
  const heroBackground = heroMediaType === 'video' && heroVideo
    ? ''
    : `background: linear-gradient(135deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.42) 100%), url('${optimizedHeroImage}') center/cover no-repeat; background-attachment: fixed; background-size: cover;`;

  app.innerHTML = `
  <section class="hero-premium" style="${heroBackground} justify-content: center; text-align: center; border-radius:0; position:relative;">
    ${heroMediaType === 'video' && heroVideo ? `<video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"><source src="${heroVideo}" type="video/mp4"></video>` : ''}
    <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.32), rgba(0,0,0,0.7)); z-index:1;"></div>
    
    ${isOn('showOfferBanner') ? `<div style="position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,rgba(201,149,76,.95) 0%,rgba(242,208,122,.85) 50%,rgba(201,149,76,.95) 100%);padding:12px;z-index:3;color:var(--dark);font-weight:700;font-size:.9rem;letter-spacing:.05em;text-transform:uppercase;text-align:center;">
      ${g('offerBanner', '🎁 LIMITED OFFER: FLAT 50% OFF ON SELECTED ITEMS + FREE DELIVERY!')}
    </div>` : ''}
    
    <div class="hero-p-centered reveal" style="position:relative; z-index:2; padding: 60px 5% 0; margin-top:20px; max-width:860px;">
      <div class="hero-badge" style="color:var(--gold-light);background:rgba(0,0,0,0.3); border:1.5px solid rgba(201,168,76,.4);padding:12px 28px;border-radius:99px;display:inline-block;margin-bottom:1.5rem;letter-spacing:.25em;font-size:.85rem;backdrop-filter:blur(8px);font-weight:600;">${g('heroBadge', '✦ PREMIUM COLLECTION 2026 ✦')}</div>
      <h1 class="hero-p-title" style="margin-bottom:1.5rem; font-size: clamp(2.5rem, 7vw, 5rem); line-height:1.15; color:#fff; text-shadow: 0 10px 30px rgba(0,0,0,0.8);">${g('heroTitle', 'Luxury Redefined')}<br/><span style="color:var(--gold-light); font-family:'Playfair Display',serif; font-style:italic;">${g('heroSubtitle', 'For The Modern Woman')}</span></h1>
      <p class="hero-p-sub" style="max-width:700px; margin: 0 auto 1.5rem; color:#fff; font-size:1.15rem; line-height:1.7; font-weight:600; text-shadow: 0 4px 16px rgba(0,0,0,0.9);">${g('heroDescription', 'Premium artificial jewellery for every occasion. Look expensive, spend smart. 4.8⭐ trusted by 50K+ customers.')}</p>
      
      <div class="hero-btns" style="display:flex; justify-content:center; gap:1rem; flex-wrap:wrap; margin-bottom:2rem;">
        <button class="btn-gold" style="padding:18px 42px; font-size:1rem; font-weight:700;box-shadow:0 8px 25px rgba(201,149,76,.4);" onclick="navigate('/products')">${g('heroButton1Text', '🛍️ Shop Now & Save')}</button>
        <button class="btn-outline" style="padding:18px 42px; font-size:1rem; color:#fff; border-color:rgba(255,255,255,.7); border-width:2px;" onclick="navigate('/products?category=earrings')">${g('heroButton2Text', 'View Collections')}</button>
      </div>
    </div>
  </section>

  ${isOn('showTrustHub') ? `<!-- TRUST HUB -->
  <div class="trust-hub" style="background:linear-gradient(135deg, rgba(201,106,138,.08) 0%, rgba(201,149,76,.08) 100%);">
    <div class="trust-item"><i class="fas fa-truck-fast"></i> <span><strong>Free</strong> Delivery</span></div>
    <div class="trust-item"><i class="fas fa-wallet"></i> <span><strong>Cash on</strong> Delivery</span></div>
    <div class="trust-item"><i class="fas fa-rotate-left"></i> <span><strong>7-Day</strong> Returns</span></div>
    <div class="trust-item"><i class="fas fa-shield-check"></i> <span><strong>100%</strong> Authentic</span></div>
  </div>` : ''}

  ${isOn('showPromo') ? `<section class="promo-limited-banner">
    <div class="promo-content reveal-left">
      <div class="hero-badge" style="background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.2); color:#fff; margin-bottom:1rem;">✦ LIMITED EDITION 2026 ✦</div>
      <h2 style="font-family:'Playfair Display',serif; font-size:2.8rem; margin-bottom:1rem; line-height:1.2;">${g('promoTitle', 'Exclusive Seasonal Drop')}<br/><span style="color:var(--gold-light);">${g('promoSubtitle', 'Sale Ends In')}</span></h2>
      <div class="promo-timer" id="promo-timer">
        <div class="timer-box"><span class="timer-val" id="t-days">00</span><span class="timer-label">Days</span></div>
        <div class="timer-box"><span class="timer-val" id="t-hours">00</span><span class="timer-label">Hours</span></div>
        <div class="timer-box"><span class="timer-val" id="t-mins">00</span><span class="timer-label">Mins</span></div>
        <div class="timer-box"><span class="timer-val" id="t-secs">00</span><span class="timer-label">Secs</span></div>
      </div>
      <p style="color:rgba(255,255,255,0.7); max-width:400px; margin-bottom:2rem;">${g('promoDescription', 'Our most awaited collection is here. Limited quantities available.')}</p>
      <button class="btn-gold" onclick="navigate('/products')">${g('promoButtonText', 'Explore Collection')} <i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="promo-image reveal-right" style="flex:1; max-width:400px; position:relative; z-index:2;">
      ${g('promoMediaType') === 'video' && g('promoVideoUrl') 
        ? `<video autoplay muted loop playsinline style="width:100%; border-radius:24px; box-shadow:0 30px 60px rgba(0,0,0,0.5);"><source src="${g('promoVideoUrl')}" type="video/mp4"></video>`
        : `<img src="${g('promoImage', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800')}" style="width:100%; border-radius:24px; box-shadow:0 30px 60px rgba(0,0,0,0.5); transform:rotate(2deg);" alt="Promo"/>`
      }
    </div>
  </section>` : ''}

  ${isOn('showCollections') ? `<section class="categories" style="padding:4rem 5%;${g('homeCollectionsBg') ? `background:${g('homeCollectionsBg')};` : ''}">
    <div class="section-header reveal">
      <div class="section-eyebrow">Shop by Category</div>
      <h2 class="section-title">Exclusive Collections</h2>
      <div class="divider"></div>
    </div>
    <div class="categories-grid" id="home-categories-grid">
      <div style="grid-column:1/-1;text-align:center;color:var(--gray);">Loading exclusive collections...</div>
    </div>
  </section>` : ''}

  ${isOn('showFeaturedProducts') ? `<!-- FEATURED PRODUCTS -->
  <section style="background:${g('homeFeaturedBg', 'var(--beige)')};">
    <div class="section-header reveal">
      <div class="section-eyebrow">Bestsellers</div>
      <h2 class="section-title">🔥 Trending Now</h2>
      <div class="divider"></div>
    </div>
    <div class="products-grid" id="featured-grid"></div>
    <div style="text-align:center;margin-top:3rem;"><button class="btn-outline" onclick="navigate('/products')">View All Collections <i class="fas fa-arrow-right"></i></button></div>
  </section>` : ''}

  ${isOn('showTestimonials') ? `<!-- TESTIMONIALS -->
  <section class="testimonials" style="${g('homeTestimonialsBg') ? `background:${g('homeTestimonialsBg')};` : ''}">
    <div class="section-header reveal">
      <div class="section-eyebrow" style="color:var(--gold-light);">Happy Customers</div>
      <h2 class="section-title">What Our Customers Say</h2>
      <div class="divider"></div>
    </div>
    <div class="testi-grid" id="testi-grid">
      <div style="grid-column:1/-1;text-align:center;color:var(--gray);">Loading reviews...</div>
    </div>
  </section>` : ''}`;

  createParticles();
  initScrollReveal();
  
  // Load content sections in parallel (non-blocking)
  if (isOn('showCollections')) loadHomeCategories().catch(e => console.log('Cat load error:', e));
  if (isOn('showFeaturedProducts')) loadFeaturedProducts().catch(e => console.log('Product load error:', e));
  if (isOn('showTestimonials')) loadTestimonials().catch(e => console.log('Testi load error:', e));
  if (isOn('showPromo')) startOfferTimer();
  
  // Show discount popup after delay (non-blocking, detached from page load)
  if (!sessionStorage.getItem('popupShown')) {
    setTimeout(() => {
      showDiscountPopup();
    }, 5000);
  }
}

// ── DATA LOADERS ──────────────────────────────────────────
async function loadTestimonials() {
  const container = document.getElementById('testi-grid');
  if (!container) return;
  try {
    let t = await api('/api/testimonials');
    if (t && t.hidden) {
      const parentSection = container.closest('.testimonials');
      if (parentSection) parentSection.style.display = 'none';
      return;
    }
    if (!t || t.length === 0) {
      t = [
        { name: 'Anjali Sharma', city: 'Delhi', rating: 5, comment: 'The jewelry is absolutely stunning! The finish and quality are even better than in the photos. Highly recommended! ✦' },
        { name: 'Priya Verma', city: 'Mumbai', rating: 5, comment: 'Ordered a necklace set for a wedding, and I received so many compliments. Fast delivery too! 💎' },
        { name: 'Surbhi Gupta', city: 'Chandigarh', rating: 5, comment: 'Love the premium packaging and the rounded design. Feels very high-end. Great experience. ✨' },
        { name: 'Megha Jain', city: 'Jaipur', rating: 4, comment: 'Beautiful earrings, very lightweight and elegant. Will definitely shop again for the bridal collection.' }
      ];
    }
    const testiHTML = t.map(testi => `
      <div class="testi-card">
        <div class="testi-stars">${'★'.repeat(testi.rating || 5)}</div>
        <p class="testi-text">"${testi.comment}"</p>
        <div class="testi-author">
          <div class="testi-avatar">${testi.name[0]}</div>
          <div><div class="testi-name">${testi.name}</div><div class="testi-loc">${testi.city || ''}</div></div>
        </div>
      </div>`).join('');
    container.innerHTML = `<div class="testi-marquee-container"><div class="testi-marquee-inner">${testiHTML}${testiHTML}${testiHTML}</div></div>`;
  } catch (e) { container.innerHTML = '<div style="text-align:center;color:var(--gray);">Luxury Social Proof Incoming...</div>'; }
}

async function loadHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;
  try {
    const cats = await withTimeout(api('/api/categories'), 2500);
    let categories = Array.isArray(cats) ? cats : [];

    if (categories.length === 0) {
      const products = await withTimeout(api('/api/products'), 2500);
      const byCategory = new Map();
      if (Array.isArray(products)) {
        products.forEach(product => {
          if (!product || !product.category || byCategory.has(product.category)) return;
          byCategory.set(product.category, {
            name: product.category.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
            slug: product.category,
            image: product.images?.[0] || '/images/hero.png'
          });
        });
      }
      categories = [...byCategory.values()];
    }

    if (categories.length === 0) {
      renderFallbackCollectionCards(container);
      return;
    }
    container.innerHTML = shuffleArray(categories).map((c, i) => `
      <div class="cat-card reveal" style="animation-delay:${i * 0.05}s" onclick="navigate('/products?category=${c.slug}')">
        <img class="cat-img" src="${c.image}" alt="${c.name}" onerror="this.src='/images/hero.png'"/>
        <div class="cat-overlay"></div>
        <div class="cat-content"><div class="cat-name">${c.icon ? c.icon + ' ' : ''}${c.name}</div><button class="cat-btn">Shop Now</button></div>
      </div>
    `).join('');
    initScrollReveal();
  } catch (e) {
    const products = await withTimeout(api('/api/products'), 2500);
    if (Array.isArray(products) && products.length > 0) {
      const byCategory = new Map();
      products.forEach(product => {
        if (!product || !product.category || byCategory.has(product.category)) return;
        byCategory.set(product.category, {
          name: product.category.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
          slug: product.category,
          image: product.images?.[0] || '/images/hero.png'
        });
      });
      const categories = [...byCategory.values()];
      if (categories.length > 0) {
        container.innerHTML = shuffleArray(categories).map((c, i) => `
          <div class="cat-card reveal" style="animation-delay:${i * 0.05}s" onclick="navigate('/products?category=${c.slug}')">
            <img class="cat-img" src="${c.image}" alt="${c.name}" onerror="this.src='/images/hero.png'"/>
            <div class="cat-overlay"></div>
            <div class="cat-content"><div class="cat-name">${c.name}</div><button class="cat-btn">Shop Now</button></div>
          </div>
        `).join('');
        initScrollReveal();
        return;
      }
    }
    renderFallbackCollectionCards(container);
  }
}

/* ── TRACK ORDER PAGE ─────────────────────────────────────── */
function renderTrack() {
  document.getElementById('app').innerHTML = `
  <div class="track-page reveal animate-pop-in">
    <div class="section-eyebrow">Order Status</div>
    <h1 class="page-title" style="margin-bottom:0.5rem;">Track Your Order</h1>
    <p style="color:var(--gray);margin-bottom:2rem;">Enter your Order ID (starts with LEN) to get real-time tracking updates.</p>
    <div class="track-search">
      <input id="track-input" placeholder="LEN-XXXXXXXX" onkeydown="if(event.key==='Enter')trackOrder()"/>
      <button class="btn-primary" onclick="trackOrder()"><i class="fas fa-search"></i></button>
    </div>
    <div id="track-result"></div>
  </div>`;

  const qs = new URLSearchParams(location.search);
  const orderId = qs.get('orderId') || qs.get('id') || '';
  if (orderId) {
    const input = document.getElementById('track-input');
    if (input) input.value = orderId;
    trackOrder();
  }
}

async function trackOrder() {
  const id = document.getElementById('track-input')?.value?.trim();
  if (!id) { toast('Please enter Order ID', 'error'); return; }
  const order = await api('/api/orders/track/' + id);
  const el = document.getElementById('track-result');
  if (order.error) { el.innerHTML = `<div style="color:#ef4444;padding:1.5rem;background:#fee2e2;border-radius:var(--radius);margin-top:1rem;">${order.error}</div>`; return; }
  const statusLabels = { hold:'On Hold', pending:'Pending', shipping:'Shipping', delivered:'Delivered ✓', cancelled:'Cancelled', placed:'Order Placed', confirmed:'Confirmed', shipped:'Shipped', out_for_delivery:'Out for Delivery' };
  const trackingId = order.awbCode || order.trackingNumber || order.shiprocketShipmentId || '';
  let trackingLink = '';
  try {
    const cfg = await api('/api/delivery/tracking-config');
    if (!cfg.error && trackingId) {
      const tpl = cfg.trackingUrlTemplate || '';
      if (tpl && tpl.includes('{{id}}')) {
        trackingLink = tpl.replace('{{id}}', encodeURIComponent(trackingId));
      } else if ((cfg.provider || '').toLowerCase() === 'shiprocket') {
        trackingLink = `https://shiprocket.co/tracking/${encodeURIComponent(trackingId)}`;
      } else if ((cfg.provider || '').toLowerCase() === 'delhivery') {
        trackingLink = `https://www.delhivery.com/track-v2/package/${encodeURIComponent(trackingId)}`;
      }
    }
  } catch (e) {}

  el.innerHTML = `
  <div class="order-status-card animate-pop-in">
    <div class="order-id-display">ORDER ID: ${order.id}</div>
    <span class="product-badge" style="position:static;display:inline-block;margin-bottom:1rem;">${statusLabels[order.status] || order.status}</span>
    <p style="font-size:.875rem;color:var(--gray);">Estimated Delivery: <strong>${formatDate(order.estimatedDelivery)}</strong></p>
    ${trackingId ? `<p style="font-size:.875rem;color:var(--gray);">Tracking ID: <strong style="font-family:monospace;">${trackingId}</strong></p>` : ''}
    ${trackingLink ? `<p style="margin:.5rem 0 1rem;"><a href="${trackingLink}" target="_blank" rel="noopener" class="btn-outline btn-sm" style="display:inline-flex;align-items:center;gap:.4rem;"><i class="fas fa-up-right-from-square"></i> Open Delivery Tracking</a></p>` : ''}
    <div class="timeline">
      ${(order.timeline||[]).map(t=>`<div class="timeline-item ${t.done?'done':''}"><div class="timeline-dot"><i class="fas fa-${t.done?'check':'circle'}" style="font-size:.65rem;"></i></div><div class="timeline-content"><div class="timeline-label">${t.label}</div><div class="timeline-date">${t.date?formatDate(t.date):''}</div></div></div>`).join('')}
    </div>
  </div>`;
}

/* ── CONTACT PAGE ─────────────────────────────────────────── */
function renderContact() {
  document.getElementById('app').innerHTML = `
  <div class="container animate-pop-in" style="padding:4rem 0;">
    <h1 class="section-title" style="text-align:center;">Contact Us</h1>
    <div class="divider"></div>
    <p style="text-align:center;color:var(--gray);margin-bottom:4rem;">Reach out for bridal inquiries, bulk orders, or support.</p>
    <div class="contact-layout">
      <div>
        <h3 style="font-family:'Playfair Display',serif;font-size:1.8rem;margin-bottom:2rem;color:var(--rose-dark);">Store Locations</h3>
        <div class="contact-info-card">
          <div class="contact-icon-circle" style="background:var(--rose-light);color:var(--rose-dark);"><i class="fas fa-map-marker-alt"></i></div>
          <div><h4>Flagship Store</h4><p style="color:var(--gray);font-size:.9rem;">197 Sarakpur, Barara, Ambala, Haryana</p></div>
        </div>
        <div class="contact-info-card">
          <div class="contact-icon-circle" style="background:#e0f2fe;color:#0284c7;"><i class="fas fa-phone"></i></div>
          <div><h4>Contact Support</h4><p style="color:var(--gray);font-size:.9rem;">+91 7404217625<br/>Support available 10AM - 7PM</p></div>
        </div>
        <div class="contact-info-card" onclick="window.open('https://wa.me/917404217625')" style="cursor:pointer;">
          <div class="contact-icon-circle" style="background:var(--gold-light);color:var(--gold-dark);"><i class="fab fa-whatsapp"></i></div>
          <div><h4>WhatsApp Support</h4><p style="color:var(--rose-dark);font-weight:600;font-size:.9rem;">Immediate Response ↗</p></div>
        </div>
      </div>
      <div class="glass-card" style="padding:2.5rem;background:#fff;border:1px solid var(--border);">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.8rem;margin-bottom:1.5rem;">Send an Inquiry</h3>
        <div class="form-group"><label>Full Name</label><input id="contact-name" placeholder="Name"/></div>
        <div class="form-group"><label>Email Address</label><input id="contact-email" type="email" placeholder="example@domain.com"/></div>
        <div class="form-group"><label>Your Message</label><textarea id="contact-message" rows="4" placeholder="How can we help?"></textarea></div>
        <button class="btn-primary full-width" onclick="submitContact()"><i class="fas fa-paper-plane"></i> Send Message</button>
      </div>
    </div>
  </div>`;
  initScrollReveal();
}

async function submitContact() {
  const n = document.getElementById('contact-name').value;
  const e = document.getElementById('contact-email').value;
  const m = document.getElementById('contact-message').value;
  if(!n || !e || !m) { toast('Please fill all fields', 'error'); return; }
  const resp = await api('/api/contact', { method: 'POST', body: { name:n, email:e, message:m } });
  if(resp.success) {
    toast('Thank you! Our concierge will contact you within 24 hours. 💌', 'success');
    navigate('/');
  } else {
    toast(resp.error || 'Something went wrong', 'error');
  }
}

async function startOfferTimer() {
  const timerEl = document.getElementById('promo-timer');
  if (!timerEl) return;
  
  const s = normalizeSettings(await api('/api/settings'));
  const end = s.saleEndDate ? new Date(s.saleEndDate) : new Date(Date.now() + 86400000);

  function updateTimer() {
    const now = new Date();
    const diff = end - now;
    if (diff <= 0) {
      ['t-days','t-hours','t-mins','t-secs'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '00'; });
      return;
    }
    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
    const d = document.getElementById('t-days');   if(d) d.textContent = String(days).padStart(2,'0');
    const h = document.getElementById('t-hours');  if(h) h.textContent = String(hours).padStart(2,'0');
    const m = document.getElementById('t-mins');   if(m) m.textContent = String(minutes).padStart(2,'0');
    const sec = document.getElementById('t-secs'); if(sec) sec.textContent = String(seconds).padStart(2,'0');
  }
  updateTimer(); 
  setInterval(updateTimer, 1000);
}

function createParticles() {
  const container = document.getElementById('particles'); if (!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div'); p.className = 'particle';
    p.style.cssText = `left:${Math.random() * 100}%;width:${2 + Math.random() * 4}px;height:${2 + Math.random() * 4}px;animation-duration:${8 + Math.random() * 12}s;animation-delay:${Math.random() * 8}s;opacity:${0.3 + Math.random() * 0.5}`;
    container.appendChild(p);
  }
}

async function loadFeaturedProducts() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const renderFallbackProducts = async (message) => {
    const fallback = await withTimeout(api('/api/products'), 2500);
    if (Array.isArray(fallback) && fallback.length > 0) {
      grid.innerHTML = shuffleArray(fallback).slice(0, 4).map(productCardHTML).join('');
      initScrollReveal();
      updateCartButtonsUI();
      return;
    }
    renderFallbackFeaturedCards(grid);
  };

  try {
    const r = await withTimeout(api('/api/products?featured=true'), 2500);
    console.log('Featured products response:', r);
    if (r && Array.isArray(r) && r.length > 0) {
      grid.innerHTML = shuffleArray(r).map(productCardHTML).join('');
      initScrollReveal();
      updateCartButtonsUI();
    } else if (Array.isArray(r) && r.length === 0) {
      await renderFallbackProducts('');
    } else {
      console.error('Invalid response format:', r);
      await renderFallbackProducts('');
    }
  } catch (e) {
    console.error('Featured products error:', e);
    await renderFallbackProducts('');
  }
}

// ── PRODUCTS PAGE ─────────────────────────────────────────
async function renderProducts(params) {
  const category = params.get('category') || '';
  const app = document.getElementById('app');
  const ALL_CATS = [
    { val: '', label: 'All' }, { val: 'earrings', label: 'Earrings' }, { val: 'necklace', label: 'Necklace' },
    { val: 'toe-rings', label: 'Toe Rings' }, { val: 'rings', label: 'Rings' }, { val: 'chains', label: 'Chains' },
    { val: 'payal', label: 'Payal' }, { val: 'bangles', label: 'Bangles' }, { val: 'bracelets', label: 'Bracelets' },
    { val: 'maang-tikka', label: 'Maang Tikka' }, { val: 'sets', label: 'Bridal Sets' },
  ];
  app.innerHTML = `
  <div class="page-wrap">
    <h1 class="page-title">${ALL_CATS.find(ct => ct.val === category)?.label || 'All Collections'}</h1>
    <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;align-items:center;">
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
        ${ALL_CATS.map(c => `<button class="btn-${c.val === category ? 'primary' : 'outline'} btn-sm" onclick="navigate('/products${c.val ? '?category=' + c.val : ''}')">${c.label}</button>`).join('')}
      </div>
      <select id="sort-select" onchange="sortProducts(this.value,'${category}')" style="margin-left:auto;padding:10px 18px;border:2px solid var(--border);border-radius:99px;font-size:.85rem;outline:none;cursor:pointer;background:#fff;color:var(--dark);font-family:'Inter',sans-serif;appearance:none;-webkit-appearance:none;padding-right:2rem;background-image:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path fill=%22%23c9748f%22 d=%22M0 0l5 6 5-6z%22/></svg>');background-repeat:no-repeat;background-position:right 12px center;">
        <option value="">Sort By</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating">Top Rated</option>
      </select>
    </div>
    <div class="products-grid" id="products-grid"><div style="text-align:center;padding:3rem;color:var(--gray);">Loading...</div></div>
  </div>`;
  const url = '/api/products' + (category ? `?category=${category}` : '');
  let products = await api(url, { timeoutMs: 3000 });
  if (!Array.isArray(products)) {
    const fallback = await api('/api/products', { timeoutMs: 2500 });
    products = Array.isArray(fallback)
      ? (category ? fallback.filter(p => p && p.category === category) : fallback)
      : [];
  }
  const grid = document.getElementById('products-grid');
  if (grid) grid.innerHTML = products.length ? products.map(productCardHTML).join('') : '<div class="empty-state"><div class="empty-icon">💎</div><h3>No products found</h3><p>Check back soon for new arrivals!</p></div>';
  initScrollReveal();
  updateCartButtonsUI();
}

async function sortProducts(sort, category) {
  const url = '/api/products?' + new URLSearchParams({ ...(category && { category }), ...(sort && { sort }) });
  const products = await api(url, { timeoutMs: 3000 });
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  if (Array.isArray(products)) {
    grid.innerHTML = products.map(productCardHTML).join('');
  } else {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Could not load products</h3><p>Please try again in a moment.</p></div>';
  }
  initScrollReveal();
  updateCartButtonsUI();
}

async function loadPublicSettings() {
  try {
    const s = await fetchPublicSettings({ timeoutMs: 2500 });
    const wb = document.getElementById('whatsapp-btn');
    if (wb && s.whatsappNumber) wb.href = 'https://wa.me/' + s.whatsappNumber + '?text=Hi%20Lencho%20India!';
  } catch (e) { }
}

// ── POLICY PAGES ──────────────────────────────────────────────
async function renderTerms() {
  const app = document.getElementById('app');
  try {
    const s = await api('/api/cms/terms', { timeoutMs: 2000 });
    const content = s?.content || 'Terms and Conditions content not set in admin panel yet.';
    app.innerHTML = `
    <div class="page-wrap" style="max-width:900px;margin:0 auto;">
      <h1 class="page-title">Terms and Conditions</h1>
      <div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);line-height:1.8;font-size:0.95rem;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    </div>`;
  } catch (e) {
    app.innerHTML = `<div class="page-wrap" style="max-width:900px;margin:0 auto;"><h1 class="page-title">Terms and Conditions</h1><div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);">Content coming soon...</div></div>`;
  }
}

async function renderPrivacy() {
  const app = document.getElementById('app');
  try {
    const s = await api('/api/cms/privacy', { timeoutMs: 2000 });
    const content = s?.content || 'Privacy Policy content not set in admin panel yet.';
    app.innerHTML = `
    <div class="page-wrap" style="max-width:900px;margin:0 auto;">
      <h1 class="page-title">Privacy Policy</h1>
      <div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);line-height:1.8;font-size:0.95rem;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    </div>`;
  } catch (e) {
    app.innerHTML = `<div class="page-wrap" style="max-width:900px;margin:0 auto;"><h1 class="page-title">Privacy Policy</h1><div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);">Content coming soon...</div></div>`;
  }
}

async function renderDisclaimer() {
  const app = document.getElementById('app');
  try {
    const s = await api('/api/cms/disclaimer', { timeoutMs: 2000 });
    const content = s?.content || 'Disclaimer content not set in admin panel yet.';
    app.innerHTML = `
    <div class="page-wrap" style="max-width:900px;margin:0 auto;">
      <h1 class="page-title">Disclaimer</h1>
      <div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);line-height:1.8;font-size:0.95rem;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    </div>`;
  } catch (e) {
    app.innerHTML = `<div class="page-wrap" style="max-width:900px;margin:0 auto;"><h1 class="page-title">Disclaimer</h1><div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);">Content coming soon...</div></div>`;
  }
}

// ── SOCIAL SYNC ───────────────────────────────────────────
async function syncSocialLinks() {
  const s = await fetchPublicSettings({ timeoutMs: 2500 });
  if (s.error) return;
  
  const fb = document.querySelector('.social-icon i.fa-facebook-f')?.parentElement;
  const insta = document.querySelector('.social-icon i.fa-instagram')?.parentElement;
  const tw = document.querySelector('.social-icon i.fa-twitter')?.parentElement;
  const wa = document.querySelector('.social-icon i.fa-whatsapp')?.parentElement;

  if (s.facebookLink && fb) fb.href = s.facebookLink;
  if (s.instagramLink && insta) insta.href = s.instagramLink;
  if (s.twitterLink && tw) tw.href = s.twitterLink;
  if (s.whatsappLink && wa) wa.href = s.whatsappLink;
  else if (s.whatsappNumber && wa) wa.href = `https://wa.me/${s.whatsappNumber}`;
}

// (Global window exports are at the bottom of this file)

// ── INIT ──────────────────────────────────────────────────
async function bootstrapApp() {
  try {
    // ── STEP 1: Instantly restore saved session (synchronous, no flicker) ──
    await autoLoginWithToken();
    
    // ── STEP 2: Render page immediately with restored auth state ──
    navigate(location.pathname + location.search, false);
    if (typeof initHeader === 'function') initHeader();
    renderGoogleButtons();
    
    // ── STEP 3: Hide loading screen fast ──
    const ls = document.getElementById('loading-screen');
    setTimeout(() => {
      if (ls) ls.classList.add('hidden');
    }, 300);
    
    // ── STEP 4: Run non-blocking background tasks ──
    const bgTasks = [
      updateCartCount().catch(e => console.error('updateCartCount error:', e)),
      updateWishlistCount().catch(e => console.error('updateWishlistCount error:', e)),
      syncSocialLinks().catch(e => console.error('syncSocialLinks error:', e)),
      loadPublicSettings().catch(e => console.error('loadPublicSettings error:', e)),
      loadHeaderCollections().catch(e => console.error('loadHeaderCollections error:', e)),
      handleFirebaseRedirectAuth().catch(e => console.error('handleFirebaseRedirectAuth error:', e))
    ];
    
    await Promise.allSettled(bgTasks);
    updateHeader(); // Final header sync after all tasks complete

    // Warm common read-only endpoints for snappier next navigation.
    Promise.allSettled([
      api('/api/products'),
      api('/api/categories'),
      api('/api/testimonials')
    ]).catch(() => {});
  } catch (e) {
    console.error('Init Error:', e);
    navigate(location.pathname + location.search, false);
  }
}

function startBootstrapWhenReady() {
  if (window.__lenchoScriptsReady) {
    bootstrapApp();
    return;
  }

  window.addEventListener('lencho-scripts-ready', bootstrapApp, { once: true });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', startBootstrapWhenReady, { once: true });
} else {
  startBootstrapWhenReady();
}

// ── FIREBASE GOOGLE AUTH ──────────────────────────────────────
let googleAuthInFlight = false;
let firebaseRedirectAuthHandled = false;
let googleLoginCompletionInProgress = false;

function renderGoogleButtons() {
  const loginSlot = document.getElementById('google-auth-login');
  const signupSlot = document.getElementById('google-auth-signup');
  const slots = [loginSlot, signupSlot].filter(Boolean);

  if (!slots.length) return;

  slots.forEach((slot) => {
    slot.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'google-auth-btn';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.9 0 7.1 1.3 9.3 3.1l7-7C35.6 2.6 30.1 0 24 0 14.7 0 6.7 4.7 2.6 11.5l8.1 6.3C12.8 13.1 18 9.5 24 9.5z"></path><path fill="#34A853" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v9.1h12.6c-.6 3.2-2.6 5.9-5.6 7.6l8.6 6.6C43.9 38.1 46.5 31.7 46.5 24.5z"></path><path fill="#4A90E2" d="M10.7 28.1C9.7 25.9 9.2 23.6 9.2 21.2s.5-4.7 1.5-6.9L2.6 8.1C.9 11.1 0 14.9 0 18.9c0 4 1 7.8 2.6 10.8l8.1-1.6z"></path><path fill="#FBBC05" d="M24 48c6.1 0 11.6-2 15.6-5.4l-8.6-6.6c-2.4 1.6-5.5 2.5-8.9 2.5-6 0-11.2-3.6-13.1-8.7L2.6 36.5C6.7 43.3 14.7 48 24 48z"></path></svg><span>Continue with Google</span>';
    btn.onclick = function (e) {
      e.preventDefault();
      signInWithGoogle({ currentTarget: btn });
    };
    slot.appendChild(btn);
  });
}

function getFirebaseAuthClient() {
  return window.lenchoFirebaseAuth || null;
}

function setGoogleBtnLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = `<span class="google-auth-spinner" aria-hidden="true"></span><span>${label || 'Signing in...'}</span>`;
    return;
  }

  btn.disabled = false;
  btn.classList.remove('loading');
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.9 0 7.1 1.3 9.3 3.1l7-7C35.6 2.6 30.1 0 24 0 14.7 0 6.7 4.7 2.6 11.5l8.1 6.3C12.8 13.1 18 9.5 24 9.5z"></path><path fill="#34A853" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.6H24v9.1h12.6c-.6 3.2-2.6 5.9-5.6 7.6l8.6 6.6C43.9 38.1 46.5 31.7 46.5 24.5z"></path><path fill="#4A90E2" d="M10.7 28.1C9.7 25.9 9.2 23.6 9.2 21.2s.5-4.7 1.5-6.9L2.6 8.1C.9 11.1 0 14.9 0 18.9c0 4 1 7.8 2.6 10.8l8.1-1.6z"></path><path fill="#FBBC05" d="M24 48c6.1 0 11.6-2 15.6-5.4l-8.6-6.6c-2.4 1.6-5.5 2.5-8.9 2.5-6 0-11.2-3.6-13.1-8.7L2.6 36.5C6.7 43.3 14.7 48 24 48z"></path></svg><span>Continue with Google</span>';
}

async function signInWithGoogle(event) {
  if (googleAuthInFlight) {
    console.log('[GoogleAuth] Sign-in already in flight, skipping');
    return;
  }
  const btn = event && event.currentTarget ? event.currentTarget : null;
  const firebaseClient = getFirebaseAuthClient();
  if (!firebaseClient || !firebaseClient.isReady || !firebaseClient.isReady()) {
    toast('Google login is temporarily unavailable. Please try again in a moment.', 'error');
    console.error('[GoogleAuth] Firebase client not ready');
    return;
  }

  googleAuthInFlight = true;
  console.log('[GoogleAuth] ▶ Sign-in started');
  try {
    const isMobileFlow = firebaseClient.isMobileDevice();
    console.log('[GoogleAuth] Device:', isMobileFlow ? 'mobile (redirect)' : 'desktop (popup)');
    if (isMobileFlow) {
      setGoogleBtnLoading(btn, true, 'Opening Google...');
      localStorage.setItem('googleLoginPending', 'true');
      await firebaseClient.startGoogleRedirectLogin();
      // Page will navigate away for redirect flow
      return;
    }

    setGoogleBtnLoading(btn, true, 'Signing in with Google...');
    const authResult = await firebaseClient.signInWithGooglePopup();
    console.log('[GoogleAuth] Popup result received:', { hasUser: !!authResult?.user, hasToken: !!authResult?.googleIdToken });
    await completeGoogleLogin(authResult, btn);
  } catch (e) {
    console.error('[GoogleAuth] Sign-in error:', e?.code, e?.message);
    if (String(e?.code || '').toLowerCase() !== 'auth/popup-closed-by-user') {
      toast(getFirebaseAuthErrorMessage(e), 'error');
    }
  } finally {
    googleAuthInFlight = false;
    setGoogleBtnLoading(btn, false);
  }
}

async function handleFirebaseRedirectAuth() {
  const firebaseClient = getFirebaseAuthClient();
  if (!firebaseClient || !firebaseClient.isReady || !firebaseClient.isReady()) return;

  try {
    console.log('[GoogleAuth] ▶ Checking for redirect result...');
    const authResult = await firebaseClient.consumeRedirectResult();
    if (!authResult) {
      console.log('[GoogleAuth] No redirect result (normal for non-redirect flows)');
      localStorage.removeItem('googleLoginPending');
      return;
    }
    console.log('[GoogleAuth] Redirect result found:', { hasUser: !!authResult?.user, hasToken: !!authResult?.googleIdToken });
    firebaseRedirectAuthHandled = true;
    googleLoginCompletionInProgress = true;
    await completeGoogleLogin(authResult, null);
    googleLoginCompletionInProgress = false;
    localStorage.removeItem('googleLoginPending');
  } catch (e) {
    console.error('[GoogleAuth] Redirect result error:', e?.code, e?.message);
    googleLoginCompletionInProgress = false;
    localStorage.removeItem('googleLoginPending');
    toast(getFirebaseAuthErrorMessage(e), 'error');
  }
}

window.handleFirebaseAuthStateChanged = async function handleFirebaseAuthStateChanged(user) {
  try {
    // Skip if: no user, already handled by redirect, already logged in, or another login is in progress
    if (!user) return;
    if (firebaseRedirectAuthHandled) {
      console.log('[GoogleAuth] Auth state change skipped — redirect result already handled');
      return;
    }
    if (googleLoginCompletionInProgress) {
      console.log('[GoogleAuth] Auth state change skipped — login completion in progress');
      return;
    }
    if (currentUser) {
      console.log('[GoogleAuth] Auth state change skipped — user already logged in:', currentUser.email);
      return;
    }
    // Only handle if there's a pending Google login (from redirect) or no JWT token (fresh session)
    const hasPendingLogin = localStorage.getItem('googleLoginPending') === 'true';
    const hasExistingToken = !!getJWTToken();
    if (!hasPendingLogin && hasExistingToken) {
      console.log('[GoogleAuth] Auth state change skipped — existing session, not a Google login flow');
      return;
    }
    console.log('[GoogleAuth] Auth state change → processing login for:', user.email);
    firebaseRedirectAuthHandled = true;
    googleLoginCompletionInProgress = true;
    await completeGoogleLogin(user, null);
    googleLoginCompletionInProgress = false;
    localStorage.removeItem('googleLoginPending');
  } catch (e) {
    console.error('[GoogleAuth] handleFirebaseAuthStateChanged error:', e);
    googleLoginCompletionInProgress = false;
  }
};

async function completeGoogleLogin(authResult, btn) {
  console.log('[GoogleAuth] ▶ completeGoogleLogin started');
  const user = authResult?.user || authResult;
  const firebaseClient = getFirebaseAuthClient();
  let googleIdToken = authResult?.googleIdToken || '';
  const firebaseId = user?.uid || '';
  const email = user?.email || authResult?.email || '';
  const name = user?.displayName || authResult?.name || email.split('@')[0] || 'User';
  const picture = user?.photoURL || authResult?.picture || '';

  console.log('[GoogleAuth] User data:', { email, name: name?.slice(0, 20), firebaseId: firebaseId?.slice(0, 10), hasIdToken: !!googleIdToken });

  if (!email) {
    toast('Could not fetch Google account email.', 'error');
    console.error('[GoogleAuth] No email in auth result');
    return;
  }

  // If we don't have an ID token yet, try to get one from the Firebase user object
  if (!googleIdToken && user && typeof user.getIdToken === 'function') {
    try {
      googleIdToken = await user.getIdToken(true);
      console.log('[GoogleAuth] Fetched Firebase ID token via getIdToken()');
    } catch (tokenErr) {
      console.warn('[GoogleAuth] getIdToken() failed (non-fatal):', tokenErr.message);
      // Continue without token — backend will use client-provided data
    }
  }
  
  try {
    console.log('[GoogleAuth] Sending to backend:', { email, hasToken: !!googleIdToken });
    const result = await api('/api/auth/firebase/google', {
      method: 'POST',
      body: {
        email,
        name,
        picture,
        googleId: firebaseId,
        idToken: googleIdToken,
        firebaseUid: firebaseId
      }
    });
    
    if (result.error) {
      console.error('[GoogleAuth] Backend error:', result.error);
      if (result.error.includes('SMTP')) {
        toast('Account created! Please login with your email.', 'success');
        switchToLogin();
        return;
      }
      toast(result.error, 'error');
      return;
    }
  
    console.log('[GoogleAuth] ✓ Backend response success:', { userId: result.user?.id, role: result.user?.role });

    // Save JWT token and user data with persistent session
    if (result.token) {
      setJWTToken(result.token);
      localStorage.setItem('authToken', result.token);
      localStorage.setItem('googleLoginSource', 'lencho');
      localStorage.setItem('loginTime', Date.now());
      localStorage.setItem('sessionId', result.sessionId || generateClientSessionId());
      console.log('[GoogleAuth] JWT token saved');
    }
  
    currentUser = result.user;
    saveCurrentUser(currentUser);
    updateHeader();
    closeAuthModal();
    await updateCartCount();
    await updateWishlistCount();
    toast(`🎉 Welcome, ${result.user.name}! ✦`, 'success');
    console.log('[GoogleAuth] ✓ Login complete — redirecting');
  
    if (currentUser.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  } catch (e) {
    console.error('[GoogleAuth] completeGoogleLogin error:', e);
    toast(getFirebaseAuthErrorMessage(e), 'error');
    if (firebaseClient && typeof firebaseClient.signOut === 'function') {
      await firebaseClient.signOut();
    }
  }
}

try {
  Object.assign(window, {
    navigate,
    handleUserClick,
    openAuthModal,
    closeAuthModal,
    switchToSignup,
    switchToLogin,
    switchLoginType,
    handleLogin,
    handleSignup,
    verifyEmailOTP,
    resendEmailOTP,
    completeSignupAfterOTP,
    handleLogout,
    claimDiscount,
    loadHeaderCollections,
    updateCartButtonsUI,
    toggleNavDropdown,
    signInWithGoogle,
    completeGoogleLogin,
    handleFirebaseAuthStateChanged,
    handlePhoneLogin
  });
} catch (e) {
  console.warn('Failed to attach global handlers:', e);
}
