import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShoppingCart, Plus, Minus, Trash2, ArrowLeft, 
  Package, CreditCard, ShoppingBag, Heart, Sparkles, Zap, Gift 
} from 'lucide-react';

const Cart = () => {
  const { 
    cart, loading, addToCart, removeFromCart, updateQuantity, 
    clearCart, getCartItemCount, getCartTotal 
  } = useCart();
  const { isAuthenticated } = useAuth();
  const [isUpdating, setIsUpdating] = useState({});

  // Function to format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Handle quantity update with loading state
  const handleQuantityUpdate = async (productId, newQuantity) => {
    setIsUpdating(prev => ({ ...prev, [productId]: true }));
    
    try {
      if (newQuantity <= 0) {
        await removeFromCart(productId);
      } else {
        await updateQuantity(productId, newQuantity);
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Handle remove item
  const handleRemoveItem = async (productId) => {
    setIsUpdating(prev => ({ ...prev, [productId]: true }));
    
    try {
      await removeFromCart(productId);
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Handle clear cart
  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        await clearCart();
      } catch (error) {
        console.error('Failed to clear cart:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-200 dark:border-purple-800 rounded-full animate-spin border-t-purple-600 dark:border-t-purple-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-ping border-t-purple-400 mx-auto"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Loading your magical cart...</p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Preparing something special</span>
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="group flex items-center space-x-3 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl border border-white/20 dark:border-gray-700/20 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <ArrowLeft className="w-5 h-5 text-purple-600 dark:text-purple-400 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">Continue Shopping</span>
            </Link>
            
            {cart.items && cart.items.length > 0 && (
              <button
                onClick={handleClearCart}
                className="px-4 py-2 bg-red-500/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-900/30 rounded-xl font-medium transition-all duration-200 backdrop-blur-lg border border-red-200 dark:border-red-800"
              >
                🗑️ Clear Cart
              </button>
            )}
          </div>
          
          {/* Hero Title */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4 shadow-lg">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Shopping Cart
            </h1>
            {getCartItemCount() > 0 && (
              <div className="flex items-center justify-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400">You have</span>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-bold px-4 py-1 rounded-full shadow-lg animate-gentle-pulse">
                  {getCartItemCount()} {getCartItemCount() === 1 ? 'item' : 'items'}
                </span>
                <span className="text-gray-600 dark:text-gray-400">ready for checkout</span>
              </div>
            )}
          </div>
        </div>

        {/* Cart Content */}
        {!cart.items || cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="xl:col-span-2 space-y-6">
              {cart.items.map((item, index) => (
                <CartItem
                  key={item.product_id}
                  item={item}
                  isUpdating={isUpdating[item.product_id] || false}
                  onQuantityUpdate={handleQuantityUpdate}
                  onRemove={handleRemoveItem}
                  formatPrice={formatPrice}
                  index={index}
                />
              ))}
            </div>

            {/* Cart Summary */}
            <div className="xl:col-span-1">
              <CartSummary
                cart={cart}
                formatPrice={formatPrice}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Modern Empty Cart Component with Animations
const EmptyCart = () => (
  <div className="text-center py-20">
    <div className="max-w-lg mx-auto">
      {/* Animated Empty Cart Illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center shadow-2xl">
          <ShoppingBag className="w-16 h-16 text-purple-400 dark:text-purple-300" />
        </div>
        
        {/* Floating Elements */}
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="absolute -bottom-2 -left-6 w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-bounce delay-300 shadow-lg">
          <Gift className="w-3 h-3 text-white" />
        </div>
        <div className="absolute top-8 -left-8 w-4 h-4 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
        <div className="absolute top-12 right-8 w-3 h-3 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full animate-pulse delay-500 shadow-lg"></div>
      </div>
      
      <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
        Your cart feels a bit lonely
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto leading-relaxed">
        Time to fill it with amazing gifts! Discover our curated collection of beautiful articles perfect for every occasion.
      </p>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-4 border border-white/20 dark:border-gray-700/20 shadow-lg">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fast Shipping</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-4 border border-white/20 dark:border-gray-700/20 shadow-lg">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Premium Quality</p>
        </div>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl p-4 border border-white/20 dark:border-gray-700/20 shadow-lg">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Gift Wrapping</p>
        </div>
      </div>
      
      <Link
        to="/"
        className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 active:scale-95"
      >
        <ShoppingCart className="w-6 h-6" />
        <span>Start Shopping</span>
        <Sparkles className="w-5 h-5" />
      </Link>

      {/* Decorative Elements */}
      <div className="mt-12 flex items-center justify-center space-x-4 text-sm text-gray-400 dark:text-gray-500">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <span>Find the perfect gift</span>
        <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-300"></div>
        <span>Make someone happy</span>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-500"></div>
      </div>
    </div>
  </div>
);

// Modern Cart Item Component with Animations
const CartItem = ({ item, isUpdating, onQuantityUpdate, onRemove, formatPrice, index }) => (
  <div 
    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-white/20 dark:border-gray-700/20 transform hover:-translate-y-1 group"
    style={{
      animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
    }}
  >
    {/* Shimmer Effect */}
    <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500 pointer-events-none rounded-2xl"></div>
    
    <div className="flex items-start space-x-6 relative z-10">
      {/* Product Image */}
      <div className="w-24 h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow duration-300 overflow-hidden">
        {item.product_image ? (
          <img
            src={item.product_image.startsWith('data:') ? item.product_image : `data:image/jpeg;base64,${item.product_image}`}
            alt={item.product_name}
            className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">
              {item.product_name?.charAt(0) || 'P'}
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
              {item.product_name}
            </h3>
            
            {/* Price Section */}
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {formatPrice(item.price)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">per item</span>
            </div>

            {/* Subtotal */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.product_id)}
            disabled={isUpdating}
            className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/remove transform hover:scale-110 active:scale-95"
            title="Remove item"
          >
            <Trash2 className="w-5 h-5 group-hover/remove:animate-bounce" />
          </button>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity:</span>
            <div className="flex items-center space-x-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => onQuantityUpdate(item.product_id, item.quantity - 1)}
                disabled={isUpdating || item.quantity <= 1}
                className="w-10 h-10 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-110 active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <div className="w-16 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {item.quantity}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => onQuantityUpdate(item.product_id, item.quantity + 1)}
                disabled={isUpdating}
                className="w-10 h-10 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-110 active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Item Actions */}
          <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 rounded-lg transition-all duration-200 transform hover:scale-110">
              <Heart className="w-5 h-5" />
            </button>
            <Link
              to={`/products/${item.product_id}`}
              className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors duration-200"
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Cart Summary Component
const CartSummary = ({ cart, formatPrice, isAuthenticated }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-8">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
      <CreditCard className="w-6 h-6" />
      <span>Order Summary</span>
    </h2>

    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400">
          Items ({cart.total_items || 0})
        </span>
        <span className="font-medium text-gray-900 dark:text-white">
          {formatPrice(cart.total_amount || 0)}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400">Shipping</span>
        <span className="font-medium text-green-600 dark:text-green-400">Free</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400">Tax</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {formatPrice((cart.total_amount || 0) * 0.08)}
        </span>
      </div>
      
      <hr className="border-gray-200 dark:border-gray-700" />
      
      <div className="flex justify-between items-center text-lg font-bold">
        <span className="text-gray-900 dark:text-white">Total</span>
        <span className="text-blue-600 dark:text-blue-400">
          {formatPrice((cart.total_amount || 0) * 1.08)}
        </span>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="space-y-3">
      {!isAuthenticated && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-blue-800 dark:text-blue-300 text-sm">
            Sign in to save your cart and get personalized recommendations
          </p>
          <Link
            to="/login"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm mt-1 inline-block"
          >
            Sign in now →
          </Link>
        </div>
      )}
      
      <Link
        to="/checkout"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <CreditCard className="w-6 h-6" />
        <span>Proceed to Checkout</span>
      </Link>
      
      <Link
        to="/"
        className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 py-3 px-6 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <ShoppingCart className="w-5 h-5" />
        <span>Continue Shopping</span>
      </Link>
    </div>

    {/* Security Badge */}
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Heart className="w-4 h-4" />
        <span>Secure & encrypted checkout</span>
      </div>
    </div>
  </div>
);

export default Cart;