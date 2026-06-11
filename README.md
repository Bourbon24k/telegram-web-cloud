# 🌌 Yuku Cloud Storage

[English](#english) | [Русский](#russian)

---

<a id="english"></a>
## English

# 🌌 Yuku Cloud Storage

A premium, state-of-the-art cloud storage application that leverages **Telegram as a storage backend**. Built with performance and user experience in mind.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)

### ✨ Features

- **🛡️ Secure Encryption**: All file chunks are encrypted with AES-256 before being sent to Telegram.
- **🚀 Unlimited Storage**: Store files in your private Telegram channel storage.
- **💎 Premium UI**: Modern, fluid interface with support for **Light/Dark mode**, **Grid/List views**, and smooth animations.
- **📱 Telegram Web App Integration**: Log in seamlessly via a Telegram Bot or use it directly as a Telegram Mini App.
- **🔗 Smart Sharing**: Generate secure, hash-based sharing links with a dedicated landing page for public downloads.
- **📊 Real-time Upload Monitor**: Track upload speed, ETA, and progress with a detailed dashboard.
- **📁 Multi-format Support**: Integrated previews for images, videos, and common file types.

### 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, Aiogram 3.x (Bot API).
- **Database**: SQLite (local) / PostgreSQL (production).
- **Deployment**: Optimized for Vercel (Frontend & Serverless Functions).

### 🚀 Getting Started

#### Prerequisites

1.  **Telegram Bot**: Create one via [@BotFather](https://t.me/BotFather) and get the `BOT_TOKEN`.
2.  **Storage Channel**: Create a private channel/group and add your bot as an administrator. Get the `CHANNEL_ID` (looks like `-100...`).

#### Backend Setup

1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Create and activate a virtual environment:
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure environment variables:
    ```bash
    cp .env.example .env
    # Edit .env with your credentials
    ```
5.  Launch the server:
    ```bash
    uvicorn main:app --reload
    ```

#### Frontend Setup

1.  Navigate to the `frontend` folder:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment:
    ```bash
    cp .env.example .env
    # Usually VITE_API_URL=http://localhost:8000 for local dev
    ```
4.  Start development server:
    ```bash
    npm run dev
    ```

### 🌍 Deployment (Vercel)

This project is pre-configured for **Vercel**. 

1.  Connect your repository to Vercel.
2.  Set the `vercel.json` as the root configuration.
3.  Define Environment Variables in the Vercel Dashboard (same as in `.env.example`).
4.  Vercel will automatically handle the Python backend via Serverless Functions and serve the React frontend.

### 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<a id="russian"></a>
## Русский

# 🌌 Yuku Cloud Storage

Премиум облачное хранилище нового поколения, использующее **Telegram в качестве бэкенда для хранения**. Разработано с ориентацией на производительность и удобство пользователя.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)

### ✨ Возможности

- **🛡️ Безопасное шифрование**: Все блоки файлов шифруются с использованием AES-256 перед отправкой в Telegram.
- **🚀 Неограниченное хранилище**: Сохраняйте файлы в приватном канале Telegram.
- **💎 Премиум интерфейс**: Современный, плавный интерфейс с поддержкой **светлой/тёмной темы**, **сеточного/списочного вида** и гладких анимаций.
- **📱 Интеграция Telegram Web App**: Бесшовный вход через Telegram Bot или использование в качестве Telegram Mini App.
- **🔗 Умное расширение доступа**: Генерируйте безопасные ссылки на основе хешей с выделенной страницей для публичной загрузки.
- **📊 Мониторинг загрузки в реальном времени**: Отслеживайте скорость, оставшееся время и прогресс с подробной панелью.
- **📁 Поддержка множества форматов**: Встроенный предпросмотр изображений, видео и других типов файлов.

### 🛠️ Технический стек

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, Aiogram 3.x (Bot API).
- **База данных**: SQLite (локально) / PostgreSQL (продакшн).
- **Развёртывание**: Оптимизировано для Vercel (Frontend & Serverless Functions).

### 🚀 Начало работы

#### Требования

1.  **Telegram Bot**: Создайте через [@BotFather](https://t.me/BotFather) и получите `BOT_TOKEN`.
2.  **Канал для хранения**: Создайте приватный канал/группу и добавьте туда бота администратором. Получите `CHANNEL_ID` (выглядит как `-100...`).

#### Настройка Backend

1.  Перейдите в папку `backend`:
    ```bash
    cd backend
    ```
2.  Создайте и активируйте виртуальное окружение:
    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```
3.  Установите зависимости:
    ```bash
    pip install -r requirements.txt
    ```
4.  Настройте переменные окружения:
    ```bash
    cp .env.example .env
    # Отредактируйте .env с вашими данными
    ```
5.  Запустите сервер:
    ```bash
    uvicorn main:app --reload
    ```

#### Настройка Frontend

1.  Перейдите в папку `frontend`:
    ```bash
    cd frontend
    ```
2.  Установите зависимости:
    ```bash
    npm install
    ```
3.  Настройте окружение:
    ```bash
    cp .env.example .env
    # Обычно VITE_API_URL=http://localhost:8000 для локальной разработки
    ```
4.  Запустите dev сервер:
    ```bash
    npm run dev
    ```

### 🌍 Развёртывание (Vercel)

Проект предварительно настроен для **Vercel**.

1.  Подключите ваш репозиторий к Vercel.
2.  Установите `vercel.json` как конфигурацию корня.
3.  Определите Environment Variables в Vercel Dashboard (те же, что в `.env.example`).
4.  Vercel автоматически обработает Python backend через Serverless Functions и обслужит React frontend.

### 📜 Лицензия

Распространяется под лицензией MIT. Подробнее см. `LICENSE`.

---

*Создано с ❤️ для сообщества Telegram.*
