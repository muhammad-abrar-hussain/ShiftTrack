"""
Database service for storing parsed shift data.
Handles insertion of shift summaries and punch records.
"""

from sqlmodel import Session, select
from typing import List
from datetime import datetime

from models import ShiftSummary, ShiftPunch
from parsers.shift_parser import ShiftRecord
from db import engine


class ShiftDataService:
    """Service for managing shift data in the database."""
    
    def __init__(self):
        self.session = Session(engine)
    
    def insert_shift_records(self, records: List[ShiftRecord]) -> dict:
        """
        Insert parsed shift records into database.
        Returns statistics about the insertion.
        """
        stats = {
            'total_records': len(records),
            'summaries_inserted': 0,
            'punches_inserted': 0,
            'errors': 0
        }
        
        for record in records:
            try:
                # Check if record already exists (prevent duplicates)
                existing = self.session.exec(
                    select(ShiftSummary).where(
                        ShiftSummary.employee_first_name == record.employee_first_name,
                        ShiftSummary.employee_last_name == record.employee_last_name,
                        ShiftSummary.business_date == record.business_date
                    )
                ).first()
                
                if existing:
                    print(f"⚠️  Duplicate record found for {record.employee_last_name}, "
                          f"{record.employee_first_name} on {record.business_date}. Skipping.")
                    continue
                
                summary = ShiftSummary(
                    employee_first_name=record.employee_first_name,
                    employee_last_name=record.employee_last_name,
                    business_date=record.business_date,
                    actual_working_hours=record.actual_working_hours,
                    scheduled_working_hours=record.scheduled_working_hours,
                    scheduled_break_hours=record.scheduled_break_hours,
                    break_hours=record.break_hours
                )
                
                self.session.add(summary)
                self.session.flush()
                
                stats['summaries_inserted'] += 1
                
                # Create punch records
                for punch in record.punches:
                    punch_record = ShiftPunch(
                        shift_summary_id=summary.id,
                        start_datetime=punch.start,
                        end_datetime=punch.end,
                        duration_minutes=punch.duration_minutes
                    )
                    self.session.add(punch_record)
                    stats['punches_inserted'] += 1
                
                # Commit after each record
                self.session.commit()
                
                print(f"✅ Inserted: {record.employee_last_name}, {record.employee_first_name} "
                      f"- {record.business_date} ({len(record.punches)} punches)")
            
            except Exception as e:
                self.session.rollback()
                stats['errors'] += 1
                print(f"❌ Error inserting record for {record.employee_last_name}, "
                      f"{record.employee_first_name}: {e}")
        
        return stats
    
    def get_shift_summary(self, employee_last_name: str = None, 
                         start_date: datetime = None, 
                         end_date: datetime = None) -> List[ShiftSummary]:
        """
        Query shift summaries with optional filters.
        """
        query = select(ShiftSummary)
        
        if employee_last_name:
            query = query.where(ShiftSummary.employee_last_name == employee_last_name)
        
        if start_date:
            query = query.where(ShiftSummary.business_date >= start_date)
        
        if end_date:
            query = query.where(ShiftSummary.business_date <= end_date)
        
        return self.session.exec(query).all()
    
    def get_shift_with_punches(self, shift_summary_id: int) -> ShiftSummary:
        """
        Get a shift summary with all its punch records.
        """
        summary = self.session.get(ShiftSummary, shift_summary_id)
        if summary:
            # Punches are automatically loaded via relationship
            return summary
        return None
    
    def close(self):
        """Close the database session."""
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
