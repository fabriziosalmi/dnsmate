import React, { useState, useEffect, useCallback } from 'react';
import { versioningAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface ZoneVersion {
  id: number;
  zone_name: string;
  version_number: number;
  description?: string;
  changes_summary?: string;
  created_at: string;
  user: {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface VersionComparison {
  zone_changes: {
    added: Record<string, any>;
    removed: Record<string, any>;
    modified: Record<string, any>;
  };
  record_changes: {
    added: any[];
    removed: any[];
    modified: any[];
  };
  version1: {
    id: number;
    version_number: number;
    created_at: string;
  };
  version2: {
    id: number;
    version_number: number;
    created_at: string;
  };
}

interface ZoneVersioningProps {
  zoneName: string;
  onVersionChange?: () => void;
}

export const ZoneVersioning: React.FC<ZoneVersioningProps> = ({ 
  zoneName, 
  onVersionChange 
}) => {
  const [versions, setVersions] = useState<ZoneVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    description: '',
    changes_summary: '',
  });
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const fetchVersions = useCallback(async () => {
    try {
      const data = await versioningAPI.getZoneVersions(zoneName);
      setVersions(data);
    } catch (error) {
      toast.error('Failed to fetch zone versions');
    } finally {
      setLoading(false);
    }
  }, [zoneName]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await versioningAPI.createVersion(zoneName, createForm);
      setCreateForm({ description: '', changes_summary: '' });
      setShowCreateForm(false);
      await fetchVersions();
      toast.success('Version created successfully');
      onVersionChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create version');
    }
  };

  const handleRollback = async (versionId: number, versionNumber: number) => {
    if (!window.confirm(`Are you sure you want to rollback to version ${versionNumber}? This will create a new version with the rolled-back state.`)) {
      return;
    }

    try {
      await versioningAPI.rollbackToVersion(zoneName, versionId, `Rollback to version ${versionNumber}`);
      await fetchVersions();
      toast.success(`Successfully rolled back to version ${versionNumber}`);
      onVersionChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to rollback');
    }
  };

  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) {
      toast.error('Please select exactly 2 versions to compare');
      return;
    }

    try {
      const [version1Id, version2Id] = selectedVersions;
      const comparisonData = await versioningAPI.compareVersions(zoneName, version1Id, version2Id);
      setComparison(comparisonData);
      setShowComparison(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to compare versions');
    }
  };

  const toggleVersionSelection = (versionId: number) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        // Replace the first selected version
        return [prev[1], versionId];
      }
    });
  };

  const formatUserName = (user: ZoneVersion['user']) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Zone Versions</h3>
        <div className="space-x-2">
          {selectedVersions.length === 2 && (
            <button
              onClick={handleCompareVersions}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Compare Selected
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Create Version
          </button>
        </div>
      </div>

      {selectedVersions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            {selectedVersions.length === 1 
              ? 'Select one more version to compare'
              : `${selectedVersions.length} versions selected. Click "Compare Selected" to see differences.`
            }
          </p>
          <button
            onClick={() => setSelectedVersions([])}
            className="text-sm text-blue-600 hover:text-blue-800 mt-1"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Create Version Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Create Version Snapshot</h4>
          <form onSubmit={handleCreateVersion} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Brief description of this version"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Changes Summary
              </label>
              <textarea
                value={createForm.changes_summary}
                onChange={(e) => setCreateForm({ ...createForm, changes_summary: e.target.value })}
                placeholder="Detailed summary of changes made"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Version
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Versions List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {versions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No versions found. Create your first version to track changes.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {versions.map((version) => (
                  <tr key={version.id} className={selectedVersions.includes(version.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedVersions.includes(version.id)}
                        onChange={() => toggleVersionSelection(version.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      v{version.version_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div>
                        {version.description && (
                          <div className="font-medium">{version.description}</div>
                        )}
                        {version.changes_summary && (
                          <div className="text-gray-500 text-xs mt-1">{version.changes_summary}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatUserName(version.user)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(version.created_at).toLocaleDateString()} {new Date(version.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRollback(version.id, version.version_number)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Rollback
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comparison Modal */}
      {showComparison && comparison && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Version Comparison: v{comparison.version1.version_number} vs v{comparison.version2.version_number}
                </h3>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>

              <div className="space-y-6 max-h-96 overflow-y-auto">
                {/* Zone Changes */}
                {(Object.keys(comparison.zone_changes.added).length > 0 ||
                  Object.keys(comparison.zone_changes.removed).length > 0 ||
                  Object.keys(comparison.zone_changes.modified).length > 0) && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Zone Configuration Changes</h4>
                    {Object.keys(comparison.zone_changes.added).length > 0 && (
                      <div className="mb-2">
                        <span className="text-green-600 font-medium">Added:</span>
                        <pre className="text-sm bg-green-50 p-2 rounded mt-1">
                          {JSON.stringify(comparison.zone_changes.added, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Object.keys(comparison.zone_changes.modified).length > 0 && (
                      <div className="mb-2">
                        <span className="text-yellow-600 font-medium">Modified:</span>
                        <pre className="text-sm bg-yellow-50 p-2 rounded mt-1">
                          {JSON.stringify(comparison.zone_changes.modified, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Object.keys(comparison.zone_changes.removed).length > 0 && (
                      <div>
                        <span className="text-red-600 font-medium">Removed:</span>
                        <pre className="text-sm bg-red-50 p-2 rounded mt-1">
                          {JSON.stringify(comparison.zone_changes.removed, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Record Changes */}
                {(comparison.record_changes.added.length > 0 ||
                  comparison.record_changes.removed.length > 0 ||
                  comparison.record_changes.modified.length > 0) && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">DNS Record Changes</h4>
                    
                    {comparison.record_changes.added.length > 0 && (
                      <div className="mb-4">
                        <span className="text-green-600 font-medium">Added Records ({comparison.record_changes.added.length}):</span>
                        <div className="space-y-1 mt-1">
                          {comparison.record_changes.added.map((record, index) => (
                            <div key={index} className="text-sm bg-green-50 p-2 rounded">
                              <span className="font-mono">{record.name}</span> {record.type} {record.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {comparison.record_changes.modified.length > 0 && (
                      <div className="mb-4">
                        <span className="text-yellow-600 font-medium">Modified Records ({comparison.record_changes.modified.length}):</span>
                        <div className="space-y-2 mt-1">
                          {comparison.record_changes.modified.map((change, index) => (
                            <div key={index} className="text-sm bg-yellow-50 p-2 rounded">
                              <div className="font-mono">{change.old.name} {change.old.type}</div>
                              <div className="text-red-600">- {change.old.content}</div>
                              <div className="text-green-600">+ {change.new.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {comparison.record_changes.removed.length > 0 && (
                      <div>
                        <span className="text-red-600 font-medium">Removed Records ({comparison.record_changes.removed.length}):</span>
                        <div className="space-y-1 mt-1">
                          {comparison.record_changes.removed.map((record, index) => (
                            <div key={index} className="text-sm bg-red-50 p-2 rounded">
                              <span className="font-mono">{record.name}</span> {record.type} {record.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* No Changes */}
                {Object.keys(comparison.zone_changes.added).length === 0 &&
                 Object.keys(comparison.zone_changes.removed).length === 0 &&
                 Object.keys(comparison.zone_changes.modified).length === 0 &&
                 comparison.record_changes.added.length === 0 &&
                 comparison.record_changes.removed.length === 0 &&
                 comparison.record_changes.modified.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No differences found between these versions.
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowComparison(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
