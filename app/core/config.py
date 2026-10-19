from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8-sig", extra="ignore")

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    seed_password: str | None = None  # dev-only, used by scripts/seed_users.py
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"


settings = Settings()