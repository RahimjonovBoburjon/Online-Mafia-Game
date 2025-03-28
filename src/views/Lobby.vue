<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Game Lobby</h1>
        <button
          @click="createNewGame"
          class="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition duration-300"
        >
          Create New Game
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Active Games</h2>
          <div v-if="activeGames.length === 0" class="text-gray-400">
            No active games. Create one to start playing!
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="game in activeGames"
              :key="game.id"
              class="bg-gray-700 p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <p class="font-semibold">Game #{{ game.id.slice(0, 6) }}</p>
                <p class="text-sm text-gray-400">
                  Players: {{ game.players.length }}/8
                </p>
              </div>
              <button
                @click="joinGame(game.id)"
                class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition duration-300"
              >
                Join Game
              </button>
            </div>
          </div>
        </div>

        <div v-if="currentGame" class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Your Game</h2>
          <div class="space-y-4">
            <div class="bg-gray-700 p-4 rounded-lg">
              <p class="font-semibold">Game #{{ currentGame.id.slice(0, 6) }}</p>
              <p class="text-sm text-gray-400">
                Players: {{ currentGame.players.length }}/8
              </p>
            </div>
            
            <div class="space-y-2">
              <h3 class="font-semibold">Players:</h3>
              <ul class="space-y-1">
                <li
                  v-for="player in currentGame.players"
                  :key="player.id"
                  class="flex items-center space-x-2"
                >
                  <span class="w-2 h-2 rounded-full" :class="{
                    'bg-green-500': player.isAlive,
                    'bg-red-500': !player.isAlive
                  }"></span>
                  <span>{{ player.displayName }}</span>
                </li>
              </ul>
            </div>

            <button
              v-if="isHost"
              @click="startGame"
              :disabled="currentGame.players.length < 5"
              class="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded transition duration-300"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'

const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

const activeGames = ref([])
const currentGame = ref(null)
const isHost = ref(false)
let unsubscribe = null

onMounted(async () => {
  const user = authStore.currentUser
  if (!user) {
    router.push('/login')
    return
  }

  unsubscribe = gameStore.subscribeToGames((games) => {
    activeGames.value = games
  })

  const userGame = await gameStore.getUserGame(user.uid)
  if (userGame) {
    currentGame.value = userGame
    isHost.value = userGame.hostId === user.uid
  }
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

const createNewGame = async () => {
  try {
    const gameId = await gameStore.createGame(authStore.currentUser.uid)
    currentGame.value = {
      id: gameId,
      hostId: authStore.currentUser.uid,
      players: [{
        id: authStore.currentUser.uid,
        displayName: authStore.currentUser.displayName,
        isAlive: true
      }],
      phase: 'waiting'
    }
    isHost.value = true
  } catch (error) {
    console.error('Failed to create game:', error)
  }
}

const joinGame = async (gameId) => {
  try {
    const success = await gameStore.joinGame(gameId, authStore.currentUser.uid)
    if (success) {
      router.push(`/game/${gameId}`)
    }
  } catch (error) {
    console.error('Failed to join game:', error)
  }
}

const startGame = async () => {
  if (!currentGame.value) return
  
  try {
    const success = await gameStore.startGame(currentGame.value.id)
    if (success) {
      router.push(`/game/${currentGame.value.id}`)
    }
  } catch (error) {
    console.error('Failed to start game:', error)
  }
}
</script> 