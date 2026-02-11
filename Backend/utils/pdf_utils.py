from typing import List

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

def extract_text_with_pdfplumber(pdf_path: str) -> List[str]:
    """Extract text lines using pdfplumber."""
    if not PDFPLUMBER_AVAILABLE:
        raise ImportError("pdfplumber is not installed.")
    
    all_lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if text:
                lines = text.split('\n')
                all_lines.extend(lines)
                print(f"Extracted {len(lines)} lines from page {page_num}")
    return all_lines

def extract_text_with_pymupdf(pdf_path: str) -> List[str]:
    """Extract text lines using PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF not installed. Run: pip install pymupdf")
    
    all_lines = []
    doc = fitz.open(pdf_path)
    for page_num, page in enumerate(doc, 1):
        text = page.get_text()
        if text:
            lines = text.split('\n')
            all_lines.extend(lines)
            print(f"Extracted {len(lines)} lines from page {page_num}")
    doc.close()
    return all_lines
