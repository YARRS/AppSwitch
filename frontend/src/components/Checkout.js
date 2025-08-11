import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShoppingCart, User, MapPin, CreditCard, Check, 
  AlertCircle, ArrowLeft, Package, Shield, Truck,
  Phone, Mail, Edit3, Loader, CheckCircle2
} from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    shipping_address: {
      full_name: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'India'
    },
    payment_method: 'COD',
    notes: '',
    customer_email: '',
    customer_phone: ''
  });

  // UI State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderData, setOrderData] = useState(null);
  
  // OTP State
  const [otpState, setOtpState] = useState({
    otpSent: false,
    otpVerified: false,
    otp: '',
    sendingOtp: false,
    verifyingOtp: false,
    otpError: '',
    resendTimer: 0
  });

  // Calculate totals
  const subtotal = cart?.total_amount || 0;
  const taxRate = 0.08; // 8% tax
  const taxAmount = subtotal * taxRate;
  const shippingCost = subtotal >= 50 ? 0 : 5.99; // Free shipping over $50
  const finalAmount = subtotal + taxAmount + shippingCost;

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && (!cart.items || cart.items.length === 0)) {
      navigate('/cart');
    }
  }, [cart, cartLoading, navigate]);

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        shipping_address: {
          ...prev.shipping_address,
          full_name: user.full_name || user.username || '',
          phone: user.phone || ''
        },
        customer_email: user.email || '',
        customer_phone: user.phone || ''
      }));
    }
  }, [isAuthenticated, user]);

  // Handle input changes
  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[field] || (section && errors[`${section}_${field}`])) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
        [`${section}_${field}`]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const { shipping_address } = formData;

    // Shipping address validation
    if (!shipping_address.full_name.trim()) {
      newErrors.shipping_address_full_name = 'Full name is required';
    }
    if (!shipping_address.phone.trim()) {
      newErrors.shipping_address_phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(shipping_address.phone.replace(/\D/g, ''))) {
      newErrors.shipping_address_phone = 'Valid 10-digit phone number is required';
    }
    if (!shipping_address.address_line1.trim()) {
      newErrors.shipping_address_address_line1 = 'Address is required';
    }
    if (!shipping_address.city.trim()) {
      newErrors.shipping_address_city = 'City is required';
    }
    if (!shipping_address.state.trim()) {
      newErrors.shipping_address_state = 'State is required';
    }
    if (!shipping_address.zip_code.trim()) {
      newErrors.shipping_address_zip_code = 'ZIP code is required';
    } else if (!/^\d{6}$/.test(shipping_address.zip_code.replace(/\D/g, ''))) {
      newErrors.shipping_address_zip_code = 'Valid 6-digit ZIP code is required';
    }

    // Guest user validation
    if (!isAuthenticated) {
      if (!formData.customer_email.trim()) {
        newErrors.customer_email = 'Email is required for order updates';
      } else if (!/\S+@\S+\.\S+/.test(formData.customer_email)) {
        newErrors.customer_email = 'Valid email is required';
      }
      if (!formData.customer_phone.trim()) {
        newErrors.customer_phone = 'Phone number is required';
      }
      
      // Check OTP verification for guest users
      if (!otpState.otpVerified) {
        newErrors.otp_verification = 'Phone number must be verified with OTP';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // OTP Functions
  const sendOtp = async () => {
    const phoneNumber = formData.shipping_address.phone;
    if (!phoneNumber) {
      setErrors(prev => ({ ...prev, shipping_address_phone: 'Phone number is required' }));
      return;
    }

    setOtpState(prev => ({ ...prev, sendingOtp: true, otpError: '' }));

    try {
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${API_BASE_URL}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOtpState(prev => ({
          ...prev,
          otpSent: true,
          sendingOtp: false,
          resendTimer: 60 // 60 seconds countdown
        }));
        
        // Start countdown timer
        const timer = setInterval(() => {
          setOtpState(prev => {
            if (prev.resendTimer <= 1) {
              clearInterval(timer);
              return { ...prev, resendTimer: 0 };
            }
            return { ...prev, resendTimer: prev.resendTimer - 1 };
          });
        }, 1000);
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      setOtpState(prev => ({
        ...prev,
        sendingOtp: false,
        otpError: error.message || 'Failed to send OTP'
      }));
    }
  };

  const verifyOtp = async () => {
    const phoneNumber = formData.shipping_address.phone;
    const otp = otpState.otp;

    if (!otp || otp.length !== 6) {
      setOtpState(prev => ({ ...prev, otpError: 'Please enter a valid 6-digit OTP' }));
      return;
    }

    setOtpState(prev => ({ ...prev, verifyingOtp: true, otpError: '' }));

    try {
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${API_BASE_URL}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber, otp })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOtpState(prev => ({
          ...prev,
          otpVerified: true,
          verifyingOtp: false
        }));
      } else {
        throw new Error(result.message || 'Invalid OTP');
      }
    } catch (error) {
      setOtpState(prev => ({
        ...prev,
        verifyingOtp: false,
        otpError: error.message || 'Failed to verify OTP'
      }));
    }
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      setCurrentStep(1); // Go back to address step if validation fails
      return;
    }

    setLoading(true);
    
    try {
      const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      
      // Prepare order data
      const orderData = {
        items: cart.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image,
          quantity: item.quantity,
          price: item.price,
          total_price: item.price * item.quantity
        })),
        shipping_address: formData.shipping_address,
        total_amount: subtotal,
        tax_amount: taxAmount,
        shipping_cost: shippingCost,
        discount_amount: 0,
        final_amount: finalAmount,
        payment_method: formData.payment_method,
        notes: formData.notes,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone || formData.shipping_address.phone
      };

      // Choose endpoint based on authentication
      const endpoint = isAuthenticated ? '/api/orders/' : '/api/orders/guest';
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add session ID for guest users
      if (!isAuthenticated) {
        const sessionId = localStorage.getItem('guest_session_id');
        headers['X-Session-Id'] = sessionId;
      } else {
        // Add authentication token for logged-in users
        const token = localStorage.getItem('token');
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOrderData(result.data);
        setOrderPlaced(true);
        
        // Clear cart after successful order
        await clearCart();
        
        // Clear guest session if guest user
        if (!isAuthenticated) {
          localStorage.removeItem('guest_session_id');
        }
      } else {
        throw new Error(result.message || 'Failed to place order');
      }
    } catch (error) {
      console.error('Order placement error:', error);
      setErrors({ general: error.message || 'Failed to place order. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  // Show loading state
  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Show order success
  if (orderPlaced && orderData) {
    return <OrderSuccess orderData={orderData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/cart"
            className="group flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to Cart</span>
          </Link>
          
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <ShoppingCart className="w-8 h-8" />
            <span>Checkout</span>
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { number: 1, title: 'Shipping', icon: MapPin },
              { number: 2, title: 'Payment', icon: CreditCard },
              { number: 3, title: 'Review', icon: Check }
            ].map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`ml-2 font-medium ${
                  currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < 2 && (
                  <div className={`w-16 h-0.5 ml-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            {/* Step 1: Shipping Information */}
            {currentStep === 1 && (
              <ShippingForm
                formData={formData}
                handleInputChange={handleInputChange}
                errors={errors}
                isAuthenticated={isAuthenticated}
                onNext={() => setCurrentStep(2)}
              />
            )}

            {/* Step 2: Payment Information */}
            {currentStep === 2 && (
              <PaymentForm
                formData={formData}
                handleInputChange={handleInputChange}
                onNext={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
              />
            )}

            {/* Step 3: Review Order */}
            {currentStep === 3 && (
              <ReviewOrder
                formData={formData}
                cart={cart}
                subtotal={subtotal}
                taxAmount={taxAmount}
                shippingCost={shippingCost}
                finalAmount={finalAmount}
                formatPrice={formatPrice}
                onBack={() => setCurrentStep(2)}
                onPlaceOrder={handlePlaceOrder}
                loading={loading}
                errors={errors}
              />
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              cart={cart}
              subtotal={subtotal}
              taxAmount={taxAmount}
              shippingCost={shippingCost}
              finalAmount={finalAmount}
              formatPrice={formatPrice}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Shipping Form Component
const ShippingForm = ({ formData, handleInputChange, errors, isAuthenticated, onNext }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
      <MapPin className="w-6 h-6" />
      <span>Shipping Information</span>
    </h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Full Name *
        </label>
        <input
          type="text"
          value={formData.shipping_address.full_name}
          onChange={(e) => handleInputChange('shipping_address', 'full_name', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.shipping_address_full_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter your full name"
        />
        {errors.shipping_address_full_name && (
          <p className="text-red-500 text-sm mt-1">{errors.shipping_address_full_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          value={formData.shipping_address.phone}
          onChange={(e) => handleInputChange('shipping_address', 'phone', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.shipping_address_phone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter phone number"
        />
        {errors.shipping_address_phone && (
          <p className="text-red-500 text-sm mt-1">{errors.shipping_address_phone}</p>
        )}
      </div>
    </div>

    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Address Line 1 *
      </label>
      <input
        type="text"
        value={formData.shipping_address.address_line1}
        onChange={(e) => handleInputChange('shipping_address', 'address_line1', e.target.value)}
        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
          errors.shipping_address_address_line1 ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder="Street address, apartment, suite, etc."
      />
      {errors.shipping_address_address_line1 && (
        <p className="text-red-500 text-sm mt-1">{errors.shipping_address_address_line1}</p>
      )}
    </div>

    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Address Line 2
      </label>
      <input
        type="text"
        value={formData.shipping_address.address_line2}
        onChange={(e) => handleInputChange('shipping_address', 'address_line2', e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        placeholder="Additional address information (optional)"
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          City *
        </label>
        <input
          type="text"
          value={formData.shipping_address.city}
          onChange={(e) => handleInputChange('shipping_address', 'city', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.shipping_address_city ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="City"
        />
        {errors.shipping_address_city && (
          <p className="text-red-500 text-sm mt-1">{errors.shipping_address_city}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          State *
        </label>
        <input
          type="text"
          value={formData.shipping_address.state}
          onChange={(e) => handleInputChange('shipping_address', 'state', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.shipping_address_state ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="State"
        />
        {errors.shipping_address_state && (
          <p className="text-red-500 text-sm mt-1">{errors.shipping_address_state}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          ZIP Code *
        </label>
        <input
          type="text"
          value={formData.shipping_address.zip_code}
          onChange={(e) => handleInputChange('shipping_address', 'zip_code', e.target.value)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
            errors.shipping_address_zip_code ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="ZIP Code"
        />
        {errors.shipping_address_zip_code && (
          <p className="text-red-500 text-sm mt-1">{errors.shipping_address_zip_code}</p>
        )}
      </div>
    </div>

    {/* Guest user contact info */}
    {!isAuthenticated && (
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-4 flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Contact Information</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => handleInputChange(null, 'customer_email', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.customer_email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Email for order updates"
            />
            {errors.customer_email && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              Contact Phone *
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange(null, 'customer_phone', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.customer_phone ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Contact phone number"
            />
            {errors.customer_phone && (
              <p className="text-red-500 text-sm mt-1">{errors.customer_phone}</p>
            )}
          </div>
        </div>
      </div>
    )}

    <div className="mt-8 flex justify-end">
      <button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
      >
        <span>Continue to Payment</span>
        <ArrowLeft className="w-5 h-5 rotate-180" />
      </button>
    </div>
  </div>
);

// Payment Form Component
const PaymentForm = ({ formData, handleInputChange, onNext, onBack }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
      <CreditCard className="w-6 h-6" />
      <span>Payment Method</span>
    </h2>

    <div className="space-y-4">
      {/* Cash on Delivery */}
      <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
        formData.payment_method === 'COD'
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="payment_method"
            value="COD"
            checked={formData.payment_method === 'COD'}
            onChange={(e) => handleInputChange(null, 'payment_method', e.target.value)}
            className="mr-4"
          />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">Cash on Delivery</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Pay with cash when your order is delivered to your doorstep
            </p>
          </div>
          <Truck className="w-6 h-6 text-gray-400" />
        </label>
      </div>

      {/* Online Payment - Coming Soon */}
      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 opacity-50">
        <div className="flex items-center">
          <input type="radio" disabled className="mr-4" />
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">Online Payment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Credit Card, Debit Card, UPI, Net Banking (Coming Soon)
            </p>
          </div>
          <CreditCard className="w-6 h-6 text-gray-400" />
        </div>
      </div>
    </div>

    {/* Order Notes */}
    <div className="mt-8">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Order Notes (Optional)
      </label>
      <textarea
        value={formData.notes}
        onChange={(e) => handleInputChange(null, 'notes', e.target.value)}
        rows={4}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        placeholder="Any special instructions for your order..."
      />
    </div>

    <div className="mt-8 flex justify-between">
      <button
        onClick={onBack}
        className="border border-gray-300 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
      
      <button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
      >
        <span>Review Order</span>
        <ArrowLeft className="w-5 h-5 rotate-180" />
      </button>
    </div>
  </div>
);

// Review Order Component
const ReviewOrder = ({ 
  formData, cart, subtotal, taxAmount, shippingCost, finalAmount, 
  formatPrice, onBack, onPlaceOrder, loading, errors 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
      <Check className="w-6 h-6" />
      <span>Review Your Order</span>
    </h2>

    {/* Error Display */}
    {errors.general && (
      <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error</span>
        </div>
        <p className="text-red-700 dark:text-red-400 mt-2">{errors.general}</p>
      </div>
    )}

    {/* Order Items */}
    <div className="mb-6">
      <h3 className="font-medium text-gray-900 dark:text-white mb-4">Order Items</h3>
      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.product_id} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
              <h4 className="font-medium text-gray-900 dark:text-white">{item.product_name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Qty: {item.quantity}</p>
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatPrice(item.price * item.quantity)}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Shipping Information */}
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
        <MapPin className="w-5 h-5" />
        <span>Shipping Address</span>
      </h3>
      <div className="text-gray-700 dark:text-gray-300">
        <p className="font-medium">{formData.shipping_address.full_name}</p>
        <p>{formData.shipping_address.address_line1}</p>
        {formData.shipping_address.address_line2 && <p>{formData.shipping_address.address_line2}</p>}
        <p>{formData.shipping_address.city}, {formData.shipping_address.state} {formData.shipping_address.zip_code}</p>
        <p className="flex items-center space-x-2 mt-2">
          <Phone className="w-4 h-4" />
          <span>{formData.shipping_address.phone}</span>
        </p>
      </div>
    </div>

    {/* Payment Method */}
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
        <CreditCard className="w-5 h-5" />
        <span>Payment Method</span>
      </h3>
      <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
        <Truck className="w-5 h-5" />
        <span>Cash on Delivery (COD)</span>
      </div>
    </div>

    {/* Order Total */}
    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
          <span className="text-gray-900 dark:text-white">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Tax (8%)</span>
          <span className="text-gray-900 dark:text-white">{formatPrice(taxAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Shipping</span>
          <span className="text-gray-900 dark:text-white">
            {shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}
          </span>
        </div>
        <hr className="border-gray-200 dark:border-gray-600" />
        <div className="flex justify-between text-lg font-semibold">
          <span className="text-gray-900 dark:text-white">Total</span>
          <span className="text-blue-600 dark:text-blue-400">{formatPrice(finalAmount)}</span>
        </div>
      </div>
    </div>

    <div className="flex justify-between">
      <button
        onClick={onBack}
        disabled={loading}
        className="border border-gray-300 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
      
      <button
        onClick={onPlaceOrder}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Placing Order...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Place Order</span>
          </>
        )}
      </button>
    </div>
  </div>
);

// Order Summary Component
const OrderSummary = ({ cart, subtotal, taxAmount, shippingCost, finalAmount, formatPrice }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-8">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
      <Package className="w-6 h-6" />
      <span>Order Summary</span>
    </h2>

    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400">
          Items ({cart.total_items || 0})
        </span>
        <span className="font-medium text-gray-900 dark:text-white">
          {formatPrice(subtotal)}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400">Tax (8%)</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {formatPrice(taxAmount)}
        </span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-600 dark:text-gray-400">Shipping</span>
        <span className="font-medium text-green-600 dark:text-green-400">
          {shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}
        </span>
      </div>
      
      <hr className="border-gray-200 dark:border-gray-700" />
      
      <div className="flex justify-between items-center text-lg font-bold">
        <span className="text-gray-900 dark:text-white">Total</span>
        <span className="text-blue-600 dark:text-blue-400">
          {formatPrice(finalAmount)}
        </span>
      </div>
    </div>

    {/* Security Badge */}
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Shield className="w-4 h-4" />
        <span>Secure checkout</span>
      </div>
      
      {shippingCost === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-green-800 dark:text-green-300">
            <Truck className="w-4 h-4" />
            <span className="text-sm font-medium">Free shipping!</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Order Success Component
const OrderSuccess = ({ orderData }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Order Placed Successfully!
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Thank you for your order. We've received your order and will process it shortly.
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Details</h2>
            <div className="text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Order Number:</span>
                <span className="font-mono text-gray-900 dark:text-white">{orderData.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(orderData.final_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                <span className="text-gray-900 dark:text-white">Cash on Delivery</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200"
            >
              Continue Shopping
            </button>
            
            <Link
              to={`/orders/${orderData.id}`}
              className="block w-full border border-gray-300 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              View Order Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;