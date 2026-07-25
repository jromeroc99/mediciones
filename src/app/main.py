import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from sqlmodel import Session, select
from src.database.database import get_session
from src.app.routers import proyectos, mediciones


app = FastAPI(
    title="API de Mediciones",
    description="Mini API para gestionar proyectos y sus mediciones asociadas.",
    version="1.0.0"
)

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Puerto de Vite por defecto
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(proyectos.router)
app.include_router(mediciones.router)

# RUTA PÚBLICA (no requiere API Key)
@app.get("/", tags=["General"])
def health_check():
    return {"status": "ok", "message": "API de Mediciones funcionando perfectamente"}

