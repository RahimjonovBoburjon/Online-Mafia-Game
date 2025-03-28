<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
    <div class="text-center">
      <h1 class="text-6xl font-bold mb-8">VueMafia</h1>
      <p class="text-xl mb-12">Welcome to the online Mafia game!</p>
      
      <div class="space-y-4">
        <router-link 
          v-if="isAuthenticated"
          to="/lobby"
          class="block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
        >
          Enter Game Lobby
        </router-link>
        
        <router-link 
          v-else
          to="/login"
          class="block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300"
        >
          Login to Play
        </router-link>
      </div>

      <div class="mt-16 text-left max-w-2xl mx-auto">
        <h2 class="text-2xl font-bold mb-4">Game Rules</h2>
        <ul class="space-y-2">
          <li>• Game starts with 5+ players</li>
          <li>• Each player gets a random role (Mafia, Doctor, Detective, or Civilian)</li>
          <li>• Mafia eliminates one player each night</li>
          <li>• Doctor can save one player per night</li>
          <li>• Detective can check if a player is mafia</li>
          <li>• Civilians work together to find and vote out the mafia</li>
          <li>• Win by eliminating all mafia members or being the last mafia standing</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../store/auth'

const authStore = useAuthStore()
const isAuthenticated = ref(false)

onMounted(async () => {
  isAuthenticated.value = await authStore.isAuthenticated()
})
</script> 