import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  DollarSign, Users, Package, Settings, Plus, Edit, Trash2,
  Search, Filter, Eye, TrendingUp, AlertTriangle, Clock,
  CheckCircle, XCircle, RotateCcw, Target, Award, Activity
} from 'lucide-react';

const CommissionManagement = () => {
  const { getAuthenticatedAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('rules');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Commission Rules State
  const [commissionRules, setCommissionRules] = useState([]);
  const [rulesPage, setRulesPage] = useState(1);
  const [rulesTotalPages, setRulesTotalPages] = useState(1);
  const [rulesFilters, setRulesFilters] = useState({
    search: '',
    is_active: null,
    user_role: '',
    product_category: ''
  });

  // Commission Earnings State
  const [commissionEarnings, setCommissionEarnings] = useState([]);
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsTotalPages, setEarningsTotalPages] = useState(1);
  const [earningsFilters, setEarningsFilters] = useState({
    user_id: '',
    status: '',
    start_date: '',
    end_date: ''
  });

  // Product Assignments State
  const [productAssignments, setProductAssignments] = useState([]);
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsTotalPages, setAssignmentsTotalPages] = useState(1);

  // Reallocation State
  const [reallocationRecommendations, setReallocationRecommendations] = useState(null);
  const [reallocationCriteria, setReallocationCriteria] = useState({
    max_days_inactive: 30,
    min_performance_score: 50,
    high_performer_rotation_days: 90
  });

  // Modal States
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showEarningModal, setShowEarningModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showReallocationModal, setShowReallocationModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingEarning, setEditingEarning] = useState(null);

  // Form States
  const [ruleForm, setRuleForm] = useState({
    rule_name: '',
    user_id: '',
    user_role: '',
    product_id: '',
    product_category: '',
    commission_type: 'percentage',
    commission_value: '',
    min_order_amount: '',
    max_commission_amount: '',
    priority: 0,
    is_active: true
  });

  const [assignmentForm, setAssignmentForm] = useState({
    product_id: '',
    assigned_to: '',
    reason: 'manual_admin',
    notes: ''
  });

  // Dropdown options
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchCommissionRules();
    } else if (activeTab === 'earnings') {
      fetchCommissionEarnings();
    } else if (activeTab === 'assignments') {
      fetchProductAssignments();
    } else if (activeTab === 'reallocation') {
      fetchReallocationRecommendations();
    }
  }, [activeTab, rulesPage, earningsPage, assignmentsPage]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const axios = getAuthenticatedAxios();
      
      // Fetch users (salespeople)
      const usersResponse = await axios.get('/api/auth/users?role=salesperson');
      if (usersResponse.data.success) {
        setUsers(usersResponse.data.data);
      }

      // Fetch products
      const productsResponse = await axios.get('/api/products/?per_page=1000');
      if (productsResponse.data.success) {
        setProducts(productsResponse.data.data);
      }

      // Fetch categories
      const categoriesResponse = await axios.get('/api/products/categories/available');
      if (categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchCommissionRules = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const params = new URLSearchParams({
        page: rulesPage,
        per_page: 20,
        ...Object.fromEntries(
          Object.entries(rulesFilters).filter(([_, v]) => v !== '' && v !== null)
        )
      });

      const response = await axios.get(`/api/commissions/rules?${params}`);
      if (response.data.success) {
        setCommissionRules(response.data.data);
        setRulesTotalPages(response.data.total_pages);
      }
    } catch (error) {
      setError('Failed to fetch commission rules');
      console.error('Error fetching commission rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionEarnings = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const params = new URLSearchParams({
        page: earningsPage,
        per_page: 20,
        ...Object.fromEntries(
          Object.entries(earningsFilters).filter(([_, v]) => v !== '' && v !== null)
        )
      });

      const response = await axios.get(`/api/commissions/earnings?${params}`);
      if (response.data.success) {
        setCommissionEarnings(response.data.data);
        setEarningsTotalPages(response.data.total_pages);
      }
    } catch (error) {
      setError('Failed to fetch commission earnings');
      console.error('Error fetching commission earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductAssignments = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.get(`/api/commissions/assignments?page=${assignmentsPage}&per_page=20`);
      if (response.data.success) {
        setProductAssignments(response.data.data);
        setAssignmentsTotalPages(response.data.total_pages);
      }
    } catch (error) {
      setError('Failed to fetch product assignments');
      console.error('Error fetching product assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReallocationRecommendations = async () => {
    setLoading(true);
    try {
      const axios = getAuthenticatedAxios();
      const params = new URLSearchParams(reallocationCriteria);
      const response = await axios.get(`/api/commissions/reallocation/recommendations?${params}`);
      if (response.data.success) {
        setReallocationRecommendations(response.data.data);
      }
    } catch (error) {
      setError('Failed to fetch reallocation recommendations');
      console.error('Error fetching reallocation recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.post('/api/commissions/rules', ruleForm);
      if (response.data.success) {
        setShowRuleModal(false);
        setRuleForm({
          rule_name: '',
          user_id: '',
          user_role: '',
          product_id: '',
          product_category: '',
          commission_type: 'percentage',
          commission_value: '',
          min_order_amount: '',
          max_commission_amount: '',
          priority: 0,
          is_active: true
        });
        fetchCommissionRules();
      }
    } catch (error) {
      setError('Failed to create commission rule');
      console.error('Error creating commission rule:', error);
    }
  };

  const handleUpdateRule = async (e) => {
    e.preventDefault();
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.put(`/api/commissions/rules/${editingRule.id}`, ruleForm);
      if (response.data.success) {
        setShowRuleModal(false);
        setEditingRule(null);
        fetchCommissionRules();
      }
    } catch (error) {
      setError('Failed to update commission rule');
      console.error('Error updating commission rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this commission rule?')) return;
    
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.delete(`/api/commissions/rules/${ruleId}`);
      if (response.data.success) {
        fetchCommissionRules();
      }
    } catch (error) {
      setError('Failed to delete commission rule');
      console.error('Error deleting commission rule:', error);
    }
  };

  const handleUpdateEarning = async (earningId, status) => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.put(`/api/commissions/earnings/${earningId}`, { status });
      if (response.data.success) {
        fetchCommissionEarnings();
      }
    } catch (error) {
      setError('Failed to update commission earning');
      console.error('Error updating commission earning:', error);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.post('/api/commissions/assignments', assignmentForm);
      if (response.data.success) {
        setShowAssignmentModal(false);
        setAssignmentForm({
          product_id: '',
          assigned_to: '',
          reason: 'manual_admin',
          notes: ''
        });
        fetchProductAssignments();
      }
    } catch (error) {
      setError('Failed to create product assignment');
      console.error('Error creating product assignment:', error);
    }
  };

  const handleBulkReassignment = async (productIds, newAssignee) => {
    try {
      const axios = getAuthenticatedAxios();
      const response = await axios.post('/api/commissions/reallocation/bulk', {
        product_ids: productIds,
        new_assignee: newAssignee,
        reason: 'manual_admin',
        notes: 'Bulk reassignment via admin panel'
      });
      if (response.data.success) {
        fetchReallocationRecommendations();
        setShowReallocationModal(false);
      }
    } catch (error) {
      setError('Failed to perform bulk reassignment');
      console.error('Error performing bulk reassignment:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'paid': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'paid': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const tabs = [
    { id: 'rules', label: 'Commission Rules', icon: Settings },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'assignments', label: 'Product Assignments', icon: Package },
    { id: 'reallocation', label: 'Reallocation', icon: RotateCcw }
  ];

  if (loading && (commissionRules.length === 0 && commissionEarnings.length === 0)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Commission Management
        </h2>
        <button
          onClick={() => {
            if (activeTab === 'rules') {
              setEditingRule(null);
              setShowRuleModal(true);
            } else if (activeTab === 'assignments') {
              setShowAssignmentModal(true);
            }
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'rules' ? 'New Rule' : 
             activeTab === 'assignments' ? 'New Assignment' : 'New'}
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'rules' && (
        <CommissionRulesTab 
          rules={commissionRules}
          onEdit={(rule) => {
            setEditingRule(rule);
            setRuleForm(rule);
            setShowRuleModal(true);
          }}
          onDelete={handleDeleteRule}
          filters={rulesFilters}
          onFiltersChange={setRulesFilters}
          onSearch={fetchCommissionRules}
        />
      )}

      {activeTab === 'earnings' && (
        <CommissionEarningsTab 
          earnings={commissionEarnings}
          onUpdateStatus={handleUpdateEarning}
          filters={earningsFilters}
          onFiltersChange={setEarningsFilters}
          onSearch={fetchCommissionEarnings}
        />
      )}

      {activeTab === 'assignments' && (
        <ProductAssignmentsTab 
          assignments={productAssignments}
        />
      )}

      {activeTab === 'reallocation' && (
        <ReallocationTab 
          recommendations={reallocationRecommendations}
          criteria={reallocationCriteria}
          onCriteriaChange={setReallocationCriteria}
          onRegenerate={fetchReallocationRecommendations}
          onBulkReassign={handleBulkReassignment}
        />
      )}

      {/* Commission Rule Modal */}
      {showRuleModal && (
        <CommissionRuleModal
          isEdit={!!editingRule}
          form={ruleForm}
          onChange={setRuleForm}
          onSubmit={editingRule ? handleUpdateRule : handleCreateRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          users={users}
          products={products}
          categories={categories}
        />
      )}

      {/* Product Assignment Modal */}
      {showAssignmentModal && (
        <ProductAssignmentModal
          form={assignmentForm}
          onChange={setAssignmentForm}
          onSubmit={handleCreateAssignment}
          onClose={() => setShowAssignmentModal(false)}
          users={users}
          products={products}
        />
      )}
    </div>
  );
};

// Sub-components for different tabs
const CommissionRulesTab = ({ rules, onEdit, onDelete, filters, onFiltersChange, onSearch }) => (
  <div className="space-y-4">
    {/* Filters */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <input
        type="text"
        placeholder="Search rules..."
        value={filters.search}
        onChange={(e) => onFiltersChange({...filters, search: e.target.value})}
        className="input-field"
      />
      <select
        value={filters.is_active || ''}
        onChange={(e) => onFiltersChange({...filters, is_active: e.target.value || null})}
        className="input-field"
      >
        <option value="">All Status</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
      <select
        value={filters.user_role}
        onChange={(e) => onFiltersChange({...filters, user_role: e.target.value})}
        className="input-field"
      >
        <option value="">All Roles</option>
        <option value="salesperson">Salesperson</option>
        <option value="sales_manager">Sales Manager</option>
      </select>
      <button onClick={onSearch} className="btn-primary">
        <Search className="w-4 h-4 mr-2" />
        Search
      </button>
    </div>

    {/* Rules Table */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Rule Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Commission
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {rule.rule_name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Priority: {rule.priority}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {rule.user_id ? 'Individual' : 
                 rule.product_id ? 'Product-specific' :
                 rule.product_category ? 'Category-based' : 'General'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {rule.commission_value}{rule.commission_type === 'percentage' ? '%' : ' Fixed'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  rule.is_active ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                }`}>
                  {rule.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(rule)}
                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-4"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const CommissionEarningsTab = ({ earnings, onUpdateStatus, filters, onFiltersChange, onSearch }) => (
  <div className="space-y-4">
    {/* Filters */}
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({...filters, status: e.target.value})}
        className="input-field"
      >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input
        type="date"
        value={filters.start_date}
        onChange={(e) => onFiltersChange({...filters, start_date: e.target.value})}
        className="input-field"
      />
      <input
        type="date"
        value={filters.end_date}
        onChange={(e) => onFiltersChange({...filters, end_date: e.target.value})}
        className="input-field"
      />
      <button onClick={onSearch} className="btn-primary">
        <Search className="w-4 h-4 mr-2" />
        Search
      </button>
    </div>

    {/* Earnings Table */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Salesperson
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Order Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Commission
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {earnings.map((earning) => (
            <tr key={earning.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {earning.user_name || earning.user_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{earning.order_amount?.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                ₹{earning.commission_amount?.toLocaleString()} ({earning.commission_rate}%)
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  earning.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                  earning.status === 'approved' ? 'text-green-600 bg-green-100' :
                  earning.status === 'paid' ? 'text-blue-600 bg-blue-100' :
                  earning.status === 'cancelled' ? 'text-red-600 bg-red-100' :
                  'text-gray-600 bg-gray-100'
                }`}>
                  {earning.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {earning.status === 'pending' && (
                  <button
                    onClick={() => onUpdateStatus(earning.id, 'approved')}
                    className="text-green-600 hover:text-green-900 dark:text-green-400 mr-2"
                    title="Approve"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {earning.status === 'approved' && (
                  <button
                    onClick={() => onUpdateStatus(earning.id, 'paid')}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 mr-2"
                    title="Mark as Paid"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onUpdateStatus(earning.id, 'cancelled')}
                  className="text-red-600 hover:text-red-900 dark:text-red-400"
                  title="Cancel"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ProductAssignmentsTab = ({ assignments }) => (
  <div className="space-y-4">
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Product
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Assigned To
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Reason
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {assignments.map((assignment) => (
            <tr key={assignment.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {assignment.product_name || assignment.product_id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {assignment.assigned_to_name || assignment.assigned_to}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {assignment.reason?.replace('_', ' ').toUpperCase()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {new Date(assignment.start_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  assignment.status === 'active' ? 'text-green-800 bg-green-100' : 'text-gray-800 bg-gray-100'
                }`}>
                  {assignment.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ReallocationTab = ({ recommendations, criteria, onCriteriaChange, onRegenerate, onBulkReassign }) => (
  <div className="space-y-6">
    {/* Criteria Form */}
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Reallocation Criteria
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Days Inactive
          </label>
          <input
            type="number"
            value={criteria.max_days_inactive}
            onChange={(e) => onCriteriaChange({...criteria, max_days_inactive: parseInt(e.target.value)})}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Min Performance Score
          </label>
          <input
            type="number"
            step="0.1"
            value={criteria.min_performance_score}
            onChange={(e) => onCriteriaChange({...criteria, min_performance_score: parseFloat(e.target.value)})}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            High Performer Rotation (Days)
          </label>
          <input
            type="number"
            value={criteria.high_performer_rotation_days}
            onChange={(e) => onCriteriaChange({...criteria, high_performer_rotation_days: parseInt(e.target.value)})}
            className="input-field"
          />
        </div>
      </div>
      <button onClick={onRegenerate} className="btn-primary mt-4">
        <RotateCcw className="w-4 h-4 mr-2" />
        Regenerate Recommendations
      </button>
    </div>

    {/* Recommendations */}
    {recommendations && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Reallocation Recommendations ({recommendations.total_candidates})
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Generated: {new Date(recommendations.generated_at).toLocaleString()}
          </span>
        </div>

        {recommendations.candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No reallocation recommendations at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.candidates.slice(0, 10).map((candidate) => (
              <div key={candidate.product_id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Product: {candidate.product_id}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Current Assignee: {candidate.current_assignee}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reason: {candidate.reason?.replace('_', ' ').toUpperCase()}
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Sales:</span> {candidate.performance_metrics.sales_count}
                      </div>
                      <div>
                        <span className="font-medium">Revenue:</span> ₹{candidate.performance_metrics.revenue?.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Score:</span> {candidate.performance_metrics.performance_score?.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      candidate.reason === 'time_based' ? 'text-yellow-800 bg-yellow-100' :
                      candidate.reason === 'performance_based' ? 'text-red-800 bg-red-100' :
                      'text-blue-800 bg-blue-100'
                    }`}>
                      Priority: {candidate.priority_score?.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

// Modal Components
const CommissionRuleModal = ({ isEdit, form, onChange, onSubmit, onClose, users, products, categories }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {isEdit ? 'Edit Commission Rule' : 'Create Commission Rule'}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rule Name
          </label>
          <input
            type="text"
            value={form.rule_name}
            onChange={(e) => onChange({...form, rule_name: e.target.value})}
            className="input-field"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commission Type
            </label>
            <select
              value={form.commission_type}
              onChange={(e) => onChange({...form, commission_type: e.target.value})}
              className="input-field"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commission Value
            </label>
            <input
              type="number"
              step="0.01"
              value={form.commission_value}
              onChange={(e) => onChange({...form, commission_value: e.target.value})}
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specific User (Optional)
            </label>
            <select
              value={form.user_id}
              onChange={(e) => onChange({...form, user_id: e.target.value})}
              className="input-field"
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.username}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User Role (Optional)
            </label>
            <select
              value={form.user_role}
              onChange={(e) => onChange({...form, user_role: e.target.value})}
              className="input-field"
            >
              <option value="">All Roles</option>
              <option value="salesperson">Salesperson</option>
              <option value="sales_manager">Sales Manager</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specific Product (Optional)
            </label>
            <select
              value={form.product_id}
              onChange={(e) => onChange({...form, product_id: e.target.value})}
              className="input-field"
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Category (Optional)
            </label>
            <select
              value={form.product_category}
              onChange={(e) => onChange({...form, product_category: e.target.value})}
              className="input-field"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Min Order Amount (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.min_order_amount}
              onChange={(e) => onChange({...form, min_order_amount: e.target.value})}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Commission (Optional)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.max_commission_amount}
              onChange={(e) => onChange({...form, max_commission_amount: e.target.value})}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => onChange({...form, priority: parseInt(e.target.value)})}
              className="input-field"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => onChange({...form, is_active: e.target.checked})}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
            Active
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            {isEdit ? 'Update' : 'Create'} Rule
          </button>
        </div>
      </form>
    </div>
  </div>
);

const ProductAssignmentModal = ({ form, onChange, onSubmit, onClose, users, products }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Create Product Assignment
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product
          </label>
          <select
            value={form.product_id}
            onChange={(e) => onChange({...form, product_id: e.target.value})}
            className="input-field"
            required
          >
            <option value="">Select Product</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assign To
          </label>
          <select
            value={form.assigned_to}
            onChange={(e) => onChange({...form, assigned_to: e.target.value})}
            className="input-field"
            required
          >
            <option value="">Select User</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.full_name || user.username}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason
          </label>
          <select
            value={form.reason}
            onChange={(e) => onChange({...form, reason: e.target.value})}
            className="input-field"
          >
            <option value="manual_admin">Manual Admin Assignment</option>
            <option value="performance_based">Performance Based</option>
            <option value="inventory_issues">Inventory Issues</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => onChange({...form, notes: e.target.value})}
            className="input-field"
            rows="3"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            Create Assignment
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default CommissionManagement;