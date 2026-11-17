from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.config import settings

client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=2500)
database = client[settings.mongodb_database]
users = database["users"]
conversations = database["conversations"]
document_analyses = database["document_analyses"]


def ensure_indexes() -> None:
    users.create_index("email", unique=True)
    conversations.create_index([("user_id", 1), ("updated_at", -1)])
    document_analyses.create_index([("user_id", 1), ("created_at", -1)])


def check_database() -> bool:
    try:
        client.admin.command("ping")
        return True
    except PyMongoError:
        return False
