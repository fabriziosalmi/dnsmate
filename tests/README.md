# DNSMate PowerDNS Integration Tests

This directory contains comprehensive end-to-end tests for DNSMate's PowerDNS integration using Playwright.

## What We're Testing

The tests verify that:
1. **UI and PowerDNS data synchronization** - Data shown in the DNSMate UI matches exactly what's stored in PowerDNS
2. **Zone creation and management** - Creating zones through DNSMate properly stores them in PowerDNS
3. **Record management** - Creating, updating, and deleting DNS records works correctly
4. **Error handling** - Invalid operations are handled gracefully

## Current PowerDNS Data Verified

Based on your UI, the tests verify this existing data:

### Zone: tedyt.com
- **www.tedyt.com** → A record → 1.1.1.1 (TTL: 3600)
- **tedyt.com** → SOA record → localhost. admin.tedyt.com. 2025080602 3600 1800 604800 86400 (TTL: 86400)
- **tedyt.com** → NS record → localhost. (TTL: 3600)

## Running the Tests

### Prerequisites
1. Make sure the development environment is running:
   ```bash
   ./start-dev.sh
   ```

2. Verify admin user exists:
   ```bash
   make create-user
   ```

### Quick Verification
Just verify that PowerDNS data matches what you see in the UI:
```bash
make test-verify
```

### Full End-to-End Tests
Run complete Playwright tests that verify UI ↔ PowerDNS synchronization:
```bash
make test-e2e
```

### Individual Test Commands
```bash
# Go to tests directory
cd tests

# Run specific test file
npm test e2e/quick-powerdns-test.spec.ts

# Run with browser UI
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug mode
npm run test:debug
```

## Test Scenarios

### Test 1: Verify Existing Data
- ✅ Login as admin
- ✅ Navigate to DNS zones
- ✅ Open tedyt.com zone
- ✅ Verify UI shows correct records
- ✅ Cross-check with PowerDNS API
- ✅ Confirm data matches exactly

### Test 2: Create New Zone and Records
- ✅ Create example.com zone
- ✅ Add A record (www → 192.168.1.100)
- ✅ Add CNAME record (blog → www.example.com.)
- ✅ Add MX record (@ → 10 mail.example.com.)
- ✅ Verify all records in UI
- ✅ Verify all records in PowerDNS API
- ✅ Clean up test zone

## API Verification

The tests also directly query the PowerDNS API to ensure data integrity:

```bash
# Get all zones
curl -H "X-API-Key: dnsmate-test-key" http://localhost:8081/api/v1/servers/localhost/zones

# Get specific zone details
curl -H "X-API-Key: dnsmate-test-key" http://localhost:8081/api/v1/servers/localhost/zones/tedyt.com.
```

## Test Results

When you run the tests, you'll see:
- 🔍 **Data verification** - PowerDNS API vs UI comparison
- ✅ **Success indicators** - Each verification step
- 🎉 **Final confirmation** - UI and PowerDNS data synchronization status

The tests prove that what you see in the DNSMate UI is exactly what's stored in PowerDNS, confirming the integration works correctly.

## Files

- `quick-powerdns-test.spec.ts` - Main test file with both verification scenarios
- `powerdns-integration.spec.ts` - Comprehensive test suite (full version)
- `playwright.config.ts` - Playwright configuration
- `../verify-powerdns.sh` - Quick PowerDNS data verification script
- `../run-tests.sh` - Test runner with service checks
