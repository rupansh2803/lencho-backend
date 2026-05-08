import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import { addToWishlist, removeFromWishlist } from '../store/wishlistSlice'
import { productAPI } from '../services/apiService'
import { Loading } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const dispatch = useDispatch()
  const wishlist = useSelector(state => state.wishlist.items)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [category, page])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await productAPI.getAll(page, 12, category)
      setProducts(response.data.products || response.data)
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories()
      setCategories(response.data || [])
    } catch (error) {
      console.error('Failed to load categories')
    }
  }

  const handleAddToCart = (product) => {
    dispatch(addToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]
    }))
    toast.success('Added to cart!')
  }

  const toggleWishlist = (product) => {
    const isWishlisted = wishlist.some(item => item._id === product._id)
    if (isWishlisted) {
      dispatch(removeFromWishlist(product._id))
      toast.success('Removed from wishlist')
    } else {
      dispatch(addToWishlist(product))
      toast.success('Added to wishlist')
    }
  }

  if (loading && page === 1) return <Loading />

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Our Collection</h1>

        {/* Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gold"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {products.map(product => (
                <div key={product._id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden">
                  <div className="relative h-64 bg-gray-200 overflow-hidden">
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/300x400'}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-110 transition duration-300"
                    />
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-2 right-2 text-2xl"
                    >
                      {wishlist.some(item => item._id === product._id) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-gold">₹{product.price}</span>
                      {product.mrp && (
                        <span className="text-gray-500 line-through">₹{product.mrp}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/product/${product._id}`}
                        className="flex-1 px-4 py-2 bg-gray-200 text-center rounded hover:bg-gray-300 transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 px-4 py-2 bg-gold text-white rounded hover:bg-gold-dark transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-6 py-2 border border-gold text-gold rounded-lg hover:bg-gold/10 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                className="px-6 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No products found</p>
          </div>
        )}
      </div>
    </div>
  )
}
