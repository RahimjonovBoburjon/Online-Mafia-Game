import { defineStore } from 'pinia'
import { ref } from 'vue'
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth'

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(null)
  const loading = ref(true)

  const auth = getAuth()
  const provider = new GoogleAuthProvider()

  const login = async () => {
    try {
      const result = await signInWithPopup(auth, provider)
      currentUser.value = result.user
      localStorage.setItem('user', JSON.stringify(result.user))
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      currentUser.value = null
      localStorage.removeItem('user')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const isAuthenticated = async () => {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        currentUser.value = user
        loading.value = false
        resolve(!!user)
      })
    })
  }

  return {
    currentUser,
    loading,
    login,
    logout,
    isAuthenticated
  }
}) 