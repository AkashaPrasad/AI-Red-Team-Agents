"""Cancel the running experiment via Redis flag."""
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
exp_id = 'd8919238-b95f-41e7-b3db-a28d54d83dea'
r.set(f'experiment:{exp_id}:cancel', '1', ex=3600)
print(f"Cancel flag set for {exp_id}")
print(f"Verify: {r.get(f'experiment:{exp_id}:cancel')}")
