"""
Database setup — SQLAlchemy pointed at Turso (libSQL) over HTTPS so it works
from Vercel's stateless Python functions (no local disk persistence needed).

Falls back to a local SQLite file when TURSO_DATABASE_URL isn't set, so the
same code runs for local development (`uvicorn api.index:app`).
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

TURSO_URL = os.environ.get("TURSO_DATABASE_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

if TURSO_URL:
    # sqlalchemy-libsql expects sqlite+libsql://... with the token passed as a query param
    db_url = TURSO_URL.replace("libsql://", "sqlite+libsql://") + f"?authToken={TURSO_TOKEN}&secure=true"
else:
    db_url = "sqlite:///./dayguard_local.db"

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite:///") else {}
engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
