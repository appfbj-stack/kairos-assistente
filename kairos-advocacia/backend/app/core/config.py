from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Kairos Advocacia"
    APP_SLUG: str = "kairos-advocacia"

    DATABASE_URL: str = "sqlite:///./advocacia.db"
    DATABASE_SCHEMA: str = "kairos_advocacia"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 dias

    KAIROS_ADMIN_URL: str = ""
    KAIROS_CLIENT_ID: str = ""
    KAIROS_ADMIN_BASIC_USER: str = ""
    KAIROS_ADMIN_BASIC_PASSWORD: str = ""

    STORAGE_DIR: str = "storage"

    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    CORS_ORIGINS: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

if settings.SECRET_KEY == "change-me-in-production":
    import sys
    print("FATAL: SECRET_KEY nao foi configurada. Defina uma chave segura no .env")
    sys.exit(1)
