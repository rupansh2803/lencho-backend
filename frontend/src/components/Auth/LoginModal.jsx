import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loginSuccess, loginError } from '../../store/authSlice'
import { authAPI } from '../../services/apiService'
import toast from 'react-hot-toast'

export default function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authSettings, setAuthSettings] = useState(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Fetch auth settings on mount
  useEffect(() => {
    const fetchAuthSettings = async () => {
      try {
        const response = await fetch('/api/auth-settings')
        const settings = await response.json()
        setAuthSettings(settings)
      } catch (error) {
        console.error('Error fetching auth settings:', error)
        setAuthSettings({
          emailLogin: true,
          googleLogin: false,
          phoneLogin: false
        })
      }
    }
    if (isOpen) {
      fetchAuthSettings()
    }
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await authAPI.login(email, password)
      dispatch(
        loginSuccess({
          user: response.user,
          token: response.token
        })
      )
      toast.success('Login successful!')
      setEmail('')
      setPassword('')
      onClose()
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      setError(message)
      dispatch(loginError(message))
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // Implementation for Google OAuth
    toast.info('Google login coming soon')
  }

  if (!isOpen) return null

  if (!authSettings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin">⏳</div>
            <p className="text-gray-600 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-gold/20 to-purple-100 p-6 sm:p-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <span className="text-2xl">✕</span>
            </button>
            <h1 className="text-3xl font-bold text-center text-gray-900">
              Welcome Back
            </h1>
            <p className="text-center text-gray-600 text-sm mt-2">
              Sign in to your account
            </p>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Google Login */}
            {authSettings.googleLogin && (
              <>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-200 rounded-lg hover:border-gold hover:bg-gold/5 transition mb-6"
                >
                  <span className="text-xl">G</span>
                  <span className="font-semibold text-gray-700">Continue with Google</span>
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-500 font-medium">or login with email</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </>
            )}

            {/* Email Login Form */}
            {authSettings.emailLogin && (
              <form onSubmit={handleEmailLogin} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition"
                    disabled={loading}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <Link
                  to="/forgot-password"
                  className="text-sm text-gold hover:text-gold-dark font-medium transition"
                >
                  Forgot password?
                </Link>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-gold to-gold-dark text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-500">NEW TO LENCHO?</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Create Account Button */}
            {authSettings.signupEnabled && (
              <Link
                to="/signup"
                onClick={onClose}
                className="w-full block text-center py-3 px-4 border-2 border-gold text-gold rounded-lg font-semibold hover:bg-gold/5 transition"
              >
                Create Account
              </Link>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 sm:px-8 py-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-600">
              By signing in, you agree to our{' '}
              <Link to="/terms" className="text-gold hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-gold hover:underline">
                Privacy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
