import api from './api'

const authAPI = {
  // Email signup
  signup: async (email, password, name, phone) => {
    const response = await api.post('/auth/signup', {
      email,
      password,
      name,
      phone
    })
    return response.data
  },

  // Email login
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    })
    return response.data
  },

  // Send email OTP
  sendEmailOTP: async (email) => {
    const response = await api.post('/otp/send-email', { email })
    return response.data
  },

  // Verify email OTP
  verifyEmailOTP: async (email, otp, password, name, phone) => {
    const response = await api.post('/otp/verify-email', {
      email,
      otp,
      password,
      name,
      phone
    })
    return response.data
  },

  // Send phone OTP
  sendPhoneOTP: async (phone) => {
    const response = await api.post('/otp/send', { phone })
    return response.data
  },

  // Verify phone OTP
  verifyPhoneOTP: async (phone, otp, password, name, email) => {
    const response = await api.post('/otp/verify', {
      phone,
      otp,
      password,
      name,
      email
    })
    return response.data
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/me')
    return response.data
  },

  // Logout
  logout: async () => {
    const response = await api.post('/logout')
    return response.data
  },

  // Google auth callback
  googleAuth: async (token) => {
    const response = await api.post('/auth/google', { token })
    return response.data
  }
}

export default authAPI
