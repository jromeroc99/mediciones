from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON

class Medida(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    id_proyecto: int = Field(foreign_key="proyecto.id", index=True)
    numero_medicion: float  # ID del CSV
    observaciones: Optional[str] = None  # Remarks
    fecha_hora: datetime  # Time
    latitud: float  # Latitude
    longitud: float  # Longitude
    x: float  # X coordinate
    y: float  # Y coordinate
    elevacion: Optional[float] = None  # Elevation
    altura_ortometrica: Optional[float] = None  # Ortho Height
    altura_instrumento: Optional[float] = None  # Instrument Ht
    fix_id: Optional[float] = None  # Fix ID
    velocidad: Optional[float] = None  # Speed
    rumbo: Optional[float] = None  # Bearing
    precision_horizontal: Optional[float] = None  # Horizontal Accuracy
    precision_vertical: Optional[float] = None  # Vertical Accuracy
    pdop: Optional[float] = None  # PDOP
    hdop: Optional[float] = None  # HDOP
    vdop: Optional[float] = None  # VDOP
    datos_adicionales: Dict[str, Any] = Field(
        default_factory=dict, 
        sa_column=Column(JSON)
    )  # Satellites in View, Satellites in Use, cubierto, etc.
    fecha_creacion: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(datetime.timezone.utc)
    )
