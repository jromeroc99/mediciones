from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from geoalchemy2 import Geometry

class Medida(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    id_proyecto: int = Field(index=True)
    numero: int
    latitud: float
    longitud: float
    fecha_creacion: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(datetime.timezone.utc)
    )
