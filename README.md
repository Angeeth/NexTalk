# NexTalk

NexTalk is a modern LAN chat application built using React + FastAPI + WebSockets.

It supports:

- Real-time group chat
- Private messaging
- Encrypted local message storage
- 24-hour temporary message storage

---

# Tech Stack

Frontend:
- React
- Tailwind CSS
- CryptoJS

Backend:
- FastAPI
- WebSockets
- bcrypt

---

# Features

## Real-time Chat
Messages are instantly delivered using WebSockets.

## Group Chat
Everyone connected on the LAN can chat together.

## Private Messaging
Users can send direct messages privately.

## Password Authentication
Passwords are securely hashed using bcrypt and stored on backend.

## Encrypted Local Storage
Messages stored in browser localStorage are AES encrypted.

## Auto Message Expiry
Messages older than 24 hours are automatically deleted.


---

# Backend Setup

## Install Python dependencies:

pip install -r requirements.txt

## Run FastAPI server:

uvicorn main:app --reload --host 0.0.0.0 --port 8000

## Backend will run on:

http://localhost:8000

---

# Frontend Setup

## Install frontend dependencies:

npm install

## Run React frontend:

npm run dev

## Frontend will run on:

http://localhost:5173
