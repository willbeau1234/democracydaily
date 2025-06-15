const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// VERSION: 2024-12-07-DUPLICATE-FIX
admin.initializeApp();
const db = admin.firestore();

/**
 * Submit a new response and prevent duplicates
 * Version 2.0 - Fixed duplicate submission bug
 */
exports.submitResponse = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const {opinionId, stance, reasoning, userId} = req.body;

    if (!opinionId || !stance || !reasoning) {
      res.status(400).json({error: "Missing required fields"});
      return;
    }

    if (!["agree", "disagree"].includes(stance)) {
      res.status(400).json({error: "Stance must be 'agree' or 'disagree'"});
      return;
    }

    // CHECK FOR EXISTING RESPONSE TO PREVENT DUPLICATES
    const responsesRef = db.collection("responses");
    const existingResponseQuery = responsesRef
        .where("opinionId", "==", opinionId)
        .where("userId", "==", userId || "anonymous");

    const existingSnapshot = await existingResponseQuery.get();

    console.log("Checking for existing responses for user:", userId);
    console.log("Found:", existingSnapshot.size);

    if (!existingSnapshot.empty) {
      // USER ALREADY RESPONDED - UPDATE INSTEAD OF CREATE NEW
      const existingDoc = existingSnapshot.docs[0];

      console.log("UPDATING existing response instead of creating new one");

      const updatedData = {
        stance,
        reasoning: reasoning.trim(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: new Date().toISOString(),
      };

      await existingDoc.ref.update(updatedData);
      await updateOpinionStats(opinionId);

      res.json({
        success: true,
        message: "Response updated successfully (no duplicate created)",
        responseId: existingDoc.id,
        updated: true,
      });
      return;
    }

    // CREATE NEW RESPONSE (ONLY IF NO EXISTING RESPONSE)
    console.log("CREATING new response - no existing response found");

    const responseData = {
      opinionId,
      stance,
      reasoning: reasoning.trim(),
      userId: userId || "anonymous",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await responsesRef.add(responseData);
    await updateOpinionStats(opinionId);

    res.json({
      success: true,
      message: "New response created successfully",
      responseId: docRef.id,
      updated: false,
    });
  } catch (error) {
    console.error("Error submitting response:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get aggregated responses for word cloud generation
 */
exports.getAggregatedResponses = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const {opinionId, stance} = req.method === "GET" ? req.query : req.body;

    if (!opinionId || !stance) {
      res.status(400).json({error: "Missing opinionId or stance"});
      return;
    }

    const responsesRef = db.collection("responses");
    const q = responsesRef
        .where("opinionId", "==", opinionId)
        .where("stance", "==", stance)
        .limit(500);

    const querySnapshot = await q.get();

    const responses = [];
    const allText = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      responses.push({
        id: doc.id,
        reasoning: data.reasoning,
        timestamp: data.timestamp,
        userId: data.userId,
      });
      allText.push(data.reasoning);
    });

    const combinedText = allText.join(" ");
    const wordFrequencies = processTextToWordFrequencies(combinedText);

    res.json({
      success: true,
      opinionId,
      stance,
      totalResponses: responses.length,
      combinedText,
      wordFrequencies,
      responses: responses.slice(0, 10),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting aggregated responses:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get real-time opinion statistics
 */
exports.getOpinionStats = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const {opinionId} = req.method === "GET" ? req.query : req.body;

    if (!opinionId) {
      res.status(400).json({error: "Missing opinionId"});
      return;
    }

    const stats = await calculateOpinionStats(opinionId);

    res.json({
      success: true,
      opinionId,
      stats,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting opinion stats:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get today's active opinion
 */
exports.getTodayOpinion = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Get today's active opinion
    const opinionsRef = db.collection("dailyOpinions");
    const activeOpinionQuery = opinionsRef
        .where("isActive", "==", true)
        .limit(1);
    const activeOpinionSnapshot = await activeOpinionQuery.get();

    if (!activeOpinionSnapshot.empty) {
      const opinionDoc = activeOpinionSnapshot.docs[0];
      const opinionData = opinionDoc.data();

      res.json({
        success: true,
        opinion: {
          id: opinionDoc.id,
          ...opinionData,
        },
      });
      return;
    }

    // If no active opinion, try to activate one
    const activationResult = await activateNextOpinion();

    if (activationResult.success) {
      // Retry getting the active opinion
      const retrySnapshot = await activeOpinionQuery.get();
      if (!retrySnapshot.empty) {
        const opinionDoc = retrySnapshot.docs[0];
        const opinionData = opinionDoc.data();
        res.json({
          success: true,
          opinion: {
            id: opinionDoc.id,
            ...opinionData,
          },
        });
        return;
      }
    }
    const maintenanceMessage = "🛠️ Under Maintenance We're upgrading" +
      "While we work on exciting new features, we'd love your input. " +
      "**Share your feedback or suggest features you'd like to see.** " +
      "We'll be back soon – thanks for your patience!";
    // Fallback message
    res.json({
      success: true,
      opinion: {
        id: "maintenance",
        content: maintenanceMessage,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("Error getting today's opinion:", error);
    res.status(500).json({success: false, error: error.message});
  }
});
/**
 * Process text into word frequencies for word cloud
 * @param {string} text - Combined text from all responses
 * @return {Array} Array of [word, frequency] pairs
 */
function processTextToWordFrequencies(text) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const stopwords = new Set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you",
    "your", "yours", "yourself", "yourselves", "he", "him", "his",
    "himself", "she", "her", "hers", "herself", "it", "its", "itself",
    "they", "them", "their", "theirs", "themselves", "what", "which",
    "who", "whom", "this", "that", "these", "those", "am", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "having",
    "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if",
    "or", "because", "as", "until", "while", "of", "at", "by", "for",
    "with", "through", "during", "before", "after", "above", "below",
    "up", "down", "in", "out", "on", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "any", "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "can", "will", "just", "should", "now", "get",
    "like", "think", "also", "would", "could", "go", "see", "know",
    "take", "say", "make", "way", "time", "people", "many", "well",
    "first", "good", "much", "new", "work", "right", "even", "back",
    "want", "come", "use", "really", "need", "feel", "believe",
  ]);

  const words = text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word));

  const wordCount = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);
}

/**
 * Calculate opinion statistics
 * @param {string} opinionId - Opinion ID
 * @return {Object} Statistics object
 */
async function calculateOpinionStats(opinionId) {
  const responsesRef = db.collection("responses");
  const q = responsesRef.where("opinionId", "==", opinionId);
  const querySnapshot = await q.get();

  let agreeCount = 0;
  let disagreeCount = 0;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.stance === "agree") {
      agreeCount++;
    } else if (data.stance === "disagree") {
      disagreeCount++;
    }
  });

  const totalResponses = agreeCount + disagreeCount;
  const agreePercentage = totalResponses > 0 ?
    Math.round((agreeCount / totalResponses) * 100) : 0;
  const disagreePercentage = 100 - agreePercentage;

  return {
    agreeCount,
    disagreeCount,
    totalResponses,
    agreePercentage,
    disagreePercentage,
  };
}

/**
 * Update opinion statistics (called after new response)
 * @param {string} opinionId - Opinion ID
 */
async function updateOpinionStats(opinionId) {
  try {
    const stats = await calculateOpinionStats(opinionId);

    const statsRef = db.collection("opinionStats").doc(opinionId);
    await statsRef.set({
      ...stats,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    console.log("Updated stats for opinion " + opinionId + ":", stats);
  } catch (error) {
    console.error("Error updating opinion stats:", error);
  }
}

exports.midnightReset = functions.scheduler.onSchedule({
  schedule: "0 0 * * *",
  timeZone: "America/Chicago",
}, async (context) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    console.log(`Running midnight reset: ${yesterdayStr} → ${today}`);

    // Deactivate yesterday's opinion
    const opinionsRef = db.collection("dailyOpinions");
    const yesterdayOpinionsQuery = opinionsRef.where("isActive", "==", true);
    const yesterdaySnapshot = await yesterdayOpinionsQuery.get();

    const batch = db.batch();
    yesterdaySnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isActive: false,
        deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Archive yesterday's responses
    const responsesRef = db.collection("responses");
    const yesterdayResponses = await responsesRef
        .where("opinionId", "==", yesterdayStr)
        .get();

    const archiveRef = db.collection("archivedResponses");
    yesterdayResponses.forEach((doc) => {
      const archiveDoc = archiveRef.doc(doc.id);
      batch.set(archiveDoc, {
        ...doc.data(),
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Deactivated yesterday's opinions and archived responses`);

    // Activate today's opinion
    const activationResult = await activateNextOpinion();
    console.log("Opinion activation result:", activationResult);

    return activationResult;
  } catch (error) {
    console.error("Error in midnight reset:", error);
    return {success: false, error: error.message};
  }
}); // ← This closes the midnightReset function
exports.sitemap = functions.https.onRequest(async (req, res) => {
  res.set("Content-Type", "text/xml");
  res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

  try {
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages
    const staticPages = [
      {url: "/", priority: "1.0", changefreq: "daily"},
      {url: "/about", priority: "0.8", changefreq: "monthly"},
      // Add your other static pages
    ];

    staticPages.forEach((page) => {
      sitemap += `
  <url>
    <loc>https://thedemocracydaily.com${page.url}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    // Dynamic content from Firestore (articles, etc.)
    const articlesSnapshot =
    await admin.firestore().collection("articles").get();

    articlesSnapshot.forEach((doc) => {
      const article = doc.data();
      const slug = doc.id; // or however you structure your URLs

      sitemap += `
  <url>
    <loc>https://thedemocracydaily.com/article/${slug}</loc>
    <lastmod>${article.updatedAt ?
    article.updatedAt.toDate().toISOString().split("T")[0] :
     new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    sitemap += "\n</urlset>";
    res.send(sitemap);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});
exports.handlefeedback = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  const {content} = req.body;


  if (!content) {
    res.status(400).send("Missing 'message' parameter");
    return;
  }
  try {
    await admin.firestore().collection("feedback").add({
      content: content,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
  }

  res.json({success: true});

  console.log("Received feedback:", content);
  res.json({success: true});
});
/**
 * Activate the next opinion based on publishAt date
 * @return {Object} Result object with success status and message
 */
async function activateNextOpinion() {
  try {
    const today = new Date().toISOString().split("T")[0];
    console.log(`Looking for opinion to activate for: ${today}`);

    // Look for an opinion scheduled for today that isn't active yet
    const opinionsRef = db.collection("dailyOpinions");
    const todayOpinionQuery = opinionsRef
        .where("publishAt", "==", today)
        .where("isActive", "==", false)
        .limit(1);

    const todayOpinionSnapshot = await todayOpinionQuery.get();

    if (!todayOpinionSnapshot.empty) {
      // Found an opinion scheduled for today
      const opinionDoc = todayOpinionSnapshot.docs[0];
      await opinionDoc.ref.update({
        isActive: true,
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Activated scheduled opinion for ${today}`);
      return {
        success: true,
        message: `Activated scheduled opinion for ${today}`,
        opinionId: opinionDoc.id,
      };
    }

    // If no opinion scheduled for today, look for the next available opinion
    const nextOpinionQuery = opinionsRef
        .where("isActive", "==", false)
        .orderBy("publishAt", "asc")
        .limit(1);

    const nextOpinionSnapshot = await nextOpinionQuery.get();

    if (nextOpinionSnapshot.empty) {
      console.log("No opinions available");
      return {success: false, message: "No opinions available to activate"};
    }

    const nextOpinionDoc = nextOpinionSnapshot.docs[0];
    await nextOpinionDoc.ref.update({
      isActive: true,
      publishAt: today, // Update the publish date to today
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      originalPublishAt: nextOpinionDoc.data().publishAt,
    });

    console.log(`Activated next available opinion for ${today}`);
    return {
      success: true,
      message: `Activated next available opinion for ${today}`,
      opinionId: nextOpinionDoc.id,
    };
  } catch (error) {
    console.error("Error activating next opinion:", error);
    return {success: false, error: error.message};
  }
}
exports.triggerNextOpinion = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const result = await activateNextOpinion();
    res.json(result);
  } catch (error) {
    console.error("Error triggering next opinion:", error);
    res.status(500).json({success: false, error: error.message});
  }
});
/**
 * Load opinions from local JSON file and upload to Firestore
 */
exports.loadOpinionsFromFile = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const {adminKey} = req.method === "GET" ? req.query : req.body;

    if (adminKey !== "democracy-admin-2025") {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    // Read the local JSON file
    const filePath = path.join(__dirname, "opinions.json");
    const fileContent = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    if (!jsonData.opinions || !Array.isArray(jsonData.opinions)) {
      res.status(400).json({error: "Invalid JSON format"});
      return;
    }

    console.log(`Processing ${jsonData.opinions.length} opinions from file`);

    // Process opinions and add to Firestore
    const batch = db.batch();
    let addedCount = 0;
    let skippedCount = 0;

    for (const opinion of jsonData.opinions) {
      if (!opinion.content || !opinion.publishAt) {
        console.log("Skipping invalid opinion:", opinion);
        skippedCount++;
        continue;
      }

      // Check if opinion already exists for this date
      const existingQuery = await db
          .collection("dailyOpinions")
          .where("publishAt", "==", opinion.publishAt)
          .get();

      if (!existingQuery.empty) {
        skippedCount++;
        continue;
      }

      // Create new opinion document - matches your exact structure
      const opinionRef = db.collection("dailyOpinions").doc();
      batch.set(opinionRef, {
        content: opinion.content,
        publishAt: opinion.publishAt,
        isActive: false, // Always start inactive
      });
      addedCount++;
    }

    // Commit the batch
    await batch.commit();

    res.json({
      success: true,
      message: `Successfully processed opinions from local file`,
      addedCount,
      skippedCount,
      totalProcessed: jsonData.opinions.length,
    });
  } catch (error) {
    console.error("Error processing local file:", error);
    res.status(500).json({success: false, error: error.message});
  }
});
