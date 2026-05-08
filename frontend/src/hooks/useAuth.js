import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'

export const useAuth = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, token, isAuthenticated, isLoading, error } = useSelector(state => state.auth)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return { user, token, isAuthenticated, isLoading, error, logout: handleLogout }
}

export const useCart = () => {
  const { items, totalItems } = useSelector(state => state.cart)
  return { items, totalItems }
}

export const useWishlist = () => {
  const { items, totalItems } = useSelector(state => state.wishlist)
  return { items, totalItems }
}
