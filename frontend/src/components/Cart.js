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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="group flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="font-medium">Continue Shopping</span>
              </Link>
            </div>
            
            {cart.items && cart.items.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
              >
                Clear Cart
              </button>
            )}
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-4 flex items-center space-x-3">
            <ShoppingCart className="w-8 h-8" />
            <span>Shopping Cart</span>
            {getCartItemCount() > 0 && (
              <span className="bg-blue-600 text-white text-lg px-3 py-1 rounded-full">
                {getCartItemCount()}
              </span>
            )}
          </h1>
        </div>

        {/* Cart Content */}
        {!cart.items || cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <CartItem
                  key={item.product_id}
                  item={item}
                  isUpdating={isUpdating[item.product_id] || false}
                  onQuantityUpdate={handleQuantityUpdate}
                  onRemove={handleRemoveItem}
                  formatPrice={formatPrice}
                />
              ))}
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
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

// Empty Cart Component
const EmptyCart = () => (
  <div className="text-center py-16">
    <div className="max-w-md mx-auto">
      <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
        <ShoppingBag className="w-12 h-12 text-gray-400" />
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
        Your cart is empty
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Looks like you haven't added any items to your cart yet.
        Discover our amazing collection of gift articles!
      </p>
      
      <Link
        to="/"
        className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
      >
        <ShoppingCart className="w-5 h-5" />
        <span>Start Shopping</span>
      </Link>
    </div>
  </div>
);

// Cart Item Component
const CartItem = ({ item, isUpdating, onQuantityUpdate, onRemove, formatPrice }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6 hover:shadow-xl transition-shadow duration-300">
    <div className="flex items-start space-x-4">
      {/* Product Image */}
      <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
        {item.product_image ? (
          <img
            src={item.product_image.startsWith('data:') ? item.product_image : `data:image/jpeg;base64,${item.product_image}`}
            alt={item.product_name}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Package className="w-8 h-8 text-gray-400" />
        )}
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {item.product_name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-2">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatPrice(item.price)}
            </span>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Subtotal: {formatPrice(item.price * item.quantity)}
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => onQuantityUpdate(item.product_id, item.quantity - 1)}
                disabled={isUpdating || item.quantity <= 1}
                className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="w-12 text-center font-medium text-gray-900 dark:text-white">
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  item.quantity
                )}
              </span>
              
              <button
                onClick={() => onQuantityUpdate(item.product_id, item.quantity + 1)}
                disabled={isUpdating}
                className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(item.product_id)}
              disabled={isUpdating}
              className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
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