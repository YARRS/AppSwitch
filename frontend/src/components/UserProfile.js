import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { User, Mail, Phone, Shield, Calendar, AlertCircle, CheckCircle, Package, ShoppingCart, Clock, DollarSign, Eye, ArrowRight } from 'lucide-react';
import { decryptPhoneNumber } from '../utils/phoneDecryption';

const UserProfile = () => {
  const { user, updateProfile, logout, getAuthenticatedAxios } = useAuth();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const initialTab = urlParams.get('tab') || 'profile';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [decryptedPhone, setDecryptedPhone] = useState('Loading...');
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  });

  // Decrypt phone number when component loads or user data changes
  useEffect(() => {
    const decryptUserPhone = async () => {
      if (user?.phone) {
        try {
          const decrypted = await decryptPhoneNumber(user.phone, getAuthenticatedAxios);
          setDecryptedPhone(decrypted);
        } catch (error) {
          console.error('Failed to decrypt phone:', error);
          setDecryptedPhone(user.phone); // Fallback to original
        }
      } else {
        setDecryptedPhone('Not provided');
      }
    };

    decryptUserPhone();
  }, [user?.phone, getAuthenticatedAxios]);

  // Update tab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'profile' || tabFromUrl === 'orders')) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);

  // Remove the old decryptPhoneNumber function since we're now using the utility

  // Fetch user orders when orders tab is selected
  useEffect(() => {
    if (activeTab === 'orders') {
      fetchUserOrders();
    }
  }, [activeTab]);

  const fetchUserOrders = async () => {
    try {
      setOrdersLoading(true);
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/orders/');
      if (response.data.success) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear message when user starts typing
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: result.error || 'Update failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'inventory_manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'sales_manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatRole = (role) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg">
        {/* Header with tabs */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                My Account
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                Manage your account details, settings and order history.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              <span className="hidden sm:inline">Profile Information</span>
              <span className="sm:hidden">Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              <span className="hidden sm:inline">My Orders ({orders.length})</span>
              <span className="sm:hidden">Orders ({orders.length})</span>
            </button>
          </nav>
        </div>

        <div className="px-4 py-5 sm:p-6">
          {message.text && (
            <div className={`mb-4 rounded-md p-4 ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20' 
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-400 dark:text-green-300" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
                )}
                <div className="ml-3">
                  <p className={`text-sm ${
                    message.type === 'success' 
                      ? 'text-green-800 dark:text-green-300' 
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <ProfileTab
              user={user}
              isEditing={isEditing}
              formData={formData}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              handleCancel={handleCancel}
              setIsEditing={setIsEditing}
              isLoading={isLoading}
              getRoleBadgeColor={getRoleBadgeColor}
              formatRole={formatRole}
              formatDate={formatDate}
              logout={logout}
              decryptPhoneNumber={decryptPhoneNumber}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTab
              orders={orders}
              ordersLoading={ordersLoading}
              formatPrice={formatPrice}
              formatDate={formatDate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ user, isEditing, formData, handleChange, handleSubmit, handleCancel, setIsEditing, isLoading, getRoleBadgeColor, formatRole, formatDate, logout, decryptPhoneNumber }) => (
  <>
    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Full name
        </dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
          {isEditing ? (
            <div className="relative">
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Enter your full name"
              />
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          ) : (
            <div className="flex items-center">
              <User className="h-4 w-4 text-gray-400 mr-2" />
              {user?.full_name || 'Not specified'}
            </div>
          )}
        </dd>
      </div>

      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Username
        </dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-400 mr-2" />
            {user?.username}
          </div>
        </dd>
      </div>

      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Email address
        </dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
          <div className="flex items-center">
            <Mail className="h-4 w-4 text-gray-400 mr-2" />
            {user?.email}
            {user?.email_verified && (
              <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
            )}
          </div>
        </dd>
      </div>

      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Phone number
        </dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
          {isEditing ? (
            <div className="relative">
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                placeholder="Enter your phone number"
              />
              <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          ) : (
            <div className="flex items-center">
              <Phone className="h-4 w-4 text-gray-400 mr-2" />
              {decryptPhoneNumber(user?.phone) || 'Not specified'}
            </div>
          )}
        </dd>
      </div>

      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Role
        </dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-gray-400 mr-2" />
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
              {formatRole(user?.role)}
            </span>
          </div>
        </dd>
      </div>

      <div className="sm:col-span-1">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Member since
        </dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            {formatDate(user?.created_at)}
          </div>
        </dd>
      </div>
    </dl>

    <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
      {isEditing ? (
        <>
          <button
            type="button"
            onClick={handleCancel}
            className="w-full sm:w-auto bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full sm:w-auto bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit Profile
        </button>
      )}
    </div>

    <div className="px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Account Actions</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account</p>
        </div>
        <button
          onClick={logout}
          className="w-full sm:w-auto bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Sign Out
        </button>
      </div>
    </div>
  </>
);

// Orders Tab Component
const OrdersTab = ({ orders, ordersLoading, formatPrice, formatDate }) => {
  if (ordersLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          You haven't placed any orders yet. Start shopping to see your orders here.
        </p>
        <a
          href="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Start Shopping</span>
        </a>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, order) => sum + (order.final_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Order Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orders</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{orders.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Spent</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {formatPrice(totalSpent)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Avg Order</p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {formatPrice(orders.length > 0 ? totalSpent / orders.length : 0)}
              </p>
            </div>
            <ShoppingCart className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} formatPrice={formatPrice} formatDate={formatDate} />
        ))}
      </div>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, formatPrice, formatDate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Order #{order.order_number}
          </h4>
          <div className="flex items-center space-x-4 mt-1">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-1" />
              {formatDate(order.created_at)}
            </div>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatPrice(order.final_amount)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Order Items Preview */}
      <div className="space-y-2 mb-4">
        {order.items?.slice(0, 2).map((item, index) => (
          <div key={index} className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {item.product_name} × {item.quantity}
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatPrice(item.total_price)}
            </span>
          </div>
        ))}
        {order.items?.length > 2 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4 mr-1" />
          {order.status === 'delivered' ? 'Delivered' : 
           order.status === 'shipped' ? 'In Transit' : 
           order.status === 'processing' ? 'Being Prepared' : 'Order Placed'}
        </div>
        <a
          href={`/orders/${order.id}`}
          className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
        >
          <Eye className="w-4 h-4" />
          <span>View Details</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default UserProfile;