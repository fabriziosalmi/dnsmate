import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './ui/Icons';
import { Badge, Button, Card } from './ui/DesignSystem';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (path: string) => {
    if (path === '/zones') {
      return location.pathname === '/zones' || location.pathname.startsWith('/zones/');
    }
    return location.pathname === path;
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Icons.Home,
      show: true,
    },
    {
      name: 'DNS Zones',
      href: '/zones',
      icon: Icons.Globe,
      show: true,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Icons.Settings,
      show: true,
    },
    {
      name: 'Users',
      href: '/users',
      icon: Icons.Users,
      show: user?.role === 'admin',
    },
  ].filter(item => item.show);

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'warning';
      case 'reader': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="h-10 w-10 dns-gradient rounded-xl flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-300 group-hover:scale-105">
                  <Icons.Globe className="h-6 w-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="text-xl font-bold text-gradient">DNSMate</span>
                  <p className="text-xs text-gray-500 -mt-1">DNS Management</p>
                </div>
              </Link>
            </div>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              {navigation.map((item) => {
                const isItemActive = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isItemActive
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    } inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium transition-all duration-200 rounded-t-lg group`}
                  >
                    <item.icon className={`h-4 w-4 mr-2 transition-transform duration-200 ${isItemActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'} ${isItemActive ? 'group-hover:scale-110' : ''}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu and Actions */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email
                  }
                </div>
                <div className="flex items-center justify-end space-x-1 mt-1">
                  <Badge variant={getRoleColor(user?.role) as any} size="sm">
                    {user?.role}
                  </Badge>
                  {user?.is_superuser && (
                    <Badge variant="primary" size="sm">
                      Super
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Avatar */}
              <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center ring-2 ring-gray-100 hover:ring-blue-200 transition-all duration-200">
                <span className="text-sm font-semibold text-gray-700">
                  {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <Button 
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              icon={<Icons.Settings className="h-4 w-4" />}
            >
              Logout
            </Button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <Icons.Close className="h-6 w-6" />
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-2">
            {navigation.map((item) => {
              const isItemActive = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isItemActive
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } flex items-center px-3 py-2 border-l-4 text-base font-medium rounded-r-lg transition-all duration-200`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
          
          {/* Mobile user section */}
          <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
            <Card variant="glass" padding="sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-700">
                    {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user?.email
                    }
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    <Badge variant={getRoleColor(user?.role) as any} size="sm">
                      {user?.role}
                    </Badge>
                    {user?.is_superuser && (
                      <Badge variant="primary" size="sm">
                        Super
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                variant="primary"
                size="sm"
                fullWidth
                icon={<Icons.Settings className="h-4 w-4" />}
              >
                Logout
              </Button>
            </Card>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
