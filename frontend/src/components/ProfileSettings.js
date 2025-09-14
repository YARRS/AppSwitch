import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, Mail, Lock, Phone, Save, AlertTriangle, 
  CheckCircle2, Eye, EyeOff, Key, UserCircle 
} from 'lucide-react';

const ProfileSettings = () => {
  const { user, getAuthenticatedAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState({});
  const [message, setMessage] = useState({ type: '', content: '' });

  // Email update state
  const [emailData, setEmailData] = useState({
    email: user?.email || '',
    password: ''
  });

  // Password setup state
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false
  });

  // Password change state
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmNewPassword: false
  });

  const showMessage = (type, content) => {
    setMessage({ type, content });
    setTimeout(() => setMessage({ type: '', content: '' }), 5000);
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setLoading({ email: true });

    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.put('/api/auth/profile/email', emailData);
      
      if (response.data.success) {
        showMessage('success', 'Email updated successfully!');
        setEmailData({ ...emailData, password: '' });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update email';
      showMessage('error', errorMessage);
    } finally {
      setLoading({ email: false });
    }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.confirmPassword) {
      showMessage('error', 'Passwords do not match');
      return;
    }

    setLoading({ passwordSetup: true });

    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.post('/api/auth/profile/setup-password', {
        password: passwordData.password,
        confirm_password: passwordData.confirmPassword
      });
      
      if (response.data.success) {
        showMessage('success', 'Password set successfully!');
        setPasswordData({
          password: '',
          confirmPassword: '',
          showPassword: false,
          showConfirmPassword: false
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to set password';
      showMessage('error', errorMessage);
    } finally {
      setLoading({ passwordSetup: false });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (changePasswordData.newPassword !== changePasswordData.confirmNewPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    setLoading({ passwordChange: true });

    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.put('/api/auth/profile/password', null, {
        params: {
          current_password: changePasswordData.currentPassword,
          new_password: changePasswordData.newPassword,
          confirm_password: changePasswordData.confirmNewPassword
        }
      });
      
      if (response.data.success) {
        showMessage('success', 'Password changed successfully!');
        setChangePasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
          showCurrentPassword: false,
          showNewPassword: false,
          showConfirmNewPassword: false
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to change password';
      showMessage('error', errorMessage);
    } finally {
      setLoading({ passwordChange: false });
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: UserCircle },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'password', label: 'Password', icon: Lock }
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <User className="w-8 h-8" />
            <span>Profile Settings</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Message Display */}
        {message.content && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{message.content}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      isActive
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Info Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={user?.full_name || ''}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={user?.phone || 'Not provided'}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </label>
                    <input
                      type="text"
                      value={user?.role?.replace('_', ' ').toUpperCase() || ''}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="text-blue-800 dark:text-blue-300 font-medium">
                        Account Information
                      </h4>
                      <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                        Your username, phone number, and role cannot be changed. 
                        Contact support if you need to update these details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings Tab */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Email Settings
                </h3>
                
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    />
                  </div>

                  {user?.hashed_password && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Password (for verification)
                      </label>
                      <input
                        type="password"
                        value={emailData.password}
                        onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter your current password"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading.email}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading.email ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Update Email</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Password Management
                </h3>

                {/* Password Setup (for users without password) */}
                {(!user?.hashed_password || user?.needs_password_setup) && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                    <h4 className="text-yellow-800 dark:text-yellow-300 font-medium mb-4 flex items-center space-x-2">
                      <Key className="w-5 h-5" />
                      <span>Set Up Your Password</span>
                    </h4>
                    
                    <form onSubmit={handlePasswordSetup} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={passwordData.showPassword ? 'text' : 'password'}
                            value={passwordData.password}
                            onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter new password (min. 6 characters)"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordData({ ...passwordData, showPassword: !passwordData.showPassword })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {passwordData.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <input
                            type={passwordData.showConfirmPassword ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordData({ ...passwordData, showConfirmPassword: !passwordData.showConfirmPassword })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {passwordData.showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading.passwordSetup}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.passwordSetup ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Setting Password...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5" />
                            <span>Set Password</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* Password Change (for users with existing password) */}
                {user?.hashed_password && !user?.needs_password_setup && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-4 flex items-center space-x-2">
                      <Lock className="w-5 h-5" />
                      <span>Change Password</span>
                    </h4>
                    
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={changePasswordData.showCurrentPassword ? 'text' : 'password'}
                            value={changePasswordData.currentPassword}
                            onChange={(e) => setChangePasswordData({ ...changePasswordData, currentPassword: e.target.value })}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter current password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setChangePasswordData({ ...changePasswordData, showCurrentPassword: !changePasswordData.showCurrentPassword })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {changePasswordData.showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={changePasswordData.showNewPassword ? 'text' : 'password'}
                            value={changePasswordData.newPassword}
                            onChange={(e) => setChangePasswordData({ ...changePasswordData, newPassword: e.target.value })}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Enter new password (min. 6 characters)"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setChangePasswordData({ ...changePasswordData, showNewPassword: !changePasswordData.showNewPassword })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {changePasswordData.showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={changePasswordData.showConfirmNewPassword ? 'text' : 'password'}
                            value={changePasswordData.confirmNewPassword}
                            onChange={(e) => setChangePasswordData({ ...changePasswordData, confirmNewPassword: e.target.value })}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setChangePasswordData({ ...changePasswordData, showConfirmNewPassword: !changePasswordData.showConfirmNewPassword })}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {changePasswordData.showConfirmNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading.passwordChange}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.passwordChange ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Changing Password...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            <span>Change Password</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;