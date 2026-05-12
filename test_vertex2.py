import vertexai
from vertexai.generative_models import GenerativeModel

# Try with original gemini-pro model
vertexai.init(project="project-571715f2-11b8-43f7-bf8", location="europe-west1")

try:
    model = GenerativeModel("gemini-pro")
    response = model.generate_content("Say 'Vertex AI is working' in Slovak.")
    print("europe-west1/gemini-pro: SUCCESS")
    print("Response:", response.text)
except Exception as e:
    print(f"europe-west1/gemini-pro: FAILED - {e}")

# Try with gemini-1.5-flash
try:
    model = GenerativeModel("gemini-1.5-flash")
    response = model.generate_content("Say 'Vertex AI is working' in Slovak.")
    print("europe-west1/gemini-1.5-flash: SUCCESS")
    print("Response:", response.text)
except Exception as e:
    print(f"europe-west1/gemini-1.5-flash: FAILED - {e}")
