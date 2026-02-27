import asyncio
import sys
import logging
sys.path.insert(0, ".")

logging.basicConfig(level=logging.INFO)

async def main():
    # Test 1: Can Celery tasks be imported?
    try:
        from app.worker.tasks import run_experiment_task
        print("Celery import: OK")
    except Exception as e:
        print(f"Celery import FAILED: {e}")
        return

    # Test 2: Can .delay() be called?
    try:
        task = run_experiment_task.delay("test-id")
        print(f"Celery delay: OK, task_id={task.id}")
    except Exception as e:
        print(f"Celery delay FAILED: {type(e).__name__}: {e}")

    # Test 3: Can run_experiment_async be imported?
    try:
        from app.engine.runner import run_experiment_async
        print("Runner import: OK")
    except Exception as e:
        print(f"Runner import FAILED: {e}")

asyncio.run(main())
