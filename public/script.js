document.getElementById("disclaimer").innerHTML = navigator.userAgent;

console.log(navigator.userAgent);

const firebaseConfig = {
  apiKey: "AIzaSyDSd5_bFm1kdCp0pCXdYcesoQMWaHFdnbY",

  authDomain: "telegram-bot-chunnilaal-v2.firebaseapp.com",

  projectId: "telegram-bot-chunnilaal-v2",

  storageBucket: "telegram-bot-chunnilaal-v2.firebasestorage.app",

  messagingSenderId: "141010455394",

  appId: "1:141010455394:web:44ab9a10780549c3bdba3b",
};

const POLLING_TIME = 10000;

// Key for localStorage
const localStorageKey = "telegramPosts";

// Registers service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Service Worker registered");
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
}

// Initializes Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Firebase messaging instance
const messaging = firebase.messaging();

// Initialize Firestore
const db = firebase.firestore();

const setupFirestoreListener = () => {
  db.collection("chunnilaal bot")
    .doc("1")
    .onSnapshot((doc) => {
      const data = doc.data();
      if (data) {
        loadDynamicButtons(data);
      }
    });
};

setTimeout(() => {
  // Calls the listener after some seconds of page render
  setupFirestoreListener();
}, 2000);

function loadDynamicButtons(firebase_data) {
  const button_left = document.getElementById("telegram-top-left-button");
  button_left.innerText = firebase_data.button_text_left;
  button_left.href = firebase_data.button_content_left;

  const button_right = document.getElementById("telegram-top-right-button");
  button_right.innerHTML = firebase_data.button_text_right;
  button_right.href = firebase_data.button_content_right;

  const whatsapp_button = document.getElementById("whatsapp-button");
  document.getElementById("whatsapp-button-text").innerHTML =
    firebase_data.whatsapp;
  whatsapp_button.href = "https://wa.me/" + firebase_data.whatsapp_number;

  const disclaimer = document.getElementById("disclaimer");
  disclaimer.innerHTML = firebase_data.disclaimer;
}

// Add this function to handle the popup visibility
function showNotificationPopup() {
  const popup = document.getElementById("pop-up");
  popup.style.display = "block";
}

// Hide popup function
function hideNotificationPopup() {
  const popup = document.getElementById("pop-up");
  popup.style.display = "none";
}

// Separated token retrieval to be reusable
async function getAndSendToken() {
  try {
    const token = await messaging.getToken({
      // get this key from firebase
      vapidKey:
        "BGAKDDWMs5yjSRoTnEJXJRGV6jAH4eo_f-iFAQsKwO_UAU_NOAqA4QahWVMPRSghpHtn3pmShvZ_gFTTexKbSVk",
    });

    await sendFCNToBackend(token);
  } catch (error) {
    console.error(`Error getting FCM token: ${error.message}`);
  }
}

// Check notification permission and show popup if needed
async function checkAndRequestPermission() {
  // Check current permission state
  const currentPermission = Notification.permission;

  if (currentPermission === "granted") {
    // Permission already granted, proceed to get token
    await getAndSendToken();
  } else if (currentPermission === "denied") {
    // User has already denied - show popup to explain importance
    // showNotificationPopup();
    setTimeout(() => {
      showNotificationPopup();
    }, 7000);
  } else {
    // Permission state is "default" (not decided yet) - show popup
    // showNotificationPopup();
    setTimeout(() => {
      showNotificationPopup();
    }, 7000);
  }
}

// Modified notification permission request function
const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");
      hideNotificationPopup(); // Hide popup when permission granted
      await getAndSendToken();
    } else {
      console.log("Notification permission denied.");
      // We don't hide popup here, as user might reconsider
    }
  } catch (error) {
    console.error(`Error requesting notification permission: ${error.message}`);
  }
};

async function sendFCNToBackend(token) {
  try {
    const response = await fetch("/send-fcm-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const data = await response.json();
    console.log("Token sent successfully");
    return data;
  } catch (error) {
    console.error("Error sending FCM token to backend:", error);
    throw error; // Re-throw the error for further handling
  }
}

// Function to create a Telegram widget for a given post ID
function createTelegramWidget(postId, channelUsername) {
  console.log(channelUsername);

  const widgetContainer = document.createElement("div");
  widgetContainer.className = "telegram-widget";
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.setAttribute("data-telegram-post", `${channelUsername}/${postId}`);
  script.setAttribute("data-width", "100%");
  script.setAttribute("data-color", "13B4C6");
  script.setAttribute("data-dark", "1");
  script.setAttribute("data-dark-color", "39C4E8");
  widgetContainer.appendChild(script);
  return widgetContainer;
}

// Function to save posts to localStorage
function savePostsToLocalStorage(posts) {
  localStorage.setItem(localStorageKey, JSON.stringify(posts));
}

// Function to load posts from localStorage
function loadPostsFromLocalStorage() {
  const posts = localStorage.getItem(localStorageKey);
  return posts ? JSON.parse(posts) : [];
}

// Function to render posts
function renderPosts(posts, channelUsername) {
  console.log(channelUsername);

  const widgetArea = document.querySelector(".telegram-container");
  widgetArea.innerHTML = ""; // Clear the existing widgets
  posts.forEach((postId) => {
    const widget = createTelegramWidget(postId, channelUsername);
    widgetArea.appendChild(widget);
  });
}

// Function to fetch the latest post ID from the server
async function fetchLatestPostId() {
  console.log("Fetching latest post");

  try {
    const response = await fetch("/latest-post-id");
    const data = await response.json();

    console.log(data);

    if (data.postId) {
      document.getElementById("channelImageOnClient").src =
        data.channelImageLink;
      document.getElementById("heading").innerHTML = data.channelName;

      console.log(data.channelUsername);

      // Load existing posts from localStorage
      const posts = loadPostsFromLocalStorage();
      // Add the new post ID if it doesn't already exist
      if (!posts.includes(data.postId)) {
        posts.unshift(data.postId); // Add to the beginning of the array
        savePostsToLocalStorage(posts); // Save updated posts to localStorage
        renderPosts(posts, data.channelUsername); // Re-render the posts
      }
    }
  } catch (error) {
    console.error("Failed to fetch latest post ID:", error);
  }
}

// Loads posts from localStorage when the page loads
document.addEventListener("DOMContentLoaded", () => {
  // Initial setup - hide popup by default
  const popup = document.getElementById("pop-up");
  popup.style.display = "none";

  // Setup button event listeners
  const allowButton = document.getElementById("allow-button");
  const dontAllowButton = document.getElementById("dont-allow-button");

  allowButton.addEventListener("click", requestNotificationPermission);
  dontAllowButton.addEventListener("click", hideNotificationPopup);

  // Check permission status and show popup if needed
  checkAndRequestPermission();

  // Rest of your original code
  renderPosts(loadPostsFromLocalStorage());
  fetchLatestPostId();
});

// Fetch the latest post ID every 10 seconds
setInterval(fetchLatestPostId, POLLING_TIME);
