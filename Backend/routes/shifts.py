from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path

# Local imports
from db import get_session
from models import ShiftSummary, ShiftPunch
from parsers.shift_parser import PDFParser
from services.shift_service import ShiftDataService

router = APIRouter(
    prefix="/shifts",
    tags=["shifts"],
)

@router.get("/")
def get_shifts(
    employee_last_name: str = None,
    start_date: str = None,
    end_date: str = None,
    session: Session = Depends(get_session)
):
    """
    Fetch shift summaries with optional filters, including computed start/end times and punch count.
    """
    query = select(
        ShiftSummary,
        func.min(ShiftPunch.start_datetime).label("start_time"),
        func.max(ShiftPunch.end_datetime).label("end_time"),
        func.count(ShiftPunch.id).label("punch_count")
    ).outerjoin(ShiftPunch).group_by(ShiftSummary.id)
    
    if employee_last_name:
        query = query.where(ShiftSummary.employee_last_name == employee_last_name)
    
    if start_date:
        query = query.where(ShiftSummary.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    
    if end_date:
        query = query.where(ShiftSummary.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    
    query = query.order_by(ShiftSummary.business_date.desc())
    
    results = session.exec(query).all()
    
    records = []
    for summary, start_t, end_t, p_count in results:
        record = summary.model_dump()
        record["start_time"] = start_t.strftime("%H:%M:%S") if start_t else None
        record["end_time"] = end_t.strftime("%H:%M:%S") if end_t else None
        record["punch_count"] = p_count
        records.append(record)
        
    return records


@router.get("/analytics")
def get_shift_analytics(
    start_date: str = None,
    end_date: str = None,
    session: Session = Depends(get_session)
):
    """
    Detailed analytics for scatter plots and break compliance.
    """
    query = select(
        ShiftSummary,
        func.count(ShiftPunch.id).label("punch_count")
    ).outerjoin(ShiftPunch).group_by(ShiftSummary.id)

    if start_date:
        query = query.where(ShiftSummary.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.where(ShiftSummary.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())

    results = session.exec(query).all()
    
    return [
        {
            "id": s.id,
            "employee_name": f"{s.employee_first_name} {s.employee_last_name}",
            "date": s.business_date.isoformat(),
            "actual_hours": float(s.actual_working_hours or 0),
            "break_hours": float(s.break_hours or 0),
            "scheduled_break_hours": float(s.scheduled_break_hours or 0),
            "punch_count": p_count
        }
        for s, p_count in results
    ]


@router.get("/{shift_id}", response_model=ShiftSummary)
def get_shift_detail(shift_id: int, session: Session = Depends(get_session)):
    """
    Fetch a specific shift summary with all punch records.
    """
    shift = session.get(ShiftSummary, shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@router.get("/{shift_id}/punches", response_model=List[ShiftPunch])
def get_shift_punches(shift_id: int, session: Session = Depends(get_session)):
    """
    Fetch all punch records for a specific shift.
    """
    punches = session.exec(
        select(ShiftPunch).where(ShiftPunch.shift_summary_id == shift_id)
    ).all()
    return punches


@router.get("/stats/summary")
def get_shift_stats_summary(
    start_date: str = None,
    end_date: str = None,
    session: Session = Depends(get_session)
):
    """
    Get aggregated KPIs across all employees for a date range.
    """
    query = select(
        func.count(ShiftSummary.id).label("total_shifts"),
        func.count(func.distinct(ShiftSummary.employee_last_name + ShiftSummary.employee_first_name)).label("total_employees"),
        func.sum(ShiftSummary.scheduled_working_hours).label("total_scheduled"),
        func.sum(ShiftSummary.actual_working_hours).label("total_actual"),
        func.sum(ShiftSummary.break_hours).label("total_break")
    )

    if start_date:
        query = query.where(ShiftSummary.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.where(ShiftSummary.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())

    res = session.exec(query).first()
    
    actual = float(res[3] or 0)
    scheduled = float(res[2] or 0)
    
    return {
        "total_shifts": res[0],
        "total_employees": res[1],
        "total_scheduled": round(scheduled, 1),
        "total_actual": round(actual, 1),
        "total_break": round(float(res[4] or 0), 1),
        "variance": round(actual - scheduled, 1),
        "compliance": round((actual / scheduled * 100) if scheduled > 0 else 100, 0),
        "overtime": round(max(0, actual - scheduled), 1)
    }


@router.get("/stats/daily")
def get_shift_stats_daily(
    start_date: str = None,
    end_date: str = None,
    session: Session = Depends(get_session)
):
    """
    Get daily aggregated hours for trend charts.
    """
    query = select(
        ShiftSummary.business_date,
        func.sum(ShiftSummary.scheduled_working_hours).label("scheduled"),
        func.sum(ShiftSummary.actual_working_hours).label("actual"),
        func.sum(ShiftSummary.break_hours).label("breaks")
    ).group_by(ShiftSummary.business_date).order_by(ShiftSummary.business_date)

    if start_date:
        query = query.where(ShiftSummary.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.where(ShiftSummary.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())

    results = session.exec(query).all()
    
    return [
        {
            "date": r[0].isoformat(),
            "scheduled": float(r[1] or 0),
            "actual": float(r[2] or 0),
            "breaks": float(r[3] or 0),
            "overtime": max(0, float(r[2] or 0) - float(r[1] or 0))
        }
        for r in results
    ]

@router.post("/upload")
async def upload_shift_report(
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """
    Upload a PDF shift report, parse it, and store records in the database.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Ensure uploads directory exists
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    
    file_path = upload_dir / file.filename
    
    try:
        # Save temporary file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse PDF
        parser = PDFParser(str(file_path))
        records = parser.parse()
        
        if not records:
            return {
                "message": "No records found in PDF",
                "stats": {
                    "total_records": 0,
                    "summaries_inserted": 0,
                    "punches_inserted": 0,
                    "errors": 0
                }
            }
        
        # Store in database
        with ShiftDataService() as service:
            stats = service.insert_shift_records(records)
            
        return {
            "message": "File processed successfully",
            "stats": stats,
            "filename": file.filename
        }
        
    except Exception as e:
        print(f"Error processing upload: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary file if it exists
        if file_path.exists():
            try:
                os.remove(file_path)
            except:
                pass
