import requests
import json

API_KEY = "AIzaSyB5kpFxVxux86HTCBta8jI4OAIitlABKo4"
PROJECT_ID = "project-571715f2-11b8-43f7-bf8"
LOCATION = "us-central1"
MODEL = "gemini-1.5-flash"

url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL}:generateContent?key={API_KEY}"

headers = {"Content-Type": "application/json"}
data = {
    "contents": [{
        "parts": [{"text": "Say 'Vertex AI is working' in Slovak."}]
    }]
}

response = requests.post(url, headers=headers, json=data)
print("Status:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2))
