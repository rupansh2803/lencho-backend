**Admin Panel — Complete A to Z Summary**

- **Overview:**: यह फाइल `Lencho` वेबसाइट के Admin पैनल का पूरा सारांश है — क्या-क्या कंट्रोल्स हैं, वेबसाइट कैसे काम करती है, और Admin के रोज़मर्रा के ऑपरेशंस (A → Z) का एक काम करने लायक गाइड।

**What The Admin Controls**
- **Products:**: नए प्रोडक्ट जोड़ना, संपादित करना, कीमत/स्टॉक/इमेज़/डिस्क्रिप्शन बदलना, फीचर सेट करना, कैटेगरी मैपिंग।
- **Orders:**: ऑर्डर सूची, ऑर्डर स्टेटस अपडेट (placed, confirmed, shipping, delivered, cancelled), रिफंड/रिफंड स्टेट्स, ट्रैकिंग नंबर अटैच करना, ऑर्डर नोट्स।
- **Users:**: यूजर देखना, रोल बदलना (user/admin), इस्तेमालकर्ता ब्लॉक/अनब्लॉक, यूजर डेटा एक्सपोर्ट।
- **Authentication & Sessions:**: SMTP सेट करना (OTP), Google OAuth (Firebase) कॉन्फ़िग चेक, JWT/session settings देखने व रीसेट करने के ऑप्शन्स।
- **CMS / Pages:**: Terms, Privacy, Disclaimer, Static CMS पेज एडिट और पब्लिश।
- **Settings:**: स्टोर सेटिंग्स (नाम, फोन, ईमेल), शिपिंग और शिपिंग चार्ज, फ्री-शिप थ्रेशोल्ड, GST, HSN, SEO सेटिंग्स (meta title/description/canonical) आदि।
- **Payments:**: Razorpay keys और webhook सेटिंग्स, पेमेंट स्टेटस की जाँच, भुगतान समस्याएं ट्रबलशूट करना।
- **SMTP & Email:**: SMTP क्रेडेंशियल्स, टेस्ट SMTP, OTP email templates, SMTP troubleshooting।
- **Inventory:**: स्टॉक एडजस्टमेंट, बैच अपडेट, low-stock अलर्ट्स।
- **Discounts & Coupons:**: कूपन बनाना, वैधता/लिमिट सेट करना, ऑटो-अपडेट ऑफ़र्स समेत प्रमोशनल कोड मैनेज करना।
- **Reports & Analytics:**: बिक्री रिपोर्ट, ऑर्डर वॉल्यूम, ट्रैफ़िक, विज़िटर स्टैट्स (data/visitor_stats.json), लॉग्स देखकर suspicious activity।
- **Backups & Restore:**: data/ बैकअप बनाना, restore करना, backups list मैनेज करना।
- **Admin Users & Roles:**: एडमिन अकाउंट्स बनाना, पासवर्ड रीसेट, रोल-आधारित एक्सेस।
- **Security Controls:**: CSP/helmet कैप्चर, CORS origins, allowed frontend origins, JWT secret setting, session secret, rate-limits (OTP/login) और auditing।
- **Deploy & Env:**: `FRONTEND_URL`, `JWT_SECRET`, `SESSION_SECRET`, `MONGODB_URI` जैसे env vars 관리; परमानेंट deployment रनबुक।
- **Logs & Activity:**: Login events रिकॉर्ड, login activity logs (data/login_logs.json), SMTP send logs।
- **Files & Assets:**: public/uploads, public/css, images, product images management, CDN config (if used) ।

**How The Website Works (End‑to‑End)**
- **User Flow:**: Browser → Frontend (public/index.html → `app.js`) → (if Google) Firebase SDK triggers OAuth → Firebase returns idToken → Frontend POSTs to `/api/auth/firebase/google` → Server verifies token → creates/finds user → session or JWT returned → frontend stores token & calls `/api/me` → header updates -> user redirected.
- **Order Flow:**: Add to cart → Checkout → Create order on backend → Payment (Razorpay) → Payment webhook updates order status → Inventory adjusted → Dispatch → Delivery.

**Key Files & Where To Look**
- **Server / API:**: `server.js` (main server + /api routes) — Google auth handling at `/api/auth/firebase/google` and `/api/auth/google` legacy routes.
- **Frontend App:**: `public/index.html` (load order), `public/js/app.js` (UI, auth, bootstrap), `public/js/firebase.js` (Firebase client + Google flows), `public/js/pages.js` (page renderers).
- **Models:**: `models/` and `models.js` (User, Product, Order schemas).
- **Data fallback:**: `data/*.json` — fallback storage when MongoDB not available.
- **Backups:**: `data/backups/`.

**Admin Daily Checklist (Quick)**
- **Login & Verify:**: admin login works, header shows admin, check `/api/auth/me`.
- **Orders Review:**: pending orders, payment fails, refunds.
- **Inventory:**: low stock alerts, replenish stock.
- **Content:**: update hero, banners, CMS pages.
- **Promos:**: set coupons, validate start/end dates.
- **SMTP:**: test SMTP if OTP/email problems.
- **Security:**: check server logs, failed login attempts, rotate secrets if needed.
- **Backups:**: ensure nightly backups exist.

**A → Z Admin Control Checklist**
- A: Admin users → add/remove
- B: Backups → create & verify
- C: Coupons → add/edit
- D: Data exports → orders & users
- E: Email / SMTP → test templates & connectivity
- F: Featured products → set
- G: Google OAuth → authorize domains, check `lencho-b556e.firebaseapp.com`, `lencho.in`, `www.lencho.in`
- H: Homepage content → hero/banners
- I: Inventory → stock adjustments
- J: JWT → verify rotation & expiry
- K: Keywords/SEO → meta updates
- L: Logs → review login/activity logs
- M: Mobile checks → auth flows (redirect vs popup)
- N: Notifications → order/customer emails
- O: Orders → manage/track
- P: Payments → webhook & reconciliation
- Q: QA checks → staging previews
- R: Returns → process/refund
- S: Settings → site-wide options
- T: Taxes (GST) → config
- U: Users → block/unblock
- V: Visitor stats → review
- W: Webhooks → payment/webhook endpoints
- X: eXports → CSV of orders/users
- Y: Yearly reports → sales summaries
- Z: Zero-downtime deploys → follow deploy checklist

**Troubleshooting Common Admin Issues**
- **Google Login unauthorized-domain:** Verify Firebase Console → Authentication → Authorized domains includes `lencho.in`, `www.lencho.in`, and `lencho-b556e.firebaseapp.com`. Use `window.lenchoFirebaseAuth.getDomainDiagnostics()` in console to see current host vs configured authDomain.
- **Blank handler page (firebaseapp/__/auth/handler):** Often due to cookie/third‑party block or missing persistence. Ask user to try incognito, allow cookies, or check browser popup blockers.
- **SMTP not sending:** Admin → SMTP settings — verify app password (Gmail app password) and test. Check server logs and `getVerifiedSmtpTransporter` error messages.
- **Payment not confirmed:** Verify Razorpay keys in env, check `/api/orders` and payment webhook logs, and `server.js` webhook handlers.

**How To Perform Key Admin Tasks (Step‑by‑Step)**
- **Add Product:** Admin → Products → New Product → fill name/category/price/stock/images → Save → verify in frontend.
- **Process Order:** Orders → open order → mark as confirmed/shipped → add tracking id → notify customer.
- **Create Coupon:** Admin → Discounts → New Coupon → set code, discount, min amount, valid dates → enable.
- **Configure SMTP:** Admin → Settings → SMTP → add host/port/user/pass → Click Test SMTP → watch logs.

**Security & Best Practices**
- Always use strong `JWT_SECRET` and `SESSION_SECRET` in production env.
- Keep SMTP app passwords secure (use environment variables, not the admin UI if possible).
- Restrict CORS origins to production domains.
- Rotate API keys (Razorpay) when needed and verify webhooks signature.
- Enable HTTPS and HSTS on production host.

**Quick Dev/Admin Commands**
```bash
# Start server (dev)
npm install
npm start
# Check environment
node -e "console.log(process.env.FRONTEND_URL)"
```

**Where To Look When Something Breaks**
- Frontend console (F12): errors and `console.log` outputs from `lenchoFirebaseAuth`.
- Server logs (stdout) where `server.js` prints boot and error messages.
- `data/login_logs.json` and `data/backups` for backups & login events.
- `server.js` route implementations for auth and `/api/auth/firebase/google` verification.

---
_If you want, मैं इसे हिंदी में और अधिक सरल शब्दों में लिखकर admin को दिखाने लायक PDF/printable भी बना दूँ._
