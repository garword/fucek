
import requests

endpoints = [
    "https://api.medanpedia.co.id/refill",
    "https://api.medanpedia.co.id/refill_status"
]

for url in endpoints:
    try:
        print(f"Checking {url}...")
        response = requests.post(url, data={})
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}") # Print first 200 chars
    except Exception as e:
        print(f"Error checking {url}: {e}")
    print("-" * 20)
