import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { BackupManager } from './BackupManager';

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface APIToken {
  id: number;
  name: string;
  description?: string;
  token?: string;
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

interface APITokenFormData {
  name: string;
  description: string;
}

interface PowerDNSSetting {
  id: number;
  name: string;
  api_url: string;
  api_key?: string; // Optional for public view
  description?: string;
  is_default: boolean;
  is_active: boolean;
  timeout: number;
  verify_ssl: boolean;
  multi_server_mode: boolean; // Multi-server mode flag
  created_at: string;
  updated_at: string;
  // Health status fields
  health_status?: string; // "healthy", "unhealthy", "unknown"
  last_health_check?: string;
  health_response_time_ms?: number;
}

interface PowerDNSTestResult {
  success: boolean;
  message: string;
  response_time_ms?: number;
  server_version?: string;
  zones_count?: number;
}

interface SettingsFormData {
  name: string;
  api_url: string;
  api_key: string;
  description: string;
  is_default: boolean;
  timeout: number;
  verify_ssl: boolean;
  multi_server_mode: boolean;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  // Make PowerDNS the default tab for admins, password for non-admins
  const [activeTab, setActiveTab] = useState<'password' | 'tokens' | 'powerdns' | 'versioning' | 'backup'>('password');
  
  // Update default tab when user loads
  useEffect(() => {
    if (user?.role === 'admin') {
      setActiveTab('powerdns');
    }
  }, [user]);
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordStrength, setPasswordStrength] = useState<{score: number; description: string} | null>(null);
  
  // API Tokens state
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [tokenForm, setTokenForm] = useState<APITokenFormData>({
    name: '',
    description: ''
  });
  
  // PowerDNS settings state (admin only)
  const [settings, setSettings] = useState<PowerDNSSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<SettingsFormData>({
    name: '',
    api_url: '',
    api_key: '',
    description: '',
    is_default: false,
    timeout: 30,
    verify_ssl: true,
    multi_server_mode: false,
  });

  // Versioning settings state
  const [versioningSettings, setVersioningSettings] = useState({
    auto_version_enabled: true,
    auto_version_on_record_change: true,
    auto_version_on_zone_change: true,
    max_versions_per_zone: 100,
    version_retention_days: 90
  });
  const [versioningLoading, setVersioningLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings();
    }
    fetchTokens();
    fetchVersioningSettings();
  }, [user]);

  // Handle URL hash to open specific tab
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#powerdns' && user?.role === 'admin') {
      setActiveTab('powerdns');
      // Load settings with health status when accessing PowerDNS tab
      fetchSettings(true);
    } else if (hash === '#tokens') {
      setActiveTab('tokens');
    } else if (hash === '#backup') {
      setActiveTab('backup');
    } else if (hash === '#versioning' && user?.role === 'admin') {
      setActiveTab('versioning');
    }
  }, [user]);

  // Load health status when PowerDNS tab is accessed
  useEffect(() => {
    if (activeTab === 'powerdns' && user?.role === 'admin') {
      fetchSettings(true);
    }
  }, [activeTab, user]);

  // Password change functions
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      await apiService.post('/api/security/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const checkPasswordStrength = async (password: string) => {
    if (password.length === 0) {
      setPasswordStrength(null);
      return;
    }

    try {
      const response = await apiService.post('/api/security/password-strength', {
        password: password
      });
      setPasswordStrength(response.data);
    } catch (error) {
      console.error('Failed to check password strength:', error);
    }
  };

  // API Token functions
  const fetchTokens = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/tokens/');
      setTokens(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch API tokens');
    } finally {
      setLoading(false);
    }
  };

  const resetTokenForm = () => {
    setTokenForm({ name: '', description: '' });
    setShowTokenForm(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Token copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy token to clipboard');
    });
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await apiService.post('/api/tokens/', tokenForm);
      const newToken = response.data;
      
      toast.success('API token created successfully');
      
      // Show the token to the user (it will only be shown once)
      if (newToken.token) {
        toast(
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✅</span>
              <div className="font-medium">Your new API token:</div>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all text-gray-800">
                  {newToken.token}
                </code>
                <button
                  onClick={() => copyToClipboard(newToken.token)}
                  className="ml-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-600 flex items-center space-x-1">
              <span>⚠️</span>
              <span>Save this token now - you won't be able to see it again!</span>
            </div>
          </div>,
          { duration: 15000 }
        );
      }
      
      resetTokenForm();
      fetchTokens();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create API token');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the token "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.delete(`/api/tokens/${id}`);
      toast.success('API token deleted successfully');
      fetchTokens();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete API token');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPasswordStrengthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // PowerDNS settings functions (admin only)
  const fetchSettings = async (includeHealth: boolean = false) => {
    try {
      setLoading(true);
      const url = includeHealth ? '/api/settings/powerdns?include_health=true' : '/api/settings/powerdns';
      const response = await apiService.get(url);
      setSettings(response.data);
    } catch (error: any) {
      // If it's a 404 or similar, it just means no settings exist yet
      if (error.response?.status === 404 || error.response?.status === 403) {
        setSettings([]);
      } else {
        // Only show error toast for actual errors, not when no settings exist
        const errorMessage = error.response?.data?.detail || 'Failed to fetch PowerDNS settings';
        if (!errorMessage.includes('not found') && !errorMessage.includes('No PowerDNS settings found')) {
          toast.error(errorMessage);
        }
        setSettings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshHealthStatus = async () => {
    await fetchSettings(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      api_url: '',
      api_key: '',
      description: '',
      is_default: false,
      timeout: 30,
      verify_ssl: true,
      multi_server_mode: false,
    });
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleEdit = async (setting: PowerDNSSetting) => {
    try {
      // Fetch the full setting with API key
      const response = await apiService.get(`/api/settings/powerdns/${setting.id}`);
      const fullSetting = response.data;
      
      setFormData({
        name: fullSetting.name,
        api_url: fullSetting.api_url,
        api_key: fullSetting.api_key,
        description: fullSetting.description || '',
        is_default: fullSetting.is_default,
        timeout: fullSetting.timeout,
        verify_ssl: fullSetting.verify_ssl,
        multi_server_mode: fullSetting.multi_server_mode || false,
      });
      setEditingId(setting.id);
      setShowCreateForm(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch setting details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicates before submitting
    const isDuplicateName = settings.some(setting => 
      setting.name.toLowerCase() === formData.name.toLowerCase() && setting.id !== editingId
    );
    
    const isDuplicateUrl = settings.some(setting => 
      setting.api_url.toLowerCase() === formData.api_url.toLowerCase() && setting.id !== editingId
    );
    
    if (isDuplicateName) {
      toast.error(`A PowerDNS server with the name "${formData.name}" already exists. Please choose a different name.`);
      return;
    }
    
    if (isDuplicateUrl) {
      toast.error(`A PowerDNS server with the URL "${formData.api_url}" already exists. Please use a different URL.`);
      return;
    }
    
    // If setting as default, warn about changing the current default
    if (formData.is_default && !editingId) {
      const currentDefault = settings.find(s => s.is_default);
      if (currentDefault) {
        const confirmChange = window.confirm(
          `This will replace "${currentDefault.name}" as the default PowerDNS server. Continue?`
        );
        if (!confirmChange) {
          return;
        }
      }
    }
    
    try {
      if (editingId) {
        // Update existing setting
        await apiService.put(`/api/settings/powerdns/${editingId}`, formData);
        toast.success(`PowerDNS server "${formData.name}" updated successfully`);
      } else {
        // Create new setting
        await apiService.post('/api/settings/powerdns', formData);
        toast.success(`PowerDNS server "${formData.name}" created successfully`);
      }
      
      resetForm();
      fetchSettings();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to save PowerDNS setting';
      
      // Handle specific error cases
      if (errorMessage.includes('already exists')) {
        toast.error(`Server configuration already exists. Please check your settings.`);
      } else if (errorMessage.includes('connection')) {
        toast.error(`Unable to connect to PowerDNS server. Please verify the URL and API key.`);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this PowerDNS setting?')) {
      return;
    }

    try {
      await apiService.delete(`/api/settings/powerdns/${id}`);
      toast.success('PowerDNS setting deleted successfully');
      fetchSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete PowerDNS setting');
    }
  };

  const testConnection = async (setting: PowerDNSSetting) => {
    setTestingId(setting.id);
    
    try {
      const response = await apiService.post<PowerDNSTestResult>(
        `/api/settings/powerdns/${setting.id}/test`
      );
      const result = response.data;
      
      if (result.success) {
        toast.success(
          `Connection successful! ` +
          `${result.server_version ? `Version: ${result.server_version}, ` : ''}` +
          `${result.zones_count !== undefined ? `Zones: ${result.zones_count}, ` : ''}` +
          `Response time: ${result.response_time_ms?.toFixed(0)}ms`
        );
      } else {
        toast.error(`Connection failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to test connection');
    } finally {
      setTestingId(null);
    }
  };

  // Versioning settings functions
  const fetchVersioningSettings = async () => {
    try {
      setVersioningLoading(true);
      const response = await apiService.get('/api/settings/versioning');
      setVersioningSettings(response.data);
    } catch (error: any) {
      // If no settings exist, use defaults
      if (error.response?.status === 404) {
        // Keep default settings
      } else {
        toast.error('Failed to fetch versioning settings');
      }
    } finally {
      setVersioningLoading(false);
    }
  };

  const handleVersioningSettingsUpdate = async (newSettings: typeof versioningSettings) => {
    try {
      setVersioningLoading(true);
      await apiService.post('/api/settings/versioning', newSettings);
      setVersioningSettings(newSettings);
      toast.success('Versioning settings updated successfully');
    } catch (error: any) {
      toast.error('Failed to update versioning settings');
    } finally {
      setVersioningLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and system configuration</p>
      </div>

      {/* PowerDNS Setup Banner - Show only for admin users with no PowerDNS servers */}
      {user?.role === 'admin' && settings.length === 0 && activeTab !== 'powerdns' && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Ready to set up DNS management?
                </h3>
                <p className="text-sm text-blue-700">
                  Configure a PowerDNS server to start managing DNS zones and records.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('powerdns')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                <span>⚡</span>
                <span>Quick Setup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {/* PowerDNS tab first for admins */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('powerdns')}
                className={`${
                  activeTab === 'powerdns'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>🌐</span>
                <span>PowerDNS Servers</span>
                {settings.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
                    {settings.length}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('password')}
              className={`${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>�</span>
              <span>Password</span>
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`${
                activeTab === 'tokens'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>�</span>
              <span>API Tokens</span>
              {tokens.length > 0 && (
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full font-medium">
                  {tokens.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`${
                activeTab === 'backup'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>�</span>
              <span>Backup</span>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('versioning')}
                className={`${
                  activeTab === 'versioning'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>📋</span>
                <span>Auto Versioning</span>
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {/* Password Tab - Available to all users */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Update your password to keep your account secure.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, new_password: e.target.value });
                      checkPasswordStrength(e.target.value);
                    }}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Password Strength:</span>
                        <span className={`text-sm font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
                          {passwordStrength.description}
                        </span>
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getPasswordStrengthBg(passwordStrength.score)}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>

              {/* Password Security Tips */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Password Security Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use at least 8 characters</li>
                  <li>• Include uppercase and lowercase letters</li>
                  <li>• Include numbers and special characters</li>
                  <li>• Avoid using personal information or common words</li>
                  <li>• Use a unique password for this account</li>
                </ul>
              </div>
            </div>
          )}

          {/* API Tokens Tab - Available to all users */}
          {activeTab === 'tokens' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">API Tokens</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Create and manage API tokens for programmatic access to DNSMate.
                  </p>
                </div>
                <button
                  onClick={() => setShowTokenForm(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <span>➕</span>
                  <span>Create Token</span>
                </button>
              </div>

              {/* Create Token Form */}
              {showTokenForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500 text-lg">🔐</span>
                      <h4 className="text-md font-semibold">Create New API Token</h4>
                    </div>
                    <button
                      onClick={resetTokenForm}
                      className="text-gray-400 hover:text-gray-600 text-lg"
                      title="Close form"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={handleTokenSubmit} className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                        <span>📝</span>
                        <span>Token Name *</span>
                      </label>
                      <input
                        type="text"
                        value={tokenForm.name}
                        onChange={(e) => setTokenForm({ ...tokenForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., My Automation Script"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                        <span>💬</span>
                        <span>Description</span>
                      </label>
                      <textarea
                        value={tokenForm.description}
                        onChange={(e) => setTokenForm({ ...tokenForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="What will this token be used for?"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetTokenForm}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <span>🚀</span>
                            <span>Create Token</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tokens List */}
              <div className="bg-white border border-gray-200 rounded-lg">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : tokens.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🔐</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No API tokens created</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first API token to access DNSMate programmatically.
                    </p>
                    <button
                      onClick={() => setShowTokenForm(true)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mx-auto"
                    >
                      <span>🚀</span>
                      <span>Create Your First Token</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Token Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Used
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tokens.map((token) => (
                          <tr key={token.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-blue-500">🔑</span>
                                  <div className="text-sm font-medium text-gray-900">{token.name}</div>
                                </div>
                                {token.description && (
                                  <div className="text-sm text-gray-500 ml-6">{token.description}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <span>📅</span>
                                <span>{formatDate(token.created_at)}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <span>{token.last_used ? '🕐' : '⏸️'}</span>
                                <span>{token.last_used ? formatDate(token.last_used) : 'Never'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  token.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                <span className="mr-1">{token.is_active ? '✅' : '❌'}</span>
                                {token.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDeleteToken(token.id, token.name)}
                                className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                                title="Delete token"
                              >
                                <span>🗑️</span>
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-500 text-lg">💡</span>
                  <h4 className="font-semibold text-blue-800">Using API Tokens</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">🔌</span>
                    <span>API tokens allow you to access DNSMate programmatically</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">🔑</span>
                    <span>Include the token in the Authorization header: <code className="bg-blue-100 px-1 rounded">Authorization: Bearer dnsmate_your_token</code></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">👀</span>
                    <span>Tokens are only shown once when created - save them securely</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">📊</span>
                    <span>You can create up to 10 API tokens per account</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">🗑️</span>
                    <span>Delete tokens you no longer need to maintain security</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">📚</span>
                    <span>API documentation is available at <a href="/docs" className="underline hover:text-blue-900">http://localhost:8000/docs</a></span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* PowerDNS Tab - Admin only */}
          {activeTab === 'powerdns' && user?.role === 'admin' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {settings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500 text-lg">🌐</span>
                      <div>
                        <div className="text-lg font-semibold text-blue-900">{settings.length}</div>
                        <div className="text-xs text-blue-700">Total Servers</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-500 text-lg">✅</span>
                      <div>
                        <div className="text-lg font-semibold text-green-900">
                          {settings.filter(s => s.is_active).length}
                        </div>
                        <div className="text-xs text-green-700">Active Servers</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-500 text-lg">🔗</span>
                      <div>
                        <div className="text-lg font-semibold text-purple-900">
                          {settings.filter(s => s.multi_server_mode).length}
                        </div>
                        <div className="text-xs text-purple-700">Multi-Server</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-500 text-lg">⭐</span>
                      <div>
                        <div className="text-lg font-semibold text-yellow-900">
                          {(() => {
                            const defaultServer = settings.find(s => s.is_default);
                            return defaultServer ? (
                              defaultServer.name.length > 10 
                                ? defaultServer.name.substring(0, 10) + '...'
                                : defaultServer.name
                            ) : 'None';
                          })()}
                        </div>
                        <div className="text-xs text-yellow-700">Default Server</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">PowerDNS Servers</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage PowerDNS server connections and configurations.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {settings.length > 0 && (
                    <button
                      onClick={refreshHealthStatus}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      title="Refresh health status for all servers"
                    >
                      <span>{loading ? '⏳' : '🔄'}</span>
                      <span>Refresh Health</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <span>➕</span>
                    <span>Add PowerDNS Server</span>
                  </button>
                </div>
              </div>

              {/* Quick Setup Cards for new users */}
              {settings.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Built-in PowerDNS Option */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-green-500 text-2xl">🚀</span>
                      <h4 className="font-semibold text-green-800">Quick Test Setup</h4>
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Recommended</span>
                    </div>
                    <p className="text-sm text-green-700 mb-3">
                      Use our built-in PowerDNS instance for testing and learning DNSMate.
                    </p>
                    <div className="bg-green-100 p-3 rounded-lg mb-3">
                      <div className="text-xs font-medium text-green-800 mb-2">Test Server Details:</div>
                      <div className="space-y-1 text-xs text-green-700 font-mono">
                        <div>🌐 URL: http://powerdns:8081</div>
                        <div>🔑 API Key: dnsmate-test-key</div>
                        <div>📝 Name: Test PowerDNS</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Check if test server already exists
                        const existingTestServer = settings.find(s => 
                          s.api_url.toLowerCase().includes('powerdns:8081') || 
                          s.name.toLowerCase().includes('test')
                        );
                        
                        if (existingTestServer) {
                          toast(`Test server "${existingTestServer.name}" already exists. You can edit it from the servers list below.`, {
                            icon: 'ℹ️',
                            duration: 4000
                          });
                          return;
                        }
                        
                        setFormData({
                          name: 'Test PowerDNS',
                          api_url: 'http://powerdns:8081',
                          api_key: 'dnsmate-test-key',
                          description: 'Built-in PowerDNS instance for testing',
                          is_default: settings.length === 0, // Only set as default if no servers exist
                          timeout: 30,
                          verify_ssl: false,
                          multi_server_mode: false,
                        });
                        setShowCreateForm(true);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                    >
                      <span>⚡</span>
                      <span>Use Test Server</span>
                    </button>
                  </div>

                  {/* Custom PowerDNS Option */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-blue-500 text-2xl">🏢</span>
                      <h4 className="font-semibold text-blue-800">Production Setup</h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Connect to your existing PowerDNS server for production use.
                    </p>
                    <div className="bg-blue-100 p-3 rounded-lg mb-3">
                      <div className="text-xs font-medium text-blue-800 mb-2">You'll need:</div>
                      <ul className="space-y-1 text-xs text-blue-700">
                        <li>• PowerDNS API URL (e.g., https://dns.example.com:8081)</li>
                        <li>• API key from your PowerDNS configuration</li>
                        <li>• API enabled (api=yes in pdns.conf)</li>
                        <li>• Webserver enabled (webserver=yes)</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
                    >
                      <span>⚙️</span>
                      <span>Configure Custom Server</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Create/Edit Form */}
              {showCreateForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500 text-lg">🌐</span>
                      <h4 className="text-md font-semibold">
                        {editingId ? 'Edit PowerDNS Server' : 'Add New PowerDNS Server'}
                      </h4>
                    </div>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600 text-lg"
                      title="Close form"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                          <span>📝</span>
                          <span>Server Name *</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                            formData.name && settings.some(s => s.name.toLowerCase() === formData.name.toLowerCase() && s.id !== editingId)
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300'
                          }`}
                          placeholder="e.g., Production PowerDNS"
                          required
                        />
                        {formData.name && settings.some(s => s.name.toLowerCase() === formData.name.toLowerCase() && s.id !== editingId) && (
                          <div className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                            <span>⚠️</span>
                            <span>A server with this name already exists</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                          <span>🌐</span>
                          <span>API URL *</span>
                        </label>
                        <input
                          type="url"
                          value={formData.api_url}
                          onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                            formData.api_url && settings.some(s => s.api_url.toLowerCase() === formData.api_url.toLowerCase() && s.id !== editingId)
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300'
                          }`}
                          placeholder="http://powerdns:8081"
                          required
                        />
                        {formData.api_url && settings.some(s => s.api_url.toLowerCase() === formData.api_url.toLowerCase() && s.id !== editingId) && (
                          <div className="mt-1 text-xs text-red-600 flex items-center space-x-1">
                            <span>⚠️</span>
                            <span>A server with this URL already exists</span>
                          </div>
                        )}
                        <div className="mt-1 text-xs text-gray-500">
                          Include the protocol (http:// or https://) and port
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                          <span>🔑</span>
                          <span>API Key *</span>
                        </label>
                        <input
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Your PowerDNS API key"
                          required
                        />
                        <div className="mt-1 text-xs text-gray-500">
                          From your PowerDNS configuration (api-key setting)
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                          <span>⏱️</span>
                          <span>Timeout (seconds)</span>
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={formData.timeout}
                          onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="mt-1 text-xs text-gray-500">
                          Connection timeout for API requests
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-1 text-sm font-medium text-gray-700 mb-1">
                        <span>💬</span>
                        <span>Description</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Optional description for this server"
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-3 sm:space-y-0">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.is_default}
                            onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-blue-500">⭐</span>
                          <span className="text-sm text-gray-700">Set as default server</span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.verify_ssl}
                            onChange={(e) => setFormData({ ...formData, verify_ssl: e.target.checked })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-green-500">🔒</span>
                          <span className="text-sm text-gray-700">Verify SSL certificates</span>
                        </label>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <label className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.multi_server_mode}
                            onChange={(e) => setFormData({ ...formData, multi_server_mode: e.target.checked })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                          />
                          <div>
                            <div className="flex items-center space-x-1">
                              <span className="text-purple-500">🌐</span>
                              <span className="text-sm font-medium text-gray-700">Enable multi-server operations</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              When enabled, DNS operations (create, update, delete) will be performed on all active PowerDNS servers concurrently for high availability and redundancy.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <span>{editingId ? '💾' : '🚀'}</span>
                        <span>{editingId ? 'Update Server' : 'Create Server'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Settings List */}
              <div className="bg-white border border-gray-200 rounded-lg">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : settings.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-6xl mb-4">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to get started!</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      Choose one of the options above to connect your first PowerDNS server. 
                      We recommend starting with our test server to explore DNSMate's features.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                      <button
                        onClick={() => {
                          setFormData({
                            name: 'Test PowerDNS',
                            api_url: 'http://powerdns:8081',
                            api_key: 'dnsmate-test-key',
                            description: 'Built-in PowerDNS instance for testing',
                            is_default: true,
                            timeout: 30,
                            verify_ssl: false,
                            multi_server_mode: false,
                          });
                          setShowCreateForm(true);
                        }}
                        className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        <span>🚀</span>
                        <span>Quick Test Setup</span>
                      </button>
                      
                      <span className="text-gray-400 text-sm">or</span>
                      
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        <span>⚙️</span>
                        <span>Configure Custom Server</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Server
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            URL
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Health Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Settings
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {settings.map((setting) => (
                          <tr key={setting.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {setting.name}
                                    {setting.is_default && (
                                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  {setting.description && (
                                    <div className="text-sm text-gray-500">{setting.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {setting.api_url}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                {/* Real-time Health Status */}
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      setting.health_status === 'healthy'
                                        ? 'bg-green-100 text-green-800'
                                        : setting.health_status === 'unhealthy'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    <div className={`w-2 h-2 rounded-full mr-1 ${
                                      setting.health_status === 'healthy'
                                        ? 'bg-green-400'
                                        : setting.health_status === 'unhealthy'
                                        ? 'bg-red-400'
                                        : 'bg-gray-400'
                                    }`}></div>
                                    {setting.health_status === 'healthy' ? 'Healthy' : 
                                     setting.health_status === 'unhealthy' ? 'Unhealthy' : 
                                     'Unknown'}
                                  </span>
                                  {setting.health_response_time_ms && (
                                    <span className="text-xs text-gray-500">
                                      {Math.round(setting.health_response_time_ms)}ms
                                    </span>
                                  )}
                                </div>
                                
                                {/* Database Status */}
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-gray-500">Config:</span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                                      setting.is_active
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {setting.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                
                                {/* Last Check Time */}
                                {setting.last_health_check && (
                                  <div className="text-xs text-gray-400">
                                    Checked: {new Date(setting.last_health_check).toLocaleTimeString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                <div>Timeout: {setting.timeout}s</div>
                                <div>SSL: {setting.verify_ssl ? 'Verified' : 'Disabled'}</div>
                                <div className="flex items-center space-x-1">
                                  <span>Multi-server:</span>
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                      setting.multi_server_mode
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {setting.multi_server_mode ? '🌐 Enabled' : '📍 Disabled'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => testConnection(setting)}
                                  disabled={testingId === setting.id}
                                  className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                                  title="Test connection"
                                >
                                  {testingId === setting.id ? (
                                    <span className="animate-spin">⏳</span>
                                  ) : (
                                    '🔍'
                                  )}
                                </button>
                                <button
                                  onClick={() => handleEdit(setting)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(setting.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Help Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-blue-500 text-lg">💡</span>
                  <h4 className="font-semibold text-blue-800">PowerDNS Configuration Guide</h4>
                </div>
                
                {/* Quick Start Section */}
                <div className="bg-green-100 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-600">🚀</span>
                    <h5 className="font-medium text-green-800">Quick Start with Built-in PowerDNS</h5>
                  </div>
                  <div className="text-sm text-green-700 space-y-1">
                    <div>• DNSMate includes a ready-to-use PowerDNS instance for testing</div>
                    <div>• Start with: <code className="bg-green-200 px-1 rounded">docker compose --profile with-powerdns up -d</code></div>
                    <div>• Use the test server settings above for instant setup</div>
                    <div>• Perfect for learning and development</div>
                  </div>
                </div>

                {/* Production Setup Section */}
                <div className="space-y-2">
                  <h5 className="font-medium text-blue-800 flex items-center space-x-1">
                    <span>🏢</span>
                    <span>Production PowerDNS Setup</span>
                  </h5>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">⚡</span>
                      <span>Ensure your PowerDNS instance has the API enabled: <code className="bg-blue-100 px-1 rounded">api=yes</code> in pdns.conf</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">🔑</span>
                      <span>Set a secure API key: <code className="bg-blue-100 px-1 rounded">api-key=your-secure-key</code> in pdns.conf</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">🌐</span>
                      <span>Enable the webserver: <code className="bg-blue-100 px-1 rounded">webserver=yes, webserver-port=8081</code></span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">🔓</span>
                      <span>Allow API access: <code className="bg-blue-100 px-1 rounded">webserver-allow-from=your-dnsmate-server</code></span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">⭐</span>
                      <span>You can have multiple PowerDNS servers, but only one can be the default</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-0.5">🧪</span>
                      <span>Always use the test button to verify connectivity before saving</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Versioning Tab - Admin only */}
          {activeTab === 'versioning' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Automatic Versioning</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure automatic version creation for zone and record changes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-500">ℹ️</span>
                    <h4 className="font-medium text-blue-900">About Automatic Versioning</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    When enabled, DNSMate automatically creates version snapshots whenever changes are made to zones or records. 
                    This allows you to track changes and rollback if needed.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Auto-versioning Options</h4>
                    
                    {versioningLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={versioningSettings.auto_version_enabled}
                            onChange={(e) => handleVersioningSettingsUpdate({
                              ...versioningSettings,
                              auto_version_enabled: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900">Enable Auto-versioning</span>
                            <p className="text-xs text-gray-500">Master switch for automatic version creation</p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={versioningSettings.auto_version_on_record_change}
                            disabled={!versioningSettings.auto_version_enabled}
                            onChange={(e) => handleVersioningSettingsUpdate({
                              ...versioningSettings,
                              auto_version_on_record_change: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900">Version on Record Changes</span>
                            <p className="text-xs text-gray-500">Create versions when DNS records are added, modified, or deleted</p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={versioningSettings.auto_version_on_zone_change}
                            disabled={!versioningSettings.auto_version_enabled}
                            onChange={(e) => handleVersioningSettingsUpdate({
                              ...versioningSettings,
                              auto_version_on_zone_change: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900">Version on Zone Changes</span>
                            <p className="text-xs text-gray-500">Create versions when zone settings are modified</p>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Retention Settings</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Versions per Zone
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="500"
                          value={versioningSettings.max_versions_per_zone}
                          onChange={(e) => handleVersioningSettingsUpdate({
                            ...versioningSettings,
                            max_versions_per_zone: parseInt(e.target.value)
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Older versions will be automatically deleted when this limit is reached
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Retention Period (Days)
                        </label>
                        <input
                          type="number"
                          min="7"
                          max="365"
                          value={versioningSettings.version_retention_days}
                          onChange={(e) => handleVersioningSettingsUpdate({
                            ...versioningSettings,
                            version_retention_days: parseInt(e.target.value)
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Versions older than this will be automatically deleted
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Auto-versioning:</span>
                      <span className={`ml-2 font-medium ${versioningSettings.auto_version_enabled ? 'text-green-600' : 'text-red-600'}`}>
                        {versioningSettings.auto_version_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Record changes:</span>
                      <span className={`ml-2 font-medium ${versioningSettings.auto_version_on_record_change ? 'text-green-600' : 'text-gray-600'}`}>
                        {versioningSettings.auto_version_on_record_change ? 'Tracked' : 'Not tracked'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Zone changes:</span>
                      <span className={`ml-2 font-medium ${versioningSettings.auto_version_on_zone_change ? 'text-green-600' : 'text-gray-600'}`}>
                        {versioningSettings.auto_version_on_zone_change ? 'Tracked' : 'Not tracked'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Max versions:</span>
                      <span className="ml-2 font-medium text-gray-900">{versioningSettings.max_versions_per_zone}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-500 mt-0.5">⚠️</span>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Automatic versioning applies to all zones and users</li>
                        <li>Manual versions can still be created regardless of these settings</li>
                        <li>Version cleanup runs daily and cannot be undone</li>
                        <li>Large zones may create significant storage overhead</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Tab - Available to all users */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Backup & Export</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Download backups of your zones, records, and configurations.
                </p>
              </div>

              {user?.role === 'admin' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-blue-500">💡</span>
                    <h4 className="font-medium text-blue-800">Zone Versioning</h4>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    For zone-specific versioning and rollback capabilities, visit individual zones from the Zones page. 
                    Zone versioning allows you to track changes and restore previous versions.
                  </p>
                  <div className="flex items-center space-x-4">
                    <a 
                      href="/zones" 
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      → Go to Zones
                    </a>
                    <a 
                      href="#versioning" 
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      onClick={() => setActiveTab('versioning')}
                    >
                      → Configure Auto-Versioning
                    </a>
                  </div>
                </div>
              )}

              <div className="bg-white">
                <BackupManager />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
