# backend/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PTAR FES Acatlán API"
    VERSION: str = "1.0.0"
    DATABASE_URL: str

    class Config:
        env_file = ".env"

settings = Settings()