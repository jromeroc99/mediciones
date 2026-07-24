from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class Medida(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    id_proyecto: int = Field(index=True)
    numero: int
    latitud: float
    longitud: float
    # Usamos una función lambda para que calcule el tiempo en el momento de crear el objeto
    fecha_creacion: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(datetime.timezone.utc)
    )
    fecha_modificacion: Optional[datetime] = Field(default=None)