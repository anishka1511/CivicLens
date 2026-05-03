from groq import Groq
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import logging

from collections import OrderedDict
from typing import List
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import groq as groq_lib

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_KEY = os.getenv("GROQ_API_KEY")
logger.info(f"GROQ_API_KEY loaded: {bool(os.getenv('GROQ_API_KEY'))}")

def has_valid_api_key() -> bool:
    return bool(API_KEY) and API_KEY != "your_key_here"


def fallback_reply(message: str) -> str:
    return (
        "I can explain election topics, but the AI backend is not configured yet. "
        "Set GROQ_API_KEY in backend/.env to enable live responses."
    )


def fallback_explanation(topic: str) -> str:
    return (
        f"{topic} is one stage in the election process. "
        "It involves official steps that help move an election forward from preparation to results. "
        "Set GROQ_API_KEY in backend/.env to enable a fuller AI explanation."
    )


def fallback_feedback(question: str, selected: str, correct: str) -> str:
    if selected == correct:
        verdict = "Your answer is correct."
    else:
        verdict = f"Your answer is incorrect. The correct answer is {correct}."

    return (
        f"{verdict} {question} is about election knowledge and the key idea is to compare the selected answer with the correct one. "
        "Set GROQ_API_KEY in backend/.env to enable AI-generated tutoring feedback."
    )

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Configure rate limiter and FastAPI app
limiter = Limiter(key_func=get_remote_address)

app = FastAPI()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[dict] = Field(default_factory=list)


class ExplainRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)


class QuizRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    selected: str = Field(..., min_length=1, max_length=200)
    correct: str = Field(..., min_length=1, max_length=200)

# Simple LRU cache for explanations (max 50 entries)
_explain_cache = OrderedDict()
_EXPLAIN_CACHE_MAX = 50

def explain_cache_get(topic: str):
    if not topic:
        return None
    key = topic.strip().lower()
    if key in _explain_cache:
        _explain_cache.move_to_end(key)
        return _explain_cache[key]
    return None


def explain_cache_set(topic: str, value: str):
    if not topic:
        return
    key = topic.strip().lower()
    _explain_cache[key] = value
    _explain_cache.move_to_end(key)
    if len(_explain_cache) > _EXPLAIN_CACHE_MAX:
        _explain_cache.popitem(last=False)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "Too many requests"})


def sanitize_history(history: List[dict]) -> List[dict]:
    sanitized = []
    for item in (history or [])[:20]:
        if not isinstance(item, dict):
            continue
        role = item.get("role", "user")
        if role not in ("user", "assistant"):
            continue
        content = item.get("content", "")
        if not isinstance(content, str):
            continue
        content = content.strip()
        if not content:
            continue
        if len(content) > 1000:
            content = content[:1000]
        sanitized.append({"role": role, "content": content})
    return sanitized

@app.post("/api/chat")
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest):
    if not has_valid_api_key():
        return JSONResponse(status_code=200, content={"reply": fallback_reply(req.message)})

    system_prompt = (
        "You are an expert on election processes. Explain election steps, timelines, voting rights, "
        "and processes clearly and simply. Keep answers concise and beginner-friendly."
    )

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(sanitize_history(req.history))
    messages.append({"role": "user", "content": req.message.strip()})

    try:
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=300,
                temperature=0.7
            )
        except Exception as e:
            logger.error(f"Error in /api/chat (inner): {str(e)}")
            api_err_module = getattr(groq_lib, 'error', None)
            api_error_type = getattr(api_err_module, 'APIError', None) if api_err_module else None
            if api_error_type and isinstance(e, api_error_type):
                logger.error(f"APIError in /api/chat: {str(e)}")
                return JSONResponse(status_code=502, content={"error": "AI service unavailable"})
            # unknown error: surface a 500 to client without internal details
            raise

        reply = getattr(response.choices[0].message, 'content', '')
        return JSONResponse(status_code=200, content={"reply": reply})
    except Exception as e:
        logger.error(f"Error in /api/chat: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

@app.post("/api/explain")
@limiter.limit("30/minute")
async def explain(request: Request, req: ExplainRequest):
    if not has_valid_api_key():
        return JSONResponse(status_code=200, content={"explanation": fallback_explanation(req.topic)})

    system_prompt = "You are an election education assistant. Give a clear, 3-paragraph explanation of the given election topic for a general audience."

    # check cache first
    cached = explain_cache_get(req.topic)
    if cached:
        return JSONResponse(status_code=200, content={"explanation": cached})

    try:
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": req.topic}
                ],
                max_tokens=500,
                temperature=0.7
            )
        except Exception as e:
            logger.error(f"Error in /api/explain (inner): {str(e)}")
            api_err_module = getattr(groq_lib, 'error', None)
            api_error_type = getattr(api_err_module, 'APIError', None) if api_err_module else None
            if api_error_type and isinstance(e, api_error_type):
                logger.error(f"APIError in /api/explain: {str(e)}")
                return JSONResponse(status_code=502, content={"error": "AI service unavailable"})
            raise

        explanation = getattr(response.choices[0].message, 'content', '')
        explain_cache_set(req.topic, explanation)
        return JSONResponse(status_code=200, content={"explanation": explanation})
    except Exception as e:
        logger.error(f"Error in /api/explain: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})

@app.post("/api/quiz-check")
@limiter.limit("30/minute")
async def quiz_check(request: Request, req: QuizRequest):
    if not has_valid_api_key():
        return JSONResponse(status_code=200, content={"feedback": fallback_feedback(req.question, req.selected, req.correct)})

    system_prompt = "You are an election tutor. The user answered a quiz question. Explain in 2 sentences why the answer is correct or incorrect."

    user_message = f"Question: {req.question}\nUser's answer: {req.selected}\nCorrect answer: {req.correct}"

    try:
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=500,
                temperature=0.7
            )
        except Exception as e:
            logger.error(f"Error in /api/quiz-check (inner): {str(e)}")
            api_err_module = getattr(groq_lib, 'error', None)
            api_error_type = getattr(api_err_module, 'APIError', None) if api_err_module else None
            if api_error_type and isinstance(e, api_error_type):
                logger.error(f"APIError in /api/quiz-check: {str(e)}")
                return JSONResponse(status_code=502, content={"error": "AI service unavailable"})
            raise

        feedback = getattr(response.choices[0].message, 'content', '')
        return JSONResponse(status_code=200, content={"feedback": feedback})
    except Exception as e:
        logger.error(f"Error in /api/quiz-check: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.get("/api/test-ai")
async def test_ai():
    if not has_valid_api_key():
        return JSONResponse(status_code=200, content={"result": "GROQ_API_KEY not configured"})
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a friendly assistant."},
                {"role": "user", "content": "say hello"},
            ],
            max_tokens=50,
        )
        return JSONResponse(status_code=200, content={"result": response.choices[0].message.content})
    except Exception as e:
        logger.error(f"Error in /api/test-ai: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "AI test failed"})

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    return FileResponse(os.path.join(static_dir, "index.html"))