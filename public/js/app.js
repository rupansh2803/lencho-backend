/* ── LENCHO – MAIN APP ─────────────────────────────── */
let currentUser = null;
let cartCount = 0;
let localCartCache = []; // Local cart cache for instant updates
let cachedPublicSettings = null;
let publicSettingsPromise = null;
let loginType = 'email'; // Track current login type (email or phone)
let authOtpRequestInFlight = false;
let authOtpAbortController = null;
let authOtpResendTimer = null;
let authOtpResendEndsAt = 0;
let searchCache = new Map();
let searchTimeout = null;
let firebaseClientLoadPromise = null;
let adminAssetsPromise = null;
let dashboardAssetsPromise = null;
const apiGetCache = new Map();
const API_CACHE_TTL_MS = 2 * 60 * 1000;
const SEARCH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CART_LOCAL_STORAGE_KEY = 'lencho_cart_local_v1';
const WISHLIST_LOCAL_STORAGE_KEY = 'lencho_wishlist_local_v1';
const GA4_MEASUREMENT_ID = 'G-RE51HQCTCW';
const clientProductCache = new Map();
const pendingAddCartKeys = new Set();
const LOCAL_IMAGE_OPTIMIZATIONS = {
  '/images/woollen_hero.png': '/images/woollen_hero.jpg',
  '/images/woollen_pattern_bg.png': '/images/woollen_pattern_bg.jpg'
};
let lastAnalyticsPageView = '';

try { window.__appLoaded = true; } catch {}

function isSyntheticAudit() {
  const ua = navigator.userAgent || '';
  return Boolean(navigator.webdriver) || /lighthouse|pagespeed|headlesschrome/i.test(ua);
}

function trackAnalyticsPageView(path = location.pathname + location.search) {
  if (isSyntheticAudit()) return;
  if (String(path || '').startsWith('/admin')) return;
  if (typeof window.gtag !== 'function') return;

  const pagePath = path || '/';
  const pageKey = `${pagePath}|${document.title}`;
  if (lastAnalyticsPageView === pageKey) return;
  lastAnalyticsPageView = pageKey;

  window.gtag('event', 'page_view', {
    send_to: GA4_MEASUREMENT_ID,
    page_title: document.title,
    page_location: window.location.href,
    page_path: pagePath
  });
}

function loadScriptOnce(src, id) {
  return new Promise((resolve, reject) => {
    const existing = id ? document.getElementById(id) : document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve(existing);
        return;
      }
      existing.addEventListener('load', () => resolve(existing), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    if (id) script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve(script);
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function ensureAdminAssets() {
  if (adminAssetsPromise) return adminAssetsPromise;
  adminAssetsPromise = loadScriptOnce('/js/admin.js?v=6.6', 'lencho-admin-js')
    .then(() => loadScriptOnce('/js/admin-gst-settings.js?v=4.7', 'lencho-admin-gst-js'))
    .catch((error) => {
      adminAssetsPromise = null;
      throw error;
    });
  return adminAssetsPromise;
}

function ensureDashboardAssets() {
  if (typeof renderDashboard === 'function') return Promise.resolve();
  if (dashboardAssetsPromise) return dashboardAssetsPromise;
  dashboardAssetsPromise = loadScriptOnce('/js/dashboard.js?v=4.7', 'lencho-dashboard-js')
    .catch((error) => {
      dashboardAssetsPromise = null;
      throw error;
    });
  return dashboardAssetsPromise;
}

function readLocalCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_LOCAL_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(item => item && item.productId).map(item => ({
      productId: item.productId,
      variantId: item.variantId || '',
      quantity: Math.max(1, Number(item.quantity) || 1)
    })) : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items) {
  localCartCache = Array.isArray(items) ? items : [];
  localStorage.setItem(CART_LOCAL_STORAGE_KEY, JSON.stringify(localCartCache));
}

function getCartQuantity(items = localCartCache) {
  return (items || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
}

function getCartItemKey(productId, variantId = '') {
  return `${productId}::${variantId || ''}`;
}

function upsertLocalCart(productId, variantId = '', quantityDelta = 1) {
  const items = readLocalCart();
  const idx = items.findIndex(item => getCartItemKey(item.productId, item.variantId) === getCartItemKey(productId, variantId));
  if (idx >= 0) items[idx].quantity = Math.max(1, Number(items[idx].quantity || 0) + quantityDelta);
  else items.push({ productId, variantId: variantId || '', quantity: Math.max(1, Number(quantityDelta) || 1) });
  writeLocalCart(items);
  return items;
}

function setLocalCartQty(productId, variantId = '', quantity) {
  const qty = Number(quantity) || 0;
  let items = readLocalCart();
  if (qty <= 0) items = items.filter(item => getCartItemKey(item.productId, item.variantId) !== getCartItemKey(productId, variantId));
  else {
    const idx = items.findIndex(item => getCartItemKey(item.productId, item.variantId) === getCartItemKey(productId, variantId));
    if (idx >= 0) items[idx].quantity = qty;
    else items.push({ productId, variantId: variantId || '', quantity: qty });
  }
  writeLocalCart(items);
  return items;
}

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
const LEGAL_ROUTE_META = {
  '/terms': { slug: 'terms', title: 'Terms and Conditions', fallback: 'Terms and Conditions content is not set in the admin panel yet.' },
  '/privacy': { slug: 'privacy', title: 'Privacy Policy', fallback: 'Privacy Policy content is not set in the admin panel yet.' },
  '/shipping': { slug: 'shipping', title: 'Shipping Policy', fallback: 'Shipping Policy content is not set in the admin panel yet.' },
  '/returns': { slug: 'returns', title: 'Return and Refund Policy', fallback: 'Return and Refund Policy content is not set in the admin panel yet.' },
  '/cancellation': { slug: 'cancellation', title: 'Cancellation Policy', fallback: 'Cancellation Policy content is not set in the admin panel yet.' },
  '/contact-details': { slug: 'contact-details', title: 'Contact Us', fallback: 'Contact details are not set in the admin panel yet.' },
  '/grievance': { slug: 'grievance', title: 'Grievance Officer', fallback: 'Grievance officer details are not set in the admin panel yet.' },
  '/payment-policy': { slug: 'payment-policy', title: 'Payment, COD and Refund Timeline', fallback: 'Payment, COD and refund timeline content is not set in the admin panel yet.' },
  '/size-guide': { slug: 'size-guide', title: 'Size Guide', fallback: 'Size guide content is not set in the admin panel yet.' },
  '/disclaimer': { slug: 'disclaimer', title: 'Disclaimer', fallback: 'Disclaimer content is not set in the admin panel yet.' }
};

// Global event delegation for all critical buttons (works even with CSP blocking inline handlers)
document.addEventListener('click', (e) => {
  // Popup close button
  if (e.target.closest('.popup-close')) {
    closePopup();
    return;
  }
  
  // Header search button
  if (e.target.closest('#header-search-btn')) {
    toggleSearch();
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

function publicFlagEnabled(key, fallback = false) {
  const settings = readCachedPublicSettings();
  const value = settings[key];
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  return value === true || value === 'true' || value === 1 || value === '1';
}

function getCategoryImageFallback(category = '') {
  const key = String(category || '').trim().toLowerCase();
  return MEDIA_FALLBACKS[key] || MEDIA_FALLBACKS.default;
}

function safeImageUrl(url, category = '', fallback = '') {
  const raw = String(url || '').trim();
  const value = LOCAL_IMAGE_OPTIMIZATIONS[raw] || raw;
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

function finiteClientNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getClientProductStock(product, variantId = '') {
  const normalized = normalizeClientProduct(product);
  if (!normalized) return { product: null, variant: null, stock: 0 };
  const requestedVariantId = String(variantId || '');
  const variant = requestedVariantId
    ? (normalized.variants || []).find(item => String(item.id) === requestedVariantId) || null
    : null;
  const stock = variant
    ? finiteClientNumber(variant.stock, 0)
    : finiteClientNumber(normalized.stock, 0);
  return { product: normalized, variant, stock };
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
  const defaultTitle = settings.seoTitleDefault || 'Lencho - Handmade Woollen Accessories';
  const defaultDescription = settings.seoDescriptionDefault || 'Shop handmade woollen accessories, crochet pieces, and selected artificial jewellery at Lencho.';
  const defaultImage = safeImageUrl(settings.seoOgImageUrl || settings.heroImage, '', '/images/premium_hero.png');
  const twitterImage = safeImageUrl(settings.seoTwitterImageUrl || defaultImage, '', defaultImage);

  let title = defaultTitle;
  let description = defaultDescription;
  let image = defaultImage;
  let keywords = 'handmade woollen accessories, crochet scrunchies, woollen gifts, artificial jewellery, lencho';
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
  } else if (route === '/woollen' || route === '/woollen/products' || route.startsWith('/woollen/category/')) {
    const woollenCategory = route.startsWith('/woollen/category/')
      ? route.split('/woollen/category/')[1].replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
      : '';
    title = woollenCategory
      ? `${woollenCategory} Woollen Collection | ${settings.storeName || 'Lencho'}`
      : `Handmade Woollen Collection | ${settings.storeName || 'Lencho'}`;
    description = woollenCategory
      ? `Shop handmade ${woollenCategory.toLowerCase()} from ${settings.storeName || 'Lencho'} Woollen: soft crochet pieces, seasonal colours, and gift-ready finishing.`
      : `Explore ${settings.storeName || 'Lencho'} Woollen for handmade crochet hair accessories, scrunchies, flowers, baby gifts, and soft decor.`;
    const woollenSeoBanner = settings.woollenHeroBanner === '/images/woollen_hero.png' ? '/images/woollen_hero.jpg' : settings.woollenHeroBanner;
    image = safeImageUrl(woollenSeoBanner || '/images/woollen_hero.jpg', '', '/images/woollen_hero.jpg');
    keywords = 'handmade woollen accessories, crochet hair clips, crochet scrunchies, baby woollen gifts, Lencho Woollen';
    schema = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: currentUrl,
      image: `${baseUrl}${image.startsWith('/') ? image : `/${image}`}`,
      description,
      isPartOf: {
        '@type': 'WebSite',
        name: settings.storeName || 'Lencho',
        url: baseUrl
      }
    };
  } else if ((route.startsWith('/product/') || route.startsWith('/woollen/product/') || route.startsWith('/jewellery/product/')) && product) {
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
  } else if (LEGAL_ROUTE_META[route]) {
    title = `${LEGAL_ROUTE_META[route].title} | ${settings.storeName || 'Lencho'}`;
    description = `${LEGAL_ROUTE_META[route].title} for ${settings.storeName || 'Lencho'} customers.`;
  }

  document.title = title;
  upsertNamedMeta('description', description);
  upsertNamedMeta('keywords', keywords);
  upsertNamedMeta('robots', settings.seoRobotsPolicy || 'index,follow');
  upsertPropertyMeta('og:title', title);
  upsertPropertyMeta('og:description', description);
  upsertPropertyMeta('og:url', currentUrl);
  upsertPropertyMeta('og:image', `${baseUrl}${image.startsWith('/') ? image : `/${image}`}`);
  upsertNamedMeta('twitter:title', title);
  upsertNamedMeta('twitter:description', description);
  upsertNamedMeta('twitter:image', `${baseUrl}${twitterImage.startsWith('/') ? twitterImage : `/${twitterImage}`}`);
  upsertLink('canonical', currentUrl);
  if (settings.seoJsonLdEnabled === false || settings.seoJsonLdEnabled === 'false') {
    document.getElementById('dynamic-seo-jsonld')?.remove();
  } else {
    upsertJsonLd('dynamic-seo-jsonld', schema);
  }
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
function routeLoadingHTML(route = '') {
  return '';
}

function rememberClientProduct(product) {
  const normalized = normalizeClientProduct(product);
  const id = normalized && String(normalized.id || normalized._id || '');
  if (!id) return normalized;
  clientProductCache.set(id, normalized);
  return normalized;
}

function getCachedClientProduct(productId) {
  const id = String(productId || '');
  const cached = clientProductCache.get(id);
  if (cached) return cached;
  const contextProduct = currentPageContext?.product;
  if (contextProduct && String(contextProduct.id || contextProduct._id || '') === id) return contextProduct;
  return null;
}

async function navigate(path, pushState = true) {
  if (pushState) history.pushState({}, '', path);
  const app = document.getElementById('app');
  const footer = document.getElementById('site-footer');
  const header = document.getElementById('site-header');
  const [route, query] = path.split('?');
  app.innerHTML = routeLoadingHTML(route);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  const params = new URLSearchParams(query || '');
  setPageContext({ route, category: params.get('category') || '' });

  // ── SAFETY GUARD: Always ensure header/footer visible for non-admin routes ──
  const isAdmin = route === '/admin';
  const fullBleedRoute = route === '/' || route === '/woollen' || route === '/jewellery';
  document.body.classList.toggle('admin-mode', isAdmin);
  document.body.classList.toggle('woollen-page', route === '/' || route.startsWith('/woollen'));
  footer.style.display = isAdmin ? 'none' : '';
  header.style.display = isAdmin ? 'none' : '';
  app.style.paddingTop = isAdmin || fullBleedRoute ? '0' : getHeaderOffset();

  try {
    if (route === '/' || route === '') { app.style.paddingTop = '0'; renderHome(); }
    else if (route === '/jewellery') { app.style.paddingTop = '0'; renderJewelleryLanding(); }
    else if (route === '/jewellery/products') { renderProducts(params, { basePath: '/jewellery/products' }); }
    else if (route.startsWith('/jewellery/category/')) { const next = new URLSearchParams(query || ''); next.set('category', route.split('/jewellery/category/')[1]); renderProducts(next, { basePath: '/jewellery/products' }); }
    else if (route.startsWith('/jewellery/product/')) { await renderProductDetail(route.split('/jewellery/product/')[1]); }
    else if (route === '/products') { renderProducts(params); }
    else if (route === '/woollen') { renderWoollen(); }
    else if (route.startsWith('/woollen/category/')) { const next = new URLSearchParams(query || ''); next.set('category', route.split('/woollen/category/')[1]); renderWoollenProducts(next); }
    else if (route === '/woollen/products') { renderWoollenProducts(params); }
    else if (route.startsWith('/woollen/product/')) { await renderProductDetail(route.split('/woollen/product/')[1]); }
    else if (route.startsWith('/product/')) { await renderProductDetail(route.split('/product/')[1]); }
    else if (route === '/cart') { renderCart(); }
    else if (route === '/checkout') { renderCheckout(); }
    else if (route.startsWith('/checkout-now/')) { renderCheckoutNow(route.split('/checkout-now/')[1]); }
    else if (route === '/track') { renderTrack(); }
    else if (route === '/contact') { renderContact(); }
    else if (route === '/dashboard') {
      app.style.paddingTop = '0';
      await ensureDashboardAssets();
      if (typeof renderDashboard === 'function') renderDashboard();
      else app.innerHTML = `<div class="page-wrap"><div class="empty-state"><h3>Dashboard could not load</h3><p>Please refresh once.</p></div></div>`;
    }
    else if (route === '/wishlist') { renderWishlist(); }
    else if (LEGAL_ROUTE_META[route]) { renderCmsPage(LEGAL_ROUTE_META[route]); }
    else if (isAdmin) {
      await ensureAdminAssets();
      if (typeof renderAdmin === 'function') renderAdmin();
      else app.innerHTML = `<div class="page-wrap"><div class="empty-state"><h3>Admin panel failed to load</h3><p>Please refresh once.</p></div></div>`;
    }
    else { app.innerHTML = `<div class="page-wrap" style="text-align:center;padding-top:120px;"><div class="empty-icon">🔍</div><h2 style="font-family:'Cormorant Garamond',serif;font-size:2rem;">Page Not Found</h2><p style="color:var(--gray);margin:1rem 0 2rem;">The page you're looking for doesn't exist.</p><button class="btn-primary" onclick="navigate('/')">Go Home</button></div>`; }
  } catch (e) { console.error(e); }
  document.body.classList.add('app-ready');
  if (!isAdmin) applyRouteSeo({ route, category: params.get('category') || '' });
  if (!isAdmin) trackAnalyticsPageView(location.pathname + location.search);
  window.scrollTo(0, 0);
  initScrollReveal();
}

window.addEventListener('popstate', () => navigate(location.pathname + location.search, false));

// ── API HELPER ────────────────────────────────────────────
function normalizedWhatsappNumber(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function openBulkOrderWhatsApp(source = 'home') {
  const settings = readCachedPublicSettings();
  const rawNumber = settings.bulkOrderWhatsappNumber || settings.whatsappNumber || settings.aiHandoffWhatsappNumber || settings.storePhone || settings.footerPhone || '+91 7404217625';
  const number = normalizedWhatsappNumber(rawNumber);
  const text = encodeURIComponent('Hi Lencho, I want to place a bulk order. Please share catalogue, price, MOQ, customization options, and delivery time.');
  const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/917404217625?text=${text}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  try { localStorage.setItem('lencho_last_bulk_order_source', source); } catch {}
}
async function api(url, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs || 6000);
  const controller = new AbortController();
  const externalSignal = opts.signal || null;
  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const method = String(opts.method || 'GET').toUpperCase();
    const cacheable = method === 'GET'
      && location.pathname !== '/admin'
      && /^\/api\/(products|categories|testimonials|recommendations|settings(\/public)?)\b/.test(url);
    if (method !== 'GET') apiGetCache.clear();

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
      
      // If unauthorized, clear stored token except for cart/wishlist reads where local fallback keeps UX working.
      if (res.status === 401 && !/^\/api\/(cart|wishlist)\b/.test(url)) {
        clearAuth();
      }
      
      return {
        ...(errData || {}),
        error: (errData && (errData.error || errData.message)) || `Server Error: ${res.status}`,
        code: errData && errData.code,
        retryAfter: errData && errData.retryAfter,
        status: res.status
      };
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
    if (externalSignal) externalSignal.removeEventListener('abort', abortFromExternalSignal);
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
      console.warn('[Auth] Token validation failed, keeping local session until user logs in again');
      if (!currentUser && savedUser) {
        currentUser = savedUser;
        updateHeader();
      }
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
  if (!btn) return;
  if (currentUser) {
    const email = String(currentUser.email || '').trim();
    const firstName = String(currentUser.name || email || 'User').trim().split(/\s+/)[0];
    const avatar = String(currentUser.avatar || currentUser.profileImg || currentUser.picture || currentUser.photoURL || '').trim();
    const label = email || `Hi, ${firstName}`;
    if (avatar) {
      btn.innerHTML = `<img src="${avatar}" alt="${firstName}" class="header-user-avatar"/><span class="header-user-label">${label}</span>`;
    } else {
      btn.innerHTML = `<i class="fas fa-user-check"></i><span class="header-user-label">${label}</span>`;
    }
    btn.title = email || `Signed in as ${firstName}`;
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
  if (authOtpAbortController) {
    authOtpAbortController.abort();
    authOtpAbortController = null;
  }
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
  if(!captchaAnswer.trim()) { err.textContent = 'Please enter the security code'; return; }

  window.pendingAuth = { type: 'signup', name, email, phone, gender, captchaAnswer };
  sendEmailOTP(email, 'auth-signup-form', 'signup-error', captchaAnswer);
}

async function handlePhoneLogin() {
  // Phone login disabled — redirect user to email login flow
  const err = document.getElementById('phone-login-error');
  if (err) err.textContent = 'Phone login is disabled. Please use Email login.';
}

function getEmailOtpErrorMessage(resp = {}) {
  if (resp.code === 'SMTP_NOT_CONFIGURED') return 'Email OTP service is not configured. Please contact Lencho support.';
  if (resp.code === 'SMTP_AUTH_FAILED') return 'Email OTP service login failed. Please contact Lencho support.';
  if (resp.code === 'SMTP_TIMEOUT') return 'OTP email is taking longer. If it arrives, enter the code below.';
  if (resp.status === 504) return 'OTP email is taking longer. If it arrives, enter the code below.';
  if (resp.code === 'OTP_RATE_LIMITED' && resp.retryAfter) return `Too many OTP requests. Try again in ${resp.retryAfter} seconds.`;
  if (resp.code === 'OTP_REQUEST_IN_PROGRESS' && resp.retryAfter) return `OTP request is processing. Wait ${resp.retryAfter} seconds.`;
  return resp.error || 'Unable to send OTP right now. Please try again in a minute.';
}

function beginAuthOtpCountdown() {
  authOtpResendEndsAt = Date.now() + 60000;
  const resendBtn = document.getElementById('resend-otp-btn');
  if (resendBtn) resendBtn.disabled = true;

  if (authOtpResendTimer) clearInterval(authOtpResendTimer);
  authOtpResendTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((authOtpResendEndsAt - Date.now()) / 1000));
    const resendNode = document.getElementById('resend-otp-btn');
    const countdownNode = document.getElementById('otp-countdown');
    const timerNode = document.getElementById('otp-timer-display');
    if (!resendNode) return;

    if (remaining <= 0) {
      resendNode.disabled = false;
      resendNode.innerHTML = '<i class="fas fa-redo-alt"></i> Resend OTP';
      if (timerNode) timerNode.style.display = 'none';
      clearInterval(authOtpResendTimer);
      authOtpResendTimer = null;
      return;
    }
    if (countdownNode) countdownNode.textContent = remaining;
    if (timerNode) timerNode.style.display = '';
  }, 1000);
}

function showAuthEmailOtpEntry(cleanEmail, currentFormId, isResend = false, notice = '') {
  beginAuthOtpCountdown();

  const currentForm = document.getElementById(currentFormId);
  const otpStep = document.getElementById('auth-otp-step');
  if (currentForm && !isResend) currentForm.style.display = 'none';
  if (otpStep) otpStep.style.display = 'block';

  const otpError = document.getElementById('otp-error');
  if (otpError) {
    otpError.textContent = notice || '';
    otpError.classList.toggle('otp-soft-notice', Boolean(notice));
  }
  const otpInput = document.getElementById('auth-otp-input');
  if (otpInput) otpInput.value = '';
  const otpSuccess = document.getElementById('otp-success');
  if (otpSuccess) otpSuccess.style.display = 'none';

  const otpTitle = document.getElementById('otp-title');
  if (otpTitle) otpTitle.textContent = 'Verify Your Email';
  const otpSubtitle = document.getElementById('otp-subtitle');
  if (otpSubtitle) otpSubtitle.textContent = "We've sent a 6-digit verification code to your email";
  const emailDisplay = document.getElementById('otp-target-email');
  if (emailDisplay) emailDisplay.textContent = cleanEmail;

  document.querySelectorAll('#otp-input-row .otp-box').forEach(box => {
    box.value = '';
    box.classList.remove('filled', 'error', 'success');
  });
  initOtpBoxes();
  const verifyBtn = document.getElementById('verify-otp-btn');
  if (verifyBtn) verifyBtn.onclick = () => verifyEmailOTP();
}

async function sendEmailOTPSafe(email, currentFormId, errorId, captchaAnswer = '') {
  const err = document.getElementById(errorId);
  const isResend = currentFormId === 'auth-otp-step';
  const btnId = isResend ? 'resend-otp-btn' : (currentFormId === 'auth-login-form' ? 'login-btn' : 'signup-btn');
  const btn = document.getElementById(btnId);
  const originalButtonText = btn ? btn.innerHTML || btn.textContent : '';
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (err) err.textContent = '';

  if (authOtpRequestInFlight) {
    toast('OTP request is already processing. Please wait.', 'success');
    return;
  }
  if (!cleanEmail) {
    if (err) err.textContent = 'Please enter email address';
    return;
  }
  if (!isResend && (!captchaAnswer || !captchaAnswer.trim())) {
    if (err) err.textContent = 'Please enter the security code';
    return;
  }

  authOtpRequestInFlight = true;
  authOtpAbortController = new AbortController();
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending OTP...';
  }

  try {
    const resp = await api('/api/otp/send-email', {
      method: 'POST',
      body: { email: cleanEmail, captchaAnswer: String(captchaAnswer || '').trim(), resend: isResend },
      timeoutMs: 65000,
      signal: authOtpAbortController.signal
    });

    if (resp.error) {
      const message = getEmailOtpErrorMessage(resp);
      if (resp.code === 'OTP_REQUEST_IN_PROGRESS') {
        showAuthEmailOtpEntry(cleanEmail, currentFormId, isResend, `${message} If the email arrives, enter the code here.`);
        toast(message, 'success');
        return;
      }
      const canEnterDelayedOtp = resp.deliveryPending
        || resp.code === 'SMTP_TIMEOUT'
        || resp.status === 504
        || /timed out|taking longer|request timed out/i.test(message);
      if (canEnterDelayedOtp) {
        showAuthEmailOtpEntry(
          cleanEmail,
          currentFormId,
          isResend,
          'OTP email is taking longer. If it arrives, enter the code here. Resend opens in 60 seconds.'
        );
        toast('OTP email is on the way. Check inbox or spam.', 'success');
        return;
      }
      if (err) err.textContent = message;
      toast(message, 'error');
      if (!isResend) await loadAuthCaptcha();
      return;
    }

    toast('OTP sent successfully.', 'success');
    showAuthEmailOtpEntry(cleanEmail, currentFormId, isResend, '');

    if (resp.debugOTP || resp.devOtp) {
      const otpError = document.getElementById('otp-error');
      const devMsg = `DEV MODE: Your OTP is ${resp.debugOTP || resp.devOtp}. This will only show in development.`;
      if (otpError) otpError.textContent = devMsg;
      console.log(devMsg);
    }
  } catch (error) {
    const message = error?.name === 'AbortError' ? 'OTP request cancelled.' : 'Network error or timeout. Please try again.';
    if (err) err.textContent = message;
    if (error?.name !== 'AbortError') toast(message, 'error');
    if (!isResend) await loadAuthCaptcha();
  } finally {
    authOtpRequestInFlight = false;
    authOtpAbortController = null;
    if (btn) {
      btn.disabled = false;
      if (originalButtonText) btn.innerHTML = originalButtonText;
      else btn.textContent = isResend ? 'Resend OTP' : (currentFormId === 'auth-login-form' ? 'Sign In' : 'Send OTP');
    }
  }
}

async function sendEmailOTP(email, currentFormId, errorId, captchaAnswer = '') {
  return sendEmailOTPSafe(email, currentFormId, errorId, captchaAnswer);
  const err = document.getElementById(errorId);
  const btnId = currentFormId === 'auth-login-form' ? 'login-btn' : 'signup-btn';
  const btn = document.getElementById(btnId);
  err.textContent = '';

  if (authOtpRequestInFlight) {
    err.textContent = 'OTP request is already in progress. Please wait.';
    return;
  }

  // Validate captcha answer before sending
  if (!captchaAnswer || !captchaAnswer.trim()) {
    err.textContent = 'Please enter the security code';
    return;
  }

  authOtpRequestInFlight = true;
  
  if (btn) { btn.disabled = true; btn.textContent = 'Sending OTP... ✦'; }
  let resp = null;
  const resetOtpRequest = () => {
    authOtpRequestInFlight = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = currentFormId === 'auth-login-form' ? 'Sign In' : 'Send OTP ✦';
    }
  };
  
  try {
    resp = await api('/api/otp/send-email', { method: 'POST', body: { email: email.trim().toLowerCase(), captchaAnswer: captchaAnswer.trim() }, timeoutMs: 45000 });
    
    resetOtpRequest();
    
    if (resp.error) {
      const raw = String(resp.error || '');
      // Refresh captcha on any error so user can retry
      await loadAuthCaptcha();
      if (/535|badcredentials|invalid login|username and password not accepted/i.test(raw)) {
        err.textContent = 'Email OTP service is not configured correctly. Please try Google login or contact support.';
      } else {
        err.textContent = raw;
        toast(raw, 'error');
      }
      return;
    }

    toast('OTP sent successfully! ✦', 'success');
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
    resetOtpRequest();
    err.textContent = 'Network error or timeout. Please try again.';
    toast('Network error or timeout. Please try again.', 'error');
    await loadAuthCaptcha();
    return;
  }
  
  // Show OTP in dev mode if available
  if (resp && (resp.debugOTP || resp.devOtp)) {
    const devMsg = `DEV MODE: Your OTP is ${resp.debugOTP || resp.devOtp}. This will only show in development.`;
    document.getElementById('otp-error').textContent = devMsg;
    console.log(devMsg);
  }
  
  toast('OTP sent to your email! 📧', 'success');
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
  toast('OTP sent to your phone! 📱', 'success');
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
  navigate('/');
}

async function completeSignupAfterOTP() {
  const password = document.getElementById('signup-password-step').value;
  const confirmPassword = document.getElementById('signup-confirm-password-step').value;
  const err = document.getElementById('signup-password-step-error');

  if (!window.pendingAuth || window.pendingAuth.type !== 'signup') {
    err.textContent = 'Signup session expired. Please start again.';
    return;
  }
  if (!password) { err.textContent = 'Please enter password'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
  if (password !== confirmPassword) { err.textContent = 'Passwords do not match'; return; }

  const payload = { ...window.pendingAuth, password };
  const finalResp = await api('/api/signup', { method: 'POST', body: payload });
  if (finalResp.error) { err.textContent = finalResp.error; return; }

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
  navigate('/'); // Redirect to home page after signup
}

function resendEmailOTP() {
  if (authOtpRequestInFlight) return;
  if (authOtpResendEndsAt && Date.now() < authOtpResendEndsAt) return;
  if (window.pendingAuth) {
    if (window.pendingAuth.loginType === 'phone' && window.pendingAuth.phone) {
      sendPhoneOTP(window.pendingAuth.phone);
    } else if (window.pendingAuth.email) {
      sendEmailOTP(window.pendingAuth.email, 'auth-otp-step', 'otp-error');
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
  updateHeader();
  const cartCountEl = document.getElementById('cart-count');
  if (cartCountEl) cartCountEl.textContent = '0';
  
  toast('Logged out successfully', 'info');
  navigate('/');
}

// ── CART COUNT (INSTANT UPDATES) ────────────────────────
async function updateCartCount() {
  const cartBadge = document.getElementById('cart-count');
  localCartCache = readLocalCart();
  if (!currentUser) {
    cartCount = getCartQuantity(localCartCache);
    if (cartBadge) cartBadge.textContent = cartCount;
    return;
  }
  try {
    const r = await api('/api/cart');
    if (r.error) {
      cartCount = getCartQuantity(localCartCache);
      if (cartBadge) cartBadge.textContent = cartCount;
      return;
    }
    const items = Array.isArray(r.items)
      ? r.items.map(item => ({ productId: item.productId, variantId: item.variantId || '', quantity: Number(item.quantity) || 1 }))
      : [];
    if (items.length || localCartCache.length === 0) {
      writeLocalCart(items);
    }
    const sourceItems = items.length ? items : localCartCache;
    cartCount = items.length || localCartCache.length === 0
      ? (Number(r.count ?? getCartQuantity(sourceItems)) || 0)
      : getCartQuantity(sourceItems);
    if (cartBadge) cartBadge.textContent = cartCount;
  } catch (e) {
    console.error('Cart count update error:', e);
    cartCount = getCartQuantity(localCartCache);
    if (cartBadge) cartBadge.textContent = cartCount;
  }
}

// Helper: Update badge immediately (optimistic)
function updateCartBadgeOptimistic(newCount) {
  cartCount = Math.max(0, newCount);
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = cartCount;
    badge.classList.remove('cart-badge-pulse');
    void badge.offsetWidth;
    badge.classList.add('cart-badge-pulse');
  }
}

function setAddToCartButtonState(button, state) {
  if (!button) return;
  const original = button.dataset.originalLabel || button.innerHTML;
  button.dataset.originalLabel = original;
  if (state === 'adding') {
    button.disabled = true;
    button.classList.add('is-adding');
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  } else if (state === 'added') {
    button.disabled = true;
    button.classList.remove('is-adding');
    button.classList.add('is-added');
    button.innerHTML = '<i class="fas fa-check"></i> Added';
    setTimeout(() => {
      button.disabled = false;
      button.classList.remove('is-added');
      button.innerHTML = button.dataset.originalLabel || original;
    }, 700);
  } else {
    button.disabled = false;
    button.classList.remove('is-adding', 'is-added');
    button.innerHTML = button.dataset.originalLabel || original;
  }
}

function animateAddToCart(productId, triggerEl = null) {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const button = triggerEl || null;
    const source = button?.closest?.('.product-card, .product-detail-container, .product-detail-page')?.querySelector?.('img.product-img, .gallery-main img, #main-product-img')
      || document.querySelector(`#main-product-img`)
      || null;
    const cartTarget = document.querySelector('[onclick*="/cart"], .cart-icon, #cart-count') || document.getElementById('cart-count');
    if (!source || !cartTarget) return;
    const from = source.getBoundingClientRect();
    const to = cartTarget.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) return;
    const clone = document.createElement('img');
    clone.className = 'add-cart-flyer';
    clone.src = source.currentSrc || source.src;
    clone.alt = '';
    clone.style.left = `${from.left}px`;
    clone.style.top = `${from.top}px`;
    clone.style.width = `${Math.min(from.width, 96)}px`;
    clone.style.height = `${Math.min(from.height, 96)}px`;
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.28)`;
      clone.style.opacity = '0';
    });
    setTimeout(() => clone.remove(), 680);
  } catch (e) {
    console.warn('Add-to-cart animation skipped:', e);
  }
}

async function validateProductForCart(productId, variantKey, before) {
  let productResponse = getCachedClientProduct(productId);
  let fromCache = Boolean(productResponse);
  if (!productResponse) {
    productResponse = await api(`/api/products/${productId}`, { timeoutMs: 5000 });
    fromCache = false;
  }
  if (productResponse?.error || !(productResponse?.id || productResponse?._id)) {
    return { error: 'Product not found' };
  }
  productResponse = rememberClientProduct(productResponse);
  const snapshot = getClientProductStock(productResponse, variantKey);
  if (variantKey && !snapshot.variant) return { error: 'Selected variant is not available' };
  if (String(snapshot.product.status || 'published') !== 'published') return { error: 'Product is not available' };
  const existingQty = before
    .filter(item => getCartItemKey(item.productId, item.variantId) === getCartItemKey(productId, variantKey))
    .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  if (snapshot.stock <= 0) return { error: 'Out of stock' };
  if (existingQty + 1 > snapshot.stock) return { error: `Only ${snapshot.stock} left in stock` };
  return { product: productResponse, snapshot, fromCache };
}

function revalidateGuestCartAdd(productId, variantKey, before) {
  api(`/api/products/${productId}`, { timeoutMs: 5000 }).then(serverProduct => {
    if (serverProduct?.error || !(serverProduct?.id || serverProduct?._id)) throw new Error('Product could not be added. Please try again.');
    rememberClientProduct(serverProduct);
    const check = getClientProductStock(serverProduct, variantKey);
    const localQty = readLocalCart()
      .filter(item => getCartItemKey(item.productId, item.variantId) === getCartItemKey(productId, variantKey))
      .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    if (variantKey && !check.variant) throw new Error('Selected variant is not available');
    if (String(check.product.status || 'published') !== 'published') throw new Error('Product is not available');
    if (check.stock <= 0 || localQty > check.stock) throw new Error(`Only ${check.stock} left in stock`);
  }).catch(error => {
    writeLocalCart(before);
    updateCartBadgeOptimistic(getCartQuantity(before));
    if (location.pathname === '/cart' && typeof renderCart === 'function') renderCart();
    toast(error.message || 'Product could not be added. Please try again.', 'error');
  });
}

// Add to cart with instant optimistic UI; backend still validates stock and price.
async function addToCart(productId, showToast = true, variantId = '', triggerEl = null) {
  const before = readLocalCart();
  const variantKey = String(variantId || '');
  const cartKey = getCartItemKey(productId, variantKey);
  const button = triggerEl || (typeof event !== 'undefined' ? event?.currentTarget : null);

  if (pendingAddCartKeys.has(cartKey)) {
    if (showToast) toast('Already adding this item...', 'info');
    return false;
  }
  pendingAddCartKeys.add(cartKey);
  setAddToCartButtonState(button, 'adding');

  let validation;
  try {
    validation = await validateProductForCart(productId, variantKey, before);
    if (validation.error) throw new Error(validation.error);
  } catch (e) {
    console.error('Stock check failed:', e);
    if (showToast) toast(e.message || 'Could not check stock. Please try again.', 'error');
    setAddToCartButtonState(button, 'default');
    pendingAddCartKeys.delete(cartKey);
    return false;
  }

  const optimistic = upsertLocalCart(productId, variantId, 1);
  updateCartBadgeOptimistic(getCartQuantity(optimistic));
  animateAddToCart(productId, button);
  if (showToast) toast('Added to cart!', 'cart');

  if (!currentUser) {
    setAddToCartButtonState(button, 'added');
    pendingAddCartKeys.delete(cartKey);
    if (validation.fromCache) revalidateGuestCartAdd(productId, variantKey, before);
    return true;
  }
  
  // Background: Sync with server
  try {
    const r = await api('/api/cart/add', { method: 'POST', body: { productId, variantId, quantity: 1 } });
    if (r.error) { 
      writeLocalCart(before);
      updateCartBadgeOptimistic(getCartQuantity(before));
      if (showToast) toast(r.error, 'error');
      setAddToCartButtonState(button, 'default');
      pendingAddCartKeys.delete(cartKey);
      return false;
    }
    updateCartBadgeOptimistic(Number(r.count) || getCartQuantity(readLocalCart()));
    updateCartCount();
    setAddToCartButtonState(button, 'added');
    pendingAddCartKeys.delete(cartKey);
    return true;
  } catch (e) {
    console.error('Add to cart error:', e);
    writeLocalCart(before);
    updateCartBadgeOptimistic(getCartQuantity(before));
    if (showToast) toast('Could not add to cart. Please try again.', 'error');
    setAddToCartButtonState(button, 'default');
    pendingAddCartKeys.delete(cartKey);
    return false;
  }
}

// Remove from cart with INSTANT feedback
async function removeFromCart(productId, variantId = '') {
  const before = readLocalCart();
  const optimistic = setLocalCartQty(productId, variantId, 0);
  updateCartBadgeOptimistic(getCartQuantity(optimistic));
  toast('Item removed from cart', 'info');
  
  // Background: Sync with server
  try {
    const r = await api(`/api/cart/${productId}?variantId=${encodeURIComponent(variantId || '')}`, { method: 'DELETE' });
    if (r.error) {
      console.warn('Cart remove server sync failed, kept local cart:', r.error);
    }
    await updateCartCount();
  } catch (e) {
    console.error('Remove from cart error:', e);
    updateCartBadgeOptimistic(getCartQuantity(readLocalCart()));
  }
  
  // Refresh cart page if open
  if (location.pathname === '/cart') {
    renderCart();
  }
}

// Clear entire cart with confirmation
async function clearCart() {
  const confirmed = confirm('Are you sure you want to clear your entire cart? This action cannot be undone.');
  if (!confirmed) return;
  
  const before = readLocalCart();
  writeLocalCart([]);
  updateCartBadgeOptimistic(0);
  
  // Background: Sync with server
  try {
    const r = await api('/api/cart', { method: 'DELETE' });
    if (r.success) {
      toast('Cart cleared!', 'success');
      if (location.pathname === '/cart') {
        setTimeout(() => renderCart(), 300);
      }
    }
  } catch (e) {
    console.error('Clear cart error:', e);
    updateCartBadgeOptimistic(0);
  }
}

// Wishlist with INSTANT updates
async function toggleWishlist(productId, btn) {
  if (!currentUser) { openAuthModal(); return; }
  
  // ✓ INSTANT UI UPDATE
  const willAdd = !btn.classList.contains('active');
  btn.classList.toggle('active');
  
  if (willAdd) toast('Added to wishlist ❤️', 'success');
  else toast('Removed from wishlist', 'info');
  
  // Background: Sync with server
  try {
    const r = await api('/api/wishlist/toggle', { method: 'POST', body: { productId } });
    if (r.added !== willAdd) {
      btn.classList.toggle('active'); // Revert if server disagrees
    }
  } catch (e) {
    console.error('Wishlist toggle error:', e);
    btn.classList.toggle('active'); // Revert on error
  }
}

async function buyNow(productId, variantId = '') {
  if (!currentUser) { openAuthModal(); return; }
  const added = await addToCart(productId, false, variantId || '');
  if (!added) return;
  navigate('/checkout');
  toast('Opening checkout...', 'success');
}

// ── DISCOUNT POPUP (SHOW ONCE PER SESSION) ────────────────
function applyDiscountPopupSettings() {
  const settings = readCachedPublicSettings();
  const get = (key, fallback = '') => String(settings[key] || fallback || '').trim();
  const popup = document.getElementById('discount-popup');
  if (!popup) return;

  const badge = popup.querySelector('.popup-badge');
  const title = popup.querySelector('.popup-title');
  const sub = popup.querySelector('.popup-sub');
  const button = popup.querySelector('.popup-form .btn-primary');
  const terms = popup.querySelector('.popup-terms');
  const offerPercent = get('popupDiscountPercent', '10');

  if (badge) badge.textContent = get('popupBadgeText', 'EXCLUSIVE OFFER');
  if (title) title.innerHTML = get('popupTitle', `Get <span class="gold-text">${offerPercent}% OFF</span><br/>on Your First Order!`);
  if (sub) sub.textContent = get('popupSubtitle', 'Enter your email to claim your special discount code');
  if (button) button.textContent = get('popupButtonText', 'Claim My Discount');
  if (terms) terms.textContent = get('popupTerms', '*Valid for new customers only. Cannot be combined with other offers.');
}

function showDiscountPopup() {
  // Only show once for the visitor unless they clear browser data.
  if (isSyntheticAudit()) return;
  const popupSeen = localStorage.getItem('lenchoDiscountPopupSeen') || sessionStorage.getItem('popupShown');
  if (popupSeen) return;
  
  const popup = document.getElementById('discount-popup');
  if (!popup) return;
  
  applyDiscountPopupSettings();
  popup.style.display = 'flex';
  sessionStorage.setItem('popupShown', '1');
  localStorage.setItem('lenchoDiscountPopupSeen', '1');
}

function closePopup() {
  const popup = document.getElementById('discount-popup');
  if (!popup) return;
  popup.style.display = 'none';
  sessionStorage.setItem('popupShown', '1');
  localStorage.setItem('lenchoDiscountPopupSeen', '1');
}
async function claimDiscount() {
  const email = document.getElementById('popup-email')?.value;
  const consent = document.getElementById('popup-consent')?.checked;
  if (!email) { toast('Please enter your email', 'error'); return; }
  if (!consent) { toast('Please agree to receive offers and updates', 'error'); return; }
  const btn = document.querySelector('.popup-form .btn-primary');
  const form = document.querySelector('.popup-form');
  const settings = readCachedPublicSettings();
  
  btn.textContent = 'Claiming...'; btn.disabled = true;
  const r = await api('/api/discount/email', {
    method: 'POST',
    body: {
      email,
      marketingConsent: true,
      consentText: 'I agree to receive offers and updates from Lencho. I can unsubscribe anytime.'
    }
  });
  
  if (r.error) { 
    toast(r.error, 'error'); 
    btn.textContent = 'Claim My Discount 🎁'; 
    btn.textContent = String(settings.popupButtonText || 'Claim My Discount').trim();
    btn.disabled = false; 
    return; 
  }
  
  // Hide form and show result
  if (form) form.style.display = 'none';
  const result = document.getElementById('popup-result');
  result.innerHTML = `<div style="text-align:center;padding:1rem;">🎉 Thank you! Your code:<br/><strong style="color:var(--rose-dark);font-size:1.6rem;display:block;margin:10px 0;">WELCOME10</strong> — 10% OFF applied!</div>`;
  const code = String(settings.popupDiscountCode || r.code || 'WELCOME10').trim();
  const percent = String(settings.popupDiscountPercent || '10').trim();
  result.innerHTML = `<div style="text-align:center;padding:1rem;">Thank you! Your code:<br/><strong style="color:var(--rose-dark);font-size:1.6rem;display:block;margin:10px 0;">${code}</strong>${percent ? ` - ${percent}% OFF applied!` : ''}</div>`;
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
    l.addEventListener('click', (event) => {
      if (window.innerWidth <= 768 && l.classList.contains('nav-dropdown-trigger')) {
        return;
      }
      closeMobileMenu();
    });
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
  e.preventDefault?.();
  e.stopPropagation();
  const isMobile = window.innerWidth <= 768;
  const dd = document.getElementById('nav-collections-dd');
  const arrow = document.getElementById('coll-arrow');
  if (!dd) return;
  if (isMobile) {
    // On mobile: toggle open/close
    const isOpen = dd.classList.contains('mob-open');
    dd.classList.toggle('mob-open', !isOpen);
    if (arrow) arrow.style.transform = isOpen ? '' : 'rotate(180deg)';
  } else {
    // On desktop: navigate directly
    navigate('/woollen');
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

// ── SEARCH FUNCTIONALITY ──────────────────────────────────
function toggleSearch() {
  const searchBox = document.getElementById('search-box');
  if (!searchBox) return;
  const isVisible = searchBox.style.display !== 'none';
  searchBox.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) {
    setTimeout(() => {
      const input = document.getElementById('header-search-input');
      if (input) input.focus();
    }, 100);
  }
}

async function performSearch(query) {
  if (!query || query.length < 2) {
    const resultsDiv = document.getElementById('search-results');
    if (resultsDiv) resultsDiv.style.display = 'none';
    return;
  }

  const cacheKey = `search_${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
      displaySearchResults(cached.results, query);
      return;
    }
  }

  try {
    const results = await api(`/api/products?search=${encodeURIComponent(query)}`);
    const resultsArray = Array.isArray(results) ? results : [];
    searchCache.set(cacheKey, { results: resultsArray, timestamp: Date.now() });
    displaySearchResults(resultsArray, query);
  } catch (e) {
    console.error('Search error:', e);
  }
}

function displaySearchResults(products, query) {
  const resultsDiv = document.getElementById('search-results');
  if (!resultsDiv) return;

  // Hide search results dropdown - don't show cards
  resultsDiv.style.display = 'none';
}

// Setup search listeners
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('header-search-input');
  const mobileSearchInput = document.getElementById('mobile-search-input');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
    });
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.length >= 2) performSearch(searchInput.value);
    });
  }

  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
    });
  }

  // Close search results on outside click
  document.addEventListener('click', (e) => {
    const resultsDiv = document.getElementById('search-results');
    const searchBox = document.getElementById('search-box');
    if (searchBox && !searchBox.contains(e.target) && !e.target.closest('#header-search-btn')) {
      if (resultsDiv) resultsDiv.style.display = 'none';
    }
  });
});

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
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const autoRevealSelectors = [
    '.trust-hub .trust-item',
    '.home-woollen-chips span',
    '.home-woollen-proof > div',
    '.home-view-more-row',
    '.testi-grid .testi-card'
  ];
  const staggerGroups = [
    ['.products-grid .product-card.reveal, .wishlist-grid .product-card.reveal', 70, 420],
    ['.categories-grid .cat-card.reveal, .woollen-collections-grid .woollen-collection-card.reveal', 85, 430],
    ['.trust-hub .trust-item, .home-woollen-chips span, .home-woollen-proof > div', 75, 320],
    ['.testi-grid .testi-card', 80, 360]
  ];

  autoRevealSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.classList.add('motion-reveal'));
  });

  staggerGroups.forEach(([selector, step, maxDelay]) => {
    document.querySelectorAll(selector).forEach((el, index) => {
      el.style.setProperty('--lencho-stagger', `${Math.min(index * step, maxDelay)}ms`);
    });
  });

  const targets = document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale,.motion-reveal');
  if (motionQuery.matches || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('visible'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(el => obs.observe(el));
}

function initHeroPointerMotion() {
  const hero = document.querySelector('.hero-premium');
  if (!hero || hero.dataset.motionBound === 'true') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 900) return;

  let frame = 0;
  const setShift = (x, y) => {
    hero.style.setProperty('--hero-shift-x', `${x.toFixed(1)}px`);
    hero.style.setProperty('--hero-shift-y', `${y.toFixed(1)}px`);
  };

  hero.dataset.motionBound = 'true';
  hero.addEventListener('pointermove', (event) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 12;
      setShift(x, y);
      frame = 0;
    });
  });
  hero.addEventListener('pointerleave', () => setShift(0, 0));
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

function productRoutePath(product = {}) {
  return product?.storeType === 'woollen'
    ? `/woollen/product/${product.id}`
    : `/jewellery/product/${product.id}`;
}

// ── PRODUCT CARD ─────────────────────────────────────────
function productCardHTML(p) {
  const product = rememberClientProduct(p);
  const detailPath = productRoutePath(product);
  const safeDetailPath = escapeInlineJsString(detailPath);
  const productId = String(product.id || p.id || p._id || '');
  const safeProductId = escapeInlineJsString(productId);
  const productName = escapeHtml(product.name || p.name || 'Product');
  const showCardRatings = publicFlagEnabled('showProductCardRatings', false);
  const showCardDeliveryBox = publicFlagEnabled('showProductCardDeliveryBox', false);
  const secondaryImg = product.images[1] || product.images[0];
  const cardStock = finiteClientNumber(product.stock ?? p.stock, 0);
  const cardOutOfStock = cardStock <= 0 || String(product.status || p.status || 'published') !== 'published';
  const cardDisabledAttr = cardOutOfStock ? 'disabled aria-disabled="true"' : '';
  const cardDisabledStyle = cardOutOfStock ? 'opacity:.55;cursor:not-allowed;filter:grayscale(.15);' : '';
  const stockStatus = p.stock < 5 && p.stock > 0 ? '⚡ Only few left' : '';
  const isBestSeller = p.popular ? '⭐ Best Seller' : '';
  const isFeatured = p.featured ? '✨ Featured' : '';
  const badge = isBestSeller || isFeatured || stockStatus || (p.discount > 30 ? '🔥 Hot Deal' : '');
  
  return `
  <div class="product-card reveal" role="button" tabindex="0" onclick="navigate('${safeDetailPath}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate('${safeDetailPath}')}" style="border-radius:16px !important;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08) !important;transition:transform .3s ease,box-shadow .3s ease !important;background:#fff;border:1px solid rgba(201,106,138,.08);cursor:pointer;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 12px 32px rgba(201,106,138,.15) !important';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 16px rgba(0,0,0,.08) !important';">
    <div class="product-img-wrap" style="position:relative;overflow:hidden;aspect-ratio:1/1.15;cursor:pointer;">
      <img class="product-img" src="${safeImageUrl(product.images[0], product.category)}" alt="${productName}" loading="lazy" decoding="async" ${imageFallbackAttr(product.category)} style="width:100%;height:100%;object-fit:contain;object-position:center;background:#fff;transition:opacity .4s ease !important;display:block;"/>
      <img class="product-img img-hover" src="${safeImageUrl(secondaryImg, product.category)}" alt="${productName}" loading="lazy" decoding="async" ${imageFallbackAttr(product.category)} style="width:100%;height:100%;object-fit:contain;object-position:center;background:#fff;position:absolute;top:0;left:0;opacity:0;transition:opacity .4s ease !important;display:block;"/>
      ${cardOutOfStock ? `<span style="position:absolute;bottom:12px;left:12px;background:#374151;color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:.75rem;z-index:3;">Out of Stock</span>` : ''}
      
      ${p.discount ? `<span class="product-badge" style="position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:.75rem;z-index:2;">✦ ${p.discount}% OFF ✦</span>` : ''}
      
      ${!cardOutOfStock && badge ? `<span style="position:absolute;bottom:12px;left:12px;background:var(--gold);color:var(--dark);padding:6px 12px;border-radius:8px;font-weight:600;font-size:.75rem;z-index:2;">${badge}</span>` : ''}
      
      <button class="product-wish" onclick="event.stopPropagation(); toggleWishlist('${safeProductId}',this)" title="Add to Wishlist" style="position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.95);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:3;transition:transform .2s;font-size:.9rem;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"><i class="fas fa-heart" style="color:#ddd;"></i></button>
    </div>
    
    <div class="product-body" style="padding:1rem 1rem 1.2rem;">
      <div class="product-name" style="font-weight:800;font-size:1.12rem;color:var(--dark);cursor:pointer;line-height:1.3;margin-bottom:.55rem;transition:color .2s;" onmouseover="this.style.color='var(--rose)'" onmouseout="this.style.color='var(--dark)'">${productName}</div>
      
      ${showCardRatings ? `<div class="product-rating" style="margin-bottom:.6rem;">
        <span class="stars" style="font-size:.85rem;">${renderStars(p.rating || 0)}</span>
        ${p.reviews?.length ? `<span class="rating-count" style="font-size:.75rem;color:var(--gray);margin-left:.5rem;">(${p.reviews.length})</span>` : ''}
      </div>` : ''}
      
      <div class="product-price" style="margin-bottom:.75rem;">
        <span class="price-current" style="font-size:1.2rem;font-weight:700;color:var(--rose);">₹${Math.round(p.price)}</span>
        ${p.mrp ? `<span class="price-mrp" style="font-size:.85rem;color:var(--gray);text-decoration:line-through;margin-left:.5rem;">₹${Math.round(p.mrp)}</span>` : ''}
        ${p.discount ? `<span class="price-off" style="font-size:.75rem;color:var(--gold);margin-left:.5rem;font-weight:600;">Save ${p.discount}%</span>` : ''}
      </div>
      
      ${showCardDeliveryBox ? `<div class="product-card-delivery-box" style="margin-bottom:0.75rem; padding:0.75rem; background:var(--beige); border-radius:8px; font-size:.8rem; color:var(--gray);">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:4px;">
          <i class="fas fa-truck-fast" style="color:var(--rose);"></i>
          <span><strong>Free</strong> delivery above ₹999</span>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem;">
          <i class="fas fa-tag" style="color:var(--gold);"></i>
          <span>Standard delivery in 3-5 days</span>
        </div>
      </div>` : ''}
      
      <div class="product-actions" style="margin-top:1rem;display:flex;gap:.5rem;flex-direction:column;">
        <button class="btn-primary btn-sm" onclick="event.stopPropagation(); addToCart('${safeProductId}', true, '', this)" ${cardDisabledAttr} style="flex:1;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;${cardDisabledStyle}" onmouseover="${cardOutOfStock ? '' : "this.style.transform='translateY(-2px)'"}" onmouseout="this.style.transform='translateY(0)'">
          <i class="fas fa-shopping-bag"></i> ${cardOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;">
          <button class="btn-outline btn-sm" onclick="event.stopPropagation(); navigate('${safeDetailPath}')" style="padding:10px;border-radius:8px;border:2px solid var(--rose);background:#fff;color:var(--rose);font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;" onmouseover="this.style.background='var(--rose-light)'" onmouseout="this.style.background='#fff'">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn-gold btn-sm" onclick="event.stopPropagation(); buyNow('${safeProductId}')" ${cardDisabledAttr} style="padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9954c,#a67a38);color:#fff;font-weight:600;cursor:pointer;transition:transform .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;${cardDisabledStyle}" onmouseover="${cardOutOfStock ? '' : "this.style.transform='translateY(-2px)'"}" onmouseout="this.style.transform='translateY(0)'">
            <i class="fas fa-bolt"></i> ${cardOutOfStock ? 'Sold Out' : 'Buy Now'}
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

function fallbackHomeCollections() {
  return [
    { name: 'Earrings', slug: 'earrings', image: '/images/earrings.png' },
    { name: 'Necklace Sets', slug: 'necklace', image: '/images/necklace.png' },
    { name: 'Rings', slug: 'rings', image: '/images/p1.png' },
    { name: 'Bridal Sets', slug: 'sets', image: '/images/showcase.png' },
    { name: 'Bangles', slug: 'bangles', image: '/images/p4.png' },
    { name: 'Bracelets', slug: 'bracelets', image: '/images/p1.png' },
  ];
}

function normalizeHomeCollectionCard(collection = {}) {
  const rawSlug = collection.slug || collection.category || collection.name || '';
  const slug = String(rawSlug).trim().toLowerCase().replace(/\s+/g, '-');
  const name = collection.name || productCategoryLabel(slug || collection.category || 'Collection');
  return {
    ...collection,
    name,
    slug,
    image: collection.image || collection.bannerImage || collection.images?.[0] || '/images/hero.png'
  };
}

function mergeHomeCollections(collections = []) {
  const base = (Array.isArray(collections) ? collections : [])
    .filter(Boolean)
    .map(normalizeHomeCollectionCard)
    .filter(collection => collection.slug);
  const seen = new Set(base.map(collection => collection.slug));
  const fallback = shuffleArray(fallbackHomeCollections())
    .filter(collection => !seen.has(collection.slug))
    .map(normalizeHomeCollectionCard);
  return [...base, ...fallback].slice(0, 3);
}

function categoriesWithProducts(categories = [], products = [], storeType = 'main') {
  const productCategories = new Map();
  (Array.isArray(products) ? products : []).forEach(product => {
    if (!product || (product.storeType || 'main') !== storeType || !product.category) return;
    const slug = String(product.category).trim().toLowerCase();
    if (!slug || productCategories.has(slug)) return;
    productCategories.set(slug, {
      name: product.category.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
      slug,
      image: product.images?.[0] || product.image || '/images/hero.png'
    });
  });

  const productBacked = (Array.isArray(categories) ? categories : [])
    .map(normalizeHomeCollectionCard)
    .filter(category => productCategories.has(category.slug))
    .map(category => ({ ...category, image: category.image || productCategories.get(category.slug)?.image }));

  return productBacked.length ? productBacked : Array.from(productCategories.values());
}
function renderHomeCollectionCards(container, collections = [], options = {}) {
  const normalized = (Array.isArray(collections) ? collections : [])
    .filter(Boolean)
    .map(normalizeHomeCollectionCard)
    .filter(collection => collection.slug);
  const cards = normalized.length && options.fillFallback === false
    ? normalized.slice(0, 3)
    : mergeHomeCollections(normalized).slice(0, 3);
  container.innerHTML = cards.map((c, i) => `
    <div class="cat-card reveal" style="animation-delay:${i * 0.05}s" onclick="navigate('/products?category=${c.slug}')">
      <img class="cat-img" src="${safeImageUrl(c.image, c.slug)}" alt="${c.name}" loading="lazy" decoding="async" ${imageFallbackAttr(c.slug)}/>
      <div class="cat-overlay"></div>
      <div class="cat-content"><div class="cat-name">${c.name}</div><button class="cat-btn">Shop Now</button></div>
    </div>
  `).join('');
  initScrollReveal();
}

function renderFallbackCollectionCards(container) {
  renderHomeCollectionCards(container, []);
}
function renderFallbackFeaturedCards(container) {
  const fallbackFeatured = shuffleArray([
    { title: 'Crochet Keychains', slug: 'crochet-keychains', image: '/images/woollen_hero.jpg' },
    { title: 'Soft Scrunchies', slug: 'scrunchies', image: '/images/woollen_pattern_bg.jpg' },
    { title: 'Baby Gifts', slug: 'baby-gifts', image: '/images/woollen_hero.jpg' },
    { title: 'Crochet Decor', slug: 'crochet-decor', image: '/images/woollen_pattern_bg.jpg' },
  ]);

  container.innerHTML = fallbackFeatured.map((item, i) => `
    <div class="product-card reveal" style="border-radius:16px !important;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.08) !important;transition:transform .3s ease,box-shadow .3s ease !important;background:#fff;border:1px solid rgba(201,106,138,.08);" onclick="navigate('/woollen/products?category=${item.slug}')">
      <div class="product-img-wrap" style="position:relative;overflow:hidden;aspect-ratio:1/1.15;cursor:pointer;">
        <img class="product-img" src="${safeImageUrl(item.image, item.slug)}" alt="${item.title}" loading="lazy" decoding="async" ${imageFallbackAttr(item.slug)} style="width:100%;height:100%;object-fit:cover;object-position:center;background:#fff;display:block;"/>
        <span class="product-badge" style="position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;padding:6px 12px;border-radius:8px;font-weight:700;font-size:.75rem;z-index:2;">Handmade</span>
      </div>
      <div class="product-body" style="padding:1rem 1rem 1.2rem;">
        <div class="product-name" style="font-weight:600;font-size:.95rem;color:var(--dark);line-height:1.3;margin-bottom:.5rem;">${item.title}</div>
        <div class="product-price" style="margin-bottom:.75rem;">
          <span class="price-current" style="font-size:1.2rem;font-weight:700;color:var(--rose);">Woollen Collection</span>
        </div>
        <button class="btn-primary btn-sm" style="width:100%;padding:10px;border-radius:8px;border:none;background:linear-gradient(135deg,#c9748f,#9b4065);color:#fff;font-weight:600;cursor:pointer;">View Woollen</button>
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
  const shortCopy = (key, fallback, blocked = []) => {
    const value = String(cms[key] || '').trim();
    return value && !blocked.includes(value) ? value : fallback;
  };
  const isOn = (k) => {
    if (k === 'showOfferBanner') return false;
    return cms[k] === true || cms[k] === 'true' || cms[k] === undefined;
  };
  const heroBadgeText = shortCopy('heroBadge', 'LENCHO WOOLLEN', ['Premium Collection 2026', '✦ PREMIUM COLLECTION 2026 ✦']);
  const heroTitleText = shortCopy('heroTitle', 'Soft Handmade Woollen', ['Luxury Redefined']);
  const heroLineText = shortCopy('heroDescription', 'Crochet accessories, gifts and decor.', ['Premium artificial jewellery for every occasion. Look expensive, spend smart.', 'Premium artificial jewellery for every occasion. Look expensive, spend smart with clear pricing and fast support.']);
  const heroButton1Text = shortCopy('heroButton1Text', 'Shop Woollen', ['Shop Now', 'Shop Now & Save', '🛍️ Shop Now & Save']);
  const heroButton2Text = shortCopy('heroButton2Text', 'View Products', ['View Collections']);

  const normalizedHeroBadgeText = ['LENCHO WOOLLEN', 'Premium Collection 2026'].includes(heroBadgeText) ? 'HANDMADE WITH CARE' : heroBadgeText;
  const normalizedHeroTitleText = ['Soft Handmade Woollen', 'Luxury Redefined'].includes(heroTitleText) ? 'Little Handmade Pieces, Made to Make You Smile' : heroTitleText;
  const normalizedHeroLineText = ['Crochet accessories, gifts and decor.'].includes(heroLineText) ? 'Discover crochet keychains, bouquets and thoughtful handmade gifts crafted with care.' : heroLineText;
  const normalizedHeroButton1Text = ['Shop Woollen', 'Shop Now', 'Shop Now & Save'].includes(heroButton1Text) ? 'Shop Handmade' : heroButton1Text;
  const normalizedHeroButton2Text = ['View Products', 'View Collections'].includes(heroButton2Text) ? 'Explore Collections' : heroButton2Text;

  // Hero media
  const heroMediaType = g('heroMediaType', 'image');
  const heroImage = g('heroImage', '/images/woollen_hero.jpg');
  const heroVideo = g('heroVideoUrl', '');
  
  // Optimize hero background image - use WebP if available, add loading optimization
  const optimizedHeroImage = heroImage.includes('unsplash') || heroImage.includes('cloudinary') 
    ? heroImage + '?w=1920&q=85&auto=format' 
    : heroImage;
  
  const heroBackground = heroMediaType === 'video' && heroVideo
    ? ''
    : `background: linear-gradient(135deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.42) 100%), url('${optimizedHeroImage}') center/cover no-repeat; background-size: cover;`;

  app.innerHTML = `
  <section class="hero-premium" style="${heroBackground} justify-content: center; text-align: center; border-radius:0; position:relative;">
    ${heroMediaType === 'video' && heroVideo ? `<video autoplay muted loop playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"><source src="${heroVideo}" type="video/mp4"></video>` : ''}
    <div style="position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.32), rgba(0,0,0,0.7)); z-index:1;"></div>
    <div id="particles" class="hero-particles" aria-hidden="true"></div>
    <div class="woollen-flow-layer" aria-hidden="true">
      <span class="woollen-flow flow-top-right"></span>
      <span class="woollen-flow flow-mid-left"></span>
      <span class="woollen-flow flow-bottom-left"></span>
      <span class="woollen-yarn-flower flower-one"></span>
      <span class="woollen-yarn-flower flower-two"></span>
      <span class="woollen-flow-dot flow-dot-one"></span>
      <span class="woollen-flow-dot flow-dot-two"></span>
    </div>
    
    ${isOn('showOfferBanner') ? `<div style="position:absolute;top:0;left:0;right:0;background:linear-gradient(90deg,rgba(201,149,76,.95) 0%,rgba(242,208,122,.85) 50%,rgba(201,149,76,.95) 100%);padding:12px;z-index:3;color:var(--dark);font-weight:700;font-size:.9rem;letter-spacing:.05em;text-transform:uppercase;text-align:center;">
      ${g('offerBanner', '🎁 LIMITED OFFER: FLAT 50% OFF ON SELECTED ITEMS + FREE DELIVERY!')}
    </div>` : ''}
    
    <div class="hero-p-centered hero-compact-copy reveal" style="position:relative; z-index:2; padding: 48px 5% 0; margin-top:16px; max-width:720px;">
      <div class="hero-badge">${normalizedHeroBadgeText}</div>
      <h1 class="hero-p-title">${normalizedHeroTitleText}</h1>
      <p class="hero-p-sub">${normalizedHeroLineText}</p>
      
      <div class="hero-btns">
        <button class="btn-gold hero-compact-btn" onclick="navigate('/woollen/products')"><i class="fas fa-mitten"></i> ${normalizedHeroButton1Text}</button>
        <button class="btn-outline hero-compact-btn" onclick="navigate('/woollen')"><i class="fas fa-layer-group"></i> ${normalizedHeroButton2Text}</button>
      </div>
    </div>
  </section>

  ${isOn('showTrustHub') ? `<!-- TRUST HUB -->
  <div class="trust-hub home-trust-strip">
    <div class="trust-item"><i class="fas fa-hands-holding-circle"></i> <span><strong>Handmade</strong> Products</span></div>
    <div class="trust-item"><i class="fas fa-box-open"></i> <span><strong>Carefully</strong> Packed</span></div>
    <div class="trust-item"><i class="fas fa-headset"></i> <span><strong>Direct</strong> Support</span></div>
    <div class="trust-item"><i class="fas fa-message"></i> <span><strong>Easy</strong> Enquiry</span></div>
  </div>` : ''}

  <section class="home-woollen-entry home-woollen-premium" aria-labelledby="home-woollen-title">
    <div class="woollen-flow-layer subtle" aria-hidden="true">
      <span class="woollen-flow flow-top-right"></span>
      <span class="woollen-flow flow-bottom-left"></span>
      <span class="woollen-yarn-flower flower-one"></span>
    </div>
    <div class="home-woollen-copy reveal-left">
      <div class="section-eyebrow">Handmade Woollen Store</div>
      <h2 class="section-title" id="home-woollen-title">Soft Woollen Pieces</h2>
      <p>Crochet clips, scrunchies, baby gifts and decor in calm seasonal colours.</p>
      <div class="home-woollen-actions">
        <button class="btn-primary" onclick="navigate('/woollen/products')">Explore Woollen <i class="fas fa-arrow-right"></i></button>
      </div>
    </div>
    <div class="home-woollen-media reveal-right" aria-label="Handmade woollen collection preview">
      <img src="/images/woollen_hero.jpg" alt="Handmade woollen hair accessories, crochet flowers, baby pieces and soft decor" width="569" height="569" loading="lazy" decoding="async" fetchpriority="low" onerror="this.src='/images/hero.png'"/>
    </div>
  </section>
  ${false && isOn('showPromo') ? `<section class="promo-limited-banner">
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
      <button class="btn-gold" onclick="navigate('/woollen/products')">${g('promoButtonText', 'Explore Woollen')} <i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="promo-image reveal-right" style="flex:1; max-width:400px; position:relative; z-index:2;">
      ${g('promoMediaType') === 'video' && g('promoVideoUrl') 
        ? `<video autoplay muted loop playsinline style="width:100%; border-radius:24px; box-shadow:0 30px 60px rgba(0,0,0,0.5);"><source src="${g('promoVideoUrl')}" type="video/mp4"></video>`
        : `<img src="${g('promoImage', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800')}" style="width:100%; border-radius:24px; box-shadow:0 30px 60px rgba(0,0,0,0.5); transform:rotate(2deg);" alt="Promo"/>`
      }
    </div>
  </section>` : ''}

  ${isOn('showFeaturedProducts') ? `<!-- BEST SELLERS -->
  <section class="home-bestseller-section" style="background:${g('homeFeaturedBg', 'var(--beige)')};">
    <div class="section-header reveal">
      <div class="section-eyebrow">Woollen Favourites</div>
      <h2 class="section-title">Handmade Best Sellers</h2>
      <div class="divider"></div>
    </div>
    <div class="products-grid" id="featured-grid"></div>
    <div class="home-view-more-row"><button class="btn-outline" onclick="navigate('/woollen/products?sort=best-selling')">View All Woollen <i class="fas fa-arrow-right"></i></button></div>
  </section>` : ''}


  <section class="home-new-arrivals-section">
    <div class="section-header reveal">
      <div class="section-eyebrow">Fresh Woollen Drop</div>
      <h2 class="section-title">New Handmade Pieces</h2>
      <div class="divider"></div>
      <p class="section-desc">Latest woollen products from the admin catalogue.</p>
    </div>
    <div class="products-grid" id="new-arrivals-grid">
      <div style="grid-column:1/-1;text-align:center;color:var(--gray);">Loading new arrivals...</div>
    </div>
    <div class="home-view-more-row"><button class="btn-outline" onclick="navigate('/woollen/products?sort=newest')">View New Woollen <i class="fas fa-arrow-right"></i></button></div>
  </section>
  ${isOn('showCollections') ? `<section class="categories home-collections-section" style="padding:3rem 5%;${g('homeCollectionsBg') ? `background:${g('homeCollectionsBg')};` : ''}">
    <div class="section-header reveal">
      <div class="section-eyebrow">Jewellery Corner</div>
      <h2 class="section-title">Jewellery Collections</h2>
      <div class="divider"></div>
    </div>
    <div class="categories-grid" id="home-categories-grid">
      <div style="grid-column:1/-1;text-align:center;color:var(--gray);">Loading jewellery collections...</div>
    </div>
    <div class="home-view-more-row"><button class="btn-outline" onclick="navigate('/jewellery')">View Jewellery <i class="fas fa-arrow-right"></i></button></div>
  </section>` : ''}

  <section class="categories home-woollen-collection-section">
    <div class="section-header reveal">
      <div class="section-eyebrow">Handmade Woollen</div>
      <h2 class="section-title">Woollen Collection</h2>
      <div class="divider"></div>
    </div>
    <div class="categories-grid home-woollen-collection-grid" id="home-woollen-collection-grid">
      <div style="grid-column:1/-1;text-align:center;color:var(--gray);">Loading woollen collection...</div>
    </div>
    <div class="home-view-more-row"><button class="btn-outline" onclick="navigate('/woollen')">Explore Woollen <i class="fas fa-arrow-right"></i></button></div>
  </section>
  ${isOn('showPromo') ? `<section class="home-promo-compact">
    <div class="home-promo-copy reveal-left">
      <div class="section-eyebrow">Limited Drop</div>
      <h2>${g('promoTitle', 'Exclusive Seasonal Drop')}</h2>
      <p>${g('promoDescription', 'Our most awaited collection is here. Limited quantities available.')}</p>
      <button class="btn-gold" onclick="navigate('/woollen/products')">${g('promoButtonText', 'Explore Woollen')} <i class="fas fa-arrow-right"></i></button>
    </div>
    <div class="home-promo-image reveal-right">
      <img src="${g('promoImage', '/images/showcase.png')}" alt="Promo" loading="lazy" decoding="async" onerror="this.src='/images/showcase.png'"/>
    </div>
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
  initHeroPointerMotion();
  initScrollReveal();
  
  // Load content sections in parallel (non-blocking)
  if (isOn('showCollections')) loadHomeCategories().catch(e => console.log('Cat load error:', e));
  loadHomeWoollenCollection().catch(e => console.log('Woollen collection load error:', e));
  if (isOn('showFeaturedProducts')) loadFeaturedProducts().catch(e => console.log('Product load error:', e));
  loadNewArrivals().catch(e => console.log('New arrivals load error:', e));
  if (isOn('showTestimonials')) loadTestimonials().catch(e => console.log('Testi load error:', e));
  if (isOn('showPromo')) startOfferTimer();
  
  // Show discount popup after delay (non-blocking, detached from page load)
  if (!localStorage.getItem('lenchoDiscountPopupSeen') && !sessionStorage.getItem('popupShown')) {
    setTimeout(() => {
      showDiscountPopup();
    }, 15000);
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
      const parentSection = container.closest('.testimonials');
      if (parentSection) {
        const eyebrow = parentSection.querySelector('.section-eyebrow');
        const title = parentSection.querySelector('.section-title');
        if (eyebrow) eyebrow.textContent = 'Handmade Promise';
        if (title) title.textContent = 'Why Customers Choose Handmade';
      }
      container.innerHTML = `
        <div class="handmade-promise-grid">
          <div class="promise-card reveal"><i class="fas fa-gift"></i><h3>Gift-ready feel</h3><p>Small handmade pieces made for thoughtful gifting.</p></div>
          <div class="promise-card reveal"><i class="fas fa-hand-holding-heart"></i><h3>Made with care</h3><p>Woollen products are handled, packed and listed carefully.</p></div>
          <div class="promise-card reveal"><i class="fas fa-comments"></i><h3>Direct support</h3><p>Questions about colours, gifting or availability can be asked directly.</p></div>
        </div>`;
      initScrollReveal();
      return;
    }
    const testiHTML = t.map(testi => `
      <div class="testi-card reveal">
        <div class="testi-stars">${'★'.repeat(testi.rating || 5)}</div>
        <p class="testi-text">"${testi.comment}"</p>
        <div class="testi-author">
          <div class="testi-avatar">${testi.name[0]}</div>
          <div><div class="testi-name">${testi.name}</div><div class="testi-loc">${testi.city || ''}</div></div>
        </div>
      </div>`).join('');
    container.innerHTML = `<div class="testi-marquee-container"><div class="testi-marquee-inner">${testiHTML}${testiHTML}${testiHTML}</div></div>`;
    initScrollReveal();
  } catch (e) { container.innerHTML = '<div class="empty-state"><h3>Reviews could not load</h3><p>Please refresh this section later.</p></div>'; }
}

async function loadHomeCategories() {
  const container = document.getElementById('home-categories-grid');
  if (!container) return;
  try {
    const [cats, products] = await Promise.all([
      withTimeout(api('/api/categories'), 2500),
      withTimeout(api('/api/products?storeType=main'), 2500)
    ]);
    const rawCategories = Array.isArray(cats)
      ? cats.filter(c => (c?.storeType || 'main') === 'main')
      : [];
    const categories = categoriesWithProducts(rawCategories, products, 'main');

    if (categories.length === 0) {
      renderFallbackCollectionCards(container);
      return;
    }
    renderHomeCollectionCards(container, shuffleArray(categories), { fillFallback: false });
  } catch (e) {
    const products = await withTimeout(api('/api/products?storeType=main'), 2500);
    const categories = categoriesWithProducts([], products, 'main');
    if (categories.length > 0) {
      renderHomeCollectionCards(container, shuffleArray(categories), { fillFallback: false });
      return;
    }
    renderFallbackCollectionCards(container);
  }
}

/* Home woollen collection */
async function loadHomeWoollenCollection() {
  const container = document.getElementById('home-woollen-collection-grid');
  if (!container) return;
  const fallback = [
    { name: 'Crochet Accessories', slug: 'accessories', image: '/images/woollen_hero.jpg', description: 'Hair clips, bows, and everyday woollen pieces' },
    { name: 'Baby Gifts', slug: 'baby-gifts', image: '/images/woollen_hero.jpg', description: 'Soft handmade gifts and baby pieces' },
    { name: 'Scrunchies', slug: 'scrunchies', image: '/images/woollen_pattern_bg.jpg', description: 'Soft yarn scrunchies in seasonal colours' }
  ].map(normalizeHomeCollectionCard);

  const renderCards = (cards, realSlugs = new Set()) => {
    const finalCards = (cards && cards.length ? cards : fallback).slice(0, 3);
    container.innerHTML = finalCards.map((card, i) => {
      const target = realSlugs.has(card.slug) ? `/woollen/category/${card.slug}` : '/woollen';
      return `
        <div class="cat-card reveal woollen-home-card" style="animation-delay:${i * 0.05}s" onclick="navigate('${target}')">
          <img class="cat-img" src="${safeImageUrl(card.image, card.slug, '/images/woollen_hero.jpg')}" alt="${card.name}" loading="lazy" decoding="async" onerror="this.src='/images/woollen_hero.jpg'"/>
          <div class="cat-overlay"></div>
          <div class="cat-content"><div class="cat-name">${card.name}</div><button class="cat-btn">Explore Woollen</button></div>
        </div>
      `;
    }).join('');
    initScrollReveal();
  };

  try {
    const [cats, products] = await Promise.all([
      withTimeout(api('/api/categories?storeType=woollen'), 2500),
      withTimeout(api('/api/products?storeType=woollen&sort=featured'), 2500)
    ]);
    const realCards = categoriesWithProducts(Array.isArray(cats) ? cats : [], products, 'woollen');
    const realSlugs = new Set(realCards.map(card => card.slug));
    const seen = new Set(realSlugs);
    const merged = [...realCards, ...fallback.filter(card => !seen.has(card.slug))].slice(0, 3);
    renderCards(merged, realSlugs);
  } catch (e) {
    renderCards(fallback, new Set());
  }
}

/* TRACK ORDER PAGE */
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
async function loadContactCaptcha() {
  const question = document.getElementById('contact-captcha-q');
  const answer = document.getElementById('contact-captcha');
  if (question) question.textContent = 'Loading...';
  if (answer) answer.value = '';
  try {
    const resp = await api('/api/captcha');
    if (question) question.textContent = resp.question || 'Security code unavailable';
  } catch (e) {
    if (question) question.textContent = 'Security code unavailable';
  }
}

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
        <div class="form-group"><label>Phone Number (Optional)</label><input id="contact-phone" type="tel" placeholder="+91 00000 00000"/></div>
        <div class="form-group"><label>Your Message</label><textarea id="contact-message" rows="4" placeholder="How can we help?"></textarea></div>
        <div class="form-group">
          <label>Security Code</label>
          <div class="captcha-box" id="contact-captcha-q">Loading...</div>
          <input id="contact-captcha" placeholder="Enter code above" autocomplete="off"/>
        </div>
        <div id="contact-thankyou" class="contact-thankyou" style="display:none;">
          <div class="contact-thankyou-icon"><i class="fas fa-face-smile"></i></div>
          <div>
            <strong>Thank you!</strong>
            <span>Your message is saved. Lencho team will reply soon.</span>
            <small id="contact-reference"></small>
          </div>
        </div>
        <button id="contact-submit-btn" class="btn-primary full-width" onclick="submitContact()"><i class="fas fa-paper-plane"></i> Send Message</button>
      </div>
    </div>
  </div>`;
  initScrollReveal();
  loadContactCaptcha();
}

async function submitContact() {
  const n = document.getElementById('contact-name').value.trim();
  const e = document.getElementById('contact-email').value.trim().toLowerCase();
  const p = document.getElementById('contact-phone')?.value.trim() || '';
  const m = document.getElementById('contact-message').value.trim();
  const c = document.getElementById('contact-captcha')?.value.trim() || '';
  const btn = document.getElementById('contact-submit-btn');
  const thanks = document.getElementById('contact-thankyou');
  if (thanks) thanks.style.display = 'none';
  if(!n || !e || !m) { toast('Please fill name, email and message', 'error'); return; }
  if(!c) { toast('Please enter the security code', 'error'); return; }
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...'; }
  try {
    const resp = await api('/api/contact', { method: 'POST', body: { name:n, email:e, phone:p, message:m, captchaAnswer:c }, timeoutMs: 10000 });
    if(resp.success) {
      toast('Thank you! We received your message.', 'success');
      if (thanks) {
        const ref = document.getElementById('contact-reference');
        if (ref) ref.textContent = resp.inquiryId ? `Reference: ${String(resp.inquiryId).slice(-8).toUpperCase()}` : '';
        thanks.style.display = 'flex';
      }
      ['contact-name','contact-email','contact-phone','contact-message','contact-captcha'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      await loadContactCaptcha();
    } else {
      toast(resp.error || 'Something went wrong', 'error');
      await loadContactCaptcha();
    }
  } catch (error) {
    toast('Unable to send message right now. Please try again.', 'error');
    await loadContactCaptcha();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message'; }
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
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  container.innerHTML = '';
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
    const fallback = await withTimeout(api('/api/products?storeType=woollen'), 2500);
    if (Array.isArray(fallback) && fallback.length > 0) {
      grid.innerHTML = shuffleArray(fallback).slice(0, 3).map(productCardHTML).join('');
      initScrollReveal();
      return;
    }
    renderFallbackFeaturedCards(grid);
  };

  try {
    const r = await withTimeout(api('/api/products?storeType=woollen&popular=true&sort=best-selling'), 2500);
    if (r && Array.isArray(r) && r.length > 0) {
      grid.innerHTML = shuffleArray(r).slice(0, 3).map(productCardHTML).join('');
      initScrollReveal();
    } else if (Array.isArray(r) && r.length === 0) {
      const ranked = await withTimeout(api('/api/products?storeType=woollen&sort=best-selling'), 2500);
      if (Array.isArray(ranked) && ranked.length > 0) {
        grid.innerHTML = ranked.slice(0, 3).map(productCardHTML).join('');
        initScrollReveal();
      } else {
        await renderFallbackProducts('');
      }
    } else {
      console.error('Invalid response format:', r);
      await renderFallbackProducts('');
    }
  } catch (e) {
    console.error('Featured products error:', e);
    await renderFallbackProducts('');
  }
}

async function loadNewArrivals() {
  const grid = document.getElementById('new-arrivals-grid');
  if (!grid) return;
  const renderFallback = async () => {
    const fallback = await withTimeout(api('/api/products?storeType=woollen'), 2500);
    const list = Array.isArray(fallback) ? fallback.slice(0, 3) : [];
    grid.innerHTML = list.length
      ? list.map(productCardHTML).join('')
      : '<div class="empty-state"><h3>Woollen arrivals coming soon</h3><p>Add woollen products from admin to fill this section.</p></div>';
    initScrollReveal();
  };

  try {
    const r = await withTimeout(api('/api/products?storeType=woollen&sort=newest'), 2500);
    const list = Array.isArray(r) ? r.slice(0, 3) : [];
    if (list.length) {
      grid.innerHTML = list.map(productCardHTML).join('');
      initScrollReveal();
    } else {
      await renderFallback();
    }
  } catch (e) {
    console.error('New arrivals error:', e);
    await renderFallback();
  }
}
function woollenThemeStyle(collection, index = 0) {
  const themes = [
    ['#ffe4ef', '#9b4065', '#fff7fb'],
    ['#eee5ff', '#6042a6', '#fbf8ff'],
    ['#dff8ec', '#2f765b', '#f5fffa'],
    ['#fff3d6', '#9a6a1f', '#fffaf0'],
    ['#ffe6da', '#a74f39', '#fff8f5'],
    ['#dff2ff', '#2d6794', '#f4fbff'],
    ['#fff9c8', '#8a7418', '#fffdf0'],
    ['#f7dfdf', '#8f4d5a', '#fff7f8'],
    ['#eadfff', '#694aa6', '#faf7ff'],
    ['#e4f0df', '#557444', '#f8fff5']
  ];
  const palette = themes[index % themes.length];
  return `--w-bg:${palette[0]};--w-ink:${palette[1]};--w-soft:${palette[2]};`;
}

function woollenIcon(icon = 'star') {
  const map = {
    ribbon: 'fas fa-ribbon',
    flower: 'fas fa-spa',
    butterfly: 'fas fa-feather',
    yarn: 'fas fa-mitten',
    star: 'fas fa-star',
    baby: 'fas fa-baby',
    diamond: 'fas fa-gem',
    heart: 'fas fa-heart',
    gift: 'fas fa-gift',
    sparkles: 'fas fa-sparkles',
    home: 'fas fa-house',
    snowflake: 'fas fa-snowflake',
    circle: 'far fa-circle',
    scissors: 'fas fa-scissors'
  };
  return map[icon] || map.star;
}

async function renderWoollen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="woollen-store woollen-store-loading">
      <section class="woollen-hero woollen-hero-skeleton">
        <div class="woollen-hero-bg"><img src="/images/woollen_hero.jpg" alt="" aria-hidden="true" loading="eager"/></div>
        <div class="woollen-hero-overlay"></div>
        <div class="woollen-hero-content">
          <div class="hero-badge skeleton-pill"></div>
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-copy"></div>
          <div class="hero-btns"><span class="skeleton-button"></span><span class="skeleton-button"></span></div>
        </div>
      </section>
      <section class="woollen-band"><div class="products-grid"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></section>
    </div>`;
  const settings = await fetchPublicSettings({ timeoutMs: 2500 });
  const [collectionsRaw, featuredRaw, allRaw] = await Promise.all([
    api('/api/categories?storeType=woollen', { timeoutMs: 3000 }),
    api('/api/products?storeType=woollen&popular=true&sort=best-selling', { timeoutMs: 3000 }),
    api('/api/products?storeType=woollen&sort=trending', { timeoutMs: 3000 })
  ]);
  const collections = Array.isArray(collectionsRaw) ? collectionsRaw : [];
  const featuredSource = Array.isArray(featuredRaw) && featuredRaw.length ? featuredRaw : (Array.isArray(allRaw) ? allRaw : []);
  const featured = featuredSource.slice(0, 3);
  const configuredWoollenBanner = settings.woollenHeroBanner && settings.woollenHeroBanner !== '/images/premium_hero.png'
    ? (settings.woollenHeroBanner === '/images/woollen_hero.png' ? '/images/woollen_hero.jpg' : settings.woollenHeroBanner)
    : '/images/woollen_hero.jpg';
  const heroBanner = safeImageUrl(configuredWoollenBanner, '', '/images/woollen_hero.jpg');

  app.innerHTML = `
  <div class="woollen-store" style="--woollen-button:${settings.woollenButtonColor || '#6b7b59'};--woollen-hover:${settings.woollenHoverColor || '#8d9c74'};">
    <section class="woollen-hero">
      <div class="woollen-hero-bg"><img src="${heroBanner}" alt="${settings.woollenHeroTitle || 'Handmade Woollen Collection'}" loading="eager"/></div>
      <div class="woollen-hero-overlay"></div>
      <div class="woollen-flow-layer" aria-hidden="true">
        <span class="woollen-flow flow-top-right"></span>
        <span class="woollen-flow flow-mid-left"></span>
        <span class="woollen-flow flow-bottom-left"></span>
        <span class="woollen-yarn-flower flower-one"></span>
        <span class="woollen-yarn-flower flower-two"></span>
        <span class="woollen-flow-dot flow-dot-one"></span>
        <span class="woollen-flow-dot flow-dot-two"></span>
      </div>
      <div class="woollen-hero-content">
        <div class="woollen-badge-top">Lencho Woollen</div>
        <h1 class="woollen-hero-title">Handmade Woollen</h1>
        <p class="woollen-hero-sub">Soft crochet accessories, gifts and decor.</p>
        <div class="woollen-hero-btns">
          <button class="woollen-btn-primary" onclick="navigate('/woollen/products')">Shop Woollen</button>
          <button class="btn-outline" onclick="navigate('/woollen/category/${collections[0]?.slug || ''}')">Explore Collections</button>
        </div>
      </div>
    </section>

    <section class="woollen-band">
      <div class="woollen-section-head">
        <div>
          <h2>Featured Categories</h2>
          <p>${settings.woollenAbout || 'A premium handmade store for crochet accessories, baby pieces, soft decor, and thoughtful gifts.'}</p>
        </div>
        <button class="btn-outline" onclick="navigate('/woollen/products')">View All</button>
      </div>
      <div class="woollen-collections-grid">
        ${collections.slice(0, 3).map((c, i) => `
          <button class="woollen-collection-card" style="${woollenThemeStyle(c, i)};padding:0;overflow:hidden;text-align:left;" onclick="navigate('/woollen/category/${c.slug}')">
            <div style="aspect-ratio:1/1.15;overflow:hidden;background:#fff;"><img src="${safeImageUrl(c.bannerImage || c.image, c.slug, heroBanner)}" alt="${c.name}" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;"/></div>
            <div style="padding:1.1rem 1rem 1.15rem;display:flex;flex-direction:column;gap:.35rem;">
              <span class="woollen-icon" style="margin-bottom:.2rem;"><i class="${woollenIcon(c.icon)}"></i></span>
              <span class="woollen-card-name">${c.name}</span>
              <span class="woollen-card-desc">${c.description || 'Shop collection'}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </section>

    <section class="woollen-band woollen-featured-band">
      <div class="woollen-section-head">
        <div>
          <h2>Best Sellers</h2>
          <p>Popular handcrafted pieces from the separate woollen catalog.</p>
        </div>
      </div>
      <div class="products-grid">${featured.length ? featured.map(productCardHTML).join('') : '<div class="empty-state"><h3>No woollen products yet</h3><p>Add woollen products from admin.</p></div>'}</div>
    </section>
  </div>`;
  initScrollReveal();
}

async function renderJewelleryLanding() {
  const app = document.getElementById('app');
  const [collectionsRaw, featuredRaw, newestRaw] = await Promise.all([
    api('/api/categories?storeType=main', { timeoutMs: 3000 }),
    api('/api/products?storeType=main&featured=true&sort=featured', { timeoutMs: 3000 }),
    api('/api/products?storeType=main&sort=best-selling', { timeoutMs: 3000 })
  ]);
  const collections = Array.isArray(collectionsRaw) ? collectionsRaw.slice(0, 6) : [];
  const featured = Array.isArray(featuredRaw) && featuredRaw.length ? featuredRaw.slice(0, 8) : (Array.isArray(newestRaw) ? newestRaw.slice(0, 8) : []);
  app.innerHTML = `
  <div class="page-wrap" style="padding-top:0;">
    <section class="hero" style="min-height:78vh;background:linear-gradient(120deg,rgba(37,24,42,.64),rgba(37,24,42,.26)),url('/images/premium_hero.png') center/cover;display:flex;align-items:center;">
      <div class="container" style="color:#fff;padding:7rem 0 5rem;">
        <div class="section-eyebrow" style="color:#f5d3dd;">Lencho Jewellery</div>
        <h1 class="hero-title" style="max-width:680px;">Premium artificial jewellery with its own curated store.</h1>
        <p class="hero-sub" style="max-width:620px;color:rgba(255,255,255,.86);">Explore earrings, necklaces, bangles, and festive sets in a dedicated jewellery experience separate from woollen.</p>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:1.5rem;">
          <button class="btn-primary" onclick="navigate('/jewellery/products')">Shop Jewellery</button>
          <button class="btn-outline" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.3);" onclick="navigate('/woollen')">Visit Woollen Store</button>
        </div>
      </div>
    </section>
    <section class="container" style="padding:4rem 0 2.5rem;">
      <div class="section-header reveal"><h2 class="section-title">Jewellery Collections</h2><div class="divider"></div><p class="section-desc">Only jewellery categories live here.</p></div>
      <div class="category-grid">${collections.map(c => `<div class="cat-card reveal" onclick="navigate('/jewellery/category/${c.slug}')"><img class="cat-img" src="${safeImageUrl(c.image, c.slug)}" alt="${c.name}" ${imageFallbackAttr(c.slug)}/><div class="cat-name">${c.name}</div></div>`).join('')}</div>
    </section>
    <section class="container" style="padding:1rem 0 4rem;">
      <div class="section-header reveal"><h2 class="section-title">Featured Jewellery</h2><div class="divider"></div></div>
      <div class="products-grid">${featured.length ? featured.map(productCardHTML).join('') : '<div class="empty-state"><h3>No jewellery products yet</h3><p>Add products from the jewellery admin.</p></div>'}</div>
    </section>
  </div>`;
  initScrollReveal();
}

async function renderWoollenProducts(params) {
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  const stock = params.get('stock') || '';
  const flag = params.get('flag') || '';
  const app = document.getElementById('app');
  app.innerHTML = `
  <div class="page-wrap woollen-products-page">
    <div class="woollen-flow-layer page-flow" aria-hidden="true">
      <span class="woollen-flow flow-top-right"></span>
      <span class="woollen-flow flow-bottom-left"></span>
      <span class="woollen-yarn-flower flower-one"></span>
      <span class="woollen-flow-dot flow-dot-one"></span>
    </div>
    <div class="admin-header" style="align-items:flex-end;">
      <div>
        <h1 class="page-title" style="text-align:left;margin-bottom:.4rem;">All Woollen Products</h1>
        <p style="color:var(--gray);">Loading woollen products...</p>
      </div>
      <button class="btn-outline" onclick="navigate('/woollen')">Back to Woollen Store</button>
    </div>
    <div class="products-grid" style="min-height:360px;">
      <div class="skeleton-block" style="min-height:420px;border-radius:16px;"></div>
      <div class="skeleton-block" style="min-height:420px;border-radius:16px;"></div>
      <div class="skeleton-block" style="min-height:420px;border-radius:16px;"></div>
    </div>
  </div>`;
  const qs = new URLSearchParams({ storeType: 'woollen' });
  if (category) qs.set('category', category);
  if (sort) qs.set('sort', sort);
  if (stock) qs.set('stock', stock);
  if (flag) qs.set(flag, 'true');
  const [collectionsResp, products] = await Promise.all([
    api('/api/categories?storeType=woollen', { timeoutMs: 2200 }),
    api('/api/products?' + qs.toString(), { timeoutMs: 2600 })
  ]);
  const collections = Array.isArray(collectionsResp) ? collectionsResp : [];
  const list = Array.isArray(products) ? products : [];

  app.innerHTML = `
  <div class="page-wrap woollen-products-page">
    <div class="woollen-flow-layer page-flow" aria-hidden="true">
      <span class="woollen-flow flow-top-right"></span>
      <span class="woollen-flow flow-bottom-left"></span>
      <span class="woollen-yarn-flower flower-one"></span>
      <span class="woollen-flow-dot flow-dot-one"></span>
    </div>
    <div class="admin-header" style="align-items:flex-end;">
      <div>
        <h1 class="page-title" style="text-align:left;margin-bottom:.4rem;">All Woollen Products</h1>
        <p style="color:var(--gray);">Filter woollen products by collection and stock.</p>
      </div>
      <button class="btn-outline" onclick="navigate('/woollen')">Back to Woollen Store</button>
    </div>
    <div class="woollen-filterbar">
      <select onchange="navigate('/woollen/products' + buildWoollenFilterQuery({category:this.value}))">
        <option value="">All Woollen</option>
        ${(Array.isArray(collections) ? collections : []).map(c => `<option value="${c.slug}" ${category === c.slug ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select>
      <select onchange="navigate('/woollen/products' + buildWoollenFilterQuery({sort:this.value}))">
        <option value="" ${!sort ? 'selected' : ''}>Newest</option>
        <option value="oldest" ${sort === 'oldest' ? 'selected' : ''}>Oldest</option>
        <option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Price Low to High</option>
        <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Price High to Low</option>
        <option value="best-selling" ${sort === 'best-selling' ? 'selected' : ''}>Best Selling</option>
        <option value="featured" ${sort === 'featured' ? 'selected' : ''}>Featured</option>
        <option value="trending" ${sort === 'trending' ? 'selected' : ''}>Trending</option>
      </select>
      <select onchange="navigate('/woollen/products' + buildWoollenFilterQuery({stock:this.value}))">
        <option value="" ${!stock ? 'selected' : ''}>All Stock</option>
        <option value="in" ${stock === 'in' ? 'selected' : ''}>In Stock</option>
        <option value="out" ${stock === 'out' ? 'selected' : ''}>Out Of Stock</option>
      </select>
      <select onchange="navigate('/woollen/products' + buildWoollenFilterQuery({flag:this.value}))">
        <option value="" ${!flag ? 'selected' : ''}>All Tags</option>
        <option value="featured" ${flag === 'featured' ? 'selected' : ''}>Featured</option>
        <option value="popular" ${flag === 'popular' ? 'selected' : ''}>Popular</option>
        <option value="trending" ${flag === 'trending' ? 'selected' : ''}>Trending</option>
        <option value="newArrival" ${flag === 'newArrival' ? 'selected' : ''}>New Arrival</option>
        <option value="sale" ${flag === 'sale' ? 'selected' : ''}>Sale</option>
      </select>
    </div>
    <div class="products-grid">${list.length ? list.map(productCardHTML).join('') : '<div class="empty-state"><h3>No woollen products found</h3><p>Try another filter.</p></div>'}</div>
  </div>`;
  initScrollReveal();
}

function buildWoollenFilterQuery(update = {}) {
  const params = new URLSearchParams(location.search);
  Object.entries(update).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const str = params.toString();
  return str ? '?' + str : '';
}

// ── PRODUCTS PAGE ─────────────────────────────────────────
function productOptionValues(products = [], keys = []) {
  const values = new Map();
  products.forEach(product => {
    keys.forEach(key => {
      const raw = product?.[key];
      if (!raw) return;
      String(raw).split(/[;,/]/).map(item => item.trim()).filter(Boolean).forEach(item => {
        const normalized = item.toLowerCase();
        if (!values.has(normalized)) values.set(normalized, item);
      });
    });
    if (keys.includes('color') && Array.isArray(product?.variants)) {
      product.variants.forEach(variant => {
        const label = String(variant?.label || '').trim();
        if (label && !values.has(label.toLowerCase())) values.set(label.toLowerCase(), label);
      });
    }
  });
  return Array.from(values.values()).sort((a, b) => a.localeCompare(b));
}

function productFilterSelectHtml(paramName, label, selectedValue, options = [], basePath = '/products') {
  const opts = options.map(value => `<option value="${escapeHtml(value)}" ${value === selectedValue ? 'selected' : ''}>${escapeHtml(productCategoryLabel(value))}</option>`).join('');
  return `
    <div class="advanced-filter-block">
      <label>${escapeHtml(label)}</label>
      <select onchange="navigate('${basePath}' + buildProductsFilterQuery({${paramName}:this.value}))">
        <option value="">All ${escapeHtml(label)}</option>
        ${opts}
      </select>
    </div>`;
}

function filterProductsForDisplay(products = [], filters = {}) {
  const matchesText = (product, keys, selected) => {
    if (!selected) return true;
    const needle = selected.toLowerCase();
    const haystack = keys.map(key => product?.[key]).filter(Boolean).join(' ').toLowerCase();
    const variantText = Array.isArray(product?.variants) ? product.variants.map(v => v?.label || '').join(' ').toLowerCase() : '';
    return haystack.includes(needle) || variantText.includes(needle);
  };

  return products.filter(product => {
    const price = Number(product?.price) || 0;
    if (filters.price === 'under-500' && price >= 500) return false;
    if (filters.price === '500-999' && (price < 500 || price > 999)) return false;
    if (filters.price === '1000-1999' && (price < 1000 || price > 1999)) return false;
    if (filters.price === '2000-plus' && price < 2000) return false;
    if (!matchesText(product, ['baseMaterial', 'material', 'plating', 'stoneType', 'type'], filters.material)) return false;
    if (!matchesText(product, ['color'], filters.color)) return false;
    return true;
  });
}
function buildProductsFilterQuery(update = {}) {
  const params = new URLSearchParams(location.search);
  Object.entries(update).forEach(([key, value]) => {
    if (value) params.set(key, value);
    else params.delete(key);
  });
  const str = params.toString();
  return str ? '?' + str : '';
}

function productCategoryLabel(slug = '') {
  if (!slug) return 'All';
  return String(slug).replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeInlineJsString(value = '') {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getProductCategoryOptions(categoriesRaw = [], products = []) {
  const defaults = [
    ['', 'All'],
    ['earrings', 'Earrings'],
    ['necklace', 'Necklace'],
    ['toe-rings', 'Toe Rings'],
    ['rings', 'Rings'],
    ['chains', 'Chains'],
    ['payal', 'Payal'],
    ['bangles', 'Bangles'],
    ['bracelets', 'Bracelets'],
    ['maang-tikka', 'Maang Tikka'],
    ['sets', 'Bridal Sets']
  ];
  const bySlug = new Map(defaults.map(([val, label]) => [val, { val, label }]));

  if (Array.isArray(categoriesRaw)) {
    categoriesRaw.forEach(cat => {
      const val = String(cat?.slug || cat?.name || '').trim().toLowerCase().replace(/\s+/g, '-');
      if (!val || cat?.storeType === 'woollen') return;
      bySlug.set(val, { val, label: cat.name || productCategoryLabel(val) });
    });
  }

  if (Array.isArray(products)) {
    products.forEach(product => {
      const val = String(product?.category || '').trim().toLowerCase();
      if (!val) return;
      if (!bySlug.has(val)) bySlug.set(val, { val, label: productCategoryLabel(val) });
    });
  }

  return Array.from(bySlug.values());
}

async function renderProducts(params, options = {}) {
  const category = params.get('category') || '';
  const sort = params.get('sort') || '';
  const stock = params.get('stock') || '';
  const price = params.get('price') || '';
  const material = params.get('material') || '';
  const color = params.get('color') || '';
  const basePath = options.basePath || '/products';
  const app = document.getElementById('app');
  const query = new URLSearchParams();
  query.set('storeType', 'main');
  if (category) query.set('category', category);
  if (sort) query.set('sort', sort);
  if (stock) query.set('stock', stock);
  const url = '/api/products' + (query.toString() ? `?${query.toString()}` : '');

  app.innerHTML = `
  <div class="page-wrap products-page-wrap">
    <div class="products-page-layout">
      <aside class="products-sidebar">
        <h3>Categories</h3>
        <div class="category-filter-list">
          <button class="category-filter active">Loading...</button>
        </div>
        <div class="products-advanced-filters">
          <h3>Filters</h3>
          <div class="advanced-filter-block">
            <label>Price</label>
            <select onchange="navigate('${basePath}' + buildProductsFilterQuery({price:this.value}))">
              <option value="" ${!price ? 'selected' : ''}>All Prices</option>
              <option value="under-500" ${price === 'under-500' ? 'selected' : ''}>Under ₹500</option>
              <option value="500-999" ${price === '500-999' ? 'selected' : ''}>₹500 - ₹999</option>
              <option value="1000-1999" ${price === '1000-1999' ? 'selected' : ''}>₹1000 - ₹1999</option>
              <option value="2000-plus" ${price === '2000-plus' ? 'selected' : ''}>₹2000+</option>
            </select>
          </div>
          <div id="material-filter-block"></div>
          <div id="color-filter-block"></div>
          <button class="filter-clear-btn" type="button" onclick="navigate('${basePath}')">Clear Filters</button>
        </div>
      </aside>
      <section class="products-main">
        <div class="products-main-header">
          <div>
            <div class="section-eyebrow">Collections</div>
            <h1 class="page-title">${productCategoryLabel(category)}</h1>
          </div>
          <div class="products-filter-controls">
            <select onchange="navigate('${basePath}' + buildProductsFilterQuery({sort:this.value}))">
              <option value="" ${!sort ? 'selected' : ''}>Newest</option>
              <option value="price-asc" ${sort === 'price-asc' ? 'selected' : ''}>Price Low to High</option>
              <option value="price-desc" ${sort === 'price-desc' ? 'selected' : ''}>Price High to Low</option>
              <option value="oldest" ${sort === 'oldest' ? 'selected' : ''}>Oldest</option>
              <option value="best-selling" ${sort === 'best-selling' ? 'selected' : ''}>Best Selling</option>
              <option value="featured" ${sort === 'featured' ? 'selected' : ''}>Featured</option>
              <option value="trending" ${sort === 'trending' ? 'selected' : ''}>Trending</option>
              <option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top Rated</option>
            </select>
            <select onchange="navigate('${basePath}' + buildProductsFilterQuery({stock:this.value}))">
              <option value="" ${!stock ? 'selected' : ''}>All Stock</option>
              <option value="in" ${stock === 'in' ? 'selected' : ''}>In Stock</option>
              <option value="out" ${stock === 'out' ? 'selected' : ''}>Out Of Stock</option>
            </select>
          </div>
        </div>
        <div class="products-grid" id="products-grid"><div style="text-align:center;padding:3rem;color:var(--gray);">Loading...</div></div>
      </section>
    </div>
  </div>`;

  const [categoriesRaw, productsRaw] = await Promise.all([
    api('/api/categories', { timeoutMs: 2500 }),
    api(url, { timeoutMs: 3500 })
  ]);

  let products = Array.isArray(productsRaw) ? productsRaw : [];
  if (!products.length && productsRaw?.error) {
    const fallback = await api('/api/products?storeType=main', { timeoutMs: 2500 });
    products = Array.isArray(fallback)
      ? fallback.filter(p => (!category || p.category === category) && (stock !== 'in' || Number(p.stock) > 0) && (stock !== 'out' || Number(p.stock) <= 0))
      : [];
  }

  const filterSource = products.slice();
  products = filterProductsForDisplay(products, { price, material, color });

  const categories = getProductCategoryOptions(categoriesRaw, filterSource.length ? filterSource : products);
  const list = document.querySelector('.category-filter-list');
  if (list) {
    list.innerHTML = categories.map(c => `
      <button class="category-filter ${c.val === category ? 'active' : ''}" onclick="navigate('${basePath}' + buildProductsFilterQuery({category:'${escapeInlineJsString(c.val)}'}))">
        <span>${escapeHtml(c.label)}</span>
      </button>
    `).join('');
  }

  const materialBlock = document.getElementById('material-filter-block');
  if (materialBlock) {
    const materialOptions = productOptionValues(filterSource, ['baseMaterial', 'material', 'plating', 'stoneType', 'type']);
    materialBlock.innerHTML = productFilterSelectHtml('material', 'Material', material, materialOptions, basePath);
  }

  const colorBlock = document.getElementById('color-filter-block');
  if (colorBlock) {
    const colorOptions = productOptionValues(filterSource, ['color']);
    colorBlock.innerHTML = productFilterSelectHtml('color', 'Color', color, colorOptions, basePath);
  }
  const grid = document.getElementById('products-grid');
  if (grid) {
    grid.innerHTML = products.length
      ? products.map(productCardHTML).join('')
      : '<div class="empty-state"><div class="empty-icon">💎</div><h3>No products found</h3><p>Try another category, stock, price, material, or color filter.</p></div>';
  }
  initScrollReveal();
}

async function sortProducts(sort, category) {
  navigate('/products' + buildProductsFilterQuery({ sort, category }));
}

async function loadPublicSettings() {
  try {
    const s = await fetchPublicSettings({ timeoutMs: 2500 });
    const wb = document.getElementById('whatsapp-btn');
    if (wb && s.whatsappNumber) wb.href = 'https://wa.me/' + s.whatsappNumber + '?text=Hi%20Lencho%20India!';
  } catch (e) { }
}

// ── POLICY PAGES ──────────────────────────────────────────────
function formatCmsContent(content = '') {
  const escaped = escapeHtml(content || '');
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--rose-dark);font-weight:700;">$1</a>');
  return linked.replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
}

async function renderCmsPage(meta) {
  const app = document.getElementById('app');
  const title = meta?.title || 'Legal Page';
  const slug = meta?.slug || '';
  try {
    const s = await api(`/api/cms/${slug}`, { timeoutMs: 2500 });
    const content = s?.content || meta?.fallback || 'Content is not set in the admin panel yet.';
    app.innerHTML = `
    <div class="page-wrap" style="max-width:920px;margin:0 auto;">
      <h1 class="page-title">${escapeHtml(s?.title || title)}</h1>
      <div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);line-height:1.8;font-size:0.95rem;border:1px solid rgba(31,31,56,.08);">
        ${formatCmsContent(content)}
      </div>
    </div>`;
  } catch (e) {
    app.innerHTML = `<div class="page-wrap" style="max-width:920px;margin:0 auto;"><h1 class="page-title">${escapeHtml(title)}</h1><div style="background:#fff;padding:2rem;border-radius:12px;color:var(--dark);">Content coming soon...</div></div>`;
  }
}

async function renderTerms() { return renderCmsPage(LEGAL_ROUTE_META['/terms']); }
async function renderPrivacy() { return renderCmsPage(LEGAL_ROUTE_META['/privacy']); }
async function renderDisclaimer() { return renderCmsPage(LEGAL_ROUTE_META['/disclaimer']); }

// ── SOCIAL SYNC ───────────────────────────────────────────
async function syncSocialLinks() {
  const s = await fetchPublicSettings({ timeoutMs: 2500 });
  if (s.error) return;
  
  const fb = document.querySelector('.social-icon i.fa-facebook-f')?.parentElement;
  const insta = document.querySelector('.social-icon i.fa-instagram')?.parentElement;
  const tw = document.querySelector('.social-icon i.fa-twitter, .social-icon i.fa-x-twitter')?.parentElement;
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
    autoLoginWithToken().catch(e => console.warn('autoLoginWithToken error:', e));
    
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
      syncSocialLinks().catch(e => console.error('syncSocialLinks error:', e)),
      loadPublicSettings().catch(e => console.error('loadPublicSettings error:', e)),
      handleFirebaseRedirectAuth().catch(e => console.error('handleFirebaseRedirectAuth error:', e))
    ];
    
    Promise.allSettled(bgTasks)
      .then(() => updateHeader())
      .catch(() => {});

    // Warm common read-only endpoints for snappier next navigation.
    Promise.allSettled([
      api('/api/products?storeType=main'),
      api('/api/categories'),
      api('/api/testimonials')
    ]).catch(() => {});
  } catch (e) {
    console.error('Init Error:', e);
    navigate(location.pathname + location.search, false);
  }
}

function startBootstrapWhenReady() {
  if (window.__lenchoScriptsReady || document.documentElement.dataset.lenchoScriptsReady === 'true') {
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

async function loadFirebaseAuthClient() {
  const existing = getFirebaseAuthClient();
  if (existing && existing.isReady && existing.isReady()) return existing;

  if (!firebaseClientLoadPromise) {
    firebaseClientLoadPromise = (async () => {
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'firebase-app-sdk');
      await loadScriptOnce('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', 'firebase-auth-sdk');
      await loadScriptOnce('/js/firebase.js?v=1.2', 'lencho-firebase-auth-client');
      return getFirebaseAuthClient();
    })().catch((error) => {
      firebaseClientLoadPromise = null;
      throw error;
    });
  }

  return firebaseClientLoadPromise;
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
  googleAuthInFlight = true;
  console.log('[GoogleAuth] ▶ Sign-in started');
  try {
    setGoogleBtnLoading(btn, true, 'Preparing Google...');
    const firebaseClient = await loadFirebaseAuthClient();
    if (!firebaseClient || !firebaseClient.isReady || !firebaseClient.isReady()) {
      toast('Google login is temporarily unavailable. Please try again in a moment.', 'error');
      console.error('[GoogleAuth] Firebase client not ready');
      return;
    }

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
  if (localStorage.getItem('googleLoginPending') !== 'true') return;
  const firebaseClient = await loadFirebaseAuthClient();
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
    const sessionUser = await api('/api/me');
    if (sessionUser && sessionUser.user) {
      currentUser = sessionUser.user;
      saveCurrentUser(currentUser);
    }
    updateHeader();
    closeAuthModal();
    await updateCartCount();
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
    toggleSearch,
    toggleNavDropdown,
    signInWithGoogle,
    completeGoogleLogin,
    handleFirebaseAuthStateChanged,
    handlePhoneLogin
  });
} catch (e) {
  console.warn('Failed to attach global handlers:', e);
}
