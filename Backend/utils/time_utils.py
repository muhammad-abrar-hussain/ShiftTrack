from datetime import datetime, time
from typing import Optional

def parse_time_12h(time_str: str) -> Optional[time]:
    """
    Parse 12-hour time format to time object.
    Examples: "11:08a", "1:02p", "10:58p"
    """
    try:
        # Normalize format
        time_str = time_str.lower().strip()
        
        # Convert 'a' to 'am' and 'p' to 'pm'
        if time_str.endswith('a'):
            time_str = time_str[:-1] + 'am'
        elif time_str.endswith('p'):
            time_str = time_str[:-1] + 'pm'
        
        # Parse using strptime
        dt = datetime.strptime(time_str, '%I:%M%p')
        return dt.time()
    except Exception as e:
        print(f"⚠️  Error parsing time '{time_str}': {e}")
        return None
