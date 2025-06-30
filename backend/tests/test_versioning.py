"""Test versioning functionality"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


class TestVersioning:
    """Test zone versioning functionality"""

    @patch('app.services.versioning.PowerDNSClient')
    async def test_create_version(self, mock_powerdns, client: AsyncClient, auth_headers):
        """Test creating a zone version"""
        # Mock PowerDNS responses
        mock_client = AsyncMock()
        mock_powerdns.return_value = mock_client
        mock_client.get_zone.return_value = {"name": "example.com", "kind": "Master"}
        mock_client.get_records.return_value = [
            {"name": "example.com", "type": "A", "content": "192.168.1.1", "ttl": 3600}
        ]
        
        response = await client.post("/api/versioning/example.com/versions", 
            headers=auth_headers,
            json={
                "description": "Initial version",
                "changes_summary": "Added A record for root domain"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["zone_name"] == "example.com"
        assert data["version_number"] == 1
        assert data["description"] == "Initial version"
        assert data["changes_summary"] == "Added A record for root domain"

    @patch('app.services.versioning.PowerDNSClient')
    async def test_get_zone_versions(self, mock_powerdns, client: AsyncClient, auth_headers):
        """Test getting zone versions"""
        # First create a version
        mock_client = AsyncMock()
        mock_powerdns.return_value = mock_client
        mock_client.get_zone.return_value = {"name": "example.com", "kind": "Master"}
        mock_client.get_records.return_value = []
        
        await client.post("/api/versioning/example.com/versions", 
            headers=auth_headers,
            json={"description": "Test version"}
        )
        
        # Now get versions
        response = await client.get("/api/versioning/example.com/versions", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["zone_name"] == "example.com"
        assert data[0]["description"] == "Test version"

    @patch('app.services.versioning.PowerDNSClient')
    async def test_compare_versions(self, mock_powerdns, client: AsyncClient, auth_headers):
        """Test comparing two versions"""
        # Mock PowerDNS responses
        mock_client = AsyncMock()
        mock_powerdns.return_value = mock_client
        mock_client.get_zone.return_value = {"name": "example.com", "kind": "Master"}
        
        # Create first version
        mock_client.get_records.return_value = [
            {"name": "example.com", "type": "A", "content": "192.168.1.1", "ttl": 3600}
        ]
        version1_response = await client.post("/api/versioning/example.com/versions", 
            headers=auth_headers,
            json={"description": "Version 1"}
        )
        version1_id = version1_response.json()["id"]
        
        # Create second version with different records
        mock_client.get_records.return_value = [
            {"name": "example.com", "type": "A", "content": "192.168.1.2", "ttl": 3600},
            {"name": "www.example.com", "type": "A", "content": "192.168.1.2", "ttl": 3600}
        ]
        version2_response = await client.post("/api/versioning/example.com/versions", 
            headers=auth_headers,
            json={"description": "Version 2"}
        )
        version2_id = version2_response.json()["id"]
        
        # Compare versions
        response = await client.get(
            f"/api/versioning/example.com/compare/{version1_id}/{version2_id}", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "zone_changes" in data
        assert "record_changes" in data
        assert "version1" in data
        assert "version2" in data

    @patch('app.services.versioning.PowerDNSClient')
    async def test_rollback_to_version(self, mock_powerdns, client: AsyncClient, auth_headers):
        """Test rolling back to a previous version"""
        # Mock PowerDNS responses
        mock_client = AsyncMock()
        mock_powerdns.return_value = mock_client
        mock_client.get_zone.return_value = {"name": "example.com", "kind": "Master"}
        mock_client.get_records.return_value = [
            {"name": "example.com", "type": "A", "content": "192.168.1.1", "ttl": 3600}
        ]
        
        # Create a version to rollback to
        version_response = await client.post("/api/versioning/example.com/versions", 
            headers=auth_headers,
            json={"description": "Rollback target"}
        )
        version_id = version_response.json()["id"]
        
        # Mock rollback operations
        mock_client.delete_record = AsyncMock()
        mock_client.update_record = AsyncMock()
        mock_client.create_record = AsyncMock()
        mock_client.update_zone = AsyncMock()
        
        # Perform rollback
        response = await client.post(
            f"/api/versioning/example.com/rollback/{version_id}", 
            headers=auth_headers,
            json={"description": "Rolling back to previous state"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["zone_name"] == "example.com"
        assert "rollback" in data["description"].lower()

    async def test_versioning_unauthorized(self, client: AsyncClient):
        """Test versioning endpoints require authentication"""
        response = await client.post("/api/versioning/example.com/versions", 
            json={"description": "Test"}
        )
        assert response.status_code == 401
        
        response = await client.get("/api/versioning/example.com/versions")
        assert response.status_code == 401
