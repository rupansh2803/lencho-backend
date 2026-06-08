# 🔧 SMTP Configuration & OTP Fix Guide

## Problem: OTP Not Sending ❌

Your OTP emails are not being sent because **SMTP credentials are not configured correctly**.

---

## Solution: Configure SMTP Settings

### Step 1: Get Gmail App Password

1. Go to **Google Account Settings**: https://myaccount.google.com/
2. Click **Security** (left sidebar)
3. Enable **2-Step Verification** (if not already enabled)
4. Search for **App passwords** (scroll down)
5. Select **Mail** and **Windows Computer**
6. Google will generate a **16-character App Password**
7. **Copy this password** (you'll need it)

### Step 2: Configure in Admin Panel

1. Log in to your admin panel
2. Go to **Settings** → **SMTP Configuration**
3. Fill in these settings:

```
SMTP Host: smtp.gmail.com
SMTP Port: 465
SMTP User: rupanshsaini2@gmail.com  (Your Gmail)
SMTP Pass: xxxx xxxx xxxx xxxx      (App Password from Step 1)
Store Name: Lencho
```

4. Click **Save**

### Step 3: Test SMTP Configuration

Use the **Test SMTP** button in Admin Panel or run this command:

```bash
curl -X POST http://localhost:3000/api/admin/test-smtp \
  -H "Content-Type: application/json" \
  -d '{"testEmail":"rupanshsaini2@gmail.com"}'
```

**Success Response:**
```json
{
  "success": true,
  "message": "SMTP test email sent successfully!",
  "messageId": "..."
}
```

**Error Response - What to do:**
- ❌ "SMTP credentials not configured" → Go back to Step 2
- ❌ "Invalid login" → Check your Gmail App Password is correct
- ❌ "Connection timeout" → Check host/port are correct (smtp.gmail.com:465)

---

## Configuration Methods

### Method 1: Admin Panel (Easiest) ✅
1. Login as admin
2. Go to Settings → SMTP Configuration
3. Enter credentials
4. Click Test & Save

### Method 2: Environment Variables (.env)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=rupanshsaini2@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

Then restart the server:
```bash
npm start
```

### Method 3: Database (if using MongoDB)
Settings are stored in the `settings` collection:
```json
{
  "_id": "smtpUser",
  "key": "smtpUser",
  "value": "rupanshsaini2@gmail.com",
  "label": "SMTP User (Gmail)"
}
```

---

## Updated Email Template

✅ **New email template includes:**
- ✓ Lencho logo image
- ✓ Professional gradient header
- ✓ Large OTP display
- ✓ 10-minute expiry notice
- ✓ Professional footer

---

## After Configuration

### 1️⃣ OTP Will Now Send To:
- Email provided during signup
- Phone (if configured for SMS)

### 2️⃣ User will see:
- ✅ "OTP sent! Check your inbox."
- Email with logo and OTP code
- 10 minutes to verify

### 3️⃣ Signup Flow:
1. Enter email & password
2. Click "Send OTP"
3. OTP sent to email
4. Enter OTP on next screen
5. Account created ✅

---

## Troubleshooting

### "Unable to send OTP right now"
- **Cause**: SMTP not configured
- **Fix**: Follow Step 2 above

### "Invalid login"
- **Cause**: Wrong App Password
- **Fix**: Get a new App Password from Google
- **Note**: Don't use regular Gmail password!

### "Connection timeout"
- **Cause**: Wrong SMTP host/port
- **Fix**: Use `smtp.gmail.com:465` exactly

### Email not received
- **Cause**: Email might be in Spam folder
- **Fix**: Check spam/promotions folder
- **Alternative**: Check if transporter verify passed

### Still having issues?
1. Check server console logs for `[auth]` messages
2. Run test endpoint: `POST /api/admin/test-smtp`
3. Verify environment variables are set
4. Restart server after changes

---

## Security Notes ⚠️

- ✅ App Password is safer than Gmail password
- ✅ Store credentials in environment variables
- ✅ Don't commit `.env` to git
- ✅ Regenerate App Password if compromised

---

## OTP Flow Diagram

```
User Signup
    ↓
Enter email → Click "Send OTP"
    ↓
Check SMTP Config
    ↓
Send Email (with logo + OTP)
    ↓
Email received
    ↓
User enters OTP
    ↓
Account Created ✅
```

---

## Next Steps

1. ✅ Configure SMTP in Admin Panel
2. ✅ Test with `/api/admin/test-smtp`
3. ✅ Try signup again - OTP should now work
4. ✅ Check email for logo and code

**Email preview:**
- Logo at top (Lencho icon)
- Gradient pink header
- Large 6-digit OTP
- 10-minute timer notice
- Professional Lencho footer

---

## Support

If still having issues:
- Check `/api/otp/send-email` endpoint logs
- Verify SMTP settings saved correctly
- Ensure 2FA enabled on Google Account
- Try different test email
