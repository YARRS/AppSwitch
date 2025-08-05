import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, ShoppingCart, Eye, Star } from 'lucide-react';
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

  // Sample products for fallback
  const getSampleProducts = () => [
    {
      id: '1',
      name: 'Elegant Crystal Vase',
      description: 'Beautiful hand-crafted crystal vase perfect for any home decor',
      price: 89.99,
      category: 'home_decor',
      images: [],
      is_in_stock: true,
      stock_quantity: 15,
      features: 'Hand-crafted crystal, elegant design, perfect for flowers'
    },
    {
      id: '2',
      name: 'Personalized Photo Frame',
      description: 'Custom engraved wooden photo frame for cherished memories',
      price: 34.99,
      category: 'personalized_gifts',
      images: [],
      is_in_stock: true,
      stock_quantity: 25,
      features: 'Custom engraving, premium wood, multiple sizes available'
    },
    {
      id: '3',
      name: 'Sterling Silver Pendant',
      description: 'Exquisite sterling silver pendant with intricate design',
      price: 124.99,
      category: 'jewelry',
      images: [],
      is_in_stock: true,
      stock_quantity: 8,
      features: 'Sterling silver, hypoallergenic, comes with gift box'
    },
    {
      id: '4',
      name: 'Memory Box Set',
      description: 'Beautiful keepsake box set for storing precious memories',
      price: 59.99,
      category: 'keepsakes',
      images: [],
      is_in_stock: true,
      stock_quantity: 20,
      features: 'Multiple compartments, velvet lining, lock and key included'
    },
    {
      id: '5',
      name: 'Anniversary Wine Glasses',
      description: 'Elegant pair of wine glasses perfect for celebrating love',
      price: 45.99,
      category: 'special_occasions',
      images: [],
      is_in_stock: true,
      stock_quantity: 30,
      features: 'Premium crystal, dishwasher safe, comes in gift packaging'
    },
    {
      id: '6',
      name: 'Luxury Scented Candle Set',
      description: 'Premium scented candle collection for relaxation and ambiance',
      price: 67.99,
      category: 'accessories',
      images: [],
      is_in_stock: true,
      stock_quantity: 18,
      features: 'Natural soy wax, long burning time, beautiful packaging'
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Gift Articles Collection
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Discover our curated selection of exquisite gift articles for every special occasion and cherished relationship.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 lg:p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="flex space-x-2">
            <input
              type="number"
              placeholder="Min $"
              value={priceRange.min}
              onChange={(e) => handlePriceRangeChange('min', e.target.value)}
              className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <input
              type="number"
              placeholder="Max $"
              value={priceRange.max}
              onChange={(e) => handlePriceRangeChange('max', e.target.value)}
              className="w-full px-3 py-3 lg:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Clear Filters */}
          <div>
            <button
              onClick={clearFilters}
              className="w-full px-4 py-3 lg:py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} isAuthenticated={isAuthenticated} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex justify-center items-center space-x-2 flex-wrap gap-2">
              <button
                onClick={() => fetchProducts(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page Numbers - Show limited on mobile */}
              <div className="hidden sm:flex space-x-1">
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
                      className={`px-3 py-2 rounded-lg ${
                        page === pagination.page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              {/* Mobile page indicator */}
              <div className="sm:hidden px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
              </div>
              
              <button
                onClick={() => fetchProducts(Math.min(pagination.total_pages, pagination.page + 1))}
                disabled={pagination.page === pagination.total_pages}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <ShoppingCart className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No products found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search criteria or filters.
          </p>
          <button
            onClick={clearFilters}
            className="btn-primary"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {loading && products.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400">Updating products...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, isAuthenticated }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
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
          
          {isAuthenticated && product.is_in_stock && (
            <button className="bg-green-600 hover:bg-green-700 text-white p-2.5 sm:p-2 rounded-lg transition-colors duration-200 flex-shrink-0">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;