from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    from database.models import AnalysisRecord, CorrectionEntry, User, UserReport  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _migrate_users_table()
    _seed_admin()


def _migrate_users_table():
    """Add is_active column to users table if it doesn't exist (SQLite migration)."""
    with engine.connect() as conn:
        try:
            conn.execute(__import__('sqlalchemy').text(
                "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"
            ))
            conn.commit()
        except Exception:
            pass  # Column already exists


def _seed_admin():
    from database.models import User
    from passlib.context import CryptContext
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if not existing:
            pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
            admin = User(
                username="admin",
                email="admin@sentimentiq.com",
                password_hash=pwd_ctx.hash("admin123"),
                role="admin",
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
