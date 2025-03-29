import { io } from 'socket.io-client'

const SOCKET_URL = 'http://192.168.1.48:3000'

export const createSocket = () => {
  return io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    path: '/socket.io/',
    extraHeaders: {
      'Access-Control-Allow-Origin': '*'
    }
  })
}

export const socket = createSocket()

// Socket event handlers
socket.on('connect', () => {
  console.log('Socket connected')
})

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error)
})

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason)
})

socket.on('error', (error) => {
  console.error('Socket error:', error)
})

export default socket 