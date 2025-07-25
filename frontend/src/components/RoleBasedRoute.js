import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

// Role-based Route Component - for specific roles
export const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Required roles: {allowedRoles.join(', ')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your role: {user?.role}
          </p>
        </div>
      </div>
    );
  }

  return children;
};

// Super Admin Route Component - for super admin only
export const SuperAdminRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['super_admin']}>
      {children}
    </RoleBasedRoute>
  );
};

// Admin Route Component - for admin and super admin
export const AdminRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['admin', 'super_admin']}>
      {children}
    </RoleBasedRoute>
  );
};

// Store Management Route Component - for store related roles
export const StoreManagementRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['super_admin', 'admin', 'store_owner', 'store_manager']}>
      {children}
    </RoleBasedRoute>
  );
};

// Sales Route Component - for sales related roles
export const SalesRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['super_admin', 'admin', 'store_owner', 'sales_manager', 'salesperson']}>
      {children}
    </RoleBasedRoute>
  );
};

// Marketing Route Component - for marketing related roles
export const MarketingRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['super_admin', 'admin', 'store_owner', 'marketing_manager']}>
      {children}
    </RoleBasedRoute>
  );
};

// Support Route Component - for support related roles
export const SupportRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['super_admin', 'admin', 'store_owner', 'support_executive']}>
      {children}
    </RoleBasedRoute>
  );
};

// Customer Route Component - for customers only
export const CustomerRoute = ({ children }) => {
  return (
    <RoleBasedRoute allowedRoles={['customer']}>
      {children}
    </RoleBasedRoute>
  );
};

// Dashboard Route Component - redirects to appropriate dashboard based on role
export const DashboardRoute = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to appropriate dashboard based on user role
  switch (user.role) {
    case 'super_admin':
      return <Navigate to="/super-admin" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'store_owner':
      return <Navigate to="/store-owner" replace />;
    case 'store_manager':
      return <Navigate to="/store-manager" replace />;
    case 'sales_manager':
      return <Navigate to="/sales-manager" replace />;
    case 'salesperson':
      return <Navigate to="/salesperson" replace />;
    case 'marketing_manager':
      return <Navigate to="/marketing-manager" replace />;
    case 'support_executive':
      return <Navigate to="/support-executive" replace />;
    case 'customer':
      return <Navigate to="/customer" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};