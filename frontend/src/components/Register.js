import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle, ArrowLeft, Sparkles, Shield, Zap, Heart, Crown } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Account Details
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Password validation
    if (name === 'password') {
      setPasswordValidation({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        number: /\d/.test(value),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
      });
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateStep1 = () => {
    const { full_name, email, phone } = formData;
    
    if (!full_name.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (phone && !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    const { username, password, confirmPassword } = formData;
    
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    // Validate password strength
    if (!passwordValidation.length || !passwordValidation.uppercase || !passwordValidation.number) {
      setError('Password does not meet requirements');
      return false;
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep === 1) {
      handleNext();
      return;
    }

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...registrationData } = formData;
      const result = await register(registrationData);
      
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepTitle = () => {
    return currentStep === 1 ? 'Create Your Account' : 'Secure Your Account';
  };

  const getStepDescription = () => {
    return currentStep === 1 
      ? 'Let\'s start with your basic information to get you set up' 
      : 'Now create a username and secure password for your account';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden min-h-full">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentStep >= 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                <User className="w-4 h-4" />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">Basic Info</span>
            </div>
            <div className={`w-8 h-1 rounded-full transition-all duration-300 ${
              currentStep >= 2 ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}></div>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                currentStep >= 2 ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}>
                <Lock className="w-4 h-4" />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">Security</span>
            </div>
          </div>

          {/* Back button for step 2 */}
          {currentStep === 2 && (
            <button
              onClick={handleBack}
              className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl blur opacity-50 animate-ping"></div>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-purple-600 dark:from-white dark:to-purple-400 bg-clip-text text-transparent mb-3">
            {getStepTitle()}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-2">
            {getStepDescription()}
          </p>
          
          <div className="text-center">
            <p className="text-base text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-purple-600 hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
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

            {currentStep === 1 ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500"
                      placeholder="Enter your full name"
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500"
                      placeholder="your@email.com"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Phone Number <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500"
                      placeholder="Your phone number"
                    />
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Username *
                  </label>
                  <div className="relative">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500"
                      placeholder="Choose a unique username"
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 pr-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500"
                      placeholder="Create a strong password"
                    />
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                    </button>
                  </div>
                  
                  {/* Password validation */}
                  {formData.password && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Password must contain:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center text-sm">
                          {passwordValidation.length ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className={passwordValidation.length ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            8+ characters
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          {passwordValidation.uppercase ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className={passwordValidation.uppercase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            Uppercase
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          {passwordValidation.number ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className={passwordValidation.number ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            Number
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          {passwordValidation.special ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className={passwordValidation.special ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            Special char
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-4 py-4 pl-12 pr-12 border-2 border-gray-200 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-lg bg-white dark:bg-gray-700 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500"
                      placeholder="Confirm your password"
                    />
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-6 h-6" />
                  <span>
                    {currentStep === 1 ? 'Continue' : 'Create Account'}
                  </span>
                </div>
              )}
            </button>

            {/* Features */}
            {currentStep === 1 && (
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
            )}
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
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-300"></div>
              <span>GDPR Compliant</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;