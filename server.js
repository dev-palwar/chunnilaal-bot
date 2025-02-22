const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const { config } = require("dotenv");
const admin = require("firebase-admin");

config();

const app = express();
const PORT = 3000;

const notificationBodyForChangesInDatabase = {
  title: "New update in the channel",
  body: "idk just check it",
};

// Middleware
app.use(express.json());

// Serves static files
app.use(express.static(path.join(__dirname, "public")));

// Stores the latest post ID
let latestPostId = null;
let channelImageLink = null;
let channelName = null;

// Telegram Bot Setup
const Bot_Token = process.env.BOT_TOKEN;
const bot = new TelegramBot(Bot_Token, { polling: true });

if (bot) {
  console.log("Bot is running...");
}

const serviceAccount = require("./telegram-bot-chunnilaal-v2-firebase-adminsdk-fbsvc-7eb66918bb.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Get Firestore instance
const db = admin.firestore();

// Listen for changes in a specific document
const docRef = db.collection("chunnilaal bot").doc("1");

const unsubscribe = docRef.onSnapshot(
  (doc) => {
    if (doc.exists) {
      broadcastNotification(notificationBodyForChangesInDatabase);
    } else {
      console.log("Document does not exist");
    }
  },
  (error) => {
    console.error("Error listening to document changes:", error);
  }
);

// Function to retrieve FCM tokens from Firestore
async function getFcmTokens() {
  try {
    const tokensRef = db.collection("chunnilaal bot").doc("fcmToken");
    const doc = await tokensRef.get();

    if (doc.exists) {
      return doc.data().tokens || [];
    } else {
      console.log("No tokens found in Firestore");
      return [];
    }
  } catch (error) {
    console.error("Error fetching tokens from Firestore:", error);
    return [];
  }
}

// Function to broadcast notifications
async function broadcastNotification({ title, body }) {
  try {
    const fcmTokens = await getFcmTokens(); // Retrieve tokens from Firestore

    if (fcmTokens.length === 0) {
      console.log("No FCM tokens available");
      return;
    }

    // Create multicast message
    const message = {
      notification: { title, body },
      tokens: fcmTokens, // Array of tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("Success count:", response.successCount);
    console.log("Failure count:", response.failureCount);

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx]);
        }
      });
      console.log("Failed tokens:", failedTokens);

      // Remove failed tokens from Firestore
      const tokensRef = db.collection("chunnilaal bot").doc("fcmToken");
      const updatedTokens = fcmTokens.filter(
        (token) => !failedTokens.includes(token)
      );
      await tokensRef.update({ tokens: updatedTokens });
    }
  } catch (error) {
    console.error("Broadcast error:", error);
  }
}

// Listens for new posts in the channel
bot.on("channel_post", async (msg) => {
  const postId = msg.message_id;
  const chatId = msg.chat.id;
  const text = msg.text || "No text available";

  console.log(`New post in channel ${chatId}:`);
  console.log(`Post ID: ${postId}`);
  console.log(`Content: ${text}`);

  // Updates the latest post ID
  latestPostId = postId;

  try {
    // Fetch channel details
    const chatInfo = await bot.getChat(chatId);

    broadcastNotification({
      title: "New post in channel" + chatInfo.title,
      body: text,
    });

    // Extract channel name
    channelName = chatInfo.title;
    console.log(`Channel Name: ${channelName}`);

    // Extract channel profile picture (if available)
    if (chatInfo.photo) {
      const photo = chatInfo.photo;
      const largestPhoto = photo.big_file_id;

      // Get the file URL using the file ID
      const fileLink = await bot.getFileLink(largestPhoto);
      channelImageLink = fileLink;
      console.log(`Channel Profile Picture: ${fileLink}`);
    } else {
      console.log("Channel does not have a profile picture.");
    }
  } catch (error) {
    console.error("Failed to fetch channel details:", error);
  }
});

// Endpoint for getting FCM token from the client
app.post("/send-fcm-token", async (req, res) => {
  const { token: FCM_TOKEN } = req.body;

  if (!FCM_TOKEN) {
    res.send({ success: false, message: "No token received" });
    return;
  }

  console.log("Client sent the FCM token: " + FCM_TOKEN);

  try {
    // Save the token in Firestore
    const tokensRef = db.collection("chunnilaal bot").doc("fcmToken");

    // Get the existing tokens (if any)
    const doc = await tokensRef.get();

    if (doc.exists) {
      // If the document exists, update the tokens array
      const existingTokens = doc.data().tokens || [];
      if (!existingTokens.includes(FCM_TOKEN)) {
        existingTokens.push(FCM_TOKEN);
        await tokensRef.update({ tokens: existingTokens });
        console.log("Token added to Firestore");
      } else {
        console.log("Token already exists in Firestore");
      }
    } else {
      // If the document doesn't exist, create it with the new token
      await tokensRef.set({ tokens: [FCM_TOKEN] });
      console.log("New Firestore document created with the token");
    }

    res.send({ success: true, message: "Token stored successfully" });
  } catch (error) {
    console.error("Error storing token in Firestore:", error);
    res.status(500).send({ success: false, message: "Failed to store token" });
  }
});

// Endpoint to get the latest post ID
app.get("/latest-post-id", (req, res) => {
  res.json({ postId: latestPostId, channelImageLink, channelName });
});

// Serves the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
