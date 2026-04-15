from app.config import groq_client
try:
    models = groq_client.models.list()
    vision_models = [m.id for m in models.data if "vision" in m.id.lower()]
    print("Available Vision Models:")
    for model in vision_models:
        print(f"- {model}")
    if not vision_models:
        print("No vision models found in the list.")
except Exception as e:
    print(f"Error: {e}")
