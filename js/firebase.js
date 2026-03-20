// Import Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZcB7Krb6R9SeZDl5uHJYaTjC2fuH-NM0",
    authDomain: "cbit-lost-found.firebaseapp.com",
    projectId: "cbit-lost-found",
    storageBucket: "cbit-lost-found.firebasestorage.app",
    messagingSenderId: "881267176502",
    appId: "1:881267176502:web:25bf00cb521611d2835497"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const db = getFirestore(app);
const storage = getStorage(app);

// Export
export { db, storage };