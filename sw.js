// 1. Импортируем Firebase (используем importScripts, так как это сервис-воркер)
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Инициализация
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

// --- Твой старый код кэширования (PWA) ---
const CACHE_NAME = "nazik-timer-plus-v7";
const ASSETS = [".", "index.html", "styles.css", "app.js", "manifest.webmanifest", "icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// --- Обработка пушей (Firebase + стандартные пуши) ---
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "icon.svg"
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});