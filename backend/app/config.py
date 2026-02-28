"""
Pydantic Settings — environment-driven application configuration.

All settings are loaded from environment variables (or .env file).
This module is imported by database.py, Alembic env.py, and the FastAPI app factory.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "ai-red-team-agent"
    app_env: str = "development"
    app_debug: bool = True
    app_version: str = "1.0.0"
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:5173"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    log_level: str = "info"

    # --- PostgreSQL ---
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "ai_red_team"
    postgres_user: str = "postgres"
    postgres_password: str = "changeme"
    database_url: str | None = None
    supabase_url: str | None = None
    supabase_key: str | None = None

    # --- Redis ---
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    redis_url: str | None = None

    # --- Celery ---
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    celery_worker_concurrency: int = 4

    # --- Security ---
    secret_key: str = "changeme-generate-a-64-char-random-string"
    encryption_key: str = ""
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 7
    jwt_algorithm: str = "HS256"

    # --- First Admin ---
    admin_email: str = "admin@example.com"
    admin_password: str = "changeme"

    # --- Rate Limiting ---
    firewall_rate_limit_per_minute: int = 100
    api_rate_limit_per_minute: int = 60

    # --- LLM Defaults ---
    llm_judge_model: str = "gpt-4o"
    llm_judge_temperature: float = 0.0
    llm_judge_max_tokens: int = 1024
    llm_request_timeout: int = 30

    # --- Experiment Defaults ---
    experiment_batch_size: int = 10
    experiment_max_retries: int = 3
    experiment_retry_delay: int = 5

    # --- Database Pool ---
    database_pool_size: int = 5
    database_max_overflow: int = 10

    @property
    def async_database_url(self) -> str:
        """Construct async database URL from components if not explicitly set."""
        if self.database_url:
            if self.database_url.startswith("postgresql+psycopg2://"):
                return self.database_url.replace(
                    "postgresql+psycopg2://",
                    "postgresql+asyncpg://",
                    1,
                )
            if self.database_url.startswith("postgresql://"):
                return self.database_url.replace(
                    "postgresql://",
                    "postgresql+asyncpg://",
                    1,
                )
            if self.database_url.startswith("postgres://"):
                return self.database_url.replace(
                    "postgres://",
                    "postgresql+asyncpg://",
                    1,
                )
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        """Sync database URL for Alembic migrations."""
        if self.database_url:
            if self.database_url.startswith("postgresql+asyncpg://"):
                return self.database_url.replace(
                    "postgresql+asyncpg://",
                    "postgresql+psycopg2://",
                    1,
                )
            if self.database_url.startswith("postgresql://"):
                return self.database_url.replace(
                    "postgresql://",
                    "postgresql+psycopg2://",
                    1,
                )
            if self.database_url.startswith("postgres://"):
                return self.database_url.replace(
                    "postgres://",
                    "postgresql+psycopg2://",
                    1,
                )
            return self.database_url
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def redis_connection_url(self) -> str:
        """Construct Redis URL from components if not explicitly set."""
        if self.redis_url:
            return self.redis_url
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    @property
    def cors_origin_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


def get_settings() -> Settings:
    """Factory function for settings. Can be overridden in tests via FastAPI dependency injection."""
    return Settings()


# Module-level singleton for convenience imports.
settings = get_settings()
