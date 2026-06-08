const mongoose = require('mongoose')

const authSettingsSchema = new mongoose.Schema(
  {
    emailLogin: {
      type: Boolean,
      default: true
    },
    googleLogin: {
      type: Boolean,
      default: false
    },
    phoneLogin: {
      type: Boolean,
      default: false
    },
    signupEnabled: {
      type: Boolean,
      default: true
    },
    guestCheckout: {
      type: Boolean,
      default: false
    },
    passwordReset: {
      type: Boolean,
      default: true
    },
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    lastModified: {
      type: String,
      default: 'System'
    },
    lastModifiedDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model('AuthSettings', authSettingsSchema)
