import vertexai
from vertexai.generative_models import GenerativeModel

# Try multiple regions and models
regions = ["us-central1", "us-east1", "europe-west1"]
models = ["gemini-1.0-pro", "gemini-1.5-flash", "gemini-1.5-pro"]

for region in regions:
    for model_name in models:
        try:
            vertexai.init(project="project-571715f2-11b8-43f7-bf8", location=region)
            model = GenerativeModel(model_name)
            response = model.generate_content("Say hello in Slovak.")
            print(f"SUCCESS: {region}/{model_name}")
            print(f"Response: {response.text}")
            exit(0)
        except Exception as e:
            print(f"FAILED: {region}/{model_name} - {str(e)[:100]}")
