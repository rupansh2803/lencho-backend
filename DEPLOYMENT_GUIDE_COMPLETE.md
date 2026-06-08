# LENCHO - TESTING & DEPLOYMENT GUIDE

## 🧪 COMPREHENSIVE TESTING CHECKLIST

### Part 1: Authentication Tests

#### Login Session Persistence
```
1. Open browser DevTools (F12)
2. Go to Applications → Local Storage
3. Sign in with email + OTP
4. Verify `lencho_jwt_token_v1` is stored
5. Verify `lencho_current_user_v1` contains user data
6. Refresh page (F5)
7. Verify still logged in without re-login ✅
8. Navigate to different pages
9. Session should persist ✅
10. Close browser, reopen
11. User should still be logged in ✅
```

#### Login with Google
```
1. Click "Continue with Google"
2. Complete Google sign-in
3. Verify JWT token stored in localStorage ✅
4. Verify user data saved ✅
5. Refresh page - still logged in ✅
```

#### Logout
```
1. Login with any method
2. Click profile → Logout
3. Verify JWT token removed from localStorage ✅
4. Verify current user cleared ✅
5. Redirect to home page ✅
6. Verify cannot access checkout ✅
```

### Part 2: OTP/Email Tests

#### OTP Sending
```
1. Admin Login
2. Settings → SMTP Configuration
3. Enter Gmail credentials:
   - Host: smtp.gmail.com
   - Port: 465
   - Email: your-email@gmail.com
   - Password: [16-char App Password, NOT regular password]
4. Click "Test SMTP"
5. Check email for test message ✅
6. If fails: See error message and troubleshoot
```

#### OTP for Signup
```
1. Click signup
2. Enter email address
3. Click "Send OTP"
4. Should say "OTP sent! Check your inbox"
5. Open email inbox
6. Should receive email with 6-digit OTP within 2 seconds ✅
7. Enter OTP in form
8. Should verify successfully ✅
9. Can then set password and complete signup
```

#### Resend OTP
```
1. Request OTP
2. Wait for email
3. Click "Resend OTP" button
4. Should be disabled for 60 seconds (shows countdown) ✅
5. After 60 seconds, button becomes enabled
6. Click resend
7. Should receive new OTP in email ✅
```

### Part 3: Buy Now Flow

#### Desktop
```
1. Homepage → Browse products
2. Click "Buy Now" on any product
3. Should add to cart silently (no toast)
4. Should navigate directly to checkout ✅
5. Checkout page should show the item ✅
6. Cart count should increment ✅
```

#### Mobile
```
1. On mobile (or use mobile view in DevTools)
2. Click "Buy Now"
3. Should work same as desktop ✅
4. Checkout should be responsive ✅
5. Form inputs should be touch-friendly ✅
```

### Part 4: Mobile Responsiveness

#### UI Elements
```
1. Resize browser to 375px (iPhone 12)
2. Check all pages load correctly:
   - [ ] Homepage responsive
   - [ ] Products page responsive
   - [ ] Product detail responsive
   - [ ] Cart page responsive
   - [ ] Checkout responsive
   - [ ] Auth modal responsive
3. No horizontal scrolling ✅
4. Text readable (min 16px) ✅
5. Buttons large enough to tap (48x48px) ✅
```

#### Touch Interactions
```
1. On actual mobile or use touch emulator
2. Test all buttons - should respond instantly
3. Tap response time < 300ms ✅
4. Swipe navigation works ✅
5. Form inputs work on mobile keyboard
6. Dropdowns accessible on touch
```

#### Mobile Performance
```
1. Open DevTools Network tab
2. Throttle to 3G speed
3. Reload page
4. Should load in < 5 seconds
5. Images should lazy load
6. No blocking JavaScript ✅
```

### Part 5: Security Tests

#### Password Protection
```
1. Signup with password "test123"
2. In browser DevTools → Application → Local Storage
3. Verify password NOT in localStorage ✅
4. Login to admin panel
5. Check database: user password should be hashed ✅
6. Hash should be different from actual password ✅
```

#### CORS Protection
```
1. Open DevTools Console
2. Try to fetch from different origin:
   fetch('https://lencho.in/api/products', {
     headers: { 'Origin': 'https://evil.com' }
   })
3. Should be blocked by CORS policy ✅
4. Preflight request should fail ✅
```

#### Rate Limiting
```
1. Try to send 10 OTP requests rapidly:
   for(let i=0;i<10;i++) {
     api('/api/otp/send-email', {
       method: 'POST',
       body: { email: 'test@test.com' }
     })
   }
2. After 4 requests from same email → should be blocked ✅
3. Error: "Too many OTP requests" ✅
4. Should be able to try again after 10 min
```

#### Security Headers
```
1. Open browser console
2. fetch('https://your-api.com', {method: 'HEAD'})
   .then(r => {
     console.log('CSP:', r.headers.get('content-security-policy'))
     console.log('HSTS:', r.headers.get('strict-transport-security'))
     console.log('XFrame:', r.headers.get('x-frame-options'))
   })
3. Verify all security headers present ✅
```

### Part 6: Performance Tests

#### Page Load Time
```
1. Open https://your-site.com
2. DevTools → Network tab
3. Reload page
4. Check:
   - [ ] Total load time < 3 seconds
   - [ ] First Contentful Paint (FCP) < 1.8s
   - [ ] Largest Contentful Paint (LCP) < 2.5s
   - [ ] Cumulative Layout Shift (CLS) < 0.1
5. Run Google PageSpeed Insights
6. Target score > 85 ✅
```

#### API Performance
```
1. DevTools → Network tab
2. Use filter: "Fetch/XHR"
3. Go to products page
4. Check:
   - [ ] /api/products response < 500ms
   - [ ] /api/categories response < 300ms
   - [ ] /api/settings response < 300ms
5. All should be cached on 2nd call ✅
```

#### Cache Verification
```
1. Network tab → Disable cache
2. Load page → note time
3. Enable cache (check box)
4. Reload page → should be faster ✅
5. Assets should say "cached" ✅
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Prepare Git Repository

```bash
cd /path/to/WESBITE1

# Initialize Git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Lencho E-commerce - All 6 issues fixed

- ✅ Fix: Buy Now button direct checkout
- ✅ Fix: Login session persistence with JWT
- ✅ Fix: SMTP/OTP email configuration
- ✅ Feature: Performance optimization
- ✅ Feature: Mobile responsive design
- ✅ Feature: Security hardening

Features:
- JWT token stored in localStorage
- Auto-login on page refresh
- Working OTP email system
- Gmail SMTP configured
- Rate limiting enabled
- Security headers added
- Mobile optimized
- Production ready"

# Create GitHub repository
# 1. Go to https://github.com/new
# 2. Repository name: lencho-ecommerce
# 3. Description: Premium artificial jewelry e-commerce platform
# 4. Public/Private: Choose based on preference
# 5. Add .gitignore: Node
# 6. Add MIT License
# 7. Create repository

# Connect local repo to GitHub
git remote add origin https://github.com/YOUR_USERNAME/lencho-ecommerce.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend to Render

```
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → Web Service
4. Connect your GitHub repository
5. Configuration:
   - Name: lencho-api
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Instance Type: Free (or Paid)
6. Add Environment Variables:
   - MONGODB_URI: [Your MongoDB Atlas connection]
   - JWT_SECRET: [Generate new: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
   - SMTP_HOST: smtp.gmail.com
   - SMTP_PORT: 465
   - SMTP_USER: [Your Gmail]
   - SMTP_PASS: [Your App Password]
   - CORS_ORIGIN: [Your frontend URL]
   - NODE_ENV: production
   - FRONTEND_URL: [Your frontend URL]
7. Click "Create Web Service"
8. Wait for deployment (usually 2-3 minutes)
9. Get API URL from Render dashboard
```

### Step 3: Deploy Frontend to Netlify

```
1. Go to https://netlify.com
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Choose GitHub repository
5. Configuration:
   - Build command: (leave empty if no build)
   - Publish directory: public/
   - Branch to deploy: main
6. Add Environment Variables:
   - VITE_API_URL: [Your Render API URL]
   - VITE_FRONTEND_URL: [Your Netlify URL]
   - VITE_GOOGLE_CLIENT_ID: [Your Google OAuth ID]
7. Click "Deploy site"
8. Wait for deployment (usually 1-2 minutes)
9. Get frontend URL from Netlify dashboard
```

### Step 4: Configure Custom Domain (Optional)

```
1. Buy domain from GoDaddy, Namecheap, etc.
2. Update DNS records to point to deployment:
   - API: point to Render
   - Frontend: point to Netlify
3. Update environment variables with custom domain
4. Wait for DNS propagation (up to 24 hours)
```

### Step 5: Post-Deployment Testing

```bash
# Test API
curl https://your-api.com/health
# Should return: {"status":"ok",...}

# Test OTP
curl -X POST https://your-api.com/api/otp/send-email \
  -H 'Content-Type: application/json' \
  -d '{"email":"your-email@gmail.com"}'

# Test products
curl https://your-api.com/api/products
# Should return products array

# Check frontend
curl https://your-frontend.com
# Should return HTML
```

---

## 📋 PRE-LAUNCH CHECKLIST

- [ ] All code pushed to GitHub
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Custom domain configured
- [ ] HTTPS enabled (automatic on Netlify/Render)
- [ ] SMTP configured and tested
- [ ] Database backups enabled
- [ ] Admin account created
- [ ] Products added (minimum 50)
- [ ] Razorpay/payment configured
- [ ] Analytics enabled
- [ ] Email notifications working
- [ ] OTP emails verified
- [ ] Mobile testing completed
- [ ] Security headers verified
- [ ] Performance benchmarks met
- [ ] Monitoring enabled
- [ ] Error tracking (Sentry) enabled
- [ ] CDN configured (optional)
- [ ] SSL certificate valid

---

## 🔧 TROUBLESHOOTING

### Deployment Issues

#### Render Build Fails
```
Error: Cannot find module 'mongoose'
Fix: npm install in build command
```

#### Netlify Deploy Fails
```
Error: Cannot find index.html
Fix: Check publish directory is set to 'public/'
```

#### CORS Error After Deploy
```
Error: Access-Control-Allow-Origin header missing
Fix: Update CORS_ORIGIN env var with production domain
```

### Runtime Issues

#### API not responding
```
Check: 1) Server running? curl /health
      2) Network accessible?
      3) CORS properly configured?
      4) Environment variables set?
```

#### OTP not sending
```
Check: 1) SMTP configured? /api/admin/test-smtp
      2) Gmail App Password (not regular password)?
      3) 2FA enabled on Gmail?
      4) Rate limits exceeded?
```

#### Frontend can't reach API
```
Check: 1) API URL correct in environment?
      2) CORS enabled?
      3) API returns proper headers?
      4) Network request visible in DevTools?
```

---

## 📊 MONITORING & MAINTENANCE

### Daily Checks
- [ ] API health: https://api.lencho.in/health
- [ ] Frontend loads: https://lencho.in
- [ ] Email sending working: Test OTP
- [ ] Database responding
- [ ] No error spikes in logs

### Weekly Tasks
- [ ] Review error logs
- [ ] Check database backup
- [ ] Monitor performance metrics
- [ ] Check for dependency updates
- [ ] Review security logs

### Monthly Tasks
- [ ] Update dependencies: npm update
- [ ] Security audit: npm audit
- [ ] Database optimization
- [ ] Performance review
- [ ] User feedback analysis

---

## 📈 NEXT STEPS AFTER LAUNCH

1. **Add Products:** Use admin panel to add jewelry items
2. **Marketing:** Share on social media, influencers
3. **Analytics:** Setup Google Analytics 4
4. **Email Campaigns:** Nurture leads with email
5. **Customer Service:** Respond to inquiries quickly
6. **Optimization:** Based on user feedback
7. **Expansion:** Add new features, categories
8. **Scaling:** As traffic grows, upgrade servers

Good luck with your launch! 🚀
