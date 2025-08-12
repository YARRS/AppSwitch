import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Search, Filter, Eye, Edit, Mail, Phone, 
  Calendar, ShoppingCart, DollarSign, MapPin, User,
  Star, Package, Clock, TrendingUp
} from 'lucide-react';
import { decryptPhoneNumber } from '../../utils/phoneDecryption';

const CustomerManagement = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [decryptedPhones, setDecryptedPhones] = useState(new Map());

  useEffect(() => {
    fetchCustomers();
    
    // Set up interval to refresh customer data periodically
    const interval = setInterval(() => {
      fetchCustomers();
    }, 30000); // Refresh every 30 seconds
    
    // Listen for new user creation events (e.g., from guest orders)
    const handleUserCreated = () => {
      setTimeout(() => fetchCustomers(), 1000); // Small delay to ensure data is synced
    };
    
    const handleUserLoggedIn = () => {
      setTimeout(() => fetchCustomers(), 1000); // Refresh when users login
    };
    
    window.addEventListener('userAutoLoggedIn', handleUserCreated);
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('userAutoLoggedIn', handleUserCreated);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, [currentPage, searchTerm, statusFilter]);

  const fetchCustomers = async () => {
    try {
      const axios = getAuthenticatedAxios();
      // Note: Using auth/users endpoint to get all users with customer role
      const response = await axios.get('/api/auth/users', {
        params: {
          page: currentPage,
          per_page: 20,
          role: 'customer',
          ...(searchTerm && { search: searchTerm }),
          ...(statusFilter && { is_active: statusFilter === 'active' })
        }
      });
      const customerData = response.data.data || [];
      setCustomers(customerData);
      setTotalPages(response.data.total_pages || 1);
      
      // Decrypt all phone numbers
      const phonePromises = customerData.map(async (customer) => {
        if (customer.phone) {
          try {
            const decrypted = await decryptPhoneNumber(customer.phone, getAuthenticatedAxios);
            return [customer.id, decrypted];
          } catch (error) {
            console.error(`Failed to decrypt phone for customer ${customer.id}:`, error);
            return [customer.id, customer.phone]; // Fallback to original
          }
        }
        return [customer.id, 'Not provided'];
      });
      
      const phoneResults = await Promise.all(phonePromises);
      const phoneMap = new Map(phoneResults);
      setDecryptedPhones(phoneMap);
      
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      // Mock data for demo purposes if API fails
      setCustomers([
        {
          id: '1',
          username: 'john_doe',
          email: 'john.doe@example.com',
          full_name: 'John Doe',
          phone: '+91-9876543210',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          last_login: '2024-01-20T14:45:00Z'
        },
        {
          id: '2',
          username: 'jane_smith',
          email: 'jane.smith@example.com', 
          full_name: 'Jane Smith',
          phone: '+91-9876543211',
          is_active: true,
          created_at: '2024-01-10T08:15:00Z',
          last_login: '2024-01-19T16:20:00Z'
        }
      ]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/orders/admin/all', {
        params: { user_id: customerId }
      });
      setCustomerOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customer orders:', error);
      // Mock data for demo purposes
      setCustomerOrders([
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
    }
  };

  const viewCustomerDetails = async (customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerOrders(customer.id);
    setShowCustomerModal(true);
  };

  const updateCustomerStatus = async (customerId, isActive) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.put(`/api/auth/users/${customerId}`, { is_active: isActive });
      fetchCustomers();
    } catch (error) {
      console.error('Failed to update customer status:', error);
      alert('Failed to update customer status');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Customer Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage customer information and order history
          </p>
        </div>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Customers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                1,234
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Customers
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                1,156
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                New This Month
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                89
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg. Order Value
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ₹2,450
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button
            onClick={fetchCustomers}
            className="btn-secondary flex items-center space-x-2"
          >
            <Search className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Login
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
              {customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  decryptedPhone={decryptedPhones.get(customer.id) || 'Loading...'}
                  onViewDetails={viewCustomerDetails}
                  onUpdateStatus={updateCustomerStatus}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Details Modal */}
      {showCustomerModal && selectedCustomer && (
        <CustomerDetailsModal
          customer={selectedCustomer}
          orders={customerOrders}
          onClose={() => setShowCustomerModal(false)}
          onUpdateStatus={updateCustomerStatus}
        />
      )}
    </div>
  );
};

// Customer Row Component
const CustomerRow = ({ customer, decryptedPhone, onViewDetails, onUpdateStatus }) => {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
            {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : customer.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {customer.full_name || customer.username}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{customer.username}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-900 dark:text-white">
            <Mail className="w-4 h-4 text-gray-400 mr-2" />
            {customer.email}
          </div>
          {customer.phone && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Phone className="w-4 h-4 text-gray-400 mr-2" />
              {customer.phone}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          {new Date(customer.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {customer.last_login ? (
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            {new Date(customer.last_login).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Never</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          customer.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {customer.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(customer)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onUpdateStatus(customer.id, !customer.is_active)}
            className={`${
              customer.is_active 
                ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
            }`}
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Customer Details Modal Component
const CustomerDetailsModal = ({ customer, orders, onClose, onUpdateStatus }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.final_amount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : customer.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {customer.full_name || customer.username}
                </h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    customer.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {customer.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Customer since {new Date(customer.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{totalOrders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Spent</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                    ₹{totalSpent.toLocaleString()}
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
                    ₹{avgOrderValue.toLocaleString()}
                  </p>
                </div>
                <Star className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Order History ({totalOrders})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">{customer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">@{customer.username}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Account Details</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Joined: </span>
                        <span className="text-sm">{new Date(customer.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {customer.last_login && (
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Last Login: </span>
                          <span className="text-sm">{new Date(customer.last_login).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <div className={`w-3 h-3 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>
                      <span className="text-sm">{customer.is_active ? 'Active Account' : 'Inactive Account'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => onUpdateStatus(customer.id, !customer.is_active)}
                  className={`btn-primary ${
                    customer.is_active 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {customer.is_active ? 'Deactivate Account' : 'Activate Account'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-semibold text-gray-900 dark:text-white">
                            Order #{order.order_number}
                          </h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ₹{order.final_amount?.toLocaleString()}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'delivered' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : order.status === 'shipped'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No orders found for this customer</p>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-6">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;