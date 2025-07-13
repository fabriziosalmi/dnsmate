"""Audit log API routes"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import csv
import io

from app.core.database import get_async_session
from app.core.auth import current_active_user
from app.models.user import User, UserRole
from app.models.audit import AuditLog, AuditEventType
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit", tags=["audit"])

# Response schemas
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    timestamp: datetime

class AuditLogsResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    offset: int
    limit: int

class FilterOptionsResponse(BaseModel):
    actions: List[str]
    resource_types: List[str]


def require_admin(current_user: User = Depends(current_active_user)):
    """Dependency to require admin access"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/logs", response_model=AuditLogsResponse)
async def get_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    limit: int = Query(50, ge=1, le=1000, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Get audit logs with filtering (admin only)"""
    try:
        # Build query conditions
        conditions = []
        
        if user_id is not None:
            conditions.append(AuditLog.user_id == user_id)
        
        if action:
            try:
                event_type = AuditEventType(action)
                conditions.append(AuditLog.event_type == event_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
        
        if resource_type:
            conditions.append(AuditLog.resource_type == resource_type)
        
        if start_date:
            conditions.append(AuditLog.created_at >= start_date)
        
        if end_date:
            conditions.append(AuditLog.created_at <= end_date)

        # Build base query
        base_query = select(AuditLog)
        if conditions:
            base_query = base_query.filter(and_(*conditions))

        # Get total count
        count_query = select(func.count()).select_from(
            base_query.subquery()
        )
        total_result = await session.execute(count_query)
        total = total_result.scalar()

        # Get logs with pagination
        logs_query = base_query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        logs_result = await session.execute(logs_query)
        logs = logs_result.scalars().all()

        # Convert to response format
        log_responses = []
        for log in logs:
            log_responses.append(AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_email=log.user_email,
                action=log.event_type.value,
                resource_type=log.resource_type or "",
                resource_id=log.resource_id,
                details=log.details,
                ip_address=log.user_ip,
                user_agent=log.user_agent,
                timestamp=log.created_at
            ))

        return AuditLogsResponse(
            logs=log_responses,
            total=total,
            offset=offset,
            limit=limit
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit logs")


@router.get("/filter-options", response_model=FilterOptionsResponse)
async def get_filter_options(
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Get available filter options for audit logs (admin only)"""
    try:
        # Get distinct actions
        actions_query = select(AuditLog.event_type).distinct()
        actions_result = await session.execute(actions_query)
        actions = [action[0].value for action in actions_result.all()]

        # Get distinct resource types
        resource_types_query = select(AuditLog.resource_type).distinct().filter(
            AuditLog.resource_type.isnot(None)
        )
        resource_types_result = await session.execute(resource_types_query)
        resource_types = [rt[0] for rt in resource_types_result.all()]

        return FilterOptionsResponse(
            actions=sorted(actions),
            resource_types=sorted(resource_types)
        )

    except Exception as e:
        logger.error(f"Failed to get filter options: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve filter options")


@router.get("/export")
async def export_audit_logs(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Export audit logs as CSV (admin only)"""
    try:
        # Build query conditions (same as get_audit_logs)
        conditions = []
        
        if user_id is not None:
            conditions.append(AuditLog.user_id == user_id)
        
        if action:
            try:
                event_type = AuditEventType(action)
                conditions.append(AuditLog.event_type == event_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
        
        if resource_type:
            conditions.append(AuditLog.resource_type == resource_type)
        
        if start_date:
            conditions.append(AuditLog.created_at >= start_date)
        
        if end_date:
            conditions.append(AuditLog.created_at <= end_date)

        # Build query
        query = select(AuditLog)
        if conditions:
            query = query.filter(and_(*conditions))
        
        query = query.order_by(AuditLog.created_at.desc()).limit(10000)  # Limit for safety
        
        result = await session.execute(query)
        logs = result.scalars().all()

        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Timestamp', 'User ID', 'User Email', 'Action', 
            'Resource Type', 'Resource ID', 'Success', 'IP Address', 
            'User Agent', 'Description', 'Details'
        ])
        
        # Write data
        for log in logs:
            writer.writerow([
                log.id,
                log.created_at.isoformat(),
                log.user_id or '',
                log.user_email or '',
                log.event_type.value,
                log.resource_type or '',
                log.resource_id or '',
                log.success,
                log.user_ip or '',
                log.user_agent or '',
                log.event_description,
                str(log.details) if log.details else ''
            ])

        # Prepare response
        output.seek(0)
        csv_content = output.getvalue()
        output.close()

        # Return CSV file
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=audit-logs-{datetime.now().strftime('%Y%m%d-%H%M%S')}.csv"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to export audit logs")


@router.get("/user/{user_id}/logs", response_model=List[AuditLogResponse])
async def get_user_audit_logs(
    user_id: int,
    limit: int = Query(50, ge=1, le=200, description="Number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get audit logs for a specific user"""
    try:
        # Check permissions: admin can see any user's logs, users can only see their own
        if current_user.role != UserRole.ADMIN and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get logs for the user
        query = select(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
        
        result = await session.execute(query)
        logs = result.scalars().all()

        # Convert to response format
        return [
            AuditLogResponse(
                id=log.id,
                user_id=log.user_id,
                user_email=log.user_email,
                action=log.event_type.value,
                resource_type=log.resource_type or "",
                resource_id=log.resource_id,
                details=log.details,
                ip_address=log.user_ip,
                user_agent=log.user_agent,
                timestamp=log.created_at
            )
            for log in logs
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get user audit logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user audit logs")


@router.get("/stats")
async def get_audit_stats(
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_async_session)
):
    """Get audit statistics (admin only)"""
    try:
        # Total logs
        total_query = select(func.count(AuditLog.id))
        total_result = await session.execute(total_query)
        total_logs = total_result.scalar()

        # Logs by success/failure
        success_query = select(func.count(AuditLog.id)).filter(AuditLog.success == True)
        success_result = await session.execute(success_query)
        successful_logs = success_result.scalar()

        failed_logs = total_logs - successful_logs

        # Top users by activity (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        top_users_query = select(
            AuditLog.user_email,
            func.count(AuditLog.id).label('count')
        ).filter(
            and_(
                AuditLog.created_at >= thirty_days_ago,
                AuditLog.user_email.isnot(None)
            )
        ).group_by(AuditLog.user_email).order_by(func.count(AuditLog.id).desc()).limit(10)
        
        top_users_result = await session.execute(top_users_query)
        top_users = [{"email": row[0], "count": row[1]} for row in top_users_result.all()]

        # Most common actions (last 30 days)
        top_actions_query = select(
            AuditLog.event_type,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.created_at >= thirty_days_ago
        ).group_by(AuditLog.event_type).order_by(func.count(AuditLog.id).desc()).limit(10)
        
        top_actions_result = await session.execute(top_actions_query)
        top_actions = [{"action": row[0].value, "count": row[1]} for row in top_actions_result.all()]

        return {
            "total_logs": total_logs,
            "successful_logs": successful_logs,
            "failed_logs": failed_logs,
            "top_users_30d": top_users,
            "top_actions_30d": top_actions
        }

    except Exception as e:
        logger.error(f"Failed to get audit stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve audit statistics")
