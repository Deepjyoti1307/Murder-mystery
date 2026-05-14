import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def list_users():
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client.get_database()
    # Check collections
    cols = await db.list_collection_names()
    print(f"Collections: {cols}")
    
    team = await db.teams.find_one({'clerk_id': 'user_3DdSXCNTUiYvWYUPJreS8uDCRi8', 'batch_id': 2})
    if team:
        print(f"TEAM: {team.get('team_name')} | COMPLETED: {team.get('is_completed')} | SCORE: {team.get('total_score')}")
    else:
        print("TEAM NOT FOUND.")
    client.close()

if __name__ == '__main__':
    asyncio.run(list_users())
