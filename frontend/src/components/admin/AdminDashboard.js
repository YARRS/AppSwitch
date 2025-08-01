import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2, Tag
} from 'lucide-react';

// Component imports
import ProductManagement from './ProductManagement';
import CategoryManagement from './CategoryManagement';
import OrderManagement from './OrderManagement';
import CustomerManagement from './CustomerManagement';
import CampaignManagement from './CampaignManagement';
import CommissionManagement from './CommissionManagement';
import SystemSettings from './SystemSettings';
import SuperAdminUserManagement from './SuperAdminUserManagement';

const AdminDashboard = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard statistics
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/dashboard/stats');
      setDashboardStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation tabs based on user role
  const getNavigationTabs = () => {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: BarChart3 },
    ];

    // Add tabs based on user permissions
    if (user?.role === 'super_admin') {
      tabs.push(
        { id: 'user-management', label: 'User Management', icon: Users },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
        { id: 'commissions', label: 'Commissions', icon: DollarSign },
        { id: 'settings', label: 'Settings', icon: Settings }
      );
    } else if (user?.role === 'admin' || user?.role === 'store_owner') {
      tabs.push(
        { id: 'products', label: 'Products', icon: Package },
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
        { id: 'commissions', label: 'Commissions', icon: DollarSign },
        { id: 'settings', label: 'Settings', icon: Settings }
      );
    } else if (user?.role === 'sales_manager' || user?.role === 'marketing_manager') {
      tabs.push(
        { id: 'products', label: 'Products', icon: Package },
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'campaigns', label: 'Campaigns', icon: TrendingUp },
        { id: 'commissions', label: 'Commissions', icon: DollarSign }
      );
    } else if (user?.role === 'salesperson') {
      tabs.push(
        { id: 'products', label: 'Products', icon: Package },
        { id: 'orders', label: 'Orders', icon: ShoppingCart },
        { id: 'commissions', label: 'My Commissions', icon: DollarSign }
      );
    }

    return tabs;
  };

  const navigationTabs = getNavigationTabs();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-4 lg:py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1 lg:mt-2">
            Welcome back, {user?.full_name || user?.username}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            {/* Mobile Navigation - Dropdown */}
            <div className="block sm:hidden px-4 py-2">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {navigationTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Navigation - Horizontal Tabs */}
            <nav className="hidden sm:flex -mb-px overflow-x-auto px-6">
              <div className="flex space-x-2 lg:space-x-8 min-w-max">
                {navigationTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-2 lg:px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
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
              </div>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <DashboardOverview stats={dashboardStats} userRole={user?.role} />
          )}
          {activeTab === 'user-management' && <SuperAdminUserManagement />}
          {activeTab === 'products' && <ProductManagement />}
          {activeTab === 'categories' && <CategoryManagement />}
          {activeTab === 'orders' && <OrderManagement />}
          {activeTab === 'customers' && <CustomerManagement />}
          {activeTab === 'campaigns' && <CampaignManagement />}
          {activeTab === 'commissions' && <CommissionManagement />}
          {activeTab === 'settings' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({ stats, userRole }) => {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  const getStatsCards = () => {
    const cards = [
      {
        title: 'Total Products',
        value: stats.total_products,
        icon: Package,
        color: 'blue',
        change: '+12%'
      },
      {
        title: 'Total Orders',
        value: stats.total_orders,
        icon: ShoppingCart,
        color: 'green',
        change: '+8%'
      },
      {
        title: 'Total Revenue',
        value: `₹${stats.total_revenue?.toLocaleString() || 0}`,
        icon: DollarSign,
        color: 'purple',
        change: '+15%'
      },
      {
        title: 'Customers',
        value: stats.total_customers,
        icon: Users,
        color: 'orange',
        change: '+23%'
      },
    ];

    // Add role-specific cards
    if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'store_owner') {
      cards.push(
        {
          title: 'Low Stock Alerts',
          value: stats.low_stock_products,
          icon: AlertTriangle,
          color: 'red',
          change: '-5%'
        },
        {
          title: 'Pending Orders',
          value: stats.pending_orders,
          icon: Clock,
          color: 'yellow',
          change: '+3%'
        },
        {
          title: 'Active Campaigns',
          value: stats.active_campaigns,
          icon: TrendingUp,
          color: 'indigo',
          change: '+2%'
        },
        {
          title: 'Commissions',
          value: `₹${stats.total_commissions?.toLocaleString() || 0}`,
          icon: Star,
          color: 'pink',
          change: '+18%'
        }
      );
    }

    return cards;
  };

  const statsCards = getStatsCards();

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statsCards.map((card, index) => (
          <StatsCard key={index} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <QuickActionButton
            title="Add Product"
            description="Create new product"
            icon={Plus}
            color="blue"
          />
          <QuickActionButton
            title="View Orders"
            description="Manage recent orders"
            icon={Eye}
            color="green"
          />
          <QuickActionButton
            title="Customer Support"
            description="Handle inquiries"
            icon={Users}
            color="purple"
          />
          <QuickActionButton
            title="Analytics"
            description="View detailed reports"
            icon={BarChart3}
            color="orange"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h3>
        <div className="space-y-4">
          <ActivityItem
            type="order"
            message="New order #SW20250124001 received"
            time="2 minutes ago"
            icon={ShoppingCart}
            color="green"
          />
          <ActivityItem
            type="product"
            message="Product 'Smart Switch Pro' stock updated"
            time="15 minutes ago"
            icon={Package}
            color="blue"
          />
          <ActivityItem
            type="user"
            message="New customer registration"
            time="1 hour ago"
            icon={Users}
            color="purple"
          />
          <ActivityItem
            type="alert"
            message="Low stock alert for 3 products"
            time="2 hours ago"
            icon={AlertTriangle}
            color="red"
          />
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
    red: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
    indigo: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400',
    pink: 'text-pink-600 bg-pink-100 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
            {title}
          </p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'string' && value.length > 10 ? (
              <span className="text-xl lg:text-2xl">{value}</span>
            ) : (
              value
            )}
          </p>
          {change && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              {change} from last month
            </p>
          )}
        </div>
        <div className={`p-2 lg:p-3 rounded-full ${colorClasses[color]} flex-shrink-0 ml-2`}>
          <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ title, description, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30',
    green: 'text-green-600 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30',
    purple: 'text-purple-600 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30',
    orange: 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30',
  };

  return (
    <button className={`p-3 lg:p-4 rounded-lg transition-colors ${colorClasses[color]}`}>
      <Icon className="w-6 h-6 lg:w-8 lg:h-8 mx-auto mb-2" />
      <h4 className="font-semibold text-xs lg:text-sm">{title}</h4>
      <p className="text-xs opacity-75 hidden sm:block">{description}</p>
    </button>
  );
};

// Activity Item Component
const ActivityItem = ({ message, time, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    red: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-full ${colorClasses[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900 dark:text-white">{message}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{time}</p>
      </div>
    </div>
  );
};

export default AdminDashboard;