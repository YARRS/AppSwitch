import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, Search, Filter, Edit, Trash2, Eye, Package, 
  AlertTriangle, Star, TrendingUp, Image, Save, X, Upload, Video, FileImage
} from 'lucide-react';

const ProductManagement = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, searchTerm, categoryFilter]);

  const fetchProducts = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const params = {
        page: currentPage,
        per_page: 20,
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter })
      };
      
      const response = await axios.get('/api/products/', { params });
      setProducts(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get('/api/products/categories/available');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const axios = getAuthenticatedAxios();
      await axios.delete(`/api/products/${productId}`);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your product catalog, inventory, and pricing
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Product Table - Desktop */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
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

      {/* Product Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
          />
        ))}
        
        {/* Mobile Pagination */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn-secondary disabled:opacity-50 text-sm px-3 py-2"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary disabled:opacity-50 text-sm px-3 py-2"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Product Modal */}
      {showCreateModal && (
        <ProductModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={fetchProducts}
          categories={categories}
        />
      )}

      {/* Edit Product Modal */}
      {showEditModal && selectedProduct && (
        <ProductModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={fetchProducts}
          product={selectedProduct}
          categories={categories}
        />
      )}
    </div>
  );
};

// Product Row Component
const ProductRow = ({ product, onEdit, onDelete }) => {
  const isLowStock = product.stock_quantity <= product.min_stock_level;

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-4">
            {product.images && product.images.length > 0 ? (
              <img
                src={`data:image/jpeg;base64,${product.images[0]}`}
                alt={product.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <Package className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {product.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              SKU: {product.sku}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <span className="capitalize">
          {product.category.replace('_', ' ')}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <div className="flex flex-col">
          <span className="font-medium">₹{product.price.toLocaleString()}</span>
          {product.discount_price && (
            <span className="text-xs text-gray-500 line-through">
              ₹{product.discount_price.toLocaleString()}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <div className="flex items-center space-x-2">
          <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {product.stock_quantity}
          </span>
          {isLowStock && (
            <AlertTriangle className="w-4 h-4 text-red-500" title="Low Stock" />
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          product.is_active
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {product.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(product)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Product Card Component for Mobile
const ProductCard = ({ product, onEdit, onDelete }) => {
  const isLowStock = product.stock_quantity <= product.min_stock_level;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      {/* Product Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            {product.images && product.images.length > 0 ? (
              <img
                src={`data:image/jpeg;base64,${product.images[0]}`}
                alt={product.name}
                className="w-12 h-12 object-cover rounded-lg"
              />
            ) : (
              <Package className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
              {product.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              SKU: {product.sku}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(product)}
            className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Info Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Category</p>
          <p className="text-gray-900 dark:text-white font-medium capitalize">
            {product.category.replace('_', ' ')}
          </p>
        </div>
        
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Price</p>
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-white font-medium">₹{product.price.toLocaleString()}</span>
            {product.discount_price && (
              <span className="text-xs text-gray-500 line-through">
                ₹{product.discount_price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Stock</p>
          <div className="flex items-center space-x-2">
            <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {product.stock_quantity}
            </span>
            {isLowStock && (
              <AlertTriangle className="w-4 h-4 text-red-500" title="Low Stock" />
            )}
          </div>
        </div>
        
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Status</p>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            product.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {product.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ isOpen, onClose, onSave, product = null, categories }) => {
  const { getAuthenticatedAxios } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    discount_price: '',
    sku: '',
    brand: 'SmartSwitch',
    stock_quantity: '',
    min_stock_level: '5',
    is_active: true,
    features: [''],
    specifications: {},
    images: [],
    videos: []
  });
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || '',
        price: product.price?.toString() || '',
        discount_price: product.discount_price?.toString() || '',
        sku: product.sku || '',
        brand: product.brand || 'SmartSwitch',
        stock_quantity: product.stock_quantity?.toString() || '',
        min_stock_level: product.min_stock_level?.toString() || '5',
        is_active: product.is_active ?? true,
        features: product.features?.length > 0 ? product.features : [''],
        specifications: product.specifications || {},
        images: product.images || [],
        videos: product.videos || []
      });
    }
  }, [product]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  // File upload handlers
  const handleFileUpload = useCallback(async (files, type) => {
    if (!files || files.length === 0) return;
    
    setUploadingFiles(true);
    
    try {
      const axios = getAuthenticatedAxios();
      const formDataUpload = new FormData();
      
      // Add files to FormData
      Array.from(files).forEach(file => {
        formDataUpload.append('files', file);
      });

      const endpoint = type === 'images' ? '/api/uploads/images' : '/api/uploads/videos';
      const response = await axios.post(endpoint, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const uploadedFiles = response.data.data.uploaded_files || [];
        const base64Files = uploadedFiles.map(file => file.base64_data);
        
        setFormData(prev => ({
          ...prev,
          [type]: [...(prev[type] || []), ...base64Files]
        }));
        
        // Show success message
        if (response.data.data.errors?.length > 0) {
          alert(`Uploaded ${uploadedFiles.length} ${type} successfully. ${response.data.data.errors.length} files failed.`);
        }
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      alert(`Failed to upload ${type}. Please try again.`);
    } finally {
      setUploadingFiles(false);
    }
  }, [getAuthenticatedAxios]);

  const handleImageUpload = useCallback((e) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files, 'images');
    }
  }, [handleFileUpload]);

  const handleVideoUpload = useCallback((e) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files, 'videos');
    }
  }, [handleFileUpload]);

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const removeVideo = (index) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const axios = getAuthenticatedAxios();
      const cleanedFormData = {
        ...formData,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : undefined,
        stock_quantity: parseInt(formData.stock_quantity),
        min_stock_level: parseInt(formData.min_stock_level),
        features: formData.features.filter(f => f.trim() !== '')
      };

      if (product) {
        await axios.put(`/api/products/${product.id}`, cleanedFormData);
      } else {
        await axios.post('/api/products/', cleanedFormData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
              {product ? 'Edit Product' : 'Create Product'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount_price}
                  onChange={(e) => handleInputChange('discount_price', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Inventory */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Stock Level *
                </label>
                <input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Features
              </label>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    className="input-field flex-1"
                    placeholder="Enter feature"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Feature
              </button>
            </div>

            {/* Images Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Images
              </label>
              
              {/* Upload Button */}
              <div className="mb-4">
                <label className="flex items-center justify-center w-full h-24 lg:h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3 lg:pt-5 lg:pb-6">
                    <FileImage className="w-6 h-6 lg:w-8 lg:h-8 mb-2 lg:mb-4 text-gray-500 dark:text-gray-400" />
                    <p className="mb-1 lg:mb-2 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload images</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG, GIF up to 5MB (Max 10 files)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingFiles}
                  />
                </label>
              </div>

              {/* Image Previews */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-4 mb-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`data:image/jpeg;base64,${image}`}
                        alt={`Product ${index + 1}`}
                        className="w-full h-16 lg:h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Videos
              </label>
              
              {/* Upload Button */}
              <div className="mb-4">
                <label className="flex items-center justify-center w-full h-24 lg:h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3 lg:pt-5 lg:pb-6">
                    <Video className="w-6 h-6 lg:w-8 lg:h-8 mb-2 lg:mb-4 text-gray-500 dark:text-gray-400" />
                    <p className="mb-1 lg:mb-2 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload videos</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      MP4, AVI, MOV up to 50MB (Max 5 files)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploadingFiles}
                  />
                </label>
              </div>

              {/* Video Previews */}
              {formData.videos.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {formData.videos.map((video, index) => (
                    <div key={index} className="relative group">
                      <video
                        controls
                        className="w-full h-24 lg:h-32 object-cover rounded-lg bg-gray-100 dark:bg-gray-600"
                      >
                        <source src={`data:video/mp4;base64,${video}`} type="video/mp4" />
                        Your browser does not support video playback.
                      </video>
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadingFiles && (
              <div className="text-center py-4">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100 dark:bg-blue-900 dark:text-blue-300">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading files...
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                Active Product
              </label>
            </div>
          </form>
        </div>

        {/* Submit Buttons - Sticky Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 lg:p-6 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>{product ? 'Update' : 'Create'} Product</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;