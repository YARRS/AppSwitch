import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Package, ArrowLeft, Truck, CheckCircle2, Clock, 
  MapPin, Phone, Mail, Calendar, Copy, ExternalLink,
  User, CreditCard, AlertCircle, ShoppingCart, RotateCcw, Eye
} from 'lucide-react';

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user, getAuthenticatedAxios, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, isAuthenticated, user]); // Add dependencies for auth state changes

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the API base URL
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      
      // Try to get authenticated axios first, but fallback to regular axios with token
      let axiosInstance;
      try {
        axiosInstance = getAuthenticatedAxios();
      } catch (authError) {
        // Fallback: try to get token from localStorage manually
        const token = localStorage.getItem('access_token');
        if (token) {
          const axios = require('axios');
          axiosInstance = axios.create({
            baseURL: API_BASE_URL,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          throw new Error('No authentication token available');
        }
      }
      
      const response = await axiosInstance.get(`/api/orders/${orderId}`);
      
      if (response.data.success) {
        setOrder(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to load order');
      }
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      
      if (error.response?.status === 404) {
        setError('Order not found');
      } else if (error.response?.status === 403) {
        setError('You are not authorized to view this order');
      } else if (error.response?.status === 401) {
        setError('Please log in to view your order details');
      } else {
        setError('Failed to load order details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyOrderNumber = () => {
    if (navigator.clipboard && order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      // Could add toast notification here
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchOrderDetails();
  };

  const handleViewAllOrders = () => {
    navigate('/profile'); // Assuming profile page has order history
  };

  const getStatusSteps = () => {
    const steps = [
      { id: 'pending', title: 'Order Placed', icon: CheckCircle2, completed: true },
      { id: 'processing', title: 'Processing', icon: Clock, completed: order?.status !== 'pending' },
      { id: 'shipped', title: 'Shipped', icon: Truck, completed: ['shipped', 'delivered'].includes(order?.status) },
      { id: 'delivered', title: 'Delivered', icon: Package, completed: order?.status === 'delivered' }
    ];

    const currentStep = steps.findIndex(step => step.id === order?.status);
    return steps.map((step, index) => ({
      ...step,
      active: index === currentStep,
      completed: step.completed || index < currentStep
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {error}
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {error === 'Order not found' 
                ? 'The order you\'re looking for doesn\'t exist or may have been removed.'
                : error === 'You are not authorized to view this order'
                ? 'This order belongs to another customer. Please check your order history.'
                : 'There was a problem loading the order details. Please try again.'}
            </p>
            
            <div className="space-y-4">
              <Link
                to="/profile"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                <User className="w-5 h-5" />
                <span>View My Orders</span>
              </Link>
              
              <Link
                to="/"
                className="block text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-medium"
              >
                ← Back to Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/profile"
            className="group flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to Orders</span>
          </Link>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
                <Package className="w-8 h-8 text-blue-600" />
                <span>Order Tracking</span>
              </h1>
              <div className="flex items-center space-x-2 mt-2">
                <p className="text-gray-600 dark:text-gray-400">Order Number:</p>
                <code className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg font-mono text-sm">
                  {order.order_number}
                </code>
                <button
                  onClick={copyOrderNumber}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Copy order number"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Order Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatPrice(order.final_amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Order Status Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 lg:p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
            <Truck className="w-6 h-6" />
            <span>Order Status</span>
          </h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 transform -translate-y-1/2 hidden md:block">
              <div 
                className="h-full bg-blue-600 transition-all duration-1000"
                style={{ width: `${(statusSteps.filter(s => s.completed).length - 1) * 33.33}%` }}
              />
            </div>
            
            {/* Status Steps */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
              {statusSteps.map((step, index) => (
                <div key={step.id} className="relative flex flex-col items-center text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 mb-3 transition-all duration-300 ${
                    step.completed 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : step.active
                      ? 'bg-blue-100 border-blue-600 text-blue-600 animate-pulse'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className={`font-semibold mb-1 ${
                    step.completed || step.active 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step.completed && step.id === 'pending' && order.created_at && formatDate(order.created_at)}
                    {step.completed && step.id === 'shipped' && order.shipped_at && formatDate(order.shipped_at)}
                    {step.completed && step.id === 'delivered' && order.delivered_at && formatDate(order.delivered_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <Package className="w-6 h-6" />
                <span>Order Items ({order.items?.length || 0})</span>
              </h2>
              
              <div className="space-y-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image.startsWith('data:') ? item.product_image : `data:image/jpeg;base64,${item.product_image}`}
                          alt={item.product_name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.product_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quantity: {item.quantity} × {formatPrice(item.price)}
                      </p>
                    </div>
                    
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatPrice(item.total_price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            {/* Shipping Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Shipping Address</span>
              </h2>
              
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p className="font-medium">{order.shipping_address?.full_name}</p>
                <p>{order.shipping_address?.address_line1}</p>
                {order.shipping_address?.address_line2 && <p>{order.shipping_address?.address_line2}</p>}
                <p>
                  {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip_code}
                </p>
                <p className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>{order.shipping_address?.phone}</span>
                </p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Order Summary</span>
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(order.total_amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="text-gray-900 dark:text-white">{formatPrice(order.tax_amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="text-gray-900 dark:text-white">
                    {order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}
                  </span>
                </div>
                
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                
                <hr className="border-gray-200 dark:border-gray-600" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatPrice(order.final_amount)}</span>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Truck className="w-4 h-4" />
                    <span>Payment: Cash on Delivery</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                to="/profile"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <User className="w-5 h-5" />
                <span>View All Orders</span>
              </Link>
              
              <Link
                to="/"
                className="w-full border border-gray-300 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-5 h-5" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;