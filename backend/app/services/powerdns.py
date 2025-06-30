"""PowerDNS API client"""

import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings


class PowerDNSZone(BaseModel):
    """PowerDNS Zone model"""
    name: str
    kind: str
    serial: Optional[int] = None
    masters: Optional[List[str]] = None
    account: Optional[str] = None


class PowerDNSRecord(BaseModel):
    """PowerDNS Record model"""
    name: str
    type: str
    content: str
    ttl: Optional[int] = None
    priority: Optional[int] = None
    disabled: bool = False


class PowerDNSClient:
    """PowerDNS API client"""
    
    def __init__(self, api_url: str = None, api_key: str = None):
        self.api_url = api_url or settings.powerdns_api_url
        self.api_key = api_key or settings.powerdns_api_key
        self.headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make HTTP request to PowerDNS API"""
        url = f"{self.api_url}/api/v1/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=self.headers,
                json=data
            )
            response.raise_for_status()
            return response.json() if response.content else {}
    
    async def get_zones(self) -> List[Dict[str, Any]]:
        """Get all zones from PowerDNS"""
        return await self._request("GET", "servers/localhost/zones")
    
    async def get_zone(self, zone_name: str) -> Dict[str, Any]:
        """Get specific zone from PowerDNS"""
        return await self._request("GET", f"servers/localhost/zones/{zone_name}")
    
    async def create_zone(self, zone: PowerDNSZone) -> Dict[str, Any]:
        """Create a new zone in PowerDNS"""
        zone_data = {
            "name": zone.name,
            "kind": zone.kind,
            "nameservers": []
        }
        if zone.masters:
            zone_data["masters"] = zone.masters
        if zone.account:
            zone_data["account"] = zone.account
            
        return await self._request("POST", "servers/localhost/zones", zone_data)
    
    async def delete_zone(self, zone_name: str) -> None:
        """Delete a zone from PowerDNS"""
        await self._request("DELETE", f"servers/localhost/zones/{zone_name}")
    
    async def get_records(self, zone_name: str) -> List[Dict[str, Any]]:
        """Get all records for a zone"""
        zone_data = await self.get_zone(zone_name)
        return zone_data.get("rrsets", [])
    
    async def create_record(self, zone_name: str, record: PowerDNSRecord) -> None:
        """Create a new record in a zone"""
        rrsets_data = {
            "rrsets": [{
                "name": record.name,
                "type": record.type,
                "records": [{
                    "content": record.content,
                    "disabled": record.disabled
                }],
                "ttl": record.ttl
            }]
        }
        await self._request("PATCH", f"servers/localhost/zones/{zone_name}", rrsets_data)
    
    async def update_record(self, zone_name: str, record: PowerDNSRecord) -> None:
        """Update an existing record"""
        await self.create_record(zone_name, record)  # PATCH replaces existing records
    
    async def delete_record(self, zone_name: str, record_name: str, record_type: str) -> None:
        """Delete a record from a zone"""
        rrsets_data = {
            "rrsets": [{
                "name": record_name,
                "type": record_type,
                "changetype": "DELETE"
            }]
        }
        await self._request("PATCH", f"servers/localhost/zones/{zone_name}", rrsets_data)
    
    async def test_connection(self) -> bool:
        """Test connection to PowerDNS API"""
        try:
            await self._request("GET", "servers")
            return True
        except Exception:
            return False
