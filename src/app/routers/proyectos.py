from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.database.projects import Proyecto
from src.database.database import get_session
from src.app.security import verify_api_key

# Creamos el router asignando prefijo, etiquetas y la seguridad compartida
router = APIRouter(
    prefix="/proyectos",
    tags=["Proyectos"],
    dependencies=[Depends(verify_api_key)]
)

@router.get("/", response_model=List[Proyecto])
def obtener_proyectos(session: Session = Depends(get_session)):
    """
    Obtiene todos los proyectos.
    """
    proyectos = session.exec(select(Proyecto)).all()
    return proyectos

@router.get("/{proyecto_id}", response_model=Proyecto)
def obtener_proyecto(proyecto_id: int, session: Session = Depends(get_session)):
    """
    Obtiene un proyecto por su ID.
    """
    proyecto = session.get(Proyecto, proyecto_id)
    if not proyecto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proyecto con ID {proyecto_id} no encontrado"
        )
    return proyecto

@router.post("/", response_model=Proyecto, status_code=status.HTTP_201_CREATED)
def crear_proyecto(proyecto: Proyecto, session: Session = Depends(get_session)):
    """
    Crea un nuevo proyecto.
    """
    session.add(proyecto)
    session.commit()
    session.refresh(proyecto)
    return proyecto