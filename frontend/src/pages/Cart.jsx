import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { removeFromCart, updateQuantity, clearCart } from '../store/cartSlice'
import { LoadingSpinner } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Cart() {
  const { items } = useSelector(state => state.cart)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const totalPrice = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

  const handleRemove = (productId) => {
    dispatch(removeFromCart(productId))
    toast.success('Removed from cart')
  }

  const handleQuantityChange = (productId, quantity) => {
    if (quantity <= 0) {
      handleRemove(productId)
    } else {
      dispatch(updateQuantity({ id: productId, quantity }))
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-2xl font-bold mb-4">Your cart is empty</p>
            <p className="text-gray-600 mb-8">Start shopping to add items to your cart</p>
            <Link
              to="/products"
              className="inline-block px-8 py-3 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-4 text-left">Product</th>
                    <th className="px-4 py-4 text-center">Price</th>
                    <th className="px-4 py-4 text-center">Quantity</th>
                    <th className="px-4 py-4 text-center">Total</th>
                    <th className="px-4 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image || 'https://via.placeholder.com/80x80'}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-gray-600 text-sm">Product ID: {item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">₹{item.price}</td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg w-fit mx-auto">
                          <button
                            onClick={() => handleQuantityChange(item.id, (item.quantity || 1) - 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            −
                          </button>
                          <span className="px-3">{item.quantity || 1}</span>
                          <button
                            onClick={() => handleQuantityChange(item.id, (item.quantity || 1) + 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold">
                        ₹{item.price * (item.quantity || 1)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => dispatch(clearCart())}
                className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
              >
                Clear Cart
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-20">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({totalItems} items)</span>
                  <span className="font-semibold">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (estimated)</span>
                  <span className="font-semibold">₹{Math.round(totalPrice * 0.18)}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-gold">₹{totalPrice + Math.round(totalPrice * 0.18)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-3 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark transition"
              >
                Proceed to Checkout
              </button>

              <Link
                to="/products"
                className="block text-center mt-4 py-2 border border-gold text-gold rounded-lg hover:bg-gold/10 transition"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
