
import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cloud.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
CHANNEL_ID = os.getenv("CHANNEL_ID")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "default-insecure-key-change-me-1234")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://tg-cloud-test.vercel.app")
