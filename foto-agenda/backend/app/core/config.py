from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./fotoagenda.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 dias
    HERMES_API_URL: str = ""
    HERMES_EMAIL: str = ""
    HERMES_PASSWORD: str = ""

    CORS_ORIGINS: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

if settings.SECRET_KEY == "change-me-in-production":
    import sys
    print("FATAL: SECRET_KEY nao foi configurada. Defina uma chave segura no .env")
    sys.exit(1)
