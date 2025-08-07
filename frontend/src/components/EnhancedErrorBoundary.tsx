import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

interface EnhancedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorId: string; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class EnhancedErrorBoundary extends React.Component<EnhancedErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);
    
    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logErrorToService = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      await apiService.post('/api/monitoring/frontend-error', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        errorId: this.state.errorId
      });
    } catch (e) {
      console.error('Failed to log error to service:', e);
    }
  };

  private retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return (
        <Fallback 
          error={this.state.error!} 
          errorId={this.state.errorId}
          retry={this.retry}
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; errorId: string; retry: () => void }> = ({ 
  error, 
  errorId, 
  retry 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <div className="mt-4 text-center">
          <h1 className="text-lg font-medium text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">
            We're sorry, but something unexpected happened. Our team has been notified.
          </p>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-500">Error ID: {errorId}</p>
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer">Technical details</summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap break-all">
                {error.message}
              </pre>
            </details>
          </div>
          
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={retry}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reload Page
            </button>
          </div>
          
          <div className="mt-4">
            <a
              href="mailto:support@dnsmate.com"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    apiCalls: 0,
    errors: 0
  });

  useEffect(() => {
    // Measure initial load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    setMetrics(prev => ({ ...prev, loadTime }));

    // Monitor API calls and errors
    const originalFetch = window.fetch;
    let apiCallCount = 0;
    let errorCount = 0;

    window.fetch = async (...args) => {
      apiCallCount++;
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          errorCount++;
        }
        setMetrics(prev => ({ 
          ...prev, 
          apiCalls: apiCallCount, 
          errors: errorCount 
        }));
        return response;
      } catch (error) {
        errorCount++;
        setMetrics(prev => ({ 
          ...prev, 
          apiCalls: apiCallCount, 
          errors: errorCount 
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const recordRenderTime = useCallback((componentName: string, time: number) => {
    setMetrics(prev => ({ ...prev, renderTime: time }));
    
    // Send to monitoring service
    if (time > 1000) { // Only report slow renders
      apiService.post('/api/monitoring/performance', {
        type: 'slow_render',
        component: componentName,
        time,
        timestamp: Date.now()
      }).catch(console.error);
    }
  }, []);

  return { metrics, recordRenderTime };
};

// Enhanced loading component with performance tracking
export const EnhancedLoadingSpinner: React.FC<{ 
  message?: string; 
  timeout?: number;
  onTimeout?: () => void;
}> = ({ 
  message = 'Loading...', 
  timeout = 30000,
  onTimeout 
}) => {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTimedOut(true);
      onTimeout?.();
      toast.error('Loading is taking longer than expected. Please try refreshing the page.');
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  if (isTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-center">
          <div className="text-yellow-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Taking longer than expected</h3>
          <p className="text-gray-600 mb-4">The request is taking longer than usual to complete.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
      </div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
};

// Optimized data fetching hook with caching
export const useOptimizedFetch = function<T>(
  url: string, 
  options: {
    enabled?: boolean;
    refetchInterval?: number;
    cacheTime?: number;
    staleTime?: number;
  } = {}
) {
  const {
    enabled = true,
    refetchInterval,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 1 * 60 * 1000   // 1 minute
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    // Check if data is still fresh
    const now = Date.now();
    if (data && (now - lastFetch) < staleTime) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get(url);
      setData(response.data);
      setLastFetch(now);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url, enabled, data, lastFetch, staleTime]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval, enabled]);

  return { data, loading, error, refetch: fetchData };
};

export default EnhancedErrorBoundary;
