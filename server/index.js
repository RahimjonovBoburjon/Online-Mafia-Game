const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  credentials: true
}))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  
  socket.on('joinGame', ({ gameId, playerId }) => {
    socket.join(gameId)
    const game = gameState.joinGame(gameId, playerId)
    if (game) {
      io.to(gameId).emit('gameUpdate', game)
    }
  })
  
  socket.on('startGame', ({ gameId }) => {
    const game = gameState.startGame(gameId)
    if (game) {
      io.to(gameId).emit('gameUpdate', game)
    }
  })
  
  socket.on('nightAction', ({ gameId, playerId, action, targetId }) => {
    const game = gameState.performNightAction(gameId, playerId, action, targetId)
    if (game) {
      io.to(gameId).emit('gameUpdate', game)
    }
  })
  
  socket.on('vote', ({ gameId, voterId, targetId }) => {
    const game = gameState.votePlayer(gameId, voterId, targetId)
    if (game) {
      io.to(gameId).emit('gameUpdate', game)
    }
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 