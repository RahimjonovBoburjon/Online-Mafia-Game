import { defineStore } from 'pinia'
import { ref } from 'vue'
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, addDoc, getDocs } from 'firebase/firestore'
import { db, auth } from '../services/firebase'
import socket from '../services/socket'

export const useGameStore = defineStore('game', () => {
  const currentGame = ref(null)
  const players = ref([])
  const gamePhase = ref('waiting')
  const currentPlayer = ref(null)
  const messages = ref([])
  const activeGames = ref([])
  const socketError = ref(null)
  let gameUnsubscribe = null

  const subscribeToGame = (gameId) => {
    try {
      // Agar oldingi subscription bo'lsa, uni to'xtatish
      if (gameUnsubscribe) {
        gameUnsubscribe()
      }

      const gameRef = doc(db, 'games', gameId)
      gameUnsubscribe = onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
          const gameData = doc.data()
          currentGame.value = { id: doc.id, ...gameData }
          players.value = gameData.players
          gamePhase.value = gameData.phase
          messages.value = gameData.messages || []
        }
      })

      // Socket.io orqali o'yin xabarlarini tinglash
      socket.emit('joinGame', gameId)
      
      // O'yin yangilanishlarini tinglash
      socket.on('game:update', (gameData) => {
        currentGame.value = gameData
        players.value = gameData.players
        gamePhase.value = gameData.phase
        messages.value = gameData.messages || []
      })

      // Xabarlarni tinglash
      socket.on('game:message', (message) => {
        if (message.gameId === gameId) {
          messages.value.push(message)
        }
      })

      return gameUnsubscribe
    } catch (error) {
      console.error('Failed to subscribe to game:', error)
      throw error
    }
  }

  const unsubscribeFromGame = () => {
    if (gameUnsubscribe) {
      gameUnsubscribe()
      gameUnsubscribe = null
    }
    socket.off('game:message')
    socket.off('game:update')
  }

  const subscribeToGames = (callback) => {
    const gamesRef = collection(db, 'games')
    const q = query(gamesRef, where('phase', '==', 'waiting'))
    
    return onSnapshot(q, (snapshot) => {
      const games = []
      snapshot.forEach((doc) => {
        games.push({ id: doc.id, ...doc.data() })
      })
      activeGames.value = games
      if (callback) callback(games)
    })
  }

  const createGame = async (hostId) => {
    try {
      const gamesRef = collection(db, 'games')
      const gameData = {
        hostId,
        players: [{
          id: hostId,
          displayName: auth.currentUser.displayName,
          isAlive: true
        }],
        phase: 'waiting',
        createdAt: new Date()
      }

      const docRef = await addDoc(gamesRef, gameData)
      return docRef.id
    } catch (error) {
      console.error('Failed to create game:', error)
      throw error
    }
  }

  const joinGame = async (gameId, userId) => {
    try {
      const gameRef = doc(db, 'games', gameId)
      const gameDoc = await getDoc(gameRef)
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found')
      }

      const game = gameDoc.data()
      if (game.phase !== 'waiting') {
        throw new Error('Game has already started')
      }

      if (game.players.length >= 8) {
        throw new Error('Game is full')
      }

      if (game.players.some(p => p.id === userId)) {
        throw new Error('Already in this game')
      }

      await updateDoc(gameRef, {
        players: [...game.players, {
          id: userId,
          displayName: auth.currentUser.displayName,
          isAlive: true
        }]
      })

      return true
    } catch (error) {
      console.error('Failed to join game:', error)
      throw error
    }
  }

  const startGame = async (gameId) => {
    try {
      const gameRef = doc(db, 'games', gameId)
      const gameDoc = await getDoc(gameRef)
      
      if (!gameDoc.exists()) {
        throw new Error('Game not found')
      }

      const game = gameDoc.data()
      if (game.phase !== 'waiting') {
        throw new Error('Game has already started')
      }

      if (game.players.length < 5) {
        throw new Error('Not enough players to start')
      }

      // Assign roles randomly
      const players = [...game.players]
      const roles = assignRoles(players.length)
      
      for (let i = 0; i < players.length; i++) {
        players[i].role = roles[i]
      }

      await updateDoc(gameRef, {
        phase: 'night',
        players,
        currentRound: 1,
        lastAction: new Date()
      })

      // Socket.io orqali o'yinni boshlash
      socket.emit('startGame', gameId)

      return true
    } catch (error) {
      console.error('Failed to start game:', error)
      throw error
    }
  }

  const getUserGame = async (userId) => {
    try {
      const gamesRef = collection(db, 'games')
      // O'yinchilarni tekshirish uchun so'rov
      const q = query(
        gamesRef,
        where('players', 'array-contains', { id: userId, isAlive: true })
      )
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        // Agar o'yin topilmasa, barcha o'yinlarni tekshirish
        const allGamesQuery = query(gamesRef)
        const allGamesSnapshot = await getDocs(allGamesQuery)
        
        for (const doc of allGamesSnapshot.docs) {
          const gameData = doc.data()
          if (gameData.players.some(p => p.id === userId)) {
            return { id: doc.id, ...gameData }
          }
        }
        
        return null
      }

      const doc = snapshot.docs[0]
      return { id: doc.id, ...doc.data() }
    } catch (error) {
      console.error('Failed to get user game:', error)
      throw error
    }
  }

  const assignRoles = (playerCount) => {
    const roles = []
    
    // Add mafia roles
    const mafiaCount = Math.floor(playerCount / 3)
    for (let i = 0; i < mafiaCount; i++) {
      roles.push('mafia')
    }
    
    // Add doctor
    roles.push('doctor')
    
    // Add detective
    roles.push('detective')
    
    // Fill remaining with civilians
    while (roles.length < playerCount) {
      roles.push('civilian')
    }
    
    // Shuffle roles
    return roles.sort(() => Math.random() - 0.5)
  }

  const sendMessage = (gameId, message) => {
    try {
      if (!socket.connected) {
        throw new Error('Socket is not connected')
      }
      socket.emit('game:message', { gameId, message })
    } catch (error) {
      console.error('Failed to send message:', error)
      socketError.value = error.message
      throw error
    }
  }

  return {
    currentGame,
    players,
    gamePhase,
    currentPlayer,
    messages,
    activeGames,
    socketError,
    subscribeToGames,
    subscribeToGame,
    unsubscribeFromGame,
    createGame,
    joinGame,
    startGame,
    getUserGame,
    sendMessage
  }
}) 