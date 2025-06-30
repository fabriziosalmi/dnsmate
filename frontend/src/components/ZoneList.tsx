import React, { useState, useEffect } from 'react';
import { Zone, zonesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ZoneList: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newZone, setNewZone] = useState({
    name: '',
    kind: 'Native',
    masters: '',
    account: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const zonesData = await zonesAPI.getZones();
      setZones(zonesData);
    } catch (error: any) {
      toast.error('Failed to fetch zones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const zoneData = {
        name: newZone.name,
        kind: newZone.kind,
        masters: newZone.masters ? newZone.masters.split(',').map(m => m.trim()) : undefined,
        account: newZone.account || undefined,
      };
      
      await zonesAPI.createZone(zoneData);
      toast.success('Zone created successfully');
      setShowCreateForm(false);
      setNewZone({ name: '', kind: 'Native', masters: '', account: '' });
      fetchZones();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create zone');
    }
  };

  const handleDeleteZone = async (zoneName: string) => {
    if (window.confirm(`Are you sure you want to delete zone ${zoneName}?`)) {
      try {
        await zonesAPI.deleteZone(zoneName);
        toast.success('Zone deleted successfully');
        fetchZones();
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'Failed to delete zone');
      }
    }
  };

  const canCreateZone = user?.role === 'admin' || user?.role === 'editor';
  const canDeleteZone = user?.role === 'admin' || user?.role === 'editor';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">DNS Zones</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your DNS zones and records
          </p>
        </div>
        {canCreateZone && (
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              Create Zone
            </button>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Zone</h3>
          <form onSubmit={handleCreateZone} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Zone Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="example.com"
                value={newZone.name}
                onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Zone Type</label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={newZone.kind}
                onChange={(e) => setNewZone({ ...newZone, kind: e.target.value })}
              >
                <option value="Native">Native</option>
                <option value="Master">Master</option>
                <option value="Slave">Slave</option>
              </select>
            </div>
            {newZone.kind === 'Slave' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Masters (comma-separated)</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="192.168.1.1, 192.168.1.2"
                  value={newZone.masters}
                  onChange={(e) => setNewZone({ ...newZone, masters: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Account (optional)</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={newZone.account}
                onChange={(e) => setNewZone({ ...newZone, account: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Zone
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Zone Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Serial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Account
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {zones.map((zone) => (
              <tr key={zone.name}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <a
                    href={`/zones/${zone.name}`}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    {zone.name}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {zone.kind}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {zone.serial || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {zone.account || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canDeleteZone && (
                    <button
                      onClick={() => handleDeleteZone(zone.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {zones.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No zones found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneList;
