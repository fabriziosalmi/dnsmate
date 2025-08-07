import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePowerDNSStatus } from '../hooks/usePowerDNSStatus';
import { Card, Button, Badge } from './ui/DesignSystem';
import { Icons, PageHeader, PageContainer } from './ui/Icons';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Check PowerDNS status and notify admin users if not configured
  usePowerDNSStatus();

  const quickActions = [
    {
      title: 'Create New Zone',
      description: 'Set up a new DNS zone',
      icon: Icons.Plus,
      href: '/zones',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      show: user?.role === 'admin' || user?.role === 'editor',
    },
    {
      title: 'View All Zones',
      description: 'Browse existing DNS zones',
      icon: Icons.Globe,
      href: '/zones',
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      show: true,
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions',
      icon: Icons.Users,
      href: '/users',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      show: user?.role === 'admin',
    },
    {
      title: 'Settings',
      description: 'Configure system settings',
      icon: Icons.Settings,
      href: '/settings',
      color: 'bg-gradient-to-br from-gray-500 to-gray-600',
      show: true,
    },
  ].filter(action => action.show);

  const stats = [
    {
      title: 'DNS Zones',
      value: '-',
      description: 'Total zones managed',
      icon: Icons.Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'DNS Records',
      value: '-',
      description: 'Total records across all zones',
      icon: Icons.Database,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Active Users',
      value: '-',
      description: 'Users with access',
      icon: Icons.Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      show: user?.role === 'admin',
    },
  ].filter(stat => stat.show !== false);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.first_name || user?.email}! Here's an overview of your DNS management system.`}
      />
      
      <PageContainer>
        <div className="space-y-8">
          {/* Welcome Card */}
          <Card variant="elevated" className="dns-gradient text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h2 className="text-3xl font-bold">Welcome to DNSMate</h2>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                      v1.0
                    </span>
                  </div>
                  <p className="text-lg text-blue-100 mb-4">
                    Professional DNS Management Interface for PowerDNS instances
                  </p>
                  <div className="flex items-center space-x-4 text-blue-100 mb-6">
                    <div className="flex items-center space-x-2">
                      <Icons.Users className="h-4 w-4" />
                      <span className="text-sm">Logged in as <span className="font-medium text-white">{user?.email}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Icons.Shield className="h-4 w-4" />
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/zones"
                      className="inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-white/30"
                    >
                      <Icons.Globe className="h-5 w-5 mr-2" />
                      Manage Zones
                    </Link>
                    <Link
                      to="/settings"
                      className="inline-flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium rounded-xl transition-all duration-200 border border-white/20"
                    >
                      <Icons.Settings className="h-5 w-5 mr-2" />
                      Settings
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <Icons.Server className="h-32 w-32 text-white/30" />
                </div>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
              <Card key={index} variant="elevated" className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                      <stat.icon className={`h-7 w-7 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="ml-5 flex-1">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                      {stat.title}
                    </h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => (
                <Card 
                  key={index} 
                  variant="elevated"
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
                >
                  <Link to={action.href} className="block">
                    <div className="flex flex-col items-center text-center p-2">
                      <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                        <action.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="mt-4 flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                          {action.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {action.description}
                        </p>
                      </div>
                      <Icons.ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 mt-3 transition-colors duration-200" />
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
                <Badge variant="success">Online</Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">DNS Service</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">API Service</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Database</span>
                  </div>
                  <span className="text-sm font-medium text-yellow-600">Monitoring</span>
                </div>
              </div>
            </Card>

            <Card variant="elevated">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
              <div className="text-center py-8">
                <Icons.InformationCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Activity tracking will be available in a future update.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Check back soon for detailed logs and analytics.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default Dashboard;
