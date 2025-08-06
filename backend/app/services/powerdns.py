"""PowerDNS API client"""

import httpx
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.settings import powerdns_settings_service

logger = logging.getLogger(__name__)


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
        if not self.api_url or not self.api_key:
            raise Exception("PowerDNS API URL or API key not configured")
            
        url = f"{self.api_url}/api/v1/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data
                )
                response.raise_for_status()
                return response.json() if response.content else {}
            except httpx.HTTPStatusError as e:
                # Log the error details for debugging
                error_detail = f"PowerDNS API error: {e.response.status_code} {e.response.reason_phrase}"
                
                if e.response.content:
                    try:
                        error_body = e.response.json()
                        error_detail += f" - {error_body}"
                        
                        # For 422 errors, provide more specific guidance
                        if e.response.status_code == 422:
                            if "error" in error_body:
                                error_msg = error_body["error"]
                                if "RRset" in error_msg or "rrset" in error_msg:
                                    error_detail = f"Record format error: {error_msg}. Check record name, type, and content format."
                                elif "SOA" in error_msg:
                                    error_detail = f"Zone configuration error: {error_msg}. Zone may not be properly initialized."
                                else:
                                    error_detail = f"Validation error: {error_msg}"
                    except:
                        error_detail += f" - {e.response.text}"
                        
                logger.error(f"PowerDNS request failed: {method} {url} - {error_detail}")
                if data:
                    logger.error(f"Request data: {data}")
                    
                raise Exception(error_detail) from e
    
    async def get_zones(self) -> List[Dict[str, Any]]:
        """Get all zones from PowerDNS"""
        return await self._request("GET", "servers/localhost/zones")
    
    async def get_zone(self, zone_name: str) -> Dict[str, Any]:
        """Get specific zone from PowerDNS"""
        # Try both with and without trailing dot
        try:
            # First try without dot (as stored in PowerDNS)
            if zone_name.endswith('.'):
                zone_name_clean = zone_name.rstrip('.')
                return await self._request("GET", f"servers/localhost/zones/{zone_name_clean}")
            else:
                return await self._request("GET", f"servers/localhost/zones/{zone_name}")
        except:
            # If that fails, try with dot
            zone_name_with_dot = zone_name if zone_name.endswith('.') else zone_name + '.'
            return await self._request("GET", f"servers/localhost/zones/{zone_name_with_dot}")
    
    async def create_zone(self, zone: PowerDNSZone) -> Dict[str, Any]:
        """Create a new zone in PowerDNS"""
        # Ensure zone name ends with dot
        zone_name = zone.name
        if not zone_name.endswith('.'):
            zone_name = zone_name + '.'
        
        # Default nameservers - using the PowerDNS server itself
        default_nameservers = [
            "ns.local."
        ]
        
        zone_data = {
            "name": zone_name,
            "kind": zone.kind,
            "nameservers": default_nameservers,
            "rrsets": [
                {
                    "name": zone_name,
                    "type": "SOA",
                    "records": [{
                        "content": f"ns.local. admin.{zone_name} 1 3600 1800 604800 86400",
                        "disabled": False
                    }],
                    "ttl": 86400
                }
            ]
        }
        
        if zone.masters:
            zone_data["masters"] = zone.masters
        if zone.account:
            zone_data["account"] = zone.account
            
        return await self._request("POST", "servers/localhost/zones", zone_data)
    
    async def delete_zone(self, zone_name: str) -> None:
        """Delete a zone from PowerDNS"""
        # Ensure zone name ends with dot for PowerDNS API
        if not zone_name.endswith('.'):
            zone_name = zone_name + '.'
        await self._request("DELETE", f"servers/localhost/zones/{zone_name}")
    
    async def get_records(self, zone_name: str) -> List[Dict[str, Any]]:
        """Get all records for a zone"""
        zone_data = await self.get_zone(zone_name)
        return zone_data.get("rrsets", [])
    
    def _validate_record_data(self, record: PowerDNSRecord, zone_name: str) -> None:
        """Validate record data before sending to PowerDNS"""
        # Check record name
        if not record.name or record.name.isspace():
            raise ValueError("Record name cannot be empty")
        
        # Check record content
        if not record.content or record.content.isspace():
            raise ValueError("Record content cannot be empty")
        
        # Validate TTL
        if record.ttl is not None and (record.ttl < 1 or record.ttl > 2147483647):
            raise ValueError("TTL must be between 1 and 2147483647 seconds")
        
        # Type-specific validations
        if record.type == "MX":
            if record.priority is None:
                raise ValueError("MX records require a priority value")
            if record.priority < 0 or record.priority > 65535:
                raise ValueError("MX priority must be between 0 and 65535")
        
        elif record.type == "SRV":
            if record.priority is None:
                raise ValueError("SRV records require a priority value")
            if record.priority < 0 or record.priority > 65535:
                raise ValueError("SRV priority must be between 0 and 65535")
        
        elif record.type == "A":
            # Validate IPv4 format
            try:
                parts = record.content.split('.')
                if len(parts) != 4:
                    raise ValueError("Invalid IPv4 address format")
                for part in parts:
                    num = int(part)
                    if not 0 <= num <= 255:
                        raise ValueError("Invalid IPv4 address")
            except ValueError as e:
                raise ValueError(f"Invalid A record content: {str(e)}")
        
        elif record.type == "AAAA":
            # Basic IPv6 validation
            if ':' not in record.content:
                raise ValueError("Invalid IPv6 address format")
    
    async def create_record(self, zone_name: str, record: PowerDNSRecord) -> None:
        """Create a new record in a zone"""
        # Store original zone name for API calls (without trailing dot)
        original_zone_name = zone_name.rstrip('.')
        
        # Ensure zone name ends with dot for internal processing
        if not zone_name.endswith('.'):
            zone_name = zone_name + '.'
        
        # Verify zone is properly set up
        if not await self.verify_zone_setup(original_zone_name):
            raise Exception(f"Zone {zone_name} is not properly configured or missing SOA record")
        
        # Format record name properly
        record_name = record.name.strip()
        if record_name == '@' or record_name == '' or record_name == original_zone_name:
            # Root of the zone
            record_name = zone_name
        elif not record_name.endswith('.'):
            # Make it fully qualified
            record_name = f"{record_name}.{zone_name}"
        elif not record_name.endswith(zone_name):
            # If it has a dot but not the zone suffix, add the zone
            record_name = f"{record_name.rstrip('.')}.{zone_name}"
        
        # Build the record content
        record_content = record.content.strip()
        
        # For MX records, handle priority in content
        if record.type == "MX" and record.priority is not None:
            # PowerDNS expects MX content to be "priority target"
            if not record_content.startswith(str(record.priority)):
                record_content = f"{record.priority} {record_content}"
        
        # For SRV records, handle priority in content if specified
        elif record.type == "SRV" and record.priority is not None:
            # SRV format: priority weight port target
            if not record_content.startswith(str(record.priority)):
                # If content doesn't start with priority, assume it's weight port target
                record_content = f"{record.priority} {record_content}"
        
        rrset = {
            "name": record_name,
            "type": record.type,
            "changetype": "REPLACE",
            "records": [{
                "content": record_content,
                "disabled": record.disabled
            }]
        }
        
        # Add TTL if specified
        if record.ttl is not None:
            rrset["ttl"] = record.ttl
        
        rrsets_data = {"rrsets": [rrset]}
        
        # Log the request for debugging
        logger.info(f"Creating record in zone {original_zone_name}: {rrsets_data}")
        
        # Use original zone name (without dot) for the API endpoint
        await self._request("PATCH", f"servers/localhost/zones/{original_zone_name}", rrsets_data)
    
    async def update_record(self, zone_name: str, record: PowerDNSRecord) -> None:
        """Update an existing record"""
        # Use the same logic as create_record since PATCH with REPLACE does both
        await self.create_record(zone_name, record)
    
    async def delete_record(self, zone_name: str, record_name: str, record_type: str) -> None:
        """Delete a record from a zone"""
        # Ensure zone name ends with dot
        if not zone_name.endswith('.'):
            zone_name = zone_name + '.'
        
        # Ensure record name is fully qualified
        if not record_name.endswith('.'):
            if record_name == '@' or record_name == zone_name.rstrip('.'):
                record_name = zone_name
            else:
                record_name = f"{record_name}.{zone_name}"
        
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
    
    async def verify_zone_setup(self, zone_name: str) -> bool:
        """Verify that a zone is properly set up with SOA record"""
        try:
            # Use zone name without trailing dot for PowerDNS API
            clean_zone_name = zone_name.rstrip('.')
            zone_data = await self.get_zone(clean_zone_name)
            rrsets = zone_data.get("rrsets", [])
            
            # Check if zone has an SOA record
            has_soa = any(rrset.get("type") == "SOA" for rrset in rrsets)
            
            if not has_soa:
                logger.warning(f"Zone {clean_zone_name} missing SOA record")
                return False
                
            return True
        except Exception as e:
            logger.error(f"Failed to verify zone {zone_name}: {e}")
            return False
