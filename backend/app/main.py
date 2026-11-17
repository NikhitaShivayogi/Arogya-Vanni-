import base64
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import BytesIO
from typing import AsyncIterator
from uuid import uuid4

from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pymongo.errors import DuplicateKeyError, PyMongoError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from PIL import Image, ImageStat, UnidentifiedImageError

from app.config import settings
from app.database import check_database, conversations, document_analyses, ensure_indexes, users
from app.medical_safety import emergency_reply, emergency_screen
from app.openai_service import (
    answer_document_question,
    explain_document,
    generate_reply,
    synthesize_speech,
    transcribe_audio,
)
from app.schemas import (
    ChatRequest,
    Credentials,
    DocumentQuestionRequest,
    Preferences,
    RenameRequest,
    SaveConversationRequest,
    SaveDocumentAnalysisRequest,
    SignupRequest,
    SpeechRequest,
)
from app.security import COOKIE_NAME, create_session_token, decode_session_token, hash_password, verify_password

limiter = Limiter(key_func=get_remote_address, default_limits=["120/hour"])


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if settings.environment.lower() == "production":
        if len(settings.jwt_secret) < 32 or settings.jwt_secret == "development-only-change-me":
            raise RuntimeError("Production requires a strong JWT_SECRET of at least 32 characters.")
        if not settings.cookie_secure:
            raise RuntimeError("Production requires COOKIE_SECURE=true.")
        if not settings.frontend_origins or "*" in settings.frontend_origins:
            raise RuntimeError("Production requires explicit FRONTEND_ORIGINS.")
    ensure_indexes()
    yield


app = FastAPI(title="Arogya Vanni API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(PyMongoError)
async def database_error_handler(_request: Request, _exc: PyMongoError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": "Database is temporarily unavailable."})


def public_user(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "full_name": document["full_name"],
        "email": document["email"],
        "language": document.get("language", "en"),
        "response_mode": document.get("response_mode", "text"),
        "voice": document.get("voice", "alloy"),
        "save_history": document.get("save_history", True),
        "autoplay": document.get("autoplay", True),
    }


def authenticated_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    user_id = decode_session_token(token) if token else None
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    try:
        user = users.find_one({"_id": ObjectId(user_id)})
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail="Database is temporarily unavailable.") from exc
    if not user:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return user


def set_session_cookie(response: Response, user_id: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(user_id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=settings.session_hours * 3600,
        path="/",
    )


def require_openai() -> None:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="AI features need an OpenAI API key. Configure OPENAI_API_KEY in the project root .env.")


def conversation_or_404(conversation_id: str, user_id: ObjectId) -> dict:
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found.")
    record = conversations.find_one({"_id": ObjectId(conversation_id), "user_id": user_id})
    if not record:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return record


@app.get("/api/health")
def health() -> dict:
    connected = check_database()
    return {"status": "ok" if connected else "degraded", "database": "connected" if connected else "unavailable"}


@app.post("/api/auth/signup")
@limiter.limit("5/minute")
def signup(request: Request, payload: SignupRequest, response: Response) -> dict:
    if not payload.accepted_privacy or not payload.accepted_disclaimer:
        raise HTTPException(status_code=400, detail="Accept the privacy notice and medical disclaimer to create an account.")
    if not check_database():
        raise HTTPException(status_code=503, detail="Database is temporarily unavailable.")
    document = {
        "full_name": payload.full_name,
        "email": str(payload.email).lower(),
        "password_hash": hash_password(payload.password),
        "language": payload.language,
        "response_mode": "text",
        "voice": "alloy",
        "save_history": True,
        "autoplay": True,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        inserted = users.insert_one(document)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc
    document["_id"] = inserted.inserted_id
    set_session_cookie(response, str(inserted.inserted_id))
    return {"user": public_user(document)}


@app.post("/api/auth/login")
@limiter.limit("8/minute")
def login(request: Request, payload: Credentials, response: Response) -> dict:
    if not check_database():
        raise HTTPException(status_code=503, detail="Database is temporarily unavailable.")
    user = users.find_one({"email": str(payload.email).lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    set_session_cookie(response, str(user["_id"]))
    return {"user": public_user(user)}


@app.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(COOKIE_NAME, httponly=True, secure=settings.cookie_secure, samesite="strict", path="/")
    return {"message": "Signed out."}


@app.get("/api/auth/me")
def me(user: dict = Depends(authenticated_user)) -> dict:
    return {"user": public_user(user)}


@app.delete("/api/auth/account")
def delete_account(user: dict = Depends(authenticated_user)) -> dict:
    conversations.delete_many({"user_id": user["_id"]})
    document_analyses.delete_many({"user_id": user["_id"]})
    users.delete_one({"_id": user["_id"]})
    return {"message": "Account and associated saved data deleted."}


@app.put("/api/preferences")
def update_preferences(payload: Preferences, user: dict = Depends(authenticated_user)) -> dict:
    users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "language": payload.language,
            "response_mode": payload.response_mode,
            "voice": payload.voice,
            "save_history": payload.save_history,
            "autoplay": payload.autoplay,
        }},
    )
    return {
        "language": payload.language,
        "response_mode": payload.response_mode,
        "voice": payload.voice,
        "save_history": payload.save_history,
        "autoplay": payload.autoplay,
    }


@app.get("/api/conversations")
def list_conversations(user: dict = Depends(authenticated_user)) -> dict:
    rows = conversations.find({"user_id": user["_id"]}, {"messages": 0}).sort("updated_at", -1).limit(100)
    return {"conversations": [
        {
            "id": str(row["_id"]),
            "title": row["title"],
            "created_at": row.get("created_at", row["updated_at"]).isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }
        for row in rows
    ]}


@app.post("/api/conversations")
def create_conversation(user: dict = Depends(authenticated_user)) -> dict:
    if not user.get("save_history", True):
        raise HTTPException(status_code=400, detail="Conversation history is disabled in your preferences.")
    now = datetime.now(timezone.utc)
    result = conversations.insert_one({
        "user_id": user["_id"],
        "title": "Health conversation",
        "messages": [],
        "created_at": now,
        "updated_at": now,
    })
    return {"id": str(result.inserted_id), "title": "Health conversation", "created_at": now.isoformat()}


@app.post("/api/conversations/save")
def save_conversation(payload: SaveConversationRequest, user: dict = Depends(authenticated_user)) -> dict:
    now = datetime.now(timezone.utc)
    messages = [message.model_dump(exclude_none=True) for message in payload.messages]
    saved = conversations.insert_one({
        "user_id": user["_id"],
        "title": payload.title,
        "messages": messages[-100:],
        "created_at": now,
        "updated_at": now,
    })
    return {
        "id": str(saved.inserted_id),
        "title": payload.title,
        "created_at": now.isoformat(),
    }


@app.get("/api/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user: dict = Depends(authenticated_user)) -> dict:
    row = conversation_or_404(conversation_id, user["_id"])
    return {
        "id": str(row["_id"]),
        "title": row["title"],
        "created_at": row.get("created_at", row["updated_at"]).isoformat(),
        "messages": row["messages"],
    }


@app.put("/api/conversations/{conversation_id}")
def rename_conversation(conversation_id: str, payload: RenameRequest, user: dict = Depends(authenticated_user)) -> dict:
    conversation_or_404(conversation_id, user["_id"])
    conversations.update_one(
        {"_id": ObjectId(conversation_id), "user_id": user["_id"]},
        {"$set": {"title": payload.title.strip(), "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Conversation renamed."}


@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: str, user: dict = Depends(authenticated_user)) -> dict:
    conversation_or_404(conversation_id, user["_id"])
    conversations.delete_one({"_id": ObjectId(conversation_id), "user_id": user["_id"]})
    return {"message": "Conversation deleted."}


@app.delete("/api/conversations")
def delete_all_conversations(user: dict = Depends(authenticated_user)) -> dict:
    conversations.delete_many({"user_id": user["_id"]})
    return {"message": "Saved conversation history deleted."}


def document_analysis_or_404(analysis_id: str, user_id: ObjectId) -> dict:
    if not ObjectId.is_valid(analysis_id):
        raise HTTPException(status_code=404, detail="Document analysis not found.")
    record = document_analyses.find_one({"_id": ObjectId(analysis_id), "user_id": user_id})
    if not record:
        raise HTTPException(status_code=404, detail="Document analysis not found.")
    return record


@app.get("/api/document-analyses")
def list_document_analyses(user: dict = Depends(authenticated_user)) -> dict:
    rows = document_analyses.find({"user_id": user["_id"]}).sort("created_at", -1).limit(100)
    return {"analyses": [
        {
            "id": str(row["_id"]),
            "title": row["title"],
            "document_type": row["document_type"],
            "language": row["language"],
            "result": row["result"],
            "created_at": row["created_at"].isoformat(),
        }
        for row in rows
    ]}


@app.put("/api/document-analyses/{analysis_id}")
def rename_document_analysis(
    analysis_id: str,
    payload: RenameRequest,
    user: dict = Depends(authenticated_user),
) -> dict:
    document_analysis_or_404(analysis_id, user["_id"])
    document_analyses.update_one(
        {"_id": ObjectId(analysis_id), "user_id": user["_id"]},
        {"$set": {"title": payload.title, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Document analysis renamed."}


@app.delete("/api/document-analyses/{analysis_id}")
def delete_document_analysis(analysis_id: str, user: dict = Depends(authenticated_user)) -> dict:
    document_analysis_or_404(analysis_id, user["_id"])
    document_analyses.delete_one({"_id": ObjectId(analysis_id), "user_id": user["_id"]})
    return {"message": "Document analysis deleted."}


@app.delete("/api/document-analyses")
def delete_all_document_analyses(user: dict = Depends(authenticated_user)) -> dict:
    document_analyses.delete_many({"user_id": user["_id"]})
    return {"message": "Saved document analysis history deleted."}


@app.post("/api/document-analyses/save")
def save_document_analysis(
    payload: SaveDocumentAnalysisRequest,
    user: dict = Depends(authenticated_user),
) -> dict:
    if payload.result.get("is_medical_document") is not True:
        raise HTTPException(status_code=422, detail="Only a confirmed medical document analysis can be saved.")
    if payload.result.get("document_type") != payload.document_type:
        raise HTTPException(status_code=422, detail="Document analysis type does not match the result.")
    if len(json.dumps(payload.result, ensure_ascii=False)) > 20000:
        raise HTTPException(status_code=413, detail="Document analysis is too large to save.")
    now = datetime.now(timezone.utc)
    result = {
        key: value
        for key, value in payload.result.items()
        if key not in {"history_id", "history_saved"}
    }
    saved = document_analyses.insert_one({
        "user_id": user["_id"],
        "title": payload.title,
        "document_type": payload.document_type,
        "language": payload.language,
        "result": result,
        "created_at": now,
        "updated_at": now,
    })
    return {
        "id": str(saved.inserted_id),
        "title": payload.title,
        "created_at": now.isoformat(),
    }


@app.post("/api/chat")
async def chat(payload: ChatRequest, user: dict = Depends(authenticated_user)) -> dict:
    require_openai()
    now = datetime.now(timezone.utc)
    conversation_id = payload.conversation_id
    previous_messages: list[dict[str, str]] = []
    saved = bool(user.get("save_history", True) or conversation_id)
    record = None
    if conversation_id:
        record = conversation_or_404(conversation_id, user["_id"])
        previous_messages = [
            {"role": item["role"], "content": item["content"]}
            for item in record.get("messages", [])[-10:]
            if item.get("role") in ("user", "assistant")
        ]
    elif not saved:
        previous_messages = payload.context_messages
    messages = [*previous_messages, {"role": "user", "content": payload.message}]
    requested_title = " ".join((payload.conversation_title or "").split())[:100]
    title = requested_title or (record["title"] if record else "Health conversation")
    urgent = emergency_screen(payload.message)
    if urgent:
        answer = emergency_reply(payload.language)
    else:
        try:
            answer = await generate_reply(messages, payload.language)
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    audio = None
    audio_error = None
    if payload.response_mode in ("voice", "both"):
        try:
            audio = await synthesize_speech(answer, payload.language, payload.voice)
        except RuntimeError as exc:
            audio_error = str(exc)
    effective_response_mode = "both" if audio_error else payload.response_mode

    if saved:
        user_message = {"id": str(uuid4()), "role": "user", "content": payload.message, "created_at": now.isoformat()}
        assistant_message = {
            "id": str(uuid4()), "role": "assistant", "content": answer,
            "created_at": now.isoformat(), "urgent": urgent, "response_mode": effective_response_mode,
        }
        if record:
            conversations.update_one(
                {"_id": record["_id"], "user_id": user["_id"]},
                {"$push": {"messages": {"$each": [user_message, assistant_message], "$slice": -100}},
                 "$set": {"updated_at": now, "title": title}},
            )
        else:
            created = conversations.insert_one({
                "user_id": user["_id"],
                "title": title,
                "messages": [user_message, assistant_message],
                "created_at": now,
                "updated_at": now,
            })
            conversation_id = str(created.inserted_id)
    return {
        "conversation_id": conversation_id if saved else None,
        "conversation_title": title,
        "message": answer,
        "urgent": urgent,
        "response_mode": effective_response_mode,
        "audio_base64": base64.b64encode(audio).decode("ascii") if audio else None,
        "audio_error": audio_error,
    }


@app.post("/api/speech/transcribe")
@limiter.limit("20/minute")
async def speech_transcribe(
    request: Request,
    file: UploadFile = File(...),
    language: str = "en",
    user: dict = Depends(authenticated_user),
) -> dict:
    if language not in {"kn", "en", "hi", "te", "ta", "ml", "mr", "bn"}:
        raise HTTPException(status_code=422, detail="Unsupported language.")
    content_type = (file.content_type or "").split(";")[0]
    if content_type not in {"audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg", "audio/x-m4a"}:
        raise HTTPException(status_code=415, detail="Unsupported audio format.")
    content = await file.read(25 * 1024 * 1024 + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Audio recording is empty.")
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio exceeds the 25 MB limit.")
    require_openai()
    try:
        extensions = {
            "audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav",
            "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/x-m4a": "m4a",
        }
        text = await transcribe_audio(f"recording.{extensions[content_type]}", content_type, content, language)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"text": text}


@app.post("/api/speech/synthesize")
async def speech_synthesize(payload: SpeechRequest, user: dict = Depends(authenticated_user)) -> Response:
    require_openai()
    try:
        audio = await synthesize_speech(payload.text, payload.language, payload.voice)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return Response(content=audio, media_type="audio/mpeg")


@app.post("/api/documents/ask")
async def document_question(
    payload: DocumentQuestionRequest,
    user: dict = Depends(authenticated_user),
) -> dict:
    require_openai()
    urgent = emergency_screen(payload.question)
    if urgent:
        return {"message": emergency_reply(payload.language), "urgent": True}
    try:
        answer = await answer_document_question(
            payload.document_context,
            payload.question,
            payload.context_messages,
            payload.language,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"message": answer, "urgent": False}


@app.post("/api/documents/explain")
@app.post("/api/prescriptions/explain", include_in_schema=False)
async def document_explain(
    file: UploadFile = File(...),
    title: str = Form(default="Document analysis", max_length=100),
    language: str = "en",
    document_type: str = "prescription",
    user: dict = Depends(authenticated_user),
) -> dict:
    if language not in {"kn", "en", "hi", "te", "ta", "ml", "mr", "bn"}:
        raise HTTPException(status_code=422, detail="Unsupported language.")
    if document_type not in {"prescription", "tablet_package", "medical_report"}:
        raise HTTPException(status_code=422, detail="Unsupported document type.")
    title = " ".join(title.split())
    if not title:
        raise HTTPException(status_code=422, detail="Enter a name for this document analysis.")
    content_type = file.content_type or ""
    data = await file.read(settings.max_upload_bytes + 1)
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded document is empty.")
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File exceeds the 8 MB limit.")
    if content_type == "application/pdf":
        if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-1024:]:
            raise HTTPException(status_code=415, detail="The file does not appear to be a valid PDF.")
    elif content_type in {"image/jpeg", "image/png", "image/webp"}:
        try:
            image = Image.open(BytesIO(data))
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status_code=415, detail="Unsupported image format.")
            if image.width * image.height > 20_000_000:
                raise HTTPException(status_code=413, detail="Image dimensions exceed the 20 megapixel limit.")
            image.verify()
            image = Image.open(BytesIO(data)).convert("L")
            if ImageStat.Stat(image).stddev[0] < 0.8:
                raise HTTPException(status_code=422, detail="The image appears blank or too unclear to read. Upload a clearer document photo.")
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise HTTPException(status_code=415, detail="The uploaded image could not be read.") from exc
    else:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, WebP image, or PDF.")
    require_openai()
    try:
        result = await explain_document(data, content_type, language, document_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    now = datetime.now(timezone.utc)
    analysis_id = None
    if result.get("is_medical_document", True) and user.get("save_history", True):
        saved = document_analyses.insert_one({
            "user_id": user["_id"],
            "title": title,
            "document_type": document_type,
            "language": language,
            "result": result,
            "created_at": now,
            "updated_at": now,
        })
        analysis_id = str(saved.inserted_id)
    return {**result, "history_id": analysis_id, "history_saved": analysis_id is not None}
