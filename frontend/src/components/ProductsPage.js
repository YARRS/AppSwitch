import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Search, Filter, ShoppingCart, Eye, Star, Heart, Sparkles, Zap, TrendingUp, Loader } from 'lucide-react';
import axios from 'axios';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [categories, setCategories] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  // Refs for infinite scroll
  const observer = useRef();
  const lastProductElementRef = useRef();

  const { isAuthenticated, getAuthenticatedAxios } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Get products per page based on screen size
  const getProductsPerPage = () => {
    // Mobile: 4 products per row, Desktop: 12 products per page
    if (window.innerWidth < 640) {
      return 8; // 2 rows of 4 products on mobile
    } else if (window.innerWidth < 1024) {
      return 12; // 4 rows of 3 products on tablet
    } else {
      return 12; // 3 rows of 4 products on desktop
    }
  };
  // Fetch products from API with infinite scroll support
  const fetchProducts = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const per_page = getProductsPerPage();
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: per_page.toString(),
        is_active: 'true' // Only show active products
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (priceRange.min) params.append('min_price', priceRange.min);
      if (priceRange.max) params.append('max_price', priceRange.max);
      const response = await axios.get(`${API_BASE_URL}/api/products/?${params}`);
      if (response.data.success) {
        const newProducts = response.data.data || [];
        const total = response.data.total || 0;
        const totalPages = response.data.total_pages || 0;        
        if (append && page > 1) {
          // Append to existing products for infinite scroll
          setProducts(prevProducts => [...prevProducts, ...newProducts]);
        } else {
          // Replace products for first load or filter change
          setProducts(newProducts);
        }
        setTotalProducts(total);
        setHasMore(page < totalPages);
        setCurrentPage(page);
      } else {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
      // Fallback to sample data for demo only on first page
      if (page === 1) {
        setProducts(getSampleProducts());
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
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

  // Infinite scroll callback function
  const lastProductElementCallback = useCallback((node) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setCurrentPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);
  // Reset products when filters change
  const resetProducts = () => {
    setProducts([]);
    setCurrentPage(1);
    setHasMore(true);
    setError(null);
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
  // useEffect for infinite scroll - fetch more products when currentPage changes
  useEffect(() => {
    if (currentPage > 1) {
      fetchProducts(currentPage, true);
    }
  }, [currentPage]);

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
      currency: 'INR'
    }).format(price);
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
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
            <div id="products-grid" className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-12">
              {products.map((product, index) => {
                // Add ref to last product for infinite scroll detection
                const isLast = index === products.length - 1;
                return (
                  <ProductCard 
                    key={`${product.id}-${index}`} 
                    product={product} 
                    isAuthenticated={isAuthenticated}
                    index={index}
                    ref={isLast ? lastProductElementCallback : null}
                  />
                );
              })}
            </div>

            {/* Loading More Indicator */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20 dark:border-gray-700/20">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-8 h-8 border-4 border-purple-200 dark:border-purple-800 rounded-full animate-spin border-t-purple-600 dark:border-t-purple-400"></div>
                      <div className="absolute inset-0 w-8 h-8 border-4 border-transparent rounded-full animate-ping border-t-purple-400"></div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Loading more products...</p>
                  </div>
                </div>
              </div>
            )}

            {/* End of Results Indicator */}
            {!hasMore && products.length > 0 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 text-green-800 dark:text-green-300 rounded-full border border-green-200 dark:border-green-800 shadow-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">You've seen all {totalProducts} products! 🎉</span>
                </div>
                
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

// Modern Product Card Component with Advanced Animations and Infinite Scroll Support
const ProductCard = React.forwardRef(({ product, isAuthenticated, index }, ref) => {
  const { addToCart } = useCart();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      const result = await addToCart(product.id, 1);
      if (result.success) {
        // Show success feedback
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

  const toggleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    // Here you could add actual wishlist functionality
  };

  // Check if product is new (within last 7 days)
  const isNewProduct = () => {
    if (!product.created_at) return false;
    const createdDate = new Date(product.created_at);
    const currentDate = new Date();
    const daysDifference = (currentDate - createdDate) / (1000 * 60 * 60 * 24);
    return daysDifference <= 7;
  };

  // Calculate discount percentage
  const getDiscountPercentage = () => {
    if (!product.discount_price || !product.price) return 0;
    return Math.round(((product.price - product.discount_price) / product.price) * 100);
  };

  const discountPercent = getDiscountPercentage();

  return (
    <div 
      ref={ref}
      className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-white/20 dark:border-gray-700/20 transform hover:-translate-y-2 hover:scale-[1.02]"
      style={{
        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
      }}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* New Product Golden Border Animation */}
      {isNewProduct() && (
        <>
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 rounded-2xl border-4 border-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400 animate-pulse"></div>
            <div className="absolute inset-1 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg"></div>
          </div>
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-75">
            <div className="absolute inset-0 rounded-2xl border-4 border-transparent bg-gradient-conic from-yellow-400 via-orange-500 via-yellow-300 to-yellow-400 animate-spin-slow opacity-50"></div>
            <div className="absolute inset-1 rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg"></div>
          </div>
        </>
      )}
      
      {/* Product Image Container */}
      <div className="relative z-10 aspect-square overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
          {product.images && product.images.length > 0 ? (
            <>
              <img
                src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0].startsWith('http') ? product.images[0] : `data:image/jpeg;base64,${product.images[0]}`}
                alt={product.name}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  console.warn(`Failed to load image for product: ${product.name}`);
                  setImageLoaded(true);
                  e.target.style.display = 'none';
                }}
                loading="lazy"
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-800 rounded-full animate-spin border-t-purple-600 dark:border-t-purple-400"></div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">
                  {product.name.charAt(0)}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Badges Container */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
          <div className="flex flex-col gap-2">
            {/* New Badge */}
            {isNewProduct() && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg animate-bounce flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>NEW</span>
              </span>
            )}
            
            {/* Discount Badge */}
            {discountPercent > 0 && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg">
                -{discountPercent}%
              </span>
            )}
          </div>
          
          {/* Wishlist Button */}
          <button
            onClick={toggleWishlist}
            className={`w-10 h-10 rounded-full backdrop-blur-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg ${
              isWishlisted 
                ? 'bg-red-500/80 text-white' 
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Stock Status */}
        <div className="absolute bottom-3 right-3 z-20">
          <span className={`px-3 py-1 text-xs font-medium rounded-full backdrop-blur-lg shadow-lg ${
            product.is_in_stock
              ? 'bg-green-500/80 text-white'
              : 'bg-red-500/80 text-white'
          }`}>
            {product.is_in_stock ? '✓ In Stock' : '✗ Out of Stock'}
          </span>
        </div>

        {/* Quick Actions Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-15">
          <div className="flex space-x-3">
            <Link
              to={`/products/${product.id}`}
              className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 active:scale-95 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="Quick View"
            >
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </Link>
            
            {product.is_in_stock && (
              <button 
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 active:scale-95 transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add to Cart"
              >
                {isAddingToCart ? (
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="relative z-10 p-5">
        {/* Rating */}
        {product.rating && product.review_count && (
          <div className="flex items-center space-x-1 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-300 dark:text-gray-600'
                  }`} 
                />
              ))}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {product.rating} ({product.review_count})
            </span>
          </div>
        )}

        {/* Product Name */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
          {product.name}
        </h3>
        
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Features */}
        {product.features && Array.isArray(product.features) && product.features.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {product.features.slice(0, 2).map((feature, index) => (
              <span 
                key={index}
                className="px-2 py-1 text-xs bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800"
              >
                {feature}
              </span>
            ))}
            {product.features.length > 2 && (
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                +{product.features.length - 2} more
              </span>
            )}
          </div>
        )}

        {/* Price Section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            {product.discount_price ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                    {formatPrice(product.discount_price)}
                  </span>
                  <span className="px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full">
                    SAVE {discountPercent}%
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          
          {product.stock_quantity && (
            <div className="text-right">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {product.stock_quantity} left
              </span>
              {product.stock_quantity <= 5 && (
                <div className="flex items-center space-x-1 text-orange-500">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-medium">Low Stock!</span>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Action Buttons - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Link
            to={`/products/${product.id}`}
            
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-center py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 font-medium shadow-lg hover:shadow-blue-500/30 transform hover:scale-105 active:scale-95 text-sm sm:text-base"   
            >
            <Eye className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">View Details</span>
            <span className="xs:hidden sm:hidden">View</span>
          </Link>
          
          {product.is_in_stock && (
            <button 
              onClick={handleAddToCart}
              disabled={isAddingToCart}

              className={`flex-1 sm:flex-none py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 font-medium shadow-lg transform hover:scale-105 active:scale-95 text-sm sm:text-base ${
                isAddingToCart 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white hover:shadow-green-500/30'
              }`}
              title="Add to Cart"
            >
              {isAddingToCart ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden xs:inline sm:inline">Add to Cart</span>
                  <span className="xs:hidden sm:hidden">Add</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Trending Indicator */}
        {product.review_count > 50 && (
          <div className="flex items-center justify-center mt-3 text-orange-500">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span className="text-xs font-medium">Trending</span>
          </div>
        )}
      </div>

      {/* Shimmer Effect on Hover */}
      <div className="absolute inset-0 -top-2 -left-2 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500 pointer-events-none"></div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

// Enhanced Featured Categories Carousel Component
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
      currency: 'INR'
    }).format(price);
  };

  const handleCategoryClick = (categoryValue) => {
    onCategorySelect(categoryValue);
    // Scroll to products section
    document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative bg-gradient-to-br from-purple-900/10 via-pink-900/10 to-blue-900/10 dark:from-purple-800/20 dark:via-pink-800/20 dark:to-blue-800/20 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8 mb-12 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4 shadow-lg">
          <Sparkles className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-3">
          Featured Collections
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
          Discover our handpicked selections across different categories
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full mx-auto mt-4"></div>
      </div>

      {/* Carousel Container */}
      <div className="relative z-10">
        <div 
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {categorySlides.map((categoryData, slideIndex) => (
            <div key={categoryData.value} className="w-full flex-shrink-0">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 lg:p-8 shadow-xl border border-white/20 dark:border-gray-700/20">
                {/* Category Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {categoryData.label}
                  </h3>
                  <button
                    onClick={() => handleCategoryClick(categoryData.value)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/30 font-medium"
                  >
                    <span>View All {categoryData.label}</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categoryData.products.map((product, index) => (
                    <div
                      key={product.id}
                      className="group bg-white/90 dark:bg-gray-700/90 backdrop-blur-lg rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/30 dark:border-gray-600/30"
                      style={{
                        animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                      }}
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 relative overflow-hidden">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0].startsWith('data:') ? product.images[0] : product.images[0].startsWith('http') ? product.images[0] : `data:image/jpeg;base64,${product.images[0]}`}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {product.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Quick View Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Link
                            to={`/products/${product.id}`}
                            className="w-10 h-10 bg-white/90 backdrop-blur-lg rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-200"
                          >
                            <Eye className="w-5 h-5 text-purple-600" />
                          </Link>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-2 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {product.description}
                        </p>
                        
                        {/* Price */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            {product.discount_price ? (
                              <>
                                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                                  {formatPrice(product.discount_price)}
                                </span>
                                <span className="text-xs text-gray-500 line-through">
                                  {formatPrice(product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                          
                          {/* Rating */}
                          {product.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {product.rating}
                              </span>
                            </div>
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
          <div className="flex justify-center mt-8 space-x-3">
            {categorySlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-8 shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 w-3'
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
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-xl flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 group border border-white/30 dark:border-gray-600/30"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % categorySlides.length)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-xl flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 group border border-white/30 dark:border-gray-600/30"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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