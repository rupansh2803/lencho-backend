import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { loginSuccess, loginError } from '../store/authSlice'
import { authAPI } from '../services/apiService'
import { ErrorMessage } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Signup() {
  const [step, setStep] = useState('info') // info, otp, verify
  const [method, setMethod] = useState('email') // email or phone
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.password) {
      setError('Please fill all fields')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      if (method === 'email') {
        await authAPI.sendEmailOTP(formData.email)
      } else {
        await authAPI.sendPhoneOTP(formData.phone)
      }
      setStep('otp')
      toast.success(`OTP sent to your ${method}`)
    } catch (err) {
      const message = err.response?.data?.message || `Failed to send OTP to ${method}`
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp) {
      setError('Please enter OTP')
      return
    }

    setLoading(true)
    try {
      let response
      if (method === 'email') {
        response = await authAPI.verifyEmailOTP(
          formData.email,
          otp,
          formData.password,
          formData.name,
          formData.phone
        )
      } else {
        response = await authAPI.verifyPhoneOTP(
          formData.phone,
          otp,
          formData.password,
          formData.name,
          formData.email
        )
      }

      dispatch(loginSuccess({
        user: response.user,
        token: response.token
      }))
      toast.success('Account created successfully!')
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-gold/20 flex items-center justify-center py-12 px-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gold">
          ✨ Join Lencho
        </h1>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}

        {step === 'info' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
              />
            </div>

            {/* Method Toggle */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={method === 'email'}
                  onChange={() => setMethod('email')}
                  className="mr-2"
                />
                Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={method === 'phone'}
                  onChange={() => setMethod('phone')}
                  className="mr-2"
                />
                Phone
              </label>
            </div>

            {method === 'email' ? (
              <div>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark transition disabled:opacity-50"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <p className="text-gray-600 text-center">
              Enter the OTP sent to your {method}
            </p>
            <div>
              <label className="block text-sm font-semibold mb-2">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                maxLength="6"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('info')
                setOtp('')
              }}
              className="w-full py-2 border-2 border-gold text-gold rounded-lg font-semibold hover:bg-gold/10 transition"
            >
              Back
            </button>
          </form>
        )}

        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-gold font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
