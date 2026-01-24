
import asyncio
import logging
import random
import string
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from sqlalchemy.orm import Session
from database import User, SessionLocal
from settings import BOT_TOKEN

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
    
    await message.answer(
        f"Добро пожаловать в TG Cloud!\n\n"
        f"Ваш код для входа на сайт: `{code}`\n\n"
        f"Введите этот код в веб-интерфейсе."
    )
    db.close()

async def start_bot():
    print("Бот запущен...")
    await dp.start_polling(bot)

async def stop_bot():
    await bot.session.close()
