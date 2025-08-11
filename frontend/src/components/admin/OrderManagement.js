import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ShoppingCart, Search, Filter, Eye, Edit, Clock, 
  Package, Truck, CheckCircle, XCircle, Calendar,
  User, MapPin, DollarSign, Phone, Mail
} from 'lucide-react';

const OrderManagement = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  const orderStatuses = [
    { value: 'pending', label: 'Pending', color: 'yellow', icon: Clock },
    { value: 'processing', label: 'Processing', color: 'blue', icon: Package },
    { value: 'shipped', label: 'Shipped', color: 'indigo', icon: Truck },
    { value: 'delivered', label: 'Delivered', color: 'green', icon: CheckCircle },
    { value: 'cancelled', label: 'Cancelled', color: 'red', icon: XCircle }
  ];

  useEffect(() => {
    fetchOrders();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      const axios = getAuthenticatedAxios();
      const params = {
        page: currentPage,
        per_page: 20,
        ...(statusFilter && { status: statusFilter })
      };
      
      const response = await axios.get('/api/orders/admin/all', { params });
      setOrders(response.data.data);
      setTotalPages(response.data.total_pages);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const axios = getAuthenticatedAxios();
      await axios.put(`/api/orders/${orderId}`, { status: newStatus });
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    }
  };

  const viewOrderDetails = async (orderId) => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get(`/api/orders/${orderId}`);
      setSelectedOrder(response.data.data);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Order Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage customer orders
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by order number, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="">All Statuses</option>
              {orderStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
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
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  onViewDetails={viewOrderDetails}
                  orderStatuses={orderStatuses}
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

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setShowOrderModal(false)}
          onStatusUpdate={handleStatusUpdate}
          orderStatuses={orderStatuses}
        />
      )}
    </div>
  );
};

// Order Row Component
const OrderRow = ({ order, onStatusUpdate, onViewDetails, orderStatuses }) => {
  const currentStatus = orderStatuses.find(s => s.value === order.status);
  const StatusIcon = currentStatus?.icon || Clock;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            #{order.order_number}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {order.items?.length || 0} items
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <User className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full p-2 text-gray-600 dark:text-gray-400 mr-3" />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {order.shipping_address?.full_name || 'N/A'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {order.shipping_address?.phone || 'N/A'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          {new Date(order.created_at).toLocaleDateString()}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
        ₹{order.final_amount?.toLocaleString() || 0}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={order.status} orderStatuses={orderStatuses} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewDetails(order.id)}
            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Eye className="w-4 h-4" />
          </button>
          <StatusDropdown
            currentStatus={order.status}
            onStatusChange={(newStatus) => onStatusUpdate(order.id, newStatus)}
            orderStatuses={orderStatuses}
          />
        </div>
      </td>
    </tr>
  );
};

// Status Badge Component
const StatusBadge = ({ status, orderStatuses }) => {
  const statusConfig = orderStatuses.find(s => s.value === status);
  const Icon = statusConfig?.icon || Clock;

  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusConfig?.color] || colorClasses.yellow}`}>
      <Icon className="w-3 h-3 mr-1" />
      {statusConfig?.label || status}
    </span>
  );
};

// Status Dropdown Component
const StatusDropdown = ({ currentStatus, onStatusChange, orderStatuses }) => {
  return (
    <select
      value={currentStatus}
      onChange={(e) => onStatusChange(e.target.value)}
      className="text-sm border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    >
      {orderStatuses.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ order, onClose, onStatusUpdate, orderStatuses }) => {
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [loading, setLoading] = useState(false);
  const { getAuthenticatedAxios } = useAuth(); // Move useAuth to component level

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios(); // Use the hook result here
      await axios.put(`/api/orders/${order.id}`, {
        tracking_number: trackingNumber,
        notes: notes
      });
      alert('Order updated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order Details - #{order.order_number}
              </h3>
              <div className="flex items-center space-x-4 mt-2">
                <StatusBadge status={order.status} orderStatuses={orderStatuses} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(order.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{order.shipping_address?.full_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{order.shipping_address?.phone}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="text-sm">
                    <div>{order.shipping_address?.address_line1}</div>
                    {order.shipping_address?.address_line2 && (
                      <div>{order.shipping_address.address_line2}</div>
                    )}
                    <div>
                      {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip_code}
                    </div>
                    <div>{order.shipping_address?.country}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Order Summary
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-sm">₹{order.total_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tax:</span>
                  <span className="text-sm">₹{order.tax_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Shipping:</span>
                  <span className="text-sm">₹{order.shipping_cost?.toLocaleString()}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Discount:</span>
                    <span className="text-sm text-green-600">-₹{order.discount_amount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>₹{order.final_amount?.toLocaleString()}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Payment: {order.payment_method}
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Order Items
            </h4>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-gray-600">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded mr-3 flex items-center justify-center">
                            {item.product_image ? (
                              <img
                                src={`data:image/jpeg;base64,${item.product_image}`}
                                alt={item.product_name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm font-medium">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm">₹{item.price?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-medium">₹{item.total_price?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Update Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tracking Number
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="input-field"
                placeholder="Enter tracking number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={order.status}
                onChange={(e) => onStatusUpdate(order.id, e.target.value)}
                className="input-field"
              >
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Add notes about this order..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;