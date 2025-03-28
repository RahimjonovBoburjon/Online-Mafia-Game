import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDt-_uZMX1kcpP_lvTJbSgcdef8WeZ3Pe8",
  authDomain: "vuemafia-online-mafia-game.firebaseapp.com",
  projectId: "vuemafia-online-mafia-game",
  storageBucket: "vuemafia-online-mafia-game.firebasestorage.app",
  messagingSenderId: "166687868678",
  appId: "1:166687868678:web:fa8876f97851ce87660087"
};

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

export { db, auth } 