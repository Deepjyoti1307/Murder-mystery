from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import motor.motor_asyncio
from beanie import Document, init_beanie
import os
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import certifi
import asyncio
import httpx
from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext
import json

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

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
    entry_timestamp: Optional[datetime] = None
    start_time: Optional[datetime] = None # When they actually open the story
    end_time: Optional[datetime] = None # When they finish the quiz
    is_completed: bool = False
    answers: List[dict] = [] # List of {q_id: int, answer: str, is_correct: bool, hints_used: int}
    current_question: int = 1
    total_score: int = 0
    
    class Settings:
        name = "teams"

class Batch(Document):
    batch_id: int
    is_locked: bool = True
    codeword: str
    story_content: str
    questions: List[dict] = [] # List of {id: int, text: str, options: [str], correct: str, hints: [str]}
    
    class Settings:
        name = "batches"

class AdminLog(Document):
    admin_id: str
    action: str
    target_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "admin_logs"

# --- API SCHEMAS ---

class AccessRequest(BaseModel):
    team_name: str
    leader_name: str
    phone_number: str
    college_name: str
    access_code: str
    clerk_id: str

class StartRequest(BaseModel):
    clerk_id: str

class RegisterRequest(BaseModel):
    clerk_id: str
    email: str
    name: str

class AssignBatchRequest(BaseModel):
    clerk_id: str
    batch_id: int

class CodewordRequest(BaseModel):
    clerk_id: str
    access_code: str
    team_name: Optional[str] = None
    leader_name: Optional[str] = None
    phone_number: Optional[str] = None
    college_name: Optional[str] = None

class AnswerItem(BaseModel):
    question_id: int
    answer: str

class SubmitQuizRequest(BaseModel):
    clerk_id: str
    answers: List[AnswerItem]

class LockBatchRequest(BaseModel):
    is_locked: bool

class CodewordUpdateRequest(BaseModel):
    codeword: str

class StoryUpdateRequest(BaseModel):
    story_content: str

class QuestionCreateRequest(BaseModel):
    batch_id: int
    question_id: int
    text: str
    options: List[str] = []
    correct: str
    question_type: str = "mcq"
    hints: List[str] = []

class QuestionUpdateRequest(BaseModel):
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct: Optional[str] = None
    question_type: Optional[str] = None
    hints: Optional[List[str]] = None

class AssignUserBatchRequest(BaseModel):
    batch_id: int

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
        await init_beanie(database=client[db_name], document_models=[User, Team, Batch, AdminLog])
        print(f"DATABASE CONNECTED: {db_name}")
    except Exception as e:
        print(f"DATABASE CONNECTION ERROR: {e}")
        
    yield
    # Shutdown
    if 'client' in locals():
        client.close()

app = FastAPI(title="Murder Mystery Backend", lifespan=lifespan)

# Add CORS middleware to allow the frontend to communicate
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH + SECURITY HELPERS ---

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_JWT_ISSUER = os.getenv("CLERK_JWT_ISSUER")
ALLOW_DEV_AUTH = os.getenv("ALLOW_DEV_AUTH", "true").lower() == "true"
QUIZ_TIME_LIMIT_SECONDS = int(os.getenv("QUIZ_TIME_LIMIT_SECONDS", str(90 * 60)))
SUBMIT_RATE_LIMIT = int(os.getenv("SUBMIT_RATE_LIMIT", "10"))
ADMIN_EMAILS = {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_jwks_cache: Dict[str, Any] = {"keys": None, "fetched_at": None}
_submit_rate: Dict[str, List[datetime]] = {}

async def _get_jwks() -> Dict[str, Any]:
    if not CLERK_JWKS_URL:
        raise HTTPException(status_code=500, detail="CLERK_JWKS_URL NOT CONFIGURED.")
    now = datetime.utcnow()
    if _jwks_cache["keys"] and _jwks_cache["fetched_at"] and now - _jwks_cache["fetched_at"] < timedelta(minutes=30):
        return _jwks_cache["keys"]
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(CLERK_JWKS_URL)
        resp.raise_for_status()
        data = resp.json()
        _jwks_cache["keys"] = data
        _jwks_cache["fetched_at"] = now
        return data

async def verify_clerk_jwt(token: str) -> Dict[str, Any]:
    try:
        jwks = await _get_jwks()
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="INVALID TOKEN KEY.")
        options = {"verify_aud": False}
        if CLERK_JWT_ISSUER:
            return jwt.decode(token, key, algorithms=["RS256"], issuer=CLERK_JWT_ISSUER, options=options)
        return jwt.decode(token, key, algorithms=["RS256"], options=options)
    except JWTError:
        raise HTTPException(status_code=401, detail="INVALID AUTH TOKEN.")

async def require_auth(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ", 1)[1].strip()
        return await verify_clerk_jwt(token)
    if ALLOW_DEV_AUTH:
        dev_id = request.headers.get("X-Dev-Clerk-Id")
        if dev_id:
            return {"sub": dev_id}
    raise HTTPException(status_code=401, detail="AUTH REQUIRED.")

def normalize_codeword(value: str) -> str:
    return str(value or "").strip().lower()

def hash_codeword(value: str) -> str:
    return pwd_context.hash(normalize_codeword(value))

def verify_codeword(plain: str, stored: str) -> bool:
    if stored.startswith("$2"):
        return pwd_context.verify(normalize_codeword(plain), stored)
    return normalize_codeword(plain) == normalize_codeword(stored)

def rate_limit_submit(clerk_id: str) -> None:
    now = datetime.utcnow()
    window_start = now - timedelta(hours=1)
    attempts = [t for t in _submit_rate.get(clerk_id, []) if t > window_start]
    if len(attempts) >= SUBMIT_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="RATE LIMIT EXCEEDED.")
    attempts.append(now)
    _submit_rate[clerk_id] = attempts

async def require_admin(request: Request) -> User:
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    user = await User.find_one(User.clerk_id == clerk_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="ADMIN ACCESS REQUIRED.")
    return user

async def build_leaderboard(batch_id: int) -> List[Dict[str, Any]]:
    teams = await Team.find(Team.batch_id == batch_id, Team.is_completed == True).to_list()
    leaderboard: List[Dict[str, Any]] = []
    for t in teams:
        duration = 0
        if t.entry_timestamp and t.end_time:
            duration = (t.end_time - t.entry_timestamp).total_seconds()
        leaderboard.append({
            "team_name": t.team_name,
            "college": t.college_name,
            "score": t.total_score,
            "duration": duration,
            "duration_str": f"{int(duration//3600):02}:{int((duration%3600)//60):02}:{int(duration%60):02}"
        })
    leaderboard.sort(key=lambda x: (-x["score"], x["duration"]))
    return leaderboard

# --- ENDPOINTS ---

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}

@app.post("/api/user/register")
async def register_user(request: Request, payload: RegisterRequest):
    claims = await require_auth(request)
    if claims.get("sub") != payload.clerk_id:
        raise HTTPException(status_code=403, detail="AUTH MISMATCH.")

    user = await User.find_one(User.clerk_id == payload.clerk_id)
    is_admin = payload.email.lower() in ADMIN_EMAILS if payload.email else False
    if user:
        user.email = payload.email
        user.name = payload.name
        user.is_admin = user.is_admin or is_admin
        await user.save()
    else:
        user = User(
            clerk_id=payload.clerk_id,
            email=payload.email,
            name=payload.name,
            is_admin=is_admin,
            assigned_batch=None
        )
        await user.insert()

    return {"status": "registered", "assigned_batch": user.assigned_batch}

@app.get("/api/user/me")
async def get_me(request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    user = await User.find_one(User.clerk_id == clerk_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER NOT FOUND.")
    return {
        "clerk_id": user.clerk_id,
        "email": user.email,
        "name": user.name,
        "assigned_batch": user.assigned_batch,
        "is_admin": user.is_admin
    }

@app.get("/api/batch/{batch_id}/status")
async def get_batch_status(batch_id: int, request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")

    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    status = "not_started"
    entry_ts = team.entry_timestamp if team else None
    if team and team.is_completed:
        status = "completed"
    elif team and team.entry_timestamp:
        status = "in_progress"

    return {
        "batch_id": batch.batch_id,
        "is_locked": batch.is_locked,
        "status": status,
        "entry_timestamp": entry_ts,
        "server_time": datetime.utcnow(),
    }

@app.post("/api/batch/{batch_id}/enter")
async def enter_batch(batch_id: int, request: Request, payload: CodewordRequest):
    claims = await require_auth(request)
    if claims.get("sub") != payload.clerk_id:
        raise HTTPException(status_code=403, detail="AUTH MISMATCH.")

    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    if batch.is_locked:
        raise HTTPException(status_code=403, detail="BATCH LOCKED.")

    user = await User.find_one(User.clerk_id == payload.clerk_id)
    if user and user.assigned_batch and user.assigned_batch != str(batch_id):
        raise HTTPException(status_code=403, detail="UNAUTHORIZED BATCH.")

    if not verify_codeword(payload.access_code, batch.codeword):
        raise HTTPException(status_code=401, detail="Incorrect codeword. Try again.")

    team = await Team.find_one(Team.clerk_id == payload.clerk_id, Team.batch_id == batch_id)
    if team:
        if team.is_completed:
            raise HTTPException(status_code=409, detail="QUIZ ALREADY SUBMITTED.")
        if payload.team_name:
            team.team_name = payload.team_name
        if payload.leader_name:
            team.leader_name = payload.leader_name
        if payload.phone_number:
            team.phone_number = payload.phone_number
        if payload.college_name:
            team.college_name = payload.college_name
    else:
        team = Team(
            clerk_id=payload.clerk_id,
            team_name=payload.team_name or "UNKNOWN",
            leader_name=payload.leader_name or "UNKNOWN",
            phone_number=payload.phone_number or "",
            college_name=payload.college_name or "",
            batch_id=batch_id
        )
        await team.insert()

    if not team.entry_timestamp:
        team.entry_timestamp = datetime.utcnow()
    await team.save()

    return {
        "status": "entered",
        "entry_timestamp": team.entry_timestamp,
        "server_time": datetime.utcnow()
    }

@app.get("/api/story/{batch_id}")
async def get_story(batch_id: int, request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="DOSSIER NOT FOUND.")

    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team or not team.entry_timestamp:
        raise HTTPException(status_code=403, detail="ACCESS NOT GRANTED.")
    return {
        "content": batch.story_content,
        "entry_timestamp": team.entry_timestamp,
        "server_time": datetime.utcnow()
    }

@app.post("/api/batch/{batch_id}/start")
async def start_batch(batch_id: int, request: StartRequest):
    team = await Team.find_one(Team.clerk_id == request.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT REGISTERED.")

    if not team.entry_timestamp:
        team.entry_timestamp = datetime.utcnow()
        await team.save()

    return {"status": "timer_started", "entry_timestamp": team.entry_timestamp}

@app.get("/api/quiz/{batch_id}/questions")
async def get_questions(batch_id: int, request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")

    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")

    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team or not team.entry_timestamp:
        raise HTTPException(status_code=403, detail="TIMER NOT STARTED.")

    secure_questions = []
    for q in batch.questions:
        secure_questions.append({
            "id": q["id"],
            "text": q["text"],
            "options": q["options"],
            "question_type": q.get("question_type", "mcq"),
            "hint_count": len(q.get("hints", []))
        })

    elapsed = int((datetime.utcnow() - team.entry_timestamp).total_seconds())
    time_left = max(0, QUIZ_TIME_LIMIT_SECONDS - elapsed)

    return {
        "questions": secure_questions,
        "entry_timestamp": team.entry_timestamp,
        "server_time": datetime.utcnow(),
        "is_completed": team.is_completed,
        "time_left": time_left
    }

@app.post("/api/quiz/{batch_id}/submit")
async def submit_quiz(batch_id: int, request: Request, payload: SubmitQuizRequest):
    claims = await require_auth(request)
    if claims.get("sub") != payload.clerk_id:
        raise HTTPException(status_code=403, detail="AUTH MISMATCH.")
    rate_limit_submit(payload.clerk_id)

    team = await Team.find_one(Team.clerk_id == payload.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")
    if team.is_completed:
        raise HTTPException(status_code=409, detail="QUIZ ALREADY SUBMITTED.")

    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    if not team.entry_timestamp:
        raise HTTPException(status_code=403, detail="TIMER NOT STARTED.")

    elapsed = int((datetime.utcnow() - team.entry_timestamp).total_seconds())
    if elapsed > QUIZ_TIME_LIMIT_SECONDS:
        team.entry_timestamp = team.entry_timestamp

    answer_map = {a.question_id: a.answer for a in payload.answers}

    def normalize_answer(value: str) -> str:
        return "".join(ch for ch in str(value).upper() if ch.isalnum())

    answers_payload = []
    calculated_score = 0
    for q in batch.questions:
        selected = answer_map.get(q["id"], "")
        is_correct = normalize_answer(selected) == normalize_answer(q.get("correct", ""))
        hints_used = 0
        existing_entry = next((a for a in team.answers if a.get("q_id") == q["id"]), None)
        if existing_entry:
            hints_used = existing_entry.get("hints_used", 0)

        if is_correct:
            q_score = 5
            if hints_used == 1:
                q_score -= 1
            elif hints_used >= 2:
                q_score -= 3
            calculated_score += q_score

        answers_payload.append({
            "q_id": q["id"],
            "answer": selected,
            "is_correct": is_correct,
            "hints_used": hints_used,
            "timestamp": datetime.utcnow().isoformat()
        })

    team.answers = answers_payload
    team.end_time = datetime.utcnow()
    team.is_completed = True
    team.total_score = calculated_score
    team.current_question = len(batch.questions)
    await team.save()

    return {
        "status": "submitted",
        "score": calculated_score,
        "end_time": team.end_time
    }

class HintRequest(BaseModel):
    clerk_id: str
    question_id: int

@app.get("/api/quiz/{batch_id}/hints/{question_id}")
async def get_revealed_hints(batch_id: int, question_id: int, request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        return {"hints": []}
    
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        return {"hints": []}
    question = next((q for q in batch.questions if q["id"] == question_id), None)
    if not question:
        return {"hints": []}
        
    ans_entry = next((a for a in team.answers if a["q_id"] == question_id), None)
    count = ans_entry.get("hints_used", 0) if ans_entry else 0
    
    return {"hints": question["hints"][:count]}

@app.post("/api/quiz/{batch_id}/hints/reveal")
async def reveal_hint(batch_id: int, request: Request, payload: HintRequest):
    claims = await require_auth(request)
    if claims.get("sub") != payload.clerk_id:
        raise HTTPException(status_code=403, detail="AUTH MISMATCH.")

    team = await Team.find_one(Team.clerk_id == payload.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")
    
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    question = next((q for q in batch.questions if q["id"] == payload.question_id), None)
    if not question or not question["hints"]:
         raise HTTPException(status_code=400, detail="NO HINTS AVAILABLE FOR THIS QUESTION.")

    existing_entry = next((a for a in team.answers if a["q_id"] == payload.question_id), None)
    hints_count = existing_entry.get("hints_used", 0) if existing_entry else 0
    
    if hints_count >= len(question["hints"]):
        raise HTTPException(status_code=400, detail="ALL HINTS ALREADY DECRYPTED.")

    new_hints_count = hints_count + 1
    hint_to_reveal = question["hints"][hints_count]

    if existing_entry:
        existing_entry["hints_used"] = new_hints_count
    else:
        team.answers.append({
            "q_id": payload.question_id,
            "answer": None,
            "is_correct": False,
            "hints_used": new_hints_count,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    await team.save()
    penalty = -2 if new_hints_count == 1 else -4
    return {
        "hint": hint_to_reveal, 
        "hints_used": new_hints_count, 
        "penalty": penalty,
        "message": f"HINT DECRYPTED. PENALTY: {penalty} POINTS."
    }

@app.get("/api/quiz/{batch_id}/progress")
async def get_team_progress(batch_id: int, request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        return {"current_question": 1, "answers": []}
    
    # We only return the hints they've ALREADY revealed
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        return {"current_question": 1, "answers": []}
    revealed_hints = {}
    
    for ans in team.answers:
        q_id = ans["q_id"]
        count = ans.get("hints_used", 0)
        if count > 0:
            question = next((q for q in batch.questions if q["id"] == q_id), None)
            if question:
                revealed_hints[q_id] = question["hints"][:count]
                
    return {
        "current_question": team.current_question,
        "revealed_hints": revealed_hints,
        "total_penalty": sum([-2 if a.get("hints_used", 0) == 1 else -4 if a.get("hints_used", 0) >= 2 else 0 for a in team.answers])
    }

# --- ADMIN ENDPOINTS ---

@app.get("/api/admin/stats")
async def get_stats(request: Request):
    await require_admin(request)
    team_count = await Team.count()
    user_count = await User.count()
    return {
        "total_teams": team_count,
        "total_users": user_count,
        "timestamp": datetime.utcnow()
    }

@app.post("/api/admin/batch/init")
async def init_batches(request: Request):
    await require_admin(request)
    # Helper to create initial batches with unique codes and read stories from files
    batches_to_create = [
        {"id": 1, "code": "CRIMSON2026", "story_file": "../../batch 1 story.txt", "q_file": "../../batch 1 questions.txt"},
        {"id": 2, "code": "VOIDSHADOW2026", "story_file": "../../batch 2 story.txt", "q_file": "../../batch 2 questions.txt"},
        {"id": 3, "code": "DEATHLYSILENCE2026", "story_file": "../../batch 1 story.txt", "q_file": "../../batch 1 questions.txt"}
    ]
    
    for b_data in batches_to_create:
        print(f"--- INITIALIZING BATCH {b_data['id']} ---")
        
        # Robust file finding
        story_content = "THE INVESTIGATION HAS NOT YET BEGUN..."
        for path_prefix in ["", "../", "../../"]:
            p = os.path.join(path_prefix, b_data["story_file"]) if b_data["story_file"] else None
            if p and os.path.exists(p):
                print(f"Found story file at: {os.path.abspath(p)}")
                with open(p, "r", encoding="utf-8") as f:
                    story_content = f.read()
                break

        parsed_questions = []
        if b_data["q_file"]:
            target_q_file = None
            for path_prefix in ["", "../", "../../"]:
                p = os.path.join(path_prefix, b_data["q_file"])
                if os.path.exists(p):
                    target_q_file = p
                    break
            
            if target_q_file:
                print(f"Found questions file at: {os.path.abspath(target_q_file)}")
                with open(target_q_file, "r", encoding="utf-8") as f:
                    full_q_text = f.read()
                    
                    # 1. Split to only get the questions section (ignore the key)
                    q_section = full_q_text.split('OFFICIAL ANSWER KEY')[0]
                    ans_key_section = full_q_text.split('OFFICIAL ANSWER KEY')[1] if 'OFFICIAL ANSWER KEY' in full_q_text else ""
                    
                    import re
                    q_blocks = re.split(r'Q\d+\.', q_section)[1:] # Split by Q1., Q2., etc.
                    print(f"Found {len(q_blocks)} question blocks.")
                    
                    for i, block in enumerate(q_blocks):
                        q_id = i + 1
                        if '(A)' in block:
                            parts_a = block.split('(A)')
                            text_parts = parts_a[0].strip()
                            
                            remaining = parts_a[1] if len(parts_a) > 1 else ""
                            parts_b = remaining.split('(B)')
                            opt_a = parts_b[0].strip()
                            
                            remaining = parts_b[1] if len(parts_b) > 1 else ""
                            parts_c = remaining.split('(C)')
                            opt_b = parts_c[0].strip()
                            
                            remaining = parts_c[1] if len(parts_c) > 1 else ""
                            parts_d = remaining.split('(D)')
                            opt_c = parts_d[0].strip()
                            
                            remaining_d = parts_d[1] if len(parts_d) > 1 else ""
                            d_lines = [l.strip() for l in remaining_d.split('\n') if l.strip()]
                            
                            opt_d = d_lines[0] if d_lines else ""
                            hints = d_lines[1:] if len(d_lines) > 1 else []
                            
                            if not hints:
                                hints = re.findall(r'[Hh]int\s*\d*:\s*(.*?)(?=\s*[Hh]int|$)', remaining_d, re.DOTALL)
                                hints = [h.strip() for h in hints if h.strip()]

                            options = [f"(A) {opt_a}", f"(B) {opt_b}", f"(C) {opt_c}", f"(D) {opt_d}"]
                        else:
                            text_parts = block.strip()
                            hints = re.findall(r'[Hh]int\s*\d*:\s*(.*?)(?=\s*[Hh]int|$)', block, re.DOTALL)
                            hints = [h.strip() for h in hints if h.strip()]
                            text_parts = re.split(r'[Hh]int\s*1:', text_parts)[0].strip()
                            options = []

                        ans_match = re.search(fr'Q{q_id}\.\s*Correct Answer:\s*\(([A-D])\)(.*)', ans_key_section)
                        if not options:
                            correct_ans = ans_match.group(2).strip() if ans_match else ""
                        else:
                            correct_ans = ans_match.group(1) if ans_match else "A"
                        
                        parsed_questions.append({
                            "id": q_id,
                            "text": text_parts,
                            "options": options,
                            "correct": correct_ans,
                            "question_type": "mcq" if options else "truefalse",
                            "hints": hints
                        })
                    print(f"Parsed {len(parsed_questions)} questions with hints.")
            else:
                print(f"ERROR: FILE NOT FOUND AT {file_path}")
                
        exists = await Batch.find_one(Batch.batch_id == b_data["id"])
        if exists:
            exists.codeword = hash_codeword(b_data["code"])
            exists.story_content = story_content
            exists.questions = parsed_questions
            await exists.save()
        else:
            new_batch = Batch(
                batch_id=b_data["id"],
                is_locked=True,
                codeword=hash_codeword(b_data["code"]),
                story_content=story_content,
                questions=parsed_questions
            )
            await new_batch.insert()
    return {"status": "initialized", "codes_configured": True}

@app.post("/api/quiz/{batch_id}/finish")
async def finish_quiz(batch_id: int, request: Request, payload: StartRequest):
    claims = await require_auth(request)
    if claims.get("sub") != payload.clerk_id:
        raise HTTPException(status_code=403, detail="AUTH MISMATCH.")

    team = await Team.find_one(Team.clerk_id == payload.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")

    if not team.is_completed:
        team.end_time = datetime.utcnow()
        team.is_completed = True

        calculated_score = 0
        for ans in team.answers:
            if ans.get("is_correct", False):
                q_score = 5
                hints = ans.get("hints_used", 0)
                if hints == 1:
                    q_score -= 1
                elif hints >= 2:
                    q_score -= 3
                calculated_score += q_score

        team.total_score = calculated_score
        await team.save()

    return {"status": "completed", "end_time": team.end_time}

@app.get("/api/quiz/{batch_id}/results")
async def get_results(batch_id: int, request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="RESULTS NOT FOUND.")
    
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    total_q = len(batch.questions) if batch else 18
    max_score = total_q * 5
    
    correct = sum(1 for a in team.answers if a.get("is_correct", False))
    wrong = len(team.answers) - correct
    unanswered = total_q - len(team.answers)
    
    # Calculate time taken
    duration_str = "N/A"
    if team.entry_timestamp and team.end_time:
        diff = team.end_time - team.entry_timestamp
        hours, remainder = divmod(diff.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        duration_str = f"{int(hours):02}:{int(minutes):02}:{int(seconds):02}"

    return {
        "team_name": team.team_name,
        "correct": correct,
        "wrong": wrong,
        "unanswered": unanswered,
        "total": total_q,
        "max_score": max_score,
        "time_taken": duration_str,
        "score": team.total_score
    }

@app.get("/api/quiz/{batch_id}/leaderboard")
async def get_leaderboard(batch_id: int, request: Request):
    await require_auth(request)
    return await build_leaderboard(batch_id)

@app.get("/api/leaderboard/stream")
async def leaderboard_stream(request: Request, batch_id: int):
    await require_auth(request)

    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            data = await build_leaderboard(batch_id)
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- ADMIN COMMAND CENTER ENDPOINTS ---

@app.get("/api/admin/check")
async def check_admin(request: Request):
    claims = await require_auth(request)
    clerk_id = claims.get("sub")
    user = await User.find_one(User.clerk_id == clerk_id)
    return {"is_admin": bool(user and user.is_admin)}

@app.post("/api/admin/promote")
async def promote_user(request: Request, clerk_id: str):
    await require_admin(request)
    user = await User.find_one(User.clerk_id == clerk_id)
    if not user:
        # Try to find info from Team collection to populate User
        team = await Team.find_one(Team.clerk_id == clerk_id)
        user = User(
            clerk_id=clerk_id,
            email=f"{clerk_id}@clerk.user", # Placeholder since we don't have it here
            name=team.leader_name if team else "Admin Operative",
            is_admin=True
        )
        await user.insert()
    else:
        user.is_admin = True
        await user.save()
        
    return {"status": "promoted", "clerk_id": clerk_id}

@app.post("/api/admin/login")
async def admin_login():
    raise HTTPException(status_code=410, detail="ADMIN LOGIN DISABLED. USE CLERK.")

@app.get("/api/admin/teams")
async def admin_get_teams(request: Request):
    await require_admin(request)
    teams = await Team.find_all().to_list()
    return teams

@app.get("/api/admin/batches")
async def admin_get_batches(request: Request):
    await require_admin(request)
    batches = await Batch.find_all().to_list()
    return batches

@app.post("/api/admin/batches/{batch_id}/toggle")
async def admin_toggle_batch(batch_id: int, request: Request):
    admin = await require_admin(request)
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    
    batch.is_locked = not batch.is_locked
    await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="TOGGLE_BATCH",
        target_id=str(batch_id),
        payload={"is_locked": batch.is_locked}
    ).insert()
    return {"batch_id": batch_id, "is_locked": batch.is_locked}

@app.post("/api/admin/teams/{team_clerk_id}/reset")
async def admin_reset_team(team_clerk_id: str, request: Request, batch_id: int):
    admin = await require_admin(request)
    team = await Team.find_one(Team.clerk_id == team_clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")
    
    team.start_time = None
    team.end_time = None
    team.is_completed = False
    team.answers = []
    team.current_question = 1
    team.total_score = 0
    await team.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="RESET_TEAM",
        target_id=team_clerk_id,
        payload={"batch_id": batch_id}
    ).insert()
    return {"status": "reset_successful", "team": team.team_name}

@app.get("/api/admin/users")
async def admin_users(request: Request):
    await require_admin(request)
    users = await User.find_all().to_list()
    teams = await Team.find_all().to_list()
    team_map = {}
    for team in teams:
        team_map.setdefault(team.clerk_id, []).append(team)

    results = []
    for user in users:
        user_teams = team_map.get(user.clerk_id, [])
        if not user_teams:
            results.append({
                "clerk_id": user.clerk_id,
                "name": user.name,
                "email": user.email,
                "assigned_batch": user.assigned_batch,
                "status": "not_started",
                "score": 0,
                "time_consumed": None
            })
            continue

        for team in user_teams:
            status = "not_started"
            if team.is_completed:
                status = "completed"
            elif team.entry_timestamp:
                status = "in_progress"

            duration = None
            if team.entry_timestamp and team.end_time:
                duration = int((team.end_time - team.entry_timestamp).total_seconds())

            results.append({
                "clerk_id": user.clerk_id,
                "name": user.name,
                "email": user.email,
                "assigned_batch": user.assigned_batch,
                "batch_id": team.batch_id,
                "status": status,
                "score": team.total_score,
                "time_consumed": duration
            })
    return results

@app.put("/api/admin/batch/{batch_id}/lock")
async def admin_set_batch_lock(batch_id: int, request: Request, payload: LockBatchRequest):
    admin = await require_admin(request)
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    batch.is_locked = payload.is_locked
    await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="SET_BATCH_LOCK",
        target_id=str(batch_id),
        payload={"is_locked": batch.is_locked}
    ).insert()
    return {"batch_id": batch_id, "is_locked": batch.is_locked}

@app.put("/api/admin/batch/{batch_id}/codeword")
async def admin_set_codeword(batch_id: int, request: Request, payload: CodewordUpdateRequest):
    admin = await require_admin(request)
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    batch.codeword = hash_codeword(payload.codeword)
    await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="SET_CODEWORD",
        target_id=str(batch_id)
    ).insert()
    return {"status": "updated"}

@app.put("/api/admin/story/{batch_id}")
async def admin_update_story(batch_id: int, request: Request, payload: StoryUpdateRequest):
    admin = await require_admin(request)
    target_batches = [batch_id]
    if batch_id in (1, 3):
        target_batches = [1, 3]
    for target_id in target_batches:
        batch = await Batch.find_one(Batch.batch_id == target_id)
        if not batch:
            raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
        batch.story_content = payload.story_content
        await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="UPDATE_STORY",
        target_id=str(batch_id)
    ).insert()
    return {"status": "updated"}

@app.get("/api/admin/questions/{batch_id}")
async def admin_get_questions(batch_id: int, request: Request):
    await require_admin(request)
    content_batch_id = 1 if batch_id == 3 else batch_id
    batch = await Batch.find_one(Batch.batch_id == content_batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    return batch.questions

@app.post("/api/admin/questions")
async def admin_create_question(request: Request, payload: QuestionCreateRequest):
    admin = await require_admin(request)
    target_batches = [payload.batch_id]
    if payload.batch_id in (1, 3):
        target_batches = [1, 3]
    for target_id in target_batches:
        batch = await Batch.find_one(Batch.batch_id == target_id)
        if not batch:
            raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
        batch.questions = [q for q in batch.questions if q["id"] != payload.question_id]
        batch.questions.append({
            "id": payload.question_id,
            "text": payload.text,
            "options": payload.options,
            "correct": payload.correct,
            "question_type": payload.question_type,
            "hints": payload.hints
        })
        batch.questions.sort(key=lambda q: q["id"])
        await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="CREATE_QUESTION",
        target_id=f"{payload.batch_id}:{payload.question_id}"
    ).insert()
    return {"status": "created"}

@app.put("/api/admin/questions/{question_id}")
async def admin_update_question(question_id: int, request: Request, payload: QuestionUpdateRequest, batch_id: int):
    admin = await require_admin(request)
    target_batches = [batch_id]
    if batch_id in (1, 3):
        target_batches = [1, 3]
    for target_id in target_batches:
        batch = await Batch.find_one(Batch.batch_id == target_id)
        if not batch:
            raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
        question = next((q for q in batch.questions if q["id"] == question_id), None)
        if not question:
            raise HTTPException(status_code=404, detail="QUESTION NOT FOUND.")
        if payload.text is not None:
            question["text"] = payload.text
        if payload.options is not None:
            question["options"] = payload.options
        if payload.correct is not None:
            question["correct"] = payload.correct
        if payload.question_type is not None:
            question["question_type"] = payload.question_type
        if payload.hints is not None:
            question["hints"] = payload.hints
        await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="UPDATE_QUESTION",
        target_id=f"{batch_id}:{question_id}"
    ).insert()
    return {"status": "updated"}

@app.delete("/api/admin/questions/{question_id}")
async def admin_delete_question(question_id: int, request: Request, batch_id: int):
    admin = await require_admin(request)
    target_batches = [batch_id]
    if batch_id in (1, 3):
        target_batches = [1, 3]
    for target_id in target_batches:
        batch = await Batch.find_one(Batch.batch_id == target_id)
        if not batch:
            raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
        batch.questions = [q for q in batch.questions if q["id"] != question_id]
        await batch.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="DELETE_QUESTION",
        target_id=f"{batch_id}:{question_id}"
    ).insert()
    return {"status": "deleted"}

@app.post("/api/admin/user/{clerk_id}/assign")
async def admin_assign_user_batch(clerk_id: str, request: Request, payload: AssignUserBatchRequest):
    admin = await require_admin(request)
    user = await User.find_one(User.clerk_id == clerk_id)
    if not user:
        raise HTTPException(status_code=404, detail="USER NOT FOUND.")
    user.assigned_batch = str(payload.batch_id)
    await user.save()
    await AdminLog(
        admin_id=admin.clerk_id,
        action="ASSIGN_BATCH",
        target_id=clerk_id,
        payload={"batch_id": payload.batch_id}
    ).insert()
    return {"status": "assigned", "assigned_batch": user.assigned_batch}

@app.get("/api/admin/audit")
async def admin_audit_log(request: Request):
    await require_admin(request)
    logs = await AdminLog.find_all().sort("-timestamp").to_list()
    return logs

@app.get("/api/admin/export")
async def admin_export(request: Request):
    await require_admin(request)
    users = await User.find_all().to_list()
    teams = await Team.find_all().to_list()
    team_map = {}
    for team in teams:
        team_map.setdefault(team.clerk_id, []).append(team)

    import csv
    from io import StringIO
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "email", "batch", "score", "percentage", "time_consumed", "rank"])

    for user in users:
        for team in team_map.get(user.clerk_id, []):
            total_q = len(team.answers) if team.answers else 20
            percentage = round((team.total_score / (max(total_q, 1) * 5)) * 100, 2) if team.total_score else 0
            duration = None
            if team.entry_timestamp and team.end_time:
                duration = int((team.end_time - team.entry_timestamp).total_seconds())
            writer.writerow([
                user.name,
                user.email,
                team.batch_id,
                team.total_score,
                percentage,
                duration,
                ""
            ])

    return Response(content=output.getvalue(), media_type="text/csv")

