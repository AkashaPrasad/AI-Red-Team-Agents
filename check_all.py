import requests, json

r = requests.post('http://localhost:8000/api/v1/auth/login', json={'email': 'john@gmail.com', 'password': 'John@1103'})
TOKEN = r.json()['access_token']
headers = {'Authorization': f'Bearer {TOKEN}'}
project_id = '20c21d03-b17a-4fc9-b699-d0b46d428961'
r2 = requests.get(f'http://localhost:8000/api/v1/projects/{project_id}/experiments?page_size=10', headers=headers)
items = r2.json().get('items', [])
print(f"Total experiments: {len(items)}")
for exp in items:
    eid = exp.get('id','?')
    name = exp.get('name','?')
    st = exp.get('status','?')
    prog = exp.get('progress',{})
    err = None
    # fetch detail
    rd = requests.get(f'http://localhost:8000/api/v1/projects/{project_id}/experiments/{eid}', headers=headers)
    dd = rd.json()
    err = dd.get('error_message')
    print(f"  {eid} | {name} | status={st} | progress={prog} | error={err}")
