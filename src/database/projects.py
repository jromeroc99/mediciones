from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class Proyecto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    fecha: datetime

    fecha_creacion: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(datetime.timezone.utc)
    )
    fecha_modificacion: Optional[datetime] = Field(default=None)