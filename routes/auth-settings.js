const express = require('express')
const AuthSettings = require('../models/AuthSettings')
const { authMiddleware } = require('../middleware/auth')
const router = express.Router()

// Initialize default settings (run once)
const initializeSettings = async () => {
  const exists = await AuthSettings.findOne()
  if (!exists) {
    await AuthSettings.create({
      emailLogin: true,
      googleLogin: false,
      phoneLogin: false,
      signupEnabled: true,
      guestCheckout: false,
      passwordReset: true,
      twoFactorAuth: false,
      lastModified: 'System'
    })
  }
}

// Get auth settings (public)
router.get('/', async (req, res) => {
  try {
    await initializeSettings()
    const settings = await AuthSettings.findOne()
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' })
    }
    res.json(settings)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Update auth settings (admin only)
router.put('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin (you can add role-based auth here)
    const user = req.user
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const settings = await AuthSettings.findOneAndUpdate(
      {},
      {
        ...req.body,
        lastModified: user.name || 'Admin',
        lastModifiedDate: new Date()
      },
      { new: true, upsert: true }
    )

    res.json({
      message: 'Settings updated successfully',
      settings
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Get specific setting
router.get('/:key', async (req, res) => {
  try {
    await initializeSettings()
    const settings = await AuthSettings.findOne()
    const { key } = req.params
    
    if (!(key in settings.toObject())) {
      return res.status(404).json({ message: 'Setting not found' })
    }
    
    res.json({
      key,
      value: settings[key]
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Toggle specific setting
router.patch('/:key', authMiddleware, async (req, res) => {
  try {
    const user = req.user
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { key } = req.params
    const settings = await AuthSettings.findOne()
    
    if (!(key in settings.toObject())) {
      return res.status(404).json({ message: 'Setting not found' })
    }

    const updateData = {
      [key]: !settings[key],
      lastModified: user.name || 'Admin',
      lastModifiedDate: new Date()
    }

    const updated = await AuthSettings.findOneAndUpdate(
      {},
      updateData,
      { new: true }
    )

    res.json({
      message: `Setting '${key}' toggled successfully`,
      key,
      value: updated[key]
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
