from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, date

# Local imports
from db import get_session
from models import AttendanceRecord

router = APIRouter(
    prefix="/attendance",
    tags=["attendance"],
)

@router.get("/", response_model=List[AttendanceRecord])
def get_attendance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    employee_last_name: Optional[str] = None,
    status: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Fetch attendance records with optional filters.
    """
    query = select(AttendanceRecord).order_by(AttendanceRecord.business_date.desc())
    
    if start_date:
        query = query.where(AttendanceRecord.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.where(AttendanceRecord.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if employee_last_name:
        query = query.where(AttendanceRecord.employee_last_name.ilike(f"%{employee_last_name}%"))
    if status:
        query = query.where(AttendanceRecord.status == status)
        
    return session.exec(query).all()

@router.get("/summary")
def get_attendance_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Get high-level attendance stats.
    """
    query = select(AttendanceRecord)
    if start_date:
        query = query.where(AttendanceRecord.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.where(AttendanceRecord.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        
    records = session.exec(query).all()
    
    summary = {
        "total": len(records),
        "present": len([r for r in records if r.status == "Present"]),
        "absent": len([r for r in records if r.status == "Absent"]),
        "late": len([r for r in records if r.status == "Late"])
    }
    
    return summary
from pydantic import BaseModel

class BulkAttendanceItem(BaseModel):
    first_name: str
    last_name: str
    status: str
    notes: Optional[str] = None

class BulkAttendanceSubmit(BaseModel):
    business_date: date
    records: List[BulkAttendanceItem]

@router.post("/bulk")
def submit_bulk_attendance(
    data: BulkAttendanceSubmit,
    session: Session = Depends(get_session)
):
    """
    Manually mark attendance for multiple employees on a specific date.
    Updates existing records if found (matching name and date).
    """
    results = {
        "updated": 0,
        "created": 0
    }
    
    for item in data.records:
        # Try to find existing record
        record = session.exec(
            select(AttendanceRecord).where(
                AttendanceRecord.employee_first_name == item.first_name,
                AttendanceRecord.employee_last_name == item.last_name,
                AttendanceRecord.business_date == data.business_date
            )
        ).first()
        
        if record:
            record.status = item.status
            record.notes = item.notes
            record.updated_at = datetime.utcnow()
            session.add(record)
            results["updated"] += 1
        else:
            new_record = AttendanceRecord(
                employee_first_name=item.first_name,
                employee_last_name=item.last_name,
                business_date=data.business_date,
                status=item.status,
                notes=item.notes
            )
            session.add(new_record)
            results["created"] += 1
            
    session.commit()
    return {"message": "Attendance submitted successfully", "stats": results}
