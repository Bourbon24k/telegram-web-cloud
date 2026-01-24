
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
# from database import Base, User, FileMetadata, FileChunk 
# from settings import DATABASE_URL
from bot import bot, start_bot, stop_bot
from routers import auth, files
import asyncio

app = FastAPI(title="TG Cloud Storage")

# Include Routers
app.include_router(auth.router)
app.include_router(files.router)

@app.on_event("startup")
async def startup_event():
    # Запуск бота в фоне (Polling)
    # Примечание: в продакшене лучше использовать Webhook или отдельный процесс
    import asyncio
    asyncio.create_task(start_bot())

@app.on_event("shutdown")
async def shutdown_event():
    await stop_bot()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database
from database import init_db
init_db()

@app.get("/")
def read_root():
    return {"status": "ok", "service": "TG Cloud Backend"}

# Placeholder for Auth routes

