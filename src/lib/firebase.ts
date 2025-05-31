import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCVyNQKLzNO3v1--jvRCp_jgP6I7lMHulc",
  authDomain: "gestaobiblioteca-394ce.firebaseapp.com",
  projectId: "gestaobiblioteca-394ce",
  storageBucket: "gestaobiblioteca-394ce.appspot.com", // Corrected from firebasestorage.app
  messagingSenderId: "16863303670",
  appId: "1:16863303670:web:7a3cc11fb37780a5b7d9d7",
  measurementId: "G-07JZQCY9DS"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
