import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

interface PowerDNSStatus {
  configured: boolean;
  count: number;
  has_default: boolean;
}

export const usePowerDNSStatus = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [status, setStatus] = useState<PowerDNSStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);

  const checkPowerDNSStatus = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setIsLoading(true);
      const response = await apiService.get('/api/settings/powerdns/status');
      const statusData: PowerDNSStatus = response.data;
      setStatus(statusData);

      // Show notification if no PowerDNS is configured and we haven't shown it yet
      if (!statusData.configured && !hasShownNotification) {
        addNotification({
          type: 'warning',
          title: 'PowerDNS Not Configured',
          message: 'No PowerDNS servers are configured. You need to add at least one PowerDNS server to manage DNS zones.',
          autoClose: false,
          actions: [
            {
              label: 'Configure Now',
              variant: 'primary',
              onClick: () => {
                // Navigate to settings with PowerDNS tab active
                const currentUrl = new URL(window.location.href);
                currentUrl.pathname = '/settings';
                currentUrl.hash = '#powerdns';
                window.location.href = currentUrl.toString();
              }
            },
            {
              label: 'Remind Later',
              variant: 'secondary',
              onClick: () => {
                // Will show again on next session
              }
            }
          ]
        });
        setHasShownNotification(true);
      }
    } catch (error) {
      console.error('Failed to check PowerDNS status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check status when user is admin and component mounts
    if (user?.role === 'admin') {
      checkPowerDNSStatus();
    }
  }, [user]);

  return {
    status,
    isLoading,
    recheckStatus: checkPowerDNSStatus
  };
};
