"""Cancel running experiment via API."""
import requests

BASE = 'http://localhost:8000/api/v1'
r = requests.post(f'{BASE}/auth/login', json={'email': 'john@gmail.com', 'password': 'John@1103'}, timeout=5)
TOKEN = r.json()['access_token']
headers = {'Authorization': f'Bearer {TOKEN}'}
project_id = '20c21d03-b17a-4fc9-b699-d0b46d428961'
exp_id = 'd8919238-b95f-41e7-b3db-a28d54d83dea'

r2 = requests.post(f'{BASE}/projects/{project_id}/experiments/{exp_id}/cancel', headers=headers, timeout=10)
print(f"Cancel: {r2.status_code} {r2.text}")
