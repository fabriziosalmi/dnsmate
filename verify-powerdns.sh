#!/bin/bash

echo "🔍 Verifying PowerDNS Data..."
echo

echo "📋 All zones in PowerDNS:"
curl -s -H "X-API-Key: dnsmate-test-key" http://localhost:8081/api/v1/servers/localhost/zones | jq '.[].name'
echo

echo "🔍 Detailed zone data for tedyt.com:"
curl -s -H "X-API-Key: dnsmate-test-key" http://localhost:8081/api/v1/servers/localhost/zones/tedyt.com. | jq '.rrsets[] | {name: .name, type: .type, records: .records[].content, ttl: .ttl}'
echo

echo "✅ PowerDNS verification complete!"
