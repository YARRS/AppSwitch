import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// API base URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create cart context
const CartContext = createContext();

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Generate or get session ID for guest users
const getSessionId = () => {
  let sessionId = localStorage.getItem('guest_session_id');
  if (!sessionId) {
    sessionId = 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('guest_session_id', sessionId);
  }
  return sessionId;
};

// Cart provider component
export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, getAuthenticatedAxios } = useAuth();
  const [cart, setCart] = useState({ items: [], total_amount: 0, total_items: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId] = useState(getSessionId());

  // Get axios instance with proper headers
  const getAxiosInstance = () => {
    if (isAuthenticated) {
      return getAuthenticatedAxios();
    } else {
      return axios.create({
        baseURL: API_BASE_URL,
        headers: {
          'X-Session-Id': sessionId,
        },
      });
    }
  };

  // Load cart on component mount and when auth state changes
  useEffect(() => {
    loadCart();
  }, [isAuthenticated, user]);

  // Load cart from API
  const loadCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const axiosInstance = getAxiosInstance();
      const response = await axiosInstance.get('/api/cart/');

      if (response.data.success) {
        setCart(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      setError('Failed to load cart');
      // Initialize empty cart on error
      setCart({ items: [], total_amount: 0, total_items: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (productId, quantity = 1) => {
    try {
      setLoading(true);
      setError(null);

      const axiosInstance = getAxiosInstance();
      const response = await axiosInstance.post(`/api/cart/items/${productId}`, null, {
        params: { quantity },
      });

      if (response.data.success) {
        setCart(response.data.data);
        return { success: true };
      }
      
      return { success: false, error: 'Failed to add item to cart' };
    } catch (error) {
      console.error('Failed to add to cart:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to add item to cart';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      setError(null);

      const axiosInstance = getAxiosInstance();
      const response = await axiosInstance.delete(`/api/cart/items/${productId}`);

      if (response.data.success) {
        setCart(response.data.data);
        return { success: true };
      }
      
      return { success: false, error: 'Failed to remove item from cart' };
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to remove item from cart';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    try {
      setLoading(true);
      setError(null);

      const axiosInstance = getAxiosInstance();
      const response = await axiosInstance.put(`/api/cart/items/${productId}`, null, {
        params: { quantity },
      });

      if (response.data.success) {
        setCart(response.data.data);
        return { success: true };
      }
      
      return { success: false, error: 'Failed to update item quantity' };
    } catch (error) {
      console.error('Failed to update quantity:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update item quantity';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const axiosInstance = getAxiosInstance();
      const response = await axiosInstance.delete('/api/cart/');

      if (response.data.success) {
        setCart(response.data.data);
        return { success: true };
      }
      
      return { success: false, error: 'Failed to clear cart' };
    } catch (error) {
      console.error('Failed to clear cart:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to clear cart';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Merge guest cart with user cart (called automatically when user logs in)
  const mergeGuestCart = async () => {
    if (!isAuthenticated || !sessionId) return;

    try {
      const axiosInstance = getAuthenticatedAxios();
      const response = await axiosInstance.post('/api/cart/merge', {
        guest_session_id: sessionId,
      });

      if (response.data.success) {
        setCart(response.data.data);
        // Clear guest session after successful merge
        localStorage.removeItem('guest_session_id');
        return { success: true };
      }
      
      return { success: false, error: 'Failed to merge carts' };
    } catch (error) {
      console.error('Failed to merge carts:', error);
      // Even if merge fails, load the user's existing cart
      await loadCart();
      return { success: false, error: 'Failed to merge carts, but user cart loaded' };
    }
  };

  // Get cart item count
  const getCartItemCount = () => {
    return cart.total_items || 0;
  };

  // Get cart total amount
  const getCartTotal = () => {
    return cart.total_amount || 0;
  };

  // Check if product is in cart
  const isInCart = (productId) => {
    return cart.items?.some(item => item.product_id === productId) || false;
  };

  // Get item quantity in cart
  const getItemQuantity = (productId) => {
    const item = cart.items?.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cart,
    loading,
    error,
    sessionId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    loadCart,
    mergeGuestCart,
    getCartItemCount,
    getCartTotal,
    isInCart,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};