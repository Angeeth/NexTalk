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

# Quick Start

## Install all dependencies

### Backend
cd backend
pip install -r requirements.txt

### Frontend
cd ../frontend
npm install

### Root
cd ..
npm install

---

# Run Full Application

From the root NexTalk folder run:

```bash
npm start
```

This will automatically start:

- FastAPI backend
- React frontend

---

# LAN Access

To use NexTalk on other devices connected to the same WiFi/LAN:

Open the frontend network URL shown in terminal:

Example:

http://YOUR-IP:5173
