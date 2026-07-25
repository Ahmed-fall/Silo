from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    # Database
    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str
    postgres_port: int = 5432

    # AI services
    ai_vision_url: str
    ai_predictive_url: str
    ai_soil_url: str

    # Storage
    uploads_dir: str = "./uploads"

    # Auth (mobile app)
    jwt_secret: str = "silo-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60 * 24 * 7  # 7 days, farmer-friendly (rural connectivity)

    # Push notifications (mobile app). Optional — if unset, push is a no-op and
    # only the existing websocket alert stream fires.
    fcm_server_key: str | None = None

    # WhatsApp (Twilio) / Telegram alert notifications. Optional — if unset,
    # each sender raises internally and app/core/notify.py logs a warning
    # per recipient without affecting the websocket/FCM push flow.
    telegram_bot_token: str | None = None
    twilio_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_whatsapp_from: str | None = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        extra="ignore"
    )

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
