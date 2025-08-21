require("dotenv").config();
const crypto = require("crypto");
const { translate } = require("@vitalets/google-translate-api");

console.log(`--- SERVER SCRIPT STARTING AT ${new Date().toISOString()} ---`);
console.log("Attempting to load environment variables and modules...");

const express = require("express");
const cors = require("cors");
const leadsData = require("./Lead (1).json");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

let serverStatus = "analyzing";
const insightsCache = new Map();

let lastDataHash = null;
const lastGeneratedTip = new Map();
const generalTipsCache = new Map(); // Cache for the new general tips

// This function generates general sales advice, NOT based on the leads data.
const getOrGenerateGeneralTip = async (lang = "en") => {
  const cacheKey = `general-tip-${lang}`;
  // 80% chance to use the cached tip to avoid calling the AI too frequently for static content.
  if (generalTipsCache.has(cacheKey) && Math.random() < 0.8) {
    console.log(`CACHE HIT for general tip (lang: ${lang})`);
    return generalTipsCache.get(cacheKey);
  }
  console.log(`CACHE MISS for general tip (lang: ${lang}). Calling AI...`);

  const languageInstruction =
    lang === "ar"
      ? "الأهم: ردك بالكامل يجب أن يكون بلهجة مصرية راقية ومحترفة. استخدم الأبجدية العربية فقط. ممنوع تمامًا استخدام الحروف الإنجليزية (فرانكو آراب). يجب أن تكون النصيحة ملهمة وعامة وقابلة للتطبيق لأي مندوب مبيعات."
      : "IMPORTANT: Your entire response must be in English. The tip must be inspiring, general, and applicable to any salesperson. It should be a single, concise sentence.";

  const prompt = `
    You are a world-class Sales Mentor like Zig Ziglar or Brian Tracy.
    Your task is to provide ONE SINGLE piece of timeless, motivational sales advice. This advice should NOT be based on any specific data, but on universal principles of sales and human psychology.
    ${languageInstruction}

    ---
    HERE ARE EXAMPLES OF THE EXACT STYLE I WANT:
    - (Good): "Enthusiasm is the electricity of life. If you aren't enthusiastic, you'll be shocked at how dull your results are."
    - (Good): "The best salespeople don't just sell a product; they sell a better version of the a future."
    - (Good): "Stop selling. Start helping. The trust you build will close more deals than any tactic."
    - (Bad - Too generic): "Work hard."
    - (Bad - Too long): "To be a better salesperson, you need to understand your customer's needs, build a relationship, and then present your solution..."
    ---

    Now, provide a new, powerful, and concise piece of general sales wisdom.

    Provide the output as a single, valid JSON object with ONLY these two keys:
    1. "tip": A string containing the actionable advice.
    2. "category": The string "Sales Wisdom".
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const generatedTip = JSON.parse(text);
    generalTipsCache.set(cacheKey, generatedTip);
    return generatedTip;
  } catch (error) {
    console.error(`❌ ERROR during General Tip Generation for ${lang}:`, error);
    return { error: "Could not generate a general tip." };
  }
};

const getOrGenerateGlobalPatterns = async (lang = "en") => {
  const cacheKey = `global-patterns-${lang}`;
  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for global patterns (lang: ${lang})`);
    return insightsCache.get(cacheKey);
  }
  console.log(`CACHE MISS for global patterns (lang: ${lang}). Calling AI...`);

  const languageInstruction =
    lang === "ar"
      ? "مهم للغاية: يجب أن يكون ردك بالكامل باللغة العربية (لهجة مصرية راقية). استخدم الأبجدية العربية فقط. ممنوع تمامًا استخدام الحروف الإنجليزية (فرانكو آراب). جميع المفاتيح والقيم في JSON يجب أن تكون باللغة العربية."
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are an elite Sales Director, a master strategist with years of experience in high-value real estate. Your task is to analyze the entire portfolio of leads to uncover 2-3 critical, actionable insights that will drive sales.
    The current date is ${new Date().toLocaleDateString()}.
    The entire leads portfolio is provided below as a JSON string.
    ${languageInstruction}

    Look for the hidden opportunities and risks. For example:
    - "Leads from Source X are proving to be low-quality; they waste our time. We need to re-evaluate that channel."
    - "Clients interested in Y but with a budget of Z are hesitant. We need a specific financial offer to close them."
    - "Salesperson A is a hunter with new leads, while Salesperson B excels at nurturing long-term clients."

    Avoid generic observations. Deliver sharp, decisive intelligence.

    Provide the output as a single, valid JSON object with ONLY the key "strategicPatterns".
    "strategicPatterns" should be an array of objects, where each object has THREE keys:
    1. "pattern": A concise, impactful summary of the market signal you've detected.
    2. "implication": The direct business consequence or strategic move we must make.
    3. "confidence": Your confidence in this insight ("High", "Medium", "Low").

    ENTIRE LEADS PORTFOLIO:
    ---
    ${JSON.stringify(leadsData)}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const generatedPatterns = JSON.parse(text);
    insightsCache.set(cacheKey, generatedPatterns);
    return generatedPatterns;
  } catch (error) {
    console.error(
      `❌ ERROR during Global Strategic Analysis for ${lang}:`,
      error
    );
    return { error: "Could not generate global patterns." };
  }
};

const getOrGenerateProactiveTip = async (lang = "en") => {
  const dataString = JSON.stringify(leadsData);
  const currentDataHash = crypto
    .createHash("sha256")
    .update(dataString)
    .digest("hex");

  if (currentDataHash === lastDataHash && lastGeneratedTip.has(lang)) {
    console.log(`CACHE HIT (Data Unchanged) for proactive tip (lang: ${lang})`);
    return lastGeneratedTip.get(lang);
  }

  console.log(
    `CACHE MISS for proactive tip (lang: ${lang}). Data has changed or no cache exists. Calling AI...`
  );

  const languageInstruction =
    lang === "ar"
      ? "الأهم: ردك بالكامل يجب أن يكون بلهجة مصرية راقية ومحترفة. استخدم الأبجدية العربية فقط. ممنوع تمامًا استخدام الحروف الإنجليزية (فرانكو آراب). يجب أن تكون النصيحة مباشرة، بسيطة، وجذابة بأسلوب هادئ وغير مباشر."
      : "IMPORTANT: Your entire response must be in English. The tip must be direct, simple, and catchy. Frame it in a passive, observational style, as if you're revealing a critical opportunity based on the data. It must be a single, concise sentence.";

  const prompt = `
    You are an elite Sales Coach. Your persona is calm, observant, and strategic.
    Based on the CRM data below, provide ONE SINGLE, highly actionable tip.
    ${languageInstruction}

    ---
    HERE ARE EXAMPLES OF THE EXACT STYLE I WANT:
    - (Good): "A pattern suggests high-budget clients are most responsive in the morning. This is the prime time to connect."
    - (Good): "'Facebook' leads are showing signs of going cold. A quick follow-up call is the key to reviving them."
    - (Good): "The 'Villa' property is getting a lot of interest. It's the perfect offer for our undecided 'Hot' leads."
    - (Bad - Too bossy): "You must call all the hot leads now!"
    - (Bad - Too generic): "Following up with leads is a good idea."
    ---

    Now, find a new, specific, data-driven opportunity in the portfolio below and create a compelling tip in the same style.

    Provide the output as a single, valid JSON object with ONLY these two keys:
    1. "tip": A string containing the actionable advice.
    2. "category": A short category for the tip (e.g., "Urgent Action", "Strategy", "Productivity").

    ENTIRE LEADS PORTFOLIO:
    ---
    ${JSON.stringify(leadsData)}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const generatedTip = JSON.parse(text);

    lastDataHash = currentDataHash;
    lastGeneratedTip.set(lang, generatedTip);

    return generatedTip;
  } catch (error) {
    console.error(
      `❌ ERROR during Proactive Tip Generation for ${lang}:`,
      error
    );
    return { error: "Could not generate a proactive tip." };
  }
};

(async () => {
  await getOrGenerateGlobalPatterns("en");
  await getOrGenerateGlobalPatterns("ar");
  console.log(
    "✅ Initial Global Strategic Analysis COMPLETE for EN & AR. Server is ready."
  );
  serverStatus = "ready";
})();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] INCOMING REQUEST: ${req.method} ${
      req.originalUrl
    }`
  );
  next();
});

// --- Endpoints ---

// ✨ UPDATED: This endpoint now serves one of two types of tips randomly.
app.get("/api/ai-tip", async (req, res) => {
  const lang = req.headers["accept-language"] || "en";
  console.log(`---> SUCCESS: Matched the /api/ai-tip route. Language: ${lang}`);

  let tip;
  // 35% chance for general wisdom, 65% for a data-driven tip.
  if (Math.random() < 0.35) {
    console.log("   -> Choosing a GENERAL tip.");
    tip = await getOrGenerateGeneralTip(lang);
  } else {
    console.log("   -> Choosing a DATA-DRIVEN tip.");
    tip = await getOrGenerateProactiveTip(lang);
  }

  if (tip.error) {
    res.status(500).json(tip);
  } else {
    res.json(tip);
  }
});

app.get("/api/leads", (req, res) => {
  const lang = req.headers["accept-language"] || "en";
  console.log(`---> SUCCESS: Matched /api/leads route. Language: ${lang}`);
  const localizedLeads = leadsData.map((lead) => ({
    ...lead,
    name: lang === "ar" && lead.nameAr ? lead.nameAr : lead.nameEn,
  }));
  res.json(localizedLeads);
});

app.get("/api/leads/filters", (req, res) => {
  console.log(
    `---> SUCCESS: Matched the /api/leads/filters route! Preparing to send filter data.`
  );
  const statuses = [...new Set(leadsData.map((lead) => lead.status))];
  const sources = [...new Set(leadsData.map((lead) => lead.source))];
  const interests = [...new Set(leadsData.map((lead) => lead.interest))];
  res.json({
    statuses: statuses.sort(),
    sources: sources.sort(),
    interests: interests.sort(),
  });
});

app.get("/api/status", (req, res) => {
  res.json({ status: serverStatus });
});

app.get("/api/performance/global-patterns", async (req, res) => {
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched the /api/performance/global-patterns route. Language: ${lang}`
  );
  const patterns = await getOrGenerateGlobalPatterns(lang);
  if (patterns.error) {
    res.status(500).json(patterns);
  } else {
    res.json(patterns);
  }
});

app.post("/api/translate", async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: "Missing text or targetLang" });
  }
  console.log(`---> REAL TRANSLATION: Translating to ${targetLang}`);
  try {
    const { text: translatedText } = await translate(text, { to: targetLang });
    res.json({ translatedText });
  } catch (error) {
    console.error("Translation API Error:", error);
    res.status(500).json({ translatedText: `[Translation Failed] ${text}` });
  }
});

app.get("/api/users", (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/users route.`);
  const ownerIdToNameMap = new Map();
  for (const lead of leadsData) {
    if (!lead.ownerId) continue;
    const currentName = ownerIdToNameMap.get(lead.ownerId);
    if (!currentName || currentName.startsWith("[")) {
      if (
        lead.nameEn &&
        lead.nameEn.trim() !== "" &&
        lead.nameEn.trim().toLowerCase() !== "no name"
      ) {
        ownerIdToNameMap.set(lead.ownerId, lead.nameEn.trim());
      } else if (!currentName) {
        ownerIdToNameMap.set(
          lead.ownerId,
          `[Unnamed User] - ${lead.ownerId.substring(0, 8)}`
        );
      }
    }
  }
  const users = Array.from(ownerIdToNameMap, ([id, name]) => ({ id, name }));
  users.sort((a, b) => a.name.localeCompare(b.name));
  res.json(users);
});

app.get("/api/dashboard-kpis", (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/dashboard-kpis route.`);
  const totalLeads = leadsData.length;
  const openDeals = leadsData.filter(
    (lead) => lead.status === "open_deal"
  ).length;
  const freshLeads = leadsData.filter(
    (lead) => lead.status === "fresh_lead"
  ).length;
  const conversionRate =
    totalLeads > 0 ? ((openDeals / totalLeads) * 100).toFixed(1) : 0;
  const pipelineDistribution = leadsData.reduce((acc, lead) => {
    const status = lead.status.replace("_", " ");
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(pipelineDistribution).map(
    ([name, count]) => ({ name, count })
  );
  res.json({ totalLeads, openDeals, freshLeads, conversionRate, chartData });
});

app.get("/api/performance/individual/:ownerId", async (req, res) => {
  const { ownerId } = req.params;
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched individual performance route for owner: ${ownerId}. Language: ${lang}`
  );
  const cacheKey = `individual-performance-${ownerId}-${lang}`;

  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return res.json(insightsCache.get(cacheKey));
  }
  console.log(`CACHE MISS for key: ${cacheKey}. Calling AI...`);

  const userLeads = leadsData.filter((lead) => lead.ownerId === ownerId);
  if (userLeads.length === 0) {
    return res.status(404).json({ message: "No leads found for this user." });
  }

  const localizedGlobalPatterns = await getOrGenerateGlobalPatterns(lang);

  const stats = {
    totalLeads: userLeads.length,
    statusBreakdown: userLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {}),
    staleLeads: userLeads.filter((lead) => {
      const fourteenDaysAgo = new Date(
        new Date().setDate(new Date().getDate() - 14)
      );
      return (
        lead.status === "follow_up" &&
        new Date(lead.createdAt) < fourteenDaysAgo
      );
    }).length,
  };

  const languageInstruction =
    lang === "ar"
      ? "مهم للغاية: يجب أن يكون ردك بالكامل باللغة العربية (لهجة مصرية راقية). استخدم الأبجدية العربية فقط. ممنوع تمامًا استخدام الحروف الإنجليزية (فرانكو آراب). جميع المفاتيح والقيم في JSON يجب أن تكون باللغة العربية."
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are a top-tier Sales Director, mentoring one of your salespeople. Your tone is sharp, insightful, and focused on results.
    Analyze their performance statistics and provide a direct, actionable coaching plan.
    The current date is ${new Date().toLocaleDateString()}.
    ${languageInstruction}

    Output a valid JSON object with ONLY these keys: "performanceSummary", "keyGap", "coachingTip", and "keywords".
    - "performanceSummary": A quick, bottom-line assessment of their performance.
    - "keyGap": The single biggest weakness or missed opportunity in their pipeline.
    - "coachingTip": A direct, actionable piece of advice to fix the key gap.
    - "keywords": An array of important phrases from your analysis to be highlighted.

    Global Strategic Context (what the market is doing): ${JSON.stringify(
      localizedGlobalPatterns
    )}

    Salesperson's Performance Snapshot:
    ---
    Total Leads Assigned: ${stats.totalLeads}
    Current Pipeline Status: ${JSON.stringify(stats.statusBreakdown)}
    Stale Leads (unresponsive for >14 days): ${stats.staleLeads}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const aiJson = JSON.parse(text);
    insightsCache.set(cacheKey, aiJson);
    res.json(aiJson);
  } catch (error) {
    console.error("Error in individual performance AI endpoint:", error);
    res.status(500).json({ message: "Failed to generate AI coaching." });
  }
});

app.get("/api/performance/team", async (req, res) => {
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched team performance route. Language: ${lang}`
  );
  const cacheKey = `team-performance-${lang}`;

  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return res.json(insightsCache.get(cacheKey));
  }
  console.log(`CACHE MISS for key: ${cacheKey}. Calling AI...`);

  const localizedGlobalPatterns = await getOrGenerateGlobalPatterns(lang);

  const pipeline = leadsData.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});
  const performers = leadsData.reduce((acc, lead) => {
    if (lead.status === "open_deal" && lead.ownerId) {
      acc[lead.ownerId] = (acc[lead.ownerId] || 0) + 1;
    }
    return acc;
  }, {});

  const languageInstruction =
    lang === "ar"
      ? "مهم للغاية: يجب أن يكون ردك بالكامل باللغة العربية (لهجة مصرية راقية). استخدم الأبجدية العربية فقط. ممنوع تمامًا استخدام الحروف الإنجليزية (فرانكو آراب). جميع المفاتيح والقيم في JSON يجب أن تكون باللغة العربية."
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are the Head of Sales, presenting a strategic overview to your team of elite agents. Your language is decisive and focused on winning.
    Analyze the entire team's sales pipeline data.
    The current date is ${new Date().toLocaleDateString()}.
    ${languageInstruction}

    Output a valid JSON object with ONLY these keys: "pipelineHealthCheck", "significantPattern", "overallStrategy", and "keywords".
    - "pipelineHealthCheck": A direct assessment of our pipeline's health (e.g., "Strong but needs optimization," "Stalled," "Vulnerable").
    - "significantPattern": The single most important trend you see in the data right now.
    - "overallStrategy": A clear, high-level strategic directive for the entire team.
    - "keywords": An array of important phrases from your analysis to be highlighted.

    Global Strategic Context (what the market is doing): ${JSON.stringify(
      localizedGlobalPatterns
    )}

    Team-wide Data:
    ---
    Total Pipeline Distribution: ${JSON.stringify(pipeline)}
    Top Performers (by open deals): ${JSON.stringify(performers)}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const aiJson = JSON.parse(text);
    insightsCache.set(cacheKey, aiJson);
    res.json(aiJson);
  } catch (error) {
    console.error("Error in team performance AI endpoint:", error);
    res.status(500).json({ message: "Failed to generate AI strategy." });
  }
});

app.get("/api/leads/:id", (req, res) => {
  const { id } = req.params;
  console.log(`---> Trying to match /api/leads/:id with id: ${id}`);
  const lead = leadsData.find((l) => l.id === id);
  if (lead) {
    res.json(lead);
  } else {
    res.status(404).json({ message: "Lead not found" });
  }
});

app.post("/api/leads/:id/ai-summary", async (req, res) => {
  const { id } = req.params;
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched the /api/leads/:id/ai-summary route. Language: ${lang}`
  );
  const cacheKey = `lead-summary-${id}-${lang}`;

  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return res.json(insightsCache.get(cacheKey));
  }
  console.log(`CACHE MISS for key: ${cacheKey}. Calling AI...`);

  const lead = leadsData.find((l) => l.id === id);
  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const localizedGlobalPatterns = await getOrGenerateGlobalPatterns(lang);

  const now = new Date();
  const formattedDateTime = now.toLocaleString("en-US", { timeZone: "UTC" });
  const leadInfo = `
    Current Date and Time: ${formattedDateTime} (UTC)
    Lead Name: ${lead.nameEn || "[Unnamed Lead]"}
    Status: ${lead.status}
    Date Created: ${lead.createdAt}
    Source: ${lead.source}
    Interest Level: ${lead.interest}
    Budget: ${lead.budget > 0 ? lead.budget : "Not Specified"}
    Notes: ${
      Array.isArray(lead.notes) ? lead.notes.join(", ") : lead.notes || "None"
    }
    Description: ${lead.description || "None"}
  `;

  const languageInstruction =
    lang === "ar"
      ? "مهم للغاية: يجب أن يكون ردك بالكامل باللغة العربية (لهجة مصرية راقية). استخدم الأبجدية العربية فقط. ممنوع تمامًا استخدام الحروف الإنجليزية (فرانكو آراب). جميع المفاتيح والقيم في JSON يجب أن تكون باللغة العربية."
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are a senior sales consultant preparing a pre-call briefing for a salesperson. Your analysis is sharp, concise, and focused on closing the deal.
    Analyze the provided lead data.
    The current date is ${new Date().toLocaleDateString()}.
    ${languageInstruction}

    Provide the output as a single, valid JSON object with ONLY these keys: "summary", "nextBestAction", "engagementApproach", "timingAdvice", "recommendedOffer".
    - "summary": A quick summary of the client's situation and temperature.
    - "nextBestAction": The single most effective next step to move this deal forward.
    - "engagementApproach": The exact tone and angle to use with this client (e.g., "Create urgency," "Build rapport," "Focus on investment value").
    - "timingAdvice": When to execute the next action (e.g., "Immediately," "End of day," "Wait for them to call").
    - "recommendedOffer": The specific property or deal structure to present.

    Global Strategic Context (what the market is doing): ${JSON.stringify(
      localizedGlobalPatterns
    )}

    Lead Data:
    ---
    ${leadInfo}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const aiJson = JSON.parse(text);
    insightsCache.set(cacheKey, aiJson);
    res.json(aiJson);
  } catch (error) {
    console.error("Error in AI endpoint:", error);
    res.status(500).json({ message: "Failed to generate or parse AI summary" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

console.log("--- SERVER SCRIPT LOADED. Waiting for requests... ---");
