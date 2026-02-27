import asyncio
import sys
sys.path.insert(0, ".")

async def main():
    from app.storage.database import AsyncSessionLocal
    from sqlalchemy import select
    from app.storage.models.experiment import Experiment
    from app.storage.models.provider import ModelProvider

    async with AsyncSessionLocal() as session:
        prov = (await session.execute(select(ModelProvider).limit(1))).scalar_one_or_none()
        if prov:
            print("Provider:", prov.id, "type=", prov.provider_type)

        exp = (await session.execute(
            select(Experiment).order_by(Experiment.created_at.desc()).limit(1)
        )).scalar_one_or_none()
        if exp:
            tc = exp.target_config or {}
            print("endpoint_url:", tc.get("endpoint_url", "MISSING"))
            print("provider_id:", exp.provider_id)
            print("project_id:", exp.project_id)
            print("status:", exp.status)
            print("error:", exp.error_message)

asyncio.run(main())
