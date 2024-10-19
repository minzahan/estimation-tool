from typing import Optional, Dict
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://estimation-tool-pied.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for sessions
sessions: Dict[str, Dict] = {}
MAX_USERS = 100

# Request models
class CreateSessionRequest(BaseModel):
    admin_name: str
    team_name: str

class JoinSessionRequest(BaseModel):
    display_name: str

class SessionStateResponse(BaseModel):
    session_id: str
    admin_name: str
    team_name: str
    users: list[str]
    task_name: Optional[str]
    estimates: Dict[str, int]
    revealed: bool

# 1. Create a session (Admin)
@app.post("/create-session/", response_model=SessionStateResponse)
async def create_session(request: CreateSessionRequest):
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        "admin_name": request.admin_name,
        "team_name": request.team_name,
        "users": [],
        "task_name": None,
        "estimates": {},
        "revealed": False,
    }
    return sessions[session_id] | {"session_id": session_id}

# 2. Join a session (User)
@app.post("/join-session/{session_id}", response_model=SessionStateResponse)
async def join_session(session_id: str, request: JoinSessionRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    if len(sessions[session_id]["users"]) >= MAX_USERS:
        raise HTTPException(status_code=400, detail="Session is full")

    sessions[session_id]["users"].append(request.display_name)
    return sessions[session_id] | {"session_id": session_id}

# 3. Get full session state (Admin & User)
@app.get("/get-session-state/{session_id}", response_model=SessionStateResponse)
async def get_session_state(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    return sessions[session_id] | {"session_id": session_id}

# 4. Set task name (Admin)
@app.post("/set-task/{session_id}")
async def set_task(session_id: str, task_name: Optional[str] = Body(..., embed=True)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions[session_id]["task_name"] = task_name
    sessions[session_id]["revealed"] = False  # Reset reveal flag
    return {"message": "Task name set"}

# 5. Submit estimate (User)
@app.post("/submit-estimate/{session_id}")
async def submit_estimate(session_id: str, display_name: str = Body(..., embed=True), estimate: int = Body(..., embed=True)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    sessions[session_id]["estimates"][display_name] = estimate
    return {"message": f"{display_name} submitted an estimate"}

# 6. Reveal estimates (Admin)
@app.post("/reveal-estimates/{session_id}")
async def reveal_estimates(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sessions[session_id]["revealed"] = True
    return {"message": "Estimates revealed"}

@app.post("/clear-session-state/{session_id}")
async def clear_session_state(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    # Reset the task name, estimates, and reveal status
    sessions[session_id]["task_name"] = None
    sessions[session_id]["estimates"] = {}
    sessions[session_id]["revealed"] = False

    return {"message": "Session state cleared. Ready for new estimation."}

# 7. Leave session (User)
@app.post("/leave-session/{session_id}")
async def leave_session(session_id: str, display_name: str = Body(..., embed=True)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    if display_name in session["users"]:
        session["users"].remove(display_name)

    else:
        raise HTTPException(status_code=404, detail="User not found in session")

    # If only the admin is left, keep the session running
    if not session["users"]:
        return {"message": "All users left. Waiting for new participants."}

    return {"message": f"{display_name} has left the session"}

# 8. End session (Admin)
@app.delete("/end-session/{session_id}")
async def end_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    del sessions[session_id]
    return {"message": "Session ended successfully"}
