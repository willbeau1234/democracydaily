const functions = require("firebase-functions/v2");
const admin = require("firebase-admin");

/**
 * Initialize Firebase Admin SDK
 */
admin.initializeApp();
const db = admin.firestore();

/**
 * Submit a new response and trigger word cloud updates
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

    // Create response document
    const responseData = {
      opinionId,
      stance,
      reasoning: reasoning.trim(),
      userId: userId || "anonymous",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };

    // Add to Firestore (this will trigger real-time listeners)
    const responsesRef = db.collection("responses");
    const docRef = await responsesRef.add(responseData);

    // Update opinion stats
    await updateOpinionStats(opinionId);

    res.json({
      success: true,
      message: "Response submitted successfully",
      responseId: docRef.id,
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

    // Query responses from Firestore
    const responsesRef = db.collection("responses");
    const q = responsesRef
        .where("opinionId", "==", opinionId)
        .where("stance", "==", stance)
        //.orderBy("timestamp", "desc")
        .limit(500); // Limit for performance

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

    // Combine all reasoning text
    const combinedText = allText.join(" ");

    // Process text into word frequencies
    const wordFrequencies = processTextToWordFrequencies(combinedText);

    res.json({
      success: true,
      opinionId,
      stance,
      totalResponses: responses.length,
      combinedText,
      wordFrequencies,
      responses: responses.slice(0, 10), // Return latest 10 for display
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

    // For demo, using a fixed date - replace with actual logic
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

  // Clean and split text
  const words = text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word));

  // Count word frequencies
  const wordCount = {};
  words.forEach((word) => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Convert to sorted array
  return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100); // Top 100 words for performance
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

    // Optionally store stats in a separate collection for quick access
    const statsRef = db.collection("opinionStats").doc(opinionId);
    await statsRef.set({
      ...stats,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});

    console.log(`Updated stats for opinion ${opinionId}:`, stats);
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
  const message = items[name.toLowerCase()] || `Item '${name}' not found`;
  res.json({item: name, description: message});
});
