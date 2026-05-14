import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

async def update_batch_keys():
    client = motor.motor_asyncio.AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client.get_database()
    
    batch = await db.batches.find_one({"batch_id": 2})
    if not batch:
        print("BATCH 2 NOT FOUND.")
        return

    questions = batch.get("questions", [])
    
    # Update Q6, Q7, Q8
    updates = {
        6: "The names include someone you fear",
        7: "Evidence is in the safe behind the manuscript",
        8: "Meet me Friday garden at midnight"
    }
    
    for q in questions:
        if q["id"] in updates:
            q["correct"] = updates[q["id"]]
            print(f"Updated Q{q['id']} key.")

    await db.batches.update_one({"batch_id": 2}, {"$set": {"questions": questions}})
    print("BATCH 2 UPDATED SUCCESSFULLY.")
    client.close()

if __name__ == '__main__':
    asyncio.run(update_batch_keys())
