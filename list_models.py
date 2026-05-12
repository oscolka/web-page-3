import vertexai
from vertexai.preview.generative_models import GenerativeModel
from google.cloud import aiplatform_v1

vertexai.init(project="project-571715f2-11b8-43f7-bf8", location="us-central1")

client = aiplatform_v1.ModelServiceClient(
    client_options={"api_endpoint": "us-central1-aiplatform.googleapis.com"}
)

request = aiplatform_v1.ListModelsRequest(
    parent="projects/project-571715f2-11b8-43f7-bf8/locations/us-central1"
)

try:
    page_result = client.list_models(request=request)
    print("Available models:")
    for model in page_result:
        print(f"  - {model.name}")
except Exception as e:
    print(f"Error listing models: {e}")
