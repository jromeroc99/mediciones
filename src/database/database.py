import os
from dotenv import load_dotenv
from sqlmodel import create_engine, Session

# Carga las variables definidas en el archivo .env
load_dotenv()

# Lee la variable cargada (o usa SQLite como alternativa por defecto)
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./app.db"
)

# Ajuste específico si estás usando SQLite localmente
engine_kwargs = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, **engine_kwargs)

def get_session():
    with Session(engine) as session:
        yield session