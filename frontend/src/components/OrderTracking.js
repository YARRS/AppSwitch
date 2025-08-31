import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Package, ArrowLeft, Truck, CheckCircle2, Clock, 
  MapPin, Phone, Mail, Calendar, Copy, ExternalLink,
  User, CreditCard, AlertCircle, ShoppingCart, RotateCcw, Eye,
  Sparkles, Zap, Heart, Shield, Gift, Star, Home, ChevronRight,
  FileText, CreditCard as Card, Banknote, Plus, Search
} from 'lucide-react';

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user, getAuthenticatedAxios, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [copiedOrder, setCopiedOrder] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, isAuthenticated, user]);

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

  const copyOrderNumber = async () => {
    if (navigator.clipboard && order?.order_number) {
      try {
        await navigator.clipboard.writeText(order.order_number);
        setCopiedOrder(true);
        setTimeout(() => setCopiedOrder(false), 2000);
      } catch (err) {
        console.log('Failed to copy');
      }
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchOrderDetails();
  };

  const handleViewAllOrders = () => {
    navigate('/profile?tab=orders');
  };

  const getStatusSteps = () => {
    const steps = [
      { 
        id: 'pending', 
        title: 'Order Placed', 
        description: 'Your order has been received and is being reviewed',
        icon: CheckCircle2, 
        completed: true,
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/20'
      },
      { 
        id: 'processing', 
        title: 'Processing', 
        description: 'We\'re preparing your order for shipment',
        icon: Clock, 
        completed: order?.status !== 'pending',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20'
      },
      { 
        id: 'shipped', 
        title: 'Shipped', 
        description: 'Your order is on its way to you',
        icon: Truck, 
        completed: ['shipped', 'delivered'].includes(order?.status),
        color: 'text-purple-600',
        bgColor: 'bg-purple-100 dark:bg-purple-900/20'
      },
      { 
        id: 'delivered', 
        title: 'Delivered', 
        description: 'Your order has been delivered successfully',
        icon: Package, 
        completed: order?.status === 'delivered',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/20'
      }
    ];

    const currentStepIndex = steps.findIndex(step => step.id === order?.status);
    return steps.map((step, index) => ({
      ...step,
      active: index === currentStepIndex,
      completed: step.completed || index < currentStepIndex
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
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

  const getEstimatedDelivery = () => {
    if (order?.status === 'delivered') return 'Delivered';
    
    const orderDate = new Date(order?.created_at);
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(orderDate.getDate() + 3); // 3 days from order date
    
    return estimatedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        </div>
        
        <div className="text-center relative z-10">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-ping border-t-blue-400 mx-auto"></div>
          </div>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Package className="w-8 h-8 text-blue-600 animate-bounce" />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Loading Order Details
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Getting your order information...
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Please wait a moment</span>
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-gray-900 dark:via-red-900/20 dark:to-pink-900/20 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-red-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-orange-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="text-center">
            {/* Error Icon with Animation */}
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center animate-bounce shadow-2xl">
                <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-red-300 rounded-full animate-ping opacity-30"></div>
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Oops! Something went wrong
            </h1>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 mb-8">
              <p className="text-xl text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                <strong className="text-red-600 dark:text-red-400">{error}</strong>
              </p>
              
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                {error === 'Order not found' 
                  ? 'The order you\'re looking for doesn\'t exist or may have been removed. Please check your order number or contact support.'
                  : error === 'You are not authorized to view this order'
                  ? 'This order belongs to another customer. Please check your order history or log in with the correct account.'
                  : error === 'Please log in to view your order details'
                  ? 'Your session may have expired. Please log in again to view your order details.'
                  : 'There was a problem loading the order details. This might be due to a temporary connection issue.'}
              </p>
              
              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={handleRetry}
                  className="group bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  <span>Try Again</span>
                </button>
                
                {isAuthenticated && (
                  <button
                    onClick={handleViewAllOrders}
                    className="group bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                    <span>My Orders</span>
                  </button>
                )}
                
                <Link
                  to="/login"
                  className="group bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <User className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  <span>Sign In</span>
                </Link>
                
                <Link
                  to="/"
                  className="group bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 px-6 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                  <span>Shop Now</span>
                </Link>
              </div>
            </div>
            
            {/* Helpful Information */}
            <div className="bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-lg border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-8 shadow-lg">
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-6 flex items-center justify-center space-x-3">
                <Package className="w-6 h-6" />
                <span>Need Help?</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Order Issues</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Contact our support team with your order number for immediate assistance.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Account Access</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Make sure you're logged in with the account used to place the order.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const statusSteps = getStatusSteps();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Enhanced Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-lg px-4 py-2 shadow-md w-fit">
            <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center space-x-1">
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/profile" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">My Account</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white font-medium">Order Tracking</span>
          </div>
          
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Package className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                      Order Tracking
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Track your order in real-time</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-600 dark:text-gray-400">Order Number:</p>
                    <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-xl">
                      <div className="relative flex items-center">
                        <code className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                          {order.order_number}
                        </code>
                        <button
                          onClick={copyOrderNumber}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            copiedOrder 
                              ? 'bg-green-500 text-white' 
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title="Copy order number"
                          style={{ position: 'relative' }}
                        >
                          {copiedOrder ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedOrder && (
                            <span
                              className="text-green-600 dark:text-green-400 text-sm font-medium animate-fade-in"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '4px',
                                zIndex: 10,
                                background: 'rgba(255,255,255,0.95)',
                                borderRadius: '0.5rem',
                                padding: '2px 10px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              ✓ Copied!
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Order Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:w-auto lg:grid-cols-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl shadow-xl p-6 text-white">
                  <div className="flex items-center space-x-3 mb-2">
                    <Card className="w-6 h-6" />
                    <p className="font-semibold">Order Total</p>
                  </div>
                  <p className="text-3xl font-bold">
                    {formatPrice(order.final_amount)}
                  </p>
                </div>
                
                <div className={`rounded-2xl shadow-xl p-6 text-white ${
                  order.status === 'delivered' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                  order.status === 'shipped' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                  order.status === 'processing' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                  'bg-gradient-to-r from-gray-500 to-gray-600'
                }`}>
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="w-6 h-6" />
                    <p className="font-semibold">Status</p>
                  </div>
                  <p className="text-2xl font-bold capitalize">
                    {order.status?.replace('_', ' ') || 'Pending'}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 text-white">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-6 h-6" />
                    <p className="font-semibold">Delivery</p>
                  </div>
                  <p className="text-lg font-bold">
                    {getEstimatedDelivery()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Order Status Timeline */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-8 border border-white/20 dark:border-gray-700/20">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Progress</h2>
              <p className="text-gray-600 dark:text-gray-400">Track your order journey in real-time</p>
            </div>
          </div>
          
          {/* Desktop Timeline */}
          <div className="hidden md:block relative">
            {/* Progress Line */}
            <div className="absolute top-16 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${(statusSteps.filter(s => s.completed).length - 1) / (statusSteps.length - 1) * 100}%` 
                }}
              ></div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 relative">
              {statusSteps.map((step, index) => (
                <div key={step.id} className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 shadow-xl ${
                    step.completed 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-110' 
                      : step.active
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse scale-105'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 scale-100'
                  }`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  
                  <div className={`rounded-2xl p-4 transition-all duration-300 ${
                    step.active ? step.bgColor + ' shadow-lg scale-105' : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}>
                    <h3 className={`font-bold text-lg mb-1 ${
                      step.completed ? 'text-green-600' : 
                      step.active ? step.color : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="md:hidden space-y-4">
            {statusSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                  step.completed 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                    : step.active
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                
                <div className={`flex-1 rounded-xl p-4 transition-all duration-300 ${
                  step.active ? step.bgColor + ' shadow-lg' : 'bg-gray-50 dark:bg-gray-800/50'
                }`}>
                  <h3 className={`font-bold text-lg mb-1 ${
                    step.completed ? 'text-green-600' : 
                    step.active ? step.color : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Order Items</h3>
                  <p className="text-gray-600 dark:text-gray-400">{order.items?.length || 0} items in your order</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:shadow-lg transition-all duration-200">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image.startsWith('data:') ? item.product_image : `data:image/jpeg;base64,${item.product_image}`}
                          alt={item.product_name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-lg font-bold">
                            {item.product_name?.charAt(0) || 'P'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        {item.product_name}
                      </h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600 dark:text-gray-400">
                            Qty: <span className="font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Price: <span className="font-semibold text-gray-900 dark:text-white">{formatPrice(item.price)}</span>
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            {formatPrice(item.total_price || (item.price * item.quantity))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Information & Actions */}
          <div className="space-y-8">
            {/* Shipping Information */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Shipping Address</h3>
                  <p className="text-gray-600 dark:text-gray-400">Delivery destination</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <div className="space-y-2 text-gray-700 dark:text-gray-300">
                  <p className="font-semibold text-lg">{order.shipping_address?.full_name}</p>
                  <p>{order.shipping_address?.address_line1}</p>
                  {order.shipping_address?.address_line2 && (
                    <p>{order.shipping_address.address_line2}</p>
                  )}
                  <p>
                    {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip_code}
                  </p>
                  <p>{order.shipping_address?.country}</p>
                  {order.shipping_address?.phone && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <p>{order.shipping_address.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Details</h3>
                  <p className="text-gray-600 dark:text-gray-400">Order summary</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-semibold">{formatPrice(order.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="font-semibold">{formatPrice(order.tax_amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                  <span className="font-semibold">
                    {order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'FREE'}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">Total:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {formatPrice(order.final_amount)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Banknote className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                      Payment Method: {order.payment_method?.toUpperCase() || 'COD'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Link
                to="/profile?tab=orders"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95"
              >
                <Eye className="w-6 h-6" />
                <span>View All Orders</span>
              </Link>
              
              <Link
                to="/"
                className="w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
              >
                <ShoppingCart className="w-6 h-6" />
                <span>Continue Shopping</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Order Timeline Details */}
        {order.created_at && (
          <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Order Timeline</h3>
                <p className="text-gray-600 dark:text-gray-400">Key milestones for your order</p>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">Order Placed</span>
                  </div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatDate(order.created_at)}
                  </span>
                </div>
                
                {order.status !== 'pending' && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">Processing Started</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDate(order.updated_at)}
                    </span>
                  </div>
                )}
                
                {order.status === 'delivered' && (
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">Order Delivered</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatDate(order.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;