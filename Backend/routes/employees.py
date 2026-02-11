from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime, date

# Local imports
from db import get_session
from models import ShiftSummary

router = APIRouter(
    prefix="/employees",
    tags=["employees"],
)

@router.get("/")
def get_employees(session: Session = Depends(get_session)):
    """
    Get list of all unique employees.
    """
    employees = session.exec(
        select(
            ShiftSummary.employee_first_name,
            ShiftSummary.employee_last_name
        ).distinct()
        .order_by(ShiftSummary.employee_last_name, ShiftSummary.employee_first_name)
    ).all()
    
    return [
        {
            "first_name": emp[0],
            "last_name": emp[1],
            "full_name": f"{emp[0]} {emp[1]}"
        }
        for emp in employees
    ]

@router.get("/stats")
def get_all_employee_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Get aggregated stats for all employees within a date range.
    """
    query = select(
        ShiftSummary.employee_first_name,
        ShiftSummary.employee_last_name,
        func.sum(ShiftSummary.scheduled_working_hours).label("total_scheduled"),
        func.sum(ShiftSummary.actual_working_hours).label("total_actual"),
        func.sum(ShiftSummary.break_hours).label("total_break"),
        func.count(ShiftSummary.id).label("shift_count")
    ).group_by(ShiftSummary.employee_first_name, ShiftSummary.employee_last_name)

    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.where(ShiftSummary.business_date >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.where(ShiftSummary.business_date <= end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

    results = session.exec(query).all()
    
    return [
        {
            "first_name": res[0],
            "last_name": res[1],
            "full_name": f"{res[0]} {res[1]}",
            "total_scheduled": float(res[2] or 0),
            "total_actual": float(res[3] or 0),
            "total_break": float(res[4] or 0),
            "shift_count": res[5],
            "overtime": max(0, float(res[3] or 0) - float(res[2] or 0))
        }
        for res in results
    ]

@router.get("/{last_name}/trend")
def get_employee_trend(
    last_name: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """
    Get daily trend for a specific employee.
    """
    query = select(ShiftSummary).where(ShiftSummary.employee_last_name == last_name).order_by(ShiftSummary.business_date)

    if start_date:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        query = query.where(ShiftSummary.business_date >= start)
    if end_date:
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        query = query.where(ShiftSummary.business_date <= end)

    results = session.exec(query).all()
    
    return [
        {
            "date": res.business_date.isoformat(),
            "scheduled": float(res.scheduled_working_hours or 0),
            "actual": float(res.actual_working_hours or 0),
            "break": float(res.break_hours or 0),
        }
        for res in results
    ]
