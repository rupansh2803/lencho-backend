const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const { User } = require('../models')
const { generateToken, authMiddleware } = require('../middleware/auth')
const { sendOTP, verifyOTP } = require('../services/otpService') // You'll need to create this

// ─────────────────────────────────────────────────
// LOGIN / SIGNUP WITH EMAIL + OTP
// ─────────────────────────────────────────────────

// Send Email OTP
router.post('/otp/send-email', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Save OTP to database/cache (set 10 min expiry)
    // This requires OTPLog model implementation
    await saveOTP(email, otp, 'email')

    // Send OTP via email (using nodemailer)
    await sendEmailOTP(email, otp)

    res.json({
      success: true,
      message: 'OTP sent to your email'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Verify Email OTP & Signup/Login
router.post('/otp/verify-email', async (req, res) => {
  try {
    const { email, otp, password, name, phone } = req.body

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      })
    }

    // Verify OTP
    const isOTPValid = await verifyEmailOTP(email, otp)
    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      })
    }

    // Check if user exists
    let user = await User.findOne({ email })

    if (user) {
      // Existing user - just login
      const token = generateToken(user._id, user.role)
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      })
    }

    // New user - create account
    if (!password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Password and name required for new account'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    user = new User({
      name,
      email,
      phone: phone || '',
      password: hashedPassword,
      role: 'customer',
      isVerified: true // Email verified via OTP
    })

    await user.save()

    const token = generateToken(user._id, user.role)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// LOGIN / SIGNUP WITH PHONE + OTP
// ─────────────────────────────────────────────────

// Send Phone OTP
router.post('/otp/send', async (req, res) => {
  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      })
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Save OTP
    await saveOTP(phone, otp, 'phone')

    // Send via SMS (Fast2SMS or similar)
    await sendPhoneOTP(phone, otp)

    res.json({
      success: true,
      message: 'OTP sent to your phone'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// Verify Phone OTP & Signup/Login
router.post('/otp/verify', async (req, res) => {
  try {
    const { phone, otp, password, name, email } = req.body

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required'
      })
    }

    // Verify OTP
    const isOTPValid = await verifyPhoneOTP(phone, otp)
    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      })
    }

    // Check if user exists
    let user = await User.findOne({ phone })

    if (user) {
      // Existing user - just login
      const token = generateToken(user._id, user.role)
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      })
    }

    // New user - create account
    if (!password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Password and name required for new account'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    user = new User({
      name,
      email: email || `${phone}@lencho.local`,
      phone,
      password: hashedPassword,
      role: 'customer',
      isVerified: true
    })

    await user.save()

    const token = generateToken(user._id, user.role)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// EMAIL/PASSWORD LOGIN
// ─────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const token = generateToken(user._id, user.role)

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// EMAIL/PASSWORD SIGNUP
// ─────────────────────────────────────────────────

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      })
    }

    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = new User({
      name,
      email,
      phone: phone || '',
      password: hashedPassword,
      role: 'customer'
    })

    await user.save()

    const token = generateToken(user._id, user.role)

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// GOOGLE AUTH
// ─────────────────────────────────────────────────

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      })
    }

    // Verify token with Google
    const googleResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
    )

    const { email, name } = googleResponse.data

    let user = await User.findOne({ email })

    if (!user) {
      // Create new user
      user = new User({
        name,
        email,
        role: 'customer',
        isVerified: true,
        googleId: googleResponse.data.user_id
      })
      await user.save()
    } else if (!user.googleId) {
      // Update existing user with Google ID
      user.googleId = googleResponse.data.user_id
      await user.save()
    }

    const jwtToken = generateToken(user._id, user.role)

    res.json({
      success: true,
      message: 'Google login successful',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// GET CURRENT USER (Protected)
// ─────────────────────────────────────────────────

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// UPDATE PROFILE (Protected)
// ─────────────────────────────────────────────────

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone } = req.body

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password')

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// ─────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────

router.post('/logout', authMiddleware, (req, res) => {
  // JWT is stateless, logout happens on client by removing token
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

module.exports = router
