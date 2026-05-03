from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

API_KEY = os.getenv("GROK_API_KEY")


def has_valid_api_key() -> bool:
    return bool(API_KEY) and API_KEY != "your_key_here"


def fallback_reply(message: str) -> str:
    return (
        "I can explain election topics, but the AI backend is not configured yet. "
        "Set GROK_API_KEY in backend/.env to enable live responses."
    )


def fallback_explanation(topic: str) -> str:
    return (
        f"{topic} is one stage in the election process. "
        "It involves official steps that help move an election forward from preparation to results. "
        "Set GROK_API_KEY in backend/.env to enable a fuller AI explanation."
    )


def fallback_feedback(question: str, selected: str, correct: str) -> str:
    if selected == correct:
        verdict = "Your answer is correct."
    else:
        verdict = f"Your answer is incorrect. The correct answer is {correct}."

    return (
        f"{verdict} {question} is about election knowledge and the key idea is to compare the selected answer with the correct one. "
        "Set GROK_API_KEY in backend/.env to enable AI-generated tutoring feedback."
    )

client = OpenAI(
    base_url="https://api.x.ai/v1",
    api_key=API_KEY or ""
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    history: list

class ExplainRequest(BaseModel):
    topic: str

class QuizCheckRequest(BaseModel):
    question: str
    selected: str
    correct: str

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/chat")
async def chat(req: ChatRequest):
    try:
        if not has_valid_api_key():
            return {"reply": fallback_reply(req.message)}

        system_prompt = "You are an expert on election processes. Explain election steps, timelines, voting rights, and processes clearly and simply. Keep answers concise and beginner-friendly."
        
        messages = [{"role": "system", "content": system_prompt}]
        for h in req.history:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
        messages.append({"role": "user", "content": req.message})
        
        response = client.chat.completions.create(
            model="grok-3-mini",
            messages=messages
        )
        
        reply = response.choices[0].message.content
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/explain")
async def explain(req: ExplainRequest):
    try:
        if not has_valid_api_key():
            return {"explanation": fallback_explanation(req.topic)}

        system_prompt = "You are an election education assistant. Give a clear, 3-paragraph explanation of the given election topic for a general audience."
        
        response = client.chat.completions.create(
            model="grok-3-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.topic}
            ]
        )
        
        explanation = response.choices[0].message.content
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/quiz-check")
async def quiz_check(req: QuizCheckRequest):
    try:
        if not has_valid_api_key():
            return {"feedback": fallback_feedback(req.question, req.selected, req.correct)}

        system_prompt = "You are an election tutor. The user answered a quiz question. Explain in 2 sentences why the answer is correct or incorrect."
        
        user_message = f"Question: {req.question}\nUser's answer: {req.selected}\nCorrect answer: {req.correct}"
        
        response = client.chat.completions.create(
            model="grok-3-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )
        
        feedback = response.choices[0].message.content
        return {"feedback": feedback}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse(os.path.join(static_dir, "index.html"))