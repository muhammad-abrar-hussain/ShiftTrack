from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal


class ShiftSummary(SQLModel, table=True):
    """
    Main shift summary table storing daily shift information per employee.
    """
    __tablename__ = "shift_summary"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_first_name: str = Field(index=True)
    employee_last_name: str = Field(index=True)
    business_date: date = Field(index=True)
    
    actual_working_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=3)
    scheduled_working_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=3)
    scheduled_break_hours: Optional[Decimal] = Field(default=0, max_digits=5, decimal_places=3)
    break_hours: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=3)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship to punches
    punches: List["ShiftPunch"] = Relationship(back_populates="shift_summary")


class ShiftPunch(SQLModel, table=True):
    """
    Individual punch records for each shift.
    Stores start/end times for each work segment.
    """
    __tablename__ = "shift_punches"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    shift_summary_id: int = Field(foreign_key="shift_summary.id", index=True)
    
    start_datetime: datetime = Field(index=True)
    end_datetime: datetime = Field(index=True)
    duration_minutes: Optional[int] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship back to summary
    shift_summary: Optional[ShiftSummary] = Relationship(back_populates="punches")


class AttendanceRecord(SQLModel, table=True):
    """
    Consolidated attendance table for easy reporting and management.
    Derived from ShiftSummary but allows for manual status overrides and notes.
    """
    __tablename__ = "attendance_records"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    shift_summary_id: Optional[int] = Field(default=None, foreign_key="shift_summary.id", index=True)
    
    employee_first_name: str = Field(index=True)
    employee_last_name: str = Field(index=True)
    business_date: date = Field(index=True)
    
    # Status: Present, Absent, Late, Early Departure, Partial
    status: str = Field(default="Present", index=True)
    
    # Detailed times (can be null if absent)
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    
    total_hours: Decimal = Field(default=0, max_digits=5, decimal_places=2)
    variance_hours: Decimal = Field(default=0, max_digits=5, decimal_places=2)
    
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
