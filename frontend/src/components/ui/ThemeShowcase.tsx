import React, { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  Input,
  Select,
  Alert,
  LoadingSpinner,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Tabs,
  Modal,
  Progress,
  colors,
} from './DesignSystem';
import { Icons } from './Icons';

// This component showcases the enhanced design system
// It can be used for testing and demonstrating the UI components
export const ThemeShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('buttons');
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');

  const tabs = [
    { id: 'buttons', label: 'Buttons', icon: <Icons.Settings className="h-4 w-4" /> },
    { id: 'forms', label: 'Forms', icon: <Icons.Edit className="h-4 w-4" /> },
    { id: 'data', label: 'Data Display', icon: <Icons.Database className="h-4 w-4" /> },
    { id: 'feedback', label: 'Feedback', icon: <Icons.InformationCircle className="h-4 w-4" /> },
  ];

  const sampleData = [
    { id: 1, zone: 'example.com', type: 'A', status: 'active', records: 12 },
    { id: 2, zone: 'test.org', type: 'CNAME', status: 'inactive', records: 8 },
    { id: 3, zone: 'demo.net', type: 'MX', status: 'active', records: 5 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gradient">
            DNSMate Design System
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive, professional UI component library designed specifically for DNS management interfaces.
          </p>
        </div>

        {/* Color Palette Preview */}
        <Card className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900">Color Palette</h2>
          
          <div className="space-y-4">
            {Object.entries(colors).map(([colorName, colorShades]) => (
              <div key={colorName} className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 capitalize">{colorName}</h3>
                <div className="flex flex-wrap gap-2">
                  {typeof colorShades === 'object' && Object.entries(colorShades).map(([shade, value]) => (
                    <div key={shade} className="flex flex-col items-center space-y-1">
                      <div
                        className="w-12 h-12 rounded-lg shadow-sm border border-gray-200"
                        style={{ backgroundColor: value }}
                      />
                      <span className="text-xs text-gray-500">{shade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Component Showcase */}
        <Card padding="none">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {/* Buttons Tab */}
            {activeTab === 'buttons' && (
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Button Variants</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="error">Error</Button>
                    <Button variant="dns">DNS Theme</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Button Sizes</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button size="xs">Extra Small</Button>
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Button States</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button 
                      variant="primary" 
                      icon={<Icons.Plus />}
                    >
                      With Icon
                    </Button>
                    <Button 
                      variant="primary" 
                      icon={<Icons.ChevronRight />}
                      iconPosition="right"
                    >
                      Icon Right
                    </Button>
                    <Button variant="primary" loading>
                      Loading
                    </Button>
                    <Button variant="primary" disabled>
                      Disabled
                    </Button>
                    <Button variant="primary" fullWidth>
                      Full Width
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Badges</h3>
                  <div className="flex flex-wrap gap-4">
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="dns">DNS</Badge>
                    <Badge variant="gradient">Gradient</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Forms Tab */}
            {activeTab === 'forms' && (
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Input Variants</h3>
                    
                    <Input
                      label="Default Input"
                      placeholder="Enter text..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      helpText="This is a help text"
                    />

                    <Input
                      label="Input with Icon"
                      placeholder="Search zones..."
                      icon={<Icons.Search />}
                      variant="default"
                    />

                    <Input
                      label="Filled Variant"
                      placeholder="Enter value..."
                      variant="filled"
                    />

                    <Input
                      label="Bordered Variant"
                      placeholder="Enter value..."
                      variant="bordered"
                    />

                    <Input
                      label="Error State"
                      placeholder="Invalid input..."
                      error="This field is required"
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Select Component</h3>
                    
                    <Select
                      label="Zone Type"
                      placeholder="Select zone type..."
                      value={selectValue}
                      onChange={(e) => setSelectValue(e.target.value)}
                      options={[
                        { value: 'native', label: 'Native' },
                        { value: 'master', label: 'Master' },
                        { value: 'slave', label: 'Slave' },
                        { value: 'forward', label: 'Forward' },
                      ]}
                      helpText="Choose the appropriate zone type"
                    />

                    <Select
                      label="With Error"
                      options={[
                        { value: 'a', label: 'A Record' },
                        { value: 'cname', label: 'CNAME Record' },
                      ]}
                      error="Please select a record type"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Data Display Tab */}
            {activeTab === 'data' && (
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Enhanced Table</h3>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader sortable>Zone Name</TableHeader>
                        <TableHeader>Type</TableHeader>
                        <TableHeader>Status</TableHeader>
                        <TableHeader>Records</TableHeader>
                        <TableHeader>Actions</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sampleData.map((row) => (
                        <TableRow key={row.id} clickable>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Icons.Globe className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{row.zone}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={row.status === 'active' ? 'success' : 'error'}>
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.records}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="xs" variant="ghost">
                                <Icons.Eye className="h-3 w-3" />
                              </Button>
                              <Button size="xs" variant="ghost">
                                <Icons.Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Progress Bars</h3>
                  <div className="space-y-4">
                    <Progress value={75} label="Zone Sync Progress" showValue color="primary" />
                    <Progress value={90} label="DNS Propagation" showValue color="success" size="lg" />
                    <Progress value={45} label="Configuration" showValue color="warning" />
                    <Progress value={15} label="Error Rate" showValue color="error" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Card Variants</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card variant="default" hover>
                      <h4 className="font-semibold mb-2">Default Card</h4>
                      <p className="text-gray-600">Standard card with hover effect</p>
                    </Card>
                    <Card variant="elevated">
                      <h4 className="font-semibold mb-2">Elevated Card</h4>
                      <p className="text-gray-600">Card with enhanced shadow</p>
                    </Card>
                    <Card variant="glass">
                      <h4 className="font-semibold mb-2">Glass Card</h4>
                      <p className="text-gray-600">Glassmorphism effect</p>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Alert Components</h3>
                  <div className="space-y-4">
                    <Alert variant="info" title="Information">
                      This is an informational alert with additional context.
                    </Alert>
                    <Alert variant="success" title="Success">
                      Zone has been successfully created and is now active.
                    </Alert>
                    <Alert variant="warning" title="Warning">
                      DNS propagation may take up to 24 hours to complete.
                    </Alert>
                    <Alert 
                      variant="error" 
                      title="Error" 
                      onClose={() => {}}
                      action={
                        <Button size="sm" variant="outline">
                          Retry
                        </Button>
                      }
                    >
                      Failed to connect to PowerDNS server. Please check your configuration.
                    </Alert>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Loading States</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center space-y-4">
                      <LoadingSpinner variant="spinner" size="lg" color="primary" />
                      <p className="text-sm text-gray-600">Spinner</p>
                    </div>
                    <div className="text-center space-y-4">
                      <LoadingSpinner variant="dots" size="lg" color="success" />
                      <p className="text-sm text-gray-600">Dots</p>
                    </div>
                    <div className="text-center space-y-4">
                      <LoadingSpinner variant="pulse" size="lg" color="dns" />
                      <p className="text-sm text-gray-600">Pulse</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Modal</h3>
                  <Button onClick={() => setShowModal(true)}>
                    Open Modal
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Enhanced Modal"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              This is an enhanced modal component with improved animations and styling.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setShowModal(false)}>
                Confirm
              </Button>
            </div>
          </div>
        </Modal>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>DNSMate Design System - Built with React, TypeScript, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
};

export default ThemeShowcase;
