# 🌌 Yuku Cloud Storage

A premium, state-of-the-art cloud storage application that leverages **Telegram as a storage backend**. Built with performance and user experience in mind.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688)
![React](https://img.shields.io/badge/Frontend-React-61DAFB)

## ✨ Features

- **🛡️ Secure Encryption**: All file chunks are encrypted with AES-256 before being sent to Telegram.
- **🚀 Unlimited Storage**: Store files in your private Telegram channel storage.
- **💎 Premium UI**: Modern, fluid interface with support for **Light/Dark mode**, **Grid/List views**, and smooth animations.
- **📱 Telegram Web App Integration**: Log in seamlessly via a Telegram Bot or use it directly as a Telegram Mini App.
- **🔗 Smart Sharing**: Generate secure, hash-based sharing links with a dedicated landing page for public downloads.
- **📊 Real-time Upload Monitor**: Track upload speed, ETA, and progress with a detailed dashboard.
- **📁 Multi-format Support**: Integrated previews for images, videos, and common file types.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Python 3.10+, FastAPI, SQLAlchemy, Aiogram 3.x (Bot API).
- **Database**: SQLite (local) / PostgreSQL (production).
- **Deployment**: Optimized for Vercel (Frontend & Serverless Functions).

## 🚀 Getting Started

### Prerequisites

1.  **Telegram Bot**: Create one via [@BotFather](https://t.me/BotFather) and get the `BOT_TOKEN`.
2.  **Storage Channel**: Create a private channel/group and add your bot as an administrator. Get the `CHANNEL_ID` (looks like `-100...`).

### Backend Setup

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

### Frontend Setup

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

## 🌍 Deployment (Vercel)

This project is pre-configured for **Vercel**. 

1.  Connect your repository to Vercel.
2.  Set the `vercel.json` as the root configuration.
3.  Define Environment Variables in the Vercel Dashboard (same as in `.env.example`).
4.  Vercel will automatically handle the Python backend via Serverless Functions and serve the React frontend.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Created with ❤️ for the Telegram community.*
