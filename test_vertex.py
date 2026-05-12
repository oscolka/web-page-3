import vertexai
from vertexai.generative_models import GenerativeModel

vertexai.init(project="project-571715f2-11b8-43f7-bf8", location="us-central1")

model = GenerativeModel("gemini-3.1-pro-preview")
response = model.generate_content("Say 'Vertex AI is working' in Slovak.")

print("Response:", response.text)
print("Credits used successfully.")
