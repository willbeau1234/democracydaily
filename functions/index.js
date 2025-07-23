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
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    let userId = "anonymous";
    let userType = "guest";
    let userDisplayName = null;
    let userEmail = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        userId = decodedToken.uid;
        userType = "authenticated";
        userDisplayName = decodedToken.name || null;
        userEmail = decodedToken.email || null;
      } catch (error) {
        console.log("Invalid token, treating as guest:", error.message);
        // Continue as anonymous guest
      }
    } else {
      console.log("No authorization header, treating as guest");
    }

    const {opinionId, stance, reasoning} = req.body;

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
        .where("userId", "==", userId);

    const existingSnapshot = await existingResponseQuery.get();

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
        userType: userType
      });
      return;
    }
    

    // CREATE NEW RESPONSE (ONLY IF NO EXISTING RESPONSE)
    console.log("CREATING new response - no existing response found");

    const responseData = {
      opinionId,
      stance,
      reasoning: reasoning.trim(),
      userId,
      userType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
      charactarCount: reasoning.trim().length,
      userDisplayName,
      userEmail,
      submissionMethod: "web",
      browserInfo: req.headers['user-agent']?.split(' ')[0] || "unknown"
    };

    const docRef = await responsesRef.add(responseData);
    if (userType === "authenticated") {
      await updateUserSummary(userId, {
        id: docRef.id,
        opinionId,
        stance,
        timestamp: new Date().toISOString()
      });
    }
    await updateOpinionStats(opinionId);

    res.json({
      success: true,
      message: "New response created successfully",
      responseId: docRef.id,
      updated: false,
      userType: userType,
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
    "want", "come", "use", "really", "need", "feel", "believe", "more",
    "provided", "specific", "reason",
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
  schedule: "0 6 * * *",  // 6 AM UTC = Midnight Chicago time
  timeZone: "America/Chicago",  // Use Chicago timezone directly
}, async (context) => {
  try {
    console.log("🕛 Starting midnight reset process...");
    
    // Get proper Chicago time for date calculations
    const chicagoTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const today = chicagoTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Calculate yesterday in Chicago timezone
    const yesterdayChicago = new Date(chicagoTime);
    yesterdayChicago.setDate(yesterdayChicago.getDate() - 1);
    const yesterday = yesterdayChicago.toISOString().split('T')[0];

    console.log(`📅 Today (Chicago): ${today}`);
    console.log(`📅 Yesterday (Chicago): ${yesterday}`);

    // Step 1: Activate today's opinion FIRST to prevent gaps
    console.log("🔄 Activating today's opinion...");
    const activationResult = await activateNextOpinion();
    console.log("✅ Opinion activation result:", activationResult);

    // Step 2: Deactivate and archive in single atomic operation
    console.log("🗂️ Deactivating previous opinions and archiving responses...");
    
    const batch = db.batch();
    
    // Deactivate all currently active opinions that are NOT today's
    const opinionsRef = db.collection("dailyOpinions");
    const activeOpinionsQuery = opinionsRef.where("isActive", "==", true);
    const activeSnapshot = await activeOpinionsQuery.get();

    let deactivatedCount = 0;
    activeSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Deactivate any opinion that's not scheduled for today
      if (data.publishAt !== today) {
        console.log(`🔽 Deactivating opinion from ${data.publishAt}`);
        batch.update(doc.ref, {
          isActive: false,
          deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        deactivatedCount++;
      }
    });

    // Archive responses from all previous days (not just yesterday)
    // This ensures we clean up any responses that might have been missed
    const responsesRef = db.collection("responses");
    
    // Create date boundaries for archiving (anything before today in Chicago time)
    const todayStart = new Date(chicagoTime);
    todayStart.setHours(0, 0, 0, 0);
    
    console.log(`🗂️ Archiving responses before: ${todayStart.toISOString()}`);
    
    const previousResponses = await responsesRef
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(todayStart))
      .get();

    const archiveRef = db.collection("archivedResponses");
    let archivedCount = 0;
    
    previousResponses.forEach((doc) => {
      const responseData = doc.data();
      const archiveDoc = archiveRef.doc(doc.id);
      batch.set(archiveDoc, {
        ...responseData,
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        archivedDate: today, // Track which reset archived this
      });
      batch.delete(doc.ref);
      archivedCount++;
    });

    // Commit all changes atomically
    await batch.commit();
    
    console.log(`✅ Midnight reset completed successfully`);
    console.log(`📊 Archived ${archivedCount} responses`);
    console.log(`🗑️ Deactivated ${deactivatedCount} previous opinions`);

    return {
      success: true, 
      message: "Midnight reset completed successfully",
      activationResult,
      archivedResponses: archivedCount,
      deactivatedOpinions: deactivatedCount,
      resetDate: today
    };
  } catch (error) {
    console.error("❌ Error in midnight reset:", error);
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
    const now = new Date();
    const chicagoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    const today = chicagoTime.toISOString().split("T")[0];
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
/**
 * Create a new DIY opinion with optional photo
 */
exports.createDIYOpinion = functions.https.onRequest({
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

    const {
      opinionId,
      userId,
      title,
      content,
      authorName,
      photoUrl,
      shareableToken,
    } = req.body;

    if (!opinionId || !title || !content) {
      res.status(400).json({error: "Missing required fields"});
      return;
    }

    const opinionData = {
      id: opinionId,
      userId,
      title: title.trim(),
      content: content.trim(),
      authorName: authorName || "Anonymous",
      photoUrl: photoUrl || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isPrivate: true,
      shareableToken,
      agreeCount: 0,
      disagreeCount: 0,
    };

    await db.collection("diy_opinions").doc(opinionId).set(opinionData);

    res.json({
      success: true,
      message: "DIY opinion created successfully",
      opinionId,
    });
  } catch (error) {
    console.error("Error creating DIY opinion:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get DIY opinion by shareable token
 */
exports.getDIYOpinion = functions.https.onRequest({
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

    const {token} = req.method === "GET" ? req.query : req.body;

    if (!token) {
      res.status(400).json({error: "Missing token"});
      return;
    }

    const opinionsRef = db.collection("diy_opinions");
    const q = opinionsRef.where("shareableToken", "==", token);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      res.status(404).json({success: false, error: "Opinion not found"});
      return;
    }

    const opinion = querySnapshot.docs[0].data();
    res.json({
      success: true,
      opinion,
    });
  } catch (error) {
    console.error("Error getting DIY opinion:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Submit vote on DIY opinion
 */
exports.submitDIYVote = functions.https.onRequest({
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

    const {opinionId, vote, comment, voterFingerprint} = req.body;

    if (!opinionId || !vote || !voterFingerprint) {
      res.status(400).json({error: "Missing required fields"});
      return;
    }

    if (!["agree", "disagree"].includes(vote)) {
      res.status(400).json({error: "Vote must be 'agree' or 'disagree'"});
      return;
    }

    // Check for existing vote
    const votesRef = db.collection("diy_votes");
    const existingVoteQuery = votesRef
        .where("opinionId", "==", opinionId)
        .where("voterFingerprint", "==", voterFingerprint);

    const existingSnapshot = await existingVoteQuery.get();

    if (!existingSnapshot.empty) {
      res.status(400).json({error: "You have already voted on this opinion"});
      return;
    }

    // Create new vote
    const voteData = {
      opinionId,
      vote,
      comment: comment || "",
      voterFingerprint,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await votesRef.add(voteData);

    res.json({
      success: true,
      message: "Vote submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting DIY vote:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get aggregated DIY votes for word cloud
 */
exports.getDIYVotes = functions.https.onRequest({
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

    const votesRef = db.collection("diy_votes");
    const q = votesRef.where("opinionId", "==", opinionId);
    const querySnapshot = await q.get();

    const votes = [];
    const comments = [];
    let agreeCount = 0;
    let disagreeCount = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      votes.push({
        id: doc.id,
        vote: data.vote,
        comment: data.comment,
        createdAt: data.createdAt,
      });

      if (data.vote === "agree") agreeCount++;
      else if (data.vote === "disagree") disagreeCount++;

      if (data.comment && data.comment.trim().length > 0) {
        comments.push(data.comment);
      }
    });

    // Generate word cloud data using your existing function
    const combinedText = comments.join(" ");
    const wordFrequencies = processTextToWordFrequencies(combinedText);

    res.json({
      success: true,
      opinionId,
      votes,
      stats: {
        agreeCount,
        disagreeCount,
        totalVotes: agreeCount + disagreeCount,
      },
      wordCloudData: wordFrequencies,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting DIY votes:", error);
    res.status(500).json({success: false, error: error.message});
  }
});
async function updateUserSummary(userId, responseData) {
  try {
    const summaryRef = db.collection("userSummaries").doc(userId);
    const summaryDoc = await summaryRef.get();
    
    let summaryData;
    
    if (summaryDoc.exists) {
      // Update existing summary
      summaryData = summaryDoc.data();
      
      // Update counters
      const isNewDate = !summaryData.participationDates.includes(responseData.opinionId);
      if (isNewDate) {
        summaryData.totalResponses = (summaryData.totalResponses || 0) + 1;
        summaryData.stats[`${responseData.stance}Count`] = (summaryData.stats[`${responseData.stance}Count`] || 0) + 1;
      }
      summaryData.stats[`${responseData.stance}Count`] = (summaryData.stats[`${responseData.stance}Count`] || 0) + 1;
      
      // Update response tracking
      summaryData.responsesByDate = summaryData.responsesByDate || {};
      summaryData.responsesByDate[responseData.opinionId] = responseData.id;

      summaryData.stancesByDate = summaryData.stancesByDate || {};
      summaryData.stancesByDate[responseData.opinionId] = responseData.stance;
      
      // Update participation dates for streak calculation
      summaryData.participationDates = summaryData.participationDates || [];
      if (!summaryData.participationDates.includes(responseData.opinionId)) {
        summaryData.participationDates.push(responseData.opinionId);
        summaryData.participationDates.sort(); // Keep sorted
      }
      
      summaryData.lastResponse = responseData.opinionId;
      summaryData.lastResponseTime = responseData.timestamp;
      
    } else {
      // Create new summary
      summaryData = {
        userId,
        totalResponses: 1,
        firstResponse: responseData.opinionId,
        lastResponse: responseData.opinionId,
        lastResponseTime: responseData.timestamp,
        responsesByDate: {
          [responseData.opinionId]: responseData.id
        },
        stancesByDate: {
          [responseData.opinionId]: responseData.stance
        },
        stats: {
          agreeCount: responseData.stance === 'agree' ? 1 : 0,
          disagreeCount: responseData.stance === 'disagree' ? 1 : 0,
          avgCharacterCount: 0 // Calculate later if needed
        },
        participationDates: [responseData.opinionId],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
    }
    
    // Calculate current streak
    summaryData.currentStreak = calculateStreakFromDates(summaryData.participationDates);
    summaryData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await summaryRef.set(summaryData, { merge: true });
    
    console.log(`✅ Updated user summary for ${userId}: ${summaryData.totalResponses} total responses`);
    
  } catch (error) {
    console.error("❌ Error updating user summary:", error);
    // Don't fail the main response if summary update fails
  }
}

// Helper function to calculate streak from participation dates
function calculateStreakFromDates(participationDates) {
  if (!participationDates || participationDates.length === 0) {
    return 0;
  }
  const now = new Date();
  const chicagoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  const today = chicagoTime.toISOString().split('T')[0];
  const sortedDates = participationDates.slice().sort().reverse(); // Most recent first
  
  // Check if user participated today or yesterday to have an active streak
  const yesterday = new Date(chicagoTime);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const hasRecentParticipation = sortedDates[0] === today || sortedDates[0] === yesterdayStr;
    
  if (!hasRecentParticipation) {
    return 0;
  }
  
  let streak = 0;
  let expectedDate = sortedDates[0];
  
  for (const date of sortedDates) {
    if (date === expectedDate) {
      streak++;
      // Move to previous day
      const prevDate = new Date(expectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      expectedDate = prevDate.toISOString().split('T')[0];
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Search for users by display name or email
 */
exports.searchUsers = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    const {searchTerm} = req.method === "GET" ? req.query : req.body;

    if (!searchTerm || searchTerm.trim().length < 2) {
      res.status(400).json({error: "Search term must be at least 2 characters"});
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    
    // Search in users collection
    const usersRef = db.collection("users");
    const usersSnapshot = await usersRef.get();
    
    const results = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (doc.id === currentUserId) return; // Don't include current user
      
      const displayName = (userData.displayName || "").toLowerCase();
      const email = (userData.email || "").toLowerCase();
      
      if (displayName.includes(searchLower) || email.includes(searchLower)) {
        results.push({
          uid: doc.id,
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          createdAt: userData.createdAt
        });
      }
    });

    // Limit results
    const limitedResults = results.slice(0, 20);

    res.json({
      success: true,
      users: limitedResults,
      totalFound: results.length
    });

  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Send friend request
 */
exports.sendFriendRequest = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    const {targetUserId} = req.body;

    if (!targetUserId) {
      res.status(400).json({error: "Target user ID required"});
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({error: "Cannot send friend request to yourself"});
      return;
    }

    // Check if request already exists
    const friendRequestsRef = db.collection("friendRequests");
    const existingQuery = friendRequestsRef
      .where("senderId", "==", currentUserId)
      .where("receiverId", "==", targetUserId);
    
    const existingSnapshot = await existingQuery.get();
    
    if (!existingSnapshot.empty) {
      res.status(400).json({error: "Friend request already sent"});
      return;
    }

    // Check if they're already friends
    const friendshipsRef = db.collection("friendships");
    const friendshipQuery = friendshipsRef
      .where("users", "array-contains", currentUserId);
    
    const friendshipSnapshot = await friendshipQuery.get();
    const alreadyFriends = friendshipSnapshot.docs.some(doc => {
      const users = doc.data().users;
      return users.includes(targetUserId);
    });

    if (alreadyFriends) {
      res.status(400).json({error: "Already friends with this user"});
      return;
    }

    // Create friend request
    const requestData = {
      senderId: currentUserId,
      receiverId: targetUserId,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await friendRequestsRef.add(requestData);

    res.json({
      success: true,
      message: "Friend request sent successfully",
      requestId: docRef.id
    });

  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Respond to friend request (accept/decline)
 */
exports.respondToFriendRequest = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    const {requestId, response} = req.body;

    if (!requestId || !response) {
      res.status(400).json({error: "Request ID and response required"});
      return;
    }

    if (!["accept", "decline"].includes(response)) {
      res.status(400).json({error: "Response must be 'accept' or 'decline'"});
      return;
    }

    // Get the friend request
    const requestDoc = await db.collection("friendRequests").doc(requestId).get();
    
    if (!requestDoc.exists) {
      res.status(404).json({error: "Friend request not found"});
      return;
    }

    const requestData = requestDoc.data();
    
    if (requestData.receiverId !== currentUserId) {
      res.status(403).json({error: "Not authorized to respond to this request"});
      return;
    }

    if (requestData.status !== "pending") {
      res.status(400).json({error: "Request has already been responded to"});
      return;
    }

    const batch = db.batch();

    // Update request status
    batch.update(requestDoc.ref, {
      status: response,
      respondedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (response === "accept") {
      // Create friendship
      const friendshipRef = db.collection("friendships").doc();
      batch.set(friendshipRef, {
        users: [requestData.senderId, currentUserId],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "active"
      });
    }

    await batch.commit();

    res.json({
      success: true,
      message: response === "accept" ? "Friend request accepted" : "Friend request declined"
    });

  } catch (error) {
    console.error("Error responding to friend request:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get user's friends list
 */
exports.getFriends = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    // Get friendships
    const friendshipsRef = db.collection("friendships");
    const friendshipQuery = friendshipsRef
      .where("users", "array-contains", currentUserId)
      .where("status", "==", "active");
    
    const friendshipSnapshot = await friendshipQuery.get();
    
    if (friendshipSnapshot.empty) {
      res.json({
        success: true,
        friends: []
      });
      return;
    }

    // Get friend user IDs
    const friendUserIds = [];
    friendshipSnapshot.forEach(doc => {
      const users = doc.data().users;
      const friendId = users.find(id => id !== currentUserId);
      if (friendId) friendUserIds.push(friendId);
    });

    // Get friend user details
    const friends = [];
    for (const friendId of friendUserIds) {
      try {
        const userDoc = await db.collection("users").doc(friendId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          friends.push({
            uid: friendId,
            userId: friendId,
            displayName: userData.displayName,
            email: userData.email,
            photoURL: userData.photoURL,
            createdAt: userData.createdAt
          });
        }
      } catch (error) {
        console.warn("Could not fetch friend data:", friendId, error);
      }
    }

    res.json({
      success: true,
      friends: friends
    });

  } catch (error) {
    console.error("Error getting friends:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get friends' daily opinions
 */
exports.getFriendsOpinions = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    const {opinionId} = req.method === "GET" ? req.query : req.body;

    // Get current active opinion if not specified
    let targetOpinionId = opinionId;
    let activeOpinionData = null;
    if (!targetOpinionId) {
      const activeOpinionQuery = db.collection("dailyOpinions").where("isActive", "==", true).limit(1);
      const activeSnapshot = await activeOpinionQuery.get();
      if (!activeSnapshot.empty) {
        // Use publishAt date to match with responses collection opinionId field
        activeOpinionData = activeSnapshot.docs[0].data();
        targetOpinionId = activeOpinionData.publishAt;
        
        // Also try today's date if publishAt doesn't match
        const chicagoTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}));
        const todayDate = chicagoTime.toISOString().split('T')[0];
        
        console.log("🔍 DEBUG: Active opinion publishAt:", activeOpinionData.publishAt);
        console.log("🔍 DEBUG: Today's date (Chicago):", todayDate);
        console.log("🔍 DEBUG: Using targetOpinionId:", targetOpinionId);
      } else {
        res.json({
          success: true,
          friendsOpinions: [],
          message: "No active opinion found"
        });
        return;
      }
    }

    // Get user's friends
    const friendshipsRef = db.collection("friendships");
    const friendshipQuery = friendshipsRef
      .where("users", "array-contains", currentUserId)
      .where("status", "==", "active");
    
    const friendshipSnapshot = await friendshipQuery.get();
    
    if (friendshipSnapshot.empty) {
      res.json({
        success: true,
        friendsOpinions: [],
        message: "No friends found"
      });
      return;
    }

    // Get friend user IDs
    const friendUserIds = [];
    friendshipSnapshot.forEach(doc => {
      const users = doc.data().users;
      const friendId = users.find(id => id !== currentUserId);
      if (friendId) friendUserIds.push(friendId);
    });

    // Get friends' responses to this opinion
    const responsesRef = db.collection("responses");
    const friendsOpinions = [];

    console.log("🔍 DEBUG: Looking for opinions with targetOpinionId:", targetOpinionId);
    console.log("🔍 DEBUG: Friend user IDs:", friendUserIds);

    // Create list of possible dates to check
    const datesToCheck = [targetOpinionId];
    if (activeOpinionData) {
      const chicagoTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Chicago"}));
      const todayDate = chicagoTime.toISOString().split('T')[0];
      if (todayDate !== targetOpinionId) {
        datesToCheck.push(todayDate);
      }
    }
    
    console.log("🔍 DEBUG: Will check these dates for opinions:", datesToCheck);

    for (const friendId of friendUserIds) {
      try {
        console.log("🔍 DEBUG: Querying for friendId:", friendId);
        
        let responseFound = false;
        
        // Try each possible date
        for (const dateToCheck of datesToCheck) {
          console.log("🔍 DEBUG: Trying date:", dateToCheck);
          
          const responseQuery = responsesRef
            .where("opinionId", "==", dateToCheck)
            .where("userId", "==", friendId)
            .limit(1);
          
          const responseSnapshot = await responseQuery.get();
          
          console.log(`🔍 DEBUG: Response for ${dateToCheck} empty?`, responseSnapshot.empty);
          
          if (!responseSnapshot.empty) {
            const responseDoc = responseSnapshot.docs[0];
            const responseData = responseDoc.data();
            
            console.log("✅ Found response for friend:", friendId, "on date:", dateToCheck);
            
            // Get friend's user details
            const userDoc = await db.collection("users").doc(friendId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            
            friendsOpinions.push({
              id: responseDoc.id,
              userId: friendId,
              displayName: userData.displayName || "Unknown User",
              email: userData.email,
              photoURL: userData.photoURL,
              stance: responseData.stance,
              reasoning: responseData.reasoning,
              timestamp: responseData.timestamp,
              createdAt: responseData.createdAt,
              matchedDate: dateToCheck
            });
            
            responseFound = true;
            break; // Found response, no need to check other dates
          }
        }
        
        if (!responseFound) {
          console.log("❌ No response found for friend:", friendId, "on any date");
          
          // Check what dates this friend has responses for (debugging)
          const friendResponsesQuery = responsesRef
            .where("userId", "==", friendId)
            .orderBy("timestamp", "desc")
            .limit(5);
          
          const friendResponsesSnapshot = await friendResponsesQuery.get();
          const friendDates = [];
          friendResponsesSnapshot.forEach(doc => {
            friendDates.push(doc.data().opinionId);
          });
          console.log("🔍 DEBUG: Friend", friendId, "has responses for dates:", friendDates);
        }
        
      } catch (error) {
        console.warn("Could not fetch friend's opinion:", friendId, error);
      }
    }

    res.json({
      success: true,
      opinionId: targetOpinionId,
      friendsOpinions: friendsOpinions,
      totalFriends: friendUserIds.length,
      friendsWithOpinions: friendsOpinions.length
    });

  } catch (error) {
    console.error("Error getting friends' opinions:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Create or update user profile in Firestore when they authenticate
 */
exports.createUserProfile = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Verify user is authenticated
    let currentUser = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUser = decodedToken;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    // Create or update user document in Firestore
    const userRef = db.collection("users").doc(currentUser.uid);
    const userDoc = await userRef.get();

    const userData = {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.name || currentUser.email?.split('@')[0] || "User",
      photoURL: currentUser.picture || null,
      createdAt: userDoc.exists ? userDoc.data().createdAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await userRef.set(userData, { merge: true });

    res.json({
      success: true,
      message: "User profile created/updated successfully",
      user: {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName
      }
    });

  } catch (error) {
    console.error("Error creating user profile:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Update user profile photo
 */
exports.updateProfilePhoto = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    const {photoURL} = req.body;

    if (!photoURL) {
      res.status(400).json({error: "Photo URL required"});
      return;
    }

    // Update user document in Firestore
    const userRef = db.collection("users").doc(currentUserId);
    await userRef.update({
      photoURL: photoURL,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: "Profile photo updated successfully",
      photoURL: photoURL
    });

  } catch (error) {
    console.error("Error updating profile photo:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Get pending friend requests for a user
 */
exports.getPendingFriendRequests = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    // Get pending requests where user is the receiver
    const friendRequestsRef = db.collection("friendRequests");
    const pendingQuery = friendRequestsRef
      .where("receiverId", "==", currentUserId)
      .where("status", "==", "pending");
    
    const pendingSnapshot = await pendingQuery.get();
    
    if (pendingSnapshot.empty) {
      res.json({
        success: true,
        requests: []
      });
      return;
    }

    // Get sender details for each request
    const requests = [];
    for (const doc of pendingSnapshot.docs) {
      try {
        const requestData = doc.data();
        const senderDoc = await db.collection("users").doc(requestData.senderId).get();
        
        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          requests.push({
            id: doc.id,
            senderId: requestData.senderId,
            senderName: senderData.displayName,
            senderEmail: senderData.email,
            senderPhotoURL: senderData.photoURL,
            createdAt: requestData.createdAt
          });
        }
      } catch (error) {
        console.warn("Could not fetch sender data:", requestData.senderId, error);
      }
    }

    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error("Error getting pending friend requests:", error);
    res.status(500).json({success: false, error: error.message});
  }
});

/**
 * Check friendship status between current user and target user
 */
exports.checkFriendshipStatus = functions.https.onRequest({
  cors: true,
}, async (req, res) => {
  try {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // Verify user is authenticated
    let currentUserId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (error) {
        res.status(401).json({error: "Authentication required"});
        return;
      }
    } else {
      res.status(401).json({error: "Authentication required"});
      return;
    }

    const targetUserId = req.query.targetUserId;

    if (!targetUserId) {
      res.status(400).json({error: "Target user ID required"});
      return;
    }

    if (currentUserId === targetUserId) {
      res.json({
        success: true,
        status: 'self'
      });
      return;
    }

    // Check if they're already friends
    const friendshipsRef = db.collection("friendships");
    const friendshipQuery = friendshipsRef
      .where("users", "array-contains", currentUserId);
    
    const friendshipSnapshot = await friendshipQuery.get();
    const isFriends = friendshipSnapshot.docs.some(doc => {
      const users = doc.data().users;
      return users.includes(targetUserId);
    });

    if (isFriends) {
      res.json({
        success: true,
        status: 'friends'
      });
      return;
    }

    // Check for pending friend requests
    const friendRequestsRef = db.collection("friendRequests");
    
    // Check if current user sent a request to target user
    const sentRequestQuery = friendRequestsRef
      .where("senderId", "==", currentUserId)
      .where("receiverId", "==", targetUserId)
      .where("status", "==", "pending");
    
    const sentRequestSnapshot = await sentRequestQuery.get();
    
    if (!sentRequestSnapshot.empty) {
      res.json({
        success: true,
        status: 'pending_sent'
      });
      return;
    }

    // Check if target user sent a request to current user
    const receivedRequestQuery = friendRequestsRef
      .where("senderId", "==", targetUserId)
      .where("receiverId", "==", currentUserId)
      .where("status", "==", "pending");
    
    const receivedRequestSnapshot = await receivedRequestQuery.get();
    
    if (!receivedRequestSnapshot.empty) {
      res.json({
        success: true,
        status: 'pending_received'
      });
      return;
    }

    // No relationship found
    res.json({
      success: true,
      status: 'none'
    });

  } catch (error) {
    console.error("Error checking friendship status:", error);
    res.status(500).json({success: false, error: error.message});
  }
});
