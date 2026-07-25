import uvicorn
from src.config import settings
from src.app.main import app


if __name__ == "__main__":
    uvicorn.run("src.app.main:app", host="0.0.0.0", port=8000, reload=True)
