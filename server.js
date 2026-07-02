
const dotenvResult = require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { generateToken } = require('./middleware/auth');
const { User, Product, Order, Cart, Wishlist, Settings, OTPLog, Testimonial, Category, Inquiry, LoginEvent } = require('./models');

function cleanEnvValue(value) {
  if (value === undefined || value === null) return '';
  const str = String(value).trim();
  if (!str) return '';
  return str.replace(/^['"]|['"]$/g, '').trim();
}

function readEnvVar(primaryKey, aliasKeys = [], fallback = '') {
  const keys = [primaryKey, ...(Array.isArray(aliasKeys) ? aliasKeys : [])];
  for (const key of keys) {
    const value = cleanEnvValue(process.env[key]);
    if (value) return value;
  }
  return cleanEnvValue(fallback);
}

function parseBooleanEnv(value, fallback = false) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const DEFAULT_SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const DEFAULT_SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
const FRONTEND_URL = readEnvVar('FRONTEND_URL', ['APP_URL', 'PUBLIC_URL'], 'https://lencho.in').replace(/\/+$/, '');
const SITE_URL = readEnvVar('SITE_URL', ['FRONTEND_URL'], FRONTEND_URL);
const JWT_SECRET_RESOLVED = readEnvVar('JWT_SECRET', [], 'your-secret-key');
const SESSION_SECRET_RESOLVED = readEnvVar('SESSION_SECRET', [], 'lencho-secret');
const MONGODB_URI = readEnvVar('MONGODB_URI', ['MONGO_URI', 'DATABASE_URL']);
const REQUIRE_MONGODB = parseBooleanEnv(readEnvVar('REQUIRE_MONGODB', [], 'false'), false);

if (!dotenvResult?.error) {
  console.log('[boot] Loaded .env file for local development');
}
console.log(`[boot] NODE_ENV=${NODE_ENV} FRONTEND_URL=${FRONTEND_URL}`);
if (isProduction && !process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is not set in production. Using fallback — this is insecure.');
}
if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('⚠️ SESSION_SECRET is not set in production. Using fallback — this is insecure.');
}
console.log('[boot] Environment validation:', {
  frontendUrl: FRONTEND_URL,
  nodeEnv: NODE_ENV,
  jwtSecretLoaded: Boolean(cleanEnvValue(process.env.JWT_SECRET)),
  sessionSecretLoaded: Boolean(cleanEnvValue(process.env.SESSION_SECRET)),
  mongodbUriLoaded: Boolean(MONGODB_URI)
});
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-5.2').trim();
const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || '').trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || '').trim();
const DEFAULT_EMAIL_FROM_NAME = 'Lencho';
const DEFAULT_OTP_SUBJECT = 'Lencho OTP Code';
const DEFAULT_OTP_BODY = `
<html>
<head>
<meta charset="UTF-8">
<title>Lencho OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
<!-- TOP HEADER WITH LOGO -->
<tr>
<td style="background:linear-gradient(135deg,#ff4d6d,#ff758c);padding:35px;text-align:center;">
<img src="https://cdn-icons-png.flaticon.com/512/1055/1055687.png" width="80" style="display:block;margin:auto;">
<h1 style="color:white;margin-top:15px;font-size:32px;font-weight:700;font-family:Arial,sans-serif;">LENCHO</h1>
<p style="color:white;font-size:16px;margin-top:5px;font-family:Arial,sans-serif;">Secure OTP Verification</p>
</td>
</tr>
<!-- BODY -->
<tr>
<td style="padding:40px 35px;text-align:center;">
<h2 style="color:#222;font-size:28px;margin-bottom:10px;font-family:Arial,sans-serif;">Hello 👋</h2>
<p style="font-size:17px;color:#555;line-height:28px;font-family:Arial,sans-serif;">Use the OTP below to verify your account securely.</p>
<!-- OTP BOX -->
<div style="margin:35px auto;background:#fff0f3;border:2px dashed #ff4d6d;border-radius:15px;padding:25px;width:260px;">
<p style="margin:0;color:#888;font-size:15px;font-family:Arial,sans-serif;">Your Verification Code</p>
<h1 style="margin:12px 0 0 0;font-size:42px;letter-spacing:10px;color:#ff4d6d;font-weight:bold;font-family:Arial,sans-serif;">{{otp}}</h1>
</div>
<p style="font-size:15px;color:#666;line-height:26px;font-family:Arial,sans-serif;">This code is valid for <b>10 minutes</b> only.<br>Please do not share this code with anyone.</p>
</td>
</tr>
<!-- FOOTER -->
<tr>
<td style="background:#fafafa;padding:25px;text-align:center;">
<p style="margin:0;color:#888;font-size:14px;font-family:Arial,sans-serif;">© 2026 Lencho. All Rights Reserved.</p>
<p style="margin-top:8px;color:#aaa;font-size:12px;font-family:Arial,sans-serif;">Made with ❤️ by Lencho Team</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;

function sanitizeFromName(name) {
  return String(name || '').replace(/["<>\r\n]/g, '').trim();
}

const EMAIL_OTP_EXPIRY_MS = 10 * 60 * 1000;
const SMTP_CONNECTION_TIMEOUT_MS = 25000;
const SMTP_SOCKET_TIMEOUT_MS = 30000;
let cachedVerifiedSmtpTransporter = null;

// ─── RATE LIMITING (in-memory) ────────────────────────────────
const otpRateLimits = new Map(); // key → { count, firstAt }
const OTP_RATE_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_PER_EMAIL = 4;
const OTP_MAX_PER_IP = 10;
const LOGIN_FAIL_LIMITS = new Map(); // email → { count, lockedUntil }
const LOGIN_FAIL_MAX = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

function checkRateLimit(key, max) {
  const now = Date.now();
  const entry = otpRateLimits.get(key);
  if (!entry || (now - entry.firstAt) > OTP_RATE_WINDOW_MS) {
    otpRateLimits.set(key, { count: 1, firstAt: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function checkLoginLock(email) {
  const entry = LOGIN_FAIL_LIMITS.get(email);
  if (!entry) return true;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) return false;
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) { LOGIN_FAIL_LIMITS.delete(email); return true; }
  return true;
}

function recordLoginFail(email) {
  const entry = LOGIN_FAIL_LIMITS.get(email) || { count: 0 };
  entry.count++;
  if (entry.count >= LOGIN_FAIL_MAX) { entry.lockedUntil = Date.now() + LOGIN_LOCK_MS; }
  LOGIN_FAIL_LIMITS.set(email, entry);
}

function clearLoginFails(email) { LOGIN_FAIL_LIMITS.delete(email); }

// Clean up rate limit maps every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpRateLimits) { if ((now - v.firstAt) > OTP_RATE_WINDOW_MS) otpRateLimits.delete(k); }
  for (const [k, v] of LOGIN_FAIL_LIMITS) { if (v.lockedUntil && now >= v.lockedUntil) LOGIN_FAIL_LIMITS.delete(k); }
}, 15 * 60 * 1000);

// ─── DISPOSABLE EMAIL BLOCKLIST ───────────────────────────────
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com',
  'sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info','guerrillamail.net',
  'trashmail.com','trashmail.net','trashmail.me','temp-mail.org','fakeinbox.com',
  'dispostable.com','maildrop.cc','mailnesia.com','tempail.com','tempr.email',
  'discard.email','discardmail.com','disposableemailaddresses.emailmiser.com',
  'drdrb.net','emailondeck.com','getnada.com','getairmail.com','harakirimail.com',
  'jetable.org','mailcatch.com','mailexpire.com','mailforspam.com','mailinater.com',
  'mailscrap.com','mohmal.com','mt2015.com','mytemp.email','nada.email',
  'spambox.us','spamcowboy.com','spamfree24.org','spamgourmet.com','tempmailaddress.com',
  'tempinbox.com','trashymail.com','trbvm.com','wegwerfmail.de','yopmail.fr',
  'yopmail.net','10minutemail.com','20minutemail.com','mintemail.com','emailfake.com',
  'crazymailing.com','armyspy.com','dayrep.com','einrot.com','fleckens.hu',
  'gustr.com','jourrapide.com','rhyta.com','superrito.com','teleworm.us',
  'mailtemp.info','tempsky.com','burnermail.io','inboxbear.com','mailsac.com',
  'mytrashmail.com','safetymail.info','trashmail.org','trash-mail.com','binkmail.com',
  'bobmail.info','chammy.info','devnullmail.com','dingbone.com','fakedemail.com',
  'filzmail.com','haltospam.com','imstations.com','inboxalias.com','koszmail.pl',
  'lhsdv.com','mailblocks.com','mailmoat.com','mailnull.com','msgos.com','nobulk.com',
  'nogmailspam.info','nomail.xl.cx','nospam.ze.tc','owlpic.com','proxymail.eu',
  'rcpt.at','rejectmail.com','safersignup.de','sogetthis.com','soodonims.com',
  'spamhereplease.com','spamhole.com','spamify.com','spamthisplease.com','thankyou2010.com',
  'trashemail.de','wh4f.org','whyspam.me','zehnminutenmail.de','guerrillamail.de'
]);

function isDisposableEmail(email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase()?.trim();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

function isValidEmailFormat(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
}
let cachedSmtpSignature = '';

function getJwtAuthPayload(req) {
  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET_RESOLVED);
  } catch {
    return null;
  }
}

function getAuthContext(req) {
  if (req.session?.userId) {
    return {
      userId: req.session.userId,
      role: req.session.role || 'user',
      source: 'session'
    };
  }

  const jwtPayload = getJwtAuthPayload(req);
  if (jwtPayload) {
    return {
      userId: jwtPayload.userId || jwtPayload.id || null,
      role: jwtPayload.role || 'user',
      source: 'jwt'
    };
  }

  return { userId: null, role: 'user', source: null };
}

function getSmtpConfigFromSettings(settings = null) {
  const resolved = settings || {};
  return {
    host: String(resolved.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(resolved.smtpPort || process.env.SMTP_PORT || 465),
    user: String(resolved.smtpUser || DEFAULT_SMTP_USER || process.env.EMAIL_USER || '').trim(),
    pass: String(resolved.smtpPass || DEFAULT_SMTP_PASS || process.env.EMAIL_PASS || '').trim(),
    storeName: sanitizeFromName(resolved.storeName || DEFAULT_EMAIL_FROM_NAME) || DEFAULT_EMAIL_FROM_NAME,
  };
}

function getSmtpSignature(config) {
  return [config.host, config.port, config.user, config.pass].join('|');
}

async function createVerifiedSmtpTransporter(config) {
  if (isPlaceholderSMTP(config.user) || isPlaceholderSMTP(config.pass)) {
    throw new Error('SMTP credentials not configured');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: Number(config.port) || 465,
    secure: Number(config.port) === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });

  await transporter.verify();
  return transporter;
}

async function getVerifiedSmtpTransporter(config = null) {
  const smtpConfig = config || getSmtpConfigFromSettings();
  const signature = getSmtpSignature(smtpConfig);

  if (cachedVerifiedSmtpTransporter && cachedSmtpSignature === signature) {
    return cachedVerifiedSmtpTransporter;
  }

  const transporter = await createVerifiedSmtpTransporter(smtpConfig);
  cachedVerifiedSmtpTransporter = transporter;
  cachedSmtpSignature = signature;
  return transporter;
}

async function sendEmailWithRetry(transporter, payload, attempts = 2) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await transporter.sendMail(payload);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || '').toLowerCase();
      const retryable = /timeout|etimedout|eai_again|network|connection|socket|temporary/i.test(message);
      if (attempt >= attempts || !retryable) break;
      cachedVerifiedSmtpTransporter = null;
    }
  }

  throw lastError || new Error('SMTP send failed');
}

async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    return null; // No token — caller should use client-provided data
  }

  let payload = null;

  // Try Google tokeninfo endpoint (works for Google OAuth access tokens)
  try {
    const response = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
      timeout: 8000
    });
    payload = response.data || {};
  } catch (_ignored) {
    // Expected for Firebase ID tokens — fall through to JWT decode
  }

  // Fallback: decode Firebase ID token (JWT) directly
  if (!payload || !payload.email) {
    try {
      const decoded = jwt.decode(idToken, { json: true });
      if (decoded && decoded.email) {
        payload = decoded;
      }
    } catch (_ignored) {
      // JWT decode failed — return null to let caller use client data
    }
  }

  if (!payload || !payload.email) {
    console.warn('[GoogleAuth] Could not extract email from ID token');
    return null;
  }

  // Accept email_verified as boolean true OR string "true"
  const emailVerified = payload.email_verified === true ||
    String(payload.email_verified || '').toLowerCase() === 'true';

  if (!emailVerified) {
    console.warn('[GoogleAuth] Email not verified for:', payload.email);
    // Don't throw — some Firebase accounts may not have this flag
  }

  return {
    email: payload.email,
    name: payload.name || payload.email?.split('@')?.[0] || 'User',
    picture: payload.picture || '',
    googleId: payload.sub || payload.user_id || '',
    emailVerified
  };
}

async function warmupSmtpTransporter() {
  try {
    await getVerifiedSmtpTransporter();
    console.log('✅ SMTP transporter verified on startup');
  } catch (error) {
    console.warn('⚠️ SMTP transporter verification failed on startup:', error.message);
  }
}

// ─── FALLBACK (JSON) ──────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  products: path.join(DATA_DIR, 'products.json'),
  orders: path.join(DATA_DIR, 'orders.json'),
  carts: path.join(DATA_DIR, 'carts.json'),
  wishlists: path.join(DATA_DIR, 'wishlists.json'),
  inquiries: path.join(DATA_DIR, 'inquiries.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
  discounts: path.join(DATA_DIR, 'discounts.json'),
  loginLogs: path.join(DATA_DIR, 'login_logs.json'),
};
const VISITOR_STATS_FILE = path.join(DATA_DIR, 'visitor_stats.json');

// ─── JSON UTILITY FUNCTIONS (used by initFallback) ────────────
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } };
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

function isPlaceholderSMTP(value) {
  if (value === undefined || value === null) return true;
  const normalized = String(value).trim().toLowerCase();
  return !normalized ||
    normalized === 'lencho' ||
    normalized === 'your-gmail@gmail.com' ||
    normalized === 'your-app-password' ||
    normalized === 'yourpassword' ||
    normalized.includes('your_') ||
    normalized.includes('your-');
}

function toFriendlySmtpError(err) {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('535') || msg.includes('badcredentials') || msg.includes('invalid login') || msg.includes('username and password not accepted')) {
    return 'Email OTP temporarily unavailable. SMTP login failed. Please update SMTP credentials in Admin > SMTP Settings.';
  }
  if (msg.includes('smtp not configured')) {
    return 'Email OTP is not configured yet. Please set SMTP User and App Password in Admin > SMTP Settings.';
  }
  return 'Unable to send OTP right now. Please try again in a minute.';
}

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_6oE5E0WwH6wX9z', 
  key_secret: process.env.RAZORPAY_SECRET || 'test_secret'
});

// ─── DEFAULT SETTINGS (used by initFallback) ─────────────────
const DEFAULT_FALLBACK_SETTINGS = {
  globalDiscount: 0,
  freeShippingMin: 999,
  shippingCharge: 49,
  deliveryDays: 3,
  shippingNote: 'Standard delivery in 3-5 days',
  whatsappNumber: '919999999999',
  gstRate: 18,
  gstin: '27XXXXX1234X1ZX',
  hsn: '7117',
  storeName: 'Lencho',
  storeEmail: 'lencho.official01@gmail.com',
  storePhone: '+91 7404217625',
  storeAddress: '197 Sarakpur, Barara, Ambala, Haryana',
  heroTitle: 'Luxury Redefined',
  heroSubtitle: 'For The Modern Woman',
  heroDescription: 'Premium artificial jewellery for every occasion. Look expensive, spend smart.',
  heroImage: '/images/hero_model.png',
  heroBadge: 'Premium Collection 2026',
  heroButton1Text: 'Shop Now',
  heroButton2Text: 'View Collections',
  heroMediaType: 'image',
  heroVideoUrl: '',
  promoTitle: 'Exclusive Seasonal Drop',
  promoSubtitle: 'Sale Ends In',
  promoDescription: 'Our most awaited collection is here. Limited quantities available.',
  promoImage: '/images/showcase.png',
  promoMediaType: 'image',
  promoVideoUrl: '',
  promoButtonText: 'Explore Collection',
  offerBanner: '🎁 LIMITED OFFER: FLAT 50% OFF ON SELECTED ITEMS + FREE DELIVERY!',
  showOfferBanner: true,
  showTrustHub: true,
  showCollections: true,
  showFeaturedProducts: true,
  showPromo: true,
  showTestimonials: true,
  saleEndDate: new Date(Date.now() + 86400000).toISOString(),
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpUser: DEFAULT_SMTP_USER,
  smtpPass: DEFAULT_SMTP_PASS,
  otpSubject: DEFAULT_OTP_SUBJECT,
  otpBody: DEFAULT_OTP_BODY,
  footerAddress: '197 Sarakpur, Barara, Ambala, Haryana',
  footerPhone: '+91 7404217625',
  footerEmail: 'lencho.official01@gmail.com',
  seoTitleDefault: 'Lencho - Premium Artificial Jewellery',
  seoDescriptionDefault: 'Shop premium artificial jewellery at Lencho. Trending earrings, necklaces, toe rings and more at great prices.',
  seoCanonicalBaseUrl: SITE_URL,
  seoOgImageUrl: '/images/premium_hero.png',
  seoTwitterImageUrl: '/images/premium_hero.png',
  socialInstagramUrl: 'https://instagram.com/lencho_official',
  socialFacebookUrl: 'https://facebook.com/lencho_official',
  socialYoutubeUrl: 'https://youtube.com/lencho_official',
  socialWhatsappUrl: '',
  schemaPhone: '+91 7404217625',
  schemaEmail: 'lencho.official01@gmail.com',
  schemaAddress: '197 Sarakpur, Barara, Ambala, Haryana',
  aiChatEnabled: true,
  aiChatWelcome: 'Namaste! Main Lencho assistant hoon. Product, offers, shipping, ya order help ke liye message bhejiye.',
  aiSystemPrompt: 'You are Lencho\'s premium jewelry shopping assistant. Recommend only products that fit the catalog context. Be concise, friendly, and practical.',
  aiHandoffWhatsappNumber: '919999999999',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || ''
};

const app = express();

// CORS Configuration for Production
const allowedOrigins = [
  'https://lencho.in',
  'https://www.lencho.in',
  'https://api.lencho.in'
];

if (!isProduction) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://localhost:30054',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:30054',
    'https://lencho.netlify.app'
  );
}

const configuredFrontendOrigin = String(FRONTEND_URL || '').replace(/\/+$/, '');
const allowedOriginSet = new Set([
  ...allowedOrigins,
  configuredFrontendOrigin
].filter(Boolean));

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOriginSet.has(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.render\.com$/i.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+--)?lencho\.netlify\.app$/i.test(origin)) return true;
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed: ${origin}`));
    }
  },
  credentials: true
}));

// ─── HEALTH CHECK (Fast Response) ─────────────────────────────
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: useDB ? 'connected' : 'fallback' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (!auth.userId) return res.json({ user: null });

    if (useDB) {
      const user = await User.findById(auth.userId).lean();
      if (!user) return res.json({ user: null });
      return res.json({
        user: {
          id: user._id?.toString?.() || user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          phone: user.phone || '',
          avatar: user.avatar || ''
        }
      });
    }

    const users = readJson(FILES.users);
  const user = users.find(entry => String(entry.id) === String(auth.userId));
    if (!user) return res.json({ user: null });
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        phone: user.phone || '',
        avatar: user.avatar || ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

let useDB = false;
// ─── MONGODB ──────────────────────────────────────────────────
async function initDB() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not configured');
    }

    await mongoose.connect(MONGODB_URI);
    // Seed initial products if none exist
    const pCount = await Product.countDocuments();
    if (pCount === 0) {
      console.log('Seeding initial products...');
      const sampleProducts = [
        { name: 'Silver Oxidized Jhumka Earrings', category: 'earrings', price: 299, mrp: 599, discount: 50, stock: 20, featured: true, images: ['/images/p1.png'], description: 'Premium Silver Oxidized Jhumkas for everyday elegance.' },
        { name: 'American Diamond Necklace Set', category: 'necklace', price: 1299, mrp: 2499, discount: 48, stock: 15, featured: true, images: ['/images/p2.png'], description: 'Stunning AD Necklace set with matching earrings.' },
        { name: 'Gold Plated Toe Rings', category: 'toe-rings', price: 199, mrp: 399, discount: 50, stock: 50, featured: true, images: ['/images/p3.png'], description: 'Elegant toe rings for traditional look.' },
        { name: 'Rose Gold Bracelet', category: 'bracelets', price: 599, mrp: 999, discount: 40, stock: 25, featured: true, images: ['/images/p4.png'], description: 'Trendy rose gold plated bracelet for modern outfits.' },
        { name: 'Traditional Kundan Payal', category: 'payal', price: 899, mrp: 1499, discount: 40, stock: 10, featured: true, images: ['/images/payal.png'], description: 'Handcrafted Kundan Payal for a regal traditional look.' },
        { name: 'Oxidized Silver Nose Pin', category: 'rings', price: 149, mrp: 299, discount: 50, stock: 100, featured: false, images: ['/images/p1.png'], description: 'Minimalist oxidized silver nose pin.' }
      ];
      await Product.deleteMany({}); // Clear old seeds if any
      await Product.insertMany(sampleProducts);
    }

    useDB = true;
    console.log('✅ MongoDB Connected → DB: lencho-db');
    await seedAdmin();
    await seedCategories();
    await seedProducts();
    await seedSettings();
    warmupSmtpTransporter().catch(() => {});
    console.log('🚀 System Bootstrapped Successfully');
  } catch (err) {
    console.log('⚠️ MongoDB Connection Error:', err.message);
    useDB = false;

    if (REQUIRE_MONGODB) {
      console.error('❌ MongoDB is required but connection failed.');
      process.exit(1);
      return;
    }

    console.warn('✅ Starting with JSON fallback storage (MongoDB unavailable). All features working normally.');
    initFallback();
  }
}
initDB();

// ─── SMS OTP (Fast2SMS – free Indian SMS) ────────────────────
async function sendSMSOTP(phone, otp) {
  // Normalize phone number
  const mobile = phone.replace(/\D/g, '').slice(-10);
  const DEV = process.env.NODE_ENV !== 'production';

  // Always log in dev (so you can test without SMS key)
  console.log(`\n📱 OTP for ${mobile}: ${otp}  ← (visible because NODE_ENV=development)\n`);

  // If Fast2SMS key is configured, send real SMS
  const key = process.env.FAST2SMS_KEY;
  if (key && key !== 'your_fast2sms_api_key_here') {
    try {
      const resp = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
        params: {
          authorization: key,
          variables_values: otp,
          route: 'otp',
          numbers: mobile,
        },
        headers: { 'cache-control': 'no-cache' },
        timeout: 8000
      });
      if (resp.data?.return === true) {
        console.log(`✅ SMS sent to ${mobile}`);
        return { sent: true, via: 'sms' };
      }
    } catch (e) {
      console.log('⚠️ SMS send failed:', e.message);
    }
  }
  // Fallback: return dev OTP so frontend can show it
  return { sent: true, via: 'dev', devOtp: DEV ? otp : undefined };
}

function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

const CATEGORY_FALLBACK_IMAGE_MAP = {
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

const PUBLIC_SETTINGS_KEYS = [
  'globalDiscount', 'freeShippingMin', 'shippingCharge', 'deliveryDays', 'shippingNote',
  'whatsappNumber', 'gstRate', 'gstin', 'hsn', 'storeName', 'storeEmail', 'storePhone', 'storeAddress',
  'heroTitle', 'heroSubtitle', 'heroDescription', 'heroImage', 'heroMediaType', 'heroVideoUrl',
  'heroBadge', 'heroButton1Text', 'heroButton2Text',
  'promoTitle', 'promoSubtitle', 'promoDescription', 'promoImage', 'promoMediaType', 'promoVideoUrl', 'promoButtonText',
  'offerBanner', 'showOfferBanner', 'showTrustHub', 'showCollections', 'showFeaturedProducts', 'showPromo', 'showTestimonials',
  'saleEndDate', 'footerPhone', 'footerEmail', 'footerAddress',
  'themeRose', 'themeRoseDark', 'themeRoseLight', 'themeGold', 'themeGoldLight', 'themeBeige', 'themeDark', 'themeRadius',
  'homeCollectionsBg', 'homeFeaturedBg', 'homeTestimonialsBg',
  'seoTitleDefault', 'seoDescriptionDefault', 'seoCanonicalBaseUrl', 'seoOgImageUrl', 'seoTwitterImageUrl',
  'socialInstagramUrl', 'socialFacebookUrl', 'socialYoutubeUrl', 'socialWhatsappUrl',
  'schemaPhone', 'schemaEmail', 'schemaAddress',
  'aiChatEnabled', 'aiChatWelcome', 'aiHandoffWhatsappNumber',
  'razorpayKeyId'
];




function settingsToObject(input) {
  if (Array.isArray(input)) {
    const normalized = {};
    for (const item of input) {
      if (item && item.key !== undefined) normalized[item.key] = item.value;
    }
    return normalized;
  }
  return input && typeof input === 'object' ? input : {};
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getCategoryFallbackImage(category) {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_FALLBACK_IMAGE_MAP[key] || CATEGORY_FALLBACK_IMAGE_MAP.default;
}

function hasLocalPublicAsset(assetPath) {
  if (!assetPath || typeof assetPath !== 'string' || !assetPath.startsWith('/')) return false;
  const filePath = path.join(__dirname, 'public', assetPath.replace(/^\//, ''));
  return fs.existsSync(filePath);
}

function normalizeMediaUrl(value, options = {}) {
  const fallbackUrl = options.fallback || getCategoryFallbackImage(options.category);
  const mediaUrl = String(value || '').trim();
  if (!mediaUrl) return fallbackUrl;
  if (mediaUrl.startsWith('/images/')) return hasLocalPublicAsset(mediaUrl) ? mediaUrl : fallbackUrl;
  if (mediaUrl.startsWith('/uploads/')) return mediaUrl;
  if (mediaUrl.startsWith('/')) return mediaUrl;
  if (isRemoteUrl(mediaUrl)) return mediaUrl;
  return fallbackUrl;
}

function normalizeMediaList(list, category) {
  const incoming = Array.isArray(list) ? list : [];
  const normalized = incoming
    .map(item => normalizeMediaUrl(item, { category }))
    .filter(Boolean);

  if (!normalized.length) normalized.push(getCategoryFallbackImage(category));
  if (normalized.length === 1) normalized.push(normalized[0]);
  return normalized.slice(0, 5);
}

function normalizeProductRecord(product) {
  if (!product) return null;
  const category = String(product.category || '').trim().toLowerCase();
  const images = normalizeMediaList(product.images || (product.image ? [product.image] : []), category);
  return {
    ...product,
    id: product._id?.toString?.() || product.id,
    category,
    subcategory: product.subcategory || '',
    price: Number(product.price) || 0,
    mrp: Number(product.mrp) || Number(product.price) || 0,
    discount: Number(product.discount) || 0,
    stock: Number(product.stock) || 0,
    rating: Number(product.rating) || 0,
    images,
    image: normalizeMediaUrl(product.image || images[0], { category })
  };
}

async function findProductById(id) {
  if (!id) return null;
  try {
    if (useDB) {
      let p = null;
      if (mongoose.Types.ObjectId.isValid(id)) {
        p = await Product.findById(id).lean();
      }
      if (!p) {
        // Fallback: Query raw MongoDB collection directly to bypass Mongoose ObjectId casting
        p = await Product.collection.findOne({ _id: id });
        if (!p && mongoose.Types.ObjectId.isValid(id)) {
          p = await Product.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
        }
      }
      return p;
    } else {
      const products = getJsonCatalogProducts();
      return products.find(p => p.id === id) || null;
    }
  } catch (err) {
    console.error(`[DB] Error finding product by ID ${id}:`, err.message);
    return null;
  }
}

async function findProductsByIds(ids) {
  if (!Array.isArray(ids) || !ids.length) return [];
  try {
    if (useDB) {
      const objectIds = [];
      const stringIds = [];
      ids.forEach(id => {
        if (mongoose.Types.ObjectId.isValid(id)) {
          objectIds.push(new mongoose.Types.ObjectId(id));
          objectIds.push(id);
        } else {
          stringIds.push(id);
        }
      });
      const query = {
        _id: { $in: [...objectIds, ...stringIds] }
      };
      const list = await Product.collection.find(query).toArray();
      return list;
    } else {
      const catalog = getJsonCatalogProducts();
      return catalog.filter(p => ids.includes(p.id));
    }
  } catch (err) {
    console.error('[DB] Error finding products by IDs:', err.message);
    return [];
  }
}

function normalizeCategoryRecord(category) {
  if (!category) return null;
  const slug = String(category.slug || category.name || '').trim().toLowerCase().replace(/\s+/g, '-');
  return {
    ...category,
    id: category._id?.toString?.() || category.id,
    slug,
    image: normalizeMediaUrl(category.image, { category: slug }),
    icon: category.icon || '',
    status: category.status || 'active',
    description: category.description || ''
  };
}

function getPublicSettingsPayload(rawSettings = {}) {
  const source = { ...DEFAULT_FALLBACK_SETTINGS, ...settingsToObject(rawSettings) };
  const payload = {};

  for (const key of PUBLIC_SETTINGS_KEYS) {
    if (source[key] !== undefined) payload[key] = source[key];
  }

  payload.heroImage = normalizeMediaUrl(source.heroImage, { fallback: '/images/premium_hero.png' });
  payload.promoImage = normalizeMediaUrl(source.promoImage, { fallback: '/images/showcase.png' });
  payload.seoOgImageUrl = normalizeMediaUrl(source.seoOgImageUrl, { fallback: '/images/premium_hero.png' });
  payload.seoTwitterImageUrl = normalizeMediaUrl(source.seoTwitterImageUrl, { fallback: '/images/premium_hero.png' });
  payload.seoCanonicalBaseUrl = String(source.seoCanonicalBaseUrl || SITE_URL).replace(/\/+$/, '');
  payload.socialWhatsappUrl = source.socialWhatsappUrl || (source.aiHandoffWhatsappNumber ? `https://wa.me/${source.aiHandoffWhatsappNumber}` : '');

  return payload;
}

function getJsonCatalogProducts() {
  return readJson(FILES.products)
    .filter(product => product && product.id && product.name)
    .map(normalizeProductRecord)
    .filter(Boolean);
}

function getJsonCategoriesFromProducts(products) {
  const seen = new Set();
  const categories = [];
  for (const product of products) {
    if (!product || !product.category || seen.has(product.category)) continue;
    seen.add(product.category);
    categories.push({
      name: product.category.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
      slug: product.category,
      image: normalizeMediaUrl(product.images?.[0], { category: product.category }),
      description: ''
    });
  }
  return categories;
}

function getFallbackSettingsObject() {
  const fileSettings = readJson(FILES.settings);
  if (Array.isArray(fileSettings)) {
    const obj = {};
    for (const entry of fileSettings) {
      if (entry && entry.key !== undefined) obj[entry.key] = entry.value;
    }
    return { ...DEFAULT_FALLBACK_SETTINGS, ...obj };
  }
  if (fileSettings && typeof fileSettings === 'object') {
    return { ...DEFAULT_FALLBACK_SETTINGS, ...fileSettings };
  }
  return { ...DEFAULT_FALLBACK_SETTINGS };
}

function saveFallbackSettingsObject(obj) {
  writeJson(FILES.settings, { ...DEFAULT_FALLBACK_SETTINGS, ...(obj || {}) });
}

function getFallbackVisitorStats() {
  const stats = readJson(VISITOR_STATS_FILE);
  if (!stats || Array.isArray(stats) || typeof stats !== 'object') {
    return { totalVisitors: 0, storeVisitors: 0 };
  }
  return { totalVisitors: Number(stats.totalVisitors) || 0, storeVisitors: Number(stats.storeVisitors) || 0 };
}

function saveFallbackVisitorStats(stats) {
  writeJson(VISITOR_STATS_FILE, { totalVisitors: Number(stats?.totalVisitors) || 0, storeVisitors: Number(stats?.storeVisitors) || 0 });
}

async function incrementWebsiteVisitorCount(req) {
  if (!req.session || req.session.hasCountedVisit) return;
  req.session.hasCountedVisit = true;

  if (useDB) {
    try {
      await Settings.findOneAndUpdate(
        { key: 'siteVisitorCount' },
        { $inc: { value: 1 }, $setOnInsert: { label: 'Website Visitor Count' } },
        { upsert: true, new: true }
      );
      return;
    } catch (e) {}
  }

  const visitorStats = getFallbackVisitorStats();
  visitorStats.totalVisitors += 1;
  saveFallbackVisitorStats(visitorStats);
}

async function incrementStoreVisitorCount(req) {
  if (!req.session || req.session.hasCountedStoreVisit) return;
  req.session.hasCountedStoreVisit = true;

  if (useDB) {
    try {
      await Settings.findOneAndUpdate(
        { key: 'storeVisitorCount' },
        { $inc: { value: 1 }, $setOnInsert: { label: 'Store Visitor Count' } },
        { upsert: true, new: true }
      );
      return;
    } catch (e) {}
  }

  const visitorStats = getFallbackVisitorStats();
  visitorStats.storeVisitors += 1;
  saveFallbackVisitorStats(visitorStats);
}

async function recordLoginActivity(payload) {
  const event = {
    email: payload.email || '',
    name: payload.name || '',
    method: payload.method || 'password',
    status: payload.status || 'success',
    role: payload.role || 'user',
    ip: payload.ip || '',
    userAgent: payload.userAgent || '',
    createdAt: new Date().toISOString()
  };

  if (useDB && LoginEvent) {
    try {
      await LoginEvent.create(event);
      return;
    } catch (e) {}
  }

  const logs = readJson(FILES.loginLogs);
  logs.unshift(event);
  writeJson(FILES.loginLogs, logs.slice(0, 500));
}

function syncFallbackAdmins() {
  const users = readJson(FILES.users);
  const fallbackAdmins = [
    {
      name: 'Admin',
      email: 'rupanshsaini17@gmail.com',
      password: 'Isha@1234@',
      phone: '7404217625'
    },
    {
      name: 'Admin',
      email: 'admin@lencho.in',
      password: 'admin123',
      phone: '9999999999'
    }
  ];

  for (const admin of fallbackAdmins) {
    const index = users.findIndex(user => user.email === admin.email);
    const nextAdmin = {
      id: index >= 0 ? users[index].id : uuidv4(),
      name: admin.name,
      email: admin.email,
      password: bcrypt.hashSync(admin.password, 10),
      role: 'admin',
      phone: admin.phone,
      isVerified: true,
      createdAt: index >= 0 ? users[index].createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (index >= 0) users[index] = { ...users[index], ...nextAdmin };
    else users.push(nextAdmin);
  }

  writeJson(FILES.users, users);
}

function initFallback() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  Object.values(FILES).forEach(f => { if (!fs.existsSync(f)) writeJson(f, []); });
  if (!fs.existsSync(VISITOR_STATS_FILE)) saveFallbackVisitorStats({ totalVisitors: 0, storeVisitors: 0 });
  syncFallbackAdmins();
  saveFallbackSettingsObject(getFallbackSettingsObject());
  const prods = readJson(FILES.products);
  if (!prods.length) seedProductsJSON();
}

// ─── SEED DATA ────────────────────────────────────────────────
async function seedCategories() {
  try {
    const cCount = await Category.countDocuments();
    if (cCount === 0) {
      console.log('Seeding categories...');
      const sampleCats = [
        { name: 'Earrings', slug: 'earrings', image: '/images/earrings.png', description: 'Elegant earrings for every occasion' },
        { name: 'Necklace', slug: 'necklace', image: '/images/necklace.png', description: 'Stunning necklace sets' },
        { name: 'Toe Rings', slug: 'toe-rings', image: '/images/toe-rings.png', description: 'Traditional and modern toe rings' },
        { name: 'Payal', slug: 'payal', image: '/images/payal.png', description: 'Beautiful anklets' },
        { name: 'Rings', slug: 'rings', image: '/images/p1.png', description: 'Premium finger rings' },
        { name: 'Bangles', slug: 'bangles', image: '/images/p4.png', description: 'Traditional bangles' }
      ];
      await Category.insertMany(sampleCats);
    }
  } catch (e) { console.error('Category Seed Error:', e.message); }
}

async function seedAdmin() {
  const email = 'rupanshsaini17@gmail.com';
  const pass = 'Isha@1234@';
  const phone = '7404217625';

  if (useDB) {
    const hashedPass = await bcrypt.hash(pass, 10);
    // Force specific user to be admin with these credentials
    await User.findOneAndUpdate(
      { email }, 
      { name: 'Admin', email, password: hashedPass, role: 'admin', phone, isVerified: true, securityQuestion: 'Birthplace', securityAnswer: 'Admin' }, 
      { upsert: true, new: true }
    );
    console.log(`✅ Admin master account synced: ${email}`);
  }
}

async function seedSettings() {
  const count = await Settings.countDocuments();
  if (!count) {
    await Settings.insertMany([
      { key: 'globalDiscount', value: 0, label: 'Global Discount %' },
      { key: 'freeShippingMin', value: 999, label: 'Free Shipping Minimum (₹)' },
      { key: 'shippingCharge', value: 49, label: 'Shipping Charge (₹)' },
      { key: 'whatsappNumber', value: process.env.WHATSAPP_NUMBER || '919999999999', label: 'WhatsApp Business Number' },
      { key: 'gstRate', value: 3, label: 'Default GST Rate %' },
      { key: 'razorpayKeyId', value: '', label: 'Razorpay Key ID' },
      { key: 'razorpaySecret', value: '', label: 'Razorpay Secret' },
      { key: 'shiprocketEmail', value: '', label: 'Shiprocket Email' },
      { key: 'shiprocketPassword', value: '', label: 'Shiprocket Password' },
      { key: 'storeName', value: 'Lencho', label: 'Store Name' },
      { key: 'storeEmail', value: 'hello@lencho.in', label: 'Store Email' },
      { key: 'storePhone', value: '+91 9876543210', label: 'Store Phone' },
      { key: 'gstin', value: '27XXXXX1234X1ZX', label: 'GSTIN Number' },
      { key: 'showTestimonials', value: true, label: 'Show Testimonials Section' },
      { key: 'saleEndDate', value: new Date(Date.now() + 86400000).toISOString(), label: 'Sale End Date (ISO)' },
      { key: 'smtpHost', value: 'smtp.gmail.com', label: 'SMTP Host' },
      { key: 'smtpPort', value: 465, label: 'SMTP Port' },
      { key: 'smtpUser', value: DEFAULT_SMTP_USER, label: 'SMTP User (Gmail)' },
      { key: 'smtpPass', value: DEFAULT_SMTP_PASS, label: 'SMTP Pass (App Password)' },
      { key: 'otpSubject', value: DEFAULT_OTP_SUBJECT, label: 'OTP Email Subject' },
      { key: 'otpBody', value: DEFAULT_OTP_BODY, label: 'OTP Email Body (HTML)' },
      // ── CMS SETTINGS ──
      { key: 'heroTitle', value: 'Luxury Redefined', label: 'Hero Title' },
      { key: 'heroSubtitle', value: 'For The Modern Woman', label: 'Hero Subtitle' },
      { key: 'heroDescription', value: 'Premium artificial jewellery for every occasion. Look expensive, spend smart. 4.8⭐ trusted by 50K+ customers.', label: 'Hero Description' },
      { key: 'heroImage', value: '/images/hero_model.png', label: 'Hero Background Image URL' },
      { key: 'heroBadge', value: '✦ PREMIUM COLLECTION 2026 ✦', label: 'Hero Badge Text' },
      { key: 'heroButton1Text', value: '🛍️ Shop Now & Save', label: 'Hero Button 1' },
      { key: 'heroButton2Text', value: 'View Collections', label: 'Hero Button 2' },
      { key: 'heroMediaType', value: 'image', label: 'Hero Media Type (image/video)' },
      { key: 'heroVideoUrl', value: '', label: 'Hero Video URL' },
      { key: 'offerBanner', value: '🎁 LIMITED OFFER: FLAT 50% OFF ON SELECTED ITEMS + FREE DELIVERY!', label: 'Offer Banner Text' },
      { key: 'promoTitle', value: 'Exclusive Seasonal Drop', label: 'Promo Title' },
      { key: 'promoSubtitle', value: 'Sale Ends In', label: 'Promo Subtitle' },
      { key: 'promoDescription', value: 'Our most awaited collection is here. Limited quantities available. Grab yours before the clock strikes zero.', label: 'Promo Description' },
      { key: 'promoImage', value: '/images/showcase.png', label: 'Promo Image URL' },
      { key: 'promoButtonText', value: 'Explore Collection', label: 'Promo Button Text' },
      { key: 'promoMediaType', value: 'image', label: 'Promo Media Type (image/video)' },
      { key: 'promoVideoUrl', value: '', label: 'Promo Video URL' },
      { key: 'showCollections', value: true, label: 'Show Collections Section' },
      { key: 'showFeaturedProducts', value: true, label: 'Show Featured Products' },
      { key: 'showPromo', value: true, label: 'Show Promo/Timer Section' },
      { key: 'showTrustHub', value: true, label: 'Show Trust Hub Strip' },
      { key: 'showOfferBanner', value: true, label: 'Show Offer Banner' },
      { key: 'footerAddress', value: '197 Sarakpur, Barara, Ambala, Haryana', label: 'Footer Address' },
      { key: 'footerPhone', value: '+91 7404217625', label: 'Footer Phone' },
      { key: 'footerEmail', value: 'lencho.official01@gmail.com', label: 'Footer Email' },
      { key: 'seoTitleDefault', value: DEFAULT_FALLBACK_SETTINGS.seoTitleDefault, label: 'Default SEO Title' },
      { key: 'seoDescriptionDefault', value: DEFAULT_FALLBACK_SETTINGS.seoDescriptionDefault, label: 'Default SEO Description' },
      { key: 'seoCanonicalBaseUrl', value: DEFAULT_FALLBACK_SETTINGS.seoCanonicalBaseUrl, label: 'Canonical Base URL' },
      { key: 'seoOgImageUrl', value: DEFAULT_FALLBACK_SETTINGS.seoOgImageUrl, label: 'Open Graph Image URL' },
      { key: 'seoTwitterImageUrl', value: DEFAULT_FALLBACK_SETTINGS.seoTwitterImageUrl, label: 'Twitter Image URL' },
      { key: 'socialInstagramUrl', value: DEFAULT_FALLBACK_SETTINGS.socialInstagramUrl, label: 'Instagram URL' },
      { key: 'socialFacebookUrl', value: DEFAULT_FALLBACK_SETTINGS.socialFacebookUrl, label: 'Facebook URL' },
      { key: 'socialYoutubeUrl', value: DEFAULT_FALLBACK_SETTINGS.socialYoutubeUrl, label: 'YouTube URL' },
      { key: 'socialWhatsappUrl', value: DEFAULT_FALLBACK_SETTINGS.socialWhatsappUrl, label: 'WhatsApp URL' },
      { key: 'schemaPhone', value: DEFAULT_FALLBACK_SETTINGS.schemaPhone, label: 'Schema Phone' },
      { key: 'schemaEmail', value: DEFAULT_FALLBACK_SETTINGS.schemaEmail, label: 'Schema Email' },
      { key: 'schemaAddress', value: DEFAULT_FALLBACK_SETTINGS.schemaAddress, label: 'Schema Address' },
      { key: 'aiChatEnabled', value: DEFAULT_FALLBACK_SETTINGS.aiChatEnabled, label: 'AI Chat Enabled' },
      { key: 'aiChatWelcome', value: DEFAULT_FALLBACK_SETTINGS.aiChatWelcome, label: 'AI Chat Welcome Text' },
      { key: 'aiSystemPrompt', value: DEFAULT_FALLBACK_SETTINGS.aiSystemPrompt, label: 'AI System Prompt' },
      { key: 'aiHandoffWhatsappNumber', value: DEFAULT_FALLBACK_SETTINGS.aiHandoffWhatsappNumber, label: 'AI Handoff WhatsApp Number' },
    ]);
    console.log('✅ Default settings seeded');
  } else {
    // Add missing CMS keys to existing DB
    const cmsDefaults = [
      { key: 'heroTitle', value: 'Luxury Redefined', label: 'Hero Title' },
      { key: 'heroSubtitle', value: 'For The Modern Woman', label: 'Hero Subtitle' },
      { key: 'heroDescription', value: 'Premium artificial jewellery for every occasion. Look expensive, spend smart. 4.8⭐ trusted by 50K+ customers.', label: 'Hero Description' },
      { key: 'heroImage', value: '/images/hero_model.png', label: 'Hero Background Image URL' },
      { key: 'heroBadge', value: '✦ PREMIUM COLLECTION 2026 ✦', label: 'Hero Badge Text' },
      { key: 'heroButton1Text', value: '🛍️ Shop Now & Save', label: 'Hero Button 1' },
      { key: 'heroButton2Text', value: 'View Collections', label: 'Hero Button 2' },
      { key: 'heroMediaType', value: 'image', label: 'Hero Media Type (image/video)' },
      { key: 'heroVideoUrl', value: '', label: 'Hero Video URL' },
      { key: 'offerBanner', value: '🎁 LIMITED OFFER: FLAT 50% OFF ON SELECTED ITEMS + FREE DELIVERY!', label: 'Offer Banner Text' },
      { key: 'promoTitle', value: 'Exclusive Seasonal Drop', label: 'Promo Title' },
      { key: 'promoSubtitle', value: 'Sale Ends In', label: 'Promo Subtitle' },
      { key: 'promoDescription', value: 'Our most awaited collection is here. Limited quantities available.', label: 'Promo Description' },
      { key: 'promoImage', value: '/images/showcase.png', label: 'Promo Image URL' },
      { key: 'promoButtonText', value: 'Explore Collection', label: 'Promo Button Text' },
      { key: 'promoMediaType', value: 'image', label: 'Promo Media Type (image/video)' },
      { key: 'promoVideoUrl', value: '', label: 'Promo Video URL' },
      { key: 'showCollections', value: true, label: 'Show Collections Section' },
      { key: 'showFeaturedProducts', value: true, label: 'Show Featured Products' },
      { key: 'showPromo', value: true, label: 'Show Promo/Timer Section' },
      { key: 'showTrustHub', value: true, label: 'Show Trust Hub Strip' },
      { key: 'showOfferBanner', value: true, label: 'Show Offer Banner' },
      { key: 'footerAddress', value: '197 Sarakpur, Barara, Ambala, Haryana', label: 'Footer Address' },
      { key: 'footerPhone', value: '+91 7404217625', label: 'Footer Phone' },
      { key: 'footerEmail', value: 'lencho.official01@gmail.com', label: 'Footer Email' },
      { key: 'saleEndDate', value: new Date(Date.now() + 86400000).toISOString(), label: 'Sale End Date (ISO)' },
      { key: 'otpSubject', value: DEFAULT_OTP_SUBJECT, label: 'OTP Email Subject' },
      { key: 'otpBody', value: DEFAULT_OTP_BODY, label: 'OTP Email Body (HTML)' },
      { key: 'seoTitleDefault', value: DEFAULT_FALLBACK_SETTINGS.seoTitleDefault, label: 'Default SEO Title' },
      { key: 'seoDescriptionDefault', value: DEFAULT_FALLBACK_SETTINGS.seoDescriptionDefault, label: 'Default SEO Description' },
      { key: 'seoCanonicalBaseUrl', value: DEFAULT_FALLBACK_SETTINGS.seoCanonicalBaseUrl, label: 'Canonical Base URL' },
      { key: 'seoOgImageUrl', value: DEFAULT_FALLBACK_SETTINGS.seoOgImageUrl, label: 'Open Graph Image URL' },
      { key: 'seoTwitterImageUrl', value: DEFAULT_FALLBACK_SETTINGS.seoTwitterImageUrl, label: 'Twitter Image URL' },
      { key: 'socialInstagramUrl', value: DEFAULT_FALLBACK_SETTINGS.socialInstagramUrl, label: 'Instagram URL' },
      { key: 'socialFacebookUrl', value: DEFAULT_FALLBACK_SETTINGS.socialFacebookUrl, label: 'Facebook URL' },
      { key: 'socialYoutubeUrl', value: DEFAULT_FALLBACK_SETTINGS.socialYoutubeUrl, label: 'YouTube URL' },
      { key: 'socialWhatsappUrl', value: DEFAULT_FALLBACK_SETTINGS.socialWhatsappUrl, label: 'WhatsApp URL' },
      { key: 'schemaPhone', value: DEFAULT_FALLBACK_SETTINGS.schemaPhone, label: 'Schema Phone' },
      { key: 'schemaEmail', value: DEFAULT_FALLBACK_SETTINGS.schemaEmail, label: 'Schema Email' },
      { key: 'schemaAddress', value: DEFAULT_FALLBACK_SETTINGS.schemaAddress, label: 'Schema Address' },
      { key: 'aiChatEnabled', value: DEFAULT_FALLBACK_SETTINGS.aiChatEnabled, label: 'AI Chat Enabled' },
      { key: 'aiChatWelcome', value: DEFAULT_FALLBACK_SETTINGS.aiChatWelcome, label: 'AI Chat Welcome Text' },
      { key: 'aiSystemPrompt', value: DEFAULT_FALLBACK_SETTINGS.aiSystemPrompt, label: 'AI System Prompt' },
      { key: 'aiHandoffWhatsappNumber', value: DEFAULT_FALLBACK_SETTINGS.aiHandoffWhatsappNumber, label: 'AI Handoff WhatsApp Number' },
    ];
    for (const d of cmsDefaults) {
      await Settings.updateOne({ key: d.key }, { $setOnInsert: d }, { upsert: true });
    }
    console.log('✅ CMS settings synced');
  }
}

async function seedProducts() {
  const count = await Product.countDocuments();
  if (!count) {
    await Product.insertMany([
      { name: 'Rose Gold Hoop Earrings', category: 'earrings', price: 599, mrp: 999, discount: 40, stock: 50, description: 'Elegant rose gold hoop earrings with crystal accents. Perfect for everyday wear.', images: ['/images/p1.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.5 },
      { name: 'Golden Kundan Necklace Set', category: 'necklace', price: 1299, mrp: 2499, discount: 48, stock: 30, description: 'Stunning kundan necklace set. Gold-plated with meenakari work.', images: ['/images/p2.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.8 },
      { name: 'Silver Oxidized Toe Rings', category: 'toe-rings', price: 299, mrp: 499, discount: 40, stock: 100, description: 'Handcrafted oxidized silver toe rings with tribal motifs.', images: ['/images/p3.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.3 },
      { name: 'Boho Jhumka Earrings', category: 'earrings', price: 449, mrp: 799, discount: 44, stock: 75, description: 'Traditional jhumka with colorful beads and rose gold plating.', images: ['/images/p4.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.6 },
      { name: 'Pearl Drop Necklace', category: 'necklace', price: 899, mrp: 1599, discount: 44, stock: 40, description: 'Elegant freshwater pearl drop necklace with gold chain.', images: ['/images/p2.png'], gstRate: 3, hsn: '7117', featured: false, rating: 4.4 },
      { name: 'Crystal Stud Earrings', category: 'earrings', price: 349, mrp: 599, discount: 42, stock: 80, description: 'Sparkling crystal stud earrings in rose gold setting.', images: ['/images/p1.png'], gstRate: 3, hsn: '7117', featured: false, rating: 4.2 },
    ]);
    console.log('✅ Sample products seeded');
  }
}

function seedProductsJSON() {
  const sample = [
    { id: uuidv4(), name: 'Rose Gold Hoop Earrings', category: 'earrings', price: 599, mrp: 999, discount: 40, stock: 50, description: 'Elegant rose gold hoop earrings.', images: ['/images/p1.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.5, reviews: [], createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Golden Kundan Necklace Set', category: 'necklace', price: 1299, mrp: 2499, discount: 48, stock: 30, description: 'Stunning kundan necklace.', images: ['/images/p2.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.8, reviews: [], createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Silver Oxidized Toe Rings', category: 'toe-rings', price: 299, mrp: 499, discount: 40, stock: 100, description: 'Handcrafted oxidized silver toe rings.', images: ['/images/p3.png'], gstRate: 3, hsn: '7117', featured: true, rating: 4.3, reviews: [], createdAt: new Date().toISOString() },
  ];
  writeJson(FILES.products, sample);
}

// ─── MIDDLEWARE ────────────────────────────────────────────────
app.use(compression({ level: 6, threshold: 512 }));  // Compress aggressively
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://checkout.razorpay.com", "https://accounts.google.com", "https://accounts.google.com/gsi/client", "https://apis.google.com", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://accounts.google.com", "https://accounts.google.com/gsi/style", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://checkout.razorpay.com", "https://www.googleapis.com", "https://oauth2.googleapis.com", "https://accounts.google.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://firebaseinstallations.googleapis.com", "https://apis.googleapis.com", "https://lencho-b556e.firebaseapp.com"],
      frameSrc: ["https://checkout.razorpay.com", "https://accounts.google.com", "https://lencho-b556e.firebaseapp.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: ['*']
  }
}));
app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add cache headers for static assets (serve legacy public folder)
app.use(express.static(path.join(__dirname, 'public'), { 
  maxAge: '7d', 
  etag: false,
  index: false
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '30d' }));

// Cache API responses for 5 minutes where possible
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/admin/')) {
    res.set('Cache-Control', 'public, max-age=300');  // 5 minute cache
  }
  next();
});
app.set('trust proxy', 1);
app.disable('x-powered-by');  // Hide express version

app.use(session({
  secret: SESSION_SECRET_RESOLVED,
  resave: false, saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction
  }
}));

function saveSessionAsync(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const auth = getAuthContext(req);
  if (!auth.userId) return res.status(401).json({ error: 'Please login first' });
  req.auth = auth;
  next();
};
const requireAdmin = (req, res, next) => {
  const auth = getAuthContext(req);
  if (!auth.userId || auth.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  req.auth = auth;
  next();
};

// ─── SECURITY HELPERS ─────────────────────────────────────────
function generateCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let challenge = '';
  for (let i = 0; i < 5; i++) challenge += chars[Math.floor(Math.random() * chars.length)];
  return { q: `Type this code: ${challenge}`, a: challenge };
}

// ─── HELPER: get setting ──────────────────────────────────────
async function getSetting(key, fallback) {
  if (!useDB) {
    const fallbackSettings = getFallbackSettingsObject();
    return fallbackSettings[key] !== undefined ? fallbackSettings[key] : fallback;
  }
  const s = await Settings.findOne({ key });
  return s ? s.value : fallback;
}

async function getMeaningfulSetting(key, fallback) {
  const val = await getSetting(key, fallback);
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'string' && !val.trim()) return fallback;
  if (isPlaceholderSMTP(val)) return fallback;
  return val;
}

async function getAllSettingsObject() {
  if (!useDB) return getFallbackSettingsObject();
  const rows = await Settings.find({}).lean();
  return { ...DEFAULT_FALLBACK_SETTINGS, ...settingsToObject(rows) };
}

async function getPublicSettingsObject() {
  return getPublicSettingsPayload(await getAllSettingsObject());
}

function extractSettingsUpdates(payload) {
  if (Array.isArray(payload?.settings)) {
    return payload.settings.filter(item => item && item.key);
  }
  if (payload && typeof payload === 'object' && payload.key) {
    return [{ key: payload.key, value: payload.value }];
  }
  if (payload && typeof payload === 'object') {
    return Object.keys(payload).map(key => ({ key, value: payload[key] }));
  }
  return [];
}

function sanitizeUploadFolder(folder) {
  const normalized = String(folder || 'general').trim().toLowerCase().replace(/[^a-z0-9/_-]+/g, '-');
  return normalized || 'general';
}

function hasCloudinaryConfig() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
}

function ensureUploadDirectory(folder) {
  const dirPath = path.join(__dirname, 'uploads', folder);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

async function saveLocalMediaFile(file, folder) {
  const ext = path.extname(file.originalname || '') || (file.mimetype && file.mimetype.includes('video') ? '.mp4' : '.bin');
  const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const dirPath = ensureUploadDirectory(folder);
  const filePath = path.join(dirPath, safeName);
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${folder}/${safeName}`.replace(/\\/g, '/');
}

async function uploadToCloudinary(file, folder) {
  const timestamp = Math.floor(Date.now() / 1000);
  const uploadFolder = sanitizeUploadFolder(folder);
  const signatureBase = `folder=${uploadFolder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const payload = new URLSearchParams({
    file: dataUri,
    api_key: CLOUDINARY_API_KEY,
    timestamp: String(timestamp),
    folder: uploadFolder,
    signature
  });

  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    payload.toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    }
  );

  const secureUrl = response.data?.secure_url || response.data?.url;
  if (!secureUrl) throw new Error('Cloudinary upload did not return a URL');
  return secureUrl;
}

async function uploadMediaFiles(files, folder) {
  const list = Array.isArray(files) ? files.filter(Boolean) : [];
  if (!list.length) return [];

  if (hasCloudinaryConfig()) {
    return Promise.all(list.map(file => uploadToCloudinary(file, folder)));
  }

  if (isProduction) {
    throw new Error('Cloudinary is required for media uploads in production');
  }

  return Promise.all(list.map(file => saveLocalMediaFile(file, sanitizeUploadFolder(folder))));
}

async function uploadSingleMedia(file, folder) {
  const results = await uploadMediaFiles(file ? [file] : [], folder);
  return results[0] || '';
}

async function sendConfiguredEmailOTP(targetEmail, otp, type = 'admin_login') {
  console.log(`[OTP] ──── SENDING OTP ────`);
  console.log(`[OTP] Target: ${targetEmail} | Type: ${type} | OTP: ${otp}`);
  try {
    console.log(`[OTP] Step 1: Loading SMTP config...`);
    const smtpConfig = getSmtpConfigFromSettings({
      smtpHost: await getMeaningfulSetting('smtpHost', 'smtp.gmail.com'),
      smtpPort: await getMeaningfulSetting('smtpPort', 465),
      smtpUser: await getMeaningfulSetting('smtpUser', DEFAULT_SMTP_USER),
      smtpPass: await getMeaningfulSetting('smtpPass', DEFAULT_SMTP_PASS),
      storeName: await getMeaningfulSetting('storeName', DEFAULT_EMAIL_FROM_NAME),
    });
    console.log(`[OTP] Step 2: SMTP Config loaded — Host: ${smtpConfig.host}:${smtpConfig.port} | User: ${smtpConfig.user ? smtpConfig.user.substring(0,5) + '***' : 'EMPTY'} | Pass: ${smtpConfig.pass ? '***SET***' : 'EMPTY'}`);

    if (!smtpConfig.user || !smtpConfig.pass) {
      console.error(`[OTP] FATAL: SMTP credentials missing! User=${smtpConfig.user || 'EMPTY'} Pass=${smtpConfig.pass ? 'SET' : 'EMPTY'}`);
      throw new Error('SMTP credentials not configured');
    }

    console.log(`[OTP] Step 3: Creating verified SMTP transporter...`);
    const transporter = await getVerifiedSmtpTransporter(smtpConfig);
    console.log(`[OTP] Step 4: Transporter verified. Sending email...`);

    const result = await sendEmailWithRetry(transporter, {
      from: `"${smtpConfig.storeName}" <${smtpConfig.user}>`,
      to: targetEmail,
      subject: DEFAULT_OTP_SUBJECT.replace('{{otp}}', otp),
      html: DEFAULT_OTP_BODY.replace('{{otp}}', otp)
    });

    console.log(`[OTP] ✅ SUCCESS — Email OTP sent to ${targetEmail} | MessageID: ${result.messageId}`);
    return { sent: true, via: 'email', messageId: result.messageId };
  } catch (err) {
    console.error(`[OTP] ❌ FAILED — ${err?.message || err}`);
    console.error(`[OTP] Error Code: ${err?.code || 'N/A'} | Response: ${err?.response || 'N/A'}`);
    throw err;
  }
}

async function sendSMSOTP(phone, otp) {
  // Normalize phone number
  const mobile = phone.replace(/\D/g, '').slice(-10);
  const DEV = process.env.NODE_ENV !== 'production';

  // Always log the OTP to backend console so developers can verify
  console.log(`\n📱 SMS OTP for ${mobile}: ${otp}\n`);

  // If Fast2SMS key is configured, send real SMS
  const key = process.env.FAST2SMS_KEY;
  if (key && key !== 'your_fast2sms_api_key_here' && key.trim() !== '') {
    try {
      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
        params: {
          authorization: key,
          variables_values: otp,
          route: 'otp',
          numbers: mobile
        },
        timeout: 10000
      });

      if (response.data?.return === true) {
        console.log(`✅ SMS OTP sent to ${mobile} via Fast2SMS`);
        return { sent: true, via: 'sms' };
      } else {
        throw new Error('Fast2SMS returned error: ' + JSON.stringify(response.data));
      }
    } catch (e) {
      console.log('⚠️  SMS send failed:', e.message);
    }
  }

  // Fallback: return dev OTP so frontend can show it
  return { sent: true, via: 'dev', devOtp: otp };
}

async function getDeliveryManagerConfig() {
  const defaults = {
    enabled: false,
    provider: 'custom',
    apiBaseUrl: '',
    apiKey: '',
    webhookUrl: '',
    trackingUrlTemplate: '',
    notes: ''
  };

  if (!useDB) {
    const fallbackSettings = getFallbackSettingsObject();
    const stored = fallbackSettings.deliveryManagerConfig;
    return { ...defaults, ...(stored && typeof stored === 'object' ? stored : {}) };
  }

  const row = await Settings.findOne({ key: 'deliveryManagerConfig' });
  const stored = row && row.value && typeof row.value === 'object' ? row.value : {};
  return { ...defaults, ...stored };
}

async function saveDeliveryManagerConfig(nextConfig) {
  if (!useDB) {
    const fallbackSettings = getFallbackSettingsObject();
    fallbackSettings.deliveryManagerConfig = nextConfig;
    saveFallbackSettingsObject(fallbackSettings);
    return nextConfig;
  }

  await Settings.findOneAndUpdate(
    { key: 'deliveryManagerConfig' },
    { value: nextConfig, label: 'Delivery Manager Config' },
    { upsert: true }
  );
  return nextConfig;
}

// ─── SETTINGS API ─────────────────────────────────────────────
async function getCatalogProducts() {
  if (useDB) {
    const products = await Product.find({}).lean();
    return products.map(normalizeProductRecord).filter(Boolean);
  }
  return getJsonCatalogProducts();
}

function scoreHomeRecommendation(product) {
  const stockScore = Math.min(Number(product.stock) || 0, 25);
  const ratingScore = (Number(product.rating) || 0) * 8;
  const featuredScore = product.featured ? 25 : 0;
  const discountScore = Number(product.discount) || 0;
  return featuredScore + ratingScore + discountScore + stockScore;
}

function scoreProductRecommendation(candidate, target) {
  const sameCategory = candidate.category === target.category ? 35 : 0;
  const priceGap = Math.abs((Number(candidate.price) || 0) - (Number(target.price) || 0));
  const priceScore = Math.max(0, 30 - Math.min(30, Math.round(priceGap / 50)));
  const stockScore = Math.min(Number(candidate.stock) || 0, 20);
  const ratingScore = (Number(candidate.rating) || 0) * 7;
  const featuredScore = candidate.featured ? 15 : 0;
  return sameCategory + priceScore + stockScore + ratingScore + featuredScore;
}

async function buildRecommendations(options = {}) {
  const placement = options.placement === 'product' ? 'product' : 'home';
  const products = await getCatalogProducts();
  const inStock = products.filter(product => (Number(product.stock) || 0) > 0);

  if (placement === 'home') {
    return [...inStock]
      .sort((a, b) => scoreHomeRecommendation(b) - scoreHomeRecommendation(a))
      .slice(0, 8);
  }

  const target = inStock.find(product => String(product.id) === String(options.productId || ''));
  const requestedCategory = String(options.category || target?.category || '').trim().toLowerCase();

  return [...inStock]
    .filter(product => String(product.id) !== String(options.productId || ''))
    .sort((a, b) => {
      const scoreA = target ? scoreProductRecommendation(a, target) : scoreHomeRecommendation(a) + (a.category === requestedCategory ? 20 : 0);
      const scoreB = target ? scoreProductRecommendation(b, target) : scoreHomeRecommendation(b) + (b.category === requestedCategory ? 20 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);
}

function buildCatalogSummary(products) {
  return products.slice(0, 12).map(product => {
    const stockState = Number(product.stock) > 0 ? `${product.stock} in stock` : 'out of stock';
    return `- ${product.name} | category: ${product.category} | price: Rs ${product.price} | discount: ${product.discount || 0}% | ${stockState}`;
  }).join('\n');
}

function extractOpenAIText(data) {
  if (data && typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();

  const chunks = [];
  for (const item of data?.output || []) {
    if (!item || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === 'output_text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function buildChatSuggestions() {
  return ['Products', 'Offers', 'Shipping', 'Track Order'];
}

function buildWhatsappHandoffUrl(number) {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

function buildFallbackChatReply(message, context = {}) {
  const text = String(message || '').toLowerCase();
  const handoffUrl = buildWhatsappHandoffUrl(context.aiHandoffWhatsappNumber || context.whatsappNumber);

  if (/offer|discount|coupon|sale|off\b/.test(text)) {
    return {
      reply: 'Current offers include first-order discounts and selected product markdowns. Open the products page or ask for a category to see the best sale picks.',
      suggestions: buildChatSuggestions(),
      handoff: handoffUrl ? { type: 'whatsapp', url: handoffUrl } : null
    };
  }

  if (/ship|delivery|cod|return|refund/.test(text)) {
    return {
      reply: 'We support doorstep delivery, COD on eligible orders, and a simple return flow. Ask me about shipping charges, delivery time, or returns.',
      suggestions: buildChatSuggestions(),
      handoff: handoffUrl ? { type: 'whatsapp', url: handoffUrl } : null
    };
  }

  if (/track|order|status/.test(text)) {
    return {
      reply: 'You can track your order from the Track Order page using your order ID. If you want a human update, use the WhatsApp handoff below.',
      suggestions: buildChatSuggestions(),
      handoff: handoffUrl ? { type: 'whatsapp', url: handoffUrl } : null
    };
  }

  if (/human|agent|support|call|whatsapp/.test(text)) {
    return {
      reply: handoffUrl ? 'A human helper is available on WhatsApp. Use the handoff option below for direct support.' : 'A support helper can assist you with product or order questions.',
      suggestions: buildChatSuggestions(),
      handoff: handoffUrl ? { type: 'whatsapp', url: handoffUrl } : null
    };
  }

  return {
    reply: 'I can help with products, discounts, shipping, returns, and order tracking. Tell me what you are shopping for and I will guide you.',
    suggestions: buildChatSuggestions(),
    handoff: handoffUrl ? { type: 'whatsapp', url: handoffUrl } : null
  };
}

async function generateAiChatResponse(payload = {}) {
  const settings = await getAllSettingsObject();
  const aiEnabled = settings.aiChatEnabled === true || settings.aiChatEnabled === 'true' || settings.aiChatEnabled === undefined;
  const handoffNumber = settings.aiHandoffWhatsappNumber || settings.whatsappNumber || DEFAULT_FALLBACK_SETTINGS.whatsappNumber;
  const fallbackContext = {
    aiHandoffWhatsappNumber: handoffNumber,
    whatsappNumber: settings.whatsappNumber
  };

  if (!aiEnabled || !OPENAI_API_KEY) return buildFallbackChatReply(payload.message, fallbackContext);

  const catalog = await getCatalogProducts();
  const currentProduct = catalog.find(product => String(product.id) === String(payload.productId || '')) || null;
  const related = await buildRecommendations({
    placement: currentProduct ? 'product' : 'home',
    productId: payload.productId,
    category: payload.category
  });

  const route = String(payload.route || '/').trim();
  const message = String(payload.message || '').trim().slice(0, 700);
  const currentCategory = String(payload.category || currentProduct?.category || '').trim().toLowerCase();
  const cartSummary = Array.isArray(payload.cartSummary) ? payload.cartSummary.slice(0, 6) : [];
  const systemPrompt = String(settings.aiSystemPrompt || DEFAULT_FALLBACK_SETTINGS.aiSystemPrompt).trim();

  const contextText = [
    `Store: ${settings.storeName || 'Lencho'}`,
    `Route: ${route}`,
    currentCategory ? `Active category: ${currentCategory}` : '',
    currentProduct ? `Current product: ${currentProduct.name} | price: Rs ${currentProduct.price} | stock: ${currentProduct.stock}` : '',
    cartSummary.length ? `Cart summary: ${JSON.stringify(cartSummary)}` : '',
    related.length ? `Recommended products:\n${buildCatalogSummary(related)}` : '',
    `Catalog excerpt:\n${buildCatalogSummary(catalog)}`
  ].filter(Boolean).join('\n\n');

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: OPENAI_MODEL,
        max_output_tokens: 240,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: `${systemPrompt}\n\nUse only the provided store context. If you are unsure, say so and offer WhatsApp support.` }]
          },
          {
            role: 'user',
            content: [{ type: 'input_text', text: `${contextText}\n\nCustomer message: ${message}` }]
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const reply = extractOpenAIText(response.data);
    if (!reply) return buildFallbackChatReply(message, fallbackContext);

    return {
      reply,
      suggestions: buildChatSuggestions(),
      handoff: handoffNumber ? { type: 'whatsapp', url: buildWhatsappHandoffUrl(handoffNumber) } : null
    };
  } catch (error) {
    return buildFallbackChatReply(message, fallbackContext);
  }
}

app.get('/api/settings/public', async (req, res) => {
  try {
    res.json(await getPublicSettingsObject());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const result = await generateAiChatResponse({
      message,
      route: req.body?.route,
      productId: req.body?.productId,
      category: req.body?.category,
      cartSummary: req.body?.cartSummary
    });

    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    res.json(await getAllSettingsObject());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updates = extractSettingsUpdates(req.body);
    if (!updates.length) return res.status(400).json({ error: 'No settings provided' });
    if (!useDB) {
      const nextSettings = getFallbackSettingsObject();
      for (const s of updates) {
        if (s && s.key) nextSettings[s.key] = s.value;
      }
      saveFallbackSettingsObject(nextSettings);
      return res.json({ success: true });
    }
    for (const s of updates) {
      await Settings.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updates = extractSettingsUpdates(req.body);
    if (!updates.length) return res.status(400).json({ error: 'No settings provided' });
    if (!useDB) {
      const nextSettings = getFallbackSettingsObject();
      for (const s of updates) {
        if (s && s.key) nextSettings[s.key] = s.value;
      }
      saveFallbackSettingsObject(nextSettings);
      return res.json({ success: true });
    }
    for (const s of updates) {
      await Settings.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Woollen Settings Routes
app.get('/api/woollen/settings', async (req, res) => {
  try {
    if (useDB) {
      const doc = await Settings.findOne({ key: 'woollen_collection_settings' });
      if (doc) return res.json(doc.value);
    }
    const fallbackSettings = getFallbackSettingsObject();
    res.json(fallbackSettings.woollen_collection_settings || {
      heroTitle: 'Woollen Collection',
      heroSubtitle: 'Artisan Crafted',
      heroDescription: 'Discover our exclusive range of handmade woollen hair accessories.',
      heroImage: '/images/woollen_hero.png'
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/woollen/settings', requireAdmin, async (req, res) => {
  try {
    if (useDB) {
      await Settings.findOneAndUpdate(
        { key: 'woollen_collection_settings' },
        { value: req.body },
        { upsert: true }
      );
    } else {
      const fallbackSettings = getFallbackSettingsObject();
      fallbackSettings.woollen_collection_settings = req.body;
      saveFallbackSettingsObject(fallbackSettings);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ──── TEST SMTP ENDPOINT ──────────────────────────────────────
app.post('/api/admin/test-smtp', requireAdmin, async (req, res) => {
  try {
    const { testEmail } = req.body || {};
    if (!testEmail) return res.status(400).json({ error: 'Test email address required' });

    console.log('[SMTP TEST] Starting SMTP test...');
    
    const smtpConfig = getSmtpConfigFromSettings({
      smtpHost: await getMeaningfulSetting('smtpHost', 'smtp.gmail.com'),
      smtpPort: await getMeaningfulSetting('smtpPort', 465),
      smtpUser: await getMeaningfulSetting('smtpUser', DEFAULT_SMTP_USER),
      smtpPass: await getMeaningfulSetting('smtpPass', DEFAULT_SMTP_PASS),
      storeName: await getMeaningfulSetting('storeName', DEFAULT_EMAIL_FROM_NAME),
    });

    console.log('[SMTP TEST] Config loaded:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.user ? '***' : 'EMPTY',
      pass: smtpConfig.pass ? '***' : 'EMPTY'
    });

    if (isPlaceholderSMTP(smtpConfig.user) || isPlaceholderSMTP(smtpConfig.pass)) {
      return res.status(400).json({
        success: false,
        error: 'SMTP credentials not configured',
        message: 'Please set SMTP User (Gmail) and SMTP Pass (App Password) in Admin Settings'
      });
    }

    // Try to create and verify transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: Number(smtpConfig.port) || 465,
      secure: Number(smtpConfig.port) === 465,
      auth: { user: smtpConfig.user, pass: smtpConfig.pass },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });

    console.log('[SMTP TEST] Verifying connection...');
    await transporter.verify();

    console.log('[SMTP TEST] Sending test email...');
    const result = await transporter.sendMail({
      from: `"${smtpConfig.storeName}" <${smtpConfig.user}>`,
      to: testEmail,
      subject: 'Lencho SMTP Test ✅',
      html: `<h2>SMTP Configuration Working!</h2><p>Your SMTP settings are configured correctly. OTP emails should now be sent successfully.</p><p>Store: ${smtpConfig.storeName}</p><p>Sent from: ${smtpConfig.user}</p>`
    });

    console.log('[SMTP TEST] Success! MessageID:', result.messageId);
    res.json({
      success: true,
      message: 'SMTP test email sent successfully!',
      messageId: result.messageId,
      config: { host: smtpConfig.host, port: smtpConfig.port, from: smtpConfig.user }
    });
  } catch (e) {
    console.error('[SMTP TEST] Error:', e.message);
    res.status(500).json({
      success: false,
      error: toFriendlySmtpError(e),
      details: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
});

// ──── AUTH SETTINGS ROUTES ────────────────────────────────────
const authSettingsRoutes = require('./routes/auth-settings');
app.use('/api/auth-settings', authSettingsRoutes);

app.post('/api/admin/upload-media', requireAdmin, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Media file required' });
    const mediaUrl = await uploadSingleMedia(req.file, req.body?.folder || 'cms');
    res.json({ success: true, url: mediaUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/login-logs', requireAdmin, async (req, res) => {
  try {
    if (useDB && LoginEvent) {
      const logs = await LoginEvent.find({}).sort({ createdAt: -1 }).limit(300).lean();
      return res.json(logs.map(l => ({ ...l, id: l._id })));
    }
    const logs = readJson(FILES.loginLogs);
    res.json(Array.isArray(logs) ? logs.slice(0, 300) : []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/delivery-manager', requireAdmin, async (req, res) => {
  try {
    const cfg = await getDeliveryManagerConfig();
    res.json(cfg);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/delivery-manager', requireAdmin, async (req, res) => {
  try {
    const incoming = req.body || {};
    const current = await getDeliveryManagerConfig();
    const next = {
      ...current,
      enabled: incoming.enabled === true || incoming.enabled === 'true',
      provider: String(incoming.provider || current.provider || 'custom').trim(),
      apiBaseUrl: String(incoming.apiBaseUrl || '').trim(),
      apiKey: String(incoming.apiKey || '').trim(),
      webhookUrl: String(incoming.webhookUrl || '').trim(),
      trackingUrlTemplate: String(incoming.trackingUrlTemplate || '').trim(),
      notes: String(incoming.notes || '').trim()
    };
    await saveDeliveryManagerConfig(next);
    res.json({ success: true, config: next });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/delivery/tracking-config', async (req, res) => {
  try {
    const cfg = await getDeliveryManagerConfig();
    res.json({
      provider: cfg.provider || 'custom',
      trackingUrlTemplate: cfg.trackingUrlTemplate || ''
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/delivery-manager/test', requireAdmin, async (req, res) => {
  try {
    const cfg = await getDeliveryManagerConfig();
    const requestWebhook = String(req.body?.webhookUrl || '').trim();
    const requestApiBase = String(req.body?.apiBaseUrl || '').trim();
    const requestApiKey = String(req.body?.apiKey || '').trim();

    let webhookUrl = requestWebhook || String(cfg.webhookUrl || '').trim();
    if (!webhookUrl) {
      const base = requestApiBase || String(cfg.apiBaseUrl || '').trim();
      if (base) webhookUrl = base.replace(/\/$/, '') + '/orders';
    }

    if (!webhookUrl) return res.status(400).json({ error: 'Please add Delivery API/Webhook URL first' });

    const payload = {
      source: 'lencho-admin',
      event: 'delivery_manager_test',
      sentAt: new Date().toISOString(),
      order: {
        id: req.body?.orderId || `TEST-${Date.now()}`,
        amount: req.body?.amount || 999,
        paymentMethod: req.body?.paymentMethod || 'prepaid'
      }
    };

    const headers = { 'Content-Type': 'application/json' };
    const apiKey = requestApiKey || String(cfg.apiKey || '').trim();
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const upstream = await axios.post(webhookUrl, payload, { headers, timeout: 15000 });
    res.json({
      success: true,
      upstreamStatus: upstream.status,
      upstreamData: upstream.data,
      payload
    });
  } catch (e) {
    res.status(500).json({
      error: e.response?.data?.message || e.message,
      upstreamStatus: e.response?.status || null,
      upstreamData: e.response?.data || null
    });
  }
});

app.post('/api/discount/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    console.log(`[DISCOUNT] Coupon WELCOME10 claimed by: ${email}`);
    if (!useDB) {
      const discounts = readJson(FILES.discounts);
      discounts.push({ email, code: 'WELCOME10', createdAt: new Date().toISOString() });
      writeJson(FILES.discounts, discounts);
    }
    res.json({ success: true, code: 'WELCOME10' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/discounts', requireAdmin, async (req, res) => {
  try {
    if (!useDB) {
      const discounts = readJson(FILES.discounts);
      return res.json(discounts);
    }
    res.json([]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GST & TAX REPORTING ──────────────────────────────────────
app.get('/api/admin/gst-data', requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'cancelled' } });
    let totalSales = 0;
    let totalGST = 0;
    let cgst = 0;
    let sgst = 0;

    orders.forEach(order => {
      totalSales += order.grandTotal || 0;
      totalGST += order.gstTotal || 0;
      cgst += (order.gstTotal || 0) / 2;
      sgst += (order.gstTotal || 0) / 2;
    });

    res.json({
      summary: {
        totalSales,
        totalGST,
        cgst,
        sgst,
        orderCount: orders.length
      },
      orders: orders.map(o => ({
        id: o._id,
        date: o.createdAt,
        customer: o.userName,
        amount: o.grandTotal,
        gst: o.gstTotal,
        status: o.status
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TESTIMONIALS ──────────────────────────────────────────────
app.get('/api/testimonials', async (req, res) => {
  try {
    if (useDB) {
      const showTesti = await Settings.findOne({ key: 'showTestimonials' });
      if (showTesti && showTesti.value === false) {
        return res.json({ hidden: true });
      }
      const t = await Testimonial.find({ approved: true }).sort('-createdAt');
      return res.json(t);
    }
    // JSON fallback — return defaults
    res.json([
      { name: 'Anjali Sharma', city: 'Delhi', rating: 5, comment: 'The jewelry is absolutely stunning! The finish and quality are even better than in the photos. Highly recommended! ✦' },
      { name: 'Priya Verma', city: 'Mumbai', rating: 5, comment: 'Ordered a necklace set for a wedding, and I received so many compliments. Fast delivery too! 💎' },
      { name: 'Surbhi Gupta', city: 'Chandigarh', rating: 5, comment: 'Love the premium packaging and the rounded design. Feels very high-end. Great experience. ✨' },
      { name: 'Megha Jain', city: 'Jaipur', rating: 4, comment: 'Beautiful earrings, very lightweight and elegant. Will definitely shop again for the bridal collection.' }
    ]);
  } catch (err) {
    console.error('Testimonials error:', err.message);
    res.json([]);
  }
});

app.get('/api/admin/testimonials', requireAdmin, async (req, res) => {
  try {
    const t = await Testimonial.find().sort('-createdAt');
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/testimonials', requireAdmin, async (req, res) => {
  try {
    const t = new Testimonial(req.body);
    await t.save();
    res.json({ message: 'Testimonial added', testimonial: t });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    const t = await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Testimonial updated', testimonial: t });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/testimonials/:id', requireAdmin, async (req, res) => {
  try {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SECURITY & CAPTCHA ───────────────────────────────────────
app.get('/api/captcha', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  const { q, a } = generateCaptcha();
  req.session.captcha = a;
  res.json({ question: q });
});

// ─── ADMIN SETUP ─────────────────────────────────────────────
app.get('/api/admin/check-setup', async (req, res) => {
  try {
    if (!useDB) return res.json({ setupRequired: false });
    const adminCount = await User.countDocuments({ role: 'admin' });
    res.json({ setupRequired: adminCount === 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/setup', async (req, res) => {
  try {
    if (await User.countDocuments({ role: 'admin' }) > 0) return res.status(400).json({ error: 'Setup already completed' });
    const { name, email, password, phone, securityQuestion, securityAnswer } = req.body;
    if (!email || !password || !securityAnswer) return res.status(400).json({ error: 'Complete all fields' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, phone, role:'admin', securityQuestion, securityAnswer, isVerified: true });
    req.session.userId = user._id.toString(); req.session.role = 'admin'; 
    res.json({ success: true, message: 'Master Admin created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FORGOT PASSWORD (SECURITY QUESTION) ──────────────────────
app.post('/api/admin/forgot-password', async (req, res) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) return res.status(404).json({ error: 'Admin account not found' });
    if (user.securityAnswer.toLowerCase() !== securityAnswer.toLowerCase()) return res.status(400).json({ error: 'Incorrect security answer' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── RAZORPAY — SMART PAYMENT HUB ─────────────────────────────
app.post('/api/razorpay/order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    const options = {
      amount: Math.round(amount * 100), // convert to paise
      currency,
      receipt: receipt || `rec_${Date.now()}`,
      payment_capture: 1
    };
    const order = await rzp.orders.create(options);
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const authContext = getAuthContext(req);
    const key_secret = process.env.RAZORPAY_SECRET || 'test_secret';
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      if (useDB) {
        const order = await Order.findOneAndUpdate({ id: orderId }, {
          status: 'placed',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          $push: { timeline: { status: 'paid', label: 'Payment Verified ✓', date: new Date(), done: true } }
        });
        if (order && order.clearCart !== false && authContext.userId && !String(authContext.userId).startsWith('guest-')) {
          await Cart.findOneAndUpdate({ userId: authContext.userId }, { items: [] });
        }
      } else {
        const orders = readJson(FILES.orders);
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = 'placed';
          if (order.clearCart !== false && authContext.userId && !String(authContext.userId).startsWith('guest-')) {
            const carts = readJson(FILES.carts);
            const ci = carts.findIndex(c => c.userId === authContext.userId);
            if (ci > -1) {
              carts[ci].items = [];
              writeJson(FILES.carts, carts);
            }
          }
        }
        writeJson(FILES.orders, orders);
      }
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid payment signature' });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SHIPROCKET — AUTOMATED LOGISTICS ─────────────────────────
const ShiprocketService = {
  token: null,
  async getToken() {
    try {
      const res = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
        email: process.env.SHIPROCKET_EMAIL || 'hello@lencho.in',
        password: process.env.SHIPROCKET_PASSWORD || 'password123'
      });
      this.token = res.data.token;
      return this.token;
    } catch (err) { console.error('Shiprocket Auth Error:', err.message); return null; }
  },
  async createOrder(order, token) {
    // Transform our order to Shiprocket format
    const payload = {
      order_id: order.id,
      order_date: new Date(order.createdAt).toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: order.userName,
      billing_last_name: "",
      billing_address: order.address,
      billing_city: "Barara",
      billing_pincode: "133201",
      billing_state: "Haryana",
      billing_country: "India",
      billing_email: "customer@gmail.com",
      billing_phone: "9876543210",
      shipping_is_billing: true,
      order_items: order.items.map(i => ({
        name: i.name,
        sku: i.productId,
        units: i.quantity,
        selling_price: i.price,
        hsn: i.hsn || "7117"
      })),
      payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.subtotal,
      length: 10, breadth: 10, height: 10, weight: 0.5
    };
    const res = await axios.post('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  }
};

app.post('/api/admin/orders/:id/shiprocket', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const token = await ShiprocketService.getToken();
    if (!token) return res.status(500).json({ error: 'Could not connect to Shiprocket' });
    
    const srOrder = await ShiprocketService.createOrder(order, token);
    
    // Generate AWB automatically
    const awbRes = await axios.post('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
      shipment_id: srOrder.shipment_id
    }, { headers: { Authorization: `Bearer ${token}` } });
    
    await Order.findOneAndUpdate({ id: order.id }, {
      shiprocketOrderId: srOrder.order_id,
      shiprocketShipmentId: srOrder.shipment_id,
      awbCode: awbRes.data.response.data.awb_code,
      status: 'shipped',
      $push: { timeline: { status: 'shipped', label: 'Order Shipped via Shiprocket', date: new Date(), done: true } }
    });
    
    res.json({ success: true, awb: awbRes.data.response.data.awb_code });
  } catch (err) { res.status(500).json({ error: err.response?.data?.message || err.message }); }
});

app.get('/api/admin/orders/:id/label', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id });
    const token = await ShiprocketService.getToken();
    const labelRes = await axios.post('https://apiv2.shiprocket.in/v1/external/courier/generate/label', {
      shipment_id: [order.shiprocketShipmentId]
    }, { headers: { Authorization: `Bearer ${token}` } });
    res.json({ label_url: labelRes.data.label_url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── OTP ROUTES ───────────────────────────────────────────────
app.post('/api/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const mobile = phone.replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) return res.status(400).json({ error: 'Enter valid 10-digit mobile number' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (useDB) {
      await OTPLog.deleteMany({ target: mobile, used: false });
      await OTPLog.create({ target: mobile, code: otp, type: 'signup', expiresAt });
    } else {
      req.session.pendingOTP = { phone: mobile, code: otp, expiresAt: expiresAt.toISOString() };
    }

    const result = await sendSMSOTP(mobile, otp);
    res.json({
      success: true,
      message: `OTP has been sent to +91 ${mobile} 📱`,
      via: result.via,
      devOtp: result.devOtp
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/otp/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const mobile = phone.replace(/\D/g, '').slice(-10);
    if (useDB) {
      const record = await OTPLog.findOne({ target: mobile, code: otp, used: false });
      if (!record || record.expiresAt < new Date()) return res.status(400).json({ error: 'Invalid or expired OTP' });
      await OTPLog.findByIdAndUpdate(record._id, { used: true });
    } else {
      const pending = req.session.pendingOTP;
      if (!pending || pending.phone !== mobile || pending.code !== otp) return res.status(400).json({ error: 'Invalid OTP' });
      if (new Date(pending.expiresAt) < new Date()) return res.status(400).json({ error: 'OTP expired. Please resend.' });
    }
    res.json({ success: true, verified: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/otp/send-email', async (req, res) => {
  try {
    const { email, captchaAnswer, resend } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (!email) return res.status(400).json({ error: 'Email required' });

    // ── CAPTCHA validation ──
    const isResend = resend === true || resend === 'true';
    if (!isResend) {
      if (!captchaAnswer) {
        return res.status(400).json({ error: 'Security code is required.' });
      }
      if (String(captchaAnswer).trim().toUpperCase() !== String(req.session.captcha || '').trim().toUpperCase()) {
        return res.status(400).json({ error: 'Invalid security code. Please try again.' });
      }
      delete req.session.captcha; // one-time use
    }

    // ── Email format validation ──
    const cleanEmail = String(email).trim().toLowerCase();
    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // ── Disposable email blocking ──
    if (isDisposableEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Temporary/disposable email addresses are not allowed. Please use a real email.' });
    }

    // ── Rate limiting ──
    if (!checkRateLimit(`email:${cleanEmail}`, OTP_MAX_PER_EMAIL)) {
      return res.status(429).json({ error: 'Too many OTP requests for this email. Please wait 10 minutes.' });
    }
    if (!checkRateLimit(`ip:${ip}`, OTP_MAX_PER_IP)) {
      return res.status(429).json({ error: 'Too many requests from your network. Please wait a few minutes.' });
    }

    if (req.session) delete req.session.verifiedEmailOTP;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_MS);
    console.log(`[auth] OTP request received for ${cleanEmail} from IP ${ip}`);

    if (useDB) {
      await OTPLog.deleteMany({ target: cleanEmail, used: false });
      await OTPLog.create({ target: cleanEmail, code: otp, type: 'email_login', expiresAt });
    } else {
      req.session.pendingEmailOTP = { email: cleanEmail, code: otp, expiresAt: expiresAt.toISOString() };
    }
    try {
      const sendResult = await sendConfiguredEmailOTP(cleanEmail, otp, 'email_login');
      console.log(`[auth] OTP email sent to ${cleanEmail} | messageId=${sendResult.messageId || 'n/a'} | OTP=${otp}`);
      return res.json({
        success: true,
        message: sendResult.via === 'dev-console' ? `DEV MODE: OTP is ${otp}` : 'OTP sent! Check your inbox.',
        expiresIn: Math.floor(EMAIL_OTP_EXPIRY_MS / 1000),
        provider: sendResult.via || 'gmail',
        verifiedTransport: true,
        debugOTP: process.env.NODE_ENV === 'development' ? otp : undefined,
        devOtp: sendResult.devOtp
      });
    } catch (smtpErr) {
      console.error('[auth] OTP email send failed:', smtpErr.message);
      const errorMsg = toFriendlySmtpError(smtpErr);
      console.error('[auth] Friendly error:', errorMsg);
      return res.status(500).json({
        error: errorMsg,
        debug: process.env.NODE_ENV === 'development' ? String(smtpErr?.message || smtpErr) : undefined,
        tip: 'If SMTP is not configured, configure it in Admin > Settings > SMTP Configuration, then test with /api/admin/test-smtp'
      });
    }
  } catch (e) { res.status(500).json({ error: toFriendlySmtpError(e) }); }
});

app.post('/api/otp/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ email, otp, error: 'Email and OTP required' });

    if (useDB) {
      const log = await OTPLog.findOne({ target: email, code: otp, used: false, expiresAt: { $gt: new Date() } });
      if (!log) return res.status(400).json({ error: 'Invalid or expired OTP' });
      log.used = true; await log.save();
      // Update User verification status
      await User.findOneAndUpdate(
        { email },
        { $set: { isVerified: true, emailVerifiedAt: new Date(), authProvider: 'email' } },
        { upsert: false }
      );
    } else {
      const pending = req.session.pendingEmailOTP;
      if (!pending || pending.email !== email || pending.code !== otp) return res.status(400).json({ error: 'Invalid OTP' });
      if (new Date(pending.expiresAt) < new Date()) return res.status(400).json({ error: 'OTP expired' });
      delete req.session.pendingEmailOTP;
    }

    req.session.verifiedEmailOTP = {
      email,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    };

    res.json({ success: true, verified: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/login/request-otp', async (req, res) => {
  try {
    const { email, password, captchaAnswer, resend } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    // ── RESEND MODE: Skip password/captcha if credentials already verified ──
    if (resend && req.session.pendingAdminLogin && req.session.pendingAdminLogin.email === email) {
      console.log(`[Admin OTP] Resend requested for ${email}`);
      const pending = req.session.pendingAdminLogin;
      
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      if (useDB) {
        await OTPLog.deleteMany({ target: email, type: 'admin_login', used: false });
        await OTPLog.create({ target: email, code: otp, type: 'admin_login', expiresAt });
      } else {
        req.session.pendingAdminOTP = { email, code: otp, expiresAt: expiresAt.toISOString() };
      }
      
      // Update expiry on pending login
      pending.expiresAt = expiresAt.toISOString();
      
      const isDev = process.env.NODE_ENV !== 'production';
      console.log(`\n📱 ADMIN OTP RESEND for ${email}: ${otp}\n`);
      
      try {
        await sendConfiguredEmailOTP(email, otp, 'admin_login');
        return res.json({ success: true, message: 'OTP resent to your admin email. Valid for 5 minutes.', via: 'email', devOtp: isDev ? otp : undefined });
      } catch (emailErr) {
        console.error('[Admin OTP Resend] Email failed:', emailErr.message);
        return res.json({ success: true, message: isDev ? `DEV: OTP is ${otp}` : 'OTP resend failed. Check server logs.', via: 'console', devOtp: isDev ? otp : undefined });
      }
    }
    
    // ── FIRST LOGIN: Require email, password, captcha ──
    if (!email || !password || !captchaAnswer) return res.status(400).json({ error: 'Email, password and CAPTCHA are required' });

    if (String(captchaAnswer).trim().toUpperCase() !== String(req.session.captcha || '').trim().toUpperCase()) {
      await recordLoginActivity({ email, status: 'failed', method: 'admin_otp', role: 'admin', ip, userAgent });
      return res.status(400).json({ error: 'Invalid CAPTCHA' });
    }

    let adminUser = null;
    if (useDB) {
      adminUser = await User.findOne({ email });
      if (!adminUser || adminUser.role !== 'admin' || !await bcrypt.compare(password, adminUser.password)) {
        await recordLoginActivity({ email, name: adminUser?.name || '', status: 'failed', method: 'admin_otp', role: adminUser?.role || 'user', ip, userAgent });
        return res.status(400).json({ error: 'Invalid admin credentials' });
      }
    } else {
      const users = readJson(FILES.users);
      adminUser = users.find(u => u.email === email && u.role === 'admin');
      if (!adminUser || !await bcrypt.compare(password, adminUser.password)) {
        await recordLoginActivity({ email, name: adminUser?.name || '', status: 'failed', method: 'admin_otp', role: adminUser?.role || 'user', ip, userAgent });
        return res.status(400).json({ error: 'Invalid admin credentials' });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    if (useDB) {
      await OTPLog.deleteMany({ target: email, type: 'admin_login', used: false });
      await OTPLog.create({ target: email, code: otp, type: 'admin_login', expiresAt });
    } else {
      req.session.pendingAdminOTP = { email, code: otp, expiresAt: expiresAt.toISOString() };
    }

    req.session.pendingAdminLogin = {
      email,
      userId: adminUser._id?.toString() || adminUser.id,
      expiresAt: expiresAt.toISOString()
    };
    delete req.session.captcha;

    // Determine OTP delivery method
    const isDev = process.env.NODE_ENV !== 'production';
    let otpSent = { via: 'console', message: 'OTP sent to admin email. Valid for 5 minutes.' };

    // Always show OTP in development for testing/fallback
    console.log(`\n📱 ADMIN OTP for ${email}: ${otp}  ← (visible in development mode)\n`);

    // Try to send Email OTP first (both in development and production)
    try {
      await sendConfiguredEmailOTP(email, otp, 'admin_login');
      otpSent = { via: 'email', message: 'OTP sent to your admin email. Valid for 5 minutes.' };
    } catch (emailErr) {
      console.log('⚠️  Email OTP failed, attempting fallback:', emailErr.message);
      if (isDev) {
        otpSent = { via: 'console', message: 'Email OTP failed. Under dev mode, OTP printed to console.' };
      } else {
        try {
          await sendSMSOTP(email.replace(/@.*/, '7404217625'), otp);
          otpSent = { via: 'sms', message: 'OTP sent via SMS. Valid for 5 minutes.' };
        } catch (smsErr) {
          console.log('⚠️  SMS also failed, showing console OTP:', smsErr.message);
          // If both fail, return success but user can see OTP in console
          otpSent = { via: 'console', message: 'OTP system temporary issue. Check server logs.' };
        }
      }
    }

    res.json({ success: true, message: otpSent.message, via: otpSent.via, devOtp: isDev ? otp : undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/login/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const pending = req.session.pendingAdminLogin;
    if (!pending || pending.email !== email) return res.status(400).json({ error: 'Please request OTP again' });
    if (new Date(pending.expiresAt) < new Date()) {
      delete req.session.pendingAdminLogin;
      delete req.session.pendingAdminOTP;
      return res.status(400).json({ error: 'OTP expired. Please request again.' });
    }

    if (useDB) {
      const log = await OTPLog.findOne({
        target: email,
        type: 'admin_login',
        code: String(otp).trim(),
        used: false,
        expiresAt: { $gt: new Date() }
      });
      if (!log) {
        await recordLoginActivity({ email, status: 'failed', method: 'admin_otp', role: 'admin', ip, userAgent });
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }
      log.used = true;
      await log.save();
    } else {
      const mem = req.session.pendingAdminOTP;
      if (!mem || mem.email !== email || String(mem.code) !== String(otp).trim()) return res.status(400).json({ error: 'Invalid OTP' });
      if (new Date(mem.expiresAt) < new Date()) return res.status(400).json({ error: 'OTP expired. Please request again.' });
    }

    let user;
    if (useDB) {
      user = await User.findById(pending.userId);
      if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin account not found' });
      req.session.userId = user._id.toString();
      req.session.role = user.role;
      req.session.name = user.name;
      delete req.session.pendingAdminLogin;
      delete req.session.pendingAdminOTP;
      await recordLoginActivity({ email, name: user.name, status: 'success', method: 'admin_otp', role: user.role, ip, userAgent });
      const { password: _, ...safe } = user.toObject();
      return res.json({ success: true, token: generateToken(user._id.toString(), user.role), user: { id: user._id, ...safe } });
    }

    const users = readJson(FILES.users);
    user = users.find(u => u.id === pending.userId || u.email === email);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin account not found' });
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.name = user.name;
    delete req.session.pendingAdminLogin;
    delete req.session.pendingAdminOTP;
    await recordLoginActivity({ email, name: user.name, status: 'success', method: 'admin_otp', role: user.role, ip, userAgent });
    res.json({ success: true, token: generateToken(user.id, user.role), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SIMPLIFIED ADMIN LOGIN (Email + Password only, no OTP/CAPTCHA) ────────────────
app.post('/api/admin/login/simple', async (req, res) => {
  try {
    const { email, password, captchaAnswer } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    
    if (!email || !password || !captchaAnswer) return res.status(400).json({ error: 'Email, password and CAPTCHA are required' });

    // Validate CAPTCHA (case-insensitive)
    if (String(captchaAnswer).trim().toUpperCase() !== String(req.session.captcha || '').trim().toUpperCase()) {
      await recordLoginActivity({ email, status: 'failed', method: 'admin_simple', role: 'admin', ip, userAgent });
      return res.status(400).json({ error: 'Invalid CAPTCHA code' });
    }

    let adminUser = null;
    
    // Try MongoDB first
    if (useDB) {
      adminUser = await User.findOne({ email });
      if (!adminUser || adminUser.role !== 'admin' || !await bcrypt.compare(password, adminUser.password)) {
        await recordLoginActivity({ email, status: 'failed', method: 'admin_simple', role: adminUser?.role || 'user', ip, userAgent });
        return res.status(400).json({ error: 'Invalid admin credentials' });
      }
    } else {
      // Use JSON fallback
      const users = readJson(FILES.users);
      adminUser = users.find(u => u.email === email && u.role === 'admin');
      if (!adminUser || !await bcrypt.compare(password, adminUser.password)) {
        await recordLoginActivity({ email, status: 'failed', method: 'admin_simple', role: adminUser?.role || 'user', ip, userAgent });
        return res.status(400).json({ error: 'Invalid admin credentials' });
      }
    }

    // Set session
    if (useDB) {
      req.session.userId = adminUser._id.toString();
    } else {
      req.session.userId = adminUser.id;
    }
    req.session.role = 'admin';
    req.session.name = adminUser.name;
    delete req.session.captcha; // Clear CAPTCHA after use
    
    // Record successful login
    await recordLoginActivity({ email, name: adminUser.name, status: 'success', method: 'admin_simple', role: 'admin', ip, userAgent });
    
    console.log(`✅ Admin logged in: ${email}`);
    res.json({ success: true, message: 'Admin login successful', user: { id: req.session.userId, name: adminUser.name, email: adminUser.email, role: 'admin' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AUTH ROUTES ──────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, phone, gender } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

    const verifiedEmail = req.session?.verifiedEmailOTP;
    if (!verifiedEmail || verifiedEmail.email !== email) {
      return res.status(400).json({ error: 'Please verify email OTP first' });
    }
    if (verifiedEmail.expiresAt && new Date(verifiedEmail.expiresAt) < new Date()) {
      delete req.session.verifiedEmailOTP;
      return res.status(400).json({ error: 'OTP verification expired. Please verify again.' });
    }

    if (useDB) {
      if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        password: hashed,
        phone: phone || '',
        gender: gender || 'female',
        isVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: 'email',
        loginCount: 1,
        lastLoginAt: new Date()
      });
      req.session.userId = user._id.toString(); req.session.role = user.role; req.session.name = user.name;
      delete req.session.verifiedEmailOTP;
      const { password: _, ...safe } = user.toObject();
      return res.json({ success: true, token: generateToken(user._id.toString(), user.role), user: { id: safe._id, ...safe } });
    }
    const users = readJson(FILES.users);
    if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const user = { id: uuidv4(), name, email, password: hashed, phone: phone || '', gender: gender || 'female', role: 'user', isVerified: true, authProvider: 'email', emailVerifiedAt: now, address: '', createdAt: now, lastLoginAt: now, loginCount: 1 };
    users.push(user); writeJson(FILES.users, users);
    req.session.userId = user.id; req.session.role = user.role; req.session.name = user.name;
    delete req.session.verifiedEmailOTP;
    return res.json({ success: true, token: generateToken(user.id, user.role), user: { id: user.id, name, email, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, captchaAnswer } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // ── Login lock check (5 failed attempts → 15 min lock) ──
    if (!checkLoginLock(email)) {
      return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' });
    }

    if (useDB) {
      const user = await User.findOne({ email });
      if (!user) {
        await recordLoginActivity({ email, status: 'failed', method: 'password', role: 'user', ip, userAgent });
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      if (user.isBlocked) {
        await recordLoginActivity({ email, name: user.name, status: 'failed', method: 'password', role: user.role, ip, userAgent });
        return res.status(403).json({ error: 'This account is blocked. Please contact support.' });
      }

      if (user.role === 'admin') {
        return res.status(400).json({ error: 'Admins must login through the OTP-protected admin flow.' });
      }
      
      const verifiedEmail = req.session?.verifiedEmailOTP;
      if (!verifiedEmail || verifiedEmail.email !== email) {
        return res.status(400).json({ error: 'Please verify email OTP first' });
      }
      if (verifiedEmail.expiresAt && new Date(verifiedEmail.expiresAt) < new Date()) {
        delete req.session.verifiedEmailOTP;
        return res.status(400).json({ error: 'OTP verification expired. Please verify again.' });
      }

      if (!await bcrypt.compare(password, user.password)) {
        recordLoginFail(email);
        await recordLoginActivity({ email, name: user.name, status: 'failed', method: 'password', role: user.role, ip, userAgent });
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      user.lastLoginAt = new Date();
      user.lastLoginIp = String(ip || '');
      user.lastLoginUserAgent = String(userAgent || '');
      user.loginCount = (user.loginCount || 0) + 1;
      user.authProvider = user.authProvider || 'email';
      await user.save();

      req.session.userId = user._id.toString(); req.session.role = user.role; req.session.name = user.name;
      if (user.role !== 'admin') delete req.session.verifiedEmailOTP;
      clearLoginFails(email);
      await recordLoginActivity({ email, name: user.name, status: 'success', method: 'password', role: user.role, ip, userAgent });
      const { password: _, ...safe } = user.toObject();
      return res.json({ success: true, token: generateToken(user._id.toString(), user.role), user: { id: user._id, ...safe } });
    }
    const users = readJson(FILES.users);
    const user = users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.password)) {
      recordLoginFail(email);
      await recordLoginActivity({ email, status: 'failed', method: 'password', role: user?.role || 'user', ip, userAgent });
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      await recordLoginActivity({ email, name: user.name, status: 'failed', method: 'password', role: user.role, ip, userAgent });
      return res.status(403).json({ error: 'This account is blocked. Please contact support.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Admins must login through the OTP-protected admin flow.' });
    }

    const verifiedEmail = req.session?.verifiedEmailOTP;
    if (!verifiedEmail || verifiedEmail.email !== email) {
      return res.status(400).json({ error: 'Please verify email OTP first' });
    }
    if (verifiedEmail.expiresAt && new Date(verifiedEmail.expiresAt) < new Date()) {
      delete req.session.verifiedEmailOTP;
      return res.status(400).json({ error: 'OTP verification expired. Please verify again.' });
    }

    user.lastLoginAt = new Date().toISOString();
    user.lastLoginIp = String(ip || '');
    user.lastLoginUserAgent = String(userAgent || '');
    user.loginCount = (user.loginCount || 0) + 1;
    user.authProvider = user.authProvider || 'email';

    req.session.userId = user.id; req.session.role = user.role; req.session.name = user.name;
    if (user.role !== 'admin') delete req.session.verifiedEmailOTP;
    await recordLoginActivity({ email, name: user.name, status: 'success', method: 'password', role: user.role, ip, userAgent });
    writeJson(FILES.users, users);
    res.json({ success: true, token: generateToken(user.id, user.role), user: { id: user.id, name: user.name, email, role: user.role, phone: user.phone || '', gender: user.gender || 'female', createdAt: user.createdAt, lastLoginAt: user.lastLoginAt, authProvider: user.authProvider || 'email', isVerified: user.isVerified !== false, isBlocked: !!user.isBlocked } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/me', async (req, res) => {
  const auth = getAuthContext(req);
  if (!auth.userId) return res.json({ user: null });
  try {
    if (useDB) {
      const user = await User.findById(auth.userId).select('-password');
      return res.json({ user: user ? { id: user._id, ...user.toObject() } : null });
    }
    const users = readJson(FILES.users);
    const user = users.find(u => String(u.id) === String(auth.userId));
    if (!user) return res.json({ user: null });
    const { password, ...safe } = user;
    res.json({ user: safe });
  } catch { res.json({ user: null }); }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, address, gender, password, securityQuestion, securityAnswer, email } = req.body;
    if (useDB) {
      const updates = { name, phone, address, gender };
      if (email) updates.email = email;
      if (password) updates.password = await bcrypt.hash(password, 10);
      if (securityQuestion) updates.securityQuestion = securityQuestion;
      if (securityAnswer) updates.securityAnswer = securityAnswer;
      
      const user = await User.findByIdAndUpdate(req.auth.userId, updates, { new: true }).select('-password');
      if (req.session) req.session.name = user.name;
      return res.json({ success: true, user: { id: user._id, ...user.toObject() } });
    }
    
    // JSON fallback
    const users = readJson(FILES.users);
    const idx = users.findIndex(u => u.id === req.auth.userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    
    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (phone) users[idx].phone = phone;
    if (address) users[idx].address = address;
    if (gender) users[idx].gender = gender;
    if (password) users[idx].password = await bcrypt.hash(password, 10);
    if (securityQuestion) users[idx].securityQuestion = securityQuestion;
    if (securityAnswer) users[idx].securityAnswer = securityAnswer;
    
    writeJson(FILES.users, users);
    const { password: p, ...safe } = users[idx];
    res.json({ success: true, user: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN USERS MANAGEMENT API ───────────────────────────────
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { search, verified, blocked, page = 1, limit = 50 } = req.query;
    if (useDB) {
      let query = {};
      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [{ name: regex }, { email: regex }, { phone: regex }];
      }
      if (verified === 'true') query.isVerified = true;
      if (verified === 'false') query.isVerified = false;
      if (blocked === 'true') query.isBlocked = true;
      if (blocked === 'false') query.isBlocked = { $ne: true };
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [users, total] = await Promise.all([
        User.find(query).select('-password -otp').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        User.countDocuments(query)
      ]);
      return res.json({ users: users.map(u => ({ id: u._id, ...u.toObject() })), total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    let users = readJson(FILES.users).map(u => { const { password, ...safe } = u; return safe; });
    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u => (u.name||'').toLowerCase().includes(s) || (u.email||'').toLowerCase().includes(s) || (u.phone||'').includes(s));
    }
    res.json({ users, total: users.length, page: 1, pages: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (useDB) {
      const user = await User.findById(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.isBlocked = !user.isBlocked;
      await user.save();
      return res.json({ success: true, blocked: user.isBlocked });
    }
    const users = readJson(FILES.users);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    users[idx].isBlocked = !users[idx].isBlocked;
    writeJson(FILES.users, users);
    res.json({ success: true, blocked: users[idx].isBlocked });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (useDB) {
      const user = await User.findByIdAndDelete(id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true });
    }
    const users = readJson(FILES.users);
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    users.splice(idx, 1);
    writeJson(FILES.users, users);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CATEGORY (COLLECTION) API ────────────────────────────────
app.get('/api/categories', async (req, res) => {
  try {
    if (useDB) {
      const cats = await Category.find().sort('displayOrder').lean();
      if (cats && cats.length > 0) return res.json(cats.map(normalizeCategoryRecord).filter(Boolean));

      const products = await Product.find({}).lean();
      const fallbackProducts = products.length > 0 ? products.map(p => ({
        id: p._id?.toString() || p.id,
        name: p.name,
        category: p.category,
        images: p.images || []
      })) : getJsonCatalogProducts();
      return res.json(getJsonCategoriesFromProducts(fallbackProducts).map(normalizeCategoryRecord).filter(Boolean));
    }
    return res.json(getJsonCategoriesFromProducts(getJsonCatalogProducts()).map(normalizeCategoryRecord).filter(Boolean));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const { name, image, description, displayOrder, icon, status } = req.body;
    const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const cat = await Category.create({ name, slug, image, description, displayOrder, icon, status });
    res.json({ success: true, category: cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, category: cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/recommendations', async (req, res) => {
  try {
    const items = await buildRecommendations({
      placement: req.query.placement,
      productId: req.query.productId,
      category: req.query.category
    });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PRODUCTS ─────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    await incrementStoreVisitorCount(req);
    const { category, subcategory, featured, search, sort } = req.query;
    if (useDB) {
      let query = {};
      if (category) query.category = category;
      if (subcategory) query.subcategory = subcategory;
      if (featured === 'true') query.featured = true;
      if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
      let q = Product.find(query);
      if (sort === 'price-asc') q = q.sort({ price: 1 });
      else if (sort === 'price-desc') q = q.sort({ price: -1 });
      else if (sort === 'rating') q = q.sort({ rating: -1 });
      const products = await q.lean();
      if (products.length > 0) return res.json(products.map(normalizeProductRecord).filter(Boolean));

      let fallbackProducts = getJsonCatalogProducts();
      if (category) fallbackProducts = fallbackProducts.filter(p => p.category === category);
      if (subcategory) fallbackProducts = fallbackProducts.filter(p => p.subcategory === subcategory);
      if (featured === 'true') fallbackProducts = fallbackProducts.filter(p => p.featured);
      if (search) fallbackProducts = fallbackProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      if (sort === 'price-asc') fallbackProducts.sort((a, b) => a.price - b.price);
      if (sort === 'price-desc') fallbackProducts.sort((a, b) => b.price - a.price);
      if (sort === 'rating') fallbackProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      return res.json(fallbackProducts);
    }
    let products = getJsonCatalogProducts();
    if (category) products = products.filter(p => p.category === category);
    if (subcategory) products = products.filter(p => p.subcategory === subcategory);
    if (featured === 'true') products = products.filter(p => p.featured);
    if (search) products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    if (useDB) {
      const p = await findProductById(req.params.id);
      if (!p) return res.status(404).json({ error: 'Product not found' });
      return res.json(normalizeProductRecord(p));
    }
    const products = getJsonCatalogProducts();
    const p = products.find(p => p.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json(p);
  } catch { res.status(404).json({ error: 'Product not found' }); }
});

app.post('/api/products', requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { name, category, subcategory, price, mrp, discount, stock, description, gstRate, hsn, featured } = req.body;
    let variants = [];
    if (req.body.variants) {
      try {
        variants = JSON.parse(req.body.variants);
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    }
    const images = req.files?.length
      ? await uploadMediaFiles(req.files, `products/${category || 'general'}`)
      : [getCategoryFallbackImage(category)];
    if (useDB) {
      const p = await Product.create({ name, category, subcategory, price: +price, mrp: +mrp, discount: +(discount || 0), stock: +stock, description, images, gstRate: +(gstRate || 18), hsn: hsn || '7117', featured: featured === 'true', variants });
      const products = readJson(FILES.products);
      products.push({ ...p.toObject(), id: p._id.toString() });
      writeJson(FILES.products, products);
      return res.json({ success: true, product: normalizeProductRecord({ ...p.toObject(), id: p._id.toString() }) });
    }
    const products = readJson(FILES.products);
    const p = { id: uuidv4(), name, category, subcategory, price: +price, mrp: +mrp, discount: +(discount || 0), stock: +stock, description, images, gstRate: +(gstRate || 18), hsn: hsn || '7117', featured: featured === 'true', rating: 0, reviews: [], createdAt: new Date().toISOString(), variants };
    products.push(p);
    writeJson(FILES.products, products);
    res.json({ success: true, product: normalizeProductRecord(p) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.variants) {
      try {
        updates.variants = JSON.parse(req.body.variants);
      } catch (e) {
        console.error('Error parsing variants in PUT:', e);
      }
    }
    if (req.files?.length) updates.images = await uploadMediaFiles(req.files, `products/${updates.category || 'general'}`);
    ['price', 'mrp', 'discount', 'stock', 'gstRate'].forEach(f => { if (updates[f] !== undefined) updates[f] = +updates[f]; });
    if (updates.featured !== undefined) updates.featured = updates.featured === 'true';
    // Handle removed images (sent as removedImages[] in form)
    const removed = [];
    if (Array.isArray(req.body.removedImages)) removed.push(...req.body.removedImages.filter(Boolean));
    else if (req.body.removedImages) removed.push(req.body.removedImages);
    if (useDB) {
      let p = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        p = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
      } else {
        await Product.collection.updateOne({ _id: req.params.id }, { $set: updates });
        p = await Product.collection.findOne({ _id: req.params.id });
      }
      if (!p) return res.status(404).json({ error: 'Not found' });
      // If images were removed, delete local files where applicable
      if (removed.length > 0) {
        await Promise.all(removed.map(async (img) => {
          try {
            if (String(img).startsWith('/uploads/')) {
              const fp = path.join(__dirname, img.replace('/uploads/', 'uploads/'));
              if (fs.existsSync(fp)) fs.unlinkSync(fp);
            } else if (hasCloudinaryConfig()) {
              // Best-effort: attempt to delete from Cloudinary by public_id if available
              // Note: Cloudinary deletion requires public_id; skipping for now if not configured
            }
          } catch (e) { /* ignore deletion errors */ }
        }));
      }
      const products = readJson(FILES.products);
      const idx = products.findIndex(item => item.id === req.params.id || item._id === req.params.id);
      const next = { ...p, id: (p._id || p.id).toString() };
      if (idx >= 0) products[idx] = { ...products[idx], ...next };
      else products.push(next);
      writeJson(FILES.products, products);
      return res.json({ success: true, product: normalizeProductRecord(next) });
    }
    const products = readJson(FILES.products);
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    // Remove images from JSON record and delete local files if needed
    if (removed.length > 0) {
      removed.forEach(img => {
        const iidx = products[idx].images ? products[idx].images.indexOf(img) : -1;
        if (iidx >= 0) products[idx].images.splice(iidx, 1);
        try {
          if (String(img).startsWith('/uploads/')) {
            const fp = path.join(__dirname, img.replace('/uploads/', 'uploads/'));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          }
        } catch (e) {}
      });
    }
    products[idx] = { ...products[idx], ...updates };
    writeJson(FILES.products, products);
    res.json({ success: true, product: normalizeProductRecord(products[idx]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    if (useDB) {
      // Delete product and remove any local media files
      let p = null;
      if (mongoose.Types.ObjectId.isValid(req.params.id)) {
        p = await Product.findByIdAndDelete(req.params.id);
      } else {
        p = await Product.collection.findOne({ _id: req.params.id });
        if (p) {
          await Product.collection.deleteOne({ _id: req.params.id });
        }
      }
      const products = readJson(FILES.products).filter(p => p.id !== req.params.id && p._id !== req.params.id);
      // Remove local files referenced by product.images
      if (p && Array.isArray(p.images)) {
        p.images.forEach(img => {
          try {
            if (String(img).startsWith('/uploads/')) {
              const fp = path.join(__dirname, img.replace('/uploads/', 'uploads/'));
              if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
          } catch (e) {}
        });
      }
      writeJson(FILES.products, products);
      return res.json({ success: true });
    }
    const products = readJson(FILES.products);
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
      const rem = products.splice(idx, 1)[0];
      if (rem && Array.isArray(rem.images)) {
        rem.images.forEach(img => {
          try {
            if (String(img).startsWith('/uploads/')) {
              const fp = path.join(__dirname, img.replace('/uploads/', 'uploads/'));
              if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
          } catch (e) {}
        });
      }
      writeJson(FILES.products, products);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CART ─────────────────────────────────────────────────────
app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    const uid = req.auth.userId;
    console.log('[CART] GET /api/cart for userId:', uid);
    
    if (useDB) {
      const cart = await Cart.findOne({ userId: uid });
      if (!cart) {
        console.log('[CART] No cart found for user, returning empty');
        return res.json({ items: [], count: 0 });
      }
      
      const enriched = await Promise.all((cart.items || []).map(async item => {
        const p = await findProductById(item.productId);
        if (!p) {
          console.log('[CART] Product not found:', item.productId);
          return null;
        }
        const cartItem = {
          productId: item.productId,
          quantity: item.quantity || 1,
          product: {
            ...p,
            id: (p._id || p.id).toString(),
            _id: (p._id || p.id).toString()
          }
        };
        return cartItem;
      }));
      
      const filtered = enriched.filter(Boolean);
      const count = filtered.reduce((sum, item) => sum + (item.quantity || 1), 0);
      console.log('[CART] Returning cart items:', filtered.length, 'total quantity:', count);
      return res.json({ items: filtered, count });
    }
    
    const carts = readJson(FILES.carts);
    const cart = carts.find(c => c.userId === uid) || { items: [] };
    const products = readJson(FILES.products);
    const enriched = cart.items.map(item => {
      const p = products.find(p => p.id === item.productId);
      if (!p) {
        console.log('[CART] Product not found in JSON:', item.productId);
        return null;
      }
      return { ...item, product: p };
    }).filter(Boolean);
    
    const count = enriched.reduce((sum, item) => sum + (item.quantity || 1), 0);
    console.log('[CART] JSON: Returning cart items:', enriched.length, 'total quantity:', count);
    res.json({ items: enriched, count });
  } catch (e) { 
    console.error('[CART] GET Error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

app.post('/api/cart/add', requireAuth, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const uid = req.auth.userId;
    console.log('[CART] POST /api/cart/add:', { productId, quantity, userId: uid });
    
    if (useDB) {
      let cart = await Cart.findOne({ userId: uid });
      if (!cart) {
        console.log('[CART] Creating new cart for user');
        cart = await Cart.create({ userId: uid, items: [] });
      }
      
      const idx = cart.items.findIndex(i => i.productId.toString() === productId.toString());
      if (idx > -1) {
        cart.items[idx].quantity = (cart.items[idx].quantity || 1) + parseInt(quantity, 10);
        console.log('[CART] Updated quantity:', cart.items[idx]);
      } else {
        cart.items.push({ productId, quantity: parseInt(quantity, 10) });
        console.log('[CART] Added new item');
      }
      
      await cart.save();
      const totalQty = cart.items.reduce((sum, i) => sum + i.quantity, 0);
      console.log('[CART] Saved. Total quantity:', totalQty);
      return res.json({ success: true, count: totalQty, itemCount: cart.items.length });
    }
    
    const carts = readJson(FILES.carts);
    let ci = carts.findIndex(c => c.userId === uid);
    if (ci === -1) { 
      console.log('[CART] Creating new cart for user (JSON)');
      carts.push({ userId: uid, items: [] }); 
      ci = carts.length - 1; 
    }
    
    const ii = carts[ci].items.findIndex(i => i.productId === productId);
    if (ii > -1) {
      carts[ci].items[ii].quantity = (carts[ci].items[ii].quantity || 1) + parseInt(quantity, 10);
      console.log('[CART] Updated quantity (JSON)');
    } else {
      carts[ci].items.push({ productId, quantity: parseInt(quantity, 10) });
      console.log('[CART] Added new item (JSON)');
    }
    
    writeJson(FILES.carts, carts);
    const totalQty = carts[ci].items.reduce((sum, i) => sum + i.quantity, 0);
    res.json({ success: true, count: totalQty, itemCount: carts[ci].items.length });
  } catch (e) { 
    console.error('[CART] POST Error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

app.put('/api/cart/update', requireAuth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const uid = req.auth.userId;
    if (useDB) {
      const cart = await Cart.findOne({ userId: uid });
      if (!cart) return res.status(404).json({ error: 'Cart not found' });
      if (+quantity <= 0) cart.items = cart.items.filter(i => i.productId !== productId);
      else { const idx = cart.items.findIndex(i => i.productId === productId); if (idx > -1) cart.items[idx].quantity = +quantity; }
      await cart.save(); return res.json({ success: true });
    }
    const carts = readJson(FILES.carts);
    const ci = carts.findIndex(c => c.userId === uid);
    if (ci === -1) return res.status(404).json({ error: 'Cart not found' });
    if (+quantity <= 0) carts[ci].items = carts[ci].items.filter(i => i.productId !== productId);
    else { const ii = carts[ci].items.findIndex(i => i.productId === productId); if (ii > -1) carts[ci].items[ii].quantity = +quantity; }
    writeJson(FILES.carts, carts); res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cart/:productId', requireAuth, async (req, res) => {
  try {
    const uid = req.auth.userId;
    if (useDB) {
      await Cart.findOneAndUpdate({ userId: uid }, { $pull: { items: { productId: req.params.productId } } });
      return res.json({ success: true });
    }
    const carts = readJson(FILES.carts);
    const ci = carts.findIndex(c => c.userId === uid);
    if (ci > -1) { carts[ci].items = carts[ci].items.filter(i => i.productId !== req.params.productId); writeJson(FILES.carts, carts); }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cart', requireAuth, async (req, res) => {
  try {
    const uid = req.auth.userId;
    if (useDB) { await Cart.findOneAndUpdate({ userId: uid }, { items: [] }); return res.json({ success: true }); }
    const carts = readJson(FILES.carts);
    const ci = carts.findIndex(c => c.userId === uid);
    if (ci > -1) { carts[ci].items = []; writeJson(FILES.carts, carts); }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── WISHLIST ─────────────────────────────────────────────────
app.get('/api/wishlist', requireAuth, async (req, res) => {
  try {
    const uid = req.auth.userId;
    console.log('[WISHLIST] GET /api/wishlist for userId:', uid);
    
    if (useDB) {
      const wl = await Wishlist.findOne({ userId: uid });
      if (!wl || !wl.items || wl.items.length === 0) {
        console.log('[WISHLIST] Empty wishlist for user');
        return res.json([]);
      }
      
      const products = await findProductsByIds(wl.items);
      const result = products.map(p => ({
        ...p,
        id: (p._id || p.id).toString(),
        _id: (p._id || p.id).toString()
      }));
      console.log('[WISHLIST] Returning', result.length, 'items');
      return res.json(result);
    }
    
    const wl = (readJson(FILES.wishlists).find(w => w.userId === uid) || { items: [] });
    if (!wl.items || wl.items.length === 0) {
      console.log('[WISHLIST] Empty wishlist for user (JSON)');
      return res.json([]);
    }
    
    const products = readJson(FILES.products);
    const result = wl.items.map(id => products.find(p => p.id === id)).filter(Boolean);
    console.log('[WISHLIST] JSON: Returning', result.length, 'items');
    res.json(result);
  } catch (e) { 
    console.error('[WISHLIST] GET Error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

app.post('/api/wishlist/toggle', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    const uid = req.auth.userId;
    if (useDB) {
      let wl = await Wishlist.findOne({ userId: uid });
      if (!wl) wl = await Wishlist.create({ userId: uid, items: [] });
      const idx = wl.items.indexOf(productId);
      if (idx > -1) { wl.items.splice(idx, 1); await wl.save(); return res.json({ added: false }); }
      wl.items.push(productId); await wl.save(); return res.json({ added: true });
    }
    const wishlists = readJson(FILES.wishlists);
    let wi = wishlists.findIndex(w => w.userId === uid);
    if (wi === -1) { wishlists.push({ userId: uid, items: [] }); wi = wishlists.length - 1; }
    const ii = wishlists[wi].items.indexOf(productId);
    if (ii > -1) { wishlists[wi].items.splice(ii, 1); writeJson(FILES.wishlists, wishlists); return res.json({ added: false }); }
    wishlists[wi].items.push(productId); writeJson(FILES.wishlists, wishlists); res.json({ added: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ORDERS ───────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  try {
    const { address, paymentMethod, items, couponCode, clearCart = true } = req.body;
    const authContext = getAuthContext(req);
    const incomingName = String(req.body.name || req.body.userName || req.session?.name || '').trim();
    const globalDiscount = await getSetting('globalDiscount', 0);
    const freeShipMin = await getSetting('freeShippingMin', 999);
    const shipCharge = await getSetting('shippingCharge', 49);

    if (!address || !paymentMethod || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing checkout details' });
    }

    let subtotal = 0, totalGst = 0;
    const orderItems = await Promise.all(items.map(async item => {
      let p;
      if (useDB) { p = await findProductById(item.productId); if (p) p.id = (p._id || p.id).toString(); }
      else { p = (readJson(FILES.products)).find(pr => pr.id === item.productId); }
      if (!p) throw new Error('Product not found');
      const gstAmt = (p.price * p.gstRate / 100) * item.quantity;
      subtotal += p.price * item.quantity; totalGst += gstAmt;
      return { productId: p.id || p._id, name: p.name, image: p.images[0], price: p.price, mrp: p.mrp, quantity: item.quantity, gstRate: p.gstRate, hsn: p.hsn, gstAmount: gstAmt, total: p.price * item.quantity };
    }));

    // Coupon discount
    const coupons = { 'FIRST10': { discount: 10, type: 'percent', minOrder: 199 }, 'SAVE50': { discount: 50, type: 'flat', minOrder: 499 }, 'LENCHO20': { discount: 20, type: 'percent', minOrder: 999 } };
    const coupon = coupons[couponCode?.toUpperCase()];
    let couponDiscount = coupon ? (coupon.type === 'percent' ? Math.round(subtotal * coupon.discount / 100) : coupon.discount) : 0;
    // Global discount (admin set)
    let adminDiscount = globalDiscount > 0 ? Math.round(subtotal * globalDiscount / 100) : 0;
    const discount = couponDiscount + adminDiscount;
    const shipping = subtotal >= freeShipMin ? 0 : shipCharge;
    const grandTotal = subtotal + totalGst + shipping - discount;
    const orderId = 'LEN' + Date.now().toString().slice(-8).toUpperCase();

    const isCOD = paymentMethod === 'cod';
    const status = isCOD ? 'placed' : 'awaiting_payment';
    const timeline = isCOD 
      ? [{ status: 'placed', label: 'Order Placed', date: new Date(), done: true }]
      : [{ status: 'pending', label: 'Awaiting Payment', date: new Date(), done: true }];

    // Ensure we always have a userName for order records (avoid validation errors when session.name missing)
    let resolvedUserName = incomingName;
    if (!resolvedUserName && authContext.userId) {
      try {
        if (useDB) {
          const u = await User.findById(authContext.userId).select('name').lean();
          if (u && u.name) resolvedUserName = u.name;
        } else {
          const users = readJson(FILES.users);
          const uu = users.find(x => x.id === authContext.userId || x._id === authContext.userId);
          if (uu && uu.name) resolvedUserName = uu.name;
        }
      } catch (e) { /* ignore and fallback */ }
    }
    if (!resolvedUserName) resolvedUserName = 'Customer';

    const resolvedUserId = authContext.userId || `guest-${orderId.toLowerCase()}`;

    const orderData = { 
      id: orderId, userId: resolvedUserId, userName: resolvedUserName, items: orderItems, 
      address, paymentMethod, subtotal, gstTotal: totalGst, shipping, discount, grandTotal, 
      couponCode: couponCode || null, status, timeline, 
      clearCart: clearCart === true || clearCart === 'true',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), createdAt: new Date() 
    };

    if (useDB) {
      await Order.create(orderData);
      if (authContext.userId && isCOD && orderData.clearCart) await Cart.findOneAndUpdate({ userId: authContext.userId }, { items: [] });
    } else {
      const orders = readJson(FILES.orders); orders.push(orderData); writeJson(FILES.orders, orders);
      if (authContext.userId && isCOD && orderData.clearCart) {
        const carts = readJson(FILES.carts); const ci = carts.findIndex(c => c.userId === authContext.userId);
        if (ci > -1) { carts[ci].items = []; writeJson(FILES.carts, carts); }
      }
    }
    res.json({ success: true, order: orderData });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/my', requireAuth, async (req, res) => {
  try {
    if (useDB) {
      const orders = await Order.find({ userId: req.auth.userId }).sort({ createdAt: -1 }).lean();
      return res.json(orders.map(o => ({ ...o, id: o.id || o._id })));
    }
    res.json(readJson(FILES.orders).filter(o => o.userId === req.auth.userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    if (useDB) {
      const o = await Order.findOne({ id: req.params.orderId.toUpperCase() }).lean();
      if (!o) return res.status(404).json({ error: 'Order not found' });
      const { userId, userName, address, ...safe } = o;
      return res.json({ ...safe, id: o.id || o._id });
    }
    const o = readJson(FILES.orders).find(o => o.id === req.params.orderId.toUpperCase());
    if (!o) return res.status(404).json({ error: 'Order not found' });
    const { userId, userName, address, ...safe } = o;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    if (useDB) {
      const o = await Order.findOne({ $or: [{ _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }, { id: req.params.id }] }).lean();
      if (!o || (o.userId.toString() !== req.auth.userId && req.auth.role !== 'admin')) return res.status(404).json({ error: 'Not found' });
      return res.json({ ...o, id: o.id || o._id });
    }
    const o = readJson(FILES.orders).find(o => o.id === req.params.id && (o.userId === req.auth.userId || req.auth.role === 'admin'));
    if (!o) return res.status(404).json({ error: 'Not found' });
    res.json(o);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/:id/invoice', requireAuth, async (req, res) => {
  try {
    let order;
    if (useDB) {
      order = await Order.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }] }).lean();
    } else {
      order = readJson(FILES.orders).find(o => o.id === req.params.id);
    }
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId.toString() !== req.auth.userId && req.auth.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const gstin = await getSetting('gstin', '27XXXXX1234X1ZX');
    const storeName = await getSetting('storeName', 'Lencho');
    const storeEmail = await getSetting('storeEmail', 'hello@lencho.in');
    const storePhone = await getSetting('storePhone', '+91 9876543210');
    const invoice = {
      invoiceNo: 'INV-' + (order.id || order._id),
      invoiceDate: new Date(order.createdAt).toLocaleDateString('en-IN'),
      seller: { name: storeName, gstin, address: 'Mumbai, Maharashtra - 400001', phone: storePhone, email: storeEmail },
      buyer: { name: order.userName, phone: '', address: order.address },
      items: order.items.map(item => {
        const cgst = item.gstRate / 2, sgst = item.gstRate / 2;
        const taxableValue = item.price * item.quantity;
        return { ...item, taxableValue, cgst, sgst, cgstAmt: taxableValue * cgst / 100, sgstAmt: taxableValue * sgst / 100 };
      }),
      subtotal: order.subtotal, totalCgst: order.gstTotal / 2, totalSgst: order.gstTotal / 2,
      totalGst: order.gstTotal, shipping: order.shipping, discount: order.discount,
      grandTotal: order.grandTotal, paymentMethod: order.paymentMethod, orderId: order.id || order._id
    };
    res.json(invoice);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── COUPON ───────────────────────────────────────────────────
app.post('/api/coupon/validate', (req, res) => {
  const { code, amount } = req.body;
  const coupons = { 'FIRST10': { discount: 10, type: 'percent', minOrder: 199 }, 'SAVE50': { discount: 50, type: 'flat', minOrder: 499 }, 'LENCHO20': { discount: 20, type: 'percent', minOrder: 999 } };
  const coupon = coupons[code?.toUpperCase()];
  if (!coupon) return res.status(400).json({ error: 'Invalid coupon code' });
  if (amount < coupon.minOrder) return res.status(400).json({ error: `Minimum order ₹${coupon.minOrder} required` });
  const discountAmt = coupon.type === 'percent' ? Math.round(amount * coupon.discount / 100) : coupon.discount;
  res.json({ valid: true, discountAmt, coupon });
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    if (useDB) {
      const [orders, users, products, visitorCounter, storeVisitorCounter] = await Promise.all([
        Order.find().lean(),
        User.find({ role: 'user' }).lean(),
        Product.find().lean(),
        Settings.findOne({ key: 'siteVisitorCount' }).lean(),
        Settings.findOne({ key: 'storeVisitorCount' }).lean()
      ]);
      const today = new Date().toDateString();
      const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
      const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
      return res.json({
        totalOrders: orders.length, totalRevenue: orders.reduce((s, o) => s + o.grandTotal, 0),
        todayOrders: todayOrders.length, todayRevenue: todayOrders.reduce((s, o) => s + o.grandTotal, 0),
        totalUsers: users.length, totalProducts: products.length,
        totalGstCollected: orders.reduce((s, o) => s + (o.gstTotal || 0), 0),
        totalVisitors: Number(visitorCounter?.value) || 0,
        storeVisitors: Number(storeVisitorCounter?.value) || 0,
        statusCounts, recentOrders: orders.slice(-5).reverse()
      });
    }
    const orders = readJson(FILES.orders), users = readJson(FILES.users).filter(u => u.role !== 'admin'), products = readJson(FILES.products);
    const today = new Date().toDateString(), todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
    const visitorStats = getFallbackVisitorStats();
    res.json({ totalOrders: orders.length, totalRevenue: orders.reduce((s, o) => s + o.grandTotal, 0), todayOrders: todayOrders.length, todayRevenue: todayOrders.reduce((s, o) => s + o.grandTotal, 0), totalUsers: users.length, totalProducts: products.length, totalGstCollected: orders.reduce((s, o) => s + (o.gstTotal || 0), 0), totalVisitors: visitorStats.totalVisitors, storeVisitors: visitorStats.storeVisitors, statusCounts, recentOrders: orders.slice(-5).reverse() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── INQUIRY ROUTES ───────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    fs.appendFileSync('inquiry_debug.log', `${new Date().toISOString()} - Received inquiry from ${email} (${phone || 'No Phone'})\n`);
    if (!name || !email || !message) return res.status(400).json({ error: 'All fields are required' });
    
    if (useDB) {
      await Inquiry.create({ name, email, phone, message });
    } else {
      const inquiries = readJson(FILES.inquiries);
      inquiries.unshift({
        _id: uuidv4(),
        name,
        email,
        phone: phone || '',
        message,
        status: 'new',
        createdAt: new Date().toISOString(),
      });
      writeJson(FILES.inquiries, inquiries);
    }

    // Notify Admin via Email
    try {
      const host = await getSetting('smtpHost', 'smtp.gmail.com');
      const port = await getSetting('smtpPort', 465);
      const user = await getSetting('smtpUser', '');
      const pass = await getSetting('smtpPass', '');
      const storeEmail = await getSetting('storeEmail', 'rupanshsaini17@gmail.com');

      if (user && pass) {
        const transporter = nodemailer.createTransport({
          host, port: +port, secure: +port === 465,
          auth: { user, pass }
        });
        await transporter.sendMail({
          from: `"Lencho System" <${user}>`,
          to: storeEmail,
          subject: '🔔 New Customer Inquiry - Lencho India',
          html: `
            <div style="font-family:sans-serif;padding:2rem;border:1px solid #eee;border-radius:12px;">
              <h2 style="color:#c9748f;">New Message Recieved</h2>
              <p><b>From:</b> ${name} (${email})</p>
              <p><b>Phone:</b> ${phone || 'Not provided'}</p>
              <p><b>Message:</b></p>
              <div style="background:#f9f9f9;padding:1rem;border-radius:8px;">${message}</div>
              <p style="margin-top:1.5rem;"><a href="${req.headers.origin}/admin" style="color:#c9748f;font-weight:700;text-decoration:none;">View in Admin Panel →</a></p>
            </div>
          `
        });
      }
    } catch (err) { console.error('Inquiry Email Notify Error:', err.message); }

    res.json({ success: true, message: 'Inquiry received' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/inquiries', requireAdmin, async (req, res) => {
  try {
    const inquiries = useDB
      ? await Inquiry.find().sort({ createdAt: -1 })
      : readJson(FILES.inquiries).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(inquiries);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    if (useDB) await Inquiry.findByIdAndDelete(req.params.id);
    else {
      const inquiries = readJson(FILES.inquiries).filter(i => String(i._id) !== String(req.params.id));
      writeJson(FILES.inquiries, inquiries);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── UPDATE INQUIRY STATUS ────────────────────────────────────
app.put('/api/admin/inquiries/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const validStatuses = ['new', 'read', 'replied'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: new, read, replied' });
    }
    
    if (useDB) {
      const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
      return res.json({ success: true, inquiry });
    }
    
    const inquiries = readJson(FILES.inquiries);
    const idx = inquiries.findIndex(i => String(i._id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Inquiry not found' });
    
    inquiries[idx].status = status;
    writeJson(FILES.inquiries, inquiries);
    res.json({ success: true, inquiry: inquiries[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── ADMIN TOOLS ──────────────────────────────────────────────
app.put('/api/admin/clear-data', requireAdmin, async (req, res) => {
  try {
    if (!useDB) return res.status(400).json({ error: 'Database not connected' });
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Wishlist.deleteMany({});
    await Inquiry.deleteMany({});
    res.json({ success: true, message: 'All test data cleared!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/orders/:id/label-branded', requireAdmin, async (req, res) => {
  try {
    if (!useDB) return res.status(400).json({ error: 'Database not connected' });
    const order = await Order.findOne({ id: req.params.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const labelHTML = `
      <!DOCTYPE html><html><head><title>Label - ${order.id}</title>
      <style>
        body { font-family: 'Inter', sans-serif; padding: 20px; }
        .label-card { width: 100mm; height: 150mm; border: 2px solid #000; padding: 15px; background: #fff; position: relative; }
        .logo { font-size: 24px; font-weight: 800; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
        .section { margin-bottom: 12px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
        .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: 700; }
        .value { font-size: 14px; font-weight: 600; line-height: 1.4; }
        .barcode { text-align: center; margin-top: 20px; border: 2px solid #000; padding: 10px; font-weight: 800; }
      </style>
      </head><body>
      <div class="label-card">
        <div class="logo"><span>✦ LENCHO ✦</span><span>SHIPROCKET AWB</span></div>
        <div class="section"><div class="label">SHIP TO:</div><div class="value">${order.userName}<br/>${order.address}</div></div>
        <div class="section"><div class="label">ORDER ID:</div><div class="value">${order.id}</div></div>
        <div class="section"><div class="label">PAYMENT:</div><div class="value">${order.paymentMethod.toUpperCase()} (₹${order.grandTotal})</div></div>
        <div class="barcode">*${order.id}*<br/><small>AWB: ${order.awbCode || 'PENDING'}</small></div>
        <div style="position:absolute;bottom:15px;font-size:10px;">Lencho India - Luxury Redefined</div>
      </div>
      <script>window.onload = () => window.print();</script>
      </body></html>
    `;
    res.send(labelHTML);
  } catch (e) { res.status(500).send('Error'); }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    if (useDB) { const o = await Order.find().sort({ createdAt: -1 }).lean(); return res.json(o.map(o => ({ ...o, id: o.id || o._id }))); }
    res.json(readJson(FILES.orders).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, deliveryPartner, trackingNumber } = req.body;
    const rawStatus = String(status || '').trim().toLowerCase();
    const statusAliases = {
      on_hold: 'hold',
      placed: 'pending',
      confirmed: 'pending',
      shipped: 'shipping',
      out_for_delivery: 'shipping',
      shiping: 'shipping'
    };
    const normalizedStatus = statusAliases[rawStatus] || rawStatus;
    const allowedStatuses = new Set(['hold', 'pending', 'shipping', 'delivered', 'cancelled']);
    if (!allowedStatuses.has(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid status. Allowed: hold, pending, shipping, delivered, cancelled' });
    }

    const statusLabels = {
      hold: 'On Hold',
      pending: 'Pending',
      shipping: 'Shipping',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    const timelineEntry = {
      status: normalizedStatus,
      label: statusLabels[normalizedStatus] || normalizedStatus,
      date: new Date(),
      done: true
    };
    if (useDB) {
      const o = await Order.findOne({ $or: [{ id: req.params.id }, { _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }] });
      if (!o) return res.status(404).json({ error: 'Not found' });
      o.status = normalizedStatus;
      if (deliveryPartner) o.deliveryPartner = deliveryPartner;
      if (trackingNumber) o.trackingNumber = trackingNumber;
      if (!o.timeline.find(t => t.status === normalizedStatus)) o.timeline.push(timelineEntry);
      await o.save();
      return res.json({ success: true, order: { ...o.toObject(), id: o.id || o._id } });
    }
    const orders = readJson(FILES.orders), idx = orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    orders[idx].status = normalizedStatus;
    if (deliveryPartner) orders[idx].deliveryPartner = deliveryPartner;
    if (trackingNumber) orders[idx].trackingNumber = trackingNumber;
    if (!orders[idx].timeline?.find(t => t.status === normalizedStatus)) (orders[idx].timeline = orders[idx].timeline || []).push(timelineEntry);
    writeJson(FILES.orders, orders); res.json({ success: true, order: orders[idx] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── DELETE ORDER ─────────────────────────────────────────────
app.delete('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  try {
    if (useDB) {
      const deleted = await Order.findOneAndDelete({ $or: [{ id: req.params.id }, { _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }] });
      if (!deleted) return res.status(404).json({ error: 'Order not found' });
      console.log(`✅ Order deleted: ${req.params.id}`);
      return res.json({ success: true, message: `Order ${req.params.id} deleted` });
    }
    
    const orders = readJson(FILES.orders);
    const idx = orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Order not found' });
    
    const deletedOrder = orders.splice(idx, 1)[0];
    writeJson(FILES.orders, orders);
    console.log(`✅ Order deleted: ${req.params.id}`);
    res.json({ success: true, message: `Order ${req.params.id} deleted` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    if (useDB) {
      const { q = '', authProvider = '', verified = '', blocked = '' } = req.query || {};
      const filter = {};
      if (authProvider) filter.authProvider = authProvider;
      if (verified === 'true') filter.isVerified = true;
      if (verified === 'false') filter.isVerified = false;
      if (blocked === 'true') filter.isBlocked = true;
      if (blocked === 'false') filter.isBlocked = false;

      const users = await User.find(filter).select('-password -otp').sort({ createdAt: -1 }).lean();
      const normalized = users.map(user => ({
        ...user,
        id: user._id?.toString?.() || user.id,
      })).filter(user => {
        const term = String(q || '').trim().toLowerCase();
        if (!term) return true;
        return [user.name, user.email, user.phone, user.gender, user.authProvider]
          .some(value => String(value || '').toLowerCase().includes(term));
      });

      return res.json({
        success: true,
        users: normalized,
        summary: {
          total: normalized.length,
          verified: normalized.filter(user => user.isVerified).length,
          blocked: normalized.filter(user => user.isBlocked).length,
          providers: normalized.reduce((acc, user) => {
            const key = user.authProvider || 'email';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {})
        }
      });
    }

    const users = readJson(FILES.users).map(({ password, ...u }) => ({
      ...u,
      id: u.id || u._id,
      authProvider: u.authProvider || 'email',
      isVerified: u.isVerified !== false,
      isBlocked: !!u.isBlocked,
      loginCount: u.loginCount || 0,
      lastLoginAt: u.lastLoginAt || null
    }));
    return res.json({
      success: true,
      users,
      summary: {
        total: users.length,
        verified: users.filter(user => user.isVerified).length,
        blocked: users.filter(user => user.isBlocked).length,
        providers: users.reduce((acc, user) => {
          const key = user.authProvider || 'email';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    if (useDB) { await User.findOneAndDelete({ _id: req.params.id, role: { $ne: 'admin' } }); return res.json({ success: true }); }
    const u = readJson(FILES.users).filter(u => u.id !== req.params.id || u.role === 'admin');
    writeJson(FILES.users, u); res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:id/block', requireAdmin, async (req, res) => {
  try {
    const nextBlocked = Boolean(req.body?.blocked);
    if (useDB) {
      const user = await User.findOneAndUpdate(
        { _id: req.params.id, role: { $ne: 'admin' } },
        { $set: { isBlocked: nextBlocked } },
        { new: true }
      ).select('-password -otp');
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ success: true, user: { ...user.toObject(), id: user._id.toString() } });
    }

    const users = readJson(FILES.users);
    const index = users.findIndex(user => String(user.id) === String(req.params.id));
    if (index === -1 || users[index].role === 'admin') return res.status(404).json({ error: 'User not found' });
    users[index].isBlocked = nextBlocked;
    writeJson(FILES.users, users);
    return res.json({ success: true, user: { ...users[index] } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/gst-report', requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    let orders;
    if (useDB) {
      let q = {};
      if (month && year) q = { createdAt: { $gte: new Date(+year, +month - 1, 1), $lt: new Date(+year, +month, 1) } };
      orders = await Order.find(q).lean();
    } else {
      orders = readJson(FILES.orders);
      if (month && year) orders = orders.filter(o => { const d = new Date(o.createdAt); return d.getMonth() + 1 === +month && d.getFullYear() === +year; });
    }
    const report = orders.map(o => ({ orderId: o.id || o._id, date: new Date(o.createdAt).toLocaleDateString('en-IN'), customerName: o.userName, grandTotal: o.grandTotal, taxableAmount: o.subtotal, cgst: (o.gstTotal || 0) / 2, sgst: (o.gstTotal || 0) / 2, totalGst: o.gstTotal || 0, paymentMethod: o.paymentMethod }));
    const totals = report.reduce((acc, r) => ({ grandTotal: acc.grandTotal + r.grandTotal, taxableAmount: acc.taxableAmount + r.taxableAmount, cgst: acc.cgst + r.cgst, sgst: acc.sgst + r.sgst, totalGst: acc.totalGst + r.totalGst }), { grandTotal: 0, taxableAmount: 0, cgst: 0, sgst: 0, totalGst: 0 });
    res.json({ report, totals, count: report.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/change-credentials', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword, name } = req.body;
    if (useDB) {
      const user = await User.findById(req.auth.userId);
      if (!user || !await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({ error: 'Current password is incorrect' });
      if (newEmail && newEmail !== user.email) { if (await User.findOne({ email: newEmail })) return res.status(400).json({ error: 'Email in use' }); user.email = newEmail; }
      if (name) user.name = name;
      if (newPassword && newPassword.length >= 6) user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      const { password, ...safe } = user.toObject();
      return res.json({ success: true, user: { id: user._id, ...safe } });
    }
    const users = readJson(FILES.users), idx = users.findIndex(u => u.id === req.auth.userId);
    if (idx === -1 || !await bcrypt.compare(currentPassword, users[idx].password)) return res.status(400).json({ error: 'Current password galat hai' });
    if (newEmail && newEmail !== users[idx].email) {
      const dup = users.find(u => u.email === newEmail);
      if (dup) return res.status(400).json({ error: 'Email in use' });
      users[idx].email = newEmail;
    }
    if (name) users[idx].name = name;
    if (newPassword && newPassword.length >= 6) users[idx].password = await bcrypt.hash(newPassword, 10);
    writeJson(FILES.users, users);
    if (req.session) req.session.name = users[idx].name;
    const { password, ...safe } = users[idx];
    res.json({ success: true, user: safe });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AI FEATURES ──────────────────────────────────────────────
app.get('/api/ai/recommendations', async (req, res) => {
  try {
    const { productId, category, limit = 6 } = req.query;
    let products;
    if (useDB) { products = (await Product.find().lean()).map(p => ({ ...p, id: p._id })); }
    else { products = readJson(FILES.products); }
    const source = products.find(p => p.id?.toString() === productId || p._id?.toString() === productId);
    let recommended = [];
    if (source) {
      recommended = products.filter(p => p.id?.toString() !== productId && p._id?.toString() !== productId)
        .map(p => ({ ...p, score: (p.category === source.category ? 40 : 0) + (p.price >= source.price * 0.5 && p.price <= source.price * 1.5 ? 30 : 0) + (p.rating >= 4 ? 20 : 0) + (p.featured ? 10 : 0) }))
        .sort((a, b) => b.score - a.score).slice(0, +limit);
    } else {
      recommended = products.filter(p => p.featured || p.rating >= 4).sort((a, b) => (b.rating * 10) - (a.rating * 10)).slice(0, +limit);
    }
    res.json(recommended);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const query = q.toLowerCase().trim();
    if (useDB) {
      const products = await Product.find({ $or: [{ name: { $regex: query, $options: 'i' } }, { category: { $regex: query, $options: 'i' } }, { description: { $regex: query, $options: 'i' } }] }).limit(10).lean();
      return res.json(products.map(p => ({ ...p, id: p._id })));
    }
    const products = readJson(FILES.products);
    res.json(products.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)).slice(0, 10));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ai/trending', async (req, res) => {
  try {
    let products, orders;
    if (useDB) {
      products = (await Product.find().lean()).map(p => ({ ...p, id: p._id }));
      orders = await Order.find().lean();
    } else { products = readJson(FILES.products); orders = readJson(FILES.orders); }
    const orderCount = {};
    orders.forEach(o => o.items?.forEach(i => { orderCount[i.productId] = (orderCount[i.productId] || 0) + i.quantity; }));
    res.json(products.map(p => ({ ...p, _orders: orderCount[p.id?.toString()] || 0 })).sort((a, b) => (b._orders * 2 + b.rating * 10) - (a._orders * 2 + a.rating * 10)).slice(0, 8));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── GOOGLE OAUTH ROUTE ──────────────────────────────────────
app.post('/api/auth/firebase/google', async (req, res) => {
  try {
    const { email, name, picture, googleId, idToken, firebaseUid } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    console.log('[GoogleAuth] Request received:', { email, name: name?.slice(0, 20), hasIdToken: !!idToken, hasFirebaseUid: !!firebaseUid });

    // Try to verify the Firebase ID token (returns null if token is missing or unverifiable)
    let verifiedGoogle = null;
    if (idToken) {
      try {
        verifiedGoogle = await verifyGoogleIdToken(idToken);
        console.log('[GoogleAuth] Token verification:', verifiedGoogle ? 'success' : 'fell back to client data');
      } catch (tokenErr) {
        console.warn('[GoogleAuth] Token verification error (non-fatal):', tokenErr.message);
      }
    }

    // Use verified data if available, otherwise trust client-provided Firebase Auth data
    const finalEmail = verifiedGoogle?.email || email;
    const finalName = verifiedGoogle?.name || name;
    const finalPicture = verifiedGoogle?.picture || picture;
    const finalGoogleId = verifiedGoogle?.googleId || firebaseUid || googleId;

    if (!finalEmail) {
      console.error('[GoogleAuth] No email provided');
      return res.status(400).json({ error: 'Email is required from Google' });
    }

    console.log('[GoogleAuth] Processing login for:', finalEmail);
    
    let user;
    if (useDB) {
      user = await User.findOne({ email: finalEmail }).lean();
      if (!user) {
        console.log('[GoogleAuth] Creating new user:', finalEmail);
        const newUser = new User({ 
          name: finalName || finalEmail.split('@')[0], 
          email: finalEmail, 
          password: 'GOOGLE_' + (finalGoogleId || Date.now()),
          googleId: finalGoogleId,
          avatar: finalPicture,
          role: 'user',
          verified: true,
          phone: ''
        });
        await newUser.save();
        user = newUser.toObject();
        console.log('[GoogleAuth] New user created:', user._id);
      } else {
        console.log('[GoogleAuth] Existing user found:', user._id);
        // Update googleId and avatar if missing
        if ((!user.googleId && finalGoogleId) || (!user.avatar && finalPicture)) {
          await User.updateOne({ _id: user._id }, { $set: { googleId: finalGoogleId || user.googleId, avatar: finalPicture || user.avatar } });
        }
      }
    } else {
      const users = readJson(FILES.users);
      user = users.find(u => u.email === finalEmail);
      if (!user) {
        user = { 
          id: Date.now().toString(), 
          name: finalName || finalEmail.split('@')[0], 
          email: finalEmail, googleId: finalGoogleId, 
          role: 'user', 
          verified: true 
        };
        users.push(user);
        writeJson(FILES.users, users);
      }
    }
    
    const userId = user._id?.toString() || user.id;
    req.session.userId = userId;
    req.session.role = user.role || 'user';
    const userName = user.name || finalName || finalEmail.split('@')[0] || 'User';
    await recordLoginActivity({ email: finalEmail, name: userName, status: 'success', method: 'google', role: user.role || 'user', ip, userAgent });
    
    const responsePayload = { 
      success: true,
      token: generateToken(userId, user.role || 'user'),
      user: { 
        id: userId, 
        name: user.name || finalName, 
        email: user.email, 
        role: user.role || 'user', 
        avatar: user.avatar || finalPicture 
      } 
    };
    console.log('[GoogleAuth] Login successful:', { userId, email: finalEmail, role: user.role || 'user' });
    res.json(responsePayload);
  } catch (e) { 
    console.error('[GoogleAuth] Error:', e.message, e.stack?.slice(0, 300));
    try {
      await recordLoginActivity({ email: req.body?.email || '', status: 'failed', method: 'google', role: 'user', ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'] || '' });
    } catch (_) {}
    res.status(500).json({ error: 'Google login failed: ' + e.message }); 
  }
});

// ─── SETTINGS API (before page wildcards!) ────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    res.json(await getPublicSettingsObject());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updates = extractSettingsUpdates(req.body);
    if (!updates.length) return res.status(400).json({ error: 'No settings provided' });

    if (!useDB) {
      const nextSettings = getFallbackSettingsObject();
      for (const item of updates) nextSettings[item.key] = item.value;
      saveFallbackSettingsObject(nextSettings);
      return res.json({ success: true, message: 'Settings saved!' });
    }

    for (const item of updates) {
      await Settings.findOneAndUpdate({ key: item.key }, { value: item.value }, { upsert: true, new: true });
    }
    res.json({ success: true, message: 'Settings saved!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── CMS PAGE MANAGEMENT ──────────────────────────────────────
// Get CMS pages
app.get('/api/cms/:pageType', async (req, res) => {
  try {
    const pageType = req.params.pageType.toLowerCase();
    const allowedPages = ['terms', 'privacy', 'disclaimer'];
    if (!allowedPages.includes(pageType)) {
      return res.status(400).json({ error: 'Invalid page type' });
    }

    if (useDB) {
      const settings = await Settings.findOne({ key: `cms_${pageType}` });
      if (settings) {
        return res.json({ content: settings.value || '' });
      }
    } else {
      const settingsObj = getFallbackSettingsObject();
      const content = settingsObj[`cms_${pageType}`];
      if (content) {
        return res.json({ content });
      }
    }

    res.json({ content: '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update CMS pages (admin only)
app.post('/api/admin/cms/:pageType', requireAdmin, async (req, res) => {
  try {
    const pageType = req.params.pageType.toLowerCase();
    const { content } = req.body;
    const allowedPages = ['terms', 'privacy', 'disclaimer'];
    
    if (!allowedPages.includes(pageType)) {
      return res.status(400).json({ error: 'Invalid page type' });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a non-empty string' });
    }

    if (useDB) {
      await Settings.findOneAndUpdate(
        { key: `cms_${pageType}` },
        { value: content },
        { upsert: true, new: true }
      );
    } else {
      const settingsObj = getFallbackSettingsObject();
      settingsObj[`cms_${pageType}`] = content;
      saveFallbackSettingsObject(settingsObj);
    }

    res.json({ success: true, message: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} page updated` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── BACKUP & VISITOR MANAGEMENT ──────────────────────────────
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Get visitor stats
app.get('/api/admin/visitor-stats', requireAdmin, (req, res) => {
  try {
    const stats = getFallbackVisitorStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update visitor count (admin only)
app.put('/api/admin/visitor-count', requireAdmin, (req, res) => {
  try {
    const { totalVisitors, storeVisitors } = req.body;
    const stats = getFallbackVisitorStats();
    
    if (totalVisitors !== undefined) stats.totalVisitors = Number(totalVisitors) || 0;
    if (storeVisitors !== undefined) stats.storeVisitors = Number(storeVisitors) || 0;
    
    stats.lastUpdated = new Date().toISOString();
    saveFallbackVisitorStats(stats);
    
    res.json({ success: true, message: 'Visitor count updated', stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create code backup before GitHub push
app.post('/api/admin/backups', requireAdmin, (req, res) => {
  try {
    const { description } = req.body;
    const backupId = uuidv4();
    const timestamp = new Date().toISOString();
    const backupDir = path.join(BACKUPS_DIR, backupId);
    
    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup important files (code + data)
    const filesToBackup = [
      { src: 'public/css/style.css', dest: 'style.css' },
      { src: 'public/js/app.js', dest: 'app.js' },
      { src: 'server.js', dest: 'server.js' },
      { src: 'models/index.js', dest: 'models.js' },
      { src: 'public/index.html', dest: 'index.html' },
      { src: 'package.json', dest: 'package.json' }
    ];
    
    // Backup data files
    const dataFiles = ['products.json', 'orders.json', 'users.json', 'carts.json', 'wishlists.json', 'visitor_stats.json'];
    dataFiles.forEach(file => {
      filesToBackup.push({ src: `data/${file}`, dest: `data_${file}` });
    });
    
    // Copy files to backup directory
    let filesBackedUp = 0;
    filesToBackup.forEach(({ src, dest }) => {
      const srcPath = path.join(__dirname, src);
      const destPath = path.join(backupDir, dest);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        filesBackedUp++;
      }
    });
    
    // Create backup metadata
    const metadata = {
      id: backupId,
      timestamp,
      description: description || 'Backup before GitHub push',
      filesBackedUp,
      byUser: req.session.user?.email || 'unknown'
    };
    
    fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    
    // Update backups list
    const backupsList = getBackupsList();
    backupsList.unshift(metadata);
    if (backupsList.length > 50) backupsList.pop(); // Keep last 50 backups
    fs.writeFileSync(path.join(BACKUPS_DIR, 'backups_list.json'), JSON.stringify(backupsList, null, 2));
    
    res.json({ success: true, message: 'Backup created successfully', backup: metadata });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all backups
app.get('/api/admin/backups', requireAdmin, (req, res) => {
  try {
    const backupsList = getBackupsList();
    res.json({ backups: backupsList });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Restore from backup
app.post('/api/admin/backups/:id/restore', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const backupDir = path.join(BACKUPS_DIR, id);
    
    if (!fs.existsSync(backupDir)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // Restore important files
    const filesToRestore = [
      { src: 'style.css', dest: 'public/css/style.css' },
      { src: 'app.js', dest: 'public/js/app.js' },
      { src: 'server.js', dest: 'server.js' },
      { src: 'models.js', dest: 'models/index.js' },
      { src: 'index.html', dest: 'public/index.html' }
    ];
    
    // Restore data files
    const dataFiles = ['products.json', 'orders.json', 'users.json', 'carts.json', 'wishlists.json', 'visitor_stats.json'];
    dataFiles.forEach(file => {
      filesToRestore.push({ src: `data_${file}`, dest: `data/${file}` });
    });
    
    // Copy files from backup
    let filesRestored = 0;
    filesToRestore.forEach(({ src, dest }) => {
      const srcPath = path.join(backupDir, src);
      const destPath = path.join(__dirname, dest);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        filesRestored++;
      }
    });
    
    res.json({ success: true, message: `Restored ${filesRestored} files from backup`, filesRestored });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper function to get backups list
function getBackupsList() {
  const listPath = path.join(BACKUPS_DIR, 'backups_list.json');
  if (fs.existsSync(listPath)) {
    try {
      return JSON.parse(fs.readFileSync(listPath, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

// ─── PAGE ROUTES ──────────────────────────────────────────────
const sendIndex = async (req, res) => {
  const host = String(req.headers.host || '').toLowerCase();
  if (process.env.NODE_ENV === 'production' && host.includes('onrender.com') && FRONTEND_URL) {
    const target = FRONTEND_URL.replace(/\/$/, '') + (req.originalUrl || '/');
    return res.redirect(302, target);
  }

  try {
    await incrementWebsiteVisitorCount(req);
  } catch (e) {
    console.error('Visitor counter error:', e.message);
  }
  // Serve legacy public index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
};
app.get('/', sendIndex);
app.get('/debug', (req, res) => {
  res.send(`<div style="font-family:sans-serif;padding:2rem;text-align:center;"><h1 style="color:#c9748f;">✦ Lencho V3 Live Debug ✦</h1><p><b>Time:</b> ${new Date().toLocaleString('en-IN')}</p><p><b>Status:</b> Live!</p><button onclick="location.href='/'" style="padding:10px 20px;background:#c9748f;color:#fff;border:none;border-radius:5px;cursor:pointer;">Go to Home</button></div>`);
});

['products', 'product', 'cart', 'checkout', 'orders', 'track', 'dashboard', 'admin', 'login', 'signup', 'wishlist', 'contact', 'terms', 'privacy', 'disclaimer']
  .forEach(page => { app.get(`/${page}`, sendIndex); app.get(`/${page}/:sub`, sendIndex); });

// Catch-all for React Router - serve index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 30054;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌟 Lencho API → Running on port ${PORT}`);
  console.log(`📌 Environment: ${NODE_ENV}`);
  console.log(`   Admin Panel → /admin`);
  console.log(`   MongoDB: ${useDB ? '✅ Connected' : '⚠️  Using JSON fallback'}\n`);
  console.log('   Firebase Google Auth: ✅ Client-driven flow enabled');
  console.log(`   FRONTEND_URL: ${FRONTEND_URL}`);
  console.log(`   SESSION_SECRET: ${cleanEnvValue(process.env.SESSION_SECRET) ? '✅ Set' : '⚠️ Missing (using fallback)'}`);
  console.log(`   JWT_SECRET: ${cleanEnvValue(process.env.JWT_SECRET) ? '✅ Set' : '⚠️ Missing (using fallback)'}`);
});
