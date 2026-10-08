import os

from sqlmodel import Session, create_engine

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://squadmeet:squadmeet@localhost:5432/squadmeet",
)

engine = create_engine(DATABASE_URL)


def get_session():
    with Session(engine) as session:
        yield session
