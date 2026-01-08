// Firebase Configuration for IanTube
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCFSr9ELfhVb-lgOiJ0f5LEsJFf1mXcd1A",
    authDomain: "cloneweb-5dd91.firebaseapp.com",
    projectId: "cloneweb-5dd91",
    storageBucket: "cloneweb-5dd91.firebasestorage.app",
    messagingSenderId: "667635770976",
    appId: "1:667635770976:web:ecbf0274a924395821c505",
    measurementId: "G-S0BMMKN18V"
};

// Initialize Firebase (prevent double initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Export auth and firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
