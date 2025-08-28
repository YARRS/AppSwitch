import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
    MapPin, Plus, Edit, Trash2, Home, Building, Heart, 
    AlertCircle, CheckCircle, Phone, Mail, User, X,
    Star, StarOff
} from 'lucide-react';
import axios from 'axios';

// Modal Component using Portal
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
            style={{ zIndex: 10000 }}
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};

const AddressManagement = () => {
    const { getAuthenticatedAxios } = useAuth();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [formData, setFormData] = useState({
        tag_name: '',
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'India',
        is_default: false
    });

    // Fetch addresses on component mount
    useEffect(() => {
        fetchAddresses();
    }, []);

    const fetchAddresses = async () => {
        try {
            setLoading(true);
            const axios = getAuthenticatedAxios();
            const response = await axios.get('/api/addresses/');
            
            if (response.data.success) {
                setAddresses(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
            setMessage({ 
                type: 'error', 
                text: 'Failed to load addresses. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            tag_name: '',
            full_name: '',
            phone: '',
            address_line1: '',
            address_line2: '',
            city: '',
            state: '',
            zip_code: '',
            country: 'India',
            is_default: false
        });
        setEditingAddress(null);
        setShowForm(false);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setLoading(true);
            const axios = getAuthenticatedAxios();
            
            let response;
            if (editingAddress) {
                // Update existing address
                response = await axios.put(`/api/addresses/${editingAddress.id}`, formData);
            } else {
                // Create new address
                response = await axios.post('/api/addresses/', formData);
            }
            
            if (response.data.success) {
                setMessage({ 
                    type: 'success', 
                    text: editingAddress ? 'Address updated successfully!' : 'Address added successfully!' 
                });
                resetForm();
                await fetchAddresses(); // Refresh addresses list
            } else {
                throw new Error(response.data.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Failed to save address:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to save address';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (address) => {
        setFormData({
            tag_name: address.tag_name,
            full_name: address.full_name,
            phone: address.phone,
            address_line1: address.address_line1,
            address_line2: address.address_line2 || '',
            city: address.city,
            state: address.state,
            zip_code: address.zip_code,
            country: address.country,
            is_default: address.is_default
        });
        setEditingAddress(address);
        setShowForm(true);
    };

    const handleDelete = async (addressId) => {
        if (!window.confirm('Are you sure you want to delete this address?')) {
            return;
        }

        try {
            setLoading(true);
            const axios = getAuthenticatedAxios();
            const response = await axios.delete(`/api/addresses/${addressId}`);
            
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Address deleted successfully!' });
                await fetchAddresses(); // Refresh addresses list
            } else {
                throw new Error(response.data.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Failed to delete address:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete address';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefault = async (addressId) => {
        try {
            setLoading(true);
            const axios = getAuthenticatedAxios();
            const response = await axios.post(`/api/addresses/${addressId}/set-default`);
            
            if (response.data.success) {
                setMessage({ type: 'success', text: 'Default address updated successfully!' });
                await fetchAddresses(); // Refresh addresses list
            } else {
                throw new Error(response.data.message || 'Set default failed');
            }
        } catch (error) {
            console.error('Failed to set default address:', error);
            const errorMessage = error.response?.data?.detail || error.message || 'Failed to set default address';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const getAddressIcon = (tagName) => {
        const tag = tagName.toLowerCase();
        if (tag.includes('home') || tag.includes('house')) return <Home className="w-5 h-5" />;
        if (tag.includes('office') || tag.includes('work')) return <Building className="w-5 h-5" />;
        return <MapPin className="w-5 h-5" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Addresses</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage your delivery addresses for faster checkout
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add New Address</span>
                </button>
            </div>

            {/* Message Display */}
            {message.text && (
                <div className={`rounded-xl p-4 flex items-center space-x-3 ${
                    message.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
                        : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span>{message.text}</span>
                    <button 
                        onClick={() => setMessage({ type: '', text: '' })}
                        className="ml-auto text-current hover:opacity-70"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Address Form Modal using Portal */}
            <Modal isOpen={showForm} onClose={resetForm}>
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {editingAddress ? 'Edit Address' : 'Add New Address'}
                    </h3>
                    <button
                        onClick={resetForm}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Tag Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Address Label *
                                </label>
                                <input
                                    type="text"
                                    name="tag_name"
                                    value={formData.tag_name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g., Home, Office, Mom's Place"
                                    required
                                />
                            </div>

                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter phone number"
                                required
                            />
                        </div>

                        {/* Address Lines */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Line 1 *
                            </label>
                            <input
                                type="text"
                                name="address_line1"
                                value={formData.address_line1}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Street address, apartment, suite, etc."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Line 2
                            </label>
                            <input
                                type="text"
                                name="address_line2"
                                value={formData.address_line2}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Additional address information (optional)"
                            />
                        </div>

                        {/* City, State, ZIP */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="City"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    State *
                                </label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="State"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    ZIP Code *
                                </label>
                                <input
                                    type="text"
                                    name="zip_code"
                                    value={formData.zip_code}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                    placeholder="ZIP Code"
                                    required
                                />
                            </div>
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Country *
                            </label>
                            <select
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                required
                            >
                                <option value="India">India</option>
                                <option value="USA">USA</option>
                                <option value="UK">UK</option>
                                <option value="Canada">Canada</option>
                                <option value="Australia">Australia</option>
                            </select>
                        </div>

                        {/* Default Address Checkbox */}
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                name="is_default"
                                id="is_default"
                                checked={formData.is_default}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label htmlFor="is_default" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Set as default address
                            </label>
                        </div>
                    </form>
                </div>

                {/* Modal Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Saving...' : (editingAddress ? 'Update Address' : 'Add Address')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Addresses List */}
            <div className="space-y-4">
                {loading && addresses.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading addresses...</p>
                    </div>
                ) : addresses.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No addresses found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Add your first address to enable faster checkout
                        </p>
                        <button
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Add Your First Address</span>
                        </button>
                    </div>
                ) : (
                    addresses.map((address) => (
                        <div key={address.id} className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 transition-all duration-200 ${
                            address.is_default 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className={`p-2 rounded-lg ${
                                            address.is_default 
                                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                            {getAddressIcon(address.tag_name)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                                                <span>{address.tag_name}</span>
                                                {address.is_default && (
                                                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                                        Default
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400">{address.full_name}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <p className="flex items-center space-x-2">
                                            <MapPin className="w-4 h-4 flex-shrink-0" />
                                            <span>
                                                {address.address_line1}
                                                {address.address_line2 && `, ${address.address_line2}`}
                                            </span>
                                        </p>
                                        <p className="ml-6">
                                            {address.city}, {address.state} {address.zip_code}
                                        </p>
                                        <p className="ml-6">{address.country}</p>
                                        <p className="flex items-center space-x-2">
                                            <Phone className="w-4 h-4 flex-shrink-0" />
                                            <span>{address.phone}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {!address.is_default && (
                                        <button
                                            onClick={() => handleSetDefault(address.id)}
                                            disabled={loading}
                                            className="p-2 text-gray-500 hover:text-yellow-600 dark:text-gray-400 dark:hover:text-yellow-400 transition-colors disabled:opacity-50"
                                            title="Set as default"
                                        >
                                            <Star className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(address)}
                                        disabled={loading}
                                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                                        title="Edit address"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(address.id)}
                                        disabled={loading}
                                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                                        title="Delete address"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AddressManagement;