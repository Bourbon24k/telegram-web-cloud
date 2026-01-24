
import asyncio
import logging
import random
import string
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy.orm import Session
from database import User, SessionLocal
from settings import BOT_TOKEN, WEBAPP_URL

# Логирование
logging.basicConfig(level=logging.INFO)

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# Хранилище кодов
login_codes = {}

def generate_code(length=5):
    return ''.join(random.choices(string.digits, k=length))

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    tg_id = message.from_user.id
    username = message.from_user.username
    
    db: Session = SessionLocal()
    # Используем tg_id как основной идентификатор
    user = db.query(User).filter(User.phone_number == str(tg_id)).first()
    
    if not user:
        user = User(phone_number=str(tg_id), is_authenticated=True)
        db.add(user)
        db.commit()
    
    # Генерация кода
    code = generate_code()
    
    # Save code to DB (Persistent)
    user.login_code = code
    db.commit()
    
    # In-memory backup (optional, can remove)
    login_codes[str(tg_id)] = code
    
    # WebApp URL (assuming running on same domain or specified)
    # For local dev, we might not have a public HTTPS url, but user can configure it.
    # We will use a placeholder or localhost if not set.
    # Ideally should be env var.
    # We'll rely on what the user probably has set up in BotFather.
    # But we can provide a direct button to open the app.
    
    markup = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="☁️ Открыть Yuku Cloud", web_app=WebAppInfo(url=WEBAPP_URL))] 
    ])
    # Note: URL above is placeholder. User needs to set this in BotFather or we use a valid one. 
    # Since we don't know the exact URL, we might skip the URL in code or ask user.
    # However, for a test, we can try to guess or just use the code flow. 
    # BUT, the request asked for "convenience". 
    # Providing a button that opens the webapp `web_app=WebAppInfo(url=...)` is the standard way.
    # Let's assume localhost if they are testing locally, but Telegram requires HTTPS for WebApps usually.
    # We will just add the button with a generic text, but we need a URL.
    # We'll use a placeholder variable that they should replace.
    
    # If we cannot determine URL, maybe just "Login via Link"? 
    # No, let's just update text first and add a "Magic Code" copyable.
    
    await message.answer(
        f"🌌 **Yuku Cloud**\n\n"
        f"Ваш код для входа: `{code}`\n\n"
        f"👇 Нажмите кнопку ниже, чтобы открыть облако.",
        parse_mode="Markdown",
        reply_markup=markup
    )
    db.close()

async def start_bot():
    print("Бот запущен...")
    await dp.start_polling(bot)

async def stop_bot():
    await bot.session.close()
