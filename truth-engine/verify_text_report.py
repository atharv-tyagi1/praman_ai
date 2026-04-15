import requests
import json
import os

API_URL = "http://localhost:8000"

def test_text_verify_and_report():
    print("--- Testing Text Verification & Report Generation ---")
    
    payload = {
        "text": "The Moon's surface is covered with a layer of volcanic ash."
    }
    
    response = requests.post(f"{API_URL}/verify", json=payload, stream=True)
    
    print(f"📡 Response Status: {response.status_code}")
    
    last_complete_event = None
    
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            if decoded_line.startswith("data: "):
                data_str = decoded_line[6:].strip()
                try:
                    event_data = json.loads(data_str)
                    if "step" in event_data:
                        print(f"➡️ Step: {event_data['step']} - {event_data['status']}")
                    if "overall_assessment" in event_data:
                        last_complete_event = event_data
                except:
                    pass

    print("\n✅ Verification Results:")
    if last_complete_event:
        report_files = last_complete_event.get("report_files", {})
        print(f"📄 Agent 7 Reports: {report_files}")
        if report_files.get("pdf_url") and report_files.get("ppt_url"):
            print("   ✅ PDF and PPT links generated successfully!")
            
            # Verify files exist on disk
            pdf_path = os.path.join("reports", f"report_{report_files['session_id']}.pdf")
            ppt_path = os.path.join("reports", f"report_{report_files['session_id']}.pptx")
            
            if os.path.exists(pdf_path) and os.path.exists(ppt_path):
                print(f"   📁 Files verified in 'reports/' directory.")
            else:
                print(f"   ❌ Error: Files not found on disk at {pdf_path} or {ppt_path}")
        else:
            print("   ❌ Error: Report links missing in final event.")
    else:
        print("❌ Error: Pipeline never completed.")

if __name__ == "__main__":
    test_text_verify_and_report()
