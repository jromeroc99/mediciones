FROM python:3.12-slim

# Copiar ejecutable de uv desde la imagen oficial
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copiar definición de dependencias e instalarlas (aprovechando la caché de Docker)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

# Copiar el resto del código del proyecto
COPY . .

# Exponer el puerto predeterminado de FastAPI
EXPOSE 8000

# Ejecutar migraciones con Alembic y arrancar FastAPI
CMD ["sh", "-c", "uv run alembic upgrade head && uv run fastapi run main.py --port 8000 --host 0.0.0.0"]