import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDt-_uZMX1kcpP_lvTJbSgcdef8WeZ3Pe8",
  authDomain: "vuemafia-online-mafia-game.firebaseapp.com",
  projectId: "vuemafia-online-mafia-game",
  storageBucket: "vuemafia-online-mafia-game.firebasestorage.app",
  messagingSenderId: "166687868678",
  appId: "1:166687868678:web:fa8876f97851ce87660087"
};

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Game from './views/Game.vue'
import Lobby from './views/Lobby.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/lobby', component: Lobby, meta: { requiresAuth: true } },
    { path: '/game/:id', component: Game, meta: { requiresAuth: true } }
  ]
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('user')
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

const vueApp = createApp(App)
const pinia = createPinia()

vueApp.use(pinia)
vueApp.use(router)
vueApp.mount('#app')