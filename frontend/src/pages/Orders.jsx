import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { orderAPI } from '../services/apiService'
import { Loading } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getAll()
      setOrders(response.data || [])
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">My Orders</h1>
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-2xl font-bold mb-4">No orders yet</p>
            <p className="text-gray-600 mb-8">Start shopping to place your first order</p>
            <Link
              to="/products"
              className="inline-block px-8 py-3 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">My Orders</h1>

        <div className="space-y-6">
          {orders.map(order => (
            <div key={order._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Order Header */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-b">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-bold text-lg">{order._id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`font-semibold px-3 py-1 rounded-full text-white text-sm inline-block ${
                    order.status === 'Delivered' ? 'bg-green-600' :
                    order.status === 'Shipped' ? 'bg-blue-600' :
                    order.status === 'Cancelled' ? 'bg-red-600' :
                    'bg-gray-600'
                  }`}>
                    {order.status}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="px-6 py-4">
                <h3 className="font-bold mb-4">Items</h3>
                <div className="space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-gray-600">
                      <span>{item.productName} x {item.quantity}</span>
                      <span className="font-semibold">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gold">₹{order.grandTotal}</p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to={`/track/${order._id}`}
                    className="px-6 py-2 border border-gold text-gold rounded-lg hover:bg-gold/10 transition"
                  >
                    Track Order
                  </Link>
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
                    className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition"
                  >
                    {selectedOrder?._id === order._id ? 'Hide Details' : 'View Details'}
                  </button>
                </div>
              </div>

              {/* Order Details (Expandable) */}
              {selectedOrder?._id === order._id && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold mb-3">Delivery Address</h4>
                      <p className="text-gray-600 text-sm">
                        {order.address?.houseNo}, {order.address?.area}<br/>
                        {order.address?.city}, {order.address?.state} {order.address?.pincode}<br/>
                        {order.address?.country}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold mb-3">Payment Method</h4>
                      <p className="text-gray-600 text-sm capitalize">{order.paymentMethod}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
