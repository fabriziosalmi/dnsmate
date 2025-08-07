import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Enhanced request retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// Extended config interface for metadata
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: { startTime: number };
  _retry?: boolean;
  _retryCount?: number;
}

// API error response interface
interface APIErrorResponse {
  detail?: string;
  message?: string;
}

// Simple cache implementation
class APICache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl = 300000) { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
  
  delete(key: string) {
    this.cache.delete(key);
  }
}

const apiCache = new APICache();

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with retry logic
api.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for performance monitoring
    config.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Calculate and log response time
    const config = response.config as ExtendedAxiosRequestConfig;
    const responseTime = Date.now() - (config.metadata?.startTime || Date.now());
    
    // Log slow requests
    if (responseTime > 3000) {
      console.warn(`Slow API request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${responseTime}ms`);
    }
    
    // Add response time to headers for monitoring
    response.headers['x-response-time'] = `${responseTime}ms`;
    
    return response;
  },
  async (error: AxiosError<APIErrorResponse>) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig;
    
    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear token and redirect to login
      localStorage.removeItem('token');
      apiCache.clear(); // Clear cache on auth failure
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Retry logic for failed requests
    const retryConfig: RetryConfig = {
      retries: 3,
      retryDelay: 1000,
      retryCondition: (err) => {
        // Retry on network errors and 5xx server errors
        return !err.response || (err.response.status >= 500 && err.response.status < 600);
      }
    };
    
    if (
      retryConfig.retryCondition &&
      retryConfig.retryCondition(error) &&
      (!originalRequest._retryCount || originalRequest._retryCount < retryConfig.retries)
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = retryConfig.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
      
      console.log(`Retrying request (${originalRequest._retryCount}/${retryConfig.retries}) after ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api.request(originalRequest);
    }
    
    // Enhanced error handling
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    // Log error details for monitoring
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: errorMessage,
      requestId: error.response?.headers['x-request-id']
    });
    
    return Promise.reject(error);
  }
);

// Enhanced API methods with caching support
const enhancedAPI = {
  // GET with caching
  get: async (url: string, config?: AxiosRequestConfig & { useCache?: boolean; cacheTTL?: number }) => {
    const { useCache = false, cacheTTL = 300000, ...axiosConfig } = config || {};
    
    if (useCache) {
      const cached = apiCache.get(url);
      if (cached) {
        return { data: cached };
      }
    }
    
    const response = await api.get(url, axiosConfig);
    
    if (useCache) {
      apiCache.set(url, response.data, cacheTTL);
    }
    
    return response;
  },
  
  // POST, PUT, PATCH, DELETE - invalidate cache
  post: async (url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await api.post(url, data, config);
    // Invalidate related cache entries
    apiCache.delete(url);
    return response;
  },
  
  put: async (url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await api.put(url, data, config);
    apiCache.delete(url);
    return response;
  },
  
  patch: async (url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await api.patch(url, data, config);
    apiCache.delete(url);
    return response;
  },
  
  delete: async (url: string, config?: AxiosRequestConfig) => {
    const response = await api.delete(url, config);
    apiCache.delete(url);
    return response;
  }
};

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'editor' | 'reader';
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export interface Zone {
  id?: number;
  name: string;
  kind: string;
  serial?: number;
  masters?: string[];
  account?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Record {
  id?: number;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  ttl?: number;
  priority?: number;
  disabled: boolean;
}

export interface ZonePermission {
  id: number;
  user_id: number;
  zone_name: string;
  can_read: boolean;
  can_write: boolean;
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/jwt/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const response = await api.post('/auth/register/register', userData);
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/jwt/logout');
    localStorage.removeItem('token');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/api/users/');
    return response.data;
  },

  updateUser: async (userId: number, userData: Partial<User>): Promise<User> => {
    const response = await api.patch(`/api/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/api/users/${userId}`);
  },

  getUserPermissions: async (userId: number): Promise<ZonePermission[]> => {
    const response = await api.get(`/api/users/${userId}/permissions`);
    return response.data;
  },

  createUserPermission: async (userId: number, permission: {
    zone_name: string;
    can_read: boolean;
    can_write: boolean;
  }): Promise<ZonePermission> => {
    const response = await api.post(`/api/users/${userId}/permissions`, {
      user_id: userId,
      ...permission,
    });
    return response.data;
  },

  deleteUserPermission: async (userId: number, permissionId: number): Promise<void> => {
    await api.delete(`/api/users/${userId}/permissions/${permissionId}`);
  },
};

// Zones API
export const zonesAPI = {
  getZones: async (): Promise<Zone[]> => {
    const response = await api.get('/api/zones/');
    return response.data;
  },

  getZone: async (zoneName: string): Promise<Zone> => {
    const response = await api.get(`/api/zones/${zoneName}`);
    return response.data;
  },

  createZone: async (zoneData: {
    name: string;
    kind: string;
    masters?: string[];
    account?: string;
  }): Promise<Zone> => {
    const response = await api.post('/api/zones/', zoneData);
    return response.data;
  },

  deleteZone: async (zoneName: string): Promise<void> => {
    await api.delete(`/api/zones/${zoneName}`);
  },
};

// Records API
export const recordsAPI = {
  getRecords: async (zoneName: string): Promise<Record[]> => {
    const response = await api.get(`/api/records/${zoneName}`);
    return response.data;
  },

  createRecord: async (zoneName: string, recordData: {
    name: string;
    type: string;
    content: string;
    ttl?: number;
    priority?: number;
    disabled?: boolean;
  }): Promise<Record> => {
    const response = await api.post(`/api/records/${zoneName}`, recordData);
    return response.data;
  },

  updateRecord: async (
    zoneName: string,
    recordName: string,
    recordType: string,
    recordData: {
      content?: string;
      ttl?: number;
      priority?: number;
      disabled?: boolean;
    }
  ): Promise<void> => {
    await api.put(`/api/records/${zoneName}/${recordName}/${recordType}`, recordData);
  },

  deleteRecord: async (
    zoneName: string,
    recordName: string,
    recordType: string
  ): Promise<void> => {
    await api.delete(`/api/records/${zoneName}/${recordName}/${recordType}`);
  },
};

// Tokens API
export const tokensAPI = {
  getTokens: async () => {
    const response = await api.get('/api/tokens/');
    return response.data;
  },

  createToken: async (tokenData: {
    name: string;
    expires_days?: number | null;
  }) => {
    const response = await api.post('/api/tokens/', tokenData);
    return response.data;
  },

  deleteToken: async (tokenId: number): Promise<void> => {
    await api.delete(`/api/tokens/${tokenId}`);
  },

  updateToken: async (tokenId: number, data: { is_active?: boolean }): Promise<void> => {
    await api.patch(`/api/tokens/${tokenId}`, data);
  },
};

// Versioning API
export const versioningAPI = {
  getZoneVersions: async (zoneName: string) => {
    const response = await api.get(`/api/zones/${zoneName}/versions`);
    return response.data;
  },

  createVersion: async (zoneName: string, data: {
    description?: string;
    changes_summary?: string;
  }) => {
    const response = await api.post(`/api/zones/${zoneName}/versions`, data);
    return response.data;
  },

  rollbackToVersion: async (zoneName: string, versionId: number, description?: string) => {
    const response = await api.post(`/api/zones/${zoneName}/versions/${versionId}/rollback`, {
      description,
    });
    return response.data;
  },

  compareVersions: async (zoneName: string, version1Id: number, version2Id: number) => {
    const response = await api.get(
      `/api/zones/${zoneName}/versions/compare/${version1Id}/${version2Id}`
    );
    return response.data;
  },

  downloadVersion: async (zoneName: string, versionId: number): Promise<Blob> => {
    const response = await api.get(`/api/zones/${zoneName}/versions/${versionId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Backup API
export const backupAPI = {
  downloadZoneBackup: async (zoneName: string): Promise<Blob> => {
    const response = await api.get(`/api/zones/${zoneName}/backup`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadUserBackup: async (): Promise<Blob> => {
    const response = await api.get('/api/zones/backup/all', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Export enhanced API and cache utilities
export { enhancedAPI as api, apiCache };
export default api;

// Generic API service for direct usage
export const apiService = api;
