"""
PDF Parser for Burger King Shift Reports
Extracts employee shift data from "Scheduled vs Actual Hours" PDFs.

Core Architecture:
1. clean_lines(lines) → normalized lines
2. group_into_records(lines) → record blocks
3. parse_record(record_lines) → structured data
"""

import re
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from dataclasses import dataclass

# Local imports
from utils.pdf_utils import extract_text_with_pdfplumber, extract_text_with_pymupdf
from utils.artifact_handler import save_pipeline_artifact
from utils.time_utils import parse_time_12h

@dataclass
class PunchTime:
    """Represents a single punch time range."""
    start: datetime
    end: datetime
    duration_minutes: int

@dataclass
class ShiftRecord:
    """Represents a complete shift record for one employee on one day."""
    employee_first_name: str
    employee_last_name: str
    business_date: date
    actual_working_hours: Optional[Decimal]
    scheduled_working_hours: Optional[Decimal]
    scheduled_break_hours: Optional[Decimal]
    break_hours: Optional[Decimal]
    punches: List[PunchTime]
    scheduled_punches: List[PunchTime]

class PDFParser:
    """
    Core parser logic for Burger King shift tracking PDFs.
    Handles cleaning, grouping, and parsing of employee records.
    """
    
    # Regex patterns
    EMPLOYEE_DATE_PATTERN = re.compile(
        r'^([A-Za-z\-\']+),\s+([A-Za-z\-\']+)\s+(\d{1,2}/\d{1,2}/\d{4})'
    )
    TIME_PATTERN = re.compile(
        r'(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])'
    )
    
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.artifact_dir = "pipeline_artifacts"

    # -------------------------------------------------------------------------
    # Core Step 1: Clean and Normalize Lines
    # -------------------------------------------------------------------------
    def clean_lines(self, lines: List[str]) -> List[str]:
        """Normalize and filter junk lines."""
        cleaned = []
        skip_patterns = [
            'Scheduled vs Actual Hours', 'JS Foods', 'BURGER KING',
            'Employee', 'Business', 'Labor Type', 'Break', 'Hours',
            'Date', 'Time', 'Worked', '---', '===', 'Total:', 'Page',
            'Global Payments Inc', 'strictly prohibited', 'Difference',
        ]
        
        for line in lines:
            line = re.sub(r'\s+', ' ', line).strip()
            if not line or any(pattern in line for pattern in skip_patterns):
                continue
            cleaned.append(line)
        return cleaned

    # -------------------------------------------------------------------------
    # Core Step 2: Group Lines into Records
    # -------------------------------------------------------------------------
    def group_into_records(self, lines: List[str]) -> List[List[str]]:
        """Group lines by employee and date boundaries."""
        records = []
        current_record = []
        
        for line in lines:
            if self.EMPLOYEE_DATE_PATTERN.match(line):
                if current_record:
                    records.append(current_record)
                current_record = [line]
            else:
                if current_record:
                    current_record.append(line)
        
        if current_record:
            records.append(current_record)
        
        print(f"✅ Grouped {len(records)} employee shift records")
        return records

    # -------------------------------------------------------------------------
    # Core Step 3: Parse Individual Record
    # -------------------------------------------------------------------------
    def parse_record(self, record_lines: List[str]) -> Optional[ShiftRecord]:
        """Parse a block of lines into a ShiftRecord object."""
        if len(record_lines) < 1:
            return None
        
        try:
            match = self.EMPLOYEE_DATE_PATTERN.match(record_lines[0])
            if not match:
                return None
            
            first_name = match.group(1).strip()
            last_name = match.group(2).strip()
            date_str = match.group(3).strip()
            business_date = datetime.strptime(date_str, '%m/%d/%Y').date()
            
            actual_working_hours = None
            scheduled_working_hours = None
            scheduled_break_hours = Decimal('0')
            break_hours = None
            punches = []
            scheduled_punches = []
            
            for line in record_lines:
                if 'Actual' in line and not line.startswith('Total'):
                    parts = line.split()
                    if len(parts) >= 3:
                        try:
                            decimals = [p for p in parts if '.' in p]
                            if len(decimals) >= 2:
                                b_h = Decimal(decimals[0])
                                a_h = Decimal(decimals[1])
                                if a_h < 100:
                                    break_hours = b_h
                                    actual_working_hours = a_h
                        except: pass
                    punches = self.parse_punch_times(line, business_date)
                
                elif 'Scheduled' in line and not line.startswith('Total'):
                    parts = line.split()
                    if len(parts) >= 3:
                        try:
                            decimals = [p for p in parts if '.' in p]
                            if len(decimals) >= 2:
                                sb_h = Decimal(decimals[0])
                                sw_h = Decimal(decimals[1])
                                if sw_h < 100:
                                    scheduled_break_hours = sb_h
                                    scheduled_working_hours = sw_h
                            elif len(decimals) == 1:
                                sw_h = Decimal(decimals[0])
                                if sw_h < 100:
                                    scheduled_working_hours = sw_h
                        except: pass
                    scheduled_punches = self.parse_punch_times(line, business_date)
            
            return ShiftRecord(
                employee_first_name=first_name,
                employee_last_name=last_name,
                business_date=business_date,
                actual_working_hours=actual_working_hours,
                scheduled_working_hours=scheduled_working_hours,
                scheduled_break_hours=scheduled_break_hours,
                break_hours=break_hours,
                punches=punches,
                scheduled_punches=scheduled_punches or [],
            )
        except Exception as e:
            print(f"⚠️  Error parsing record: {e}")
            return None

    def parse_punch_times(self, line: str, business_date: date) -> List[PunchTime]:
        """Extract all punch time ranges from a line."""
        punches = []
        matches = self.TIME_PATTERN.findall(line)
        for start_str, end_str in matches:
            try:
                punch = self.parse_single_punch(start_str, end_str, business_date)
                if punch: punches.append(punch)
            except Exception as e:
                print(f"⚠️  Error parsing punch time {start_str} - {end_str}: {e}")
        return punches

    def parse_single_punch(self, start_str: str, end_str: str, business_date: date) -> Optional[PunchTime]:
        """Parse a single punch range, handling cross-midnight shifts."""
        start_time = parse_time_12h(start_str)
        end_time = parse_time_12h(end_str)
        if not start_time or not end_time:
            return None
        
        start_dt = datetime.combine(business_date, start_time)
        end_dt = datetime.combine(business_date, end_time)
        
        if start_time.hour >= 12 and end_time.hour < 12:
            end_dt += timedelta(days=1)
        elif end_dt <= start_dt:
            end_dt += timedelta(days=1)
        
        duration = int((end_dt - start_dt).total_seconds() / 60)
        return PunchTime(start=start_dt, end=end_dt, duration_minutes=duration)

    # -------------------------------------------------------------------------
    # Pipeline Orchestration
    # -------------------------------------------------------------------------
    def parse(self) -> List[ShiftRecord]:
        """Main parsing execution pipeline."""
        print(f"\n{'='*60}\n🔍 Starting PDF parsing: {self.pdf_path}\n{'='*60}\n")
        
        # 1. Extraction
        try:
            lines = extract_text_with_pdfplumber(self.pdf_path)
        except Exception as e:
            print(f"⚠️  pdfplumber failed, falling back to PyMuPDF: {e}")
            lines = extract_text_with_pymupdf(self.pdf_path)
        
        save_pipeline_artifact(self.artifact_dir, self.pdf_path, "stage1_raw_text", lines)
        
        # 2. Cleaning
        cleaned_lines = self.clean_lines(lines)
        save_pipeline_artifact(self.artifact_dir, self.pdf_path, "stage2_cleaned_lines", cleaned_lines)
        
        # 3. Grouping
        record_groups = self.group_into_records(cleaned_lines)
        save_pipeline_artifact(self.artifact_dir, self.pdf_path, "stage3_grouped_records", record_groups)
        
        # 4. Parsing
        records = []
        for i, group in enumerate(record_groups, 1):
            record = self.parse_record(group)
            if record:
                records.append(record)
                print(f"   ✅ Record {i}: {record.employee_first_name} {record.employee_last_name} - {record.business_date}")
        
        save_pipeline_artifact(self.artifact_dir, self.pdf_path, "stage4_parsed_records", records)
        
        print(f"\n{'='*60}\n✅ Parsing complete: {len(records)} records successfully parsed\n{'='*60}\n")
        return records

class PyMuPDFParser(PDFParser):
    """Subclass that overrides text extraction to use PyMuPDF."""
    def parse(self) -> List[ShiftRecord]:
        # Implementation could be customized here if needed, 
        # but the base parse() already handles fallback.
        # Keeping it for backward compatibility if needed.
        return super().parse()
