import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clearCart } from '../store/cartSlice'
import { addressAPI, orderAPI } from '../services/apiService'
import { ErrorMessage, LoadingSpinner } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Checkout() {
  const { items } = useSelector(state => state.cart)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [error, setError] = useState('')

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
      return
    }
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    try {
      const response = await addressAPI.getAll()
      setAddresses(response.data || [])
      if (response.data?.length > 0) {
        const defaultAddress = response.data.find(a => a.isDefault)
        setSelectedAddress(defaultAddress || response.data[0])
      }
    } catch (err) {
      toast.error('Failed to load addresses')
    }
  }

  const totalPrice = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
  const tax = Math.round(totalPrice * 0.18)
  const shipping = 0
  const grandTotal = totalPrice + tax + shipping

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setError('Please select a delivery address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const orderData = {
        items: items.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity || 1,
          price: item.price
        })),
        address: selectedAddress,
        paymentMethod,
        grandTotal
      }

      const response = await orderAPI.create(orderData)
      
      if (paymentMethod === 'razorpay') {
        // Handle Razorpay payment
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY,
          amount: grandTotal * 100,
          currency: 'INR',
          order_id: response.razorpayOrderId,
          handler: function() {
            dispatch(clearCart())
            toast.success('Order placed successfully!')
            navigate('/orders')
          }
        }
        const razor = new window.Razorpay(options)
        razor.open()
      } else {
        dispatch(clearCart())
        toast.success('Order placed successfully!')
        navigate('/orders')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to place order'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        {error && <ErrorMessage message={error} onClose={() => setError('')} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Select Delivery Address</h2>
              
              {addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map(address => (
                    <label key={address._id} className="flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50" 
                      style={{ borderColor: selectedAddress?._id === address._id ? '#FFD700' : '#E5E7EB' }}>
                      <input
                        type="radio"
                        checked={selectedAddress?._id === address._id}
                        onChange={() => setSelectedAddress(address)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-bold">{address.fullName} ({address.addressType})</p>
                        <p className="text-gray-600 text-sm">
                          {address.houseNo}, {address.area}<br/>
                          {address.city}, {address.state} {address.pincode}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">{address.phoneNumber}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No addresses saved. Please add an address first.</p>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Payment Method</h2>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: paymentMethod === 'razorpay' ? '#FFD700' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    value="razorpay"
                    checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="font-semibold">Razorpay (Credit/Debit/UPI)</span>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                  style={{ borderColor: paymentMethod === 'cod' ? '#FFD700' : '#E5E7EB' }}>
                  <input
                    type="radio"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="font-semibold">Cash on Delivery</span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-20">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              {/* Items */}
              <div className="mb-6 max-h-64 overflow-y-auto">
                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} x {item.quantity || 1}</span>
                      <span className="font-semibold">₹{item.price * (item.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-4 mb-6 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (18%)</span>
                  <span className="font-semibold">₹{tax}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-gold">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="w-full py-3 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark transition disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
