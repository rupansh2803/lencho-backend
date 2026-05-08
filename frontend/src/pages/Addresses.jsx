import { useState, useEffect } from 'react'
import { addressAPI } from '../services/apiService'
import { ErrorMessage, SuccessMessage, LoadingSpinner } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Addresses() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    houseNo: '',
    area: '',
    landmark: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    addressType: 'Home',
    isDefault: false
  })

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const response = await addressAPI.getAll()
      setAddresses(response.data || [])
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to load addresses'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (editingId) {
        await addressAPI.update(editingId, formData)
        toast.success('Address updated successfully!')
      } else {
        await addressAPI.create(formData)
        toast.success('Address added successfully!')
      }
      fetchAddresses()
      resetForm()
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save address'
      setError(message)
      toast.error(message)
    }
  }

  const handleEdit = (address) => {
    setFormData(address)
    setEditingId(address._id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return

    try {
      await addressAPI.delete(id)
      toast.success('Address deleted successfully!')
      fetchAddresses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete address')
    }
  }

  const handleSetDefault = async (id) => {
    try {
      await addressAPI.setDefault(id)
      toast.success('Default address updated!')
      fetchAddresses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set default address')
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: '',
      phoneNumber: '',
      email: '',
      houseNo: '',
      area: '',
      landmark: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      addressType: 'Home',
      isDefault: false
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Addresses</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition"
            >
              + Add New Address
            </button>
          )}
        </div>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}
        {success && <SuccessMessage message={success} />}

        {/* Address Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">House No / Flat No *</label>
                  <input
                    type="text"
                    name="houseNo"
                    value={formData.houseNo}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Area / Street *</label>
                  <input
                    type="text"
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Landmark</label>
                  <input
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Country *</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Address Type</label>
                  <select
                    name="addressType"
                    value={formData.addressType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded"
                />
                <label className="font-semibold">Set as default address</label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition"
                >
                  {editingId ? 'Update Address' : 'Add Address'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        {addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map(address => (
              <div key={address._id} className="bg-white rounded-lg shadow-lg p-6 relative">
                {address.isDefault && (
                  <div className="absolute top-4 right-4 bg-gold text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Default
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2">{address.fullName}</h3>
                <div className="space-y-1 text-gray-600 mb-4">
                  <p>{address.houseNo}, {address.area}</p>
                  {address.landmark && <p>Near {address.landmark}</p>}
                  <p>{address.city}, {address.state} {address.pincode}</p>
                  <p>{address.country}</p>
                  <p>Phone: {address.phoneNumber}</p>
                  <p>Email: {address.email}</p>
                  <p className="mt-2">
                    <span className="font-semibold text-gold">{address.addressType}</span>
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address._id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-sm"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="px-4 py-2 bg-gold text-white rounded hover:bg-gold-dark transition text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-2xl font-bold mb-4">No addresses saved yet</p>
            <p className="text-gray-600 mb-8">Add your first address to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-block px-8 py-3 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark"
            >
              Add Address
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
