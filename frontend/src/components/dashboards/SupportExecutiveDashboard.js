import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, Users, ShoppingCart, Settings, BarChart3, 
  TrendingUp, AlertTriangle, Clock, DollarSign,
  Star, Eye, Plus, Filter, Search, Edit, Trash2,
  MessageSquare, Phone, Mail, CheckCircle, XCircle, HelpCircle
} from 'lucide-react';

const SupportExecutiveDashboard = () => {
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
    { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
    { id: 'customers', label: 'Customer Support', icon: Users },
    { id: 'knowledge', label: 'Knowledge Base', icon: HelpCircle },
    { id: 'reports', label: 'Reports', icon: TrendingUp }
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
            Support Executive Dashboard
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
            <SupportOverview stats={dashboardStats} />
          )}
          {activeTab === 'tickets' && (
            <SupportTickets />
          )}
          {activeTab === 'customers' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Support</h3>
              <p className="text-gray-600 dark:text-gray-400">Customer support interface with chat and communication tools.</p>
            </div>
          )}
          {activeTab === 'knowledge' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Knowledge Base</h3>
              <p className="text-gray-600 dark:text-gray-400">Knowledge base management and FAQ system.</p>
            </div>
          )}
          {activeTab === 'reports' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Support Reports</h3>
              <p className="text-gray-600 dark:text-gray-400">Support performance reports and analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Support Overview Component
const SupportOverview = ({ stats }) => {
  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  const supportMetrics = [
    {
      title: 'Total Tickets',
      value: stats.total_tickets || 0,
      icon: MessageSquare,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Pending Tickets',
      value: stats.pending_tickets || 0,
      icon: Clock,
      color: 'yellow',
      change: '-8%'
    },
    {
      title: 'Resolved Tickets',
      value: stats.resolved_tickets || 0,
      icon: CheckCircle,
      color: 'green',
      change: '+15%'
    },
    {
      title: 'Customer Inquiries',
      value: stats.customer_inquiries || 0,
      icon: HelpCircle,
      color: 'purple',
      change: '+5%'
    },
    {
      title: 'Response Time',
      value: '2.5 hrs',
      icon: TrendingUp,
      color: 'indigo',
      change: '-0.5 hrs'
    },
    {
      title: 'Satisfaction Rate',
      value: '94%',
      icon: Star,
      color: 'pink',
      change: '+2%'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Support Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {supportMetrics.map((metric, index) => (
          <StatsCard key={index} {...metric} />
        ))}
      </div>

      {/* Support Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Priority Tickets
          </h3>
          <div className="space-y-3">
            <TicketItem
              priority="high"
              title="System not working after installation"
              customer="John Doe"
              time="2 hours ago"
            />
            <TicketItem
              priority="medium"
              title="Need help with smart home integration"
              customer="Sarah Wilson"
              time="4 hours ago"
            />
            <TicketItem
              priority="low"
              title="General inquiry about products"
              customer="Mike Johnson"
              time="1 day ago"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionButton
              title="New Ticket"
              icon={Plus}
              color="blue"
            />
            <QuickActionButton
              title="Call Customer"
              icon={Phone}
              color="green"
            />
            <QuickActionButton
              title="Send Email"
              icon={Mail}
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
    </div>
  );
};

// Support Tickets Component
const SupportTickets = () => {
  const mockTickets = [
    {
      id: 'TK001',
      title: 'Smart switch not responding',
      customer: 'John Doe',
      priority: 'high',
      status: 'open',
      created: '2 hours ago',
      description: 'Smart switch stopped working after power outage'
    },
    {
      id: 'TK002',
      title: 'Installation guidance needed',
      customer: 'Sarah Wilson',
      priority: 'medium',
      status: 'in_progress',
      created: '4 hours ago',
      description: 'Need help with connecting switch to home network'
    },
    {
      id: 'TK003',
      title: 'Product inquiry',
      customer: 'Mike Johnson',
      priority: 'low',
      status: 'resolved',
      created: '1 day ago',
      description: 'General questions about product features'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Support Tickets
        </h3>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </button>
      </div>
      
      <div className="space-y-4">
        {mockTickets.map((ticket) => (
          <div key={ticket.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {ticket.title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {ticket.customer} • {ticket.created}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  ticket.priority === 'high' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : ticket.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                  {ticket.priority}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  ticket.status === 'open' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    : ticket.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {ticket.description}
            </p>
            <div className="flex items-center space-x-2">
              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
                View Details
              </button>
              <button className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-sm">
                Reply
              </button>
              <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 text-sm">
                Close
              </button>
            </div>
          </div>
        ))}
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
              {change} from last week
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

const TicketItem = ({ priority, title, customer, time }) => {
  const priorityClasses = {
    high: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400',
    medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400',
    low: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className={`p-2 rounded-full ${priorityClasses[priority]}`}>
        <MessageSquare className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {customer} • {time}
        </p>
      </div>
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

export default SupportExecutiveDashboard;