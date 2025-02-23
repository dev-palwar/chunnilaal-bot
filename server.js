const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const { config } = require("dotenv");
const admin = require("firebase-admin");
const { constructNotificationObj } = require("./utils");

config();
const PORT = 9090;

const app = express();

// Middleware
app.use(express.json());

// Serves static files
app.use(express.static(path.join(__dirname, "public")));

// Variables to store basic data of a channel
let latestPostId = null;
let channelImageLink = null;
let channelName = null;
let channelUsername = null;

// Telegram Bot Setup
const Bot_Token = process.env.BOT_TOKEN;
const bot = new TelegramBot(Bot_Token, { polling: true });

if (bot) console.log("Bot is running...");

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Fixes newlines
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Gets Firestore instance
const db = admin.firestore();

// Listens for changes in a specific document
const docRef = db.collection("chunnilaal bot").doc("1");

const unsubscribe = docRef.onSnapshot(
  (doc) => {
    if (doc.exists) {
      broadcastNotification(
        constructNotificationObj(
          "New update in the channel " + channelName,
          "Click to see"
        )
      );
    } else {
      console.log("Document does not exist");
    }
  },
  (error) => {
    console.error("Error listening to document changes:", error);
  }
);

// Listens for new posts in the channel
bot.on("channel_post", async (msg) => {
  const postId = msg.message_id;
  const chatId = msg.chat.id;
  const text = msg.text || "Click to see";

  console.log(`New post in channel ${chatId}:`);
  console.log(`Post ID: ${postId}`);
  console.log(`Content: ${text}`);

  // Updates the latest post ID
  latestPostId = postId;

  // Updates the channel username
  channelUsername = msg.sender_chat.username;

  try {
    // Fetchs channel details
    const chatInfo = await bot.getChat(chatId);

    broadcastNotification(
      constructNotificationObj(
        "New post in the channel " + chatInfo.title,
        text
      )
    );

    // Extracts channel name
    channelName = chatInfo.title;
    console.log(`Channel Name: ${channelName}`);

    // Extracts channel profile picture (if available)
    if (chatInfo.photo) {
      const photo = chatInfo.photo;
      const largestPhoto = photo.big_file_id;

      // Gets the file URL using the file ID
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
    // Saves the token in Firestore
    const tokensRef = db.collection("chunnilaal bot").doc("fcmToken");

    // Gets the existing tokens (if any)
    const doc = await tokensRef.get();

    if (doc.exists) {
      // If the document exists, updates the tokens array
      const existingTokens = doc.data().tokens || [];
      if (!existingTokens.includes(FCM_TOKEN)) {
        existingTokens.push(FCM_TOKEN);
        await tokensRef.update({ tokens: existingTokens });
        console.log("Token added to Firestore");
      } else {
        console.log("Token already exists in Firestore");
      }
    } else {
      // If the document doesn't exist, creates it with the new token
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
  res.json({
    postId: latestPostId,
    channelImageLink,
    channelName,
    channelUsername,
  });
});

// Serves the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function broadcastNotification({ title, body }) {
  try {
    const fcmTokens = await getFcmTokens(); // Retrieves tokens from Firestore

    if (fcmTokens.length === 0) {
      console.log("No FCM tokens available");
      return;
    }

    // Creates multicast message
    const message = {
      notification: { title, body },
      tokens: fcmTokens, // Array of tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("Success count:", response.successCount);
    console.log("Failure count:", response.failureCount);

    // Handles failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx]);
        }
      });
      console.log("Failed tokens:", failedTokens);

      // Removes failed tokens from Firestore
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
