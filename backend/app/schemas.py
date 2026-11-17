from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Language = Literal["kn", "en", "hi", "te", "ta", "ml", "mr", "bn"]
ResponseMode = Literal["text", "voice", "both"]
Voice = Literal["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"]


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class SignupRequest(Credentials):
    full_name: str = Field(min_length=1, max_length=100)
    language: Language
    accepted_privacy: bool
    accepted_disclaimer: bool

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Name is required")
        return value


class Preferences(BaseModel):
    language: Language
    response_mode: ResponseMode
    save_history: bool
    autoplay: bool = True
    voice: Voice = "alloy"


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    conversation_title: str | None = Field(default=None, max_length=100)
    message: str = Field(min_length=1, max_length=8000)
    language: Language
    response_mode: ResponseMode
    voice: Voice = "alloy"
    context_messages: list[dict[str, str]] = Field(default_factory=list, max_length=10)

    @field_validator("message")
    @classmethod
    def trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message is required")
        return value

    @field_validator("context_messages")
    @classmethod
    def validate_context(cls, value: list[dict[str, str]]) -> list[dict[str, str]]:
        cleaned = []
        for item in value:
            role, content = item.get("role"), item.get("content", "").strip()
            if role in {"user", "assistant"} and content:
                cleaned.append({"role": role, "content": content[:8000]})
        return cleaned


class HistoryMessage(BaseModel):
    id: str | None = None
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8000)
    created_at: str | None = None
    urgent: bool = False
    response_mode: ResponseMode | None = None

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message content is required")
        return value


class SaveConversationRequest(BaseModel):
    title: str = Field(default="Health conversation", max_length=100)
    messages: list[HistoryMessage] = Field(min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return " ".join(value.split()) or "Health conversation"


class SaveDocumentAnalysisRequest(BaseModel):
    title: str = Field(default="Document analysis", max_length=100)
    document_type: Literal["prescription", "tablet_package", "medical_report"]
    language: Language
    result: dict[str, Any]

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return " ".join(value.split()) or "Document analysis"


class RenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("Title is required")
        return value


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    language: Language
    voice: Voice = "alloy"


class DocumentQuestionRequest(BaseModel):
    document_context: str = Field(min_length=1, max_length=20000)
    question: str = Field(min_length=1, max_length=4000)
    language: Language
    context_messages: list[dict[str, str]] = Field(default_factory=list, max_length=10)

    @field_validator("question")
    @classmethod
    def trim_question(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Question is required")
        return value

    @field_validator("context_messages")
    @classmethod
    def validate_context(cls, value: list[dict[str, str]]) -> list[dict[str, str]]:
        cleaned = []
        for item in value:
            role, content = item.get("role"), item.get("content", "").strip()
            if role in {"user", "assistant"} and content:
                cleaned.append({"role": role, "content": content[:4000]})
        return cleaned


class UserView(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    full_name: str
    email: EmailStr
    language: Language
    response_mode: ResponseMode
    save_history: bool
