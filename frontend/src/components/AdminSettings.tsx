import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface PowerDNSSettings {
  id?: number;
  name: string;
  api_url: string;
  api_key: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  timeout: number;
  verify_ssl: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PowerDNSTestResult {
  success: boolean;
  message: string;
  response_time_ms?: number;
  server_version?: string;
  zones_count?: number;
}

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'powerdns' | 'system'>('powerdns');
  const [loading, setLoading] = useState(false);
  
  // PowerDNS Settings
  const [powerDNSSettings, setPowerDNSSettings] = useState<PowerDNSSettings[]>([]);
  const [editingPowerDNS, setEditingPowerDNS] = useState<PowerDNSSettings | null>(null);
  const [showPowerDNSForm, setShowPowerDNSForm] = useState(false);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  
  const defaultPowerDNSForm: PowerDNSSettings = {
    name: '',
    api_url: 'http://powerdns-server:8081',
    api_key: '',
    description: '',
    is_default: false,
    is_active: true,
    timeout: 30,
    verify_ssl: true
  };
  
  const [powerDNSForm, setPowerDNSForm] = useState<PowerDNSSettings>(defaultPowerDNSForm);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPowerDNSSettings();
    }
  }, [user]);

  const fetchPowerDNSSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/settings/powerdns');
      setPowerDNSSettings(response.data);
    } catch (error: any) {
      toast.error('Failed to fetch PowerDNS settings');
      console.error('Error fetching PowerDNS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePowerDNSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (editingPowerDNS) {
        // Update existing setting
        await apiService.put(`/api/settings/powerdns/${editingPowerDNS.id}`, powerDNSForm);
        toast.success('PowerDNS settings updated successfully');
      } else {
        // Create new setting
        await apiService.post('/api/settings/powerdns', powerDNSForm);
        toast.success('PowerDNS settings created successfully');
      }
      
      setShowPowerDNSForm(false);
      setEditingPowerDNS(null);
      setPowerDNSForm(defaultPowerDNSForm);
      fetchPowerDNSSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save PowerDNS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPowerDNS = async (id: number) => {
    try {
      setLoading(true);
      const response = await apiService.get(`/api/settings/powerdns/${id}`);
      setEditingPowerDNS(response.data);
      setPowerDNSForm(response.data);
      setShowPowerDNSForm(true);
    } catch (error: any) {
      toast.error('Failed to load PowerDNS settings for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePowerDNS = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the PowerDNS setting "${name}"?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await apiService.delete(`/api/settings/powerdns/${id}`);
      toast.success('PowerDNS settings deleted successfully');
      fetchPowerDNSSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete PowerDNS settings');
    } finally {
      setLoading(false);
    }
  };

  const testPowerDNSConnection = async (id?: number, settings?: PowerDNSSettings) => {
    try {
      setTestingConnection(id || -1);
      let response;
      
      if (id) {
        // Test existing setting
        response = await apiService.post(`/api/settings/powerdns/${id}/test`);
      } else if (settings) {
        // Test new settings
        response = await apiService.post('/api/settings/powerdns/test', {
          api_url: settings.api_url,
          api_key: settings.api_key,
          timeout: settings.timeout,
          verify_ssl: settings.verify_ssl
        });
      }
      
      const result: PowerDNSTestResult = response?.data;
      if (result.success) {
        toast.success(
          `Connection successful! ${result.server_version ? `Server: ${result.server_version}` : ''} ${
            result.zones_count !== undefined ? `Zones: ${result.zones_count}` : ''
          } (${result.response_time_ms}ms)`
        );
      } else {
        toast.error(`Connection failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to test connection');
    } finally {
      setTestingConnection(null);
    }
  };

  const cancelPowerDNSForm = () => {
    setShowPowerDNSForm(false);
    setEditingPowerDNS(null);
    setPowerDNSForm(defaultPowerDNSForm);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Access denied. Only administrators can view settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Settings</h1>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('powerdns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'powerdns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            PowerDNS Settings
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            System Settings
          </button>
        </nav>
      </div>

      {/* PowerDNS Settings Tab */}
      {activeTab === 'powerdns' && (
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">PowerDNS Configuration</h2>
              <p className="text-gray-600">Manage PowerDNS server connections and settings</p>
            </div>
            <button
              onClick={() => setShowPowerDNSForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              Add PowerDNS Server
            </button>
          </div>

          {/* PowerDNS Settings List */}
          <div className="space-y-4">
            {loading && powerDNSSettings.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading PowerDNS settings...</p>
              </div>
            ) : powerDNSSettings.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No PowerDNS servers configured yet.</p>
                <button
                  onClick={() => setShowPowerDNSForm(true)}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Add your first PowerDNS server
                </button>
              </div>
            ) : (
              powerDNSSettings.map((setting) => (
                <div key={setting.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{setting.name}</h3>
                        {setting.is_default && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                        {!setting.is_active && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-1">{setting.description}</p>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">URL:</span>
                          <p className="text-gray-600">{setting.api_url}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Timeout:</span>
                          <p className="text-gray-600">{setting.timeout}s</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">SSL Verify:</span>
                          <p className="text-gray-600">{setting.verify_ssl ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">API Key:</span>
                          <p className="text-gray-600 font-mono">●●●●●●●●</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => testPowerDNSConnection(setting.id)}
                        disabled={testingConnection === setting.id}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {testingConnection === setting.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleEditPowerDNS(setting.id!)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePowerDNS(setting.id!, setting.name)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PowerDNS Form Modal */}
          {showPowerDNSForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingPowerDNS ? 'Edit PowerDNS Server' : 'Add PowerDNS Server'}
                  </h3>
                  
                  <form onSubmit={handlePowerDNSSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Server Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={powerDNSForm.name}
                        onChange={(e) => setPowerDNSForm({...powerDNSForm, name: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="My PowerDNS Server"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={powerDNSForm.api_url}
                        onChange={(e) => setPowerDNSForm({...powerDNSForm, api_url: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="http://powerdns-server:8081"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key *
                      </label>
                      <input
                        type="password"
                        required
                        value={powerDNSForm.api_key}
                        onChange={(e) => setPowerDNSForm({...powerDNSForm, api_key: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your PowerDNS API key"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={powerDNSForm.description}
                        onChange={(e) => setPowerDNSForm({...powerDNSForm, description: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={powerDNSForm.timeout}
                          onChange={(e) => setPowerDNSForm({...powerDNSForm, timeout: parseInt(e.target.value)})}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={powerDNSForm.is_active}
                          onChange={(e) => setPowerDNSForm({...powerDNSForm, is_active: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={powerDNSForm.is_default}
                          onChange={(e) => setPowerDNSForm({...powerDNSForm, is_default: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Set as default server</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={powerDNSForm.verify_ssl}
                          onChange={(e) => setPowerDNSForm({...powerDNSForm, verify_ssl: e.target.checked})}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Verify SSL certificates</span>
                      </label>
                    </div>

                    <div className="flex justify-between space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => testPowerDNSConnection(undefined, powerDNSForm)}
                        disabled={!powerDNSForm.api_url || !powerDNSForm.api_key || testingConnection === -1}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {testingConnection === -1 ? 'Testing...' : 'Test Connection'}
                      </button>
                      
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={cancelPowerDNSForm}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : editingPowerDNS ? 'Update' : 'Create'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600">System settings management will be implemented here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
