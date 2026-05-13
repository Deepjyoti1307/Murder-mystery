from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import motor.motor_asyncio
from beanie import Document, init_beanie
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import certifi

load_dotenv()

# --- DATABASE MODELS ---

class User(Document):
    clerk_id: str
    email: str
    name: str
    is_admin: bool = False
    assigned_batch: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

class Team(Document):
    clerk_id: str
    team_name: str
    leader_name: str
    phone_number: str
    college_name: str
    batch_id: int
    entry_timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "teams"

class Batch(Document):
    batch_id: int
    is_locked: bool = True
    codeword: str
    story_content: str
    
    class Settings:
        name = "batches"

# --- API SCHEMAS ---

class AccessRequest(BaseModel):
    team_name: str
    leader_name: str
    phone_number: str
    college_name: str
    access_code: str
    clerk_id: str

# --- LIFESPAN (NEW STARTUP PATTERN) ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Beanie
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("CRITICAL: MONGODB_URI NOT FOUND IN .ENV")
        yield
        return

    try:
        # Use certifi for SSL certificates (crucial for some Windows/Miniconda setups)
        client = motor.motor_asyncio.AsyncIOMotorClient(
            mongo_uri,
            tlsCAFile=certifi.where()
        )
        # Initialize Beanie with the specific database name
        # If DB_NAME is in .env use it, else default to 'murder_mystery'
        db_name = os.getenv("DB_NAME", "murder_mystery")
        await init_beanie(database=client[db_name], document_models=[User, Team, Batch])
        print(f"DATABASE CONNECTED: {db_name}")
    except Exception as e:
        print(f"DATABASE CONNECTION ERROR: {e}")
        
    yield
    # Shutdown
    if 'client' in locals():
        client.close()

app = FastAPI(title="Murder Mystery Backend", lifespan=lifespan)

# Add CORS middleware to allow the frontend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINTS ---

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

@app.post("/api/batch/{batch_id}/enter")
async def enter_batch(batch_id: int, request: AccessRequest):
    # 1. Verify Codeword
    expected_code = "CRIMSON2026"
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if batch:
        expected_code = batch.codeword

    if request.access_code != expected_code:
        raise HTTPException(status_code=401, detail="INVALID ACCESS CODE. AUTHORIZATION DENIED.")

    # 2. Save/Update Team Data
    team = await Team.find_one(Team.clerk_id == request.clerk_id, Team.batch_id == batch_id)
    if team:
        team.team_name = request.team_name
        team.leader_name = request.leader_name
        team.phone_number = request.phone_number
        team.college_name = request.college_name
        await team.save()
    else:
        team = Team(
            clerk_id=request.clerk_id,
            team_name=request.team_name,
            leader_name=request.leader_name,
            phone_number=request.phone_number,
            college_name=request.college_name,
            batch_id=batch_id
        )
        await team.insert()

    return {"status": "success", "message": "AUTHORIZATION GRANTED"}

# --- ADMIN ENDPOINTS ---

@app.get("/api/admin/teams")
async def get_all_teams():
    # In a real app, we'd check if the requesting user is an admin via Clerk JWT
    teams = await Team.find_all().to_list()
    return teams

@app.get("/api/admin/stats")
async def get_stats():
    team_count = await Team.count()
    user_count = await User.count()
    return {
        "total_teams": team_count,
        "total_users": user_count,
        "timestamp": datetime.utcnow()
    }

@app.post("/api/admin/batch/init")
async def init_batches():
    # Helper to create initial batches with unique codes
    batches_to_create = [
        {"id": 1, "code": "CRIMSON2026", "story": "THE INVESTIGATION BEGINS AT THE CRIMSON ARCHIVE..."},
        {"id": 2, "code": "VOIDSHADOW2026", "story": "THE SHADOWS HIDE THE DEEPEST SECRETS..."},
        {"id": 3, "code": "DEATHLYSILENCE2026", "story": "ONLY SILENCE REMAINS IN THE FINAL CHAMBER..."}
    ]
    
    for b_data in batches_to_create:
        exists = await Batch.find_one(Batch.batch_id == b_data["id"])
        if not exists:
            new_batch = Batch(
                batch_id=b_data["id"],
                is_locked=True,
                codeword=b_data["code"],
                story_content=b_data["story"]
            )
            await new_batch.insert()
    return {"status": "initialized", "codes_configured": True}
