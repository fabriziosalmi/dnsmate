import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Button, Input, Card, Alert } from './ui/DesignSystem';
import { Icons } from './ui/Icons';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      toast.success('Login successful! Welcome to DNSMate.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-20 w-20 dns-gradient rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Icons.Globe className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-gradient">
              DNSMate
            </h1>
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-600">
              Professional DNS Management Interface for PowerDNS
            </p>
          </div>
        </div>

        {/* Login Form */}
        <Card variant="elevated" className="animate-slide-up" padding="lg">
          {error && (
            <div className="mb-6">
              <Alert 
                variant="error" 
                title="Authentication Failed"
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                variant="filled"
                icon={<Icons.Users className="h-4 w-4" />}
                helpText="Enter your DNSMate account email"
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                variant="filled"
                icon={<Icons.Lock className="h-4 w-4" />}
                iconPosition="left"
              />
              
              {/* Custom password toggle */}
              <div className="relative -mt-12 flex justify-end pr-3">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <Icons.EyeOff className="h-4 w-4" />
                  ) : (
                    <Icons.Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  Forgot password?
                </button>
              </div>
              <div className="text-sm text-gray-500">
                Version 1.0
              </div>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              disabled={!email || !password}
              variant="dns"
              size="lg"
              fullWidth
              icon={!isLoading ? <Icons.Shield className="h-4 w-4" /> : undefined}
            >
              {isLoading ? 'Authenticating...' : 'Sign In to DNSMate'}
            </Button>
          </form>
        </Card>

        {/* Features */}
        <Card variant="glass" padding="md" className="text-center">
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
            <div className="space-y-1">
              <Icons.Shield className="h-5 w-5 mx-auto text-green-500" />
              <p>Secure</p>
            </div>
            <div className="space-y-1">
              <Icons.Server className="h-5 w-5 mx-auto text-blue-500" />
              <p>PowerDNS</p>
            </div>
            <div className="space-y-1">
              <Icons.Globe className="h-5 w-5 mx-auto text-emerald-500" />
              <p>DNS Expert</p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500">
            Secure DNS management powered by PowerDNS
          </p>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>© 2024 DNSMate</span>
            <span>•</span>
            <a href="#" className="hover:text-gray-600 transition-colors">Documentation</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-600 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
