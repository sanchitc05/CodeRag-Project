from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from sqlalchemy.engine import make_url


ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
BACKEND_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"

if ROOT_ENV_FILE.exists():
    load_dotenv(ROOT_ENV_FILE)
elif BACKEND_ENV_FILE.exists():
    load_dotenv(BACKEND_ENV_FILE)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # MySQL
    MYSQL_URL: str = "mysql+pymysql://coderag_user:coderag_pass@mysql:3306/coderag"
    MYSQL_HOST_PORT: int = 3306
    APP_ENV: str = "local"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ChromaDB
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000

    # Elasticsearch
    ELASTICSEARCH_URL: str = "http://elasticsearch:9200"

    # Model & repo storage (inside container)
    MODEL_CACHE_DIR: str = "/app/model_cache"
    REPOS_DIR: str = "/app/repos"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def resolved_mysql_url(self) -> str:
        """Return a DB URL that works in both local and Docker runs.

        Local `uvicorn` cannot resolve the Docker service hostname `mysql`,
        so map it to localhost + published host port.
        """
        db_url = make_url(self.MYSQL_URL)
        if self.APP_ENV.lower() != "docker" and db_url.host == "mysql":
            local_url = db_url.set(host="127.0.0.1", port=self.MYSQL_HOST_PORT)
            return local_url.render_as_string(hide_password=False)
        return self.MYSQL_URL


settings = Settings()
