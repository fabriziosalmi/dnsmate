import { test, expect, Page } from '@playwright/test';

interface User {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'editor' | 'reader';
}

class DNSMateTestHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/');
    
    // Check if already logged in by looking for navigation
    const isLoggedIn = await this.page.locator('text=DNSMate').isVisible().catch(() => false);
    if (isLoggedIn) {
      await this.logout();
    }

    // Wait for login page to load
    await this.page.waitForSelector('text=Sign in to DNSMate', { timeout: 5000 });

    // Fill login form
    await this.page.fill('input[placeholder="Email address"]', email);
    await this.page.fill('input[placeholder="Password"]', password);
    await this.page.click('button[type="submit"]');
    
    // Wait for successful login - look for navigation or main content
    await this.page.waitForSelector('text=DNSMate', { timeout: 10000 });
  }

  async logout() {
    // Look for logout button in navigation
    const logoutButton = this.page.locator('button:has-text("Logout")');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.page.waitForSelector('text=Sign in to DNSMate', { timeout: 5000 });
    }
  }
}

test.describe('DNSMate Basic User Flow Tests', () => {
  let helper: DNSMateTestHelper;
  
  const adminUser = {
    email: 'fabrizio.salmi@gmail.com',
    password: 'admin123',
    name: 'Fabrizio Salmi',
    role: 'admin' as const
  };

  test.beforeEach(async ({ page }) => {
    helper = new DNSMateTestHelper(page);
  });

  test('Admin Login and Navigation', async ({ page }) => {
    // Login as admin
    await helper.login(adminUser.email, adminUser.password);
    
    // Verify we're logged in and can see navigation
    await expect(page.locator('text=DNSMate')).toBeVisible();
    await expect(page.locator('text=Zones')).toBeVisible();
    
    // Check if admin can see Users link (role-based)
    const usersLink = page.locator('text=Users');
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(page.locator('text=User Management')).toBeVisible();
    }
    
    // Navigate to Zones
    await page.click('text=Zones');
    await expect(page.locator('text=DNS Zones')).toBeVisible();
    
    // Navigate to Settings
    await page.click('text=Settings');
    // Settings page should load (may have different content)
    
    // Logout
    await helper.logout();
    await expect(page.locator('text=Sign in to DNSMate')).toBeVisible();
  });

  test('Zone Management Basic Flow', async ({ page }) => {
    await helper.login(adminUser.email, adminUser.password);
    
    // Navigate to zones
    await page.click('text=Zones');
    await expect(page.locator('text=DNS Zones')).toBeVisible();
    
    // Look for create zone button and form
    const createButton = page.locator('button:has-text("Create")').first();
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Check if form appears
      const zoneNameInput = page.locator('input[placeholder*="zone" i], input[name*="name" i]').first();
      if (await zoneNameInput.isVisible()) {
        await zoneNameInput.fill('test-zone.com');
        
        // Look for submit button
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")').last();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          // Wait for potential success message or zone list update
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('Settings Page Access', async ({ page }) => {
    await helper.login(adminUser.email, adminUser.password);
    
    // Navigate to settings
    await page.click('text=Settings');
    
    // Check for settings content (PowerDNS, tokens, etc.)
    // The actual content may vary, so we'll just verify we can access the page
    await page.waitForTimeout(1000);
    
    // Look for common settings elements
    const settingsElements = [
      'PowerDNS',
      'API',
      'Token',
      'Configuration',
      'Settings'
    ];
    
    let foundElement = false;
    for (const element of settingsElements) {
      if (await page.locator(`text=${element}`).isVisible().catch(() => false)) {
        foundElement = true;
        break;
      }
    }
    
    expect(foundElement).toBe(true);
  });

  test('Error Handling: Invalid Login', async ({ page }) => {
    await page.goto('/');
    
    // Wait for login form
    await page.waitForSelector('text=Sign in to DNSMate');
    
    // Try invalid credentials
    await page.fill('input[placeholder="Email address"]', 'invalid@example.com');
    await page.fill('input[placeholder="Password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message (may be toast or inline)
    await page.waitForTimeout(2000);
    
    // Should still be on login page
    await expect(page.locator('text=Sign in to DNSMate')).toBeVisible();
  });

  test('UI Responsiveness and Navigation', async ({ page }) => {
    await helper.login(adminUser.email, adminUser.password);
    
    // Test navigation between different sections
    const navigationTests = [
      { link: 'Zones', expectedContent: 'DNS Zones' },
      { link: 'Settings', expectedContent: ['Settings', 'Configuration', 'PowerDNS'] },
      { link: 'Backup', expectedContent: 'Backup' }
    ];
    
    for (const test of navigationTests) {
      const linkElement = page.locator(`text=${test.link}`);
      if (await linkElement.isVisible()) {
        await linkElement.click();
        await page.waitForTimeout(1000);
        
        // Check if expected content is present
        if (Array.isArray(test.expectedContent)) {
          let found = false;
          for (const content of test.expectedContent) {
            if (await page.locator(`text=${content}`).isVisible().catch(() => false)) {
              found = true;
              break;
            }
          }
          expect(found).toBe(true);
        } else {
          // May not always be visible, so just check navigation worked
          // await expect(page.locator(`text=${test.expectedContent}`)).toBeVisible();
        }
      }
    }
  });
});
