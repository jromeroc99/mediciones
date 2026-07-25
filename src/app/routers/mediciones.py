from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
import csv
import io
from shapely.geometry import Polygon
from geoalchemy2.shape import from_shape

from src.database.measures import Medida
from src.database.projects import Proyecto
from src.database.database import get_session
from src.app.security import verify_api_key

# Creamos el router asignando prefijo, etiquetas y la seguridad compartida
router = APIRouter(
    prefix="/mediciones",
    tags=["Mediciones"],
    dependencies=[Depends(verify_api_key)]
)

def obtener_mediciones_por_proyecto(session: Session, id_proyecto: int) -> List[Medida]:
    """Obtiene todas las mediciones asociadas a un proyecto específico."""
    statement = select(Medida).where(Medida.id_proyecto == id_proyecto)
    results = session.exec(statement)
    return results.all()

def importar_csv_mediciones(session: Session, id_proyecto: int, csv_data: List[dict]):
    """Importa mediciones desde un CSV y las asocia a un proyecto específico."""
    for row in csv_data:
        medida = Medida(
            id_proyecto=id_proyecto,
            numero_medicion=row.get("numero_medicion"),
            observaciones=row.get("observaciones"),
            fecha_hora=row.get("fecha_hora"),
            latitud=row.get("latitud"),
            longitud=row.get("longitud"),
            x=row.get("x"),
            y=row.get("y"),
            elevacion=row.get("elevacion"),
            altura_ortometrica=row.get("altura_ortometrica"),
            altura_instrumento=row.get("altura_instrumento"),
            fix_id=row.get("fix_id"),
            velocidad=row.get("velocidad"),
            rumbo=row.get("rumbo"),
            precision_horizontal=row.get("precision_horizontal"),
            precision_vertical=row.get("precision_vertical"),
            pdop=row.get("pdop"),
            hdop=row.get("hdop"),
            vdop=row.get("vdop"),
            datos_adicionales=row.get("datos_adicionales", {})
        )
        session.add(medida)
    session.commit()

@router.get("/{id_proyecto}", response_model=List[Medida])
def leer_mediciones_por_proyecto(id_proyecto: int, session: Session = Depends(get_session)):
    """Endpoint para obtener todas las mediciones de un proyecto específico."""
    mediciones = obtener_mediciones_por_proyecto(session, id_proyecto)
    if not mediciones:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontraron mediciones para el proyecto con ID {id_proyecto}"
        )
    return mediciones

@router.post("/{id_proyecto}/upload-csv", status_code=status.HTTP_201_CREATED)
async def subir_csv_mediciones(
    id_proyecto: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    """Endpoint para subir un archivo CSV con mediciones y asociarlas a un proyecto."""
    
    # Verificar que el archivo sea CSV
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un CSV"
        )
    
    try:
        # Leer el contenido del archivo
        contents = await file.read()
        decoded = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        mediciones_creadas = 0
        
        for row in csv_reader:
            # Campos fijos (hasta VDOP)
            # Parsear fecha - ajustar formato según tu CSV
            fecha_str = row.get('Time', '')
            try:
                # Formato: 07/25/2026 14:54:21.000 GMT+02:00
                fecha_hora = datetime.strptime(fecha_str.split(' GMT')[0], '%m/%d/%Y %H:%M:%S.%f')
            except:
                fecha_hora = datetime.now()
            
            # Campos adicionales (desde Satellites in View en adelante)
            campos_fijos = [
                'ID', 'Remarks', 'Time', 'Geometry', 'Latitude', 'Longitude',
                'X', 'Y', 'Elevation', 'Ortho Height', 'Instrument Ht',
                'Fix ID', 'Speed', 'Bearing', 'Horizontal Accuracy',
                'Vertical Accuracy', 'PDOP', 'HDOP', 'VDOP'
            ]
            
            # Todo lo demás va a datos_adicionales
            datos_adicionales = {k: v for k, v in row.items() if k not in campos_fijos}
            
            medida = Medida(
                id_proyecto=id_proyecto,
                numero_medicion=float(row.get('ID', 0)),
                observaciones=row.get('Remarks'),
                fecha_hora=fecha_hora,
                latitud=float(row.get('Latitude', 0)),
                longitud=float(row.get('Longitude', 0)),
                x=float(row.get('X', 0)),
                y=float(row.get('Y', 0)),
                elevacion=float(row.get('Elevation', 0)) if row.get('Elevation') else None,
                altura_ortometrica=float(row.get('Ortho Height', 0)) if row.get('Ortho Height') else None,
                altura_instrumento=float(row.get('Instrument Ht', 0)) if row.get('Instrument Ht') else None,
                fix_id=float(row.get('Fix ID', 0)) if row.get('Fix ID') else None,
                velocidad=float(row.get('Speed', 0)) if row.get('Speed') else None,
                rumbo=float(row.get('Bearing', 0)) if row.get('Bearing') else None,
                precision_horizontal=float(row.get('Horizontal Accuracy', 0)) if row.get('Horizontal Accuracy') else None,
                precision_vertical=float(row.get('Vertical Accuracy', 0)) if row.get('Vertical Accuracy') else None,
                pdop=float(row.get('PDOP', 0)) if row.get('PDOP') else None,
                hdop=float(row.get('HDOP', 0)) if row.get('HDOP') else None,
                vdop=float(row.get('VDOP', 0)) if row.get('VDOP') else None,
                datos_adicionales=datos_adicionales
            )
            session.add(medida)
            mediciones_creadas += 1
        
        session.commit()
        
        # Generar polígono automáticamente si hay al menos 3 mediciones
        if mediciones_creadas >= 3:
            # Obtener todas las mediciones del proyecto ordenadas
            statement = select(Medida).where(Medida.id_proyecto == id_proyecto).order_by(Medida.numero_medicion)
            mediciones = session.exec(statement).all()
            
            # Crear lista de coordenadas (longitud, latitud)
            coordenadas = [(medida.longitud, medida.latitud) for medida in mediciones]
            
            # Cerrar el polígono si no está cerrado
            if coordenadas[0] != coordenadas[-1]:
                coordenadas.append(coordenadas[0])
            
            # Crear el polígono usando Shapely y guardarlo en el proyecto
            poligono_shapely = Polygon(coordenadas)
            proyecto = session.get(Proyecto, id_proyecto)
            if proyecto:
                proyecto.poligono = from_shape(poligono_shapely, srid=4326)
                session.add(proyecto)
                session.commit()
        
        return {
            "mensaje": f"Se importaron {mediciones_creadas} mediciones correctamente",
            "mediciones_creadas": mediciones_creadas,
            "id_proyecto": id_proyecto,
            "poligono_generado": mediciones_creadas >= 3
        }
        
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el archivo CSV: {str(e)}"
        )

