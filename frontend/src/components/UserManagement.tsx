import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'admin' | 'editor' | 'reader';
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

interface ZonePermission {
  id: number;
  user_id: number;
  zone_name: string;
  can_read: boolean;
  can_write: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  // const [selectedUser, setSelectedUser] = useState<User | null>(null); // Reserved for future user selection features
  const [showPermissions, setShowPermissions] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<{ [key: number]: ZonePermission[] }>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPermission, setNewPermission] = useState({
    zone_name: '',
    can_read: true,
    can_write: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersData = await usersAPI.getUsers();
      setUsers(usersData);
    } catch (error: any) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: number) => {
    try {
      const userPermissions = await usersAPI.getUserPermissions(userId);
      setPermissions(prev => ({ ...prev, [userId]: userPermissions }));
    } catch (error: any) {
      toast.error('Failed to load user permissions');
      console.error(error);
    }
  };

  const handleUpdateUser = async (user: User, updates: Partial<User>) => {
    try {
      const updatedUser = await usersAPI.updateUser(user.id, updates);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      setEditingUser(null);
      toast.success('User updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.email}?`)) {
      return;
    }

    try {
      await usersAPI.deleteUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      toast.success('User deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleAddPermission = async (userId: number) => {
    if (!newPermission.zone_name.trim()) {
      toast.error('Zone name is required');
      return;
    }

    try {
      const permission = await usersAPI.createUserPermission(userId, newPermission);
      setPermissions(prev => ({
        ...prev,
        [userId]: [...(prev[userId] || []), permission]
      }));
      setNewPermission({ zone_name: '', can_read: true, can_write: false });
      toast.success('Permission added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add permission');
    }
  };

  const handleDeletePermission = async (userId: number, permissionId: number) => {
    try {
      await usersAPI.deleteUserPermission(userId, permissionId);
      setPermissions(prev => ({
        ...prev,
        [userId]: (prev[userId] || []).filter(p => p.id !== permissionId)
      }));
      toast.success('Permission removed successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove permission');
    }
  };

  const togglePermissions = async (userId: number) => {
    if (showPermissions === userId) {
      setShowPermissions(null);
    } else {
      setShowPermissions(userId);
      if (!permissions[userId]) {
        await loadUserPermissions(userId);
      }
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'editor': return 'bg-yellow-100 text-yellow-800';
      case 'reader': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={loadUsers}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.email
                        }
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                    {user.is_superuser && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Superuser
                      </span>
                    )}
                    {!user.is_active && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => togglePermissions(user.id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      {showPermissions === user.id ? 'Hide' : 'Show'} Permissions
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {showPermissions === user.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Zone Permissions</h4>
                    
                    {/* Add new permission */}
                    <div className="mb-4 p-3 bg-white rounded border">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Add Permission</h5>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Zone name (e.g., example.com)"
                          value={newPermission.zone_name}
                          onChange={(e) => setNewPermission({ ...newPermission, zone_name: e.target.value })}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={newPermission.can_read}
                            onChange={(e) => setNewPermission({ ...newPermission, can_read: e.target.checked })}
                          />
                          <span className="text-sm">Read</span>
                        </label>
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={newPermission.can_write}
                            onChange={(e) => setNewPermission({ ...newPermission, can_write: e.target.checked })}
                          />
                          <span className="text-sm">Write</span>
                        </label>
                        <button
                          onClick={() => handleAddPermission(user.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Existing permissions */}
                    <div className="space-y-2">
                      {permissions[user.id]?.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div className="flex items-center space-x-4">
                            <span className="font-medium text-sm">{permission.zone_name}</span>
                            <div className="flex space-x-2">
                              {permission.can_read && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Read</span>
                              )}
                              {permission.can_write && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Write</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePermission(user.id, permission.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      )) || (
                        <p className="text-sm text-gray-500">No permissions assigned</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={editingUser.first_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={editingUser.last_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="reader">Reader</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingUser.is_active}
                  onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingUser.is_superuser}
                  onChange={(e) => setEditingUser({ ...editingUser, is_superuser: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">Superuser</label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(users.find(u => u.id === editingUser.id)!, editingUser)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
