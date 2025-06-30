"""Zone versioning service"""

import json
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime

from app.models.user import User, ZoneVersion
from app.models.dns import Zone, Record
from app.services.powerdns import PowerDNSClient


class ZoneVersioningService:
    """Service for managing zone versions and rollbacks"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.powerdns = PowerDNSClient()
    
    async def create_version(
        self,
        zone_name: str,
        user: User,
        description: Optional[str] = None,
        changes_summary: Optional[str] = None
    ) -> ZoneVersion:
        """Create a new version snapshot of a zone"""
        
        # Get current zone data from PowerDNS
        try:
            zone_data = await self.powerdns.get_zone(zone_name)
            records_data = await self.powerdns.get_records(zone_name)
        except Exception as e:
            raise ValueError(f"Failed to get zone data: {str(e)}")
        
        # Get next version number
        result = await self.session.execute(
            select(func.max(ZoneVersion.version_number))
            .where(ZoneVersion.zone_name == zone_name)
        )
        max_version = result.scalar() or 0
        next_version = max_version + 1
        
        # Create version record
        version = ZoneVersion(
            zone_name=zone_name,
            user_id=user.id,
            version_number=next_version,
            zone_data=zone_data,
            records_data=records_data,
            description=description,
            changes_summary=changes_summary
        )
        
        self.session.add(version)
        await self.session.commit()
        await self.session.refresh(version)
        
        # Clean up old versions (keep only last 100 per zone)
        await self._cleanup_old_versions(zone_name)
        
        return version
    
    async def get_zone_versions(self, zone_name: str, limit: int = 50) -> List[ZoneVersion]:
        """Get versions for a zone"""
        result = await self.session.execute(
            select(ZoneVersion)
            .where(ZoneVersion.zone_name == zone_name)
            .order_by(desc(ZoneVersion.version_number))
            .limit(limit)
        )
        return result.scalars().all()
    
    async def get_version_details(self, version_id: int) -> Optional[ZoneVersion]:
        """Get specific version details"""
        result = await self.session.execute(
            select(ZoneVersion)
            .where(ZoneVersion.id == version_id)
        )
        return result.scalar_one_or_none()
    
    async def rollback_to_version(
        self,
        zone_name: str,
        version_id: int,
        user: User,
        description: Optional[str] = None
    ) -> ZoneVersion:
        """Rollback zone to a specific version"""
        
        # Get the target version
        version = await self.get_version_details(version_id)
        if not version or version.zone_name != zone_name:
            raise ValueError("Version not found")
        
        # Create a backup of current state before rollback
        await self.create_version(
            zone_name,
            user,
            f"Pre-rollback backup before reverting to version {version.version_number}",
            "Automatic backup before rollback"
        )
        
        try:
            # Apply the zone configuration
            await self._apply_zone_config(zone_name, version.zone_data, version.records_data)
            
            # Create new version for the rollback
            rollback_version = await self.create_version(
                zone_name,
                user,
                description or f"Rollback to version {version.version_number}",
                f"Rolled back to version {version.version_number} created at {version.created_at}"
            )
            
            return rollback_version
            
        except Exception as e:
            raise ValueError(f"Rollback failed: {str(e)}")
    
    async def compare_versions(
        self,
        zone_name: str,
        version1_id: int,
        version2_id: int
    ) -> Dict[str, Any]:
        """Compare two versions and return differences"""
        
        version1 = await self.get_version_details(version1_id)
        version2 = await self.get_version_details(version2_id)
        
        if not version1 or not version2:
            raise ValueError("One or both versions not found")
        
        if version1.zone_name != zone_name or version2.zone_name != zone_name:
            raise ValueError("Versions do not belong to the specified zone")
        
        # Compare zone data
        zone_diff = self._compare_dicts(version1.zone_data, version2.zone_data)
        
        # Compare records
        records1 = {f"{r['name']}:{r['type']}": r for r in version1.records_data}
        records2 = {f"{r['name']}:{r['type']}": r for r in version2.records_data}
        
        records_diff = {
            "added": [],
            "removed": [],
            "modified": []
        }
        
        # Find added and modified records
        for key, record in records2.items():
            if key not in records1:
                records_diff["added"].append(record)
            elif records1[key] != record:
                records_diff["modified"].append({
                    "old": records1[key],
                    "new": record
                })
        
        # Find removed records
        for key, record in records1.items():
            if key not in records2:
                records_diff["removed"].append(record)
        
        return {
            "zone_changes": zone_diff,
            "record_changes": records_diff,
            "version1": {
                "id": version1.id,
                "version_number": version1.version_number,
                "created_at": version1.created_at
            },
            "version2": {
                "id": version2.id,
                "version_number": version2.version_number,
                "created_at": version2.created_at
            }
        }
    
    async def _apply_zone_config(
        self,
        zone_name: str,
        zone_data: Dict[str, Any],
        records_data: List[Dict[str, Any]]
    ):
        """Apply zone configuration from version data"""
        
        try:
            # Get current records to calculate diff
            current_records = await self.powerdns.get_records(zone_name)
            current_records_map = {f"{r['name']}:{r['type']}": r for r in current_records}
            target_records_map = {f"{r['name']}:{r['type']}": r for r in records_data}
            
            # Calculate changes needed
            to_delete = []
            to_create = []
            to_update = []
            
            # Find records to delete (exist in current but not in target)
            for key, record in current_records_map.items():
                if key not in target_records_map:
                    to_delete.append(record)
            
            # Find records to create or update
            for key, target_record in target_records_map.items():
                if key not in current_records_map:
                    # New record
                    to_create.append(target_record)
                elif current_records_map[key] != target_record:
                    # Modified record
                    to_update.append(target_record)
            
            # Apply changes in order: delete, update, create
            
            # Delete records
            for record in to_delete:
                try:
                    await self.powerdns.delete_record(
                        zone_name,
                        record['name'],
                        record['type']
                    )
                except Exception as e:
                    # Log warning but continue
                    print(f"Warning: Failed to delete record {record['name']}:{record['type']}: {e}")
            
            # Update existing records
            for record in to_update:
                try:
                    await self.powerdns.update_record(
                        zone_name,
                        record['name'],
                        record['type'],
                        record['content'],
                        record.get('ttl', 3600)
                    )
                except Exception as e:
                    print(f"Warning: Failed to update record {record['name']}:{record['type']}: {e}")
            
            # Create new records
            for record in to_create:
                try:
                    await self.powerdns.create_record(
                        zone_name,
                        record['name'],
                        record['type'],
                        record['content'],
                        record.get('ttl', 3600)
                    )
                except Exception as e:
                    print(f"Warning: Failed to create record {record['name']}:{record['type']}: {e}")
            
            # Update zone configuration if needed
            current_zone = await self.powerdns.get_zone(zone_name)
            zone_updates = {}
            
            # Check for zone-level changes
            for key in ['kind', 'serial', 'notified_serial']:
                if key in zone_data and zone_data[key] != current_zone.get(key):
                    zone_updates[key] = zone_data[key]
            
            if zone_updates:
                await self.powerdns.update_zone(zone_name, zone_updates)
                
        except Exception as e:
            raise ValueError(f"Failed to apply zone configuration: {str(e)}")
    
    def _compare_dicts(self, dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
        """Compare two dictionaries and return differences"""
        
        changes = {
            "added": {},
            "removed": {},
            "modified": {}
        }
        
        # Find added and modified keys
        for key, value in dict2.items():
            if key not in dict1:
                changes["added"][key] = value
            elif dict1[key] != value:
                changes["modified"][key] = {
                    "old": dict1[key],
                    "new": value
                }
        
        # Find removed keys
        for key, value in dict1.items():
            if key not in dict2:
                changes["removed"][key] = value
        
        return changes
    
    async def _cleanup_old_versions(self, zone_name: str, keep_count: int = 100):
        """Clean up old versions, keeping only the most recent ones"""
        
        result = await self.session.execute(
            select(ZoneVersion.id)
            .where(ZoneVersion.zone_name == zone_name)
            .order_by(desc(ZoneVersion.version_number))
            .offset(keep_count)
        )
        old_version_ids = [row[0] for row in result.fetchall()]
        
        if old_version_ids:
            await self.session.execute(
                ZoneVersion.__table__.delete()
                .where(ZoneVersion.id.in_(old_version_ids))
            )
            await self.session.commit()
