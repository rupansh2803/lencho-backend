import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: JSON.parse(localStorage.getItem('cartItems')) || [],
  totalItems: JSON.parse(localStorage.getItem('cartItems'))?.length || 0,
  totalPrice: 0
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload.id)
      if (existingItem) {
        existingItem.quantity += action.payload.quantity || 1
      } else {
        state.items.push({ ...action.payload, quantity: action.payload.quantity || 1 })
      }
      state.totalItems = state.items.length
      localStorage.setItem('cartItems', JSON.stringify(state.items))
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload)
      state.totalItems = state.items.length
      localStorage.setItem('cartItems', JSON.stringify(state.items))
    },
    updateQuantity: (state, action) => {
      const item = state.items.find(item => item.id === action.payload.id)
      if (item) {
        item.quantity = action.payload.quantity
      }
      localStorage.setItem('cartItems', JSON.stringify(state.items))
    },
    clearCart: (state) => {
      state.items = []
      state.totalItems = 0
      localStorage.removeItem('cartItems')
    },
    setCart: (state, action) => {
      state.items = action.payload
      state.totalItems = action.payload.length
      localStorage.setItem('cartItems', JSON.stringify(action.payload))
    }
  }
})

export const { addToCart, removeFromCart, updateQuantity, clearCart, setCart } = cartSlice.actions
export default cartSlice.reducer
