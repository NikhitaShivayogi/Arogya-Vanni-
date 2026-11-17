from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    openai_api_key: str = ""
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "arogya_vanni"
    jwt_secret: str = "development-only-change-me"
    frontend_origins: str = "http://localhost:5173"
    cookie_secure: bool = False
    environment: str = "development"
    session_hours: int = 24
    max_upload_bytes: int = 8 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=PROJECT_ROOT_ENV, extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
