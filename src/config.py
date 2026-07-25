import os
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str
    api_key: str

    # Pydantic v2 construye la URL automáticamente combinando las variables
    @computed_field
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:5432/{self.postgres_db}"

    model_config = SettingsConfigDict(
        env_file=f".env",
        env_file_encoding="utf-8"
    )


# Create a singleton instance
settings = Settings()