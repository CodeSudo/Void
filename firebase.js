// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCBiQ0gDPdl2AXexDqp0olpR_BiFplaQZM",
  authDomain: "saavn-github.firebaseapp.com",
  projectId: "saavn-github",
  storageBucket: "saavn-github.firebasestorage.app",
  messagingSenderId: "212533131865",
  appId: "1:212533131865:web:02dfb66400fb7b61278f48",
  measurementId: "G-C748BVMQFF",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
