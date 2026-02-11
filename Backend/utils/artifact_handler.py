import os
import json
from datetime import datetime, date
from decimal import Decimal
from dataclasses import asdict
from pathlib import Path

def save_pipeline_artifact(artifact_dir: str, pdf_path: str, stage_name: str, data: any):
    """
    Save pipeline data to a file.
    Format: stage_name_pdf_name[_count].jsonl/txt
    """
    os.makedirs(artifact_dir, exist_ok=True)
    pdf_name = Path(pdf_path).stem.lower().replace(" ", "_")
    base_filename = f"{stage_name}_{pdf_name}"
    
    # Determine extension
    is_json = isinstance(data, (dict, list))
    extension = ".jsonl" if is_json else ".txt"
    
    # Find unique filename
    filename = f"{base_filename}{extension}"
    filepath = os.path.join(artifact_dir, filename)
    
    counter = 1
    while os.path.exists(filepath):
        filename = f"{base_filename}_{counter}{extension}"
        filepath = os.path.join(artifact_dir, filename)
        counter += 1
        
    print(f"📂 Saving stage '{stage_name}' to: {filepath}")
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            if is_json:
                # Custom encoder for Decimals, Datetime, etc.
                def default_encoder(obj):
                    if isinstance(obj, (datetime, date)):
                        return obj.isoformat()
                    if isinstance(obj, Decimal):
                        return float(obj)
                    if hasattr(obj, '__dict__'):
                        return asdict(obj)
                    return str(obj)
                
                if isinstance(data, list):
                    for item in data:
                        line = json.dumps(item, default=default_encoder)
                        f.write(line + '\n')
                else:
                    line = json.dumps(data, default=default_encoder)
                    f.write(line + '\n')
            else:
                f.write(str(data))
    except Exception as e:
        print(f"Failed to save artifact {stage_name}: {e}")
