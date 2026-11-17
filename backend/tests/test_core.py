import asyncio
import json
from io import BytesIO
from types import SimpleNamespace

from bson import ObjectId
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app import main, openai_service
from app.medical_safety import EMERGENCY_REPLY, emergency_reply, emergency_screen
from app.security import COOKIE_NAME, create_session_token, hash_password, verify_password


class FakeResult:
    def __init__(self, inserted_id=None):
        self.inserted_id = inserted_id


class FakeCollection:
    def __init__(self):
        self.rows = []

    def insert_one(self, document):
        row = dict(document)
        row["_id"] = ObjectId()
        self.rows.append(row)
        return FakeResult(row["_id"])

    def find_one(self, query, projection=None):
        return next((row for row in self.rows if all(row.get(key) == value for key, value in query.items())), None)

    def update_one(self, query, update):
        row = self.find_one(query)
        if row:
            row.update(update.get("$set", {}))
            for key, value in update.get("$push", {}).items():
                values = row.setdefault(key, [])
                if isinstance(value, dict) and "$each" in value:
                    values.extend(value["$each"])
                    if value.get("$slice", 0) < 0:
                        row[key] = values[value["$slice"]:]
                else:
                    values.append(value)
        return FakeResult()

    def delete_one(self, query):
        row = self.find_one(query)
        if row:
            self.rows.remove(row)

    def delete_many(self, query):
        self.rows = [row for row in self.rows if not all(row.get(key) == value for key, value in query.items())]

    def find(self, query, projection=None):
        return FakeCursor([row for row in self.rows if all(row.get(key) == value for key, value in query.items())])


class FakeCursor(list):
    def sort(self, *_args):
        return self

    def limit(self, _count):
        return self


@pytest.fixture(autouse=True)
def skip_mongo_index_startup(monkeypatch):
    monkeypatch.setattr(main, "ensure_indexes", lambda: None)


def test_password_hashing_never_stores_plaintext():
    password = "safe-example-passphrase"
    hashed = hash_password(password)
    assert password not in hashed
    assert verify_password(password, hashed)
    assert not verify_password("not-the-password", hashed)


def test_emergency_screen_avoids_routine_ai_advice():
    assert emergency_screen("I have chest pain")
    assert not emergency_screen("I have had a mild headache since breakfast")
    assert "emergency" in EMERGENCY_REPLY.lower()
    assert emergency_reply("kn") != EMERGENCY_REPLY


def test_authentication_and_preferences_use_http_only_session(monkeypatch):
    fake_users = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "conversations", FakeCollection())
    monkeypatch.setattr(main, "check_database", lambda: True)
    with TestClient(main.app) as client:
        signup = client.post("/api/auth/signup", json={
            "full_name": "A User",
            "email": "person@example.com",
            "password": "safe-example-passphrase",
            "language": "kn",
            "accepted_privacy": True,
            "accepted_disclaimer": True,
        })
        assert signup.status_code == 200
        cookie = signup.cookies.get(COOKIE_NAME)
        assert cookie and "httponly" in signup.headers["set-cookie"].lower()
        assert signup.json()["user"]["language"] == "kn"

        assert client.get("/api/auth/me").status_code == 200
        assert client.put("/api/preferences", json={
            "language": "hi", "response_mode": "both", "voice": "nova", "save_history": False, "autoplay": False,
        }).json()["language"] == "hi"
        assert client.get("/api/auth/me").json()["user"]["autoplay"] is False
        assert client.get("/api/auth/me").json()["user"]["voice"] == "nova"

        client.post("/api/auth/logout")
        assert client.get("/api/auth/me").status_code == 401
        assert client.post("/api/auth/login", json={
            "email": "person@example.com", "password": "incorrect-password",
        }).status_code == 401
        assert client.post("/api/auth/login", json={
            "email": "person@example.com", "password": "safe-example-passphrase",
        }).status_code == 200
        assert client.get("/api/auth/me").status_code == 200
        client.post("/api/auth/logout")


def test_chat_response_modes_and_audio_failure_are_explicit(monkeypatch):
    user = {
        "_id": ObjectId(), "full_name": "A User", "email": "person@example.com",
        "language": "en", "response_mode": "text", "save_history": False, "autoplay": True,
    }
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def generate(_messages, _language):
        return "General information, not a diagnosis."

    synthesized_voices = []

    async def synthesize(_text, _language, voice):
        synthesized_voices.append(voice)
        return b"mock-audio"

    monkeypatch.setattr(main, "generate_reply", generate)
    monkeypatch.setattr(main, "synthesize_speech", synthesize)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        text = client.post("/api/chat", json={"message": "A mild headache", "language": "en", "response_mode": "text"})
        voice = client.post("/api/chat", json={"message": "A mild headache", "language": "en", "response_mode": "voice", "voice": "shimmer"})
        both = client.post("/api/chat", json={"message": "A mild headache", "language": "en", "response_mode": "both"})
        emergency = client.post("/api/chat", json={"message": "I have chest pain", "language": "en", "response_mode": "text"})
        assert text.json()["audio_base64"] is None
        assert voice.json()["audio_base64"] == "bW9jay1hdWRpbw=="
        assert synthesized_voices[0] == "shimmer"
        assert both.json()["audio_base64"] == "bW9jay1hdWRpbw=="
        assert emergency.json()["urgent"] is True
        assert "emergency" in emergency.json()["message"].lower()
        localized_emergency = client.post("/api/chat", json={"message": "ಎದೆ ನೋವು", "language": "kn", "response_mode": "text"})
        assert localized_emergency.json()["urgent"] is True
        assert "ತುರ್ತು" in localized_emergency.json()["message"]

        async def failed_speech(_text, _language, _voice):
            raise RuntimeError("Audio generation failed.")

        monkeypatch.setattr(main, "synthesize_speech", failed_speech)
        fallback = client.post("/api/chat", json={"message": "A mild headache", "language": "en", "response_mode": "both"})
        assert fallback.json()["message"]
        assert fallback.json()["audio_error"] == "Audio generation failed."
        assert fallback.json()["response_mode"] == "both"


def test_saved_chat_keeps_user_title_and_timestamps(monkeypatch):
    user_id = ObjectId()
    user = {
        "_id": user_id, "full_name": "A User", "email": "person@example.com",
        "language": "en", "save_history": True,
    }
    fake_users = FakeCollection()
    fake_users.rows = [user]
    fake_conversations = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "conversations", fake_conversations)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def generate(_messages, _language):
        return "General health information."

    monkeypatch.setattr(main, "generate_reply", generate)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_id)))
        response = client.post("/api/chat", json={
            "message": "A mild headache", "conversation_title": "Headache questions",
            "language": "en", "response_mode": "text",
        })
        assert response.status_code == 200
        assert response.json()["conversation_title"] == "Headache questions"
        row = fake_conversations.rows[0]
        assert row["title"] == "Headache questions"
        assert row["created_at"] <= row["updated_at"]
        history = client.get("/api/conversations").json()["conversations"][0]
        assert history["title"] == "Headache questions"
        assert history["created_at"] == row["created_at"].isoformat()
        loaded = client.get(f"/api/conversations/{response.json()['conversation_id']}").json()
        assert loaded["title"] == "Headache questions"
        assert loaded["created_at"] == row["created_at"].isoformat()


def test_manually_saved_conversation_is_kept_and_updated_when_auto_history_is_off(monkeypatch):
    user_id = ObjectId()
    user = {"_id": user_id, "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    fake_conversations = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "conversations", fake_conversations)
    monkeypatch.setattr(main, "require_openai", lambda: None)
    generated_messages = []

    async def generate(messages, _language):
        generated_messages.append(messages)
        return "A follow-up answer."

    monkeypatch.setattr(main, "generate_reply", generate)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_id)))
        saved = client.post("/api/conversations/save", json={
            "title": "Health question",
            "messages": [
                {"id": "user-1", "role": "user", "content": "My first question"},
                {"id": "assistant-1", "role": "assistant", "content": "The first answer"},
            ],
        })
        assert saved.status_code == 200
        conversation_id = saved.json()["id"]
        response = client.post("/api/chat", json={
            "conversation_id": conversation_id,
            "message": "A follow-up question",
            "language": "en",
            "response_mode": "text",
        })
        assert response.status_code == 200
        assert response.json()["conversation_id"] == conversation_id
        assert generated_messages[0] == [
            {"role": "user", "content": "My first question"},
            {"role": "assistant", "content": "The first answer"},
            {"role": "user", "content": "A follow-up question"},
        ]
        loaded = client.get(f"/api/conversations/{conversation_id}").json()
        assert len(loaded["messages"]) == 4
        assert loaded["messages"][-2]["content"] == "A follow-up question"
        assert client.get("/api/conversations").json()["conversations"][0]["id"] == conversation_id


def test_conversation_ownership_is_enforced(monkeypatch):
    user_a = ObjectId()
    user_b = ObjectId()
    conversation_id = ObjectId()
    fake_users = FakeCollection()
    fake_users.rows = [{"_id": user_a, "full_name": "A", "email": "a@example.com", "password_hash": "x"}]
    fake_conversations = FakeCollection()
    fake_conversations.rows = [{
        "_id": conversation_id, "user_id": user_b, "title": "Private",
        "messages": [], "updated_at": __import__("datetime").datetime.now(),
    }]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "conversations", fake_conversations)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_a)))
        response = client.get(f"/api/conversations/{conversation_id}")
        assert response.status_code == 404


def test_invalid_prescription_file_is_rejected(monkeypatch):
    user = {"_id": ObjectId(), "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post(
            "/api/prescriptions/explain?language=en&response_mode=text",
            files={"file": ("notes.txt", b"not a prescription", "text/plain")},
        )
        assert response.status_code == 415


def test_blank_document_image_is_rejected_before_ai_processing(monkeypatch):
    user = {"_id": ObjectId(), "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)

    def should_not_process(*_args):
        pytest.fail("A blank image must not be sent to the AI for medical interpretation.")

    monkeypatch.setattr(main, "explain_document", should_not_process)
    image = BytesIO()
    Image.new("RGB", (32, 32), "white").save(image, format="PNG")

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post(
            "/api/documents/explain?language=en&response_mode=text",
            files={"file": ("blank.png", image.getvalue(), "image/png")},
        )
        assert response.status_code == 422
        assert "appears blank" in response.json()["detail"]


def test_transcription_failure_is_reported_and_text_entry_remains_available(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com"}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def fail_transcription(*_args):
        raise RuntimeError("Speech recognition failed. Please type your message instead.")

    monkeypatch.setattr(main, "transcribe_audio", fail_transcription)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post(
            "/api/speech/transcribe?language=kn",
            files={"file": ("recording.webm", b"mock-audio", "audio/webm")},
        )
        assert response.status_code == 502
        assert "type your message" in response.json()["detail"]


def test_valid_prescription_is_extracted_and_explained_without_persisting_upload(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com", "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    fake_conversations = FakeCollection()
    fake_analyses = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "conversations", fake_conversations)
    monkeypatch.setattr(main, "document_analyses", fake_analyses)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def explain(_data, _content_type, _language, document_type):
        assert document_type == "prescription"
        return {
            "document_type": document_type,
            "is_medical_document": True,
            "extracted_text": "Tablet name: [unclear]",
            "explanation": "Please confirm the medicine name with your pharmacist.",
            "medicines": [{
                "name": "[unclear]",
                "strength": "",
                "common_use": "",
                "instructions": "",
                "duration": "",
                "uncertainties": "Medicine name is unclear.",
            }],
            "medicine_count": 1,
        }

    async def should_not_synthesize_document_audio(*_args):
        pytest.fail("Document explanations must not synthesize one whole-document audio track.")

    monkeypatch.setattr(main, "explain_document", explain)
    monkeypatch.setattr(main, "synthesize_speech", should_not_synthesize_document_audio)
    image = BytesIO()
    sample_image = Image.new("RGB", (2, 2), "white")
    sample_image.putpixel((0, 0), (0, 0, 0))
    sample_image.save(image, format="PNG")

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post(
            "/api/prescriptions/explain?language=en",
            files={"file": ("prescription.png", image.getvalue(), "image/png")},
        )
        assert response.status_code == 200
        assert response.json()["extracted_text"] == "Tablet name: [unclear]"
        assert response.json()["medicine_count"] == 1
        assert "audio_base64" not in response.json()
        assert fake_conversations.rows == []
        assert fake_analyses.rows == []


def test_medical_report_is_explained_as_report(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com", "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    fake_analyses = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "document_analyses", fake_analyses)
    monkeypatch.setattr(main, "require_openai", lambda: None)
    async def explain(_data, _content_type, _language, document_type):
        assert document_type == "medical_report"
        return {
            "document_type": document_type,
            "is_medical_document": True,
            "extracted_text": "Hemoglobin: 12 g/dL",
            "explanation": "The report lists a hemoglobin value of 12 g/dL.",
            "findings": [{
                "name": "Hemoglobin",
                "value": "12 g/dL",
                "reference_range": "",
                "status": "",
                "plain_meaning": "A blood measurement; interpretation depends on the laboratory range and clinical context.",
            }],
            "follow_up": "Ask your clinician how this relates to your health.",
        }

    monkeypatch.setattr(main, "explain_document", explain)
    image = BytesIO()
    sample_image = Image.new("RGB", (2, 2), "white")
    sample_image.putpixel((0, 0), (0, 0, 0))
    sample_image.save(image, format="PNG")

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post(
            "/api/documents/explain?language=en&document_type=medical_report",
            files={"file": ("report.png", image.getvalue(), "image/png")},
        )
        assert response.status_code == 200
        assert response.json()["document_type"] == "medical_report"
        assert response.json()["findings"][0]["name"] == "Hemoglobin"
        assert fake_analyses.rows == []


def test_tablet_package_is_explained_with_expiry_date(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com", "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def explain(_data, _content_type, _language, document_type):
        assert document_type == "tablet_package"
        return {
            "document_type": document_type,
            "is_medical_document": True,
            "extracted_text": "Medicine: Example; EXP 08/2027",
            "explanation": "The package lists Example. Confirm its use with a healthcare professional.",
            "medicines": [{
                "name": "Example",
                "strength": "10 mg",
                "common_use": "General use information.",
                "possible_reasons": "A clinician may prescribe it for several reasons.",
                "potential_benefit": "Possible benefits vary.",
                "instructions": "",
                "instruction_meaning": "",
                "duration": "",
                "expiry_date": "EXP 08/2027",
                "uncertainties": "",
            }],
            "medicine_count": 1,
        }

    monkeypatch.setattr(main, "explain_document", explain)
    image = BytesIO()
    sample_image = Image.new("RGB", (2, 2), "white")
    sample_image.putpixel((0, 0), (0, 0, 0))
    sample_image.save(image, format="PNG")

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post(
            "/api/documents/explain?language=en&document_type=tablet_package",
            files={"file": ("package.png", image.getvalue(), "image/png")},
        )
    assert response.status_code == 200
    assert response.json()["document_type"] == "tablet_package"
    assert response.json()["medicines"][0]["expiry_date"] == "EXP 08/2027"


def test_document_analysis_is_saved_with_title_and_without_upload_bytes(monkeypatch):
    user_id = ObjectId()
    user = {"_id": user_id, "save_history": True}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    analyses = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "document_analyses", analyses)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def explain(_data, _content_type, _language, document_type):
        assert document_type == "prescription"
        return {
            "document_type": "prescription",
            "is_medical_document": True,
            "extracted_text": "Tablet A",
            "explanation": "A brief explanation.",
            "medicines": [],
            "medicine_count": 0,
        }

    monkeypatch.setattr(main, "explain_document", explain)
    image = BytesIO()
    sample = Image.new("RGB", (4, 4), "white")
    sample.putpixel((0, 0), (0, 0, 0))
    sample.save(image, format="PNG")

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_id)))
        response = client.post(
            "/api/documents/explain?language=kn&document_type=prescription",
            files={"file": ("document.png", image.getvalue(), "image/png")},
            data={"title": "  My prescription  "},
        )
        assert response.status_code == 200
        assert response.json()["history_saved"] is True
        saved = analyses.rows[0]
        assert saved["title"] == "My prescription"
        assert saved["language"] == "kn"
        assert saved["result"]["explanation"] == "A brief explanation."
        assert "file" not in saved and "upload" not in saved

        history = client.get("/api/document-analyses").json()["analyses"]
        assert history[0]["id"] == str(saved["_id"])
        assert history[0]["title"] == "My prescription"
        assert client.put(
            f"/api/document-analyses/{saved['_id']}",
            json={"title": "Clinic visit"},
        ).status_code == 200
        assert analyses.rows[0]["title"] == "Clinic visit"
        assert client.delete(f"/api/document-analyses/{saved['_id']}").status_code == 200
        assert analyses.rows == []


def test_document_analysis_can_be_saved_manually_when_auto_history_is_off(monkeypatch):
    user_id = ObjectId()
    user = {"_id": user_id, "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    analyses = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "document_analyses", analyses)
    result = {
        "document_type": "medical_report",
        "is_medical_document": True,
        "extracted_text": "Test A: 5",
        "explanation": "The report lists Test A.",
        "findings": [],
        "follow_up": "Ask your clinician.",
        "history_id": None,
        "history_saved": False,
    }

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_id)))
        response = client.post("/api/document-analyses/save", json={
            "title": "My report",
            "document_type": "medical_report",
            "language": "en",
            "result": result,
        })
        assert response.status_code == 200
        assert response.json()["title"] == "My report"
        history = client.get("/api/document-analyses").json()["analyses"]
        assert len(history) == 1
        assert history[0]["result"]["explanation"] == "The report lists Test A."
        assert "history_id" not in history[0]["result"]
        assert "history_saved" not in history[0]["result"]

        rejected = client.post("/api/document-analyses/save", json={
            "title": "Not medical",
            "document_type": "medical_report",
            "language": "en",
            "result": {**result, "is_medical_document": False},
        })
        assert rejected.status_code == 422
        assert len(analyses.rows) == 1


@pytest.mark.parametrize(
    ("document_type", "model_result", "expected_field", "expected_value"),
    [
        (
            "prescription",
            {
                "is_medical_document": True,
                "extracted_text": "Tablet A",
                "explanation": "One medicine is listed.",
                "medicines": [{
                    "name": "Tablet A",
                    "strength": "10 mg",
                    "common_use": "Commonly used for X; the document cannot establish why it was prescribed here.",
                    "possible_reasons": "A clinician may use it for X; the document cannot establish this person's reason.",
                    "potential_benefit": "It may help with X for some people; effects vary.",
                    "instructions": "Take 1 tablet after lunch.",
                    "instruction_meaning": "Take it after your lunch meal.",
                    "duration": "",
                    "uncertainties": "",
                }],
            },
            "medicine_count",
            1,
        ),
        (
            "medical_report",
            {
                "is_medical_document": True,
                "extracted_text": "Test A: 5",
                "explanation": "The report lists Test A.",
                "findings": [{
                    "name": "Test A",
                    "value": "5",
                    "reference_range": "",
                    "status": "",
                    "plain_meaning": "Interpret with the report and clinician.",
                }],
                "follow_up": "Ask your clinician.",
            },
            "findings",
            [{"name": "Test A", "value": "5", "reference_range": "", "status": "", "plain_meaning": "Interpret with the report and clinician."}],
        ),
        (
            "tablet_package",
            {
                "is_medical_document": True,
                "extracted_text": "Example 10 mg; EXP 08/2027",
                "explanation": "The medicine name and expiry date are read from the package.",
                "medicines": [{
                    "name": "Example",
                    "strength": "10 mg",
                    "common_use": "General use information.",
                    "possible_reasons": "A clinician may use it for certain conditions.",
                    "potential_benefit": "Possible benefits vary.",
                    "instructions": "",
                    "instruction_meaning": "",
                    "duration": "",
                    "expiry_date": "EXP 08/2027",
                    "uncertainties": "",
                }],
            },
            "medicine_count",
            1,
        ),
    ],
)
def test_document_explanation_parses_structured_model_result(
    monkeypatch, document_type, model_result, expected_field, expected_value,
):
    class FakeResponses:
        request = None

        async def create(self, **kwargs):
            self.request = kwargs
            return SimpleNamespace(output_text=json.dumps(model_result))

    responses = FakeResponses()
    monkeypatch.setattr(openai_service, "client", lambda: SimpleNamespace(responses=responses))
    result = asyncio.run(
        openai_service.explain_document(b"image-bytes", "image/png", "en", document_type)
    )
    assert result["document_type"] == document_type
    assert result["is_medical_document"] is True
    assert result[expected_field] == expected_value
    assert responses.request["text"] == {"format": {"type": "json_object"}}
    assert responses.request["reasoning"] == {"effort": "minimal"}
    assert '"is_medical_document"' in responses.request["instructions"]
    assert "json" in responses.request["input"][0]["content"][0]["text"].lower()
    assert responses.request["input"][0]["content"][1]["type"] == "input_image"
    if document_type == "prescription":
        medicine = result["medicines"][0]
        assert medicine["possible_reasons"].startswith("A clinician may use")
        assert medicine["potential_benefit"].startswith("It may help")
        assert medicine["instructions"] == "Take 1 tablet after lunch."
        assert medicine["instruction_meaning"] == "Take it after your lunch meal."
        assert "before, with, or after food, breakfast, lunch, or dinner" in responses.request["instructions"]
        assert "respond only in English" in responses.request["instructions"]
        assert "Never claim to know why this clinician prescribed it" in responses.request["instructions"]
    if document_type == "tablet_package":
        assert result["medicines"][0]["expiry_date"] == "EXP 08/2027"
        assert "Do not identify a loose tablet from its shape, color, imprint, or appearance" in responses.request["instructions"]
        assert "do not infer it from a manufacturing date or shelf life" in responses.request["instructions"]


def test_non_medical_document_is_not_given_medical_findings(monkeypatch):
    model_result = {
        "is_medical_document": False,
        "extracted_text": "A grocery shopping list",
        "explanation": "This is not a medical document. Please upload a prescription or medical report.",
        "medicines": [{"name": "Invented medicine"}],
    }

    class FakeResponses:
        async def create(self, **_kwargs):
            return SimpleNamespace(output_text=json.dumps(model_result))

    monkeypatch.setattr(openai_service, "client", lambda: SimpleNamespace(responses=FakeResponses()))
    result = asyncio.run(
        openai_service.explain_document(b"image-bytes", "image/png", "en", "prescription")
    )
    assert result["is_medical_document"] is False
    assert result["explanation"] == model_result["explanation"]
    assert "medicines" not in result
    assert "findings" not in result


def test_document_without_classification_is_not_assumed_medical(monkeypatch):
    class FakeResponses:
        async def create(self, **_kwargs):
            return SimpleNamespace(output_text=json.dumps({
                "extracted_text": "Some text",
                "explanation": "A summary.",
                "medicines": [],
            }))

    monkeypatch.setattr(openai_service, "client", lambda: SimpleNamespace(responses=FakeResponses()))
    with pytest.raises(RuntimeError, match="could not be classified safely"):
        asyncio.run(openai_service.explain_document(b"image-bytes", "image/png", "en", "prescription"))


def test_non_medical_document_is_not_saved_to_analysis_history(monkeypatch):
    user_id = ObjectId()
    user = {"_id": user_id, "save_history": True}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    analyses = FakeCollection()
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "document_analyses", analyses)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def explain(*_args):
        return {
            "document_type": "prescription",
            "is_medical_document": False,
            "extracted_text": "A shopping list",
            "explanation": "This is not a medical document.",
        }

    monkeypatch.setattr(main, "explain_document", explain)
    image = BytesIO()
    sample_image = Image.new("RGB", (2, 2), "white")
    sample_image.putpixel((0, 0), (0, 0, 0))
    sample_image.save(image, format="PNG")

    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_id)))
        response = client.post(
            "/api/documents/explain?language=en&document_type=prescription",
            files={"file": ("unrelated.png", image.getvalue(), "image/png")},
        )
    assert response.status_code == 200
    assert response.json()["is_medical_document"] is False
    assert response.json()["history_saved"] is False
    assert analyses.rows == []


def test_chat_uses_minimal_reasoning_to_leave_tokens_for_the_answer(monkeypatch):
    class FakeResponses:
        request = None

        async def create(self, **kwargs):
            self.request = kwargs
            return SimpleNamespace(output_text="A concise general-information response.")

    responses = FakeResponses()
    monkeypatch.setattr(openai_service, "client", lambda: SimpleNamespace(responses=responses))
    answer = asyncio.run(
        openai_service.generate_reply([{"role": "user", "content": "I am not feeling well today."}], "en")
    )
    assert answer == "A concise general-information response."
    assert responses.request["reasoning"] == {"effort": "minimal"}


def test_document_question_uses_document_context_and_selected_language(monkeypatch):
    class FakeResponses:
        request = None

        async def create(self, **kwargs):
            self.request = kwargs
            return SimpleNamespace(output_text="The report lists a hemoglobin value of 12 g/dL.")

    responses = FakeResponses()
    monkeypatch.setattr(openai_service, "client", lambda: SimpleNamespace(responses=responses))
    answer = asyncio.run(openai_service.answer_document_question(
        '{"findings":[{"name":"Hemoglobin","value":"12 g/dL"}]}',
        "What does this value mean?",
        [{"role": "user", "content": "Can you explain my result?"}],
        "en",
    ))
    assert answer == "The report lists a hemoglobin value of 12 g/dL."
    assert "Selected response language: English" in responses.request["instructions"]
    assert "untrusted data" in responses.request["instructions"]
    assert '{"findings":[{"name":"Hemoglobin","value":"12 g/dL"}]}' in responses.request["input"][0]["content"]
    assert "What does this value mean?" in responses.request["input"][0]["content"]


def test_document_question_endpoint_answers_and_screens_emergencies(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com"}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "require_openai", lambda: None)
    asked = []

    async def answer(context, question, history, language):
        asked.append((context, question, history, language))
        return "The report lists this result."

    monkeypatch.setattr(main, "answer_document_question", answer)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post("/api/documents/ask", json={
            "document_context": '{"explanation":"A report summary."}',
            "question": "Can you explain this?",
            "language": "en",
            "context_messages": [{"role": "user", "content": "What is in the report?"}],
        })
        assert response.status_code == 200
        assert response.json() == {"message": "The report lists this result.", "urgent": False}
        assert asked[0][0] == '{"explanation":"A report summary."}'
        assert asked[0][2] == [{"role": "user", "content": "What is in the report?"}]
        assert asked[0][3] == "en"

        emergency = client.post("/api/documents/ask", json={
            "document_context": "{}",
            "question": "I have chest pain",
            "language": "en",
        })
        assert emergency.status_code == 200
        assert emergency.json()["urgent"] is True
        assert "emergency" in emergency.json()["message"].lower()
        assert len(asked) == 1


def test_missing_openai_key_has_an_explicit_configuration_error(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com"}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main.settings, "openai_api_key", "")
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post("/api/chat", json={
            "message": "What is a headache?", "language": "en", "response_mode": "text",
        })
        assert response.status_code == 503
        assert "OPENAI_API_KEY" in response.json()["detail"]


def test_speech_voice_is_validated(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com", "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "require_openai", lambda: None)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post("/api/chat", json={
            "message": "A mild headache", "language": "en", "response_mode": "voice", "voice": "not-a-voice",
        })
        assert response.status_code == 422


def test_ai_timeout_fails_with_a_safe_retry_message(monkeypatch):
    user = {"_id": ObjectId(), "full_name": "A User", "email": "person@example.com", "save_history": False}
    fake_users = FakeCollection()
    fake_users.rows = [user]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "require_openai", lambda: None)

    async def timeout(_messages, _language):
        raise RuntimeError("The AI service is temporarily unavailable. Please try again.")

    monkeypatch.setattr(main, "generate_reply", timeout)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user["_id"])))
        response = client.post("/api/chat", json={
            "message": "What is a headache?", "language": "en", "response_mode": "text",
        })
        assert response.status_code == 502
        assert response.json()["detail"] == "The AI service is temporarily unavailable. Please try again."


def test_conversation_deletion_removes_only_the_owned_record(monkeypatch):
    user_id = ObjectId()
    conversation_id = ObjectId()
    fake_users = FakeCollection()
    fake_users.rows = [{"_id": user_id, "full_name": "A", "email": "a@example.com"}]
    fake_conversations = FakeCollection()
    fake_conversations.rows = [{
        "_id": conversation_id, "user_id": user_id, "title": "New conversation",
        "messages": [], "updated_at": __import__("datetime").datetime.now(),
    }]
    monkeypatch.setattr(main, "users", fake_users)
    monkeypatch.setattr(main, "conversations", fake_conversations)
    with TestClient(main.app) as client:
        client.cookies.set(COOKIE_NAME, create_session_token(str(user_id)))
        response = client.delete(f"/api/conversations/{conversation_id}")
        assert response.status_code == 200
        assert fake_conversations.rows == []
