import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';

interface ApiToken {
  id: number;
  name: string;
  description?: string;
  token_preview: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
}

interface TokenCreateForm {
  name: string;
  expires_days: number | null;
}

export const TokenManagement: React.FC = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<TokenCreateForm>({
    name: '',
    expires_days: 365,
  });
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await apiService.get('/api/tokens/');
      setTokens(response.data);
    } catch (error) {
      toast.error('Failed to fetch API tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name.trim()) {
      toast.error('Token name is required');
      return;
    }

    try {
      const payload = {
        name: createForm.name,
        expires_days: createForm.expires_days,
      };
      
      const response = await apiService.post('/api/tokens/', payload);
      setNewTokenValue(response.data.token);
      setCreateForm({ name: '', expires_days: 365 });
      setShowCreateForm(false);
      await fetchTokens();
      toast.success('API token created successfully');
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail || 'Failed to create token');
      } else {
        toast.error('Failed to create API token');
      }
    }
  };

  const handleDeleteToken = async (tokenId: number) => {
    if (!window.confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.delete(`/api/tokens/${tokenId}`);
      await fetchTokens();
      toast.success('Token deleted successfully');
    } catch (error) {
      toast.error('Failed to delete token');
    }
  };

  const handleToggleToken = async (tokenId: number, isActive: boolean) => {
    try {
      await apiService.patch(`/api/tokens/${tokenId}`, { is_active: !isActive });
      await fetchTokens();
      toast.success(`Token ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to update token');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">API Tokens</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={tokens.length >= 10}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Create Token
        </button>
      </div>

      {tokens.length >= 10 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            You've reached the maximum limit of 10 API tokens. Delete unused tokens to create new ones.
          </p>
        </div>
      )}

      {/* New Token Display */}
      {newTokenValue && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">New Token Created</h3>
          <p className="text-sm text-green-700 mb-2">
            Save this token securely. You won't be able to see it again.
          </p>
          <div className="flex items-center space-x-2">
            <code className="bg-green-100 px-2 py-1 rounded text-sm font-mono flex-1">
              {newTokenValue}
            </code>
            <button
              onClick={() => copyToClipboard(newTokenValue)}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setNewTokenValue(null)}
            className="mt-2 text-sm text-green-600 hover:text-green-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Token Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Create New API Token</h3>
          <form onSubmit={handleCreateToken} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Name
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Production Server, Development API"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={100}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration
              </label>
              <select
                value={createForm.expires_days || ''}
                onChange={(e) => setCreateForm({ 
                  ...createForm, 
                  expires_days: e.target.value ? parseInt(e.target.value) : null 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Never expires</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="730">2 years</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Token
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tokens List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {tokens.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No API tokens found. Create your first token to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {token.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {token.token_preview}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          token.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {token.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(token.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {token.expires_at ? new Date(token.expires_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {token.last_used_at ? new Date(token.last_used_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleToggleToken(token.id, token.is_active)}
                        className={`${
                          token.is_active
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                      >
                        {token.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteToken(token.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Using API Tokens</h4>
        <p className="text-sm text-blue-700 mb-2">
          Include the token in the Authorization header of your API requests:
        </p>
        <code className="block bg-blue-100 px-3 py-2 rounded text-sm font-mono">
          Authorization: Bearer your-token-here
        </code>
        <p className="text-sm text-blue-700 mt-2">
          API documentation is available at{' '}
          <a href="/docs" className="underline hover:text-blue-900">
            /docs
          </a>{' '}
          and{' '}
          <a href="/redoc" className="underline hover:text-blue-900">
            /redoc
          </a>
        </p>
      </div>
    </div>
  );
};
