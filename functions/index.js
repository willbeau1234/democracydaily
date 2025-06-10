const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");

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

    const today = "2025-05-28";
    const opinionRef = db.collection("dailyOpinions").doc(today);
    const opinionDoc = await opinionRef.get();

    if (!opinionDoc.exists) {
      res.status(404).json({error: "No opinion found for today"});
      return;
    }

    const opinionData = opinionDoc.data();

    if (!opinionData.isActive) {
      res.status(404).json({error: "Today's opinion is not active"});
      return;
    }

    res.json({
      success: true,
      opinion: {
        id: opinionDoc.id,
        ...opinionData,
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

/**
 * Test function for basic functionality
 */
exports.hellword = functions.https.onRequest(async (req, res) => {
  const name = req.query.name;
  if (!name) {
    res.status(400).send("Missing 'name' parameter");
    return;
  }
  const items = {lamp: "This is a lamp", chair: "This is a chair"};
  const message = items[name.toLowerCase()] || "Item '" + name + "' not found";
  res.json({item: name, description: message});
});
exports.midnightReset = functions.scheduler.onSchedule({
  schedule: "0 0 * * *", // This means midnight in the specified timezone
  timeZone: "America/Chicago"},
async (context) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    console.log("Running midnight reset for:", yesterdayStr);

    // Optional: Archive yesterday's responses instead of deleting
    const responsesRef = db.collection("responses");
    const yesterdayResponses = await responsesRef
        .where("opinionId", "==", yesterdayStr)
        .get();

    // Move to archive collection
    const archiveRef = db.collection("archivedResponses");
    const batch = db.batch();

    yesterdayResponses.forEach((doc) => {
      const archiveDoc = archiveRef.doc(doc.id);
      batch.set(archiveDoc, {
        ...doc.data(),
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Delete from active responses
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log("Midnight reset completed for:", yesterdayStr);
  } catch (error) {
    console.error("Error in midnight reset:", error);
  }
},
);
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
