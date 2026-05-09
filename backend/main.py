from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Dict
import json
import time
import os
import hashlib
from pathlib import Path
import threading

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"

FILE_EXPIRY_HOURS = 24

FILE_EXPIRY_SECONDS = (
    FILE_EXPIRY_HOURS * 60 * 60
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

USERS_FILE = "users.json"

if not os.path.exists(USERS_FILE):
    with open(USERS_FILE, "w") as f:
        json.dump({}, f)


active_users: Dict[str, WebSocket] = {}


def load_users():
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


class LoginData(BaseModel):
    username: str
    password: str


@app.post("/login")
async def login(data: LoginData):

    users = load_users()

    username = data.username.strip()[:20]
    password = hash_password(data.password)

    current_time = time.time()

    expired_users = []

    for user, info in users.items():

        if current_time - info["timestamp"] > 86400:
            expired_users.append(user)

    for user in expired_users:
        del users[user]

    if username in users:

        if users[username]["password"] != password:

            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "message": "Wrong password"
                }
            )

    else:

        users[username] = {
            "password": password,
            "timestamp": current_time
        }

    save_users(users)

    return {
        "success": True
    }


async def broadcast_users():

    users = list(active_users.keys())

    payload = {
        "type": "users",
        "users": users
    }

    disconnected = []

    for user, connection in list(active_users.items()):

        try:
            await connection.send_text(json.dumps(payload))

        except:
            disconnected.append(user)

    for user in disconnected:
        del active_users[user]


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    sender: str = Form(...),
    receiver: str = Form(...),
    message_type: str = Form(...)
):

    safe_name = Path(file.filename).name
    filename = f"{int(time.time())}_{safe_name}"

    file_path = os.path.join(UPLOAD_FOLDER, filename)

    contents = await file.read()

    if len(contents) > 50 * 1024 * 1024:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "File too large"
            }
        )

    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    file_url = f"/uploads/{filename}"

    payload = {
        "type": "file_message",
        "sender": sender,
        "receiver": receiver,
        "file_name": file.filename,
        "file_url": file_url,
        "message_type": message_type,
        "timestamp": time.time()
    }

    if message_type == "group":

        for user, connection in list(active_users.items()):
            try:
                await connection.send_text(json.dumps(payload))
            except:
                del active_users[user]

    else:

        if receiver in active_users:
            await active_users[receiver].send_text(
                json.dumps(payload)
            )

        if sender in active_users:
            await active_users[sender].send_text(
                json.dumps(payload)
            )

    return {
        "success": True,
        "file_url": file_url
    }    


@app.websocket("/ws/{username}")
async def websocket_endpoint(
    websocket: WebSocket,
    username: str
):

    username = username.strip()[:20]

    await websocket.accept()

    if username in active_users:
        await websocket.close()
        return

    active_users[username] = websocket

    await broadcast_users()

    try:

        while True:

            data = await websocket.receive_text()
            data = json.loads(data)


            if data["type"] == "group_message":

                payload = {
                    "type": "group_message",
                    "sender": username,
                    "message": data["message"],
                    "timestamp": time.time()
                }

                disconnected = []

                for user, connection in list(active_users.items()):

                    try:
                        await connection.send_text(
                            json.dumps(payload)
                        )

                    except:
                        disconnected.append(user)

                for user in disconnected:
                    del active_users[user]


            elif data["type"] == "private_message":

                receiver = data["receiver"]

                payload = {
                    "type": "private_message",
                    "sender": username,
                    "receiver": receiver,
                    "message": data["message"],
                    "timestamp": time.time()
                }

                if receiver in active_users:

                    try:
                        await active_users[
                            receiver
                        ].send_text(json.dumps(payload))

                    except:
                        del active_users[receiver]

                try:
                    await websocket.send_text(
                        json.dumps(payload)
                    )

                except:
                    pass

    except WebSocketDisconnect:

        if username in active_users:
            del active_users[username]

        await broadcast_users()

def cleanup_old_files():

    while True:

        now = time.time()

        if not os.path.exists(UPLOAD_FOLDER):
            time.sleep(60)
            continue

        for filename in os.listdir(UPLOAD_FOLDER):

            file_path = os.path.join(
                UPLOAD_FOLDER,
                filename
            )

            try:

                if os.path.isfile(file_path):

                    file_age = (
                        now -
                        os.path.getmtime(file_path)
                    )

                    if file_age > FILE_EXPIRY_SECONDS:

                        os.remove(file_path)

                        print(
                            f"Deleted old file: {filename}"
                        )

            except Exception as e:

                print(
                    f"Cleanup error: {e}"
                )

        time.sleep(3600)

threading.Thread(
    target=cleanup_old_files,
    daemon=True
).start()