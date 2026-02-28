"""Mark stuck 'running' experiments as failed and create a fresh one."""
import requests, json

BASE = 'http://localhost:8000/api/v1'

# Login
r = requests.post(f'{BASE}/auth/login', json={'email': 'john@gmail.com', 'password': 'John@1103'})
TOKEN = r.json()['access_token']
headers = {'Authorization': f'Bearer {TOKEN}'}
project_id = '20c21d03-b17a-4fc9-b699-d0b46d428961'
provider_id = '1957c988-a7fa-47cc-9555-0897aea8149b'

# Check if there's a cancel endpoint
zombie_id = '2c50b5f2-d575-4be1-b9a2-ec72b86c09a3'
r2 = requests.post(f'{BASE}/projects/{project_id}/experiments/{zombie_id}/cancel', headers=headers)
print(f"Cancel zombie: {r2.status_code} - {r2.text}")
