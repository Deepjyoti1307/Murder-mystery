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
    team_id: Optional[str] = None
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

# --- API SCHEMAS ---

class AccessRequest(BaseModel):
    team_name: str
    team_id: str
    leader_name: str
    phone_number: str
    college_name: str
    access_code: str
    clerk_id: str

class StartRequest(BaseModel):
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
# Using ["*"] and allow_credentials=False to bypass all origin issues for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ENDPOINTS ---

@app.get("/")
async def root():
    return {"message": "MURDER MYSTERY API LIVE", "version": "2.0.0"}

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
        team.team_id = request.team_id
        team.leader_name = request.leader_name
        team.phone_number = request.phone_number
        team.college_name = request.college_name
        await team.save()
    else:
        team = Team(
            clerk_id=request.clerk_id,
            team_name=request.team_name,
            team_id=request.team_id,
            leader_name=request.leader_name,
            phone_number=request.phone_number,
            college_name=request.college_name,
            batch_id=batch_id,
            entry_timestamp=datetime.utcnow()
        )
        await team.insert()

    return {"status": "success", "message": "AUTHORIZATION GRANTED"}

@app.get("/api/story/{batch_id}")
async def get_story(batch_id: int):
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="DOSSIER NOT FOUND.")
    return {"content": batch.story_content}

@app.post("/api/batch/{batch_id}/start")
async def start_batch(batch_id: int, request: StartRequest):
    team = await Team.find_one(Team.clerk_id == request.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT REGISTERED.")
    
    if not team.start_time:
        team.start_time = datetime.utcnow()
        await team.save()
    
    return {"status": "timer_started", "start_time": team.start_time}

@app.get("/api/quiz/{batch_id}/questions")
async def get_questions(batch_id: int, clerk_id: str):
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT REGISTERED.")

    # Return questions WITHOUT the 'correct' field, but with hint_count
    secure_questions = []
    for q in batch.questions:
        secure_questions.append({
            "id": q["id"],
            "text": q["text"],
            "options": q["options"],
            "hint_count": len(q.get("hints", []))
        })
    
    return {
        "questions": secure_questions,
        "start_time": team.start_time,
        "server_time": datetime.utcnow(),
        "is_completed": team.is_completed
    }

class AnswerSubmission(BaseModel):
    clerk_id: str
    question_id: int
    answer: str # e.g., "A", "B", "C", "D"

@app.post("/api/quiz/{batch_id}/submit")
async def submit_answer(batch_id: int, submission: AnswerSubmission):
    team = await Team.find_one(Team.clerk_id == submission.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")
    
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")

    question = next((q for q in batch.questions if q["id"] == submission.question_id), None)
    if not question:
        raise HTTPException(status_code=400, detail="INVALID QUESTION ID.")

    import re
    def normalize(s: str) -> str:
        return re.sub(r'[^A-Z0-9]', '', str(s).upper())

    is_correct = normalize(submission.answer) == normalize(question["correct"])
    
    # Check if they already used hints for this question
    existing_entry = next((a for a in team.answers if a["q_id"] == submission.question_id), None)
    hints_used = existing_entry.get("hints_used", 0) if existing_entry else 0

    # Update answers list
    team.answers = [a for a in team.answers if a["q_id"] != submission.question_id]
    team.answers.append({
        "q_id": submission.question_id,
        "answer": submission.answer,
        "is_correct": is_correct,
        "hints_used": hints_used,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    team.current_question = max(team.current_question, submission.question_id + 1)
    await team.save()
    
    return {"is_correct": is_correct, "message": "ANALYSIS LOGGED" if is_correct else "DISCREPANCY DETECTED"}

class HintRequest(BaseModel):
    clerk_id: str
    question_id: int

@app.get("/api/quiz/{batch_id}/hints/{question_id}")
async def get_revealed_hints(batch_id: int, question_id: int, clerk_id: str):
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        return {"hints": []}
    
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        return {"hints": []}
        
    question = next((q for q in batch.questions if q.get("id") == question_id), None)
    if not question:
        return {"hints": []}

    ans_entry = next((a for a in team.answers if a.get("q_id") == question_id), None)
    count = ans_entry.get("hints_used", 0) if ans_entry else 0
    
    hints_list = question.get("hints", [])
    return {"hints": hints_list[:count]}

@app.post("/api/quiz/{batch_id}/hints/reveal")
async def reveal_hint(batch_id: int, request: HintRequest):
    print(f"DEBUG: Hint reveal request for {request.clerk_id}, Q{request.question_id}")
    team = await Team.find_one(Team.clerk_id == request.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")
    
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
         raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")

    question = next((q for q in batch.questions if q.get("id") == request.question_id), None)
    if not question:
         raise HTTPException(status_code=400, detail="QUESTION NOT FOUND IN BATCH.")

    hints_list = question.get("hints", [])
    if not hints_list:
          raise HTTPException(status_code=400, detail="NO HINTS AVAILABLE FOR THIS QUESTION.")

    # Find or create answer entry
    existing_entry = None
    for a in team.answers:
        if a.get("q_id") == request.question_id:
            existing_entry = a
            break

    hints_count = existing_entry.get("hints_used", 0) if existing_entry else 0
    
    if hints_count >= len(hints_list):
        raise HTTPException(status_code=400, detail="ALL HINTS ALREADY DECRYPTED.")

    new_hints_count = hints_count + 1
    hint_to_reveal = hints_list[hints_count]

    if existing_entry:
        existing_entry["hints_used"] = new_hints_count
    else:
        team.answers.append({
            "q_id": request.question_id,
            "answer": None,
            "is_correct": False,
            "hints_used": new_hints_count,
            "timestamp": datetime.utcnow().isoformat()
        })

    # Crucial: Re-assign list to ensure Beanie/Motor detects the nested change
    team.answers = list(team.answers)
    
    # Calculate penalty
    penalty = -2 if new_hints_count == 1 else -4
    team.total_score += penalty
    
    await team.save()
    print(f"DEBUG: Hint revealed: {hint_to_reveal[:20]}... New count: {new_hints_count}")
    
    return {
        "hint": hint_to_reveal, 
        "hints_used": new_hints_count, 
        "total_score": team.total_score
    }

@app.get("/api/quiz/{batch_id}/progress")
async def get_team_progress(batch_id: int, clerk_id: str):
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        return {"current_question": 1, "answers": []}
    
    # We only return the hints they've ALREADY revealed
    batch = await Batch.find_one(Batch.batch_id == batch_id)
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
                            "hints": hints
                        })
                    print(f"Parsed {len(parsed_questions)} questions with hints.")
            else:
                print(f"ERROR: FILE NOT FOUND AT {file_path}")
                
        exists = await Batch.find_one(Batch.batch_id == b_data["id"])
        if exists:
            exists.codeword = b_data["code"]
            exists.story_content = story_content
            exists.questions = parsed_questions
            await exists.save()
        else:
            new_batch = Batch(
                batch_id=b_data["id"],
                is_locked=True,
                codeword=b_data["code"],
                story_content=story_content,
                questions=parsed_questions
            )
            await new_batch.insert()
    return {"status": "initialized", "codes_configured": True}

@app.post("/api/quiz/{batch_id}/finish")
async def finish_quiz(batch_id: int, request: StartRequest):
    team = await Team.find_one(Team.clerk_id == request.clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="TEAM NOT FOUND.")
    
    if not team.is_completed:
        team.end_time = datetime.utcnow()
        team.is_completed = True
        
        # Calculate final score with deductions
        # Logic: Correct (+5), 1st Hint (-1), 2nd Hint (-3), Wrong (0)
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
async def get_results(batch_id: int, clerk_id: str):
    team = await Team.find_one(Team.clerk_id == clerk_id, Team.batch_id == batch_id)
    if not team:
        raise HTTPException(status_code=404, detail="RESULTS NOT FOUND.")
    
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    total_q = len(batch.questions) if batch else 18
    max_score = total_q * 5
    
    correct = sum(1 for a in team.answers if a.get("is_correct", False))
    wrong = len(team.answers) - correct
    unanswered = total_q - len(team.answers)
    
    # Calculate time taken
    duration_str = "N/A"
    if team.start_time and team.end_time:
        diff = team.end_time - team.start_time
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
async def get_leaderboard(batch_id: int):
    # Fetch all completed teams for this batch
    teams = await Team.find(Team.batch_id == batch_id, Team.is_completed == True).to_list()
    
    leaderboard = []
    for t in teams:
        duration = 0
        if t.start_time and t.end_time:
            duration = (t.end_time - t.start_time).total_seconds()
            
        leaderboard.append({
            "team_name": t.team_name,
            "college": t.college_name,
            "score": t.total_score,
            "duration": duration,
            "duration_str": f"{int(duration//3600):02}:{int((duration%3600)//60):02}:{int(duration%60):02}"
        })
    
    # Sort by score (desc) then duration (asc)
    leaderboard.sort(key=lambda x: (-x["score"], x["duration"]))
    return leaderboard

# --- ADMIN COMMAND CENTER ENDPOINTS ---

@app.get("/api/admin/check")
async def check_admin(clerk_id: str):
    if clerk_id == "user_3DjX127kJgcAC7I2CgRnMOrtBD7":
        return {"is_admin": True}
    user = await User.find_one(User.clerk_id == clerk_id)
    if not user or not user.is_admin:
        return {"is_admin": False}
    return {"is_admin": True}

@app.post("/api/admin/promote")
async def promote_user(clerk_id: str, secret: str):
    # Secure this with a secret from .env
    if secret != os.getenv("ADMIN_SECRET", "techtrix_admin_2026"):
        raise HTTPException(status_code=403, detail="INVALID SECRET.")
    
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
async def admin_login(secret: str):
    if secret == os.getenv("ADMIN_SECRET", "techtrix_admin_2026"):
        return {"status": "authorized", "token": "ACCESS_GRANTED_2026"} # Simple token for UI gating
    raise HTTPException(status_code=401, detail="INVALID ACCESS KEY")

async def verify_admin(clerk_id: str):
    # 1. Master Bypass Token (from Secret Key login)
    if clerk_id == "ACCESS_GRANTED_2026":
        return True
    # 2. Hardcoded Admin ID
    if clerk_id == "user_3DjX127kJgcAC7I2CgRnMOrtBD7":
        return True
    # 3. Database Check
    admin = await User.find_one(User.clerk_id == clerk_id)
    if admin and admin.is_admin:
        return True
    raise HTTPException(status_code=403, detail="ADMIN ACCESS REQUIRED.")

@app.get("/api/admin/teams")
async def admin_get_teams(clerk_id: str):
    await verify_admin(clerk_id)
    teams = await Team.find_all().to_list()
    return teams

@app.get("/api/admin/batches")
async def admin_get_batches(clerk_id: str):
    await verify_admin(clerk_id)
    batches = await Batch.find_all().to_list()
    return batches

@app.get("/api/admin/batches/{batch_id}")
async def admin_get_batch_detail(batch_id: int, clerk_id: str):
    await verify_admin(clerk_id)
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    return batch

@app.put("/api/admin/batches/{batch_id}")
async def admin_update_batch(batch_id: int, clerk_id: str, batch_data: dict):
    await verify_admin(clerk_id)
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    
    if "codeword" in batch_data:
        batch.codeword = batch_data["codeword"]
    if "story_content" in batch_data:
        batch.story_content = batch_data["story_content"]
    if "questions" in batch_data:
        batch.questions = batch_data["questions"]
    
    await batch.save()
    return {"status": "success", "message": "BATCH DATA SYNCHRONIZED."}

@app.post("/api/admin/batches/{batch_id}/toggle")
async def admin_toggle_batch(batch_id: int, clerk_id: str):
    await verify_admin(clerk_id)
    batch = await Batch.find_one(Batch.batch_id == batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="BATCH NOT FOUND.")
    
    batch.is_locked = not batch.is_locked
    await batch.save()
    return {"batch_id": batch_id, "is_locked": batch.is_locked}

@app.post("/api/admin/teams/{team_clerk_id}/reset")
async def admin_reset_team(team_clerk_id: str, clerk_id: str, batch_id: int):
    await verify_admin(clerk_id)
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
    return {"status": "reset_successful", "team": team.team_name}

