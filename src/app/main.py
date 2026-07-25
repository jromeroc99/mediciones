from fastapi import FastAPI, Depends, HTTPException, status
from sqlmodel import Session, select
from src.database.database import get_session


app = FastAPI(
    title="API de Mediciones",
    description="Mini API para gestionar proyectos y sus mediciones asociadas.",
    version="1.0.0"
)

@app.get("/", tags=["General"])
def health_check():
    return {"status": "ok", "message": "API de Mediciones funcionando perfectamente"}