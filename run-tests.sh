#!/bin/bash

echo "🧪 Running DNSMate PowerDNS Integration Tests..."
echo

# Check if services are running
echo "🔍 Checking if services are running..."
if ! ./health-check.sh; then
    echo "❌ Services not ready. Please run './start-dev.sh' first"
    exit 1
fi

echo "✅ All services are running!"
echo

# Run quick verification
echo "🔍 Quick PowerDNS verification:"
./verify-powerdns.sh
echo

# Run Playwright tests
echo "🧪 Running Playwright tests..."
cd tests
npm test

echo
echo "🎉 Test run complete!"
