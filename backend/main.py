from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
import requests, json, os, uuid, time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

try:
    from passlib.context import CryptContext
except Exception:  # pragma: no cover
    CryptContext = None

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None

try:
    from sqlalchemy import create_engine, select, delete
    from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
    from sqlalchemy.types import String, Text, DateTime, Integer, JSON
except Exception:  # pragma: no cover
    create_engine = None

# ΓöÇΓöÇ LangChain imports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
from langchain_groq import ChatGroq
from langchain_ollama import OllamaLLM
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain.schema import HumanMessage, SystemMessage, AIMessage
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory

app = FastAPI(title="Promptgen AI v2")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# ΓöÇΓöÇ Auth (JWT) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
try:
    from jose import JWTError, jwt
except Exception:  # pragma: no cover
    JWTError = None
    jwt = None


def auth_enabled() -> bool:
    return os.getenv("AUTH_ENABLED", "").strip().lower() in ("1", "true", "yes", "on")


def get_jwt_secret_key() -> str:
    return os.getenv("JWT_SECRET_KEY", "").strip()


def get_jwt_algorithm() -> str:
    return os.getenv("JWT_ALGORITHM", "HS256").strip() or "HS256"


def get_access_token_exp_minutes() -> int:
    raw = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120").strip()
    try:
        v = int(raw)
        return v if v > 0 else 120
    except Exception:
        return 120


def get_admin_username() -> str:
    return os.getenv("ADMIN_USERNAME", "admin").strip() or "admin"


def get_admin_password() -> str:
    return os.getenv("ADMIN_PASSWORD", "").strip()


def _create_access_token(*, subject: str) -> str:
    if jwt is None:
        raise HTTPException(status_code=500, detail="JWT library is not installed")
    secret = get_jwt_secret_key()
    if not secret:
        raise HTTPException(status_code=500, detail="JWT_SECRET_KEY is not configured")
    expire = datetime.utcnow() + timedelta(minutes=get_access_token_exp_minutes())
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, secret, algorithm=get_jwt_algorithm())


_bearer = HTTPBearer(auto_error=False)


_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") if CryptContext is not None else None


def _hash_password(password: str) -> str:
    if _pwd_context is None:
        raise HTTPException(status_code=500, detail="Password hashing is not available (passlib not installed)")
    return _pwd_context.hash(password)


def _verify_password(plain_password: str, password_hash: str) -> bool:
    if _pwd_context is None:
        raise HTTPException(status_code=500, detail="Password hashing is not available (passlib not installed)")
    return _pwd_context.verify(plain_password, password_hash)


def require_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> dict:
    """Dependency that enforces JWT auth when AUTH_ENABLED=true."""
    if not auth_enabled():
        return {"username": "dev"}

    if JWTError is None or jwt is None:
        raise HTTPException(status_code=500, detail="AUTH_ENABLED=true but python-jose is not installed")

    token = creds.credentials if creds else ""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, get_jwt_secret_key(), algorithms=[get_jwt_algorithm()])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")

        # If DB is enabled, require the user to exist.
        if _db_enabled():
            if _SessionLocal is None:
                raise HTTPException(status_code=500, detail="Database not initialized")
            with _SessionLocal() as session:
                user = session.execute(select(User).where(User.username == username)).scalar_one_or_none()
                if user is None:
                    raise HTTPException(status_code=401, detail="User not found")

        return {"username": username, "token_payload": payload}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ΓöÇΓöÇ Config ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env (project root or backend folder)
if load_dotenv is not None:
    for env_file in (BASE_DIR / ".env", Path(__file__).resolve().parent / ".env"):
        if env_file.exists():
            load_dotenv(env_file, override=False)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "phi3"


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "").strip()


def get_groq_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def _db_enabled() -> bool:
    return bool(get_database_url())


_engine = None
_SessionLocal = None


class Base(DeclarativeBase):
    pass


class LibraryItem(Base):
    __tablename__ = "library_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    prompt: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(64), default="general")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow)
    uses: Mapped[int] = mapped_column(Integer, default=0)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), default=datetime.utcnow)
    is_active: Mapped[int] = mapped_column(Integer, default=1)


def _init_db():
    global _engine, _SessionLocal
    if not _db_enabled():
        return
    if create_engine is None:
        raise RuntimeError("DATABASE_URL is set but SQLAlchemy is not installed")

    database_url = get_database_url()
    _engine = create_engine(database_url, pool_pre_ping=True)
    _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(_engine)


def _ensure_default_admin_user() -> None:
    """Create an initial admin user in DB mode (if missing).

    Uses ADMIN_USERNAME/ADMIN_PASSWORD from environment.
    """
    if not _db_enabled() or _SessionLocal is None:
        return
    username = get_admin_username()
    password = get_admin_password()
    if not username or not password:
        return
    with _SessionLocal() as session:
        existing = session.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if existing is not None:
            return
        user = User(
            username=username,
            password_hash=_hash_password(password),
            created_at=datetime.utcnow(),
            is_active=1,
        )
        session.add(user)
        session.commit()


@app.on_event("startup")
def _startup():
    _init_db()
    if auth_enabled():
        if not get_jwt_secret_key():
            raise RuntimeError("AUTH_ENABLED=true but JWT_SECRET_KEY is missing")

        # DB-backed auth: require hashing deps and seed default admin (recommended)
        if _db_enabled():
            if _pwd_context is None:
                raise RuntimeError("AUTH_ENABLED=true and DATABASE_URL is set, but passlib[bcrypt] is not installed")
            if not get_admin_password():
                raise RuntimeError("AUTH_ENABLED=true and DATABASE_URL is set, but ADMIN_PASSWORD is missing (needed to seed an admin user)")
            _ensure_default_admin_user()

        # File-mode auth: fall back to a single admin account in .env
        else:
            if not get_admin_password():
                raise RuntimeError("AUTH_ENABLED=true but ADMIN_PASSWORD is missing (required when DATABASE_URL is not set)")
DATA_DIR      = BASE_DIR / "data"
PROMPTS_DIR   = DATA_DIR / "prompts"
TEMPLATES_DIR = DATA_DIR / "templates"
LIBRARY_DIR   = DATA_DIR / "library"
for d in [PROMPTS_DIR, TEMPLATES_DIR, LIBRARY_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ΓöÇΓöÇ LangChain LLM factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
def get_llm(prefer_groq: bool = True):
    """Return Groq (cloud, free, fast) or fall back to Ollama (local)."""
    groq_api_key = get_groq_api_key()
    if prefer_groq and groq_api_key:
        return ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
        )
    # Fallback: local Ollama phi3
    return OllamaLLM(model=OLLAMA_MODEL, temperature=0.7, num_predict=800)

# ΓöÇΓöÇ Groq direct call (for structured JSON responses) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
def call_groq(system: str, user: str, max_tokens: int = 1000) -> str:
    groq_api_key = get_groq_api_key()
    if groq_api_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user}
                ],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq error: {e}, falling back to Ollama")
    return call_ollama(system, user, max_tokens)

def call_ollama(system_prompt: str, user_message: str, max_tokens: int = 800) -> str:
    full_prompt = f"System: {system_prompt}\n\nUser: {user_message}\n\nAssistant:"
    try:
        r = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": full_prompt,
            "stream": False,
            "options": {"num_predict": max_tokens, "temperature": 0.7, "num_ctx": 1024}
        }, timeout=300)
        r.raise_for_status()
        return r.json().get("response", "").strip()
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="No AI available. Add GROQ_API_KEY or start Ollama.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
#  SESSION STORE ΓÇö holds multi-turn conversation state in memory
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
sessions: dict = {}  # session_id -> { stage, history, intent, answers, original_prompt }

def new_session(prompt: str) -> str:
    sid = str(uuid.uuid4())[:12]
    sessions[sid] = {
        "stage": "intent",
        "original_prompt": prompt,
        "history": [],           # list of {role, content}
        "intent": {},
        "clarification_questions": [],
        "clarification_index": 0,
        "answers": {},
        "optimized_prompt": "",
        "assessment": {},
        "final_output": "",
    }
    return sid

# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
#  PYDANTIC MODELS
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
class StartRequest(BaseModel):
    prompt: str
    use_groq: Optional[bool] = True

class ReplyRequest(BaseModel):
    session_id: str
    message: str

class SavePromptRequest(BaseModel):
    title: str
    prompt: str
    category: Optional[str] = "general"
    tags: Optional[List[str]] = []

class TemplateRequest(BaseModel):
    name: str
    template: str
    variables: List[str]
    category: Optional[str] = "general"

class VersionControlRequest(BaseModel):
    prompt_id: str
    prompt: str
    label: Optional[str] = ""

class TestPromptRequest(BaseModel):
    prompt: str
    iterations: Optional[int] = 1

class WorkflowRequest(BaseModel):
    steps: List[dict]

class PromptRequest(BaseModel):
    prompt: str

class ClarificationRequest(BaseModel):
    original_prompt: str
    answers: dict


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str

# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
#  CORE PIPELINE ΓÇö INTERACTIVE CONVERSATION
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

@app.post("/api/chat/start")
def chat_start(req: StartRequest, _user: dict = Depends(require_user)):
    """
    Step 1: User submits initial prompt.
    AI analyses intent and returns the first conversational question.
    """
    sid = new_session(req.prompt)
    s   = sessions[sid]

    # ΓöÇΓöÇ Intent detection via LangChain ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    intent_system = """You are an expert AI intent analyser. Given a user's vague prompt, identify:
1. primary_intent: one of creative_writing|coding|analysis|research|marketing|education|business|general
2. tone: formal|casual|technical|creative
3. domain: specific area (e.g. web development, blogging, data science)
4. complexity: simple|medium|complex
5. missing_info: list of 3-4 specific things that are unclear or missing
6. confidence: 0.0-1.0

Return ONLY valid JSON. No markdown, no explanation."""

    raw = call_groq(intent_system, f"Analyse this prompt: {req.prompt}", max_tokens=400)
    try:
        start = raw.find("{"); end = raw.rfind("}") + 1
        intent = json.loads(raw[start:end])
    except:
        intent = {"primary_intent":"general","tone":"casual","domain":"general",
                  "complexity":"medium","missing_info":["context","audience","purpose","format"],"confidence":0.7}
    s["intent"] = intent

    # ΓöÇΓöÇ Generate clarification questions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    clarify_system = """You are a helpful AI assistant conducting a friendly intake conversation.
Based on the user's prompt and detected intent, generate exactly 3 targeted clarification questions.
These questions should naturally fill the missing information gaps.
Return ONLY a JSON array:
[{"id":1,"question":"...","why":"brief reason this matters","type":"text|select","options":["opt1","opt2"] or null}]
Make questions conversational, not robotic."""

    raw2 = call_groq(clarify_system,
        f"Prompt: {req.prompt}\nIntent: {json.dumps(intent)}\nGenerate 3 clarification questions.", 600)
    try:
        start = raw2.find("["); end = raw2.rfind("]") + 1
        questions = json.loads(raw2[start:end])
    except:
        questions = [
            {"id":1,"question":"Who is the target audience for this?","why":"Helps tailor the tone and complexity","type":"text","options":None},
            {"id":2,"question":"What format would you like the output in?","why":"Determines structure","type":"select","options":["Paragraph","Bullet points","Step-by-step","Mixed"]},
            {"id":3,"question":"Any specific requirements or constraints I should know about?","why":"Avoids irrelevant content","type":"text","options":None},
        ]
    s["clarification_questions"] = questions
    s["clarification_index"] = 0
    s["stage"] = "clarifying"

    # ΓöÇΓöÇ Build first AI message ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    first_q = questions[0]
    ai_msg = (
        f"Got it! I can see you want help with **{intent.get('primary_intent','this')}** "
        f"in the **{intent.get('domain','general')}** space.\n\n"
        f"Let me ask you a few quick questions to make sure I create the perfect prompt for you.\n\n"
        f"**Question 1 of {len(questions)}:** {first_q['question']}"
        + (f"\n\n*Options: {' ┬╖ '.join(first_q['options'])}*" if first_q.get('options') else "")
    )

    s["history"].append({"role":"user",    "content": req.prompt})
    s["history"].append({"role":"assistant","content": ai_msg})

    return {
        "session_id": sid,
        "stage": "clarifying",
        "question_num": 1,
        "total_questions": len(questions),
        "ai_message": ai_msg,
        "intent": intent,
        "history": s["history"],
    }


@app.post("/api/chat/reply")
def chat_reply(req: ReplyRequest, _user: dict = Depends(require_user)):
    """
    User sends an answer. AI either asks the next question,
    or moves to optimization + assessment + output.
    """
    if req.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found. Please start again.")
    s = sessions[req.session_id]

    # Store answer
    questions = s["clarification_questions"]
    idx       = s["clarification_index"]
    if idx < len(questions):
        s["answers"][questions[idx]["question"]] = req.message
    s["history"].append({"role":"user","content": req.message})
    s["clarification_index"] += 1
    idx = s["clarification_index"]

    # ΓöÇΓöÇ More questions? ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    if idx < len(questions):
        next_q = questions[idx]
        ai_msg = (
            f"Perfect, thanks!\n\n"
            f"**Question {idx+1} of {len(questions)}:** {next_q['question']}"
            + (f"\n\n*Options: {' ┬╖ '.join(next_q['options'])}*" if next_q.get('options') else "")
        )
        s["history"].append({"role":"assistant","content": ai_msg})
        return {
            "session_id": req.session_id,
            "stage": "clarifying",
            "question_num": idx + 1,
            "total_questions": len(questions),
            "ai_message": ai_msg,
            "history": s["history"],
        }

    # ΓöÇΓöÇ All answers collected ΓåÆ run optimization pipeline ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    s["stage"] = "optimizing"

    answers_text = "\n".join([f"- {q}: {a}" for q, a in s["answers"].items()])

    # STAGE 4: Optimize using LangChain
    optimize_template = PromptTemplate(
        input_variables=["original_prompt", "intent", "answers"],
        template="""You are an expert prompt engineer. Your job is to rewrite the user's vague prompt 
into a highly optimised, professional AI prompt.

Original prompt: {original_prompt}
Detected intent: {intent}
User's clarification answers:
{answers}

Rewrite the prompt to be:
- Specific and detailed
- Properly scoped with full context
- Structured for maximum AI comprehension
- Include the tone, audience, format, and constraints gathered

Return ONLY valid JSON:
{{"optimized_prompt":"...","improvements":["...","...","..."],"score_before":1-10,"score_after":1-10}}"""
    )

    try:
        llm = get_llm()
        if get_groq_api_key():
            chain = optimize_template | llm
            raw_opt = chain.invoke({
                "original_prompt": s["original_prompt"],
                "intent": json.dumps(s["intent"]),
                "answers": answers_text,
            })
            raw_opt = raw_opt.content if hasattr(raw_opt, 'content') else str(raw_opt)
        else:
            raw_opt = call_ollama(
                "You are an expert prompt engineer. Return only valid JSON.",
                optimize_template.format(
                    original_prompt=s["original_prompt"],
                    intent=json.dumps(s["intent"]),
                    answers=answers_text
                ), 800
            )
        start = raw_opt.find("{"); end = raw_opt.rfind("}") + 1
        opt_data = json.loads(raw_opt[start:end])
    except Exception as e:
        opt_data = {
            "optimized_prompt": f"Create a detailed {s['intent'].get('primary_intent','response')} about {s['original_prompt']}. Context: {answers_text}",
            "improvements": ["Added audience context","Defined output format","Specified constraints"],
            "score_before": 3, "score_after": 8
        }
    s["optimized_prompt"] = opt_data.get("optimized_prompt", s["original_prompt"])

    # STAGE 5: Quality Assessment using LangChain
    assess_system = """You are a prompt quality assessor. Evaluate the prompt across 5 dimensions.
Return ONLY valid JSON:
{"overall_score":1-10,"clarity":1-10,"specificity":1-10,"context":1-10,"actionability":1-10,
"completeness":1-10,"feedback":"brief feedback","strengths":["..."],"weaknesses":["..."],"grade":"A|B|C|D|F"}"""

    try:
        raw_assess = call_groq(assess_system, f"Assess: {s['optimized_prompt']}", 500)
        start = raw_assess.find("{"); end = raw_assess.rfind("}") + 1
        assessment = json.loads(raw_assess[start:end])
    except:
        assessment = {"overall_score":8,"clarity":8,"specificity":8,"context":7,
                      "actionability":8,"completeness":7,"feedback":"Well structured prompt.",
                      "strengths":["Clear intent","Good context"],"weaknesses":["Minor gaps"],"grade":"B"}
    s["assessment"] = assessment

    # STAGE 6: The final output IS the optimized prompt ΓÇö that's the product!
    # Optionally also generate usage tips using call_groq (not langchain client, avoids proxies bug)
    try:
        tips_system = """You are a prompt engineering expert. Given an optimized prompt, provide:
1. 3 short tips on how to use this prompt effectively
2. 2 suggested variations/extensions

Return ONLY valid JSON:
{"usage_tips": ["tip1","tip2","tip3"], "variations": ["variation1","variation2"]}"""
        raw_tips = call_groq(tips_system, f"Prompt: {s['optimized_prompt']}", 400)
        start_t = raw_tips.find("{"); end_t = raw_tips.rfind("}") + 1
        tips_data = json.loads(raw_tips[start_t:end_t])
        usage_tips = tips_data.get("usage_tips", [])
        variations = tips_data.get("variations", [])
    except Exception as e:
        print(f"Tips generation error (non-critical): {e}")
        usage_tips = ["Copy the optimized prompt and paste into any AI tool", "You can adjust the tone or format as needed", "Use this as a starting point and refine further"]
        variations = ["Add more specific constraints for better results", "Specify an output format like table or numbered list"]

    final_output = s["optimized_prompt"]
    s["final_output"] = final_output
    s["usage_tips"]   = usage_tips
    s["variations"]   = variations
    s["stage"]        = "complete"

    # Build final AI message
    grade        = assessment.get("grade","B")
    score        = assessment.get("overall_score",8)
    improvements = opt_data.get("improvements",[])
    before       = opt_data.get("score_before",3)
    after       = opt_data.get("score_after",8)

    tips_text = "\n".join([f"ΓÇó {t}" for t in usage_tips])
    vars_text  = "\n".join([f"ΓÇó {v}" for v in variations])

    ai_msg = (
        f"Γ£à **Pipeline Complete!**\n\n"
        f"**≡ƒôè Quality Score: {before}/10 ΓåÆ {after}/10 (Grade {grade})**\n"
        f"{assessment.get('feedback','')}\n\n"
        f"**Γ£¿ Improvements Made:**\n"
        + "\n".join([f"ΓÇó {i}" for i in improvements]) +
        f"\n\n---\n\n"
        f"**≡ƒÄ» YOUR OPTIMIZED PROMPT (copy & use this):**\n\n"
        f"{s['optimized_prompt']}\n\n"
        f"---\n\n"
        f"**≡ƒÆí How to use this prompt:**\n{tips_text}\n\n"
        f"**≡ƒöÇ Suggested variations:**\n{vars_text}"
    )
    s["history"].append({"role":"assistant","content": ai_msg})

    return {
        "session_id":       req.session_id,
        "stage":            "complete",
        "ai_message":       ai_msg,
        "optimized_prompt": s["optimized_prompt"],
        "assessment":       assessment,
        "optimization":     opt_data,
        "final_output":     final_output,
        "usage_tips":       usage_tips,
        "variations":       variations,
        "history":          s["history"],
    }


@app.get("/api/chat/session/{session_id}")
def get_session(session_id: str, _user: dict = Depends(require_user)):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]

# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
#  REMAINING FEATURES (Library, Templates, Versions, Test, etc.)
# ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

# ΓöÇΓöÇ Library ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.get("/api/library")
def get_library():
    if _db_enabled():
        if _SessionLocal is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        with _SessionLocal() as session:
            rows = session.execute(select(LibraryItem)).scalars().all()
            prompts = [
                {
                    "id": r.id,
                    "title": r.title,
                    "prompt": r.prompt,
                    "category": r.category,
                    "tags": r.tags or [],
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                    "uses": r.uses,
                }
                for r in rows
            ]
        return {"prompts": sorted(prompts, key=lambda x: x.get("created_at", ""), reverse=True)}

    prompts = []
    for f in LIBRARY_DIR.glob("*.json"):
        try:
            prompts.append(json.loads(f.read_text()))
        except:
            pass
    return {"prompts": sorted(prompts, key=lambda x: x.get("created_at", ""), reverse=True)}

@app.post("/api/library/save")
def save_to_library(req: SavePromptRequest, _user: dict = Depends(require_user)):
    pid = uuid.uuid4().hex[:8]
    now = datetime.now()
    if _db_enabled():
        if _SessionLocal is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        item = LibraryItem(
            id=pid,
            title=req.title,
            prompt=req.prompt,
            category=req.category or "general",
            tags=req.tags or [],
            created_at=now,
            uses=0,
        )
        with _SessionLocal() as session:
            session.add(item)
            session.commit()
        return {"status": "saved", "id": pid}

    data = {
        "id": pid,
        "title": req.title,
        "prompt": req.prompt,
        "category": req.category,
        "tags": req.tags,
        "created_at": now.isoformat(),
        "uses": 0,
    }
    (LIBRARY_DIR / f"{pid}.json").write_text(json.dumps(data, indent=2))
    return {"status": "saved", "id": pid}

@app.delete("/api/library/{prompt_id}")
def delete_from_library(prompt_id: str, _user: dict = Depends(require_user)):
    if _db_enabled():
        if _SessionLocal is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        with _SessionLocal() as session:
            res = session.execute(delete(LibraryItem).where(LibraryItem.id == prompt_id))
            session.commit()
            if res.rowcount and res.rowcount > 0:
                return {"status": "deleted"}
        raise HTTPException(status_code=404, detail="Not found")

    f = LIBRARY_DIR / f"{prompt_id}.json"
    if f.exists():
        f.unlink()
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Not found")

# ΓöÇΓöÇ Templates ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
BUILTIN_TEMPLATES = [
    {"id":"t1","name":"Blog Post","category":"writing","template":"Write a {tone} blog post about {topic} for {audience}. Include {sections} sections, approximately {length} words.","variables":["tone","topic","audience","sections","length"]},
    {"id":"t2","name":"Code Review","category":"coding","template":"Review this {language} code for {focus}. Provide {detail_level} feedback:\n\n{code}","variables":["language","focus","detail_level","code"]},
    {"id":"t3","name":"Email Draft","category":"business","template":"Write a {tone} email to {recipient} about {subject}. Purpose: {purpose}. Include: {call_to_action}.","variables":["tone","recipient","subject","purpose","call_to_action"]},
    {"id":"t4","name":"Research Summary","category":"research","template":"Summarise research on {topic} covering {aspects}. Audience: {audience}. Provide {num_points} key findings.","variables":["topic","aspects","audience","num_points"]},
    {"id":"t5","name":"Product Description","category":"marketing","template":"Write a {length} product description for {product_name}. Highlight {features}. Target {audience}, tone: {tone}.","variables":["length","product_name","features","audience","tone"]},
    {"id":"t6","name":"Study Plan","category":"education","template":"Create a {duration} study plan for {subject}. Learner level: {level}. Available: {hours_per_week} hrs/week.","variables":["duration","subject","level","hours_per_week"]},
]

@app.get("/api/templates")
def get_templates():
    custom = []
    for f in TEMPLATES_DIR.glob("*.json"):
        try: custom.append(json.loads(f.read_text()))
        except: pass
    return {"templates": BUILTIN_TEMPLATES + custom}

@app.post("/api/templates")
def create_template(req: TemplateRequest, _user: dict = Depends(require_user)):
    tid  = "custom_" + str(uuid.uuid4())[:8]
    data = {"id":tid,"name":req.name,"template":req.template,"variables":req.variables,"category":req.category,"custom":True}
    (TEMPLATES_DIR / f"{tid}.json").write_text(json.dumps(data, indent=2))
    return {"status":"created","template":data}

# ΓöÇΓöÇ Versions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.get("/api/versions/{prompt_id}")
def get_versions(prompt_id: str):
    versions = []
    for f in PROMPTS_DIR.glob(f"{prompt_id}_v*.json"):
        try: versions.append(json.loads(f.read_text()))
        except: pass
    return {"versions": sorted(versions, key=lambda x: x.get("version",0))}

@app.post("/api/versions/save")
def save_version(req: VersionControlRequest, _user: dict = Depends(require_user)):
    existing    = list(PROMPTS_DIR.glob(f"{req.prompt_id}_v*.json"))
    version_num = len(existing) + 1
    data = {"prompt_id":req.prompt_id,"version":version_num,"prompt":req.prompt,
            "label":req.label,"saved_at":datetime.now().isoformat()}
    (PROMPTS_DIR / f"{req.prompt_id}_v{version_num}.json").write_text(json.dumps(data, indent=2))
    return {"status":"saved","version":version_num}

# ΓöÇΓöÇ Test Lab ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.post("/api/test")
def test_prompt(req: TestPromptRequest, _user: dict = Depends(require_user)):
    results = []
    for i in range(min(req.iterations, 3)):
        start = time.time()
        output  = call_groq("You are a helpful assistant. Respond concisely.", req.prompt, 400)
        elapsed = round(time.time() - start, 2)
        results.append({"iteration":i+1,"output":output,"time_seconds":elapsed,"word_count":len(output.split())})
    avg_time = round(sum(r["time_seconds"] for r in results) / len(results), 2)
    return {"status":"success","results":results,"avg_time":avg_time}

# ΓöÇΓöÇ Analytics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.get("/api/analytics")
def get_analytics(_user: dict = Depends(require_user)):
    if _db_enabled():
        if _SessionLocal is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        with _SessionLocal() as session:
            total_prompts = session.execute(select(LibraryItem.id)).all()
        total_prompts = len(total_prompts)
    else:
        total_prompts = len(list(LIBRARY_DIR.glob("*.json")))
    total_versions  = len(list(PROMPTS_DIR.glob("*.json")))
    total_templates = len(list(TEMPLATES_DIR.glob("*.json"))) + len(BUILTIN_TEMPLATES)
    categories = {}
    if _db_enabled():
        if _SessionLocal is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        with _SessionLocal() as session:
            rows = session.execute(select(LibraryItem.category)).all()
        for (cat,) in rows:
            cat = cat or "general"
            categories[cat] = categories.get(cat, 0) + 1
    else:
        for f in LIBRARY_DIR.glob("*.json"):
            try:
                d = json.loads(f.read_text())
                cat = d.get("category", "general")
                categories[cat] = categories.get(cat, 0) + 1
            except:
                pass
    return {"total_prompts_saved":total_prompts,"total_versions":total_versions,
            "total_templates":total_templates,"prompts_by_category":categories,
            "model_used":"Llama-3.3-70b (Groq)" if get_groq_api_key() else "phi3 (Ollama)",
            "langchain":"enabled","platform":"Promptgen AI v2"}

# ΓöÇΓöÇ Prompt of the Day ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
DAILY_PROMPTS = [
    "Write a detailed explanation of how neural networks learn, using an analogy a 10-year-old would understand.",
    "Create a comprehensive marketing strategy for a local bakery wanting to expand online.",
    "Design a 30-day fitness plan for someone who has never exercised before.",
    "Explain compound interest with real-world examples and calculations.",
    "Write a short story about an AI discovering what creativity means.",
    "Create a beginner's guide to meditation with practical daily exercises.",
    "Analyse the pros and cons of remote work for employees and employers.",
]

@app.get("/api/prompt-of-day")
def prompt_of_day():
    idx = datetime.now().timetuple().tm_yday % len(DAILY_PROMPTS)
    return {"prompt": DAILY_PROMPTS[idx], "date": datetime.now().strftime("%B %d, %Y")}

# ΓöÇΓöÇ Gallery ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
GALLERY_PROMPTS = [
    {"id":"g1","title":"Tech Blog Writer","prompt":"Write a comprehensive blog post about {topic} for developers. Include code examples, best practices, and real-world applications.","category":"writing","rating":4.8,"uses":234},
    {"id":"g2","title":"Bug Fixer","prompt":"Analyse this {language} code. Identify bugs, security issues, and performance problems. Provide corrected code with explanations.","category":"coding","rating":4.9,"uses":512},
    {"id":"g3","title":"Business Analyst","prompt":"Conduct a SWOT analysis for {company}. Provide actionable insights and recommend a 12-month strategic direction.","category":"business","rating":4.7,"uses":189},
    {"id":"g4","title":"Lesson Planner","prompt":"Create a lesson plan for teaching {subject} to {grade_level} students. Include objectives, activities, assessments, and differentiation.","category":"education","rating":4.6,"uses":143},
    {"id":"g5","title":"Content Calendar","prompt":"Build a 30-day social media calendar for {brand} targeting {audience}. Include post ideas, hashtags, and optimal posting times.","category":"marketing","rating":4.8,"uses":367},
    {"id":"g6","title":"Research Paper","prompt":"Write a structured academic paper on {topic} with abstract, introduction, literature review, methodology, findings, and conclusion.","category":"research","rating":4.5,"uses":98},
]

@app.get("/api/gallery")
def get_gallery():
    return {"gallery": GALLERY_PROMPTS}

# ΓöÇΓöÇ Doctor ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.post("/api/doctor")
def prompt_doctor(req: PromptRequest, _user: dict = Depends(require_user)):
    system = """You are the AI Prompt Doctor. Diagnose and prescribe improvements.
Return ONLY valid JSON:
{"diagnosis":"...","issues":[{"problem":"...","severity":"high|medium|low","fix":"..."}],
"prescription":"improved prompt here","health_score":1-100,"recovery_tips":["...","..."]}"""
    raw = call_groq(system, f"Diagnose: {req.prompt}", 800)
    try:
        start = raw.find("{"); end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
        return {"status":"success", **data}
    except:
        return {"status":"success","diagnosis":"Prompt needs more specificity",
                "issues":[{"problem":"Vague intent","severity":"high","fix":"Add specific goals"}],
                "prescription":f"[Improved] {req.prompt}","health_score":55,
                "recovery_tips":["Add context","Define audience"]}

# ΓöÇΓöÇ Workflow ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.post("/api/workflow")
def run_workflow(req: WorkflowRequest, _user: dict = Depends(require_user)):
    results = []
    context = {}
    for step in req.steps:
        step_type   = step.get("type")
        step_prompt = step.get("prompt","")
        try: step_prompt = step_prompt.format(**context)
        except: pass
        if step_type in ("generate","optimize","assess"):
            output = call_groq("You are a helpful assistant.", step_prompt, 600)
            context["last_output"] = output
            results.append({"step":step.get("name","Step"),"type":step_type,"output":output})
    return {"status":"success","workflow_results":results}

# ΓöÇΓöÇ Config endpoint ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
@app.get("/api/config")
def get_config():
    groq_configured = bool(get_groq_api_key())
    db_configured = _db_enabled()
    return {
        "groq_configured": groq_configured,
        "model": "llama-3.3-70b-versatile" if groq_configured else "phi3",
        "provider": "Groq (Cloud)" if groq_configured else "Ollama (Local)",
        "langchain": "enabled",
        "database_configured": db_configured,
        "library_storage": "PostgreSQL" if db_configured else "Files",
        "auth_enabled": auth_enabled(),
    }


@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    if not auth_enabled():
        raise HTTPException(status_code=405, detail="Authentication is disabled")

    # DB-backed users (recommended)
    if _db_enabled():
        if _SessionLocal is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        with _SessionLocal() as session:
            user = session.execute(select(User).where(User.username == req.username)).scalar_one_or_none()
            if user is None or not int(getattr(user, "is_active", 1)):
                raise HTTPException(status_code=401, detail="Invalid username or password")
            if not _verify_password(req.password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid username or password")
        token = _create_access_token(subject=req.username)

    # Fallback: single admin account from .env (when DB disabled)
    else:
        if req.username != get_admin_username() or req.password != get_admin_password():
            raise HTTPException(status_code=401, detail="Invalid username or password")
        token = _create_access_token(subject=req.username)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": get_access_token_exp_minutes() * 60,
    }


@app.post("/api/auth/register")
def auth_register(req: RegisterRequest):
    """Create a new user (DB mode only)."""
    if not auth_enabled():
        raise HTTPException(status_code=405, detail="Authentication is disabled")
    if not _db_enabled():
        raise HTTPException(status_code=400, detail="User registration requires DATABASE_URL")
    if _SessionLocal is None:
        raise HTTPException(status_code=500, detail="Database not initialized")

    username = (req.username or "").strip()
    password = req.password or ""
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    with _SessionLocal() as session:
        existing = session.execute(select(User).where(User.username == username)).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(status_code=409, detail="Username already exists")

        user = User(username=username, password_hash=_hash_password(password), created_at=datetime.utcnow(), is_active=1)
        session.add(user)
        session.commit()

    return {"status": "registered", "username": username}


@app.get("/api/auth/me")
def auth_me(user: dict = Depends(require_user)):
    return {"username": user.get("username")}

@app.post("/api/config/groq")
def set_groq_key(data: dict):
    raise HTTPException(
        status_code=405,
        detail="Groq API key can no longer be set via the UI. Create a .env file and set GROQ_API_KEY, then restart the backend.",
    )

# ΓöÇΓöÇ Static frontend ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
FRONTEND_DIR = BASE_DIR / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
