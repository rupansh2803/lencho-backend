import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setUser } from '../store/authSlice'
import { authAPI } from '../services/apiService'
import { ErrorMessage, SuccessMessage, LoadingSpinner } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user } = useSelector(state => state.auth)
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  })
  const [editMode, setEditMode] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await authAPI.updateProfile(formData)
      dispatch(setUser(response.user))
      setSuccess('Profile updated successfully!')
      setEditMode(false)
      toast.success('Profile updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update profile'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">My Profile</h1>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}
        {success && <SuccessMessage message={success} />}

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Profile Header */}
          <div className="flex items-center justify-between mb-8 pb-8 border-b">
            <div>
              <h2 className="text-3xl font-bold mb-2">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-gray-600">{user?.phone}</p>
            </div>
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Profile Form */}
          {editMode ? (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false)
                    setFormData({
                      name: user?.name || '',
                      email: user?.email || '',
                      phone: user?.phone || ''
                    })
                  }}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Full Name</label>
                <p className="text-lg mt-1">{formData.name}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Email Address</label>
                <p className="text-lg mt-1">{formData.email}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Phone Number</label>
                <p className="text-lg mt-1">{formData.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-4">Account Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-600">Account Type</label>
              <p className="text-lg mt-1 capitalize">{user?.role || 'Customer'}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Account Status</label>
              <p className="text-lg mt-1 flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                {user?.isVerified ? 'Verified' : 'Pending'}
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Member Since</label>
              <p className="text-lg mt-1">{new Date(user?.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600">Last Updated</label>
              <p className="text-lg mt-1">{new Date(user?.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
