import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'

export default function AdminAuthSettings() {
  const { user } = useSelector(state => state.auth)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold">Admin access required</p>
      </div>
    )
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth-settings')
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const toggleSetting = async (key) => {
    try {
      setUpdating(key)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/auth-settings/${key}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to update setting')
      }

      const data = await response.json()
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }))
      toast.success(`${key} ${!settings[key] ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error('Failed to update setting')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load settings</p>
      </div>
    )
  }

  const settingsList = [
    {
      key: 'emailLogin',
      label: 'Email & Password Login',
      description: 'Allow users to login with email and password'
    },
    {
      key: 'phoneLogin',
      label: 'Phone + OTP Login',
      description: 'Allow users to login with phone number and OTP'
    },
    {
      key: 'googleLogin',
      label: 'Google Sign-in',
      description: 'Allow users to login with Google account'
    },
    {
      key: 'signupEnabled',
      label: 'Enable Signup',
      description: 'Allow new users to create accounts'
    },
    {
      key: 'guestCheckout',
      label: 'Guest Checkout',
      description: 'Allow users to checkout without account'
    },
    {
      key: 'passwordReset',
      label: 'Password Reset',
      description: 'Allow users to reset forgotten passwords'
    },
    {
      key: 'twoFactorAuth',
      label: 'Two-Factor Authentication',
      description: 'Enable 2FA for enhanced security'
    }
  ]

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Authentication Settings</h1>
        <p className="text-gray-600">Manage authentication methods available to users</p>
      </div>

      {/* Last Modified Info */}
      {settings.lastModifiedDate && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Last modified by <strong>{settings.lastModified}</strong> on{' '}
            {new Date(settings.lastModifiedDate).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsList.map(setting => (
          <div
            key={setting.key}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-gold transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{setting.label}</h3>
                <p className="text-sm text-gray-600 mt-2">{setting.description}</p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleSetting(setting.key)}
                disabled={updating === setting.key}
                className={`ml-4 relative w-14 h-8 rounded-full transition ${
                  settings[setting.key]
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                } ${updating === setting.key ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition transform ${
                    settings[setting.key] ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mt-4">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  settings[setting.key]
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {settings[setting.key] ? '✓ Enabled' : '✕ Disabled'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Authentication Methods</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {settingsList
            .filter(s => settings[s.key])
            .map(s => (
              <div
                key={s.key}
                className="p-3 bg-white rounded border border-green-200 text-sm text-green-800"
              >
                ✓ {s.label}
              </div>
            ))}
        </div>
        {settingsList.filter(s => settings[s.key]).length === 0 && (
          <p className="text-gray-600">No authentication methods enabled</p>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Best Practices</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Always keep at least one login method enabled</li>
          <li>• Email login is recommended as a primary method</li>
          <li>• Enable phone OTP for additional security options</li>
          <li>• Configure Google OAuth credentials before enabling</li>
          <li>• Disabling signup will prevent new account creation</li>
        </ul>
      </div>
    </div>
  )
}
