import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: JSON.parse(localStorage.getItem('wishlistItems')) || [],
  totalItems: JSON.parse(localStorage.getItem('wishlistItems'))?.length || 0
}

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload.id)
      if (!existingItem) {
        state.items.push(action.payload)
        state.totalItems = state.items.length
        localStorage.setItem('wishlistItems', JSON.stringify(state.items))
      }
    },
    removeFromWishlist: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload)
      state.totalItems = state.items.length
      localStorage.setItem('wishlistItems', JSON.stringify(state.items))
    },
    setWishlist: (state, action) => {
      state.items = action.payload
      state.totalItems = action.payload.length
      localStorage.setItem('wishlistItems', JSON.stringify(action.payload))
    }
  }
})

export const { addToWishlist, removeFromWishlist, setWishlist } = wishlistSlice.actions
export default wishlistSlice.reducer
