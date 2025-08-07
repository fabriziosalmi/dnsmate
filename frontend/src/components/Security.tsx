import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';

interface SecurityEvent {
  id: number;
  event_type: string;
  description: string;
  user_ip: string;
  user_agent: string;
  created_at: string;
  success: boolean;
}

interface PasswordChangeForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface TwoFactorSettings {
  enabled: boolean;
  secret?: string;
  backup_codes?: string[];
  qr_code?: string;
}

const Security: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth(); // Reserved for future user-specific security settings
  const [activeTab, setActiveTab] = useState<'password' | 'sessions' | '2fa' | 'events'>('password');
  const [loading, setLoading] = useState(false);
  
  // Password change
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordStrength, setPasswordStrength] = useState<{score: number; description: string} | null>(null);
  
  // Two-factor authentication
  const [twoFactorSettings, setTwoFactorSettings] = useState<TwoFactorSettings>({
    enabled: false
  });
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  
  // Security events
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  
  // Active sessions (placeholder for future implementation)
  // const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    if (activeTab === 'events') {
      fetchSecurityEvents();
    } else if (activeTab === '2fa') {
      fetch2FASettings();
    }
  }, [activeTab]);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/security/events');
      setSecurityEvents(response.data);
    } catch (error) {
      toast.error('Failed to fetch security events');
    } finally {
      setLoading(false);
    }
  };

  const fetch2FASettings = async () => {
    try {
      const response = await apiService.get('/api/security/2fa');
      setTwoFactorSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch 2FA settings:', error);
    }
  };

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

  const handleEnable2FA = async () => {
    try {
      const response = await apiService.post('/api/security/2fa/enable');
      setTwoFactorSettings(response.data);
      setShowTwoFactorSetup(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to enable 2FA');
    }
  };

  const handleConfirm2FA = async () => {
    try {
      await apiService.post('/api/security/2fa/confirm', {
        code: twoFactorCode
      });
      
      setTwoFactorSettings(prev => ({ ...prev, enabled: true }));
      setShowTwoFactorSetup(false);
      setTwoFactorCode('');
      toast.success('Two-factor authentication enabled successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid verification code');
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    try {
      await apiService.post('/api/security/2fa/disable');
      setTwoFactorSettings({ enabled: false });
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to disable 2FA');
    }
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

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Security Settings
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Manage your account security settings and monitor security events.</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'password', name: 'Password', icon: '🔑' },
              { id: 'sessions', name: 'Sessions', icon: '💻' },
              { id: '2fa', name: 'Two-Factor Auth', icon: '🔐' },
              { id: 'events', name: 'Security Events', icon: '📋' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Change Password</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Use a strong password to protect your account.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
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

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Active Sessions</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your active login sessions across devices.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  <strong>Note:</strong> Session management features are coming soon. For now, you can log out to end your current session.
                </p>
              </div>
            </div>
          )}

          {/* Two-Factor Authentication Tab */}
          {activeTab === '2fa' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Add an extra layer of security to your account.
                </p>
              </div>

              {!twoFactorSettings.enabled ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-400 text-xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h5 className="text-sm font-medium text-yellow-800">
                        Two-factor authentication is disabled
                      </h5>
                      <p className="mt-1 text-sm text-yellow-700">
                        Enable 2FA to significantly improve your account security.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={handleEnable2FA}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 text-sm"
                        >
                          Enable Two-Factor Authentication
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-green-400 text-xl">✅</span>
                    </div>
                    <div className="ml-3">
                      <h5 className="text-sm font-medium text-green-800">
                        Two-factor authentication is enabled
                      </h5>
                      <p className="mt-1 text-sm text-green-700">
                        Your account is protected with 2FA.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={handleDisable2FA}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                        >
                          Disable Two-Factor Authentication
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2FA Setup Modal */}
              {showTwoFactorSetup && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h5 className="text-lg font-medium text-gray-900 mb-4">
                    Set up Two-Factor Authentication
                  </h5>
                  
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                    </p>
                    
                    {twoFactorSettings.qr_code && (
                      <div className="flex justify-center">
                        <img src={twoFactorSettings.qr_code} alt="QR Code" className="border rounded" />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Enter verification code from your app:
                      </label>
                      <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        placeholder="123456"
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        maxLength={6}
                      />
                    </div>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleConfirm2FA}
                        disabled={twoFactorCode.length !== 6}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        Verify and Enable
                      </button>
                      <button
                        onClick={() => setShowTwoFactorSetup(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Security Events</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    Monitor security-related activities on your account.
                  </p>
                </div>
                <button
                  onClick={fetchSecurityEvents}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  {securityEvents.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      No security events found.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {securityEvents.map((event) => (
                        <li key={event.id} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                                event.success ? 'bg-green-400' : 'bg-red-400'
                              }`}></div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatEventType(event.event_type)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {event.description}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {event.user_ip} • {new Date(event.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              event.success 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {event.success ? 'Success' : 'Failed'}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Security;
