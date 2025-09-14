import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Server, Database, Wifi } from 'lucide-react';

const DebugInfo = () => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [backendInfo, setBackendInfo] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    checkBackend();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    
    try {
      setBackendStatus('checking');
      console.log(`[DebugInfo] Testing backend connection to: ${API_BASE_URL}`);
      
      // Test health endpoint first
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`, {
        timeout: 5000
      });
      
      // Test products endpoint
      const productsResponse = await axios.get(`${API_BASE_URL}/api/products/?per_page=1`, {
        timeout: 5000
      });
      
      // Test categories endpoint
      let categoriesResponse = null;
      try {
        categoriesResponse = await axios.get(`${API_BASE_URL}/api/products/categories/available`, {
          timeout: 3000
        });
      } catch (catErr) {
        console.warn('[DebugInfo] Categories endpoint failed:', catErr.message);
      }
      
      setBackendStatus('connected');
      setBackendInfo({
        health: healthResponse.data,
        products: {
          total: productsResponse.data.total || 0,
          success: productsResponse.data.success,
          dataLength: productsResponse.data.data?.length || 0
        },
        categories: categoriesResponse ? {
          success: categoriesResponse.data.success,
          count: categoriesResponse.data.data?.length || 0
        } : { error: 'Endpoint not available' },
        url: API_BASE_URL,
        responseTime: Date.now()
      });
      
      setLastChecked(new Date());
      console.log('[DebugInfo] Backend connection successful');
      
    } catch (error) {
      console.error('[DebugInfo] Backend connection failed:', error);
      setBackendStatus('failed');
      setBackendInfo({
        error: error.message,
        code: error.code,
        url: API_BASE_URL,
        response: error.response?.data,
        stack: error.response ? `HTTP ${error.response.status}` : 'Network Error'
      });
      setLastChecked(new Date());
    }
  };

  const getStatusIcon = () => {
    switch (backendStatus) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'checking':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Don't show in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact Status Indicator */}
      <div 
        className={`
          bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 cursor-pointer
          transition-all duration-200 hover:shadow-xl
          ${getStatusColor()}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">
            Backend: {backendStatus}
          </span>
          <button className="text-xs text-gray-400 hover:text-gray-600">
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Expanded Debug Panel */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 border rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center">
              <Server className="w-4 h-4 mr-1" />
              Debug Info
            </h3>
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div className="text-xs space-y-2">
            {/* Basic Status */}
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={`
                ${backendStatus === 'connected' ? 'text-green-600' : ''}
                ${backendStatus === 'failed' ? 'text-red-600' : ''}
                ${backendStatus === 'checking' ? 'text-yellow-600' : ''}
              `}>
                {backendStatus}
              </span>
            </div>
            
            {/* API URL */}
            {backendInfo && (
              <div className="flex justify-between">
                <span className="font-medium">API URL:</span>
                <span className="text-blue-600 truncate ml-2" title={backendInfo.url}>
                  {backendInfo.url.replace('http://', '').replace('https://', '')}
                </span>
              </div>
            )}
            
            {/* Last Checked */}
            {lastChecked && (
              <div className="flex justify-between">
                <span className="font-medium">Last Check:</span>
                <span>{lastChecked.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Success State */}
            {backendStatus === 'connected' && backendInfo && (
              <>
                <hr className="my-2" />
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Database className="w-3 h-3 mr-1" />
                    <span className="font-medium">Database Status</span>
                  </div>
                  
                  <div className="pl-4 space-y-1">
                    <div className="flex justify-between">
                      <span>Products:</span>
                      <span className="text-green-600">{backendInfo.products?.total || 0}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Categories:</span>
                      <span className="text-green-600">
                        {backendInfo.categories?.count || 'N/A'}
                      </span>
                    </div>
                    
                    {backendInfo.health && (
                      <div className="flex justify-between">
                        <span>Health:</span>
                        <span className="text-green-600">
                          {backendInfo.health.status || 'OK'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Error State */}
            {backendStatus === 'failed' && backendInfo && (
              <>
                <hr className="my-2" />
                <div className="space-y-1">
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    <span className="font-medium">Connection Error</span>
                  </div>
                  
                  <div className="pl-4 space-y-1 text-red-600">
                    <div>
                      <span className="font-medium">Error:</span>
                      <div className="text-xs break-words">
                        {backendInfo.error}
                      </div>
                    </div>
                    
                    {backendInfo.code && (
                      <div>
                        <span className="font-medium">Code:</span> {backendInfo.code}
                      </div>
                    )}
                    
                    {backendInfo.stack && (
                      <div>
                        <span className="font-medium">Type:</span> {backendInfo.stack}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <strong>Quick Fixes:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Check if backend is running</li>
                    <li>Verify MongoDB is started</li>
                    <li>Check network connection</li>
                    <li>Verify API_BASE_URL is correct</li>
                  </ul>
                </div>
              </>
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-2 mt-3 pt-2 border-t">
              <button 
                onClick={checkBackend}
                disabled={backendStatus === 'checking'}
                className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
                Retry
              </button>
              
              <button 
                onClick={() => window.open(`${backendInfo?.url || 'http://localhost:8001'}/api/health`, '_blank')}
                className="flex-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 flex items-center justify-center"
              >
                <Wifi className="w-3 h-3 mr-1" />
                Test API
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugInfo;
