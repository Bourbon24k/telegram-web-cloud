# Telegram Cloud Storage

A cloud storage application that uses Telegram as the storage backend. Built with FastAPI (Python) and React (TypeScript).

## Features

- **Unlimited Storage**: Uses Telegram's file storage capabilities.
- **Modern UI**: Clean, responsive interface similar to Yandex Disk / Google Drive.
- **Secure**: Login verification via Telegram bot.
- **File Management**: Upload, download, rename, delete, and organize files.

## Tech Stack

- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, Aiogram (Telegram Bot API)
- **Frontend**: React, Vite, TailwindCSS (assumed based on UI)
- **Database**: SQLite (local) / PostgreSQL (production ready)

## Prerequisites

- Python 3.10+
- Node.js 18+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Telegram API ID and Hash (from [my.telegram.org](https://my.telegram.org))

## Setup

### 1. Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `backend` directory:
   ```env
   BOT_TOKEN=your_bot_token_here
   API_ID=your_api_id
   API_HASH=your_api_hash
   SESSION_STRING=your_telethon_session_string
   # Optional:
   DATABASE_URL=sqlite:///./cloud.db
   ENCRYPTION_KEY=your_secrey_key
   ```
   *Note: `API_ID`, `API_HASH`, and `SESSION_STRING` might be needed depending on specific implementation details for MTProto.*

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open `http://localhost:5173` (or the port shown by Vite).
2. Login using the Telegram bot authentication flow.
3. Start uploading files!

## License

MIT
