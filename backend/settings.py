
import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cloud.db")
CHANNEL_ID = os.getenv("CHANNEL_ID")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "default-insecure-key-change-me-1234")
