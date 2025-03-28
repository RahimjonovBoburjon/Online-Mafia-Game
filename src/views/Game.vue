<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-4xl mx-auto">
      <div v-if="loading" class="text-center">
        Loading game...
      </div>
      
      <div v-else-if="error" class="bg-red-500 text-white p-4 rounded-lg">
        {{ error }}
      </div>
      
      <div v-else-if="game" class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-3xl font-bold">Game #{{ game.id.slice(0, 6) }}</h1>
          <div class="text-sm text-gray-400">
            Phase: {{ game.phase }}
          </div>
        </div>

        <!-- Players -->
        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Players</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
              v-for="player in game.players"
              :key="player.id"
              class="bg-gray-700 p-4 rounded-lg"
            >
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full" :class="{
                  'bg-green-500': player.isAlive,
                  'bg-red-500': !player.isAlive
                }"></span>
                <span>{{ player.displayName }}</span>
              </div>
              <div v-if="!player.isAlive" class="text-sm text-red-400 mt-1">
                Eliminated
              </div>
            </div>
          </div>
        </div>

        <!-- Chat -->
        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Chat</h2>
          <div class="h-64 overflow-y-auto mb-4 space-y-2">
            <div
              v-for="message in messages"
              :key="message.timestamp"
              class="bg-gray-700 p-2 rounded-lg"
            >
              <span class="font-semibold">{{ message.playerName }}:</span>
              <span class="ml-2">{{ message.content }}</span>
            </div>
          </div>
          <div class="flex space-x-2">
            <input
              v-model="newMessage"
              @keyup.enter="sendMessage"
              type="text"
              placeholder="Type a message..."
              class="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="sendMessage"
              class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition duration-300"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const gameStore = useGameStore()

const loading = ref(true)
const error = ref(null)
const game = ref(null)
const messages = ref([])
const newMessage = ref('')

onMounted(async () => {
  try {
    const gameId = route.params.id
    if (!gameId) {
      throw new Error('Game ID not found')
    }

    // O'yin ma'lumotlarini olish
    const userGame = await gameStore.getUserGame(authStore.currentUser.uid)
    if (!userGame || userGame.id !== gameId) {
      throw new Error('You are not part of this game')
    }

    // O'yin ma'lumotlariga obuna bo'lish
    gameStore.subscribeToGame(gameId)

    // O'yin ma'lumotlarini kuzatish
    game.value = gameStore.currentGame
    messages.value = gameStore.messages
  } catch (err) {
    console.error('Error loading game:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  gameStore.unsubscribeFromGame()
})

const sendMessage = async () => {
  if (!newMessage.value.trim()) return

  try {
    await gameStore.sendMessage(route.params.id, {
      playerId: authStore.currentUser.uid,
      playerName: authStore.currentUser.displayName,
      content: newMessage.value,
      timestamp: new Date()
    })
    newMessage.value = ''
  } catch (err) {
    console.error('Error sending message:', err)
    error.value = err.message
  }
}
</script> 