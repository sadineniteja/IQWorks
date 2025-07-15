from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
import uuid
from typing import List, Dict, Optional
from datetime import datetime
import asyncio

app = FastAPI(title="Professional Chat API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

chat_sessions: Dict[str, Dict] = {}
active_connections: Dict[str, WebSocket] = {}

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None

class SendMessageRequest(BaseModel):
    session_id: str
    message: str
    api_url: str
    model_name: str
    middleware_url: Optional[str] = None
    use_web: bool = False
    temperature: float = 0.7

class ChatSession(BaseModel):
    session_id: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime

class ConfigRequest(BaseModel):
    api_url: str
    model_name: str
    middleware_url: Optional[str] = None
    use_web: bool = False

class QueryRequest(BaseModel):
    query: str
    web: bool = False
    role: str = "assistant"
    temperature: float = 0.7
    max_tokens: int = 400

def summarize_last_exchanges(messages: List[ChatMessage], max_words: int = 50) -> str:
    """Simple summarization by taking last few messages"""
    if len(messages) < 2:
        return ""
    
    recent_messages = messages[-4:]
    history_text = "\n".join([msg.content for msg in recent_messages])
    
    words = history_text.split()
    if len(words) <= max_words:
        return history_text
    
    return " ".join(words[:max_words]) + "..."

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/chat/session")
async def create_chat_session():
    """Create a new chat session"""
    session_id = str(uuid.uuid4())
    chat_sessions[session_id] = {
        "session_id": session_id,
        "messages": [],
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    return {"session_id": session_id}

@app.get("/api/chat/session/{session_id}")
async def get_chat_session(session_id: str):
    """Get chat session by ID"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return chat_sessions[session_id]

@app.get("/api/chat/sessions")
async def list_chat_sessions():
    """List all chat sessions"""
    return list(chat_sessions.values())

@app.post("/api/chat/message")
async def send_message(request: SendMessageRequest):
    """Send a message and get AI response"""
    session_id = request.session_id
    
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "session_id": session_id,
            "messages": [],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    
    session = chat_sessions[session_id]
    
    user_message = ChatMessage(
        role="user",
        content=request.message,
        timestamp=datetime.now()
    )
    session["messages"].append(user_message.dict())
    
    try:
        if request.use_web and request.middleware_url:
            response = requests.post(
                request.middleware_url,
                headers={"Content-Type": "application/json"},
                json={"query": request.message},
                timeout=30
            )
            data = response.json()
            reply = data.get("mixtral_reply", {}).get("choices", [{}])[0].get("message", {}).get("content", "")
            
            if not reply:
                reply = f"Middleware Error: {data}"
                
        else:
            messages_for_api = [ChatMessage(**msg) for msg in session["messages"]]
            context_summary = summarize_last_exchanges(messages_for_api)
            
            payload = {
                "model": request.model_name,
                "messages": [{"role": "system", "content": context_summary}] + [{"role": "user", "content": request.message}],
                "temperature": request.temperature
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": "Bearer dummy-key"
            }
            
            response = requests.post(request.api_url, headers=headers, json=payload, timeout=30)
            data = response.json()
            
            if "choices" in data:
                reply = data["choices"][0]["message"]["content"]
            else:
                reply = f"API Error: {data.get('message', 'Unknown error')}"
    
    except Exception as e:
        reply = f"Exception: {str(e)}"
    
    ai_message = ChatMessage(
        role="assistant",
        content=reply,
        timestamp=datetime.now()
    )
    session["messages"].append(ai_message.dict())
    session["updated_at"] = datetime.now()
    
    if session_id in active_connections:
        try:
            await active_connections[session_id].send_text(json.dumps({
                "type": "new_message",
                "message": ai_message.dict()
            }))
        except:
            del active_connections[session_id]
    
    return {
        "user_message": user_message.dict(),
        "ai_response": ai_message.dict(),
        "session_id": session_id
    }

@app.delete("/api/chat/session/{session_id}")
async def delete_chat_session(session_id: str):
    """Delete a chat session"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del chat_sessions[session_id]
    if session_id in active_connections:
        del active_connections[session_id]
    
    return {"message": "Session deleted successfully"}

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    """Simple query endpoint matching user's curl example"""
    try:
        return {
            "query": request.query,
            "web": request.web,
            "role": request.role,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "status": "received"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    active_connections[session_id] = websocket
    
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if session_id in active_connections:
            del active_connections[session_id]
