import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

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
  created_at: string;
  updated_at: string;
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
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'password' | 'tokens' | 'powerdns'>('password');
  
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
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSettings();
    }
    fetchTokens();
  }, [user]);

  // Handle URL hash to open specific tab
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#powerdns' && user?.role === 'admin') {
      setActiveTab('powerdns');
    } else if (hash === '#tokens') {
      setActiveTab('tokens');
    }
  }, [user]);

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
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/settings/powerdns');
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

  const resetForm = () => {
    setFormData({
      name: '',
      api_url: '',
      api_key: '',
      description: '',
      is_default: false,
      timeout: 30,
      verify_ssl: true,
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
      });
      setEditingId(setting.id);
      setShowCreateForm(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch setting details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Update existing setting
        await apiService.put(`/api/settings/powerdns/${editingId}`, formData);
        toast.success('PowerDNS setting updated successfully');
      } else {
        // Create new setting
        await apiService.post('/api/settings/powerdns', formData);
        toast.success('PowerDNS setting created successfully');
      }
      
      resetForm();
      fetchSettings();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save PowerDNS setting');
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

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('password')}
              className={`${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>🔑</span>
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
              <span>🔐</span>
              <span>API Tokens</span>
            </button>
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
                <span>PowerDNS</span>
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
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">PowerDNS Servers</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage PowerDNS server connections and configurations.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add PowerDNS Server
                </button>
              </div>

              {/* Create/Edit Form */}
              {showCreateForm && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-semibold">
                      {editingId ? 'Edit PowerDNS Server' : 'Add New PowerDNS Server'}
                    </h4>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Server Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Production PowerDNS"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API URL *
                        </label>
                        <input
                          type="url"
                          value={formData.api_url}
                          onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="http://powerdns:8081"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Key *
                        </label>
                        <input
                          type="password"
                          value={formData.api_key}
                          onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Your PowerDNS API key"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={formData.timeout}
                          onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="Optional description"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_default}
                          onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Set as default server</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.verify_ssl}
                          onChange={(e) => setFormData({ ...formData, verify_ssl: e.target.checked })}
                          className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Verify SSL</span>
                      </label>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        {editingId ? 'Update' : 'Create'}
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
                    <div className="text-gray-400 text-4xl mb-4">⚙️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No PowerDNS servers configured</h3>
                    <p className="text-gray-500 mb-4">
                      Add your first PowerDNS server to start managing DNS zones.
                    </p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Add PowerDNS Server
                    </button>
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
                            Status
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
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  setting.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {setting.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                <div>Timeout: {setting.timeout}s</div>
                                <div>SSL: {setting.verify_ssl ? 'Verified' : 'Disabled'}</div>
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
                <h4 className="font-semibold text-blue-800 mb-2">PowerDNS Configuration Help</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Ensure your PowerDNS instance has the API enabled (api=yes in pdns.conf)</li>
                  <li>• Set a secure API key (api-key=your-secure-key in pdns.conf)</li>
                  <li>• Enable the webserver (webserver=yes, webserver-port=8081)</li>
                  <li>• Allow API access from DNSMate (webserver-allow-from=your-dnsmate-server)</li>
                  <li>• You can have multiple PowerDNS servers, but only one can be the default</li>
                  <li>• Use the test button to verify connectivity before saving</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
