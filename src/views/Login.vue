<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
      <h2 class="text-3xl font-bold text-white mb-6 text-center">Login to VueMafia</h2>
      
      <div class="space-y-4">
        <button
          @click="handleGoogleLogin"
          class="w-full flex items-center justify-center space-x-2 bg-white text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition duration-300"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" class="w-5 h-5">
          <span>Continue with Google</span>
        </button>

        <div v-if="error" class="bg-red-500 text-white p-3 rounded-lg text-center">
          {{ error }}
        </div>

        <div class="text-center text-gray-400">
          <router-link to="/" class="hover:text-white transition duration-300">
            Back to Home
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

const handleGoogleLogin = async () => {
  try {
    await authStore.login()
    router.push('/lobby')
  } catch (err) {
    error.value = 'Failed to login with Google. Please try again.'
    console.error('Login error:', err)
  }
}
</script> 