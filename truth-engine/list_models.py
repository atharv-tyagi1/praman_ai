from app.config import groq_client
try:
    models = groq_client.models.list()
    for model in models.data:
        print(model.id)
except Exception as e:
    print(f"Error: {e}")
