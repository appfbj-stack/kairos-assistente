from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Kairos Política"
    APP_SLUG: str = "kairos-politica"

    DATABASE_URL: str = "sqlite:///./politica.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 dias

    KAIROS_ADMIN_URL: str = ""
    KAIROS_CLIENT_ID: str = ""

    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
