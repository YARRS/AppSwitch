import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2, Tag,
  ArrowUp, ArrowDown, Zap, Activity, Target
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
      { id: 'overview', label: 'Overview', icon: BarChart3, gradient: 'from-blue-500 to-purple-600' },
    ];

    // Add tabs based on user permissions
    if (user?.role === 'super_admin') {
      tabs.push(
        { id: 'user-management', label: 'User Management', icon: Users, gradient: 'from-green-500 to-emerald-600' },
        { id: 'products', label: 'Products', icon: Package, gradient: 'from-orange-500 to-red-600' },
        { id: 'categories', label: 'Categories', icon: Tag, gradient: 'from-purple-500 to-pink-600' },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, gradient: 'from-teal-500 to-cyan-600' },
        { id: 'customers', label: 'Customers', icon: Users, gradient: 'from-indigo-500 to-blue-600' },
        { id: 'campaigns', label: 'Campaigns', icon: TrendingUp, gradient: 'from-yellow-500 to-orange-600' },
        { id: 'commissions', label: 'Commissions', icon: DollarSign, gradient: 'from-green-500 to-teal-600' },
        { id: 'settings', label: 'Settings', icon: Settings, gradient: 'from-gray-500 to-gray-600' }
      );
    } else if (user?.role === 'admin' || user?.role === 'store_owner') {
      tabs.push(
        { id: 'products', label: 'Products', icon: Package, gradient: 'from-orange-500 to-red-600' },
        { id: 'categories', label: 'Categories', icon: Tag, gradient: 'from-purple-500 to-pink-600' },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, gradient: 'from-teal-500 to-cyan-600' },
        { id: 'customers', label: 'Customers', icon: Users, gradient: 'from-indigo-500 to-blue-600' },
        { id: 'campaigns', label: 'Campaigns', icon: TrendingUp, gradient: 'from-yellow-500 to-orange-600' },
        { id: 'commissions', label: 'Commissions', icon: DollarSign, gradient: 'from-green-500 to-teal-600' },
        { id: 'settings', label: 'Settings', icon: Settings, gradient: 'from-gray-500 to-gray-600' }
      );
    } else if (user?.role === 'sales_manager' || user?.role === 'marketing_manager') {
      tabs.push(
        { id: 'products', label: 'Products', icon: Package, gradient: 'from-orange-500 to-red-600' },
        { id: 'categories', label: 'Categories', icon: Tag, gradient: 'from-purple-500 to-pink-600' },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, gradient: 'from-teal-500 to-cyan-600' },
        { id: 'customers', label: 'Customers', icon: Users, gradient: 'from-indigo-500 to-blue-600' },
        { id: 'campaigns', label: 'Campaigns', icon: TrendingUp, gradient: 'from-yellow-500 to-orange-600' },
        { id: 'commissions', label: 'Commissions', icon: DollarSign, gradient: 'from-green-500 to-teal-600' }
      );
    } else if (user?.role === 'salesperson') {
      tabs.push(
        { id: 'products', label: 'Products', icon: Package, gradient: 'from-orange-500 to-red-600' },
        { id: 'orders', label: 'Orders', icon: ShoppingCart, gradient: 'from-teal-500 to-cyan-600' },
        { id: 'commissions', label: 'My Commissions', icon: DollarSign, gradient: 'from-green-500 to-teal-600' }
      );
    }

    return tabs;
  };

  const navigationTabs = getNavigationTabs();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-8 border-white border-t-transparent shadow-2xl"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 animate-pulse"></div>
          </div>
          <p className="text-white text-xl font-semibold mt-6 animate-bounce">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Background Animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-10 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-yellow-400 to-red-400 rounded-full opacity-5 animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-4 lg:py-8 px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="mb-8 lg:mb-12">
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8">
            <div className="absolute inset-0 bg-black opacity-20"></div>
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-10 transform -skew-x-12 animate-shimmer"></div>
            </div>
            <div className="relative z-10">
              <h1 className="text-3xl lg:text-5xl font-bold text-white mb-2 animate-fade-in-up">
                ✨ Admin Dashboard
              </h1>
              <p className="text-blue-100 text-lg lg:text-xl animate-fade-in-up animation-delay-300">
                Welcome back, <span className="font-semibold text-yellow-300">{user?.full_name || user?.username}</span>
              </p>
              <div className="flex items-center mt-4 text-green-300 animate-fade-in-up animation-delay-600">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm font-medium">System Online & Healthy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl mb-8 overflow-hidden border border-white/20">
          <div className="border-b border-gray-200/50 dark:border-gray-700/50">
            {/* Mobile Navigation - Enhanced Dropdown */}
            <div className="block sm:hidden px-6 py-4">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full p-4 border-2 border-purple-200 dark:border-purple-600 rounded-xl bg-gradient-to-r from-white to-purple-50 dark:text-white dark:from-gray-700 dark:to-purple-900 text-gray-900 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-4 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 16px center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '20px',
                  paddingRight: '48px',
                  appearance: 'none'
                }}
              >
                {navigationTabs.map((tab) => (
                  <option key={tab.id} value={tab.id} className="py-3">
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Navigation - Enhanced Horizontal Tabs */}
            <nav className="hidden sm:flex -mb-px overflow-x-auto px-6">
              <div className="flex space-x-2 lg:space-x-4 min-w-max">
                {navigationTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative py-4 px-4 lg:px-6 font-semibold text-sm lg:text-base flex items-center space-x-2 whitespace-nowrap transition-all duration-300 transform hover:scale-105 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      {isActive && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} rounded-t-xl shadow-lg animate-fade-in`}></div>
                      )}
                      <div className="relative z-10 flex items-center space-x-2">
                        <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${isActive ? 'animate-bounce' : ''}`} />
                        <span>{tab.label}</span>
                      </div>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 animate-shimmer"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* Tab Content with Animation */}
        <div className="space-y-8">
          <div className={`transition-all duration-500 ${activeTab === 'overview' ? 'animate-fade-in-up' : 'hidden'}`}>
            {activeTab === 'overview' && (
              <DashboardOverview stats={dashboardStats} userRole={user?.role} />
            )}
          </div>
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

// Enhanced Dashboard Overview Component
const DashboardOverview = ({ stats, userRole }) => {
  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="relative inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-20 animate-pulse"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg font-medium">Loading dashboard insights...</p>
      </div>
    );
  }

  const getStatsCards = () => {
    const cards = [
      {
        title: 'Total Products',
        value: stats.total_products || 0,
        icon: Package,
        gradient: 'from-blue-500 to-cyan-500',
        change: '+12%',
        trend: 'up',
        bgPattern: '🎁'
      },
      {
        title: 'Total Orders',
        value: stats.total_orders || 0,
        icon: ShoppingCart,
        gradient: 'from-green-500 to-emerald-500',
        change: '+8%',
        trend: 'up',
        bgPattern: '📦'
      },
      {
        title: 'Total Revenue',
        value: `₹${stats.total_revenue?.toLocaleString() || 0}`,
        icon: DollarSign,
        gradient: 'from-purple-500 to-pink-500',
        change: '+15%',
        trend: 'up',
        bgPattern: '💰'
      },
      {
        title: 'Customers',
        value: stats.total_customers || 0,
        icon: Users,
        gradient: 'from-orange-500 to-red-500',
        change: '+23%',
        trend: 'up',
        bgPattern: '👥'
      },
    ];

    // Add role-specific cards
    if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'store_owner') {
      cards.push(
        {
          title: 'Low Stock Alerts',
          value: stats.low_stock_products || 0,
          icon: AlertTriangle,
          gradient: 'from-red-500 to-pink-500',
          change: '-5%',
          trend: 'down',
          bgPattern: '⚠️'
        },
        {
          title: 'Pending Orders',
          value: stats.pending_orders || 0,
          icon: Clock,
          gradient: 'from-yellow-500 to-orange-500',
          change: '+3%',
          trend: 'up',
          bgPattern: '⏰'
        },
        {
          title: 'Active Campaigns',
          value: stats.active_campaigns || 0,
          icon: TrendingUp,
          gradient: 'from-indigo-500 to-purple-500',
          change: '+2%',
          trend: 'up',
          bgPattern: '📈'
        },
        {
          title: 'Commissions',
          value: `₹${stats.total_commissions?.toLocaleString() || 0}`,
          icon: Star,
          gradient: 'from-pink-500 to-rose-500',
          change: '+18%',
          trend: 'up',
          bgPattern: '⭐'
        }
      );
    }

    return cards;
  };

  const statsCards = getStatsCards();

  return (
    <div className="space-y-8">
      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8">
        {statsCards.map((card, index) => (
          <EnhancedStatsCard key={index} {...card} index={index} />
        ))}
      </div>

      {/* Enhanced Quick Actions */}
      <div className="bg-gradient-to-br from-white/90 to-purple-50/90 dark:from-gray-800/90 dark:to-purple-900/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 lg:p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ⚡ Quick Actions
          </h3>
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <EnhancedQuickActionButton
            title="Add Product"
            description="Create new product"
            icon={Plus}
            gradient="from-blue-500 to-cyan-500"
            emoji="➕"
          />
          <EnhancedQuickActionButton
            title="View Orders"
            description="Manage recent orders"
            icon={Eye}
            gradient="from-green-500 to-emerald-500"
            emoji="👁️"
          />
          <EnhancedQuickActionButton
            title="Customer Support"
            description="Handle inquiries"
            icon={Users}
            gradient="from-purple-500 to-pink-500"
            emoji="🤝"
          />
          <EnhancedQuickActionButton
            title="Analytics"
            description="View detailed reports"
            icon={BarChart3}
            gradient="from-orange-500 to-red-500"
            emoji="📊"
          />
        </div>
      </div>

      {/* Enhanced Recent Activity */}
      <div className="bg-gradient-to-br from-white/90 to-blue-50/90 dark:from-gray-800/90 dark:to-blue-900/50 backdrop-blur-lg rounded-2xl shadow-2xl p-6 lg:p-8 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            📊 Recent Activity
          </h3>
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center animate-bounce">
            <Activity className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="space-y-4">
          <EnhancedActivityItem
            type="order"
            message="New order #VK20250124001 received"
            time="2 minutes ago"
            icon={ShoppingCart}
            gradient="from-green-500 to-emerald-500"
            emoji="🛒"
          />
          <EnhancedActivityItem
            type="product"
            message="Product 'Crystal Vase Collection' stock updated"
            time="15 minutes ago"
            icon={Package}
            gradient="from-blue-500 to-cyan-500"
            emoji="📦"
          />
          <EnhancedActivityItem
            type="user"
            message="New customer registration from Mumbai"
            time="1 hour ago"
            icon={Users}
            gradient="from-purple-500 to-pink-500"
            emoji="👤"
          />
          <EnhancedActivityItem
            type="alert"
            message="Low stock alert for 3 gift items"
            time="2 hours ago"
            icon={AlertTriangle}
            gradient="from-red-500 to-orange-500"
            emoji="⚠️"
          />
        </div>
      </div>
    </div>
  );
};

// Enhanced Stats Card Component
const EnhancedStatsCard = ({ title, value, icon: Icon, gradient, change, trend, bgPattern, index }) => {
  return (
    <div 
      className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 lg:p-8 border border-white/20 hover:scale-105 transform transition-all duration-500 hover:shadow-3xl animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Background Pattern */}
      <div className="absolute top-4 right-4 text-4xl opacity-10 group-hover:opacity-20 transition-opacity duration-300">
        {bgPattern}
      </div>
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 lg:p-4 rounded-xl bg-gradient-to-r ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
          </div>
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' 
              ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>{change}</span>
          </div>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white group-hover:scale-110 transition-transform duration-300">
            {typeof value === 'string' && value.length > 10 ? (
              <span className="text-xl lg:text-2xl">{value}</span>
            ) : (
              value
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            from last month
          </p>
        </div>
      </div>

      {/* Animated Border */}
      <div className="absolute inset-0 rounded-2xl">
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-20 animate-pulse`}></div>
      </div>
    </div>
  );
};

// Enhanced Quick Action Button Component
const EnhancedQuickActionButton = ({ title, description, icon: Icon, gradient, emoji }) => {
  return (
    <button className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl shadow-lg p-4 lg:p-6 transition-all duration-300 hover:scale-110 hover:shadow-2xl border border-white/20 overflow-hidden">
      {/* Gradient Background on Hover */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`}></div>
      
      {/* Content */}
      <div className="relative z-10 text-center space-y-3">
        <div className="flex justify-center">
          <div className={`p-3 rounded-full bg-gradient-to-r ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h4 className="font-bold text-sm lg:text-base text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
            {title}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 group-hover:text-gray-800 dark:group-hover:text-gray-200">
            {description}
          </p>
        </div>
        <div className="text-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-300">
          {emoji}
        </div>
      </div>

      {/* Animated Border */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:border-purple-500 transition-all duration-300"></div>
    </button>
  );
};

// Enhanced Activity Item Component
const EnhancedActivityItem = ({ message, time, icon: Icon, gradient, emoji }) => {
  return (
    <div className="group flex items-center space-x-4 p-4 rounded-xl hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all duration-300 hover:scale-102 hover:shadow-lg">
      <div className={`relative p-3 rounded-full bg-gradient-to-r ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5 text-white" />
        <div className="absolute -top-1 -right-1 text-xs">
          {emoji}
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
          {message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
          <Clock className="w-3 h-3 mr-1" />
          {time}
        </p>
      </div>
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse group-hover:scale-150 transition-transform duration-300"></div>
    </div>
  );
};

export default AdminDashboard;