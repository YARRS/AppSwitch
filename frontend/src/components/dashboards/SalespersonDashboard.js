import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2,
  Target, Award, UserCheck, Phone, Mail
} from 'lucide-react';

const SalespersonDashboard = () => {
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
    { id: 'customers', label: 'My Customers', icon: Users },
    { id: 'orders', label: 'My Orders', icon: ShoppingCart },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: TrendingUp }
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
            Salesperson Dashboard
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
            <SalespersonOverview stats={dashboardStats} />
          )}
          {activeTab === 'products' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">My Products</h3>
              <p className="text-gray-600 dark:text-gray-400">Product catalog available to you for sales.</p>
            </div>
          )}
          {activeTab === 'customers' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">My Customers</h3>
              <p className="text-gray-600 dark:text-gray-400">Customers you've served and their details.</p>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">My Orders</h3>
              <p className="text-gray-600 dark:text-gray-400">Orders you've processed and their status.</p>
            </div>
          )}
          {activeTab === 'commissions' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Commission Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400">Your commission earnings and payment history.</p>
            </div>
          )}
          {activeTab === 'performance' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">Your sales performance and targets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Salesperson Overview Component
const SalespersonOverview = ({ stats }) => {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  const salesMetrics = [
    {
      title: 'My Sales',
      value: `₹${stats.my_sales?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'green',
      change: '+12%'
    },
    {
      title: 'My Commissions',
      value: `₹${stats.my_commissions?.toLocaleString() || 0}`,
      icon: Award,
      color: 'blue',
      change: '+8%'
    },
    {
      title: 'My Products',
      value: stats.my_products || 0,
      icon: Package,
      color: 'purple',
      change: '+5%'
    },
    {
      title: 'My Customers',
      value: stats.my_customers || 0,
      icon: Users,
      color: 'orange',
      change: '+18%'
    },
    {
      title: 'This Month Target',
      value: '85%',
      icon: Target,
      color: 'indigo',
      change: '+2%'
    },
    {
      title: 'Performance Rating',
      value: '4.8/5',
      icon: Star,
      color: 'pink',
      change: '+0.2'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sales Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {salesMetrics.map((metric, index) => (
          <StatsCard key={index} {...metric} />
        ))}
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Tasks
          </h3>
          <div className="space-y-3">
            <TaskItem
              type="info"
              message="Follow up with 3 potential customers"
              icon={Phone}
            />
            <TaskItem
              type="warning"
              message="Submit weekly sales report"
              icon={BarChart3}
            />
            <TaskItem
              type="success"
              message="Process 2 pending orders"
              icon={ShoppingCart}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              title="Add Lead"
              icon={Plus}
              color="blue"
            />
            <QuickActionButton
              title="View Products"
              icon={Package}
              color="green"
            />
            <QuickActionButton
              title="Customer Call"
              icon={Phone}
              color="purple"
            />
            <QuickActionButton
              title="Send Email"
              icon={Mail}
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        <div className="space-y-4">
          <ActivityItem
            type="success"
            message="Closed deal with customer John Doe - ₹2,500"
            time="2 hours ago"
            icon={Award}
          />
          <ActivityItem
            type="info"
            message="Followed up with lead Sarah Wilson"
            time="4 hours ago"
            icon={Phone}
          />
          <ActivityItem
            type="warning"
            message="Pending order #SW202501001 needs attention"
            time="6 hours ago"
            icon={AlertTriangle}
          />
          <ActivityItem
            type="info"
            message="Added new product to showcase"
            time="1 day ago"
            icon={Package}
          />
        </div>
      </div>
    </div>
  );
};

// Reusable Components
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

const TaskItem = ({ type, message, icon: Icon }) => {
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

const ActivityItem = ({ type, message, time, icon: Icon }) => {
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
      <div className="flex-1">
        <p className="text-sm text-gray-900 dark:text-white">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>
    </div>
  );
};

export default SalespersonDashboard;