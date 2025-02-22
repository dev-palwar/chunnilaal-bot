importScripts("https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js");
importScripts(
  "https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDSd5_bFm1kdCp0pCXdYcesoQMWaHFdnbY",

  authDomain: "telegram-bot-chunnilaal-v2.firebaseapp.com",

  projectId: "telegram-bot-chunnilaal-v2",

  storageBucket: "telegram-bot-chunnilaal-v2.firebasestorage.app",

  messagingSenderId: "141010455394",

  appId: "1:141010455394:web:44ab9a10780549c3bdba3b",
});

const websiteToRedirect = "www.example.com";

const messaging = firebase.messaging();

// Handle notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // Close the notification

  // Redirect to your website
  const urlToOpen = websiteToRedirect; // Replace with your website URL
  event.waitUntil(
    clients.openWindow(urlToOpen) // Open the URL in a new tab
  );
});

messaging.onBackgroundMessage((payload) => {
  console.log("Received background message:", payload);
  return self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.icon,
  });
});
