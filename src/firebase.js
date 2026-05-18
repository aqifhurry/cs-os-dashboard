import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";  

//  Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCDFFoVQI8DjHnL_faDhRjUHPZVoJlPRYE",
  authDomain: "cs-os-dashboard.firebaseapp.com",
  projectId: "cs-os-dashboard",
  storageBucket: "cs-os-dashboard.firebasestorage.app",
  messagingSenderId: "897325189546",
  appId: "1:897325189546:web:bf4b3ee1111618a90383d3",
  measurementId: "G-17CWK5RY6W"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
