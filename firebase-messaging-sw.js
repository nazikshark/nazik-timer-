importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-compat-app.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-compat-messaging.js");

firebase.initializeApp({
  apiKey: "AIzaSyAT0rPov6Bb6NddbVL7UgIfYgS9CggP5Sk",
  authDomain: "nazik-timer.firebaseapp.com",
  projectId: "nazik-timer",
  storageBucket: "nazik-timer.firebasestorage.app",
  messagingSenderId: "314207092962",
  appId: "1:314207092962:web:98f1840e1657f69e241ebb",
  measurementId: "G-26XZZH2TDF"
});

const messaging = firebase.messaging();