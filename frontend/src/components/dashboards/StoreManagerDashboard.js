import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2,
  Truck, Warehouse, ClipboardList, UserCheck
} from 'lucide-react';

const StoreManagerDashboard = () => {
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
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'reports', label: 'Reports', icon: ClipboardList },
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
            Store Manager Dashboard
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
            <StoreManagerOverview stats={dashboardStats} />
          )}
          {activeTab === 'inventory' && (
            <InventoryManagement />
          )}
          {activeTab === 'orders' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Order Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Order processing and fulfillment management.</p>
            </div>
          )}
          {activeTab === 'staff' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Staff Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Staff scheduling and performance management.</p>
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Store Reports</h3>
              <p className="text-gray-600 dark:text-gray-400">Store performance reports and analytics.</p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Store Settings</h3>
              <p className="text-gray-600 dark:text-gray-400">Store configuration and preferences.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Store Manager Overview Component
const StoreManagerOverview = ({ stats }) => {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  const storeMetrics = [
    {
      title: 'Total Inventory',
      value: stats.total_products || 0,
      icon: Package,
      color: 'blue',
      change: '+5%'
    },
    {
      title: 'Orders Today',
      value: stats.total_orders || 0,
      icon: ShoppingCart,
      color: 'green',
      change: '+12%'
    },
    {
      title: 'Low Stock Items',
      value: stats.low_stock_products || 0,
      icon: AlertTriangle,
      color: 'yellow',
      change: '-3%'
    },
    {
      title: 'Staff Members',
      value: '8',
      icon: Users,
      color: 'purple',
      change: '+1'
    },
    {
      title: 'Inventory Alerts',
      value: stats.inventory_alerts || 0,
      icon: Warehouse,
      color: 'orange',
      change: '+2'
    },
    {
      title: 'Daily Revenue',
      value: `₹${((stats.total_revenue || 0) / 30).toLocaleString()}`,
      icon: DollarSign,
      color: 'indigo',
      change: '+8%'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Store Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {storeMetrics.map((metric, index) => (
          <StatsCard key={index} {...metric} />
        ))}
      </div>

      {/* Store Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Today's Priority Tasks
          </h3>
          <div className="space-y-3">
            <TaskItem
              type="high"
              message="Process 5 pending orders"
              icon={ShoppingCart}
            />
            <TaskItem
              type="medium"
              message="Update inventory for 3 items"
              icon={Package}
            />
            <TaskItem
              type="low"
              message="Staff performance review"
              icon={UserCheck}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              title="Add Stock"
              icon={Plus}
              color="blue"
            />
            <QuickActionButton
              title="Process Orders"
              icon={ShoppingCart}
              color="green"
            />
            <QuickActionButton
              title="Staff Schedule"
              icon={Users}
              color="purple"
            />
            <QuickActionButton
              title="View Reports"
              icon={BarChart3}
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Store Activities
        </h3>
        <div className="space-y-4">
          <ActivityItem
            type="success"
            message="Successfully processed order #SW202501001"
            time="30 minutes ago"
            icon={ShoppingCart}
          />
          <ActivityItem
            type="info"
            message="Stock updated for Smart Switch Pro"
            time="1 hour ago"
            icon={Package}
          />
          <ActivityItem
            type="warning"
            message="Low stock alert for Dimmer Switch"
            time="2 hours ago"
            icon={AlertTriangle}
          />
          <ActivityItem
            type="info"
            message="New staff member John added to schedule"
            time="3 hours ago"
            icon={Users}
          />
        </div>
      </div>
    </div>
  );
};

// Inventory Management Component
const InventoryManagement = () => {
  const mockInventory = [
    {
      id: 1,
      name: 'Smart Switch Pro',
      sku: 'SSP-001',
      category: 'Switches',
      stock: 45,
      minStock: 10,
      price: 1499,
      status: 'In Stock'
    },
    {
      id: 2,
      name: 'Dimmer Switch',
      sku: 'DS-002',
      category: 'Switches',
      stock: 8,
      minStock: 15,
      price: 1799,
      status: 'Low Stock'
    },
    {
      id: 3,
      name: 'Motion Sensor',
      sku: 'MS-003',
      category: 'Sensors',
      stock: 23,
      minStock: 5,
      price: 899,
      status: 'In Stock'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Inventory Management
        </h3>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {mockInventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold mr-4">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.category}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {item.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <div>
                    <span className={item.stock <= item.minStock ? 'text-red-600' : 'text-green-600'}>
                      {item.stock}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400"> / {item.minStock} min</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  ₹{item.price.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'In Stock' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                      <Truck className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    yellow: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
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
              {change} from yesterday
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
    high: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
    low: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
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

export default StoreManagerDashboard;