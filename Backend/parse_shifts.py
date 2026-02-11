"""
PDF Shift Parser - Main Script

Usage:
    python parse_shifts.py <pdf_file_path>

Example:
    python parse_shifts.py ./shift_report.pdf
"""

import sys
import os
from pathlib import Path

from parsers.shift_parser import PDFParser, PyMuPDFParser
from services.shift_service import ShiftDataService
from db import init_db


def parse_and_store_shifts(pdf_path: str, use_fallback: bool = False):
    """
    Main function to parse PDF and store data in database.
    
    Args:
        pdf_path: Path to the PDF file
        use_fallback: If True, use PyMuPDF instead of pdfplumber
    """
    # Validate file exists
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}")
        return
    
    # Initialize database
    print("🗄️  Initializing database...")
    init_db()
    print()
    
    # Choose parser
    parser_class = PyMuPDFParser if use_fallback else PDFParser
    parser_name = "PyMuPDF" if use_fallback else "pdfplumber"
    
    try:
        # Parse PDF
        print(f"📊 Using {parser_name} parser...")
        parser = parser_class(pdf_path)
        records = parser.parse()
        
        if not records:
            print("⚠️  No records found in PDF")
            return
        
        # Store in database
        print("\n💾 Storing records in database...")
        with ShiftDataService() as service:
            stats = service.insert_shift_records(records)
        
        # Print summary
        print(f"\n{'='*60}")
        print("IMPORT SUMMARY")
        print(f"{'='*60}")
        print(f"Total records parsed:     {stats['total_records']}")
        print(f"Shift summaries inserted: {stats['summaries_inserted']}")
        print(f"Punch records inserted:   {stats['punches_inserted']}")
        print(f"Errors:                   {stats['errors']}")
        print(f"{'='*60}\n")
        
        if stats['summaries_inserted'] > 0:
            print("Import completed successfully!")
        else:
            print("No new records were inserted (possible duplicates)")
    
    except ImportError as e:
        if "pdfplumber" in str(e) and not use_fallback:
            print(f"pdfplumber not available: {e}")
            print("Retrying with PyMuPDF fallback...")
            parse_and_store_shifts(pdf_path, use_fallback=True)
        else:
            print(f"Import error: {e}")
            print("\nMake sure you have installed the required packages:")
            print("   pip install pdfplumber pymupdf")
    
    except Exception as e:
        print(f"Error during parsing: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python parse_shifts.py <pdf_file_path>")
        print("\nExample:")
        print("  python parse_shifts.py ./shift_report.pdf")
        print("  python parse_shifts.py /path/to/scheduled_vs_actual.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    parse_and_store_shifts(pdf_path)


if __name__ == "__main__":
    main()
