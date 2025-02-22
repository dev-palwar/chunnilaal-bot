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

const serviceAccount = {
  "type": "service_account",
  "project_id": "telegram-bot-chunnilaal-v2",
  "private_key_id": "cec0acfd62b740d72b60685062f52b3ca2d08e35",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDWWDR3rGNF/I/e\n08XiPqHnGd0BYXSbxmF0E9rjWxQckfdDG+suem4xWoZpHiZX/MGwbUMub8vqJkKH\nWK9s731GFl6zFIJSOS/EYwaCFXVzWMB/2pp/4L8DRu8hvqhZNvqGKheAGEIfi3be\na4LkJQIjsh9m/a+Gm2bvSIfbw8ZukC2egdSLwkdOW5IqC7qZootQnbuTKDiuOXS2\n6ukQs30fXyEIfixkMhszaUizJ8Jp2OKwDDcTDQgMfcQlmt2rpxJ2PetuzZfY5xQk\nAg/1GbUcb3kkZ+3WCVZFCWjVSEv/MPSuSHWeVxDe+M1WaRBsqtwnMuQqFBqnyhin\n+frBcxTNAgMBAAECggEACzbuYymK6yU++Mi0lIpe3wV10FCYm4g1CUVQVpoUErea\nC9yTgOkecqjFb2KzXQyoLKfW0+s9AclSgfGEV4CDRINp8oLa8QbgG9gWMIBYwWTO\nHj0M3YPKiAHHhAjilte0eAhj64uOtXGkUe2m7vK3FTDeCZMx18Ax50ibSnFd5I3A\nMV3UwiKJPg6h62dgW4ziwRvQ4LyJWEw79zPkfBcINL3LX1f//7NwD4XPfIESGeSV\nY9qQcRykoRzqzYNraJY9XhDo/SpAOgvkQ+CLfuftlToC627725MZfxwgrv7DpskR\nBu1XRDo2d571rojX+U8K1w7EcG8KH6jHoKUjj+XgmQKBgQD7RTKUcfU764MyEXZJ\ndXBBdgGa9+9jiDqsMeZiRiSN3YryG2P9jfmdIxH1v8bxhOG6c85oKfFqS0zhkrwH\nFxLuacVoTMSVeKW7zaTnqvrY7BDBDFDYyuehYeTsLv7rEGK2CRz7NjUIywpzGA5o\nVksaiZFJEoACDONrXghdnPVdNQKBgQDaYRKErxjmryZlW1aKcAnGjcYuHaB3Q7Qk\nTI+iNgwvMEJPOxfhWbmdVI7eqHQWvzlSRenIPYW56CwIQ1q0HL1bJ8s/x1AJcLCp\n2e8IPVJ7RRMcDes5HKelYT64WvJu7xaHXRo+CJVNndnC5cAfvGiXoZSHPIYf1Qli\nauRj0fqEOQKBgQCzMsd+zML7p9vaElAM1Z9oYBOHBLmKf3ZwpenLPoEFV/Gm9tfZ\n1a4mXgOKAuqMBpvBkKOs7/THPMqouTA10kPjGjX6S32LqA5yoJexzOO3XqwYMYNb\nCWImWx2bP2z4EaiEcH1lv2QVUFC0gnyL9rb7Rw8BURtP2wc55EcNFEp83QKBgQCs\nAkwY0OaXRZzDt0caMhexGpjgWBu99UkeUmPMjC/at3NzfwNXUFpAz4rdXOhbxnF7\nGXCEddkwTuzn8U2vkvefpl+UtASZ+vZcQznhTpP6XrUnotsFmEmAnXFOuuw8bvxa\n0P3LoO0hPtV4i4liNgBYd0BLqWOoDSCgMbwF2C4wGQKBgQDTr1TodlEh9dlwMPpN\n1dO8gAODBQgwv1RZrUDFUA6654+6+A8vyXhosLN6Ug3Cpv5wRPYpJ5N0Qz8dDi34\naVA5KATNatWfAD0ctPR8MCJnxjnvI/dDYuboK44llbAHMXwVP0BnOz4l2Y91XNiX\nbMydPmubnaV7DkUD3vGm2WRw8A==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@telegram-bot-chunnilaal-v2.iam.gserviceaccount.com",
  "client_id": "104231239139709751700",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40telegram-bot-chunnilaal-v2.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

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
