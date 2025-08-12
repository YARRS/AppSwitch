import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Search, Filter, ShoppingCart, Eye, Star, Heart, Sparkles, Zap, TrendingUp } from 'lucide-react';
import axios from 'axios';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 12,
    total: 0,
    total_pages: 0
  });

  const { isAuthenticated, getAuthenticatedAxios } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Fetch products from API
  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pagination.per_page.toString(),
        is_active: 'true' // Only show active products
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (priceRange.min) params.append('min_price', priceRange.min);
      if (priceRange.max) params.append('max_price', priceRange.max);

      const response = await axios.get(`${API_BASE_URL}/api/products/?${params}`);
      
      if (response.data.success) {
        setProducts(response.data.data || []);
        setPagination({
          page: response.data.page || 1,
          per_page: response.data.per_page || 12,
          total: response.data.total || 0,
          total_pages: response.data.total_pages || 0
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
      // Fallback to sample data for demo
      setProducts(getSampleProducts());
    } finally {
      setLoading(false);
    }
  };

  // Fetch available categories
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/products/categories/available`);
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback categories
      setCategories([
        { value: 'home_decor', label: 'Home Decor' },
        { value: 'personalized_gifts', label: 'Personalized Gifts' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'keepsakes', label: 'Keepsakes' },
        { value: 'special_occasions', label: 'Special Occasions' },
        { value: 'accessories', label: 'Accessories' }
      ]);
    }
  };

  // Sample products for fallback with beautiful images
  const getSampleProducts = () => [
    {
      id: '1',
      name: 'Elegant Crystal Vase',
      description: 'A beautiful handcrafted crystal vase perfect for displaying flowers or as a decorative piece.',
      price: 89.99,
      discount_price: 74.99,
      category: 'home_decor',
      categories: ['home_decor'],
      sku: 'VL-CV001',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1668463876833-339717e58c4c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxnaWZ0JTIwYXJ0aWNsZXN8ZW58MHx8fHwxNzU0OTk0MDI5fDA&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 25,
      features: ['Handcrafted', 'Lead Crystal', 'Gift Box Included', 'Care Instructions Provided'],
      specifications: {
        material: 'Crystal Glass',
        height: '12 inches',
        diameter: '6 inches',
        weight: '2.5 lbs'
      },
      rating: 4.8,
      review_count: 24,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      id: '2',
      name: 'Personalized Photo Frame',
      description: 'Custom engraved wooden photo frame with your personal message or name.',
      price: 34.99,
      discount_price: 27.99,
      category: 'personalized_gifts',
      categories: ['personalized_gifts', 'keepsakes'],
      sku: 'VL-PF002',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1464348123218-0ee63dfd2746?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxnaWZ0JTIwYXJ0aWNsZXN8ZW58MHx8fHwxNzU0OTk0MDI5fDA&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 50,
      features: ['Laser Engraving', 'Custom Text', 'Multiple Font Options', 'Protective Glass'],
      specifications: {
        material: 'Premium Oak Wood',
        size: '8x10 inches',
        frame_width: '2 inches',
        backing: 'MDF with easel stand'
      },
      rating: 4.9,
      review_count: 67,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    },
    {
      id: '3',
      name: 'Sterling Silver Necklace',
      description: 'Delicate sterling silver necklace with a beautiful pendant, perfect for everyday wear.',
      price: 125.00,
      discount_price: 99.99,
      category: 'jewelry',
      categories: ['jewelry', 'accessories'],
      sku: 'VL-SN003',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1616837874254-8d5aaa63e273?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwyfHxqZXdlbHJ5fGVufDB8fHx8MTc1NDk5NDA0MHww&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 15,
      features: ['Hypoallergenic', 'Tarnish Resistant', 'Gift Box Included', 'Certificate of Authenticity'],
      specifications: {
        material: '925 Sterling Silver',
        chain_length: '18 inches',
        pendant_size: '1 inch',
        clasp_type: 'Spring Ring'
      },
      rating: 4.7,
      review_count: 89,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago - NEW
    },
    {
      id: '4',
      name: 'Luxury Scented Candle Set',
      description: 'Set of 3 premium soy wax candles with exotic fragrances in elegant glass holders.',
      price: 55.00,
      discount_price: 45.00,
      category: 'home_decor',
      categories: ['home_decor', 'special_occasions'],
      sku: 'VL-CS004',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1513252446706-49071cffaedb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHw0fHxnaWZ0JTIwYXJ0aWNsZXN8ZW58MHx8fHwxNzU0OTk0MDI5fDA&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 30,
      features: ['Natural Soy Wax', 'Lead-Free Wicks', 'Reusable Containers', 'Gift Ready'],
      specifications: {
        material: '100% Soy Wax',
        burn_time: '45 hours each',
        fragrances: 'Vanilla, Lavender, Sandalwood',
        container: 'Glass with wooden lid'
      },
      rating: 4.6,
      review_count: 43,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    },
    {
      id: '5',
      name: 'Rose Gold Watch Gift Set',
      description: 'Elegant rose gold watch with matching bracelet set. Perfect for special occasions and everyday elegance.',
      price: 299.99,
      discount_price: 249.99,
      category: 'jewelry',
      categories: ['jewelry', 'accessories'],
      sku: 'RGW-008',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1612817159949-195b6eb9e31a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcHJvZHVjdHN8ZW58MHx8fHwxNzU0OTk0MDM0fDA&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 8,
      features: ['Rose gold plated', 'Water resistant', 'Matching bracelet', 'Luxury gift box'],
      specifications: {
        case_material: 'Rose Gold Plated Steel',
        water_resistance: '50 meters',
        movement: 'Quartz',
        warranty: '2 years'
      },
      rating: 4.9,
      review_count: 156,
      created_at: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago - NEW
    },
    {
      id: '6',
      name: 'Premium Beauty Collection',
      description: 'Luxurious skincare and beauty collection with golden accents, perfect for self-care enthusiasts.',
      price: 159.99,
      category: 'accessories',
      categories: ['accessories', 'special_occasions'],
      sku: 'PBC-009',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1740490278517-21ec451914f6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHxlbGVnYW50JTIwcHJvZHVjdHN8ZW58MHx8fHwxNzU0OTk0MDM0fDA&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 12,
      features: ['Premium ingredients', 'Elegant packaging', 'Travel-friendly', 'Complete set'],
      specifications: {
        set_includes: '5 beauty essentials',
        packaging: 'Gold-accented boxes',
        skin_type: 'All skin types',
        size: 'Full size products'
      },
      rating: 4.8,
      review_count: 92,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    },
    {
      id: '7',
      name: 'Diamond Bracelet Collection',
      description: 'Exquisite gold and diamond bracelet perfect for special occasions and celebrations.',
      price: 899.99,
      discount_price: 699.99,
      category: 'jewelry',
      categories: ['jewelry', 'luxury_items'],
      sku: 'DBC-010',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1637632668117-947db0a9c01e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHxlbGVnYW50JTIwcHJvZHVjdHN8ZW58MHx8fHwxNzU0OTk0MDM0fDA&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 5,
      features: ['Genuine diamonds', '18K gold', 'Certified quality', 'Luxury presentation'],
      specifications: {
        metal: '18K Gold',
        diamonds: 'Genuine certified',
        length: '7.5 inches',
        clasp: 'Secure lobster clasp'
      },
      rating: 5.0,
      review_count: 23,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
    },
    {
      id: '8',
      name: 'Artisan Jewelry Collection',
      description: 'Handcrafted silver jewelry collection featuring multiple elegant pieces for the discerning collector.',
      price: 189.99,
      discount_price: 149.99,
      category: 'jewelry',
      categories: ['jewelry', 'keepsakes'],
      sku: 'AJC-011',
      brand: 'Vallmark',
      images: ['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwzfHxqZXdlbHJ5fGVufDB8fHx8MTc1NDk5NDA0MHww&ixlib=rb-4.1.0&q=85'],
      is_in_stock: true,
      stock_quantity: 18,
      features: ['Handcrafted silver', 'Multiple pieces', 'Artisan design', 'Collector quality'],
      specifications: {
        material: '925 Sterling Silver',
        pieces_included: '3 jewelry items',
        finish: 'Polished silver',
        style: 'Contemporary artisan'
      },
      rating: 4.7,
      review_count: 34,
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) // 12 days ago
    }
  ];

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, selectedCategory, priceRange.min, priceRange.max]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handlePriceRangeChange = (field, value) => {
    setPriceRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Gift Articles Collection
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Discover our curated selection of exquisite gift articles for every special occasion and cherished relationship.
          </p>
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Premium Quality</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Fast Shipping</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>Gift Wrapping</span>
            </div>
          </div>
        </div>

        {/* Modern Filter Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Search with Icon */}
            <div className="relative lg:col-span-2">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search for the perfect gift..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white appearance-none cursor-pointer transition-all duration-200"
              >
                <option value="">✨ All Categories</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Price Range */}
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Min $"
                value={priceRange.min}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                className="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
              />
              <input
                type="number"
                placeholder="Max $"
                value={priceRange.max}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                className="w-full px-3 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
              />
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={clearFilters}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:from-gray-300 hover:to-gray-400 dark:hover:from-gray-500 dark:hover:to-gray-600 transition-all duration-200 font-medium transform hover:scale-105 active:scale-95"
              >
                🗑️ Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Featured Categories Carousel */}
        {categories.length > 0 && (
          <FeaturedCategoriesCarousel 
            categories={categories} 
            products={products}
            onCategorySelect={setSelectedCategory}
            selectedCategory={selectedCategory}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">!</span>
              </div>
              <p className="text-red-800 dark:text-red-300 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div id="products-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {products.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  isAuthenticated={isAuthenticated}
                  index={index}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center space-x-3 flex-wrap gap-3">
                <button
                  onClick={() => fetchProducts(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  ← Previous
                </button>
                
                {/* Page Numbers */}
                <div className="hidden sm:flex space-x-2">
                  {Array.from({ length: Math.min(pagination.total_pages, 7) }, (_, i) => {
                    let page;
                    if (pagination.total_pages <= 7) {
                      page = i + 1;
                    } else if (pagination.page <= 4) {
                      page = i + 1;
                    } else if (pagination.page >= pagination.total_pages - 3) {
                      page = pagination.total_pages - 6 + i;
                    } else {
                      page = pagination.page - 3 + i;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => fetchProducts(page)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg ${
                          page === pagination.page
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30'
                            : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                {/* Mobile page indicator */}
                <div className="sm:hidden px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                </div>
                
                <button
                  onClick={() => fetchProducts(Math.min(pagination.total_pages, pagination.page + 1))}
                  disabled={pagination.page === pagination.total_pages}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 hover:border-purple-300 dark:hover:border-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <ShoppingCart className="w-16 h-16 text-purple-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-sm">✨</span>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              No magical gifts found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Your search didn't find any treasures. Try adjusting your filters to discover amazing gifts!
            </p>
            <button
              onClick={clearFilters}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-purple-500/30"
            >
              🔍 Clear All Filters
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && products.length > 0 && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-8 h-8 border-4 border-purple-200 dark:border-purple-800 rounded-full animate-spin border-t-purple-600 dark:border-t-purple-400"></div>
                  <div className="absolute inset-0 w-8 h-8 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Updating magical collection...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, isAuthenticated }) => {
  const { addToCart } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      const result = await addToCart(product.id, 1);
      if (result.success) {
        // Show success feedback - you could add a toast notification here
        console.log('Product added to cart successfully');
      } else {
        console.error('Failed to add to cart:', result.error);
        alert('Failed to add product to cart. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Check if product is new (within last 7 days)
  const isNewProduct = () => {
    if (!product.created_at) return false;
    const createdDate = new Date(product.created_at);
    const currentDate = new Date();
    const daysDifference = (currentDate - createdDate) / (1000 * 60 * 60 * 24);
    return daysDifference <= 7;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
      isNewProduct() ? 'relative' : ''
    }`}>
      {/* Animated Golden Border for New Products */}
      {isNewProduct() && (
        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-lg border-4 border-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400 animate-pulse"></div>
          <div className="absolute inset-1 rounded-lg bg-white dark:bg-gray-800"></div>
          {/* Rotating Golden Border Animation */}
          <div className="absolute inset-0 rounded-lg">
            <div className="absolute inset-0 rounded-lg border-4 border-transparent bg-gradient-conic from-yellow-400 via-orange-500 via-yellow-300 to-yellow-400 animate-spin-slow opacity-75"></div>
            <div className="absolute inset-1 rounded-lg bg-white dark:bg-gray-800"></div>
          </div>
        </div>
      )}
      
      {/* Product Image */}
      <div className="relative z-10">
        <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0].startsWith('data:') ? product.images[0] : `data:image/jpeg;base64,${product.images[0]}`}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-2xl font-bold text-white">
                  {product.name.charAt(0)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">No Image</p>
            </div>
          )}
        </div>
        
        {/* Stock Status & New Badge */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
          {/* New Badge */}
          {isNewProduct() && (
            <span className="px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg animate-bounce">
              ✨ NEW
            </span>
          )}
          
          {/* Stock Status */}
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            product.is_in_stock
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {product.is_in_stock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-4 relative z-10">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {product.name}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Features */}
        {product.features && Array.isArray(product.features) && product.features.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 line-clamp-1">
            {product.features.join(', ')}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            {product.discount_price ? (
              <>
                <span className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatPrice(product.discount_price)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          {product.stock_quantity && (
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {product.stock_quantity} left
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Link
            to={`/products/${product.id}`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2.5 sm:py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 font-medium"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm sm:text-base">View Details</span>
          </Link>
          
          {product.is_in_stock && (
            <button 
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={`${isAddingToCart 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'} 
              text-white p-2.5 sm:p-2 rounded-lg transition-colors duration-200 flex-shrink-0 flex items-center justify-center`}
              title="Add to Cart"
            >
              {isAddingToCart ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Featured Categories Carousel Component
const FeaturedCategoriesCarousel = ({ categories, products, onCategorySelect, selectedCategory }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Group products by category
  const productsByCategory = categories.reduce((acc, category) => {
    const categoryProducts = products.filter(product => product.category === category.value);
    if (categoryProducts.length > 0) {
      acc[category.value] = {
        ...category,
        products: categoryProducts.slice(0, 4) // Show max 4 products per category
      };
    }
    return acc;
  }, {});

  const categorySlides = Object.values(productsByCategory);

  useEffect(() => {
    if (categorySlides.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % categorySlides.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [categorySlides.length]);

  if (categorySlides.length === 0) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handleCategoryClick = (categoryValue) => {
    onCategorySelect(categoryValue);
    // Scroll to products section
    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-xl shadow-lg p-4 lg:p-8 mb-8 overflow-hidden">
      <div className="text-center mb-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Featured Collections
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Discover our handpicked selections across different categories
        </p>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mt-3"></div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {categorySlides.map((categoryData, slideIndex) => (
            <div key={categoryData.value} className="w-full flex-shrink-0">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-4 lg:p-6 shadow-md">
                {/* Category Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {categoryData.label}
                  </h3>
                  <button
                    onClick={() => handleCategoryClick(categoryData.value)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    <span className="text-sm font-medium">View All</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categoryData.products.map((product) => (
                    <div
                      key={product.id}
                      className="group bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 relative">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].startsWith('data:') ? product.images[0] : `data:image/jpeg;base64,${product.images[0]}`}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {product.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                      </div>

                      {/* Product Info */}
                      <div className="p-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                          {product.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {formatPrice(product.discount_price || product.price)}
                          </span>
                          {product.discount_price && (
                            <span className="text-xs text-gray-500 line-through">
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Dots */}
        {categorySlides.length > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            {categorySlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentSlide
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 w-8'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        )}

        {/* Navigation Arrows */}
        {categorySlides.length > 1 && (
          <>
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + categorySlides.length) % categorySlides.length)}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % categorySlides.length)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors group"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;