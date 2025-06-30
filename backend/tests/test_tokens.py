"""Test API token functionality"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import APIToken


class TestTokens:
    """Test API token management"""

    async def test_create_token(self, client: AsyncClient, auth_headers):
        """Test creating an API token"""
        response = await client.post("/api/tokens/", 
            headers=auth_headers,
            json={
                "name": "Test Token",
                "expires_days": 30
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Token"
        assert data["preview"].startswith("dnsm_")
        assert "token" in data
        assert data["token"].startswith("dnsm_")

    async def test_create_token_without_expiry(self, client: AsyncClient, auth_headers):
        """Test creating a token without expiry"""
        response = await client.post("/api/tokens/", 
            headers=auth_headers,
            json={
                "name": "Permanent Token"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["expires_at"] is None

    async def test_list_tokens(self, client: AsyncClient, auth_headers):
        """Test listing user's tokens"""
        # Create a token first
        await client.post("/api/tokens/", 
            headers=auth_headers,
            json={"name": "Test Token"}
        )
        
        response = await client.get("/api/tokens/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Token"
        assert "token" not in data[0]  # Token should not be in list response

    async def test_delete_token(self, client: AsyncClient, auth_headers, db_session: AsyncSession):
        """Test deleting a token"""
        # Create a token first
        create_response = await client.post("/api/tokens/", 
            headers=auth_headers,
            json={"name": "Token to Delete"}
        )
        
        # Get the token ID from the database
        tokens_response = await client.get("/api/tokens/", headers=auth_headers)
        token_id = tokens_response.json()[0]["id"]
        
        # Delete the token
        response = await client.delete(f"/api/tokens/{token_id}", headers=auth_headers)
        
        assert response.status_code == 200
        
        # Verify it's deleted
        tokens_response = await client.get("/api/tokens/", headers=auth_headers)
        assert len(tokens_response.json()) == 0

    async def test_toggle_token_status(self, client: AsyncClient, auth_headers):
        """Test activating/deactivating a token"""
        # Create a token first
        await client.post("/api/tokens/", 
            headers=auth_headers,
            json={"name": "Toggle Token"}
        )
        
        # Get the token ID
        tokens_response = await client.get("/api/tokens/", headers=auth_headers)
        token_id = tokens_response.json()[0]["id"]
        
        # Deactivate the token
        response = await client.patch(f"/api/tokens/{token_id}", 
            headers=auth_headers,
            json={"is_active": False}
        )
        
        assert response.status_code == 200
        
        # Verify it's deactivated
        tokens_response = await client.get("/api/tokens/", headers=auth_headers)
        assert tokens_response.json()[0]["is_active"] is False

    async def test_token_limit(self, client: AsyncClient, auth_headers):
        """Test API token limit enforcement"""
        # Create maximum number of tokens (10)
        for i in range(10):
            response = await client.post("/api/tokens/", 
                headers=auth_headers,
                json={"name": f"Token {i+1}"}
            )
            assert response.status_code == 200
        
        # Try to create one more - should fail
        response = await client.post("/api/tokens/", 
            headers=auth_headers,
            json={"name": "Token 11"}
        )
        
        assert response.status_code == 400
        assert "maximum" in response.json()["detail"].lower()

    async def test_api_token_authentication(self, client: AsyncClient, auth_headers):
        """Test using API token for authentication"""
        # Create a token
        create_response = await client.post("/api/tokens/", 
            headers=auth_headers,
            json={"name": "API Test Token"}
        )
        
        token = create_response.json()["token"]
        
        # Use token to access API
        response = await client.get("/api/users/me", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    async def test_inactive_token_authentication(self, client: AsyncClient, auth_headers):
        """Test that inactive tokens cannot be used"""
        # Create and deactivate a token
        create_response = await client.post("/api/tokens/", 
            headers=auth_headers,
            json={"name": "Inactive Token"}
        )
        
        token = create_response.json()["token"]
        
        # Get token ID and deactivate
        tokens_response = await client.get("/api/tokens/", headers=auth_headers)
        token_id = tokens_response.json()[0]["id"]
        
        await client.patch(f"/api/tokens/{token_id}", 
            headers=auth_headers,
            json={"is_active": False}
        )
        
        # Try to use inactive token
        response = await client.get("/api/users/me", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
