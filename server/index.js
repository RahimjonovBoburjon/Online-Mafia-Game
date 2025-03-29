const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
const server = http.createServer(app)

// CORS sozlamalari
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:5173", "http://192.168.1.48:8080"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// Socket.io konfiguratsiyasi
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8080", "http://localhost:5173", "http://192.168.1.48:8080"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000
})

const games = new Map()

const gameState = {
  createGame(gameId, hostId) {
    games.set(gameId, {
      id: gameId,
      hostId,
      players: [{
        id: hostId,
        isAlive: true,
        role: null
      }],
      phase: 'waiting',
      votes: new Map(),
      nightActions: new Map()
    })
    return games.get(gameId)
  },

  joinGame(gameId, playerId) {
    const game = games.get(gameId)
    if (!game) return null
    
    if (game.players.length >= 8) return null
    if (game.players.find(p => p.id === playerId)) return null
    
    game.players.push({
      id: playerId,
      isAlive: true,
      role: null
    })
    
    return game
  },

  startGame(gameId) {
    const game = games.get(gameId)
    if (!game) return null
    
    if (game.players.length < 5) return null
    
    const roles = assignRoles(game.players.length)
    game.players = game.players.map((player, index) => ({
      ...player,
      role: roles[index]
    }))
    
    game.phase = 'night'
    return game
  },

  performNightAction(gameId, playerId, action, targetId) {
    const game = games.get(gameId)
    if (!game) return null
    
    if (game.phase !== 'night') return null
    
    const player = game.players.find(p => p.id === playerId)
    if (!player || !player.isAlive) return null
    
    game.nightActions.set(playerId, { action, targetId })
    
    const nightActionsComplete = checkNightActionsComplete(game)
    if (nightActionsComplete) {
      processNightActions(game)
    }
    
    return game
  },

  votePlayer(gameId, voterId, targetId) {
    const game = games.get(gameId)
    if (!game) return null
    
    if (game.phase !== 'day') return null
    
    const voter = game.players.find(p => p.id === voterId)
    if (!voter || !voter.isAlive) return null
    
    game.votes.set(voterId, targetId)
    
    const votesComplete = checkVotesComplete(game)
    if (votesComplete) {
      processVotes(game)
    }
    
    return game
  }
}

function assignRoles(playerCount) {
  const roles = []
  const mafiaCount = playerCount <= 6 ? 1 : 2
  
  for (let i = 0; i < mafiaCount; i++) {
    roles.push('mafia')
  }
  
  roles.push('doctor')
  roles.push('detective')
  
  while (roles.length < playerCount) {
    roles.push('civilian')
  }
  
  return roles.sort(() => Math.random() - 0.5)
}

function checkNightActionsComplete(game) {
  const alivePlayers = game.players.filter(p => p.isAlive)
  const requiredActions = alivePlayers.filter(p => 
    ['mafia', 'doctor', 'detective'].includes(p.role)
  )
  
  return requiredActions.every(player => 
    game.nightActions.has(player.id)
  )
}

function processNightActions(game) {
  const actions = Array.from(game.nightActions.entries())
  
  const doctorSave = actions.find(([_, action]) => action.action === 'save')
  if (doctorSave) {
    const [_, { targetId }] = doctorSave
    game.nightActions.delete(targetId)
  }
  
  const mafiaKills = actions.filter(([_, action]) => action.action === 'eliminate')
  if (mafiaKills.length > 0) {
    const [_, { targetId }] = mafiaKills[0]
    const target = game.players.find(p => p.id === targetId)
    if (target) {
      target.isAlive = false
    }
  }
  
  game.nightActions.clear()
  game.phase = 'day'
  
  checkWinCondition(game)
}

function checkVotesComplete(game) {
  const alivePlayers = game.players.filter(p => p.isAlive)
  return alivePlayers.every(player => game.votes.has(player.id))
}

function processVotes(game) {
  const votes = Array.from(game.votes.values())
  const voteCount = {}
  
  votes.forEach(targetId => {
    voteCount[targetId] = (voteCount[targetId] || 0) + 1
  })
  
  const targetId = Object.entries(voteCount)
    .sort(([_, a], [__, b]) => b - a)[0][0]
  
  const target = game.players.find(p => p.id === targetId)
  if (target) {
    target.isAlive = false
  }
  
  game.votes.clear()
  game.phase = 'night'
  
  checkWinCondition(game)
}

function checkWinCondition(game) {
  const alivePlayers = game.players.filter(p => p.isAlive)
  const aliveMafia = alivePlayers.filter(p => p.role === 'mafia')
  const aliveCivilians = alivePlayers.filter(p => p.role !== 'mafia')
  
  if (aliveMafia.length === 0) {
    game.phase = 'ended'
    game.winner = 'civilians'
  } else if (aliveMafia.length >= aliveCivilians.length) {
    game.phase = 'ended'
    game.winner = 'mafia'
  }
}

// Socket.io event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('game:message', (data) => {
    try {
      io.to(data.gameId).emit('game:message', {
        ...data,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Error handling game message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  socket.on('joinGame', (gameId) => {
    try {
      socket.join(gameId)
      console.log(`Client ${socket.id} joined game ${gameId}`)
      
      // O'yin ma'lumotlarini yangi o'yinchiga yuborish
      const game = games.get(gameId)
      if (game) {
        socket.emit('game:update', game)
      }
    } catch (error) {
      console.error('Error joining game:', error)
      socket.emit('error', { message: 'Failed to join game' })
    }
  })

  socket.on('leaveGame', (gameId) => {
    try {
      socket.leave(gameId)
      console.log(`Client ${socket.id} left game ${gameId}`)
    } catch (error) {
      console.error('Error leaving game:', error)
      socket.emit('error', { message: 'Failed to leave game' })
    }
  })

  socket.on('startGame', (gameId) => {
    try {
      const game = gameState.startGame(gameId)
      if (game) {
        // Barcha o'yinchilarga yangi o'yin holatini yuborish
        io.to(gameId).emit('game:update', game)
      }
    } catch (error) {
      console.error('Error starting game:', error)
      socket.emit('error', { message: 'Failed to start game' })
    }
  })

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, reason)
  })

  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
}) 