const jwt = require('jsonwebtoken')

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] // Bearer token
    
    if (!token) {
      return res.status(401).json({ 
        message: 'No token provided',
        success: false 
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    req.user = decoded
    req.userId = decoded.userId || decoded.id
    next()
  } catch (error) {
    return res.status(401).json({ 
      message: 'Invalid or expired token',
      success: false 
    })
  }
}

// Generate JWT token
const generateToken = (userId, userRole = 'customer') => {
  return jwt.sign(
    { userId, id: userId, role: userRole },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  )
}

module.exports = { authMiddleware, generateToken }
