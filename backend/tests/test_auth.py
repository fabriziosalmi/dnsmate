"""Test authentication endpoints"""

import pytest
from httpx import AsyncClient


class TestAuth:
    """Test authentication functionality"""

    async def test_register_user(self, client: AsyncClient):
        """Test user registration"""
        response = await client.post("/auth/register", json={
            "email": "newuser@example.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User"
        })
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert data["last_name"] == "User"
        assert data["role"] == "reader"  # Default role
        assert "hashed_password" not in data

    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """Test registration with duplicate email"""
        response = await client.post("/auth/register", json={
            "email": test_user.email,
            "password": "password123",
            "first_name": "Duplicate",
            "last_name": "User"
        })
        
        assert response.status_code == 400

    async def test_login_valid_credentials(self, client: AsyncClient, test_user):
        """Test login with valid credentials"""
        response = await client.post("/auth/jwt/login", data={
            "username": test_user.email,
            "password": "password"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_invalid_credentials(self, client: AsyncClient, test_user):
        """Test login with invalid credentials"""
        response = await client.post("/auth/jwt/login", data={
            "username": test_user.email,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 400

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with nonexistent user"""
        response = await client.post("/auth/jwt/login", data={
            "username": "nonexistent@example.com",
            "password": "password"
        })
        
        assert response.status_code == 400

    async def test_get_current_user(self, client: AsyncClient, auth_headers):
        """Test getting current user information"""
        response = await client.get("/api/users/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["role"] == "editor"

    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without authentication"""
        response = await client.get("/api/users/me")
        
        assert response.status_code == 401

    async def test_logout(self, client: AsyncClient, auth_headers):
        """Test user logout"""
        response = await client.post("/auth/jwt/logout", headers=auth_headers)
        
        assert response.status_code == 200
