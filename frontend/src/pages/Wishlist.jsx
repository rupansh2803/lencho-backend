import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { removeFromWishlist } from '../store/wishlistSlice'
import { addToCart } from '../store/cartSlice'
import toast from 'react-hot-toast'

export default function Wishlist() {
  const { items } = useSelector(state => state.wishlist)
  const dispatch = useDispatch()

  const handleRemove = (productId) => {
    dispatch(removeFromWishlist(productId))
    toast.success('Removed from wishlist')
  }

  const handleAddToCart = (item) => {
    dispatch(addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      image: item.images?.[0]
    }))
    toast.success('Added to cart!')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold mb-8">My Wishlist</h1>
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="text-6xl mb-4">❤️</div>
            <p className="text-2xl font-bold mb-4">Your wishlist is empty</p>
            <p className="text-gray-600 mb-8">Add products to your wishlist to save them for later</p>
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
        <h1 className="text-4xl font-bold mb-8">My Wishlist ({items.length})</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(item => (
            <div key={item._id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden">
              <div className="h-64 bg-gray-200 overflow-hidden">
                <img
                  src={item.images?.[0] || 'https://via.placeholder.com/300x400'}
                  alt={item.name}
                  className="w-full h-full object-cover hover:scale-110 transition duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-gold">₹{item.price}</span>
                  {item.mrp && (
                    <span className="text-gray-500 line-through">₹{item.mrp}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/product/${item._id}`}
                    className="flex-1 px-4 py-2 bg-gray-200 text-center rounded hover:bg-gray-300 transition"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="flex-1 px-4 py-2 bg-gold text-white rounded hover:bg-gold-dark transition"
                  >
                    Add to Cart
                  </button>
                </div>
                <button
                  onClick={() => handleRemove(item._id)}
                  className="w-full mt-2 px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
