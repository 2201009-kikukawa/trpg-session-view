import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBcdyDMCkci0Px0NBol4-HEIKZUl11fku4",
  authDomain: "trpg-session-view.firebaseapp.com",
  projectId: "trpg-session-view",
  storageBucket: "trpg-session-view.firebasestorage.app",
  messagingSenderId: "129631053884",
  appId: "1:129631053884:web:c45929d5e3736c0bbefb39",
  measurementId: "G-JSWVXCK9PG",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
