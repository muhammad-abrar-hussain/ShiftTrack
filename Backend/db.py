from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables or .env file")

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=True,
)


def init_db():
    """
    Initialize database tables.
    Creates all tables defined in models.
    """
    from models import ShiftSummary, ShiftPunch, AttendanceRecord
    SQLModel.metadata.create_all(engine)
    print("Database tables created successfully!")


def get_session() -> Generator[Session, None, None]:
    """
    Dependency for getting database sessions.
    """
    with Session(engine) as session:
        yield session
