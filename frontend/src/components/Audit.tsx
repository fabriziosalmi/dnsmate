import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';

interface AuditLog {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

interface AuditFilters {
  user_id?: number;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

const Audit: React.FC = () => {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);

  // Filter options
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [availableResourceTypes, setAvailableResourceTypes] = useState<string[]>([]);

  const fetchAuditLogs = useCallback(async (newFilters?: AuditFilters) => {
    try {
      setLoading(true);
      const queryFilters = { ...filters, ...newFilters };
      
      // Build query string
      const params = new URLSearchParams();
      Object.entries(queryFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiService.get(`/api/audit/logs?${params.toString()}`);
      setAuditLogs(response.data.logs);
      setTotalLogs(response.data.total);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAuditLogs();
    fetchFilterOptions();
  }, [fetchAuditLogs]);

  const fetchFilterOptions = async () => {
    try {
      const response = await apiService.get('/api/audit/filter-options');
      setAvailableActions(response.data.actions);
      setAvailableResourceTypes(response.data.resource_types);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const handleFilterChange = (key: keyof AuditFilters, value: string | number) => {
    const newFilters = {
      ...filters,
      [key]: value === '' ? undefined : value,
      offset: 0 // Reset pagination when filtering
    };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    fetchAuditLogs();
  };

  const resetFilters = () => {
    const resetFilters = {
      limit: 50,
      offset: 0
    };
    setFilters(resetFilters);
    fetchAuditLogs(resetFilters);
  };

  const loadMore = () => {
    const newFilters = {
      ...filters,
      offset: (filters.offset || 0) + (filters.limit || 50)
    };
    setFilters(newFilters);
    fetchAuditLogs(newFilters);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'limit' && key !== 'offset') {
          params.append(key, value.toString());
        }
      });

      const response = await apiService.get(`/api/audit/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to export audit logs');
    }
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatResourceType = (resourceType: string) => {
    return resourceType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('update') || action.includes('modify')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-800';
    if (action.includes('login') || action.includes('auth')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return null;
    
    return Object.entries(details)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Audit Logs
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>View and monitor all system activities and user actions.</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                🔍 Filters
              </button>
              {user?.role === 'admin' && (
                <button
                  onClick={exportLogs}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  📥 Export
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Filter Logs</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Action Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Action</label>
                <select
                  value={filters.action || ''}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Actions</option>
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {formatAction(action)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resource Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                <select
                  value={filters.resource_type || ''}
                  onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Resource Types</option>
                  {availableResourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatResourceType(type)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="datetime-local"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="datetime-local"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Limit Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Results per page</label>
                <select
                  value={filters.limit || 50}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={applyFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {!loading && (
        <div className="bg-gray-50 px-4 py-3 rounded-lg">
          <p className="text-sm text-gray-600">
            Showing {auditLogs.length} of {totalLogs} audit log entries
            {filters.offset && filters.offset > 0 && ` (starting from entry ${filters.offset + 1})`}
          </p>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No audit logs found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <li key={log.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatResourceType(log.resource_type)}
                        </span>
                        {log.resource_id && (
                          <span className="text-sm text-gray-400">
                            ID: {log.resource_id}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1">
                        <p className="text-sm text-gray-900">
                          User: {log.user_email || 'System'} 
                          {log.user_id && ` (${log.user_id})`}
                        </p>
                        
                        {formatDetails(log.details) && (
                          <p className="text-sm text-gray-600 mt-1">
                            Details: {formatDetails(log.details)}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <span>📅 {new Date(log.timestamp).toLocaleString()}</span>
                          {log.ip_address && <span>🌐 {log.ip_address}</span>}
                          {log.user_agent && (
                            <span className="truncate max-w-xs">
                              💻 {log.user_agent}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Load More Button */}
            {auditLogs.length < totalLogs && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : `Load More (${totalLogs - auditLogs.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Audit;