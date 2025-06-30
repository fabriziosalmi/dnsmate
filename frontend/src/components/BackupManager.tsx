import React, { useState } from 'react';
import { backupAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface BackupManagerProps {
  zoneName?: string; // If provided, show zone-specific backup options
}

export const BackupManager: React.FC<BackupManagerProps> = ({ zoneName }) => {
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleZoneBackup = async (zone: string) => {
    setDownloading(prev => ({ ...prev, [zone]: true }));
    
    try {
      const blob = await backupAPI.downloadZoneBackup(zone);
      const filename = `${zone}.zone`;
      downloadFile(blob, filename);
      toast.success(`Zone backup downloaded: ${filename}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to download zone backup');
    } finally {
      setDownloading(prev => ({ ...prev, [zone]: false }));
    }
  };

  const handleUserBackup = async () => {
    setDownloading(prev => ({ ...prev, user: true }));
    
    try {
      const blob = await backupAPI.downloadUserBackup();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `dns-backup-${timestamp}.tar.gz`;
      downloadFile(blob, filename);
      toast.success(`User backup downloaded: ${filename}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to download user backup');
    } finally {
      setDownloading(prev => ({ ...prev, user: false }));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">DNS Backup</h3>
      
      {zoneName ? (
        // Zone-specific backup
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Zone Backup: {zoneName}</h4>
          <p className="text-sm text-gray-600 mb-3">
            Download a BIND-format zone file for this specific zone.
          </p>
          <button
            onClick={() => handleZoneBackup(zoneName)}
            disabled={downloading[zoneName]}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {downloading[zoneName] && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>
              {downloading[zoneName] ? 'Downloading...' : 'Download Zone File'}
            </span>
          </button>
        </div>
      ) : (
        // User backup (all zones)
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Complete Backup</h4>
          <p className="text-sm text-gray-600 mb-3">
            Download a complete backup of all your DNS zones in BIND format, 
            including a named.conf snippet for easy restoration.
          </p>
          <button
            onClick={handleUserBackup}
            disabled={downloading.user}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {downloading.user && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>
              {downloading.user ? 'Preparing Backup...' : 'Download All Zones'}
            </span>
          </button>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">About DNS Backups</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Zone files are in standard BIND format and can be used with any DNS server</li>
          <li>• Complete backups include a named.conf snippet for easy zone configuration</li>
          <li>• Backups contain the current state of your zones and all DNS records</li>
          <li>• Use backups for disaster recovery, migration, or offline zone management</li>
        </ul>
      </div>
    </div>
  );
};
