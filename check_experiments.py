import requests, json

r = requests.post('http://localhost:8000/api/v1/auth/login', json={'email': 'john@gmail.com', 'password': 'John@1103'})
print('Login:', r.status_code)
data = r.json()
TOKEN = data['access_token']
headers = {'Authorization': f'Bearer {TOKEN}'}
project_id = '20c21d03-b17a-4fc9-b699-d0b46d428961'

r2 = requests.get(f'http://localhost:8000/api/v1/projects/{project_id}/experiments?page_size=10', headers=headers)
print('Experiments:', r2.status_code)
for exp in r2.json().get('items', []):
    print(f"  {exp['id']} | {exp['name']} | status={exp['status']} | created={exp['created_at']} | completed={exp.get('completed_at')}")
    # Get detail for failed ones
    r3 = requests.get(f"http://localhost:8000/api/v1/projects/{project_id}/experiments/{exp['id']}", headers=headers)
    detail = r3.json()
    print(f"    error_message: {detail.get('error_message')}")
    print(f"    progress: {detail.get('progress')}")
    print(f"    target_config system_prompt present: {'system_prompt' in str(detail.get('target_config', {}))}")
    print(f"    provider: {detail.get('provider')}")
