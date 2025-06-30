import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
    const response = await api.get(`/api/versioning/${zoneName}/versions`);
    return response.data;
  },

  createVersion: async (zoneName: string, data: {
    description?: string;
    changes_summary?: string;
  }) => {
    const response = await api.post(`/api/versioning/${zoneName}/versions`, data);
    return response.data;
  },

  rollbackToVersion: async (zoneName: string, versionId: number, description?: string) => {
    const response = await api.post(`/api/versioning/${zoneName}/rollback/${versionId}`, {
      description,
    });
    return response.data;
  },

  compareVersions: async (zoneName: string, version1Id: number, version2Id: number) => {
    const response = await api.get(
      `/api/versioning/${zoneName}/compare/${version1Id}/${version2Id}`
    );
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

export default api;

// Generic API service for direct usage
export const apiService = api;
