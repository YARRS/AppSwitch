import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2,
  Heart, MapPin, CreditCard, Truck, HelpCircle, Gift,
  Home, Smartphone, Zap, Shield
} from 'lucide-react';

const CustomerDashboard = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    try {
      const axios = getAuthenticatedAxios();
      // Fetch customer orders
      const ordersResponse = await axios.get('/api/orders/my-orders');
      setOrders(ordersResponse.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customer data:', error);
      // Mock data for demo
      setOrders([
        {
          id: '1',
          order_number: 'SW20250124001',
          created_at: '2024-01-20T14:30:00Z',
          status: 'delivered',
          final_amount: 2999,
          items: [
            { product_name: 'Smart Switch Pro', quantity: 2, price: 1499.5 }
          ]
        },
        {
          id: '2',
          order_number: 'SW20250120002',
          created_at: '2024-01-18T10:15:00Z',
          status: 'shipped',
          final_amount: 1799,
          items: [
            { product_name: 'Dimmer Switch', quantity: 1, price: 1799 }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const navigationTabs = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'orders', label: 'My Orders', icon: ShoppingCart },
    { id: 'products', label: 'Browse Products', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'support', label: 'Support', icon: HelpCircle },
    { id: 'profile', label: 'Profile', icon: Users }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name || user?.username}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your smart home journey with SmartSwitch IoT
          </p>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden mb-4">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full input-field"
          >
            {navigationTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-4 px-6 overflow-x-auto">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <CustomerOverview orders={orders} />
          )}
          {activeTab === 'orders' && (
            <CustomerOrders orders={orders} />
          )}
          {activeTab === 'products' && (
            <BrowseProducts />
          )}
          {activeTab === 'wishlist' && (
            <CustomerWishlist />
          )}
          {activeTab === 'support' && (
            <CustomerSupport />
          )}
          {activeTab === 'profile' && (
            <CustomerProfile />
          )}
        </div>
      </div>
    </div>
  );
};

// Customer Overview Component
const CustomerOverview = ({ orders }) => {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.final_amount || 0), 0);
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Customer Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <CustomerStatsCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
          color="blue"
          description="Orders placed"
        />
        <CustomerStatsCard
          title="Total Spent"
          value={`₹${totalSpent.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          description="Lifetime value"
        />
        <CustomerStatsCard
          title="Smart Devices"
          value="5"
          icon={Zap}
          color="purple"
          description="Connected devices"
        />
        <CustomerStatsCard
          title="Rewards Points"
          value="2,450"
          icon={Gift}
          color="orange"
          description="Available points"
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Orders
            </h3>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              View All
            </button>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
              <button className="btn-primary mt-4">
                Start Shopping
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <QuickActionItem
              title="Browse Products"
              description="Explore our smart home solutions"
              icon={Package}
              color="blue"
            />
            <QuickActionItem
              title="Track Order"
              description="Check your order status"
              icon={Truck}
              color="green"
            />
            <QuickActionItem
              title="Get Support"
              description="Need help? Contact us"
              icon={HelpCircle}
              color="purple"
            />
            <QuickActionItem
              title="Smart Home App"
              description="Download our mobile app"
              icon={Smartphone}
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recommended for You
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ProductCard
            name="Smart Switch Pro"
            price="₹1,499"
            image="/api/placeholder/300/200"
            rating={4.8}
            reviews={324}
          />
          <ProductCard
            name="Dimmer Switch"
            price="₹1,799"
            image="/api/placeholder/300/200"
            rating={4.6}
            reviews={198}
          />
          <ProductCard
            name="Motion Sensor"
            price="₹899"
            image="/api/placeholder/300/200"
            rating={4.9}
            reviews={445}
          />
        </div>
      </div>
    </div>
  );
};

// Customer Orders Component
const CustomerOrders = ({ orders }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        My Orders
      </h3>
      
      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Order #{order.order_number}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₹{order.final_amount?.toLocaleString()}
                  </p>
                  <OrderStatus status={order.status} />
                </div>
              </div>
              
              <div className="space-y-2">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      ₹{item.price?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
                  View Details
                </button>
                <div className="flex space-x-2">
                  <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 text-sm">
                    Reorder
                  </button>
                  <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 text-sm">
                    Track Order
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No orders found</p>
          <button className="btn-primary mt-4">
            Start Shopping
          </button>
        </div>
      )}
    </div>
  );
};

// Browse Products Component
const BrowseProducts = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Browse Products
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Explore our complete range of smart home solutions
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProductCard
            name="Smart Switch Pro"
            price="₹1,499"
            image="/api/placeholder/300/200"
            rating={4.8}
            reviews={324}
          />
          <ProductCard
            name="Dimmer Switch"
            price="₹1,799"
            image="/api/placeholder/300/200"
            rating={4.6}
            reviews={198}
          />
          <ProductCard
            name="Motion Sensor"
            price="₹899"
            image="/api/placeholder/300/200"
            rating={4.9}
            reviews={445}
          />
        </div>
      </div>
    </div>
  );
};

// Customer Wishlist Component
const CustomerWishlist = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        My Wishlist
      </h3>
      <div className="text-center py-8">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Your wishlist is empty</p>
        <button className="btn-primary mt-4">
          Add Products
        </button>
      </div>
    </div>
  );
};

// Customer Support Component
const CustomerSupport = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Customer Support
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Need Help?</h4>
            <div className="space-y-3">
              <SupportOption
                title="Live Chat"
                description="Chat with our support team"
                icon={HelpCircle}
                available={true}
              />
              <SupportOption
                title="Email Support"
                description="Send us an email"
                icon={HelpCircle}
                available={true}
              />
              <SupportOption
                title="Phone Support"
                description="Call us at +91-12345-67890"
                icon={HelpCircle}
                available={false}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Quick Links</h4>
            <div className="space-y-2">
              <a href="#" className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                Installation Guide
              </a>
              <a href="#" className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                FAQ
              </a>
              <a href="#" className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                Troubleshooting
              </a>
              <a href="#" className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                Warranty Information
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Customer Profile Component
const CustomerProfile = () => {
  const { user } = useAuth();
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        My Profile
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Personal Information</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user?.full_name || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user?.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {user?.phone || 'Not provided'}
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Account Settings</h4>
          <div className="space-y-3">
            <button className="w-full text-left btn-secondary">
              Edit Profile
            </button>
            <button className="w-full text-left btn-secondary">
              Change Password
            </button>
            <button className="w-full text-left btn-secondary">
              Notification Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Components
const CustomerStatsCard = ({ title, value, icon: Icon, color, description }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

const OrderCard = ({ order }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            Order #{order.order_number}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900 dark:text-white">
          ₹{order.final_amount?.toLocaleString()}
        </p>
        <OrderStatus status={order.status} />
      </div>
    </div>
  );
};

const OrderStatus = ({ status }) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', text: 'Pending' },
    processing: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', text: 'Processing' },
    shipped: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', text: 'Shipped' },
    delivered: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', text: 'Delivered' },
    cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', text: 'Cancelled' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
      {config.text}
    </span>
  );
};

const QuickActionItem = ({ title, description, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
      <div className={`p-2 rounded-full ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
};

const ProductCard = ({ name, price, image, rating, reviews }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
      <div className="aspect-w-16 aspect-h-9 mb-4">
        <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
      </div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{name}</h4>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{price}</span>
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-400 fill-current" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{rating}</span>
          <span className="text-sm text-gray-400">({reviews})</span>
        </div>
      </div>
      <button className="w-full btn-primary">
        Add to Cart
      </button>
    </div>
  );
};

const SupportOption = ({ title, description, icon: Icon, available }) => {
  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg ${available ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
      <div className={`p-2 rounded-full ${available ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
        <Icon className={`w-5 h-5 ${available ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      {available && (
        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
          Available
        </span>
      )}
    </div>
  );
};

export default CustomerDashboard;