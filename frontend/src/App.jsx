import { useEffect, useRef, useState } from 'react'
import CryptoJS from 'crypto-js'

const SECRET_KEY = 'nextalk-secret-key'

function App() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [currentUser, setCurrentUser] = useState('')
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('Group Chat')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)


useEffect(() => {
  const savedMessages = localStorage.getItem('nextalk_messages')

  if (savedMessages) {
    const parsed = JSON.parse(savedMessages)

    const EXPIRY_HOURS = 24

    const validMessages = parsed.filter((msg) => {
      return (
        Date.now() - msg.timestamp <
        EXPIRY_HOURS * 60 * 60 * 1000
      )
    })

    localStorage.setItem(
      'nextalk_messages',
      JSON.stringify(validMessages)
    )

    const decrypted = validMessages.map((msg) => ({
      ...msg,
      message: CryptoJS.AES.decrypt(
        msg.message,
        SECRET_KEY
      ).toString(CryptoJS.enc.Utf8),
    }))

    setMessages(decrypted)
  }
}, [])

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: 'smooth',
  })
}, [messages])


  const saveMessage = (msg) => {
    const encrypted = {
      ...msg,
      message: CryptoJS.AES.encrypt(msg.message, SECRET_KEY).toString(),
    }

    const existing = JSON.parse(
      localStorage.getItem('nextalk_messages') || '[]'
    )

    localStorage.setItem(
      'nextalk_messages',
      JSON.stringify([...existing, encrypted])
    )
  }

const connectWebSocket = async () => {

  if (!username.trim() || !password.trim()) return

  const cleanUsername = username.trim()

  try {

    const response = await fetch(
      `http://${window.location.hostname}:8000/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
        }),
      }
    )

    const result = await response.json()

    if (!result.success) {
      alert(result.message)
      return
    }

    setCurrentUser(cleanUsername)

    const socket = new WebSocket(
      `ws://${window.location.hostname}:8000/ws/${cleanUsername}`
    )

    socket.onopen = () => {
      console.log('Connected')
    }

    socket.onmessage = (event) => {

      const data = JSON.parse(event.data)

      if (data.type === 'users') {

        setUsers(
          data.users.filter(
            (u) => u !== cleanUsername
          )
        )
      }

      if (
        data.type === 'group_message' ||
        data.type === 'private_message'
      ) {

        const newMessage = {
          ...data,
          timestamp: Date.now(),
        }

        setMessages((prev) => [
          ...prev,
          newMessage,
        ])

        saveMessage(newMessage)
      }
    }

    socketRef.current = socket

  } catch (error) {

    console.log(error)

    alert('Server connection failed')
  }
}

  const sendMessage = () => {
    if (!message.trim()) return

    if (selectedUser === 'Group Chat') {
      socketRef.current.send(
        JSON.stringify({
          type: 'group_message',
          message,
        })
      )
    } else {
      socketRef.current.send(
        JSON.stringify({
          type: 'private_message',
          receiver: selectedUser,
          message,
        })
      )
    }

    setMessage('')
  }

  const filteredMessages = messages.filter((msg) => {
    if (selectedUser === 'Group Chat') {
      return msg.type === 'group_message'
    }

    return (
      msg.type === 'private_message' &&
      ((msg.sender === currentUser &&
        msg.receiver === selectedUser) ||
        (msg.sender === selectedUser &&
          msg.receiver === currentUser))
    )
  })

  if (!currentUser) {
    return (
      <div className="h-screen w-full bg-[#05070d] flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 shadow-2xl overflow-hidden">
          
          <div className="h-2 bg-gradient-to-r from-red-600 via-blue-500 to-cyan-400"></div>

          <div className="p-10">

            <div className="mb-10 text-center">
              <h1 className="text-6xl font-black tracking-tight">
                NexTalk
              </h1>
            </div>

            <input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-14 bg-[#05070d] border border-blue-900 px-5 outline-none text-cyan-300 text-lg focus:border-cyan-400"
            />
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 mt-4 bg-[#05070d] border border-blue-900 px-5 outline-none text-cyan-300 text-lg focus:border-cyan-400"
            />
            <button
              onClick={connectWebSocket}
              className="w-full h-14 mt-5 bg-gradient-to-r from-red-600 to-blue-600 font-bold tracking-[2px] hover:brightness-125 transition-all"
            >
              CONNECT
            </button>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-[#05070d] flex overflow-hidden text-white">

      {/* Sidebar */}
      <div className="w-[320px] bg-[#0b0f19] border-r border-slate-800 flex flex-col">

        <div className="h-2 bg-gradient-to-r from-red-600 to-cyan-400"></div>

        <div className="p-6 border-b border-slate-800">

          <h1 className="text-4xl font-black">
            NexTalk
          </h1>

          <div className="mt-5 bg-[#05070d] border border-slate-800 p-4">
            <p className="text-slate-500 text-xs tracking-[2px]">
              YOU
            </p>

            <p className="text-cyan-300 text-2xl font-bold mt-2">
              {currentUser}
            </p>
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-5">

          <button
            onClick={() => setSelectedUser('Group Chat')}
            className={`w-full p-4 text-left border transition-all mb-5 ${
              selectedUser === 'Group Chat'
                ? 'border-cyan-400 bg-blue-950/30'
                : 'border-slate-800 bg-[#111827]'
            }`}
          >
            <p className="font-bold text-lg">
              Group Chat
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Everyone
            </p>
          </button>

          <p className="text-slate-500 text-xs tracking-[3px] mb-4">
            ONLINE USERS
          </p>

          <div className="space-y-3">
            {users.length > 0 ? (
              users.map((user, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-4 border text-left transition-all ${
                    selectedUser === user
                      ? 'border-red-500 bg-red-950/20'
                      : 'border-slate-800 bg-[#111827]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">
                        {user}
                      </p>

                      <p className="text-slate-500 text-sm">
                        Online
                      </p>
                    </div>

                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-slate-500 text-sm">
                No users online
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <div className="h-24 bg-[#0b0f19] border-b border-slate-800 px-8 flex items-center justify-between">

          <div>
            <h2 className="text-3xl font-black">
              {selectedUser}
            </h2>
          </div>

          <div className="flex gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>

        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#05070d]">

          {filteredMessages.map((msg, index) => {
            const isMine = msg.sender === currentUser

            return (
              <div
                key={index}
                className={`flex ${
                  isMine ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="max-w-[70%]">

                  <p
                    className={`mb-2 text-xs tracking-[2px] ${
                      isMine
                        ? 'text-right text-cyan-400'
                        : 'text-left text-red-400'
                    }`}
                  >
                    {msg.sender}
                  </p>

                  <div
                    className={`px-5 py-4 border ${
                      isMine
                        ? 'bg-gradient-to-r from-blue-700 to-cyan-600 border-cyan-400'
                        : 'bg-[#111827] border-red-800'
                    }`}
                  >
                    <p className="text-[18px] leading-relaxed break-words">
                      {msg.message}
                    </p>
                  </div>

                </div>
              </div>
            )
          })}
        <div ref={messagesEndRef}></div>
        </div>

        {/* Input */}
        <div className="p-6 bg-[#0b0f19] border-t border-slate-800 flex gap-4">

          <input
            type="text"
            placeholder={`Message ${selectedUser}`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessage()
              }
            }}
            className="flex-1 h-14 bg-[#05070d] border border-blue-900 px-5 text-lg outline-none text-cyan-300 focus:border-cyan-400"
          />

          <button
            onClick={sendMessage}
            className="h-14 px-10 bg-gradient-to-r from-red-600 to-blue-600 font-bold tracking-[2px] hover:brightness-125 transition-all"
          >
            SEND
          </button>

        </div>
      </div>
    </div>
  )
}

export default App