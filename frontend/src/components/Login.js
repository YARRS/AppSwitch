import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Phone, Key, ArrowLeft, Sparkles, Zap, Heart, Shield } from 'lucide-react';
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
        case 'email': return 'Reset Your Password';
        case 'code': return 'Verify Reset Code';
        case 'password': return 'Create New Password';
        default: return 'Reset Password';
      }
    }
    
    switch (loginStep) {
      case 'identifier': return 'Welcome Back!';
      case 'password': return 'Enter Password';
      case 'otp': return 'Verify OTP';
      default: return 'Welcome Back!';
    }
  };

  const getStepDescription = () => {
    if (showResetPassword) {
      switch (resetStep) {
        case 'email': return 'Enter your email to receive a password reset code';
        case 'code': return 'Enter the 6-digit code sent to your email (use RESET123 for testing)';
        case 'password': return 'Choose a strong password for your account';
        default: return '';
      }
    }
    
    switch (loginStep) {
      case 'identifier': return 'Sign in with your email or phone number to continue';
      case 'password': return `Welcome back! Please enter your password for ${formData.identifier}`;
      case 'otp': return `Enter the OTP sent to ${formData.identifier} (use 123456 for testing)`;
      default: return '';
    }
  };

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="text-center">
            {/* Back Button */}
            <button
              onClick={() => {
                setShowResetPassword(false);
                setResetStep('email');
                setResetData({ email: '', resetCode: '', newPassword: '' });
                setError('');
              }}
              className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl animate-pulse">
                  <Key className="w-10 h-10 text-white" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur opacity-50 animate-ping"></div>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent mb-3">
              {getStepTitle()}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {getStepDescription()}
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg py-12 px-8 shadow-2xl sm:rounded-3xl border border-white/20 dark:border-gray-700/20">
            <form className="space-y-6" onSubmit={handleResetPassword}>
              {error && (
                <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                  <div className="flex items-center">
                    <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 mr-3 flex-shrink-0" />
                    <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {resetStep === 'email' && (
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="reset-email"
                        name="email"
                        type="email"
                        required
                        value={resetData.email}
                        onChange={handleResetChange}
                        className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500"
                        placeholder="your@email.com"
                      />
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                )}

                {resetStep === 'code' && (
                  <div>
                    <label htmlFor="reset-code" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Reset Code
                    </label>
                    <div className="relative">
                      <input
                        id="reset-code"
                        name="resetCode"
                        type="text"
                        required
                        value={resetData.resetCode}
                        onChange={handleResetChange}
                        className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500 text-center tracking-widest"
                        placeholder="RESET123"
                        maxLength="7"
                      />
                      <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                )}

                {resetStep === 'password' && (
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        name="newPassword"
                        type="password"
                        required
                        value={resetData.newPassword}
                        onChange={handleResetChange}
                        className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500"
                        placeholder="Create a strong password"
                      />
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>
                    {resetStep === 'email' && 'Send Reset Code'}
                    {resetStep === 'code' && 'Verify Code'}
                    {resetStep === 'password' && 'Update Password'}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-pink-400 to-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl">
                {loginType === 'phone' ? (
                  <Phone className="w-10 h-10 text-white" />
                ) : (
                  <Mail className="w-8 h-8 text-white" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl blur opacity-50 animate-ping"></div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-2">
            {getStepDescription()}
          </p>
          {loginStep !== 'identifier' && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Start over</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg py-12 px-8 shadow-2xl sm:rounded-3xl border border-white/20 dark:border-gray-700/20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400 mr-3 flex-shrink-0" />
                  <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
                </div>
              </div>
            )}

            {otpSent && loginStep === 'otp' && (
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-green-500 dark:text-green-400 mr-3 flex-shrink-0" />
                  <p className="text-green-800 dark:text-green-300 font-medium">
                    OTP sent to {formData.identifier}. Use 123456 for testing.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {loginStep === 'identifier' && (
                <div>
                  <label htmlFor="identifier" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      required
                      value={formData.identifier}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500"
                      placeholder="your@email.com or phone number"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                </div>
              )}

              {loginType === 'email' && loginStep === 'password' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 pr-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500"
                      placeholder="Enter your password"
                    />
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                    </button>
                  </div>
                </div>
              )}

              {loginType === 'phone' && loginStep === 'otp' && (
                <div>
                  <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Enter OTP Code
                  </label>
                  <div className="relative">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      maxLength="6"
                      value={formData.otp}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 text-center text-2xl tracking-widest font-bold transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500"
                      placeholder="123456"
                    />
                    <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Didn't receive the code?{' '}
                      <button
                        type="button"
                        onClick={() => sendOTP(formData.identifier)}
                        className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Resend OTP
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {loginType === 'email' && loginStep === 'password' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Keep me signed in
                  </label>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  <span>Signing you in...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-6 h-6" />
                  <span>
                    {loginStep === 'identifier' && 'Continue'}
                    {loginStep === 'password' && 'Sign In'}
                    {loginStep === 'otp' && 'Verify & Sign In'}
                  </span>
                </div>
              )}
            </button>

            {/* Features */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Secure</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Fast</p>
              </div>
              <div className="text-center">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Trusted</p>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-base text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Create one now
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>SSL Protected</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300"></div>
              <span>256-bit Encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;