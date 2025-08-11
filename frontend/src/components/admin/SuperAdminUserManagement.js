import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Search, Filter, Eye, Edit, Mail, Phone, 
  Calendar, ShoppingCart, DollarSign, MapPin, User,
  Star, Package, Clock, TrendingUp, Plus, Trash2,
  UserPlus, UserMinus, Shield, Crown, UserCheck
} from 'lucide-react';

const SuperAdminUserManagement = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const userRoles = [
    { value: 'super_admin', label: 'Super Admin', icon: Crown },
    { value: 'admin', label: 'Admin', icon: Shield },
    { value: 'store_owner', label: 'Store Owner', icon: Package },
    { value: 'store_manager', label: 'Store Manager', icon: Users },
    { value: 'sales_manager', label: 'Sales Manager', icon: TrendingUp },
    { value: 'salesperson', label: 'Salesperson', icon: User },
    { value: 'marketing_manager', label: 'Marketing Manager', icon: TrendingUp },
    { value: 'support_executive', label: 'Support Executive', icon: Phone },
    { value: 'customer', label: 'Customer', icon: User }
  ];

  useEffect(() => {
    fetchUsers();
    
    // Set up interval to refresh user data periodically
    const interval = setInterval(() => {
      fetchUsers();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/auth/users', {
        params: {
          page: currentPage,
          per_page: 20,
          ...(searchTerm && { search: searchTerm }),
          ...(roleFilter && { role: roleFilter }),
          ...(statusFilter && { is_active: statusFilter === 'active' })
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.data || []);
        setTotalPages(Math.ceil((response.data.data || []).length / 20) || 1);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Mock data for demo purposes
      setUsers([
        {
          id: '1',
          username: 'superadmin',
          email: 'superadmin@vallmark.com',
          full_name: 'Super Admin',
          phone: '+91-9876543210',
          role: 'super_admin',
          is_active: true,
          created_at: '2024-01-01T10:30:00Z',
          last_login: '2024-01-20T14:45:00Z'
        },
        {
          id: '2',
          username: 'admin',
          email: 'admin@vallmark.com',
          full_name: 'Admin User',
          phone: '+91-9876543211',
          role: 'admin',
          is_active: true,
          created_at: '2024-01-02T08:15:00Z',
          last_login: '2024-01-19T16:20:00Z'
        },
        {
          id: '3',
          username: 'storeowner',
          email: 'storeowner@vallmark.com',
          full_name: 'Store Owner',
          phone: '+91-9876543212',
          role: 'store_owner',
          is_active: true,
          created_at: '2024-01-03T09:20:00Z',
          last_login: '2024-01-18T12:30:00Z'
        },
        {
          id: '4',
          username: 'salesmanager',
          email: 'salesmanager@vallmark.com',
          full_name: 'Sales Manager',
          phone: '+91-9876543213',
          role: 'sales_manager',
          is_active: true,
          created_at: '2024-01-04T11:45:00Z',
          last_login: '2024-01-17T10:15:00Z'
        },
        {
          id: '5',
          username: 'customer',
          email: 'customer@vallmark.com',
          full_name: 'Customer User',
          phone: '+91-9876543214',
          role: 'customer',
          is_active: true,
          created_at: '2024-01-05T14:20:00Z',
          last_login: '2024-01-16T18:45:00Z'
        }
      ]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.put(`/api/auth/users/${userId}/role`, { role: newRole });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user role:', error);
      alert('Failed to update user role');
    }
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.put(`/api/auth/users/${userId}`, { is_active: isActive });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Failed to update user status');
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const getRoleInfo = (role) => {
    return userRoles.find(r => r.value === role) || { label: role, icon: User };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all users and their roles across the system
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <UserStatsCard
          title="Total Users"
          value={users.length}
          icon={Users}
          color="blue"
        />
        <UserStatsCard
          title="Admin Users"
          value={users.filter(u => ['super_admin', 'admin'].includes(u.role)).length}
          icon={Shield}
          color="purple"
        />
        <UserStatsCard
          title="Staff Members"
          value={users.filter(u => !['customer', 'super_admin', 'admin'].includes(u.role)).length}
          icon={UserCheck}
          color="green"
        />
        <UserStatsCard
          title="Customers"
          value={users.filter(u => u.role === 'customer').length}
          icon={ShoppingCart}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Roles</option>
              {userRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div>
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
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onViewDetails={viewUserDetails}
                  onUpdateRole={updateUserRole}
                  onUpdateStatus={updateUserStatus}
                  userRoles={userRoles}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
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

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowUserModal(false)}
          onUpdateRole={updateUserRole}
          onUpdateStatus={updateUserStatus}
          userRoles={userRoles}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onUserCreated={fetchUsers}
          userRoles={userRoles}
        />
      )}
    </div>
  );
};

// User Row Component
const UserRow = ({ user, onViewDetails, onUpdateRole, onUpdateStatus, userRoles }) => {
  const roleInfo = userRoles.find(r => r.value === user.role) || { label: user.role, icon: User };
  const RoleIcon = roleInfo.icon;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {user.full_name || user.username}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              @{user.username}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <RoleIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900 dark:text-white">
            {roleInfo.label}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-1">
          <div className="flex items-center text-sm text-gray-900 dark:text-white">
            <Mail className="w-4 h-4 text-gray-400 mr-2" />
            {user.email}
          </div>
          {user.phone && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Phone className="w-4 h-4 text-gray-400 mr-2" />
              {user.phone}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        {user.last_login ? (
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            {new Date(user.last_login).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">Never</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(user)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onUpdateStatus(user.id, !user.is_active)}
            className={`${
              user.is_active 
                ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                : 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
            }`}
          >
            {user.is_active ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  );
};

// User Stats Card Component
const UserStatsCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
};

// User Details Modal Component
const UserDetailsModal = ({ user, onClose, onUpdateRole, onUpdateStatus, userRoles }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  
  const handleRoleUpdate = () => {
    if (selectedRole !== user.role) {
      onUpdateRole(user.id, selectedRole);
    }
    onClose();
  };

  const roleInfo = userRoles.find(r => r.value === user.role) || { label: user.role, icon: User };
  const RoleIcon = roleInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {user.full_name || user.username}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <RoleIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {roleInfo.label}
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

          {/* User Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">User Information</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Username: </span>
                    <span className="text-sm text-gray-900 dark:text-white">@{user.username}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Email: </span>
                    <span className="text-sm text-gray-900 dark:text-white">{user.email}</span>
                  </div>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Phone: </span>
                      <span className="text-sm text-gray-900 dark:text-white">{user.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Account Status</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Created: </span>
                    <span className="text-sm text-gray-900 dark:text-white">{new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Last Login: </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Status: </span>
                    <span className="text-sm text-gray-900 dark:text-white">{user.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Role Management */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Role Management</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Change Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="input-field"
                >
                  {userRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onUpdateStatus(user.id, !user.is_active)}
              className={`btn-primary ${
                user.is_active 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {user.is_active ? 'Deactivate' : 'Activate'} User
            </button>
            {selectedRole !== user.role && (
              <button
                onClick={handleRoleUpdate}
                className="btn-primary"
              >
                Update Role
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Create User Modal Component
const CreateUserModal = ({ onClose, onUserCreated, userRoles }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'customer',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { getAuthenticatedAxios } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      await axios.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
        password: formData.password
      });
      
      onUserCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New User
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="input-field"
              >
                {userRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Confirm password"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;