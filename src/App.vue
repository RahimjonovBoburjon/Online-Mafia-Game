<template>
    <div class="min-h-screen bg-gray-900 text-white">
        <nav class="bg-gray-800 p-4">
            <div class="container mx-auto flex justify-between items-center">
                <router-link to="/" class="text-xl font-bold">VueMafia</router-link>
                <div v-if="isAuthenticated" class="flex items-center space-x-4">
                    <span>{{ currentUser?.displayName }}</span>
                    <button @click="logout" class="bg-red-600 px-4 py-2 rounded hover:bg-red-700">
                        Logout
                    </button>
                </div>
                <div v-else>
                    <router-link to="/login" class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
                        Login
                    </router-link>
                </div>
            </div>
        </nav>

        <main class="container mx-auto p-4">
            <router-view></router-view>
        </main>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './store/auth'

const router = useRouter()
const authStore = useAuthStore()
const isAuthenticated = ref(false)
const currentUser = ref(null)

onMounted(async () => {
    isAuthenticated.value = await authStore.isAuthenticated()
    currentUser.value = authStore.currentUser
})

const logout = async () => {
    await authStore.logout()
    router.push('/login')
}
</script>

<style></style>