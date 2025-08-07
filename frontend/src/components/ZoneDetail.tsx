import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { recordsAPI, zonesAPI, Zone } from '../services/api';
import { toast } from 'react-hot-toast';

interface Record {
  id?: number;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  ttl?: number;
  priority?: number;
  disabled: boolean;
}

const ZoneDetail: React.FC = () => {
  const { zoneName } = useParams<{ zoneName: string }>();
  const [zone, setZone] = useState<Zone | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'discovery' | 'security'>('records');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    name: '',
    type: 'A',
    content: '',
    ttl: 3600,
    disabled: false,
  });

  const fetchZoneDetails = useCallback(async () => {
    if (!zoneName) return;
    
    try {
      const [zoneData, recordsData] = await Promise.all([
        zonesAPI.getZone(zoneName),
        recordsAPI.getRecords(zoneName),
      ]);
      setZone(zoneData);
      setRecords(recordsData);
    } catch (error) {
      toast.error('Failed to fetch zone details');
    } finally {
      setLoading(false);
    }
  }, [zoneName]);

  useEffect(() => {
    fetchZoneDetails();
  }, [fetchZoneDetails]);

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName) return;

    try {
      await recordsAPI.createRecord(zoneName, newRecord);
      setNewRecord({
        name: '',
        type: 'A',
        content: '',
        ttl: 3600,
        disabled: false,
      });
      setShowAddRecord(false);
      await fetchZoneDetails();
      toast.success('Record added successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add record');
    }
  };

  const handleDeleteRecord = async (recordName: string, recordType: string) => {
    if (!zoneName) return;
    
    if (!window.confirm(`Are you sure you want to delete the ${recordType} record for ${recordName}?`)) {
      return;
    }

    try {
      await recordsAPI.deleteRecord(zoneName, recordName, recordType);
      await fetchZoneDetails();
      toast.success('Record deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete record');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!zone || !zoneName) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Zone not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{zone.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Type: {zone.kind} | Serial: {zone.serial}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {zone.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('records')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'records'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              DNS Records ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'discovery'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Discovery
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔒 Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'records' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">DNS Records</h3>
                <button
                  onClick={() => setShowAddRecord(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Record
                </button>
              </div>

              {/* Add Record Form */}
              {showAddRecord && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Add DNS Record</h4>
                  <form onSubmit={handleAddRecord} className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newRecord.name}
                        onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
                        placeholder="www"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={newRecord.type}
                        onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="A">A</option>
                        <option value="AAAA">AAAA</option>
                        <option value="CNAME">CNAME</option>
                        <option value="MX">MX</option>
                        <option value="TXT">TXT</option>
                        <option value="NS">NS</option>
                        <option value="SRV">SRV</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                      </label>
                      <input
                        type="text"
                        value={newRecord.content}
                        onChange={(e) => setNewRecord({ ...newRecord, content: e.target.value })}
                        placeholder="192.168.1.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TTL
                      </label>
                      <input
                        type="number"
                        value={newRecord.ttl}
                        onChange={(e) => setNewRecord({ ...newRecord, ttl: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="col-span-2 flex space-x-3">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Add Record
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddRecord(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TTL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {record.content}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.ttl}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              record.disabled
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {record.disabled ? 'Disabled' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteRecord(record.name, record.type)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {records.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No DNS records found</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'discovery' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">DNS Discovery</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Discover and analyze DNS configuration for {zoneName}
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-500">🚧</span>
                  <h4 className="font-medium text-yellow-800">Coming Soon</h4>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  DNS discovery features are being developed. This will include:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                  <li>Automatic subdomain detection</li>
                  <li>DNS propagation analysis</li>
                  <li>External DNS checker integration</li>
                  <li>Zone health monitoring</li>
                  <li>Configuration recommendations</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">DNS Security</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Security analysis and recommendations for {zoneName}
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-500">🚧</span>
                  <h4 className="font-medium text-blue-800">Coming Soon</h4>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  DNS security features are being developed. This will include:
                </p>
                <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                  <li>DNSSEC validation and configuration</li>
                  <li>Security policy recommendations</li>
                  <li>Vulnerability scanning</li>
                  <li>Rate limiting configuration</li>
                  <li>Access control analysis</li>
                  <li>Certificate monitoring (for TLSA records)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZoneDetail;
