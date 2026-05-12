import requests
import subprocess
import json

# Get access token
result = subprocess.run(
    ["gcloud", "auth", "application-default", "print-access-token"],
    capture_output=True, text=True
)
token = result.stdout.strip()

# Check Vertex AI API status
headers = {"Authorization": f"Bearer {token}"}
url = "https://serviceusage.googleapis.com/v1/projects/project-571715f2-11b8-43f7-bf8/services/aiplatform.googleapis.com"

response = requests.get(url, headers=headers)
print("Status:", response.status_code)
print("Response:", json.dumps(response.json(), indent=2))
