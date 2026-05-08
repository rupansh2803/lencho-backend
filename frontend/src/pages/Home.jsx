import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import { productAPI } from '../services/apiService'
import { Loading } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const dispatch = useDispatch()
  const { user } = useSelector(state => state.auth)

  useEffect(() => {
    fetchFeaturedProducts()
  }, [])

  const fetchFeaturedProducts = async () => {
    try {
      const response = await productAPI.getAll(1, 8)
      setProducts(response.data.products || response.data)
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
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

  if (loading) return <Loading />

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-96 md:h-full md:min-h-[600px] bg-gradient-to-r from-purple-600 to-gold overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between relative z-10">
          <div className="text-white max-w-xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Premium Artificial Jewellery
            </h1>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Elegant designs for every occasion. Affordable luxury at its finest.
            </p>
            <Link
              to="/products"
              className="inline-block px-8 py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold-dark transition"
            >
              Shop Now
            </Link>
          </div>
          <div className="hidden md:block text-6xl">✨💎</div>
        </div>
      </section>

      {/* Greeting Section */}
      {user && (
        <section className="bg-gold/10 py-6 text-center">
          <p className="text-lg font-semibold">
            Welcome back, <span className="text-gold">{user.name}!</span> Enjoy exclusive deals today.
          </p>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-12 text-center">Featured Collection</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product._id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden">
              <div className="h-64 bg-gray-200 overflow-hidden">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/300x400'}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-110 transition duration-300"
                />
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
      </section>

      {/* CTA Section */}
      <section className="bg-gold/10 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Why Choose Lencho?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
          <div className="text-center">
            <div className="text-4xl mb-4">🎁</div>
            <h3 className="font-bold text-xl mb-2">Premium Quality</h3>
            <p className="text-gray-600">Crafted with precision and care</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="font-bold text-xl mb-2">Fast Delivery</h3>
            <p className="text-gray-600">Doorstep delivery within 2-3 days</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">💳</div>
            <h3 className="font-bold text-xl mb-2">Secure Payment</h3>
            <p className="text-gray-600">100% safe and secure checkout</p>
          </div>
        </div>
      </section>
    </div>
  )
}
