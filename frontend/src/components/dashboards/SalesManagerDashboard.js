import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2,
  Target, Award, UserCheck, PieChart
} from 'lucide-react';

const SalesManagerDashboard = () => {
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
    { id: 'team', label: 'Team Performance', icon: Users },
    { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'commissions', label: 'Commissions', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: PieChart }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Sales Manager Dashboard
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
            <SalesManagerOverview stats={dashboardStats} />
          )}
          {activeTab === 'team' && (
            <TeamPerformance stats={dashboardStats} />
          )}
          {activeTab === 'sales' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Sales Analytics</h3>
              <p className="text-gray-600 dark:text-gray-400">Sales analytics dashboard will be implemented here.</p>
            </div>
          )}
          {activeTab === 'campaigns' && (
            <CampaignPerformance stats={dashboardStats} />
          )}
          {activeTab === 'commissions' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Commission Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Commission management interface will be implemented here.</p>
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Sales Reports</h3>
              <p className="text-gray-600 dark:text-gray-400">Sales reports dashboard will be implemented here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sales Manager Overview Component
const SalesManagerOverview = ({ stats }) => {
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
      title: 'Total Sales',
      value: `₹${stats.total_revenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'green',
      change: '+15%'
    },
    {
      title: 'Orders Processed',
      value: stats.total_orders || 0,
      icon: ShoppingCart,
      color: 'blue',
      change: '+8%'
    },
    {
      title: 'Team Performance',
      value: `${stats.team_performance?.length || 0} Members`,
      icon: Users,
      color: 'purple',
      change: '+12%'
    },
    {
      title: 'Active Campaigns',
      value: stats.active_campaigns || 0,
      icon: Target,
      color: 'orange',
      change: '+3%'
    },
    {
      title: 'Commission Earned',
      value: `₹${stats.total_commissions?.toLocaleString() || 0}`,
      icon: Award,
      color: 'indigo',
      change: '+18%'
    },
    {
      title: 'Target Achievement',
      value: '85%',
      icon: TrendingUp,
      color: 'pink',
      change: '+5%'
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

      {/* Dashboard Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Alerts
          </h3>
          <div className="space-y-3">
            <AlertItem
              type="success"
              message="Monthly sales target achieved!"
              icon={Award}
            />
            <AlertItem
              type="info"
              message={`${stats.pending_orders || 0} orders need attention`}
              icon={Clock}
            />
            <AlertItem
              type="warning"
              message="2 team members below target"
              icon={AlertTriangle}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              title="Team Report"
              icon={UserCheck}
              color="blue"
            />
            <QuickActionButton
              title="New Campaign"
              icon={Plus}
              color="green"
            />
            <QuickActionButton
              title="Analytics"
              icon={BarChart3}
              color="purple"
            />
            <QuickActionButton
              title="Commissions"
              icon={DollarSign}
              color="orange"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Team Performance Component
const TeamPerformance = ({ stats }) => {
  const teamPerformance = stats?.team_performance || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Team Performance
      </h3>
      
      {teamPerformance.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Sales Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {teamPerformance.map((member, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                        {member.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.username}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ₹{member.total_sales?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {member.order_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Good
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No team performance data available</p>
        </div>
      )}
    </div>
  );
};

// Campaign Performance Component
const CampaignPerformance = ({ stats }) => {
  const campaignPerformance = stats?.campaign_performance || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Campaign Performance
      </h3>
      
      {campaignPerformance.length > 0 ? (
        <div className="space-y-4">
          {campaignPerformance.map((campaign, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {campaign.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {campaign.discount_value}% discount
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {campaign.usage_count || 0} / {campaign.usage_limit || 0} used
                  </p>
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${((campaign.usage_count || 0) / (campaign.usage_limit || 1)) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Start: {new Date(campaign.start_date).toLocaleDateString()}</span>
                <span>End: {new Date(campaign.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No campaign performance data available</p>
        </div>
      )}
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

export default SalesManagerDashboard;