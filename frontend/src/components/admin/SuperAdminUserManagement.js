import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Users, Search, Filter, Eye, Edit, Mail, Phone, 
  Calendar, ShoppingCart, DollarSign, MapPin, User,
  Star, Package, Clock, TrendingUp, Plus, Trash2,
  UserPlus, UserMinus, Shield, Crown, UserCheck, Save,
  X, AlertTriangle, CheckCircle
} from 'lucide-react';
import { decryptPhoneNumber } from '../../utils/phoneDecryption';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [decryptedPhones, setDecryptedPhones] = useState(new Map());

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
    
    // Listen for new user creation events
    const handleUserCreated = () => {
      setTimeout(() => fetchUsers(), 1000); // Small delay to ensure data is synced
    };
    
    const handleUserLoggedIn = () => {
      setTimeout(() => fetchUsers(), 1000); // Refresh when users login
    };
    
    window.addEventListener('userAutoLoggedIn', handleUserCreated);
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('userAutoLoggedIn', handleUserCreated);
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, [currentPage, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/auth/users/decrypted', {
        params: {
          page: currentPage,
          per_page: 20,
          ...(searchTerm && { search: searchTerm }),
          ...(roleFilter && { role: roleFilter }),
          ...(statusFilter && { is_active: statusFilter === 'active' })
        }
      });
      
      if (response.data.success) {
        const userData = response.data.data.users || [];
        setUsers(userData);
        setTotalPages(response.data.data.total_pages || 1);
        
        // Create phone map from decrypted data
        const phoneMap = new Map();
        userData.forEach(user => {
          phoneMap.set(user.id, user.decrypted_phone || 'Not provided');
        });
        setDecryptedPhones(phoneMap);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Fallback to original endpoint if new one fails
      try {
        const response = await getAuthenticatedAxios().get('/api/auth/users', {
          params: {
            page: currentPage,
            per_page: 20,
            ...(searchTerm && { search: searchTerm }),
            ...(roleFilter && { role: roleFilter }),
            ...(statusFilter === 'active' && { is_active: true }),
            ...(statusFilter === 'inactive' && { is_active: false })
          }
        });
        
        if (response.data.success) {
          const userData = response.data.data || [];
          setUsers(userData);
          setTotalPages(Math.ceil((response.data.data || []).length / 20) || 1);
          
          // Decrypt all phone numbers
          const phonePromises = userData.map(async (user) => {
            if (user.phone) {
              try {
                const decrypted = await decryptPhoneNumber(user.phone, getAuthenticatedAxios);
                return [user.id, decrypted];
              } catch (error) {
                console.error(`Failed to decrypt phone for user ${user.id}:`, error);
                return [user.id, user.phone]; // Fallback to original
              }
            }
            return [user.id, 'Not provided'];
          });
          
          const phoneResults = await Promise.all(phonePromises);
          const phoneMap = new Map(phoneResults);
          setDecryptedPhones(phoneMap);
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
        // Use mock data as final fallback
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
          }
        ]);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.delete(`/api/auth/users/${user.id}`);
      
      // Show success message
      alert(`User "${user.username}" has been deleted successfully.`);
      
      // Refresh users list
      fetchUsers();
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete user';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleUpdateUser = async (userId, updateData) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.put(`/api/auth/users/${userId}`, updateData);
      
      // Show success message
      alert('User updated successfully!');
      
      // Refresh users list
      fetchUsers();
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update user';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.post('/api/auth/users', userData);
      
      // Show success message
      alert('User created successfully!');
      
      // Refresh users list
      fetchUsers();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create user:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create user';
      alert(`Error: ${errorMessage}`);
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const editUser = (user) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
          <div>
            <button
              onClick={fetchUsers}
              className="btn-secondary flex items-center space-x-2"
            >
              <Search className="w-5 h-5" />
              <span>Refresh</span>
            </button>
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
                  decryptedPhone={decryptedPhones.get(user.id) || 'Loading...'}
                  onViewDetails={viewUserDetails}
                  onEditUser={editUser}
                  onDeleteUser={confirmDelete}
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
          decryptedPhone={decryptedPhones.get(selectedUser.id) || 'Loading...'}
          onClose={() => setShowUserModal(false)}
          userRoles={userRoles}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setShowEditModal(false)}
          onUpdateUser={handleUpdateUser}
          userRoles={userRoles}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreateUser={handleCreateUser}
          userRoles={userRoles}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <DeleteConfirmModal
          user={userToDelete}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirmDelete={handleDeleteUser}
        />
      )}
    </div>
  );
};

// Enhanced User Row Component with full CRUD actions
const UserRow = ({ user, decryptedPhone, onViewDetails, onEditUser, onDeleteUser, userRoles }) => {
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
              {decryptedPhone}
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
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEditUser(user)}
            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded"
            title="Edit User"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteUser(user)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
            title="Delete User"
          >
            <Trash2 className="w-4 h-4" />
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

// Enhanced User Details Modal Component (Read-only)
const UserDetailsModal = ({ user, decryptedPhone, onClose, userRoles }) => {
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
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
            >
              <X className="w-6 h-6" />
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
                      <span className="text-sm text-gray-900 dark:text-white">{decryptedPhone}</span>
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

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
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

// Enhanced Edit User Modal Component
const EditUserModal = ({ user, onClose, onUpdateUser, userRoles }) => {
  const [formData, setFormData] = useState({
    username: user.username || '',
    email: user.email || '',
    full_name: user.full_name || '',
    phone: user.phone || '',
    role: user.role || 'customer',
    is_active: user.is_active !== undefined ? user.is_active : true,
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Only include fields that have changed or are not empty
      const updateData = {};
      
      if (formData.username !== user.username) {
        updateData.username = formData.username;
      }
      if (formData.email !== user.email) {
        updateData.email = formData.email;
      }
      if (formData.full_name !== (user.full_name || '')) {
        updateData.full_name = formData.full_name;
      }
      if (formData.phone !== (user.phone || '')) {
        updateData.phone = formData.phone;
      }
      if (formData.role !== user.role) {
        updateData.role = formData.role;
      }
      if (formData.is_active !== user.is_active) {
        updateData.is_active = formData.is_active;
      }
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await onUpdateUser(user.id, updateData);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit User: {user.username}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account Active
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordField(!showPasswordField)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  {showPasswordField ? 'Hide' : 'Change Password'}
                </button>
              </div>
              {showPasswordField && (
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Enter new password (leave blank to keep current)"
                />
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Update User</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Enhanced Create User Modal Component
const CreateUserModal = ({ onClose, onCreateUser, userRoles }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    phone: '',
    role: 'customer',
    is_active: true,
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const createData = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        role: formData.role,
        is_active: formData.is_active,
        password: formData.password
      };
      
      await onCreateUser(createData);
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New User
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username *
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
                  Email *
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

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account Active
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
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
                  Confirm Password *
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
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Create User</span>
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ user, onClose, onConfirmDelete }) => {
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    try {
      await onConfirmDelete(user);
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
            Delete User Account
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
            Are you sure you want to delete the user account for <strong>{user.username}</strong>? 
            This action cannot be undone and will permanently remove all user data.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input-field"
              placeholder="DELETE"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== 'DELETE'}
              className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;