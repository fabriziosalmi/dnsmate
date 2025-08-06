import { test, expect } from '@playwright/test';

test.describe('DNSMate PowerDNS Integration - Quick Test', () => {
  test('Verify admin can login and existing tedyt.com zone data', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000');
    
    // Check if already logged in
    const isLoggedIn = await page.locator('text=Dashboard').isVisible().catch(() => false);
    
    if (!isLoggedIn) {
      // Fill login form
      await page.fill('input[type="email"]', 'fabrizio.salmi@gmail.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard to load
      await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    }

    // Navigate to DNS Zones
    await page.click('text=DNS Zones');
    await page.waitForSelector('text=DNS Zones Management');

    // Check if tedyt.com zone exists
    const tedytZoneExists = await page.locator('text=tedyt.com').isVisible();
    
    if (tedytZoneExists) {
      console.log('✅ tedyt.com zone found in UI');
      
      // Open the zone
      const zoneRow = page.locator('tr:has-text("tedyt.com")');
      await zoneRow.locator('button:has-text("View")').click();
      
      await page.waitForSelector('text=Zone: tedyt.com');

      // Verify records in UI
      await expect(page.locator('tr:has-text("www"):has-text("A")')).toContainText('1.1.1.1');
      await expect(page.locator('tr:has-text("@"):has-text("SOA")')).toContainText('localhost.');
      await expect(page.locator('tr:has-text("@"):has-text("NS")')).toContainText('localhost.');

      console.log('✅ All tedyt.com records verified in UI');

      // Verify same data exists in PowerDNS API
      const powerdnsResponse = await page.request.get('http://localhost:8081/api/v1/servers/localhost/zones/tedyt.com.', {
        headers: {
          'X-API-Key': 'dnsmate-test-key'
        }
      });
      
      expect(powerdnsResponse.ok()).toBeTruthy();
      const powerdnsData = await powerdnsResponse.json();
      
      // Check A record
      const aRecord = powerdnsData.rrsets.find(r => r.type === 'A' && r.name === 'www.tedyt.com.');
      expect(aRecord).toBeDefined();
      expect(aRecord.records[0].content).toBe('1.1.1.1');
      expect(aRecord.ttl).toBe(3600);
      
      // Check NS record
      const nsRecord = powerdnsData.rrsets.find(r => r.type === 'NS' && r.name === 'tedyt.com.');
      expect(nsRecord).toBeDefined();
      expect(nsRecord.records[0].content).toBe('localhost.');
      expect(nsRecord.ttl).toBe(3600);
      
      // Check SOA record
      const soaRecord = powerdnsData.rrsets.find(r => r.type === 'SOA' && r.name === 'tedyt.com.');
      expect(soaRecord).toBeDefined();
      expect(soaRecord.records[0].content).toContain('localhost. admin.tedyt.com.');
      expect(soaRecord.ttl).toBe(86400);

      console.log('✅ All tedyt.com records verified in PowerDNS API');
      console.log('🎉 UI and PowerDNS data match perfectly!');
    } else {
      console.log('ℹ️ tedyt.com zone not found in UI');
    }
  });

  test('Create and verify new example.com zone with records', async ({ page }) => {
    const testZone = 'example.com';
    
    // Cleanup function
    const cleanup = async () => {
      try {
        await page.request.delete(`http://localhost:8081/api/v1/servers/localhost/zones/${testZone}.`, {
          headers: { 'X-API-Key': 'dnsmate-test-key' }
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    // Cleanup before test
    await cleanup();

    // Login as admin
    await page.goto('http://localhost:3000');
    
    const isLoggedIn = await page.locator('text=Dashboard').isVisible().catch(() => false);
    if (!isLoggedIn) {
      await page.fill('input[type="email"]', 'fabrizio.salmi@gmail.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    }

    // Navigate to DNS Zones
    await page.click('text=DNS Zones');
    await page.waitForSelector('text=DNS Zones Management');

    // Create new zone
    await page.click('button:has-text("Create Zone")');
    await page.waitForSelector('text=Create New Zone');
    
    await page.fill('input[placeholder*="zone name"]', testZone);
    await page.selectOption('select', 'Master');
    
    await page.click('button:has-text("Create Zone")');
    await page.waitForSelector(`text=${testZone}`, { timeout: 10000 });

    console.log(`✅ ${testZone} zone created successfully`);

    // Open the zone
    const zoneRow = page.locator(`tr:has-text("${testZone}")`);
    await zoneRow.locator('button:has-text("View")').click();
    await page.waitForSelector(`text=Zone: ${testZone}`);

    // Create A record
    await page.click('button:has-text("Add Record")');
    await page.waitForSelector('text=Add DNS Record');
    
    await page.fill('input[placeholder*="record name"]', 'www');
    await page.selectOption('select[name="type"]', 'A');
    await page.fill('input[placeholder*="content"]', '192.168.1.100');
    await page.fill('input[placeholder*="TTL"]', '3600');
    
    await page.click('button:has-text("Create Record")');
    await page.waitForSelector('tr:has-text("www"):has-text("A")');

    // Create CNAME record
    await page.click('button:has-text("Add Record")');
    await page.waitForSelector('text=Add DNS Record');
    
    await page.fill('input[placeholder*="record name"]', 'blog');
    await page.selectOption('select[name="type"]', 'CNAME');
    await page.fill('input[placeholder*="content"]', `www.${testZone}.`);
    
    await page.click('button:has-text("Create Record")');
    await page.waitForSelector('tr:has-text("blog"):has-text("CNAME")');

    // Create MX record
    await page.click('button:has-text("Add Record")');
    await page.waitForSelector('text=Add DNS Record');
    
    await page.fill('input[placeholder*="record name"]', '@');
    await page.selectOption('select[name="type"]', 'MX');
    await page.fill('input[placeholder*="content"]', `10 mail.${testZone}.`);
    
    await page.click('button:has-text("Create Record")');
    await page.waitForSelector('tr:has-text("@"):has-text("MX")');

    console.log('✅ All test records created successfully');

    // Verify all records in UI
    await expect(page.locator('tr:has-text("www"):has-text("A")')).toContainText('192.168.1.100');
    await expect(page.locator('tr:has-text("blog"):has-text("CNAME")')).toContainText(`www.${testZone}.`);
    await expect(page.locator('tr:has-text("@"):has-text("MX")')).toContainText(`10 mail.${testZone}.`);

    // Verify in PowerDNS API
    const powerdnsResponse = await page.request.get(`http://localhost:8081/api/v1/servers/localhost/zones/${testZone}.`, {
      headers: { 'X-API-Key': 'dnsmate-test-key' }
    });
    
    expect(powerdnsResponse.ok()).toBeTruthy();
    const powerdnsData = await powerdnsResponse.json();
    
    // Verify A record
    const aRecord = powerdnsData.rrsets.find(r => r.type === 'A' && r.name === `www.${testZone}.`);
    expect(aRecord).toBeDefined();
    expect(aRecord.records[0].content).toBe('192.168.1.100');
    
    // Verify CNAME record
    const cnameRecord = powerdnsData.rrsets.find(r => r.type === 'CNAME' && r.name === `blog.${testZone}.`);
    expect(cnameRecord).toBeDefined();
    expect(cnameRecord.records[0].content).toBe(`www.${testZone}.`);
    
    // Verify MX record
    const mxRecord = powerdnsData.rrsets.find(r => r.type === 'MX' && r.name === `${testZone}.`);
    expect(mxRecord).toBeDefined();
    expect(mxRecord.records[0].content).toBe(`10 mail.${testZone}.`);

    console.log('✅ All records verified in PowerDNS API');
    console.log('🎉 UI and PowerDNS data synchronization working perfectly!');

    // Cleanup after test
    await cleanup();
  });
});
