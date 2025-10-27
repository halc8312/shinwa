"""
Configuration Settings using Pydantic Settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # API設定
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # CORS設定
    cors_origins: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # データベース設定
    database_url: str = "sqlite:///./shinwa_agent.db"  # デフォルトはSQLite
    
    # Redis設定
    redis_url: str = "redis://localhost:6379/0"
    
    # OpenAI設定（Manus組み込みAI）
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "")
    openai_model: str = "gpt-4.1-mini"
    
    # セキュリティ設定
    secret_key: str = "dev-secret-key-change-in-production"
    sandbox_root: str = "/workspace"
    
    # プロアクティブ設定
    proactive_mode: str = "reactive"  # reactive | proactive | dormant
    max_frequency_per_hour: int = 3
    cooldown_minutes: int = 15
    dnd_hours: List[int] = [22, 23, 0, 1, 2, 3, 4, 5, 6]
    
    # ロギング設定
    log_level: str = "INFO"
    structured_logging: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


# シングルトンインスタンス
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get settings singleton instance"""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings


def reload_settings() -> Settings:
    """Reload settings (for hot reload)"""
    global _settings
    _settings = Settings()
    return _settings

