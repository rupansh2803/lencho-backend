import api from './api'

const addressAPI = {
  // Get all addresses for user
  getAddresses: async () => {
    const response = await api.get('/addresses')
    return response.data
  },

  // Add new address
  addAddress: async (addressData) => {
    const response = await api.post('/addresses', addressData)
    return response.data
  },

  // Update address
  updateAddress: async (addressId, addressData) => {
    const response = await api.put(`/addresses/${addressId}`, addressData)
    return response.data
  },

  // Delete address
  deleteAddress: async (addressId) => {
    const response = await api.delete(`/addresses/${addressId}`)
    return response.data
  },

  // Set default address
  setDefaultAddress: async (addressId) => {
    const response = await api.put(`/addresses/${addressId}/default`)
    return response.data
  }
}

export default addressAPI
