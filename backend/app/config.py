from pathlib import Path
from urllib.parse import urlparse, urlunparse

from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from sqlalchemy.engine import make_url


ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
ROOT_ENV_LOCAL = Path(__file__).resolve().parents[2] / ".env.local"
BACKEND_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"

for env_file in [ROOT_ENV_LOCAL, ROOT_ENV_FILE, BACKEND_ENV_FILE]:
    if env_file.exists():
        load_dotenv(env_file)
        break


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # MySQL
    MYSQL_URL: str = "mysql+pymysql://coderag_user:coderag_pass@mysql:3306/coderag"
    MYSQL_HOST_PORT: int = 3307
    APP_ENV: str = "local"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ChromaDB
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000
    CHROMA_HOST_PORT: int = 8001

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

    @property
    def resolved_chroma_host(self) -> str:
        """Return a Chroma host that works in both local and Docker runs."""
        if self.APP_ENV.lower() != "docker" and self.CHROMA_HOST == "chromadb":
            return "127.0.0.1"
        return self.CHROMA_HOST

    @property
    def resolved_chroma_port(self) -> int:
        """Return a Chroma port that works in both local and Docker runs."""
        if self.APP_ENV.lower() != "docker" and self.CHROMA_HOST == "chromadb":
            return self.CHROMA_HOST_PORT
        return self.CHROMA_PORT

    @property
    def resolved_elasticsearch_url(self) -> str:
        """Return an Elasticsearch URL that works in both local and Docker runs."""
        parsed = urlparse(self.ELASTICSEARCH_URL)
        if self.APP_ENV.lower() != "docker" and parsed.hostname == "elasticsearch":
            netloc = "127.0.0.1"
            if parsed.port:
                netloc = f"{netloc}:{parsed.port}"
            return urlunparse((
                parsed.scheme,
                netloc,
                parsed.path,
                parsed.params,
                parsed.query,
                parsed.fragment,
            ))
        return self.ELASTICSEARCH_URL

    @property
    def resolved_repos_dir(self) -> str:
        """Return a repo storage path that works in both local and Docker runs."""
        if self.APP_ENV.lower() != "docker" and self.REPOS_DIR.startswith("/app/"):
            return str(Path(__file__).resolve().parents[1] / "repos")
        return self.REPOS_DIR


settings = Settings()
