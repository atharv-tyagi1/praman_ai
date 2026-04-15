import os
import app.config as config
print("__file__ of config:", config.__file__)
expected_path = os.path.join(os.path.dirname(os.path.dirname(config.__file__)), ".env")
print("Expected path for .env:", os.path.abspath(expected_path))
print("Does it exist?", os.path.exists(expected_path))
