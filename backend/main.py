from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict
import json
import time
import os
import hashlib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    for user, connection in active_users.items():

        try:
            await connection.send_text(json.dumps(payload))

        except:
            disconnected.append(user)

    for user in disconnected:
        del active_users[user]


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

                for user, connection in active_users.items():

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
