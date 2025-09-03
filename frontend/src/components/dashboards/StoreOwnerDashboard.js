import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2,
  Store, Wallet, PieChart, UserCheck, Building
} from 'lucide-react';

const StoreOwnerDashboard = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/dashboard/');
      setDashboardStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigationTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'staff', label: 'Staff', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Store Owner Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Welcome back, {user?.full_name || user?.username}
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
            <StoreOwnerOverview stats={dashboardStats} />
          )}
          {activeTab === 'products' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Product Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Product management interface will be implemented here.</p>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Order Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Order management interface will be implemented here.</p>
            </div>
          )}
          {activeTab === 'customers' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Customer management interface will be implemented here.</p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Business Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">Analytics dashboard will be implemented here.</p>
            </div>
          )}
          {activeTab === 'staff' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Staff Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Staff management interface will be implemented here.</p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Store Settings</h3>
              <p className="text-gray-600 dark:text-gray-400">Store settings interface will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Store Owner Overview Component
const StoreOwnerOverview = ({ stats }) => {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  const businessMetrics = [
    {
      title: 'Total Revenue',
      value: `₹${stats.total_revenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'green',
      change: '+15%'
    },
    {
      title: 'Profit Margin',
      value: `${stats.profit_margin || 0}%`,
      icon: TrendingUp,
      color: 'blue',
      change: '+2.5%'
    },
    {
      title: 'Inventory Value',
      value: `₹${stats.inventory_value?.toLocaleString() || 0}`,
      icon: Package,
      color: 'purple',
      change: '+8%'
    },
    {
      title: 'Commission Payouts',
      value: `₹${stats.commission_payouts?.toLocaleString() || 0}`,
      icon: Wallet,
      color: 'orange',
      change: '+12%'
    },
    {
      title: 'Total Products',
      value: stats.total_products || 0,
      icon: Store,
      color: 'indigo',
      change: '+5%'
    },
    {
      title: 'Active Customers',
      value: stats.total_customers || 0,
      icon: Users,
      color: 'pink',
      change: '+18%'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Business Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {businessMetrics.map((metric, index) => (
          <StatsCard key={index} {...metric} />
        ))}
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Business Alerts
          </h3>
          <div className="space-y-3">
            <AlertItem
              type="warning"
              message={`${stats.low_stock_products || 0} products are running low on stock`}
              icon={AlertTriangle}
            />
            <AlertItem
              type="info"
              message={`${stats.pending_orders || 0} orders are pending processing`}
              icon={Clock}
            />
            <AlertItem
              type="success"
              message={`${stats.active_campaigns || 0} marketing campaigns are currently active`}
              icon={TrendingUp}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              title="Add Product"
              icon={Plus}
              color="blue"
            />
            <QuickActionButton
              title="View Reports"
              icon={BarChart3}
              color="green"
            />
            <QuickActionButton
              title="Manage Staff"
              icon={UserCheck}
              color="purple"
            />
            <QuickActionButton
              title="Settings"
              icon={Settings}
              color="orange"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color, change }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
    indigo: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400',
    pink: 'text-pink-600 bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {change && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              {change} from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ type, message, icon: Icon }) => {
  const typeClasses = {
    warning: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
    info: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    success: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-full ${typeClasses[type]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-sm text-gray-900 dark:text-white flex-1">{message}</p>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ title, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30',
    purple: 'text-purple-600 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30',
    orange: 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30',
  };

  return (
    <button className={`p-3 rounded-lg transition-colors ${colorClasses[color]}`}>
      <Icon className="w-6 h-6 mx-auto mb-2" />
      <h4 className="font-semibold text-xs sm:text-sm">{title}</h4>
    </button>
  );
};

export default StoreOwnerDashboard;