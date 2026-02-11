from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List, Dict, Any
from datetime import datetime, date
from decimal import Decimal

from db import get_session
from models import ShiftSummary, ShiftPunch

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
)

def calculate_alerts(summary: ShiftSummary) -> List[Dict[str, Any]]:
    alerts = []
    
    actual_hours = float(summary.actual_working_hours or 0)
    scheduled_hours = float(summary.scheduled_working_hours or 0)
    break_hours = float(summary.break_hours or 0)
    scheduled_break_hours = float(summary.scheduled_break_hours or 0)
    
    employee_name = f"{summary.employee_first_name} {summary.employee_last_name}"
    business_date = summary.business_date.isoformat()
    
    # 1. Missed Shift
    if scheduled_hours > 0 and actual_hours == 0:
        alerts.append({
            "id": f"missed-{summary.id}",
            "type": "Missed Shift",
            "employeeName": employee_name,
            "severity": "high",
            "message": f"Employee was scheduled for {scheduled_hours}h but did not clock in.",
            "date": business_date,
            "suggestion": "Contact employee to verify attendance."
        })
        
    # 2. Excessive Overtime
    if actual_hours > scheduled_hours + 0.5:
        variance = actual_hours - scheduled_hours
        alerts.append({
            "id": f"ot-{summary.id}",
            "type": "Excessive Overtime",
            "employeeName": employee_name,
            "severity": "medium",
            "message": f"Actual hours ({actual_hours}h) exceeded scheduled ({scheduled_hours}h) by {variance:.1f}h.",
            "date": business_date,
            "suggestion": "Review shift logs for unscheduled work segments."
        })
        
    # 3. No Break Taken
    if actual_hours > 8.0 and break_hours == 0:
        alerts.append({
            "id": f"nobreak-{summary.id}",
            "type": "No Break Taken",
            "employeeName": employee_name,
            "severity": "medium",
            "message": f"Shift duration {actual_hours}h with no recorded break.",
            "date": business_date,
            "suggestion": "Ensure compliance with meal break policies."
        })
        
    # 4. Excessive Break
    if break_hours > scheduled_break_hours + 0.1 and break_hours > 0:
        variance = break_hours - scheduled_break_hours
        alerts.append({
            "id": f"break-{summary.id}",
            "type": "Excessive Break",
            "employeeName": employee_name,
            "severity": "low",
            "message": f"Break duration {break_hours}h exceeded scheduled {scheduled_break_hours}h.",
            "date": business_date,
            "suggestion": "Discuss break timing with the employee."
        })

    # 5. Short Shift (Early Clock-out)
    if scheduled_hours > 0 and actual_hours < scheduled_hours - 1.0 and actual_hours > 0:
        variance = scheduled_hours - actual_hours
        alerts.append({
            "id": f"early-{summary.id}",
            "type": "Early Clock-out",
            "employeeName": employee_name,
            "severity": "low",
            "message": f"Employee clocked out {variance:.1f}h earlier than scheduled.",
            "date": business_date,
            "suggestion": "Verify if early departure was authorized."
        })

    return alerts

@router.get("/")
def get_alerts(
    start_date: str = None,
    end_date: str = None,
    session: Session = Depends(get_session)
):
    """
    Fetch all auto-detected alerts for a given date range.
    """
    query = select(ShiftSummary)
    
    if start_date:
        query = query.where(ShiftSummary.business_date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.where(ShiftSummary.business_date <= datetime.strptime(end_date, '%Y-%m-%d').date())
        
    query = query.order_by(ShiftSummary.business_date.desc())
    
    summaries = session.exec(query).all()
    
    all_alerts = []
    for summary in summaries:
        all_alerts.extend(calculate_alerts(summary))
        
    # Sort by severity (high first) and then by date
    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_alerts.sort(key=lambda x: (severity_order.get(x["severity"], 3), x["date"]))
    
    return all_alerts
