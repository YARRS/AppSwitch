import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, getAuthenticatedAxios } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/products/${id}`);
      
      if (response.data.success) {
        setProduct(response.data.data);
      } else {
        throw new Error(response.data.message || 'Product not found');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      if (err.response && err.response.status === 404) {
        setError('Product not found');
      } else {
        setError('Failed to load product details');
        // Fallback to sample product for demo
        setProduct(getSampleProduct(id));
      }
    } finally {
      setLoading(false);
    }
  };

  const getSampleProduct = (productId) => {
    const sampleProducts = {
      '1': {
        id: '1',
        name: 'SmartSwitch Pro',
        description: 'Professional grade smart switch with advanced features for modern homes. Control your lights and appliances from anywhere with our cutting-edge IoT technology.',
        price: 29.99,
        category: 'smart_switch',
        images: [],
        is_in_stock: true,
        stock_quantity: 50,
        features: 'WiFi enabled, voice control, smartphone app, energy monitoring',
        specifications: {
          'Power Rating': '10A/250V',
          'Wireless': 'WiFi 802.11 b/g/n',
          'Compatibility': 'Google Home, Alexa, Apple HomeKit',
          'Installation': 'Standard wall box',
          'App Support': 'iOS and Android',
          'Energy Monitoring': 'Yes'
        },
        reviews: {
          rating: 4.5,
          count: 128
        }
      },
      '2': {
        id: '2',
        name: 'SmartSwitch Basic',
        description: 'Entry-level smart switch perfect for home automation beginners. Simple setup and reliable performance.',
        price: 19.99,
        category: 'smart_switch',
        images: [],
        is_in_stock: true,
        stock_quantity: 75,
        features: 'WiFi enabled, smartphone app, timer function',
        specifications: {
          'Power Rating': '10A/250V',
          'Wireless': 'WiFi 802.11 b/g/n',
          'Compatibility': 'Google Home, Alexa',
          'Installation': 'Standard wall box',
          'App Support': 'iOS and Android'
        },
        reviews: {
          rating: 4.2,
          count: 89
        }
      }
    };

    return sampleProducts[productId] || sampleProducts['1'];
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }

    try {
      setAddingToCart(true);
      // Add to cart API call would go here
      console.log('Adding to cart:', { productId: id, quantity });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message (you can implement a toast notification system)
      alert('Product added to cart successfully!');
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
      currency: 'USD'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {error}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The product you're looking for might not exist or has been removed.
          </p>
          <Link
            to="/products"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400">
          Home
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-blue-600 dark:hover:text-blue-400">
          Products
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{product?.name}</span>
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 rounded-lg overflow-hidden">
            {product?.images && product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {product?.name?.charAt(0)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">Product Image</p>
                </div>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {product?.images && product.images.length > 1 && (
            <div className="flex space-x-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index
                      ? 'border-blue-600'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          {/* Product Title and Rating */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {product?.name}
            </h1>
            
            {product?.reviews && (
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  {renderStars(product.reviews.rating)}
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {product.reviews.rating} ({product.reviews.count} reviews)
                </span>
              </div>
            )}

            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              {product?.description}
            </p>
          </div>

          {/* Price and Stock */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                {product?.discount_price ? (
                  <>
                    <span className="text-4xl font-bold text-red-600 dark:text-red-400">
                      {formatPrice(product.discount_price)}
                    </span>
                    <span className="text-lg text-gray-500 dark:text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                    <span className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Save {formatPrice(product.price - product.discount_price)}
                    </span>
                  </>
                ) : (
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {formatPrice(product?.price || 0)}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  product?.is_in_stock
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {product?.is_in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
                {product?.stock_quantity && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {product.stock_quantity} available
                  </p>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            {product?.is_in_stock && (
              <div className="flex items-center space-x-4 mb-6">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantity:
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-gray-900 dark:text-white font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product?.stock_quantity || 99, quantity + 1))}
                    className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {product?.is_in_stock ? (
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  {addingToCart ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Adding to Cart...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>
              ) : (
                <button disabled className="w-full bg-gray-400 text-white py-3 px-6 rounded-lg font-medium cursor-not-allowed">
                  Out of Stock
                </button>
              )}

              <div className="flex space-x-2">
                <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2">
                  <Heart className="w-5 h-5" />
                  <span>Wishlist</span>
                </button>
                <button className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2">
                  <Share2 className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          {product?.features && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Key Features
              </h3>
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                {product.features}
              </p>
            </div>
          )}

          {/* Guarantees */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">2 Year Warranty</span>
              </div>
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Free Shipping</span>
              </div>
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      {product?.specifications && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Specifications
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="px-6 py-4 flex justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">{key}</span>
                  <span className="text-gray-600 dark:text-gray-400">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;