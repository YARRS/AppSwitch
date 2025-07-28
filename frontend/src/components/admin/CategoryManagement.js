import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, Search, Edit, Trash2, Eye, Package, 
  AlertTriangle, Save, X, FileImage, Tag, Grid
} from 'lucide-react';

const CategoryManagement = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCategories();
  }, [currentPage, searchTerm]);

  const fetchCategories = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const params = {
        page: currentPage,
        per_page: 20,
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await axios.get('/api/categories/', { params });
      setCategories(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const axios = getAuthenticatedAxios();
      await axios.delete(`/api/categories/${categoryId}`);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.detail || 'Cannot delete category with products');
      } else {
        alert('Failed to delete category');
      }
    }
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Category Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage product categories and organize your catalog
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3">
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
      )}

      {/* Create Category Modal */}
      {showCreateModal && (
        <CategoryModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={fetchCategories}
        />
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <CategoryModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={fetchCategories}
          category={selectedCategory}
        />
      )}
    </div>
  );
};

// Category Card Component
const CategoryCard = ({ category, onEdit, onDelete }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Category Image */}
      <div className="relative">
        <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
          {category.image ? (
            <img
              src={`data:image/jpeg;base64,${category.image}`}
              alt={category.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <Grid className="w-12 h-12 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No Image</p>
            </div>
          )}
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            category.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {category.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Category Info */}
      <div className="p-4">
        <div className="flex items-center mb-2">
          <Tag className="w-4 h-4 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
            {category.name}
          </h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">
          {category.description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Package className="w-4 h-4 mr-1" />
            <span>{category.product_count} products</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            #{category.sort_order}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(category)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Edit</span>
          </button>
          
          <button
            onClick={() => onDelete(category.id)}
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors duration-200"
            disabled={category.product_count > 0}
            title={category.product_count > 0 ? "Cannot delete category with products" : "Delete category"}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Category Modal Component
const CategoryModal = ({ isOpen, onClose, onSave, category = null }) => {
  const { getAuthenticatedAxios } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    image: '',
    is_active: true,
    sort_order: '0'
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        slug: category.slug || '',
        image: category.image || '',
        is_active: category.is_active ?? true,
        sort_order: category.sort_order?.toString() || '0'
      });
    }
  }, [category]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name' && !category) {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '_')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    
    try {
      const axios = getAuthenticatedAxios();
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await axios.post('/api/uploads/image', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          image: response.data.data.base64_data
        }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, [getAuthenticatedAxios]);

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const axios = getAuthenticatedAxios();
      const cleanedFormData = {
        ...formData,
        sort_order: parseInt(formData.sort_order)
      };

      if (category) {
        await axios.put(`/api/categories/${category.id}`, cleanedFormData);
      } else {
        await axios.post('/api/categories/', cleanedFormData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save category:', error);
      if (error.response?.status === 400) {
        alert(error.response.data.detail || 'Category with this slug already exists');
      } else {
        alert('Failed to save category');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {category ? 'Edit Category' : 'Create Category'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Name *
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
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                className="input-field"
                required
              />
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', e.target.value)}
                className="input-field"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Image
              </label>
              
              {!formData.image ? (
                <label className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileImage className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={`data:image/jpeg;base64,${formData.image}`}
                    alt="Category"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {uploadingImage && (
                <div className="text-center py-2">
                  <div className="inline-flex items-center text-blue-500">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                </div>
              )}
            </div>

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
                Active Category
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
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
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>{category ? 'Update' : 'Create'} Category</span>
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

export default CategoryManagement;