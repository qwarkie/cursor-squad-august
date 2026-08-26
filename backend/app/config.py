from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, read from environment or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Swap to postgresql+psycopg://user:pass@host/db to move off SQLite.
    database_url: str = "sqlite:///./app.db"

    # Origins allowed to call the API in production. In dev Vite proxies /api,
    # so the browser never makes a cross-origin request.
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("database_url")
    @classmethod
    def _pin_postgres_driver(cls, value: str) -> str:
        # Hosted Postgres hands out bare postgres:// URLs, which SQLAlchemy maps
        # to psycopg2. This project installs psycopg 3, so name it explicitly.
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value


settings = Settings()
