import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
# from database import Base, User, FileMetadata, FileChunk 
# from settings import DATABASE_URL
from bot import bot, start_bot, stop_bot, dp
from routers import auth, files

# Bot task reference
bot_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start bot polling in background
    global bot_task
    print("Starting Telegram bot...")
    bot_task = asyncio.create_task(dp.start_polling(bot))
    yield
    # Shutdown: Stop bot
    print("Stopping Telegram bot...")
    if bot_task:
        bot_task.cancel()
        try:
            await bot_task
        except asyncio.CancelledError:
            pass
    await bot.session.close()

# Vercel deployment: Set root_path if running in Vercel
root_path = "/api" if os.getenv("VERCEL") else ""
app = FastAPI(title="TG Cloud Storage", root_path=root_path, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(files.router)

# Database
from database import init_db
init_db()

@app.get("/")
def read_root():
    return {"status": "ok", "service": "TG Cloud Backend"}
