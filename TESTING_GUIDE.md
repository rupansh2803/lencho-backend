# 🧪 LENCHO WEBSITE - COMPREHENSIVE TESTING GUIDE
**Date**: May 2024 | **Version**: 1.0

---

## 📝 TEST EXECUTION CHECKLIST

Complete this entire checklist on mobile, tablet, and desktop before deployment.

---

## ✅ SECTION 1: AUTHENTICATION

### Test 1.1: Email/Password Signup
**Steps**:
1. Go to https://lencho.in
2. Click "Sign Up" button
3. Enter new email address
4. Enter strong password
5. Click "Sign Up"
6. **Expected**: OTP sent to email within 10 seconds
7. Check inbox for OTP email
8. Enter OTP on website
9. Account created and logged in
10. Cart badge shows 0

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 1.2: Email/Password Login
**Steps**:
1. Logout from account (if logged in)
2. Click "Login"
3. Enter valid email
4. Enter correct password
5. Click "Login"
6. **Expected**: Logged in instantly, redirect to home

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 1.3: Google Sign-In (Popup Flow - Desktop)
**Steps**:
1. Go to https://lencho.in (make sure NOT logged in)
2. Click "Continue with Google" button
3. Google popup appears
4. Select your Google account
5. Authorize Lencho app
6. **Expected**: Popup closes, logged in to Lencho
7. Cart badge appears
8. Account created if first-time login

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 1.4: Google Sign-In (Redirect Flow - Mobile)
**Steps**:
1. On mobile device, go to https://lencho.in
2. Click "Continue with Google"
3. **Expected**: Redirects to Google login page
4. Enter Google credentials
5. Authorize Lencho
6. **Expected**: Redirects back to Lencho, logged in

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 1.5: Logout
**Steps**:
1. While logged in, click user menu (top right)
2. Click "Logout"
3. **Expected**: Logged out, redirect to home
4. No cart badge visible
5. "Sign Up" / "Login" buttons visible

**Pass/Fail**: ___

**Notes**: _________________________________________

---

## ✅ SECTION 2: PRODUCT BROWSING

### Test 2.1: Home Page Load
**Steps**:
1. Open https://lencho.in
2. Wait for page to load
3. **Target Time**: <2 seconds to interactive

**Performance**:
- Load Time: ______ seconds
- Status: ☐ <2s ☐ 2-3s ☐ >3s

**Visual Check**:
- ☐ Hero banner loads
- ☐ Product grid visible
- ☐ Images load smoothly
- ☐ No layout shifts
- ☐ All buttons clickable

**Pass/Fail**: ___

---

### Test 2.2: Product Grid Rendering
**Steps**:
1. On home page, scroll through products
2. Check all product cards load
3. **Expected**: 16+ product cards visible
4. Each card shows:
   - ☐ Product image
   - ☐ Product name
   - ☐ Product category
   - ☐ Price in rupees
   - ☐ Discount % (if applicable)
   - ☐ Add to Cart button
   - ☐ Watchlist heart button

**Pass/Fail**: ___

---

### Test 2.3: Product Detail Page
**Steps**:
1. Click any product card
2. **Expected**: Navigate to product detail page <2s
3. Page shows:
   - ☐ Large product image
   - ☐ Product name
   - ☐ Rating (if available)
   - ☐ Price and original price
   - ☐ Discount percentage
   - ☐ Product description
   - ☐ "Add to Cart" button (primary)
   - ☐ "Buy Now" button (prominent)
   - ☐ "Add to Watchlist" heart button
   - ☐ Product specs / details

**Pass/Fail**: ___

**Notes**: _________________________________________

---

## ✅ SECTION 3: CART OPERATIONS

### Test 3.1: Add to Cart (Instant Feedback)
**Steps**:
1. Go to any product detail page
2. Click "Add to Cart" button
3. **Expected**: 
   - ☐ Toast notification appears: "Added to cart! 🛍️"
   - ☐ Cart badge increments instantly (no waiting)
   - ☐ Button visual feedback (pressed state)
4. Add 2-3 more products
5. **Expected**: Cart badge shows correct count (3+)

**Cart Badge Response Time**: ______ ms

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 3.2: Add to Cart Without Login
**Steps**:
1. Logout (if logged in)
2. Go to any product
3. Click "Add to Cart"
4. **Expected**: Auth modal appears
5. Click "Sign Up" or "Login"
6. Complete authentication
7. **Expected**: After login, product added to cart

**Pass/Fail**: ___

---

### Test 3.3: View Cart
**Steps**:
1. Click cart icon (badge with number)
2. Navigate to /cart
3. **Expected**:
   - ☐ Cart page loads in <1 second
   - ☐ All added products visible with images
   - ☐ Each product shows: image, name, price, quantity
   - ☐ Quantity selector (+ / - buttons) for each item
   - ☐ Remove button for each item
   - ☐ Clear Cart button at bottom
   - ☐ Subtotal calculated correctly
   - ☐ Shipping cost shown (free if >₹999)
   - ☐ Total amount calculated
   - ☐ Proceed to Checkout button

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 3.4: Update Quantity
**Steps**:
1. In cart page, find a product
2. Click + button to increase quantity
3. **Expected**: 
   - ☐ Quantity updates instantly
   - ☐ Subtotal recalculates
   - ☐ Total updates
   - ☐ No page refresh needed
4. Click - button to decrease
5. If quantity becomes 0:
   - **Expected**: Confirmation modal: "Remove this item from cart?"
   - ☐ Click Yes → Item removed, total updates
   - ☐ Click No → Item remains

**Pass/Fail**: ___

**Notes**: _________________________________________

---

### Test 3.5: Remove Item from Cart
**Steps**:
1. In cart, click remove button for any item
2. **Expected**: Confirmation modal: "Remove this item from cart?"
3. Click "Yes"
4. **Expected**: 
   - ☐ Item removed instantly
   - ☐ Cart count badge decreases
   - ☐ Total amount updates
   - ☐ Toast notification: "Item removed from cart"

**Pass/Fail**: ___

---

### Test 3.6: Clear Entire Cart
**Steps**:
1. In cart page, click "Clear Cart" button (red)
2. **Expected**: Confirmation dialog appears
3. Click "Yes"
4. **Expected**:
   - ☐ All items removed
   - ☐ Cart badge shows 0
   - ☐ Cart page shows "Your cart is empty"
   - ☐ Toast: "Cart cleared"

**Pass/Fail**: ___

---

### Test 3.7: Cart Persistence After Refresh
**Steps**:
1. Add 3 products to cart
2. Check cart badge shows 3
3. Refresh page (F5 or Cmd+R)
4. **Expected**: Cart badge still shows 3
5. Navigate to /cart
6. **Expected**: All 3 products still in cart

**Pass/Fail**: ___

---

## ✅ SECTION 4: CHECKOUT & PAYMENT

### Test 4.1: Direct "Buy Now" Flow
**Steps**:
1. Go to any product detail page
2. Click "Buy Now" button (not "Add to Cart")
3. **Expected**: Navigate to checkout page with ONLY this product
4. Checkout form shows:
   - ☐ Product image and price
   - ☐ Quantity field (default 1)
   - ☐ Address form (Name, Email, Phone, Address, City, State, Pincode)
   - ☐ Payment method selector (COD / Online)

**Pass/Fail**: ___

---

### Test 4.2: From Cart to Checkout
**Steps**:
1. Add 2-3 products to cart
2. Go to /cart
3. Click "Proceed to Checkout"
4. **Expected**: Navigate to checkout page with all cart items
5. Page shows:
   - ☐ All products from cart
   - ☐ Address form (pre-filled if logged-in user has saved address)
   - ☐ Payment method selector

**Pass/Fail**: ___

---

### Test 4.3: Checkout Form Validation
**Steps**:
1. On checkout page, leave all address fields empty
2. Click "Place Order"
3. **Expected**: Error message: "All fields required"
4. Fill partial fields (e.g., name only)
5. Click "Place Order"
6. **Expected**: Error message about remaining required fields
7. Fill all required fields correctly
8. Click "Place Order"
9. **Expected**: Order proceeds to payment

**Pass/Fail**: ___

---

### Test 4.4: COD (Cash on Delivery) Payment
**Steps**:
1. On checkout page, select "Cash on Delivery (COD)"
2. Fill address form completely
3. Click "Place Order"
4. **Expected**: 
   - ☐ Order confirmation page appears
   - ☐ Shows order ID
   - ☐ Shows order details (items, total)
   - ☐ Shows "Order placed successfully!" message
5. Email received with order confirmation

**Pass/Fail**: ___

**Order ID**: ____________________

---

### Test 4.5: Online Payment (Razorpay)
**Steps**:
1. On checkout page, select "Pay Online"
2. Fill address form completely
3. Click "Place Order"
4. **Expected**: Razorpay payment modal opens
5. **For Test Mode**:
   - Card Number: 4111 1111 1111 1111
   - Expiry: Any future date (e.g., 12/30)
   - CVV: Any 3 digits (e.g., 123)
6. Click "Pay"
7. **Expected**:
   - ☐ Payment processing indicator
   - ☐ Order confirmation after payment
   - ☐ Order ID displayed
   - ☐ Confirmation email sent

**Pass/Fail**: ___

**Order ID**: ____________________

---

## ✅ SECTION 5: WATCHLIST

### Test 5.1: Add to Watchlist
**Steps**:
1. Go to any product page
2. Click heart icon "Add to Watchlist"
3. **Expected**: 
   - ☐ Heart fills with color (red/pink)
   - ☐ Toast: "Added to watchlist"
   - ☐ Visual feedback instant (no waiting)

**Pass/Fail**: ___

---

### Test 5.2: Remove from Watchlist
**Steps**:
1. With product in watchlist, click heart again
2. **Expected**:
   - ☐ Heart unfills (outline only)
   - ☐ Toast: "Removed from watchlist"

**Pass/Fail**: ___

---

### Test 5.3: Watchlist Page
**Steps**:
1. Go to /watchlist
2. **Expected**:
   - ☐ Page loads in <1 second
   - ☐ All watchlist products displayed in grid
   - ☐ Each card shows: image, name, category, price, discount
   - ☐ Each card has "Add to Cart" button
   - ☐ Each card has "Remove" heart button
3. If watchlist empty:
   - **Expected**: "Your watchlist is empty" message with "Browse Collections" button

**Pass/Fail**: ___

---

### Test 5.4: Add from Watchlist to Cart
**Steps**:
1. On watchlist page, click "Add to Cart" button
2. **Expected**:
   - ☐ Toast: "Added to cart"
   - ☐ Cart badge increments instantly
   - ☐ Product stays in watchlist (not removed)

**Pass/Fail**: ___

---

## ✅ SECTION 6: PERFORMANCE & RESPONSIVENESS

### Test 6.1: Mobile Responsiveness
**Steps** (Test on actual mobile or Chrome DevTools mobile view):
1. Home page: Check layout stacks vertically
2. Product cards: Display 1-2 per row
3. Navigation: Hamburger menu visible
4. Buttons: Touch-friendly size (min 44px)
5. Images: Load at mobile resolution
6. Text: Readable without zoom

**Devices Tested**: ________________________

**Pass/Fail**: ___

---

### Test 6.2: Tablet Responsiveness
**Steps** (iPad or tablet view):
1. Home page: Products in 2-3 column grid
2. Buttons: Properly spaced
3. Cart page: Readable and usable
4. Checkout: Form fields properly sized

**Pass/Fail**: ___

---

### Test 6.3: Desktop Display
**Steps**:
1. Home page: All products visible in grid
2. Product detail: Large images, readable text
3. Navigation: Full menu visible
4. Buttons: Hover effects working

**Pass/Fail**: ___

---

### Test 6.4: Load Time Measurements
**Using Chrome DevTools:**

| Page | Target | Measured | Status |
|------|--------|----------|--------|
| Home | <2s | _____ | ☐ Pass |
| Product | <2s | _____ | ☐ Pass |
| Cart | <1s | _____ | ☐ Pass |
| Watchlist | <1s | _____ | ☐ Pass |
| Checkout | <2s | _____ | ☐ Pass |

**Overall Pass/Fail**: ___

---

### Test 6.5: Image Optimization
**Steps**:
1. Open Chrome DevTools → Network tab
2. Load home page
3. Check:
   - ☐ Images load with lazy loading
   - ☐ No broken images
   - ☐ Images optimized (not huge file sizes)
   - ☐ WebP format used where supported

**Pass/Fail**: ___

---

## ✅ SECTION 7: UI/UX FEATURES

### Test 7.1: Toast Notifications
**Steps**:
1. Add to cart → Check toast appears
2. Remove item → Check toast appears
3. Login error → Check error toast appears
4. **Expected**: All toasts appear at bottom right, auto-dismiss after 3s

**Pass/Fail**: ___

---

### Test 7.2: Loading States
**Steps**:
1. Load home page and watch for skeleton loaders
2. **Expected**: Skeleton placeholders show, then products fade in
3. Load product page from slow connection (throttle in DevTools)
4. **Expected**: Skeleton loaders visible, then content loads

**Pass/Fail**: ___

---

### Test 7.3: Email Popup
**Steps**:
1. Visit home page (new session - clear sessionStorage)
2. **Expected**: Discount popup appears after 3-5 seconds
3. Close popup by clicking X
4. Refresh page
5. **Expected**: Popup does NOT appear again (same session)
6. Close browser tab entirely, reopen site
7. **Expected**: Popup appears again (new session)

**Pass/Fail**: ___

---

## ✅ SECTION 8: SECURITY & ERROR HANDLING

### Test 8.1: No Sensitive Data in Frontend
**Steps**:
1. Open Chrome DevTools → Network tab
2. Check XHR/Fetch requests
3. **Expected**: No API keys, passwords, or tokens in request URLs
4. Check LocalStorage in DevTools:
   - **Expected**: No SMTP password, API keys, or sensitive data
5. Check sessionStorage:
   - **Expected**: Only popupShown, coupon codes (public info)

**Pass/Fail**: ___

---

### Test 8.2: CORS Headers
**Steps**:
1. Open DevTools → Network → Any API call
2. Check Response Headers
3. **Expected**: 
   - ☐ `Access-Control-Allow-Origin: https://lencho.in`
   - ☐ Correct domain set (not * or wildcard)

**Pass/Fail**: ___

---

### Test 8.3: Error Handling
**Steps**:
1. Disconnect internet
2. Try to add to cart
3. **Expected**: User-friendly error toast, cart not updated incorrectly
4. Reconnect internet
5. Try again - should work

**Pass/Fail**: ___

---

## ✅ SECTION 9: OTP & EMAIL SYSTEM

### Test 9.1: OTP Email Delivery
**Steps**:
1. Logout (or use incognito window)
2. Sign up with new email
3. **Expected**: OTP email arrives within 10 seconds
4. Check email for:
   - ☐ Lencho branding/logo
   - ☐ OTP code (4-6 digits)
   - ☐ Expiry message
   - ☐ Professional HTML formatting

**Time to Email**: ______ seconds

**Pass/Fail**: ___

---

### Test 9.2: OTP Verification
**Steps**:
1. After entering email at signup
2. Copy OTP from email
3. Paste into OTP field on website
4. Click "Verify OTP"
5. **Expected**: Account created, logged in automatically

**Pass/Fail**: ___

---

### Test 9.3: Invalid OTP Handling
**Steps**:
1. At OTP verification screen, enter wrong OTP
2. Click "Verify OTP"
3. **Expected**: Error message: "Invalid OTP"
4. Can retry with correct OTP

**Pass/Fail**: ___

---

### Test 9.4: Resend OTP
**Steps**:
1. At OTP verification screen
2. Click "Resend OTP" button (if available after 30s)
3. **Expected**: 
   - ☐ New OTP sent
   - ☐ Email received with new OTP
   - ☐ Resend button disabled for 30 seconds

**Pass/Fail**: ___

---

## ✅ SECTION 10: ADMIN PANEL

### Test 10.1: Admin Login
**Steps**:
1. Go to https://lencho.in/admin
2. Login with admin credentials
3. **Expected**: Admin dashboard appears
4. Can access:
   - ☐ Orders list
   - ☐ Product management
   - ☐ User management
   - ☐ Settings

**Pass/Fail**: ___

---

### Test 10.2: View Orders
**Steps**:
1. In admin panel, go to Orders
2. **Expected**: List of all orders shows with:
   - ☐ Order ID
   - ☐ Customer name
   - ☐ Order date
   - ☐ Order status (Pending, Shipped, Delivered, etc.)
   - ☐ Order total

**Pass/Fail**: ___

---

## ✅ SECTION 11: BROWSER COMPATIBILITY

Test on these browsers:

### Chrome/Edge (Chromium)
- ☐ Homepage loads
- ☐ Cart works
- ☐ Google login works
- ☐ No console errors

**Pass/Fail**: ___

---

### Firefox
- ☐ Homepage loads
- ☐ Cart works
- ☐ OTP email works
- ☐ No console errors

**Pass/Fail**: ___

---

### Safari
- ☐ Homepage loads
- ☐ All features work
- ☐ No console errors

**Pass/Fail**: ___

---

## ✅ SECTION 12: FINAL VERIFICATION

### Pre-Deployment Checklist
- [ ] All 12 sections tested and passing
- [ ] No console errors (F12 → Console tab empty)
- [ ] Mobile, tablet, desktop all working
- [ ] OTP delivery working
- [ ] Google login working
- [ ] Cart operations instant
- [ ] Checkout complete and payment working
- [ ] Performance metrics met (<2s load time)
- [ ] All environment variables set correctly
- [ ] No hardcoded secrets in code

### Sign-Off
**Tester Name**: ________________________

**Date**: ____________

**Overall Status**: ☐ PASS ☐ FAIL ☐ WITH ISSUES

**Critical Issues Found** (if any):
_________________________________________
_________________________________________

**Notes**:
_________________________________________
_________________________________________

---

## 🚨 If Tests FAIL

### Debugging Steps
1. Check browser console (F12 → Console)
2. Check server logs (Terminal where server is running)
3. Check network requests (DevTools → Network tab)
4. Verify environment variables are set correctly
5. Verify MongoDB connection is working
6. Check SMTP credentials for email issues
7. Verify Firebase configuration

### Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| OTP not sending | Check SMTP credentials, verify Gmail app password |
| Google login doesn't work | Verify Firebase project ID, check browser console for errors |
| Cart badge doesn't update | Check if JavaScript errors in console, verify API endpoint |
| Page loads slow | Check Network tab in DevTools, look for slow API calls |
| Mobile layout broken | Check CSS media queries, verify viewport meta tag |

---

## 📝 NOTES

Use this space for additional testing notes or issues found:

_________________________________________________

_________________________________________________

_________________________________________________

---

**Testing Complete!** 🎉

If all sections show ✅ PASS, the website is ready for production deployment.

