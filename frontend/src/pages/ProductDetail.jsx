import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import { addToWishlist, removeFromWishlist } from '../store/wishlistSlice'
import { productAPI } from '../services/apiService'
import { Loading } from '../components/Common/LoadingSpinner'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const dispatch = useDispatch()
  const wishlist = useSelector(state => state.wishlist.items)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      const response = await productAPI.getById(id)
      setProduct(response.data)
    } catch (error) {
      toast.error('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    dispatch(addToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
      quantity
    }))
    toast.success(`Added ${quantity} item(s) to cart!`)
  }

  const toggleWishlist = () => {
    const isWishlisted = wishlist.some(item => item._id === product._id)
    if (isWishlisted) {
      dispatch(removeFromWishlist(product._id))
      toast.success('Removed from wishlist')
    } else {
      dispatch(addToWishlist(product))
      toast.success('Added to wishlist')
    }
  }

  if (loading) return <Loading />
  if (!product) return <div className="text-center py-12">Product not found</div>

  const isWishlisted = wishlist.some(item => item._id === product._id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <div className="text-gray-600 mb-8 text-sm">
          <Link to="/" className="hover:text-gold">Home</Link>
          {' > '}
          <Link to="/products" className="hover:text-gold">Products</Link>
          {' > '}
          <span>{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-lg shadow-lg p-8">
          {/* Images */}
          <div>
            <div className="mb-4 h-96 bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={product.images?.[0] || 'https://via.placeholder.com/400x500'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {product.images?.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} ${idx + 1}`}
                  className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-75"
                />
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
            
            {/* Price */}
            <div className="mb-6">
              <span className="text-4xl font-bold text-gold">₹{product.price}</span>
              {product.mrp && (
                <>
                  <span className="ml-4 text-2xl text-gray-500 line-through">₹{product.mrp}</span>
                  <span className="ml-4 text-green-600 font-semibold">
                    {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Rating */}
            {product.rating && (
              <div className="mb-6 flex items-center gap-2">
                <span className="text-gold">★</span>
                <span className="font-semibold">{product.rating} ({product.reviews?.length || 0} reviews)</span>
              </div>
            )}

            {/* Description */}
            <p className="text-gray-600 mb-6">{product.description}</p>

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">Specifications</h3>
                <div className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-gray-600">
                      <span>{key}:</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <span className="text-green-600 font-semibold">✓ In Stock</span>
              ) : (
                <span className="text-red-600 font-semibold">✗ Out of Stock</span>
              )}
            </div>

            {/* Quantity Selector */}
            <div className="mb-6 flex items-center gap-4">
              <label className="font-semibold">Quantity:</label>
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center border-none focus:outline-none"
                  min="1"
                  max={product.stock}
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 px-6 py-3 bg-gold text-white rounded-lg font-semibold hover:bg-gold-dark transition disabled:opacity-50"
              >
                Add to Cart
              </button>
              <button
                onClick={toggleWishlist}
                className="px-6 py-3 border-2 border-gold text-gold rounded-lg font-semibold hover:bg-gold/10 transition text-2xl"
              >
                {isWishlisted ? '❤️' : '🤍'}
              </button>
            </div>

            {/* Delivery Info */}
            <div className="mt-8 pt-8 border-t space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚚</span>
                <div>
                  <p className="font-semibold">Free Delivery</p>
                  <p className="text-gray-600 text-sm">On orders above ₹500</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-semibold">Easy Returns</p>
                  <p className="text-gray-600 text-sm">7 days return policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        {product.reviews && product.reviews.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6">Customer Reviews</h2>
            <div className="space-y-4">
              {product.reviews.map((review, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold">{review.userName}</h4>
                    <span className="text-gold">{'★'.repeat(review.rating)}</span>
                  </div>
                  <p className="text-gray-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
