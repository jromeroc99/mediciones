from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from geoalchemy2 import Geometry

class Proyecto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    fecha: datetime
    poligono: Optional[str] = Field(
        default=None,
        sa_column=Column(Geometry('POLYGON', srid=4326))
    )  # Se genera a partir de las mediciones

    fecha_creacion: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(datetime.timezone.utc)
    )
    fecha_modificacion: Optional[datetime] = Field(default=None)