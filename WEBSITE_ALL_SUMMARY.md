# Website All Summary

## 1. Project Overview
Lencho is a premium artificial jewellery ecommerce website built for browsing products, managing carts, placing orders, and handling customer authentication. The site is designed as a full stack web app with a custom frontend, Node.js backend, and fallback file storage when MongoDB is not available.

## 2. Core Goal
The main goal of the website is to provide a polished jewellery shopping experience with:
- Fast product browsing
- Secure authentication
- OTP-based signup/login support
- Google login/signup support
- Mobile-friendly UI
- Admin controls for products, orders, users, and settings

## 3. Tech Stack
### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Font Awesome for icons
- Google Fonts for typography

### Backend
- Node.js
- Express.js
- MongoDB / Mongoose
- JSON file fallback storage
- Nodemailer for email OTP
- Helmet for security headers
- CORS for origin control
- Compression for response optimization

### Auth and Security
- Session-based auth
- JWT token support
- Password hashing with bcryptjs
- Rate limiting for OTP and login attempts
- CAPTCHA/security code checks

## 4. Frontend Structure
### Main Entry
- [public/index.html](public/index.html) loads the full app UI, auth modal, header, footer, chatbot, and bundle scripts.

### Main Frontend Logic
- [public/js/app.js](public/js/app.js) controls navigation, auth, cart, wishlist, search, bootstrap, and UI state.

### Styling
- [public/css/style.css](public/css/style.css) contains the full visual system, modal styling, responsive behavior, buttons, product cards, and mobile fixes.

### Other Frontend Scripts
- `pages.js` handles page rendering.
- `dashboard.js` handles user dashboard behavior.
- `admin.js` handles admin panel interactions.
- `admin-gst-settings.js` handles GST settings UI.
- `chatbot.js` powers the assistant widget.

## 5. Backend Structure
### Main Server
- [server.js](server.js) is the primary Express server and contains routes for auth, products, orders, settings, OTP, Google login, and admin features.

### Models
- [models.js](models.js) defines database schemas.
- [models/Address.js](models/Address.js) and [models/AuthSettings.js](models/AuthSettings.js) hold supporting data models.

### Middleware
- [middleware/auth.js](middleware/auth.js) provides JWT token generation and token verification middleware.

### Routes
- [routes/auth-updated.js](routes/auth-updated.js)
- [routes/auth-settings.js](routes/auth-settings.js)
- [routes/addresses.js](routes/addresses.js)

## 6. Authentication Flow
The website supports multiple auth paths.

### Email/Password Login
1. User opens the auth modal.
2. User enters email, password, and security code.
3. Frontend sends the login request to the backend.
4. Backend validates credentials.
5. On success, backend returns a token and user data.
6. Frontend stores the token and user info, updates the header, and navigates the user.

### Signup Flow
1. User opens the signup form.
2. User enters name, email, phone, gender, and security code.
3. Frontend requests OTP from the backend.
4. Backend validates CAPTCHA/security code.
5. Backend checks SMTP credentials before sending OTP.
6. If SMTP is not configured, OTP is blocked with a clear error.
7. If SMTP is configured, OTP email is sent.
8. User verifies OTP and account is created.

### Google Login / Signup
1. User clicks Continue with Google.
2. Google Identity Services opens account selection.
3. User chooses a Google account.
4. Frontend sends Google profile data to `/api/auth/google`.
5. Backend creates the user if needed or logs the user in.
6. Token and user data are stored in the browser.
7. User is redirected into the site as a signed-in user.

### Session Persistence
- The app stores the JWT and saved user in localStorage.
- On refresh, the app calls `/api/me` to validate the active auth state.
- If the token is valid, the user stays logged in.
- If the token is expired or invalid, auth is cleared.

## 7. OTP System
The OTP flow is email-based and protected.

### Important Behavior
- OTP only works when SMTP email credentials and app password are configured.
- OTP is not allowed through a fake or dev-only fallback.
- The backend returns a helpful error if SMTP is missing.
- OTP email content is formatted professionally.

### Security Checks
- CAPTCHA/security code validation
- Rate limiting by email and IP
- Disposable email blocking
- OTP expiration handling
- One-time OTP usage

## 8. Mobile Responsiveness
The website is optimized for phones and tablets.

### Mobile Fixes
- Auth modal width is constrained so it does not take the full screen.
- Form rows collapse into a single column on small screens.
- Input sizes are mobile-friendly.
- Buttons remain large enough for touch.
- Header, nav, and footer behavior is adjusted for mobile layouts.

### Result
- Login/signup forms stay centered.
- Padding and spacing adapt to smaller screens.
- The modal looks like a proper card instead of a full-page overlay.

## 9. Clickable UI Behavior
Clickable elements are styled to feel interactive.

### Applied Behavior
- Pointer cursor on links, buttons, cards, and icon buttons
- Smooth hover transitions
- Clear visual feedback on hover and active states
- Easier recognition of clickable UI pieces

## 10. Loading and Bootstrap
The app uses a bootstrap process to load page state, restore auth, update the header, and hide the loading screen after initialization.

### What Happens on Load
- The app fetches current auth state.
- The header updates based on whether the user is signed in.
- Public settings and common data are loaded.
- The loading screen is hidden after startup finishes.

## 11. Data Storage
The project uses a dual storage approach.

### MongoDB Mode
- Preferred for production.
- Stores users, orders, products, carts, wishlists, OTP logs, settings, and more.

### JSON Fallback Mode
- Used when MongoDB is unavailable.
- Keeps the app functional for local development or fallback hosting.

## 12. Security Model
The website includes several security layers.

### Included Protections
- Password hashing
- Session and token validation
- Helmet security headers
- CORS allow-listing
- OTP rate limiting
- CAPTCHA/security code checks
- Disposable email blocking

## 13. Main Website Features
### Customer Features
- Browse categories and products
- View product details
- Add to cart
- Wishlist support
- Checkout flow
- Order tracking
- User dashboard
- Auth modal login/signup
- Google login
- OTP-based signup

### Admin Features
- Product management
- Order management
- User management
- Settings management
- GST-related controls
- SMTP settings

## 14. Deployment Model
The project is designed for a split deployment.

### Recommended Setup
- Frontend: Netlify or similar static hosting
- Backend: Render or another Node.js host
- Database: MongoDB Atlas

### Important Config Files
- [netlify.toml](netlify.toml)
- [render.yaml](render.yaml)
- [.env](.env) for environment variables

## 15. Common Environment Variables
- `MONGODB_URI`
- `JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_USER`
- `EMAIL_PASS`
- `FRONTEND_URL`
- `SITE_URL`

## 16. File Map
### Main Files
- [server.js](server.js)
- [models.js](models.js)
- [public/index.html](public/index.html)
- [public/js/app.js](public/js/app.js)
- [public/css/style.css](public/css/style.css)

### Docs Already Present
- [README_LENCHO_COMPLETE.md](README_LENCHO_COMPLETE.md)
- [BUILD_SUMMARY.md](BUILD_SUMMARY.md)
- [DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md)
- [FINAL_STATUS.md](FINAL_STATUS.md)
- [FIXES_IMPLEMENTED.md](FIXES_IMPLEMENTED.md)
- [00_START_HERE.md](00_START_HERE.md)

## 17. How the Site Works End-to-End
1. User opens the website.
2. Frontend loads layout, styles, and app logic.
3. Bootstrap restores user session if a valid token exists.
4. User browses products or opens the auth modal.
5. Login/signup happens through email/password, OTP, or Google.
6. User adds items to cart or wishlist.
7. Checkout sends the order to the backend.
8. Admin panel manages products, users, orders, and settings.

## 18. Final Status
The website is structured as a full ecommerce system with authentication, admin control, responsive UI, and production deployment support. The codebase is built to be maintainable, with clear separation between frontend, backend, models, middleware, and documentation.

## 19. What to Read Next
If you want deeper detail, read these in order:
1. [00_START_HERE.md](00_START_HERE.md)
2. [README_LENCHO_COMPLETE.md](README_LENCHO_COMPLETE.md)
3. [BUILD_SUMMARY.md](BUILD_SUMMARY.md)
4. [FIXES_IMPLEMENTED.md](FIXES_IMPLEMENTED.md)
5. [DEPLOYMENT_GUIDE_COMPLETE.md](DEPLOYMENT_GUIDE_COMPLETE.md)
