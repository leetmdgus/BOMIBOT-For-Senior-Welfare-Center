from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["development", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "BOMIBOT API"
    app_env: AppEnv = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./bomi.db"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_minutes: int = 60 * 24 * 7

    # 쉼표 구분 Exact Origin (프론트 URL만)
    cors_origins: str = ""
    # 비우면 development에서 localhost 기본값 + 아래 regex 플래그 사용
    cors_origin_regex: str = ""
    cors_allow_vercel_regex: bool = True
    cors_allow_bomi_regex: bool = True

    # production: api-workspace.bomi.ai.kr,localhost,127.0.0.1
    trusted_hosts: str = ""
    auto_create_tables: bool = True
    run_alembic_on_startup: bool = False
    run_seed_on_startup: bool = False
    seed_missing_json_on_startup: bool = True

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    cs_email_to: str = ""

    gemini_api_key: str = ""
    gemini_base_url: str = "https://factchat-cloud.mindlogic.ai/v1/gateway"
    gemini_model: str = "gemini-2.0-flash"

    rag_api_url: str = ""
    rag_api_key: str = ""
    rag_top_k: int = 8

    # 업로드 파일 저장 경로 (region_id 하위 디렉터리)
    files_storage_dir: str = "storage/uploads"

    # Google OAuth (로그인 + Calendar 읽기)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://127.0.0.1:9001/api/v1/auth/google/callback"
    frontend_url: str = "http://localhost:3000"

    @field_validator("app_env", mode="before")
    @classmethod
    def normalize_app_env(cls, value: object) -> str:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_host_list(self) -> list[str]:
        raw = [host.strip() for host in self.trusted_hosts.split(",") if host.strip()]
        if raw:
            return raw
        if self.is_production:
            return ["api-workspace.bomi.ai.kr", "localhost", "127.0.0.1"]
        return []


@lru_cache
def get_settings() -> Settings:
    return Settings()
