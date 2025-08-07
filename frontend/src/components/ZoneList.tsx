import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zone, zonesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  Button, 
  Card, 
  Input, 
  Select, 
  Badge, 
  LoadingSpinner,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell
} from './ui/DesignSystem';
import { Icons, PageHeader, PageContainer, EmptyState } from './ui/Icons';

const ZoneList: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    zone.kind.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (zone.account && zone.account.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canCreateZone = user?.role === 'admin' || user?.role === 'editor';
  const canDeleteZone = user?.role === 'admin' || user?.role === 'editor';

  const getZoneTypeColor = (kind: string) => {
    switch (kind.toLowerCase()) {
      case 'native': return 'primary';
      case 'master': return 'success';
      case 'slave': return 'warning';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="DNS Zones" description="Loading your DNS zones..." />
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="DNS Zones"
        description="Manage your DNS zones and records"
        actions={
          canCreateZone ? (
            <Button
              onClick={() => setShowCreateForm(true)}
              icon={<Icons.Plus />}
            >
              Create Zone
            </Button>
          ) : undefined
        }
      />
      
      <PageContainer>
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search zones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                variant="ghost"
                onClick={fetchZones}
              >
                <Icons.Refresh className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </Card>

          {/* Create Zone Form */}
          {showCreateForm && (
            <Card>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Create New Zone</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                  >
                    <Icons.Close className="h-4 w-4" />
                  </Button>
                </div>
                
                <form onSubmit={handleCreateZone} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Zone Name"
                      placeholder="example.com"
                      value={newZone.name}
                      onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                      required
                      helpText="Enter the domain name for the zone"
                    />
                    
                    <Select
                      label="Zone Type"
                      value={newZone.kind}
                      onChange={(e) => setNewZone({ ...newZone, kind: e.target.value })}
                      options={[
                        { value: 'Native', label: 'Native' },
                        { value: 'Master', label: 'Master' },
                        { value: 'Slave', label: 'Slave' },
                      ]}
                    />
                  </div>

                  {newZone.kind === 'Slave' && (
                    <Input
                      label="Masters"
                      placeholder="192.168.1.1, 192.168.1.2"
                      value={newZone.masters}
                      onChange={(e) => setNewZone({ ...newZone, masters: e.target.value })}
                      helpText="Comma-separated list of master server IPs"
                    />
                  )}

                  <Input
                    label="Account (Optional)"
                    placeholder="Account name"
                    value={newZone.account}
                    onChange={(e) => setNewZone({ ...newZone, account: e.target.value })}
                    helpText="Optional account identifier"
                  />

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Zone
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          )}

          {/* Zones Table */}
          {filteredZones.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Icons.Globe className="h-12 w-12" />}
                title={searchTerm ? 'No zones found' : 'No zones configured'}
                description={
                  searchTerm 
                    ? 'Try adjusting your search criteria'
                    : 'Create your first DNS zone to get started'
                }
                action={
                  canCreateZone && !searchTerm ? (
                    <Button
                      onClick={() => setShowCreateForm(true)}
                      icon={<Icons.Plus />}
                    >
                      Create Your First Zone
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <Card padding="none">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Zone Name</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Serial</TableHeader>
                    <TableHeader>Account</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader className="text-right">Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredZones.map((zone) => (
                    <TableRow key={zone.name}>
                      <TableCell>
                        <Link
                          to={`/zones/${zone.name}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          {zone.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getZoneTypeColor(zone.kind) as any}>
                          {zone.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {zone.serial || '-'}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {zone.account || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.is_active ? 'success' : 'error'}>
                          {zone.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Link
                            to={`/zones/${zone.name}`}
                            className="inline-flex items-center px-2 py-1 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Icons.Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                          {canDeleteZone && (
                            <button
                              onClick={() => handleDeleteZone(zone.name)}
                              className="inline-flex items-center px-2 py-1 text-sm text-red-600 hover:text-red-700"
                            >
                              <Icons.Delete className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Results Summary */}
          {zones.length > 0 && (
            <div className="text-sm text-gray-500 text-center">
              Showing {filteredZones.length} of {zones.length} zones
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default ZoneList;
