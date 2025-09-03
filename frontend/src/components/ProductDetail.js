import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  Shield, 
  Truck, 
  RotateCcw,
  Check,
  AlertCircle,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  ThumbsUp,
  Award,
  Eye,
  Zap
} from 'lucide-react';
import axios from 'axios';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, getAuthenticatedAxios } = useAuth();
  const { addToCart, isInCart, getItemQuantity, loading: cartLoading } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [showSpecifications, setShowSpecifications] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchProduct();
    fetchRelatedProducts();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching product with ID: ${id}`);
      
      const response = await axios.get(`${API_BASE_URL}/api/products/${id}`);
      
      console.log('Product API response:', response.data);
      
      if (response.data.success) {
        setProduct(response.data.data);
        console.log('Product loaded successfully:', response.data.data);
      } else {
        throw new Error(response.data.message || 'Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      if (err.response && err.response.status === 404) {
        setError('Product not found');
      } else if (err.response && err.response.status === 500) {
        setError('Server error while loading product. Please try again.');
      } else {
        setError('Failed to load product details. Please check your connection.');
      }
      // Don't fallback to sample data - show actual error
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/?per_page=4`);
      if (response.data.success) {
        setRelatedProducts(response.data.data.filter(p => p.id !== id).slice(0, 4));
      }
    } catch (err) {
      console.error('Error fetching related products:', err);
      // Set empty array instead of sample products
      setRelatedProducts([]);
    }
  };

  const getSampleProduct = (productId) => {
    return {
      id: productId,
      name: 'Premium Crystal Gift Vase',
      description: 'Exquisite hand-crafted crystal vase perfect for any special occasion. This stunning piece combines traditional craftsmanship with contemporary design, making it an ideal gift for weddings, anniversaries, or home decoration.',
      price: 149.99,
      discount_price: 119.99,
      category: 'home_decor',
      brand: 'Vallmark',
      images: [],
      is_in_stock: true,
      stock_quantity: 15,
      features: [
        'Hand-blown crystal construction',
        'Lead-free premium quality',
        'Elegant decorative design',
        'Perfect for flowers or decoration',
        'Gift-ready presentation box'
      ],
      specifications: {
        'Material': 'Premium Crystal Glass',
        'Height': '25cm (9.8 inches)',
        'Diameter': '15cm (5.9 inches)',
        'Weight': '1.2kg (2.6 lbs)',
        'Care': 'Hand wash recommended',
        'Origin': 'Handcrafted',
        'Warranty': '2 years manufacturing defects'
      },
      reviews: {
        rating: 4.7,
        count: 234,
        breakdown: {
          5: 156,
          4: 48,
          3: 22,
          2: 6,
          1: 2
        }
      },
      tags: ['Premium', 'Gift', 'Crystal', 'Handmade', 'Luxury'],
      delivery_info: {
        standard: '3-5 business days',
        express: '1-2 business days',
        same_day: 'Available in select cities'
      }
    };
  };

  const getSampleRelatedProducts = () => [
    {
      id: '2',
      name: 'Elegant Photo Frame Set',
      price: 79.99,
      images: [],
      rating: 4.5
    },
    {
      id: '3',
      name: 'Decorative Candle Collection',
      price: 59.99,
      images: [],
      rating: 4.3
    },
    {
      id: '4',
      name: 'Premium Gift Box',
      price: 39.99,
      images: [],
      rating: 4.6
    },
    {
      id: '5',
      name: 'Crystal Wine Glass Set',
      price: 199.99,
      images: [],
      rating: 4.8
    }
  ];

  const sampleReviews = [
    {
      id: 1,
      user: 'Sarah M.',
      rating: 5,
      date: '2 days ago',
      comment: 'Absolutely beautiful vase! The crystal quality is exceptional and it looks stunning in my living room. Great packaging too.',
      helpful: 12,
      verified: true
    },
    {
      id: 2,
      user: 'Michael R.',
      rating: 5,
      date: '1 week ago',
      comment: 'Bought this as a wedding gift and the couple was thrilled. The craftsmanship is outstanding and it arrived perfectly packed.',
      helpful: 8,
      verified: true
    },
    {
      id: 3,
      user: 'Emma L.',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Beautiful vase, exactly as described. Only minor issue was delivery took a day longer than expected, but worth the wait!',
      helpful: 5,
      verified: true
    }
  ];

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      
      const result = await addToCart(product.id, quantity);
      
      if (result.success) {
        alert('Product added to cart successfully!');
        setQuantity(1);
      } else {
        alert(result.error || 'Failed to add product to cart. Please try again.');
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add product to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-8 border-purple-200 border-t-purple-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-20 animate-pulse"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-6 text-lg font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {error}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The product you're looking for might not exist or has been removed.
          </p>
          <Link
            to="/"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg px-4 py-2 shadow-md">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Products
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">{product?.name}</span>
        </div>

        {/* Enhanced Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg px-4 py-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Enhanced Product Images */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="aspect-square bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                {product?.images && product.images.length > 0 ? (
                  <img
                    src={product.images[selectedImage].startsWith('data:') ? product.images[selectedImage] : product.images[selectedImage].startsWith('http') ? product.images[selectedImage] : `data:image/jpeg;base64,${product.images[selectedImage]}`}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      console.warn(`Failed to load image for product: ${product.name}`);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center"><div class="text-center"><div class="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"><span class="text-6xl font-bold text-white">${product?.name?.charAt(0)}</span></div><p class="text-gray-600 dark:text-gray-400 text-lg font-medium">Product Image</p></div></div>`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-6xl font-bold text-white">
                          {product?.name?.charAt(0)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Product Image</p>
                    </div>
                  </div>
                )}
                
                {/* Premium Badge */}
                <div className="absolute top-4 left-4">
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg animate-pulse">
                    ⭐ Premium
                  </span>
                </div>
              </div>

              {/* Image Thumbnails */}
              {product?.images && product.images.length > 1 && (
                <div className="flex space-x-3 mt-4">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                        selectedImage === index
                          ? 'border-blue-600 scale-105 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:scale-105 hover:shadow-md'
                      }`}
                    >
                      <img src={image.startsWith('data:') ? image : image.startsWith('http') ? image : `data:image/jpeg;base64,${image}`} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Product Details */}
          <div className="space-y-8">
            {/* Product Title and Rating */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent mb-3">
                    {product?.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    by <span className="text-blue-600 dark:text-blue-400">Vallmark</span>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-6 h-6 text-gray-400 hover:text-red-500 cursor-pointer transition-colors" />
                  <Share2 className="w-6 h-6 text-gray-400 hover:text-blue-500 cursor-pointer transition-colors" />
                </div>
              </div>
              
              {product?.reviews && (
                <div className="flex items-center space-x-4 mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {renderStars(product.reviews.rating)}
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {product.reviews.rating}
                    </span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    ({product.reviews.count.toLocaleString()} reviews)
                  </span>
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Verified Reviews</span>
                  </div>
                </div>
              )}

              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">
                {product?.description}
              </p>

              {/* Tags */}
              {product?.tags && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Enhanced Price and Purchase Section */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  {product?.discount_price ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-5xl font-bold text-red-600 dark:text-red-400">
                          {formatPrice(product.discount_price)}
                        </span>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                          SAVE {Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xl text-gray-500 dark:text-gray-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-lg text-green-600 dark:text-green-400 font-semibold">
                          You save {formatPrice(product.price - product.discount_price)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      {formatPrice(product?.price || 0)}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                    product?.is_in_stock
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                  }`}>
                    {product?.is_in_stock ? '✅ In Stock' : '❌ Out of Stock'}
                  </span>
                  {product?.stock_quantity && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Only {product.stock_quantity} left in stock
                    </p>
                  )}
                </div>
              </div>

              {/* Quantity Selector */}
              {product?.is_in_stock && (
                <div className="flex items-center space-x-6 mb-8">
                  <label className="text-lg font-semibold text-gray-900 dark:text-white">
                    Quantity:
                  </label>
                  <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-700 rounded-xl p-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-500 dark:hover:to-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-16 text-center text-xl font-bold text-gray-900 dark:text-white">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product?.stock_quantity || 99, quantity + 1))}
                      className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-500 dark:hover:to-gray-600 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Enhanced Action Buttons */}
              <div className="space-y-4">
                {product?.is_in_stock ? (
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-blue-400 disabled:to-purple-400 text-white py-4 px-8 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
                  >
                    {addingToCart ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        <span>Adding to Cart...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-6 h-6" />
                        <span>Add to Cart - {formatPrice((product?.discount_price || product?.price) * quantity)}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button disabled className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white py-4 px-8 rounded-xl font-bold text-lg cursor-not-allowed">
                    Out of Stock - Get Notified
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-gradient-to-r from-pink-100 to-red-100 dark:from-pink-900/30 dark:to-red-900/30 hover:from-pink-200 hover:to-red-200 dark:hover:from-pink-900/50 dark:hover:to-red-900/50 text-pink-700 dark:text-pink-300 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 transform">
                    <Heart className="w-5 h-5" />
                    <span>Wishlist</span>
                  </button>
                  <button className="bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 hover:from-blue-200 hover:to-cyan-200 dark:hover:from-blue-900/50 dark:hover:to-cyan-900/50 text-blue-700 dark:text-blue-300 py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 hover:scale-105 transform">
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Features */}
            {product?.features && Array.isArray(product.features) && (
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Zap className="w-6 h-6 text-yellow-500 mr-2" />
                  Key Features
                </h3>
                <div className="space-y-3">
                  {product.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Guarantees */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-green-200/50 dark:border-green-700/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Shield className="w-6 h-6 text-green-600 mr-2" />
                Our Promise to You
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">2 Year Warranty</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Full coverage against defects</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <Truck className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Free Shipping</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">On orders over $50</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <RotateCcw className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">30-Day Returns</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Hassle-free returns</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Product Information Tabs */}
        <div className="mt-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-8">
              {['description', 'specifications', 'reviews', 'delivery'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-6 px-2 border-b-2 font-semibold text-lg capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'delivery' ? 'Delivery Info' : tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'description' && (
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                  {product?.description}
                </p>
                {product?.features && Array.isArray(product.features) && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">What makes this special:</h3>
                    <ul className="space-y-2">
                      {product.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specifications' && product?.specifications && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-4 px-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <span className="font-semibold text-gray-900 dark:text-white">{key}</span>
                    <span className="text-gray-600 dark:text-gray-400">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* Reviews Summary */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          {product?.reviews?.rating || 4.7}
                        </span>
                        <div className="flex items-center">
                          {renderStars(product?.reviews?.rating || 4.7)}
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Based on {product?.reviews?.count || 234} reviews
                      </p>
                    </div>
                  </div>
                  
                  {/* Rating Breakdown */}
                  {product?.reviews?.breakdown && (
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <div key={star} className="flex items-center space-x-2">
                          <span className="text-sm w-3">{star}</span>
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{
                                width: `${(product.reviews.breakdown[star] / product.reviews.count) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-8">
                            {product.reviews.breakdown[star]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Individual Reviews */}
                <div className="space-y-6">
                  {sampleReviews.map((review) => (
                    <div key={review.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {review.user.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-gray-900 dark:text-white">{review.user}</span>
                              {review.verified && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                                  Verified Purchase
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center">
                                {renderStars(review.rating)}
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{review.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{review.comment}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Helpful ({review.helpful})</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                  <Truck className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Standard Delivery</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">3-5 business days</p>
                  <p className="text-green-600 dark:text-green-400 font-semibold">FREE</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                  <Zap className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Express Delivery</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">1-2 business days</p>
                  <p className="text-purple-600 dark:text-purple-400 font-semibold">$9.99</p>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
                  <Eye className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Same Day</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Within 24 hours</p>
                  <p className="text-green-600 dark:text-green-400 font-semibold">$19.99</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              You might also like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to={`/products/${relatedProduct.id}`}
                  className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20"
                >
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl mb-4 overflow-hidden">
                    {relatedProduct.images && relatedProduct.images.length > 0 ? (
                      <img
                        src={relatedProduct.images[0]}
                        alt={relatedProduct.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-bold text-gray-500">
                          {relatedProduct.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {relatedProduct.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatPrice(relatedProduct.price)}
                    </span>
                    {relatedProduct.rating && (
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {relatedProduct.rating}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;