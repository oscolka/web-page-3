from google.cloud import aiplatform_v1

client = aiplatform_v1.EndpointServiceClient(
    client_options={"api_endpoint": "us-central1-aiplatform.googleapis.com"}
)

# Try listing publisher models
publisher_client = aiplatform_v1.ModelServiceClient(
    client_options={"api_endpoint": "us-central1-aiplatform.googleapis.com"}
)

request = aiplatform_v1.ListPublisherModelsRequest(
    parent="projects/project-571715f2-11b8-43f7-bf8/locations/us-central1/publishers/google"
)

try:
    page_result = publisher_client.list_publisher_models(request=request)
    print("Available publisher models:")
    for model in page_result:
        print(f"  - {model.name}")
except Exception as e:
    print(f"Error: {e}")
