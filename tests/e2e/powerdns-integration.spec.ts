import { test, expect, Page } from '@playwright/test';

interface PowerDNSRecord {
  name: string;
  type: string;
  content: string;
  ttl: number;
  disabled: boolean;
}

interface PowerDNSZone {
  name: string;
  rrsets: Array<{
    name: string;
    type: string;
    records: PowerDNSRecord[];
    ttl: number;
  }>;
}

class DNSMateTestHelper {
  constructor(private page: Page) {}

  async login(email: string = 'fabrizio.salmi@gmail.com', password: string = 'admin123') {
    await this.page.goto('/');
    
    // Check if already logged in
    const isLoggedIn = await this.page.locator('[data-testid="user-menu"]').isVisible().catch(() => false);
    if (isLoggedIn) {
      return;
    }

    // Fill login form
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await this.page.waitForSelector('text=Dashboard', { timeout: 10000 });
  }

  async navigateToSettings() {
    await this.page.click('text=Settings');
    await this.page.waitForSelector('text=PowerDNS Settings');
  }

  async setupPowerDNS() {
    await this.navigateToSettings();
    
    // Check if PowerDNS is already configured
    const isConfigured = await this.page.locator('text=PowerDNS is connected').isVisible().catch(() => false);
    if (isConfigured) {
      return;
    }

    // Click PowerDNS tab if not active
    const powerDNSTab = this.page.locator('button:has-text("PowerDNS")');
    if (await powerDNSTab.isVisible()) {
      await powerDNSTab.click();
    }

    // Look for quick setup card
    const quickSetupCard = this.page.locator('.bg-blue-50:has-text("Test PowerDNS")');
    if (await quickSetupCard.isVisible()) {
      await quickSetupCard.click();
      
      // Wait for form to be filled
      await this.page.waitForTimeout(1000);
      
      // Click save
      await this.page.click('button:has-text("Save Settings")');
      
      // Wait for success message
      await this.page.waitForSelector('text=PowerDNS settings saved successfully');
    } else {
      // Manual setup
      await this.page.fill('input[placeholder*="PowerDNS"]', 'Test PowerDNS');
      await this.page.fill('input[placeholder*="http://"]', 'http://powerdns:8081');
      await this.page.fill('input[placeholder*="API Key"]', 'dnsmate-test-key');
      
      await this.page.click('button:has-text("Save Settings")');
      await this.page.waitForSelector('text=PowerDNS settings saved successfully');
    }

    // Test connection
    await this.page.click('button:has-text("Test Connection")');
    await this.page.waitForSelector('text=Connection successful');
  }

  async navigateToZones() {
    await this.page.click('text=DNS Zones');
    await this.page.waitForSelector('text=DNS Zones Management');
  }

  async createZone(zoneName: string) {
    await this.navigateToZones();
    
    // Check if zone already exists
    const zoneExists = await this.page.locator(`text=${zoneName}`).isVisible().catch(() => false);
    if (zoneExists) {
      return;
    }

    await this.page.click('button:has-text("Create Zone")');
    await this.page.waitForSelector('text=Create New Zone');
    
    await this.page.fill('input[placeholder*="zone name"]', zoneName);
    await this.page.selectOption('select', 'Master');
    
    await this.page.click('button:has-text("Create Zone")');
    await this.page.waitForSelector(`text=${zoneName}`, { timeout: 10000 });
  }

  async openZone(zoneName: string) {
    await this.navigateToZones();
    
    // Click on the zone name or view button
    const zoneRow = this.page.locator(`tr:has-text("${zoneName}")`);
    await zoneRow.locator('button:has-text("View")').click();
    
    await this.page.waitForSelector(`text=Zone: ${zoneName}`);
  }

  async createRecord(recordName: string, recordType: string, content: string, ttl: number = 3600) {
    await this.page.click('button:has-text("Add Record")');
    await this.page.waitForSelector('text=Add DNS Record');
    
    await this.page.fill('input[placeholder*="record name"]', recordName);
    await this.page.selectOption('select[name="type"]', recordType);
    await this.page.fill('input[placeholder*="content"]', content);
    await this.page.fill('input[placeholder*="TTL"]', ttl.toString());
    
    await this.page.click('button:has-text("Create Record")');
    
    // Wait for record to appear in the table
    await this.page.waitForSelector(`tr:has-text("${recordName}")`);
  }

  async verifyRecord(recordName: string, recordType: string, content: string) {
    const recordRow = this.page.locator(`tr:has-text("${recordName}"):has-text("${recordType}")`);
    await expect(recordRow).toContainText(content);
    await expect(recordRow).toContainText('Active');
  }

  async deleteRecord(recordName: string, recordType: string) {
    const recordRow = this.page.locator(`tr:has-text("${recordName}"):has-text("${recordType}")`);
    await recordRow.locator('button:has-text("Delete")').click();
    
    // Confirm deletion
    await this.page.click('button:has-text("Confirm")');
    
    // Wait for record to disappear
    await this.page.waitForTimeout(2000);
    await expect(recordRow).not.toBeVisible();
  }

  async deleteZone(zoneName: string) {
    await this.navigateToZones();
    
    const zoneRow = this.page.locator(`tr:has-text("${zoneName}")`);
    await zoneRow.locator('button:has-text("Delete")').click();
    
    // Confirm deletion
    await this.page.click('button:has-text("Confirm")');
    
    // Wait for zone to disappear
    await expect(this.page.locator(`text=${zoneName}`)).not.toBeVisible();
  }

  // PowerDNS API verification methods
  async verifyPowerDNSZone(zoneName: string): Promise<PowerDNSZone> {
    const response = await this.page.request.get(`http://localhost:8081/api/v1/servers/localhost/zones/${zoneName}`, {
      headers: {
        'X-API-Key': 'dnsmate-test-key'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  async verifyPowerDNSRecord(zoneName: string, recordName: string, recordType: string, expectedContent: string) {
    const zone = await this.verifyPowerDNSZone(zoneName);
    
    const record = zone.rrsets.find(rrset => 
      rrset.name === recordName && rrset.type === recordType
    );
    
    expect(record).toBeDefined();
    expect(record!.records[0].content).toBe(expectedContent);
    expect(record!.records[0].disabled).toBe(false);
  }

  async cleanupPowerDNSZone(zoneName: string) {
    try {
      await this.page.request.delete(`http://localhost:8081/api/v1/servers/localhost/zones/${zoneName}`, {
        headers: {
          'X-API-Key': 'dnsmate-test-key'
        }
      });
    } catch (error) {
      // Zone might not exist, ignore error
    }
  }
}

test.describe('DNSMate PowerDNS Integration Tests', () => {
  let helper: DNSMateTestHelper;
  const testZone = 'example.com';

  test.beforeEach(async ({ page }) => {
    helper = new DNSMateTestHelper(page);
    
    // Clean up any existing test zone
    await helper.cleanupPowerDNSZone(testZone);
  });

  test.afterEach(async ({ page }) => {
    // Clean up test zone after each test
    await helper.cleanupPowerDNSZone(testZone);
  });

  test('Admin can login and setup PowerDNS', async ({ page }) => {
    await helper.login();
    
    // Verify dashboard is loaded
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Setup PowerDNS
    await helper.setupPowerDNS();
    
    // Verify PowerDNS is connected
    await helper.navigateToSettings();
    await expect(page.locator('text=PowerDNS is connected')).toBeVisible();
  });

  test('Admin can create and verify zone in PowerDNS', async ({ page }) => {
    await helper.login();
    await helper.setupPowerDNS();
    
    // Create zone
    await helper.createZone(testZone);
    
    // Verify zone exists in UI
    await expect(page.locator(`text=${testZone}`)).toBeVisible();
    
    // Verify zone exists in PowerDNS
    const zone = await helper.verifyPowerDNSZone(`${testZone}.`);
    expect(zone.name).toBe(`${testZone}.`);
    
    // Verify default records (SOA and NS)
    const soaRecord = zone.rrsets.find(r => r.type === 'SOA');
    const nsRecord = zone.rrsets.find(r => r.type === 'NS');
    
    expect(soaRecord).toBeDefined();
    expect(nsRecord).toBeDefined();
    expect(soaRecord!.records[0].content).toContain('ns.local.');
    expect(nsRecord!.records[0].content).toBe('ns.local.');
  });

  test('Admin can create, verify, and delete DNS records', async ({ page }) => {
    await helper.login();
    await helper.setupPowerDNS();
    await helper.createZone(testZone);
    
    // Open the zone
    await helper.openZone(testZone);
    
    // Test A record
    await helper.createRecord('www', 'A', '192.168.1.100');
    await helper.verifyRecord('www', 'A', '192.168.1.100');
    
    // Verify in PowerDNS
    await helper.verifyPowerDNSRecord(`${testZone}.`, `www.${testZone}.`, 'A', '192.168.1.100');
    
    // Test CNAME record
    await helper.createRecord('blog', 'CNAME', `www.${testZone}.`);
    await helper.verifyRecord('blog', 'CNAME', `www.${testZone}.`);
    
    // Verify in PowerDNS
    await helper.verifyPowerDNSRecord(`${testZone}.`, `blog.${testZone}.`, 'CNAME', `www.${testZone}.`);
    
    // Test MX record
    await helper.createRecord('@', 'MX', `10 mail.${testZone}.`);
    await helper.verifyRecord('@', 'MX', `10 mail.${testZone}.`);
    
    // Verify in PowerDNS
    await helper.verifyPowerDNSRecord(`${testZone}.`, `${testZone}.`, 'MX', `10 mail.${testZone}.`);
    
    // Test TXT record
    await helper.createRecord('_verification', 'TXT', '"v=verification123"');
    await helper.verifyRecord('_verification', 'TXT', '"v=verification123"');
    
    // Verify in PowerDNS
    await helper.verifyPowerDNSRecord(`${testZone}.`, `_verification.${testZone}.`, 'TXT', '"v=verification123"');
    
    // Delete a record
    await helper.deleteRecord('blog', 'CNAME');
    
    // Verify deletion in PowerDNS
    const zone = await helper.verifyPowerDNSZone(`${testZone}.`);
    const deletedRecord = zone.rrsets.find(r => 
      r.name === `blog.${testZone}.` && r.type === 'CNAME'
    );
    expect(deletedRecord).toBeUndefined();
  });

  test('Admin can delete zones and verify cleanup', async ({ page }) => {
    await helper.login();
    await helper.setupPowerDNS();
    await helper.createZone(testZone);
    
    // Add some records
    await helper.openZone(testZone);
    await helper.createRecord('test', 'A', '1.2.3.4');
    
    // Delete the zone
    await helper.deleteZone(testZone);
    
    // Verify zone is deleted from UI
    await expect(page.locator(`text=${testZone}`)).not.toBeVisible();
    
    // Verify zone is deleted from PowerDNS
    const response = await page.request.get(`http://localhost:8081/api/v1/servers/localhost/zones/${testZone}.`, {
      headers: {
        'X-API-Key': 'dnsmate-test-key'
      }
    });
    expect(response.status()).toBe(404);
  });

  test('Error handling for invalid records', async ({ page }) => {
    await helper.login();
    await helper.setupPowerDNS();
    await helper.createZone(testZone);
    await helper.openZone(testZone);
    
    // Try to create invalid A record
    await page.click('button:has-text("Add Record")');
    await page.fill('input[placeholder*="record name"]', 'invalid');
    await page.selectOption('select[name="type"]', 'A');
    await page.fill('input[placeholder*="content"]', 'not-an-ip');
    await page.click('button:has-text("Create Record")');
    
    // Should show error
    await expect(page.locator('text=error')).toBeVisible();
  });

  test('Verify existing tedyt.com zone data matches PowerDNS', async ({ page }) => {
    await helper.login();
    await helper.setupPowerDNS();
    
    // Navigate to zones and check if tedyt.com exists
    await helper.navigateToZones();
    
    const tedytZoneExists = await page.locator('text=tedyt.com').isVisible().catch(() => false);
    
    if (tedytZoneExists) {
      // Open the zone
      await helper.openZone('tedyt.com');
      
      // Verify the records shown in UI match PowerDNS
      await helper.verifyRecord('www', 'A', '1.1.1.1');
      await helper.verifyRecord('@', 'SOA', 'localhost. admin.tedyt.com.');
      await helper.verifyRecord('@', 'NS', 'localhost.');
      
      // Verify in PowerDNS API
      await helper.verifyPowerDNSRecord('tedyt.com.', 'www.tedyt.com.', 'A', '1.1.1.1');
      await helper.verifyPowerDNSRecord('tedyt.com.', 'tedyt.com.', 'NS', 'localhost.');
      
      // Verify SOA record content
      const zone = await helper.verifyPowerDNSZone('tedyt.com.');
      const soaRecord = zone.rrsets.find(r => r.type === 'SOA');
      expect(soaRecord!.records[0].content).toContain('localhost. admin.tedyt.com.');
    }
  });
});
