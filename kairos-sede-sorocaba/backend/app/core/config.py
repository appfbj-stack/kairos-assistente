from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Kairos Sede Sorocaba"
    APP_SLUG: str = "sede-sorocaba"

    DATABASE_URL: str = "sqlite:///./sede.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 dias

    KAIROS_ADMIN_URL: str = ""
    KAIROS_CLIENT_ID: str = ""
    KAIROS_ADMIN_BASIC_USER: str = ""
    KAIROS_ADMIN_BASIC_PASSWORD: str = ""

    ADMIN_EMAIL: str = ""

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    FRONTEND_URL: str = "http://localhost:5173"

    UPLOAD_DIR: str = "uploads"

    CORS_ORIGINS: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

if settings.SECRET_KEY == "change-me-in-production":
    import sys
    print("FATAL: SECRET_KEY nao foi configurada. Defina uma chave segura no .env")
    sys.exit(1)
