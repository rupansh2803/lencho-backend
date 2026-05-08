## Backend Integration Guide

### Step 1: Update package.json
✅ Already added `jsonwebtoken` dependency

Run: `npm install jsonwebtoken`

### Step 2: Create/Update Auth Middleware
✅ Created: `middleware/auth.js`
- Contains `authMiddleware` for protecting routes
- Contains `generateToken` function for JWT token generation
- Handles token verification and auto-logout on 401

### Step 3: Create Address Model & Routes
✅ Created:
- `models/Address.js` - Complete address schema with all 10 fields
- `routes/addresses.js` - Full CRUD operations for addresses

### Step 4: Update server.js
You need to update your server.js to:

1. **Add JWT imports at the top:**
```javascript
const jwt = require('jsonwebtoken')
const { authMiddleware, generateToken } = require('./middleware/auth')
```

2. **Add address routes in app.use():***
```javascript
const addressRoutes = require('./routes/addresses')
app.use('/api/addresses', addressRoutes)
```

3. **Replace or update existing auth routes:**
Use the provided `routes/auth-updated.js` as reference
- Replace token generation with `generateToken()` function
- Add JWT return in login/signup responses
- Add `authMiddleware` to protected endpoints
- Update routes: `/api/login`, `/api/signup`, `/api/otp/*`, `/api/auth/google`, `/api/me`, `/api/profile`

4. **Add .env variables:**
```
JWT_SECRET=your-very-secret-key-change-this-in-production
JWT_EXPIRE=30d
```

### Step 5: Update User Model (if needed)
Make sure User model has:
- `googleId` field (for Google OAuth)
- `password` field (if not already there)
- `isVerified` field
- `role` field (default: 'customer')
- Timestamps (createdAt, updatedAt)

### Step 6: Helper Functions Needed

Create `services/otpService.js`:
```javascript
// OTP saving and verification functions
// Integrate with your existing OTP system
```

### Step 7: Frontend API Integration

The frontend is ready to:
- Send JWT in Authorization header: `Bearer ${token}`
- Handle 401 responses by logging out
- Restore session on app load using `/api/me`
- Use all address CRUD endpoints
- Use protected routes

### Key Endpoints After Integration:

**Auth Endpoints:**
- POST `/api/login` - Email + password login
- POST `/api/signup` - Email + password signup
- POST `/api/otp/send-email` - Send email OTP
- POST `/api/otp/verify-email` - Verify email OTP & login/signup
- POST `/api/otp/send` - Send phone OTP  
- POST `/api/otp/verify` - Verify phone OTP & login/signup
- POST `/api/auth/google` - Google OAuth
- GET `/api/me` - Get current user (protected)
- PUT `/api/profile` - Update profile (protected)
- POST `/api/logout` - Logout (protected)

**Address Endpoints (Protected):**
- GET `/api/addresses` - Get all addresses
- POST `/api/addresses` - Create address
- GET `/api/addresses/:id` - Get single address
- PUT `/api/addresses/:id` - Update address
- DELETE `/api/addresses/:id` - Delete address
- PUT `/api/addresses/:id/default` - Set as default

### Token Structure:
```javascript
{
  userId: "user_id_here",
  id: "user_id_here",
  role: "customer",
  iat: 1234567890,
  exp: 1234567890
}
```

### Testing the Integration:

1. **Test Email Login:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response should include JWT token in `token` field

2. **Test Protected Route:**
```bash
curl -X GET http://localhost:3000/api/me \
  -H "Authorization: Bearer {token_here}"
```

3. **Test Address Creation:**
```bash
curl -X POST http://localhost:3000/api/addresses \
  -H "Authorization: Bearer {token_here}" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"John Doe",
    "phoneNumber":"9876543210",
    ...
  }'
```

### Common Issues & Solutions:

**Issue: "No token provided"**
- Ensure Authorization header is sent: `Authorization: Bearer {token}`

**Issue: "Invalid or expired token"**
- Token has expired (older than 30 days)
- JWT_SECRET doesn't match between generation and verification
- Token is malformed

**Issue: "User not found"**
- Database connection issue
- User was deleted
- Wrong user ID in token

### Security Considerations:

1. ✅ Passwords hashed with bcryptjs
2. ✅ JWT tokens expire after 30 days
3. ✅ Protected routes require valid token
4. ✅ Sensitive data (password) excluded from responses
5. ✅ Token stored only in localStorage (httpOnly cookies recommended for production)
6. ✅ CORS properly configured

### Production Checklist:

- [ ] Change `JWT_SECRET` to strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS
- [ ] Use httpOnly cookies instead of localStorage for tokens
- [ ] Implement token refresh mechanism
- [ ] Add rate limiting on auth endpoints
- [ ] Enable CORS properly with specific origins
- [ ] Use environment variables for all secrets
- [ ] Implement proper error logging
- [ ] Add request validation and sanitization

### Next Steps:

1. Install JWT: `npm install jsonwebtoken`
2. Update server.js with the auth routes
3. Test endpoints with curl or Postman
4. Run frontend: `npm run dev` in frontend folder
5. Test complete auth flow from frontend
