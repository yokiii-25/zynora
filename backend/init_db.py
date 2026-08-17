from database.database import Base, engine
from database import models


def initialize_database():
    print("Connecting to PostgreSQL...")

    Base.metadata.create_all(bind=engine)

    print("ZYNORA database initialized successfully.")
    print("Created/verified table: projects")


if __name__ == "__main__":
    initialize_database()
