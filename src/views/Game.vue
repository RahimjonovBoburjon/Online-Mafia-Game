<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold">Game #{{ gameId.slice(0, 6) }}</h1>
          <p class="text-gray-400">Phase: {{ gamePhase }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-400">Your Role: {{ currentPlayer?.role || 'Unknown' }}</p>
          <p class="text-sm text-gray-400">Alive Players: {{ alivePlayers.length }}/{{ players.length }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Players</h2>
          <div class="space-y-2">
            <div
              v-for="player in players"
              :key="player.id"
              class="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
              :class="{
                'opacity-50': !player.isAlive,
                'border-2 border-yellow-500': isCurrentPlayer(player)
              }"
            >
              <div class="flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full" :class="{
                  'bg-green-500': player.isAlive,
                  'bg-red-500': !player.isAlive
                }"></span>
                <span>{{ player.displayName }}</span>
              </div>
              <div v-if="canVote && player.isAlive && !isCurrentPlayer(player)">
                <button
                  @click="votePlayer(player.id)"
                  class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition duration-300"
                >
                  Vote
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Actions</h2>
          <div class="space-y-4">
            <div v-if="gamePhase === 'night' && isCurrentPlayerAlive">
              <div v-if="currentPlayer?.role === 'mafia'" class="space-y-2">
                <h3 class="font-semibold">Select a player to eliminate:</h3>
                <div class="space-y-2">
                  <button
                    v-for="player in alivePlayers"
                    :key="player.id"
                    @click="performNightAction('eliminate', player.id)"
                    class="w-full bg-red-600 hover:bg-red-700 p-2 rounded transition duration-300"
                    :disabled="!canPerformNightAction"
                  >
                    Eliminate {{ player.displayName }}
                  </button>
                </div>
              </div>

              <div v-if="currentPlayer?.role === 'doctor'" class="space-y-2">
                <h3 class="font-semibold">Select a player to save:</h3>
                <div class="space-y-2">
                  <button
                    v-for="player in alivePlayers"
                    :key="player.id"
                    @click="performNightAction('save', player.id)"
                    class="w-full bg-green-600 hover:bg-green-700 p-2 rounded transition duration-300"
                    :disabled="!canPerformNightAction"
                  >
                    Save {{ player.displayName }}
                  </button>
                </div>
              </div>

              <div v-if="currentPlayer?.role === 'detective'" class="space-y-2">
                <h3 class="font-semibold">Select a player to investigate:</h3>
                <div class="space-y-2">
                  <button
                    v-for="player in alivePlayers"
                    :key="player.id"
                    @click="performNightAction('investigate', player.id)"
                    class="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded transition duration-300"
                    :disabled="!canPerformNightAction"
                  >
                    Investigate {{ player.displayName }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="gamePhase === 'day'" class="space-y-2">
              <h3 class="font-semibold">Vote for a player to eliminate:</h3>
              <div class="space-y-2">
                <button
                  v-for="player in alivePlayers"
                  :key="player.id"
                  @click="votePlayer(player.id)"
                  class="w-full bg-red-600 hover:bg-red-700 p-2 rounded transition duration-300"
                  :disabled="!canVote"
                >
                  Vote for {{ player.displayName }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 p-6 rounded-lg">
          <h2 class="text-xl font-bold mb-4">Chat</h2>
          <div class="h-[400px] overflow-y-auto mb-4 space-y-2">
            <div
              v-for="message in messages"
              :key="message.id"
              class="bg-gray-700 p-2 rounded"
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
              class="flex-1 bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="sendMessage"
              class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition duration-300"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'

const route = useRoute()
const authStore = useAuthStore()
const gameStore = useGameStore()

const gameId = route.params.id
const newMessage = ref('')
let unsubscribe = null

const players = computed(() => gameStore.players)
const gamePhase = computed(() => gameStore.gamePhase)
const messages = computed(() => gameStore.messages)
const currentPlayer = computed(() => gameStore.currentPlayer)

const alivePlayers = computed(() => players.value.filter(p => p.isAlive))
const isCurrentPlayerAlive = computed(() => currentPlayer.value?.isAlive)
const canVote = computed(() => gamePhase.value === 'day' && isCurrentPlayerAlive.value)
const canPerformNightAction = computed(() => {
  if (!isCurrentPlayerAlive.value) return false
  if (gamePhase.value !== 'night') return false
  return true
})

onMounted(async () => {
  const user = authStore.currentUser
  if (!user) {
    router.push('/login')
    return
  }

  unsubscribe = gameStore.subscribeToGame(gameId)
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

const isCurrentPlayer = (player) => {
  return player.id === authStore.currentUser?.uid
}

const performNightAction = async (action, targetId) => {
  try {
    await gameStore.performNightAction(gameId, action, targetId)
  } catch (error) {
    console.error('Failed to perform night action:', error)
  }
}

const votePlayer = async (playerId) => {
  try {
    await gameStore.votePlayer(gameId, playerId)
  } catch (error) {
    console.error('Failed to vote:', error)
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  try {
    await gameStore.sendMessage(gameId, newMessage.value)
    newMessage.value = ''
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}
</script> 