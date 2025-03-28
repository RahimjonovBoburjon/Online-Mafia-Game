import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where, addDoc, getDocs } from 'firebase/firestore'
import { io } from 'socket.io-client'
import { db } from '../firebase'
import { auth } from '../firebase'

export const useGameStore = defineStore('game', () => {
  const db = getFirestore()
  const socket = io('http://localhost:3000', {
    withCredentials: true,
    transports: ['websocket', 'polling']
  })
  
  const currentGame = ref(null)
  const players = ref([])
  const gamePhase = ref('waiting')
  const currentPlayer = ref(null)
  const messages = ref([])
  const activeGames = ref([])

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

  const getUserGame = async (userId) => {
    const gamesRef = collection(db, 'games')
    const q = query(gamesRef, where('players', 'array-contains', { id: userId }))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() }
  }

  const createGame = async (hostId) => {
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
  }

  const joinGame = async (gameId, userId) => {
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
  }

  const startGame = async (gameId) => {
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

    return true
  }

  const assignRoles = (playerCount) => {
    const roles = []
    
    const mafiaCount = Math.floor(playerCount / 3)
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

  const subscribeToGame = (gameId) => {
    const gameRef = doc(db, 'games', gameId)
    return onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        currentGame.value = doc.data()
        players.value = doc.data().players
        gamePhase.value = doc.data().phase
        messages.value = doc.data().messages
      }
    })
  }

  const sendMessage = async (gameId, message) => {
    const gameRef = doc(db, 'games', gameId)
    const gameDoc = await getDoc(gameRef)
    
    if (gameDoc.exists()) {
      const game = gameDoc.data()
      await updateDoc(gameRef, {
        messages: [...game.messages, {
          playerId: currentPlayer.value.id,
          playerName: currentPlayer.value.displayName,
          content: message,
          timestamp: new Date()
        }]
      })
    }
  }

  const performNightAction = async (gameId, action, targetId) => {
    socket.emit('nightAction', { gameId, playerId: currentPlayer.value.id, action, targetId })
  }

  const votePlayer = async (gameId, targetId) => {
    socket.emit('vote', { gameId, voterId: currentPlayer.value.id, targetId })
  }

  return {
    currentGame,
    players,
    gamePhase,
    currentPlayer,
    messages,
    activeGames,
    createGame,
    joinGame,
    startGame,
    subscribeToGame,
    subscribeToGames,
    getUserGame,
    sendMessage,
    performNightAction,
    votePlayer
  }
}) 