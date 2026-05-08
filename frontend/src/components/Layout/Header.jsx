import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../store/authSlice'
import { useState } from 'react'

export default function Header() {
  const { user, isAuthenticated } = useSelector(state => state.auth)
  const { totalItems: cartCount } = useSelector(state => state.cart)
  const { totalItems: wishlistCount } = useSelector(state => state.wishlist)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
    setProfileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 bg-white">
      {/* Offer Bar */}
      <div className="w-full bg-gradient-to-r from-gold to-gold-dark text-white py-2 px-4 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs sm:text-sm font-semibold">
            🎉 LIMITED OFFER: FLAT 50% OFF ON SELECTED ITEMS + FREE DELIVERY!
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="border-b border-gray-100 shadow-sm">
        <div className="w-full px-4 sm:px-6 md:px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gold hover:text-gold-dark transition"
              onClick={() => setMenuOpen(false)}
            >
              <span className="text-2xl">✨</span>
              <span className="hidden sm:inline">Lencho</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8 text-gray-700">
              <Link to="/" className="hover:text-gold transition font-medium">
                Home
              </Link>
              <Link to="/products" className="hover:text-gold transition font-medium">
                Products
              </Link>
              <Link to="/track" className="hover:text-gold transition font-medium">
                Track Order
              </Link>
              <Link to="/contact" className="hover:text-gold transition font-medium">
                Contact
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="relative hover:text-gold transition flex items-center justify-center w-10 h-10 hover:bg-gold/10 rounded-full transition"
              >
                <span className="text-xl">❤️</span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative hover:text-gold transition flex items-center justify-center w-10 h-10 hover:bg-gold/10 rounded-full transition"
              >
                <span className="text-xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gold text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Auth Section */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="px-3 sm:px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition font-semibold flex items-center gap-2 text-sm sm:text-base"
                  >
                    <span>👤</span>
                    <span className="hidden sm:inline">
                      {user?.name?.split(' ')[0] || 'Account'}
                    </span>
                    <span>▼</span>
                  </button>

                  {/* Profile Dropdown */}
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-lg min-w-48 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link
                        to="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gold/10 hover:text-gold transition font-medium border-b border-gray-100"
                      >
                        👤 My Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gold/10 hover:text-gold transition font-medium border-b border-gray-100"
                      >
                        📦 My Orders
                      </Link>
                      <Link
                        to="/addresses"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-4 py-3 hover:bg-gold/10 hover:text-gold transition font-medium border-b border-gray-100"
                      >
                        📍 Addresses
                      </Link>
                      {user?.role === 'admin' && (
                        <>
                          <Link
                            to="/admin/auth-settings"
                            onClick={() => setProfileMenuOpen(false)}
                            className="block px-4 py-3 hover:bg-gold/10 hover:text-gold transition font-medium border-b border-gray-100"
                          >
                            ⚙️ Auth Settings
                          </Link>
                          <Link
                            to="/admin"
                            onClick={() => setProfileMenuOpen(false)}
                            className="block px-4 py-3 hover:bg-gold/10 hover:text-gold transition font-medium border-b border-gray-100"
                          >
                            🛠️ Admin Panel
                          </Link>
                        </>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 hover:text-red-700 transition font-medium"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition font-semibold text-sm sm:text-base"
                >
                  Login
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden text-2xl ml-2 hover:text-gold transition"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 px-4 sm:px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              to="/"
              className="block px-4 py-3 hover:text-gold hover:bg-white rounded-lg transition font-medium"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/products"
              className="block px-4 py-3 hover:text-gold hover:bg-white rounded-lg transition font-medium"
              onClick={() => setMenuOpen(false)}
            >
              Products
            </Link>
            <Link
              to="/track"
              className="block px-4 py-3 hover:text-gold hover:bg-white rounded-lg transition font-medium"
              onClick={() => setMenuOpen(false)}
            >
              Track Order
            </Link>
            <Link
              to="/contact"
              className="block px-4 py-3 hover:text-gold hover:bg-white rounded-lg transition font-medium"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
