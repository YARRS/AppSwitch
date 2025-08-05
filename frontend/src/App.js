import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Moon, Sun, Zap, Shield, Home, Users, Settings, Package, BarChart3, LogIn, UserPlus, User as UserIcon, ShoppingCart } from 'lucide-react';
import axios from 'axios';

// Components
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart } from './contexts/CartContext';
import { ProtectedRoute, AdminRoute, OptionalAuth } from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import UserProfile from './components/UserProfile';
import ProductsPage from './components/ProductsPage';
import ProductDetail from './components/ProductDetail';
import AdminDashboard from './components/admin/AdminDashboard';
import Logo from './components/Logo';

// Theme context
export const ThemeContext = React.createContext();

// API base URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    // Check system preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || 
                      (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDarkMode);
    
    // Apply theme class
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  useEffect(() => {
    // Test backend connection
    const testConnection = async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/health`);
        setBackendStatus('connected');
      } catch (error) {
        console.error('Backend connection failed:', error);
        setBackendStatus('disconnected');
      }
    };
    
    testConnection();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
    document.documentElement.classList.toggle('dark', newMode);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300">
              <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              <main className="relative">
                <Routes>
                  <Route path="/" element={<ProductsPage />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <UserProfile />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    } 
                  />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </ThemeContext.Provider>
      </CartProvider>
    </AuthProvider>
  );
}

// Header Component
function Header({ darkMode, toggleDarkMode }) {
  const { user, logout, isAuthenticated } = useAuth();
  const { getCartItemCount } = useCart();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo size="medium" />
          
          <nav className="hidden md:flex space-x-8">
            <a href="/" className="nav-link">Shop</a>
            <a href="/about" className="nav-link">About</a>
            <a href="/contact" className="nav-link">Contact</a>
            {isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'store_owner') && (
              <a href="/admin" className="nav-link">Admin</a>
            )}
          </nav>
          
          <div className="flex items-center space-x-4">
            {/* Shopping Cart Icon */}
            <button className="relative p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              {getCartItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </button>

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>
            
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <UserIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.username}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50">
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Profile
                    </a>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <a
                  href="/login"
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </a>
                <a
                  href="/register"
                  className="flex items-center space-x-1 btn-primary"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Home Page Component
function HomePage({ backendStatus }) {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Transform Your Home Into a{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Smart Home
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Convert your physical wall switches into smart home switches that work with Google Home, 
              Alexa, and your smartphone. Control all your appliances from anywhere.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/products"
                className="btn-primary text-lg px-8 py-3 text-center inline-block"
              >
                Shop Now
              </a>
              <a
                href="/about"
                className="btn-secondary text-lg px-8 py-3 text-center inline-block"
              >
                Learn More
              </a>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="mt-12 text-center">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm ${
              backendStatus === 'connected' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : backendStatus === 'disconnected'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                backendStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span>System Status: {backendStatus === 'connected' ? 'Online' : 
                                   backendStatus === 'disconnected' ? 'Offline' : 'Checking...'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose SmartSwitch?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Our IoT solutions make your home smarter, safer, and more efficient.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-blue-600" />}
              title="Secure & Reliable"
              description="Bank-grade encryption ensures your smart home is safe and secure."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-yellow-500" />}
              title="Easy Installation"
              description="Replace your existing switches in minutes with our simple installation process."
            />
            <FeatureCard
              icon={<Home className="w-8 h-8 text-green-600" />}
              title="Universal Compatibility"
              description="Works with Google Home, Alexa, and all major smart home platforms."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }) {
  return (
    <div className="card text-center hover:shadow-xl transition-shadow">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  );
}

// Placeholder Pages

function AboutPage() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">About Vallmark</h1>
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p>
            Vallmark is your premier destination for exquisite gift articles that bring joy and meaning to 
            every occasion. We specialize in curating unique, high-quality items that help you express your 
            sentiments and create lasting memories with your loved ones.
          </p>
          <p>
            From elegant home decor pieces to personalized keepsakes, our carefully selected collection 
            ensures that you'll find the perfect gift for birthdays, anniversaries, holidays, or any 
            special moment worth celebrating.
          </p>
          <p>
            At Vallmark, we believe that every gift tells a story, and we're here to help you tell yours 
            beautifully.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Contact Vallmark</h1>
        <div className="card">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Have a question about our gift articles or need help finding the perfect gift? 
            We'd love to help you create memorable moments.
          </p>
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input type="text" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input type="email" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea rows="4" className="input-field" placeholder="Tell us about the occasion or what kind of gift you're looking for..."></textarea>
            </div>
            <button type="submit" className="btn-primary">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <Logo size="small" className="mb-4" />
            <p className="text-gray-400">
              Your premier destination for exquisite gift articles that create lasting memories.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Categories</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/" className="hover:text-white">Home Decor</a></li>
              <li><a href="/" className="hover:text-white">Personalized Gifts</a></li>
              <li><a href="/" className="hover:text-white">Special Occasions</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/about" className="hover:text-white">Gift Guide</a></li>
              <li><a href="/contact" className="hover:text-white">FAQ</a></li>
              <li><a href="/contact" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/about" className="hover:text-white">About</a></li>
              <li><a href="/contact" className="hover:text-white">Careers</a></li>
              <li><a href="/contact" className="hover:text-white">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Vallmark Gift Articles. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default App;