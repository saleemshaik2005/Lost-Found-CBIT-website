import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAZcB7Krb6R9SeZDl5uHJYaTjC2fuH-NM0",
    authDomain: "cbit-lost-found.firebaseapp.com",
    projectId: "cbit-lost-found",
    // Standard Firebase storage bucket URL format
    storageBucket: "cbit-lost-found.firebasestorage.app", 
    messagingSenderId: "881267176502",
    appId: "1:881267176502:web:25bf00cb521611d2835497"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Export services for use in other files
export { db, storage, auth, provider };