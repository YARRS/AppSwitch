import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Phone, Key } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    otp: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState(null); // 'email' or 'phone'
  const [loginStep, setLoginStep] = useState('identifier'); // 'identifier', 'password', 'otp'
  const [otpSent, setOtpSent] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetData, setResetData] = useState({
    email: '',
    resetCode: '',
    newPassword: '',
  });
  const [resetStep, setResetStep] = useState('email'); // 'email', 'code', 'password'

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const detectLoginType = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await axios.post(`${API_BASE_URL}/api/auth/login/detect`, {
        identifier: formData.identifier
      });

      if (response.data.success) {
        const { login_type, identifier, requires } = response.data.data;
        setLoginType(login_type);
        setFormData(prev => ({ ...prev, identifier }));

        if (login_type === 'email') {
          setLoginStep('password');
        } else if (login_type === 'phone') {
          // Send OTP for phone login
          await sendOTP(identifier);
          setLoginStep('otp');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to detect login type');
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phoneNumber) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/otp/send`, {
        phone_number: phoneNumber
      });

      if (response.data.success) {
        setOtpSent(true);
        setError(''); // Clear any previous errors
        // Show success message temporarily
        const successMsg = `OTP sent to ${phoneNumber}. Use 123456 for testing.`;
        setError(''); // We'll show success in a different way
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP');
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loginStep === 'identifier') {
      await detectLoginType();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (loginType === 'email') {
        // Regular email/password login
        const result = await login(formData.identifier, formData.password);
        if (result.success) {
          navigate(from, { replace: true });
        } else {
          setError(result.error);
        }
      } else if (loginType === 'phone') {
        // Mobile OTP login
        const response = await axios.post(`${API_BASE_URL}/api/auth/login/mobile`, {
          phone_number: formData.identifier,
          otp: formData.otp
        });

        if (response.data.access_token) {
          // Store token and user data like regular login
          localStorage.setItem('access_token', response.data.access_token);
          
          // Trigger auth context update
          window.dispatchEvent(new CustomEvent('userAutoLoggedIn', { 
            detail: { 
              access_token: response.data.access_token, 
              user: response.data.user 
            } 
          }));
          
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (resetStep === 'email') {
        const response = await axios.post(`${API_BASE_URL}/api/auth/password/reset-request`, {
          email: resetData.email
        });
        
        if (response.data.success) {
          setResetStep('code');
          setError(''); // Clear errors, show success message differently
        }
      } else if (resetStep === 'code') {
        setResetStep('password');
      } else if (resetStep === 'password') {
        const response = await axios.post(`${API_BASE_URL}/api/auth/password/reset-confirm`, {
          email: resetData.email,
          reset_code: resetData.resetCode,
          new_password: resetData.newPassword
        });
        
        if (response.data.success) {
          setShowResetPassword(false);
          setResetStep('email');
          setResetData({ email: '', resetCode: '', newPassword: '' });
          setError('');
          // Show success message
          alert('Password reset successfully! You can now login with your new password.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ identifier: '', password: '', otp: '' });
    setLoginType(null);
    setLoginStep('identifier');
    setOtpSent(false);
    setError('');
  };

  const getStepTitle = () => {
    if (showResetPassword) {
      switch (resetStep) {
        case 'email': return 'Reset Password';
        case 'code': return 'Enter Reset Code';
        case 'password': return 'Set New Password';
        default: return 'Reset Password';
      }
    }
    
    switch (loginStep) {
      case 'identifier': return 'Sign in to your account';
      case 'password': return 'Enter your password';
      case 'otp': return 'Enter OTP';
      default: return 'Sign in to your account';
    }
  };

  const getStepDescription = () => {
    if (showResetPassword) {
      switch (resetStep) {
        case 'email': return 'Enter your email address to receive a reset code';
        case 'code': return 'Enter the reset code sent to your email (use RESET123 for testing)';
        case 'password': return 'Enter your new password';
        default: return '';
      }
    }
    
    switch (loginStep) {
      case 'identifier': return 'Enter your email address or mobile number';
      case 'password': return `Password for ${formData.identifier}`;
      case 'otp': return `OTP sent to ${formData.identifier} (use 123456 for testing)`;
      default: return '';
    }
  };

  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Key className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {getStepTitle()}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {getStepDescription()}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {resetStep === 'email' && (
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      required
                      value={resetData.email}
                      onChange={handleResetChange}
                      className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                      placeholder="Enter your email"
                    />
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )}

              {resetStep === 'code' && (
                <div>
                  <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reset Code
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="reset-code"
                      name="resetCode"
                      type="text"
                      required
                      value={resetData.resetCode}
                      onChange={handleResetChange}
                      className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                      placeholder="Enter reset code"
                    />
                    <Key className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )}

              {resetStep === 'password' && (
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      required
                      value={resetData.newPassword}
                      onChange={handleResetChange}
                      className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                      placeholder="Enter new password"
                    />
                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetStep('email');
                  setResetData({ email: '', resetCode: '', newPassword: '' });
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  resetStep === 'password' ? 'Reset Password' : 'Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <span className="text-2xl font-bold text-white">S</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                  placeholder="Enter your email"
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white dark:bg-gray-800"
                  placeholder="Enter your password"
                />
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign up now
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;