import React from 'react';
import { useNotifications, Notification, NotificationType } from '../contexts/NotificationContext';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return 'ℹ️';
  }
};

const getNotificationStyles = (type: NotificationType) => {
  const baseClasses = 'border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out';
  
  switch (type) {
    case 'success':
      return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
    case 'error':
      return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
    case 'warning':
      return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`;
    case 'info':
      return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800`;
    default:
      return `${baseClasses} bg-gray-50 border-gray-200 text-gray-800`;
  }
};

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useNotifications();

  return (
    <div className={getNotificationStyles(notification.type)}>
      <div className="flex">
        <div className="flex-shrink-0">
          <span className="text-xl">{getNotificationIcon(notification.type)}</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{notification.title}</h3>
          <p className="mt-1 text-sm">{notification.message}</p>
          
          {notification.actions && (
            <div className="mt-3 flex space-x-3">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    removeNotification(notification.id);
                  }}
                  className={`text-sm font-medium ${
                    action.variant === 'primary'
                      ? 'bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700'
                      : 'text-blue-600 hover:text-blue-500'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => removeNotification(notification.id)}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

export default NotificationContainer;
