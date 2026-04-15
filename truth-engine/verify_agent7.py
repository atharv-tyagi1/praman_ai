import requests
import json
import time
import os

API_URL = "http://localhost:8000"
IMAGE_PATH = r"C:\Users\athar\.gemini\antigravity\brain\0ae8c6a2-9bc5-4a0e-98cb-915bb556d3f8\test_claim_image_1776229625533.png"

def test_upload_and_verify():
    print(f"--- Testing Image Upload: {IMAGE_PATH} ---")
    
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Error: Image not found at {IMAGE_PATH}")
        return

    with open(IMAGE_PATH, 'rb') as f:
        files = {'file': f}
        data = {'source_type': 'image'}
        
        response = requests.post(f"{API_URL}/verify-upload", files=files, data=data, stream=True)
        
        print(f"📡 Response Status: {response.status_code}")
        
        last_complete_event = None
        extracted_claims = []
        
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    data_str = decoded_line[6:].strip()
                    try:
                        event_data = json.loads(data_str)
                        
                        # Print step updates
                        if "step" in event_data:
                            print(f"➡️ Step: {event_data['step']} - {event_data['status']}")
                            if event_data['step'] == 'extract' and 'claims' in event_data.get('detail', {}):
                                extracted_claims = event_data['detail']['claims']
                        
                        # Capture final event
                        if "overall_assessment" in event_data:
                            last_complete_event = event_data
                    except:
                        pass

    print("\n✅ Verification Results:")
    
    # 1. Check Source Tagging
    if extracted_claims:
        print(f"🔬 Check Source Tagging: Found {len(extracted_claims)} claims")
        for i, c in enumerate(extracted_claims):
            source = c.get('source', 'unknown')
            print(f"   [{i+1}] Claim: \"{c['claim_text'][:50]}...\" | Source: {source}")
            if source != 'ocr_vision':
                print(f"   ⚠️ Warning: Expected 'ocr_vision', got '{source}'")
    else:
        print("❌ Error: No claims extracted from image.")

    # 2. Check Agent 7 Reports
    if last_complete_event:
        report_files = last_complete_event.get("report_files", {})
        print(f"📄 Check Agent 7 Reports: {report_files}")
        if report_files.get("pdf_url") and report_files.get("ppt_url"):
            print("   ✅ PDF and PPT links generated successfully!")
        else:
            print("   ❌ Error: Report links missing in final event.")
    else:
        print("❌ Error: Pipeline never completed or final event missing.")

if __name__ == "__main__":
    test_upload_and_verify()
