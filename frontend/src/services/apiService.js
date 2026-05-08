import api from './api'

// Authentication APIs
export const authAPI = {
  login: (email, password) => api.post('/login', { email, password }),
  signup: (userData) => api.post('/signup', userData),
  loginWithOTP: (email, otp) => api.post('/otp/verify-email', { email, otp }),
  sendOTP: (email) => api.post('/otp/send-email', { email }),
  sendPhoneOTP: (phone) => api.post('/otp/send', { phone }),
  verifyPhoneOTP: (phone, otp) => api.post('/otp/verify', { phone, otp }),
  googleLogin: (googleToken) => api.post('/auth/google', { token: googleToken }),
  logout: () => api.post('/logout'),
  getCurrentUser: () => api.get('/me'),
  updateProfile: (userData) => api.put('/profile', userData)
}

// Product APIs
export const productAPI = {
  getAll: (page = 1, limit = 12, category = '') => 
    api.get('/products', { params: { page, limit, category } }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/categories')
}

// Cart APIs
export const cartAPI = {
  get: () => api.get('/cart'),
  add: (productId, quantity = 1) => api.post('/cart/add', { productId, quantity }),
  update: (productId, quantity) => api.put('/cart/update', { productId, quantity }),
  remove: (productId) => api.delete(`/cart/${productId}`),
  clear: () => api.delete('/cart')
}

// Order APIs
export const orderAPI = {
  getAll: () => api.get('/orders/my'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (orderData) => api.post('/orders', orderData),
  updateStatus: (id, status) => api.put(`/orders/${id}`, { status })
}

// Address APIs
export const addressAPI = {
  getAll: () => api.get('/addresses'),
  getById: (id) => api.get(`/addresses/${id}`),
  create: (addressData) => api.post('/addresses', addressData),
  update: (id, addressData) => api.put(`/addresses/${id}`, addressData),
  delete: (id) => api.delete(`/addresses/${id}`),
  setDefault: (id) => api.put(`/addresses/${id}/default`)
}

// Wishlist APIs
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  add: (productId) => api.post('/wishlist/add', { productId }),
  remove: (productId) => api.delete(`/wishlist/${productId}`)
}

export default {
  auth: authAPI,
  products: productAPI,
  cart: cartAPI,
  orders: orderAPI,
  addresses: addressAPI,
  wishlist: wishlistAPI
}
